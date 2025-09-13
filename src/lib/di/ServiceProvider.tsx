// src/lib/di/ServiceProvider.tsx
// React integration for the dependency injection system with context and hooks
// Provides service access throughout the React component tree via context
// RELEVANT FILES: src/lib/di/Container.ts, src/lib/di/ServiceInterfaces.ts

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback,
  ComponentType,
} from 'react';
import { Container, ServiceToken, ServiceNotFoundError } from './Container';

/**
 * Props for the ServiceProvider component
 */
export interface ServiceProviderProps {
  container: Container;
  children: React.ReactNode;
  fallback?: ComponentType<{ error: Error }>;
}

/**
 * React context for dependency injection container access
 */
const ServiceContext = createContext<Container | null>(null);

/**
 * Custom error boundary for service resolution failures
 */
interface ServiceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ServiceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: ComponentType<{ error: Error }> },
  ServiceErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ServiceErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Service resolution error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-red-800 font-semibold">Service Error</h2>
          <p className="text-red-700 text-sm mt-1">
            Failed to resolve service: {this.state.error.message}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-red-600 cursor-pointer">Debug Info</summary>
              <pre className="text-xs text-red-600 mt-1 overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: ComponentType<{ error: Error }> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
    <h2 className="text-red-800 font-semibold">Service Unavailable</h2>
    <p className="text-red-700 text-sm mt-1">
      The application service is temporarily unavailable. Please try refreshing the page.
    </p>
    {process.env.NODE_ENV === 'development' && (
      <p className="text-red-600 text-xs mt-2">{error.message}</p>
    )}
  </div>
);

/**
 * Service provider component that makes DI container available to React components
 * Wraps children with service context and error boundary for graceful error handling
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  container,
  children,
  fallback = DefaultErrorFallback,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize container and validate critical services
    const initializeContainer = async () => {
      try {
        // Validate that the container is properly configured
        const registeredServices = container.getRegisteredServices();

        if (process.env.NODE_ENV === 'development') {
          console.log('ServiceProvider: Registered services:', registeredServices);
        }

        setIsInitialized(true);
      } catch (error) {
        const initError = error instanceof Error ? error : new Error(String(error));
        setInitError(initError);
        console.error('ServiceProvider initialization failed:', initError);
      }
    };

    initializeContainer();

    // Cleanup function
    return () => {
      // Container cleanup is handled by the parent component
    };
  }, [container]);

  // Show loading state while initializing
  if (!isInitialized && !initError) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-600">Initializing services...</div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    return <DefaultErrorFallback error={initError} />;
  }

  return (
    <ServiceErrorBoundary fallback={fallback}>
      <ServiceContext.Provider value={container}>
        {children}
      </ServiceContext.Provider>
    </ServiceErrorBoundary>
  );
};

/**
 * Hook to resolve services synchronously for React components
 * Services must be pre-resolved or available synchronously
 */
export function useService<T>(token: ServiceToken<T>): T {
  const container = useContext(ServiceContext);

  if (!container) {
    throw new ServiceNotFoundError(
      'ServiceProvider not found. Component must be wrapped with ServiceProvider to use services.'
    );
  }

  const service = React.useMemo(() => {
    try {
      return container.resolveSync(token);
    } catch {
      throw new Error(
        `Service '${token.name}' not available synchronously. Pre-resolve or use useAsyncService.`
      );
    }
  }, [container, token]);

  return service;
}

/**
 * Hook for asynchronous service resolution with loading states
 * Handles services that require async initialization
 */
export function useAsyncService<T>(token: ServiceToken<T>): {
  service: T | null;
  loading: boolean;
  error: Error | null;
} {
  const container = useContext(ServiceContext);
  const [service, setService] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!container) {
      setError(new ServiceNotFoundError('ServiceProvider not found'));
      setLoading(false);
      return;
    }

    let cancelled = false;

    const resolveService = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try sync resolution first
        try {
          const syncService = container.resolveSync(token);
          if (!cancelled) {
            setService(syncService);
            setLoading(false);
          }
          return;
        } catch {
          // Fall back to async resolution
        }

        // Async resolution
        const resolvedService = await container.resolve(token);

        if (!cancelled) {
          setService(resolvedService);
          setLoading(false);
        }
      } catch (resolveError) {
        if (!cancelled) {
          const error = resolveError instanceof Error
            ? resolveError
            : new Error(String(resolveError));
          setError(error);
          setLoading(false);
        }
      }
    };

    resolveService();

    return () => {
      cancelled = true;
    };
  }, [container, token]);

  return { service, loading, error };
}

/**
 * Hook to access the DI container directly
 * Enables advanced container operations in components
 */
export function useServiceContainer(): Container {
  const container = useContext(ServiceContext);

  if (!container) {
    throw new ServiceNotFoundError(
      'ServiceProvider not found. Component must be wrapped with ServiceProvider to access container.'
    );
  }

  return container;
}

/**
 * Higher-order component that injects services as props
 * Provides backward compatibility for class components
 */
export function withServices<P extends object>(
  tokens: ServiceToken<any>[],
  Component: ComponentType<P>
): ComponentType<Omit<P, keyof ServiceTokenMap<typeof tokens>>> {
  const WithServicesComponent = (props: Omit<P, keyof ServiceTokenMap<typeof tokens>>) => {
    const container = useServiceContainer();
    const services: any = {};

    // Resolve all requested services
    for (const token of tokens) {
      try {
        services[token.name] = container.resolveSync(token);
      } catch (error) {
        console.error(`Failed to resolve service ${token.name} in withServices HOC:`, error);
        throw error;
      }
    }

    return <Component {...(props as P)} {...services} />;
  };

  // Set display name for debugging
  WithServicesComponent.displayName = `withServices(${Component.displayName || Component.name})`;

  return WithServicesComponent;
}

// Utility type for service token mapping
type ServiceTokenMap<T extends readonly ServiceToken<any>[]> = {
  [K in T[number]['name']]: T[number] extends ServiceToken<infer U> ? U : never;
};

/**
 * Development utility hook for debugging service resolution
 * Only available in development mode
 */
export function useServiceDebug(): {
  listServices: () => string[];
  getDependencyGraph: () => Record<string, string[]>;
  testService: (token: ServiceToken<any>) => Promise<boolean>;
} {
  const container = useServiceContainer();

  const listServices = useCallback(() => {
    return container.getRegisteredServices();
  }, [container]);

  const getDependencyGraph = useCallback(() => {
    return container.getDependencyGraph();
  }, [container]);

  const testService = useCallback(async (token: ServiceToken<any>) => {
    try {
      await container.resolve(token);
      return true;
    } catch {
      return false;
    }
  }, [container]);

  // Only expose debug utilities in development
  if (process.env.NODE_ENV === 'development') {
    return { listServices, getDependencyGraph, testService };
  }

  return {
    listServices: () => [],
    getDependencyGraph: () => ({}),
    testService: async () => false,
  };
}
