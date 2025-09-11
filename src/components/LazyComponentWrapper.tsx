/**
 * Lazy Component Wrapper with error boundaries and fallbacks
 * Provides robust lazy loading with retry logic and graceful degradation
 */

import {
  Suspense,
  Component,
  type ComponentType,
  type ReactNode,
  useState,
  useEffect,
  useCallback,
  lazy,
  type FC,
  type ErrorInfo,
} from 'react';
import { DEBUG } from '../lib/environment';
import { webNotificationManager } from '../services/web-fallback';

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

// Lazy wrapper options
export interface LazyWrapperOptions {
  fallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  maxRetries?: number;
  retryDelay?: number;
  preload?: boolean;
  timeout?: number;
  onError?: (error: Error, info: ErrorInfo) => void;
  onRetry?: (attempt: number) => void;
  onLoad?: (componentName: string, loadTime: number) => void;
}

// Loading skeleton components
const DefaultLoadingSkeleton: FC = () => (
  <div className='lazy-loading-skeleton' role='status' aria-label='Loading component'>
    <div className='skeleton-header' />
    <div className='skeleton-content'>
      <div className='skeleton-line' />
      <div className='skeleton-line short' />
      <div className='skeleton-line' />
    </div>
    <style>{`
      .lazy-loading-skeleton {
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 0.5rem;
        animation: pulse 1.5s ease-in-out infinite;
      }

      .skeleton-header {
        height: 2rem;
        background: #e9ecef;
        border-radius: 0.25rem;
        margin-bottom: 1rem;
      }

      .skeleton-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .skeleton-line {
        height: 1rem;
        background: #e9ecef;
        border-radius: 0.25rem;
      }

      .skeleton-line.short {
        width: 60%;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }
    `}</style>
  </div>
);

const DefaultErrorFallback: FC<{ error: Error; retry: () => void; componentName?: string }> = ({
  error,
  retry,
  componentName = 'Component',
}) => (
  <div className='lazy-error-fallback' role='alert'>
    <div className='error-icon'>⚠️</div>
    <h3>Failed to load {componentName}</h3>
    <p>Something went wrong while loading this component.</p>
    {DEBUG.checkFeature('PERFORMANCE_MONITORING', 'error-display') && (
      <details className='error-details'>
        <summary>Error Details</summary>
        <pre>{error.message}</pre>
      </details>
    )}
    <button onClick={retry} className='retry-button'>
      Try Again
    </button>
    <style>{`
      .lazy-error-fallback {
        padding: 2rem;
        text-align: center;
        background: #fff5f5;
        border: 1px solid #fed7d7;
        border-radius: 0.5rem;
        color: #742a2a;
      }

      .error-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
      }

      .error-details {
        margin: 1rem 0;
        text-align: left;
      }

      .error-details pre {
        background: #f7fafc;
        padding: 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        overflow-x: auto;
      }

      .retry-button {
        background: #e53e3e;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: background-color 0.2s;
      }

      .retry-button:hover {
        background: #c53030;
      }
    `}</style>
  </div>
);

// Error boundary class component
class LazyErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
    maxRetries?: number;
    retryDelay?: number;
    componentName?: string;
    onError?: (error: Error, info: ErrorInfo) => void;
    onRetry?: (attempt: number) => void;
  },
  ErrorBoundaryState
> {
  private retryTimeoutId: number | null = null;
  private loadStartTime: number = performance.now();

  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error with debug info
    DEBUG.logPerformance(
      'lazy-component-error',
      Math.max(0, performance.now() - this.loadStartTime),
      {
        componentName: this.props.componentName,
        error: error.message,
        retryCount: this.state.retryCount,
      }
    );

    // Show notification in production
    if (!DEBUG.checkFeature('PERFORMANCE_MONITORING', 'error-boundary')) {
      webNotificationManager.showNotification({
        title: 'Component Error',
        body: `Failed to load ${this.props.componentName || 'component'}`,
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  retry = () => {
    const { maxRetries = 3, retryDelay = 1000, onRetry } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.error('Maximum retry attempts reached for lazy component');
      return;
    }

    if (onRetry) {
      onRetry(retryCount + 1);
    }

    DEBUG.logPerformance(
      'lazy-component-retry',
      Math.max(0, performance.now() - this.loadStartTime),
      {
        componentName: this.props.componentName,
        attempt: retryCount + 1,
      }
    );

    this.setState({
      retryCount: retryCount + 1,
    });

    // Add delay before retry to prevent rapid retries
    this.retryTimeoutId = window.setTimeout(
      () => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      },
      retryDelay * (retryCount + 1)
    ); // Exponential backoff
  };

  render() {
    if (this.state.hasError) {
      const { fallback, componentName } = this.props;

      if (typeof fallback === 'function') {
        return fallback(this.state.error!, this.retry);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error!}
          retry={this.retry}
          componentName={componentName}
        />
      );
    }

    return this.props.children;
  }
}

// Timeout wrapper for slow loading components
const TimeoutWrapper: FC<{
  timeout: number;
  onTimeout: () => void;
  children: ReactNode;
  enabled?: boolean;
}> = ({ timeout, onTimeout, children, enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;

    const timeoutId = window.setTimeout(onTimeout, timeout);
    return () => window.clearTimeout(timeoutId);
  }, [timeout, onTimeout, enabled]);

  return <>{children}</>;
};

// Main lazy wrapper component
export interface LazyComponentWrapperProps extends LazyWrapperOptions {
  children: ReactNode;
  componentName?: string;
}

export const LazyComponentWrapper: FC<LazyComponentWrapperProps> = ({
  children,
  componentName = 'Component',
  fallback = <DefaultLoadingSkeleton />,
  errorFallback,
  maxRetries = 3,
  retryDelay = 1000,
  timeout = 10000,
  onError,
  onRetry,
  onLoad,
}) => {
  const [isTimeout, setIsTimeout] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadStartTime] = useState(performance.now());

  const handleTimeout = useCallback(() => {
    setIsTimeout(true);
    DEBUG.logPerformance('lazy-component-timeout', Math.max(0, performance.now() - loadStartTime), {
      componentName,
      timeout,
    });
  }, [componentName, timeout]);

  const handleLoad = useCallback(() => {
    const loadTime = performance.now() - loadStartTime;
    if (onLoad) {
      onLoad(componentName, loadTime);
    }
    DEBUG.logPerformance('lazy-component-loaded', Math.max(0, loadTime), {
      componentName,
      loadTime,
    });
  }, [componentName, loadStartTime, onLoad]);

  useEffect(() => {
    setLoaded(true);
  }, [children]);

  useEffect(() => {
    if (loaded) {
      handleLoad();
    }
  }, [loaded, handleLoad]);

  // Show timeout error after specified timeout
  if (isTimeout) {
    const timeoutError = new Error(`Component ${componentName} failed to load within ${timeout}ms`);
    return (
      <LazyErrorBoundary
        fallback={errorFallback}
        maxRetries={maxRetries}
        retryDelay={retryDelay}
        componentName={componentName}
        onError={onError}
        onRetry={onRetry}
      >
        <DefaultErrorFallback
          error={timeoutError}
          retry={() => setIsTimeout(false)}
          componentName={componentName}
        />
      </LazyErrorBoundary>
    );
  }

  return (
    <LazyErrorBoundary
      fallback={errorFallback}
      maxRetries={maxRetries}
      retryDelay={retryDelay}
      componentName={componentName}
      onError={onError}
      onRetry={onRetry}
    >
      <Suspense fallback={fallback}>
        <TimeoutWrapper timeout={timeout} onTimeout={handleTimeout} enabled={!loaded}>
          {children}
        </TimeoutWrapper>
      </Suspense>
    </LazyErrorBoundary>
  );
};

// Higher-order component for creating lazy components with wrapper
export function createLazyComponent<P extends {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWrapperOptions & { componentName: string }
): React.FC<P> {
  const LazyComponent = lazy(importFunc);

  return (props: P) => (
    <LazyComponentWrapper {...options}>
      <LazyComponent {...props} />
    </LazyComponentWrapper>
  );
}

// Preloader utility
export class LazyComponentPreloader {
  private static preloadCache = new Map<string, Promise<any>>();

  static preload(
    key: string,
    importFunc: () => Promise<any>,
    priority: 'low' | 'medium' | 'high' = 'low'
  ): Promise<any> {
    if (this.preloadCache.has(key)) {
      return this.preloadCache.get(key)!;
    }

    const preloadPromise = this.schedulePreload(importFunc, priority);
    this.preloadCache.set(key, preloadPromise);

    return preloadPromise;
  }

  private static schedulePreload(
    importFunc: () => Promise<any>,
    priority: 'low' | 'medium' | 'high'
  ): Promise<any> {
    const delays = {
      high: 0,
      medium: 100,
      low: 500,
    };

    return new Promise(resolve => {
      setTimeout(() => {
        importFunc()
          .then(resolve)
          .catch(error => {
            console.warn('Preload failed:', error);
            resolve(null);
          });
      }, delays[priority]);
    });
  }

  static clearCache(): void {
    this.preloadCache.clear();
  }

  static getCacheStatus(): Array<{ key: string; loaded: boolean }> {
    return Array.from(this.preloadCache.entries()).map(([key, promise]) => ({
      key,
      loaded: Promise.resolve(promise) === promise,
    }));
  }
}

// Batch preloader for multiple components
export const preloadComponents = (
  components: Array<{
    key: string;
    importFunc: () => Promise<any>;
    priority?: 'low' | 'medium' | 'high';
  }>
): Promise<any[]> => {
  return Promise.allSettled(
    components.map(({ key, importFunc, priority }) =>
      LazyComponentPreloader.preload(key, importFunc, priority)
    )
  );
};

// Hook for using lazy component with wrapper
export const useLazyComponent = <P extends {}>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWrapperOptions & { componentName: string }
) => {
  const [LoadedComponent, setLoadedComponent] = useState<ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    importFunc()
      .then(module => {
        if (mounted) {
          setLoadedComponent(() => module.default);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const WrappedComponent = useCallback(
    (props: P) => {
      if (loading) {
        return <>{options.fallback || <DefaultLoadingSkeleton />}</>;
      }

      if (error || !LoadedComponent) {
        return (
          <DefaultErrorFallback
            error={error || new Error('Component failed to load')}
            retry={() => window.location.reload()}
            componentName={options.componentName}
          />
        );
      }

      return (
        <LazyComponentWrapper {...options}>
          <LoadedComponent {...props} />
        </LazyComponentWrapper>
      );
    },
    [LoadedComponent, loading, error, options]
  );

  return {
    Component: WrappedComponent,
    loading,
    error,
    preload: () => LazyComponentPreloader.preload(options.componentName, importFunc),
  };
};

export default LazyComponentWrapper;
