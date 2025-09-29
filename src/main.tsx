// src/main.tsx
// Main entry point for ArchiComm application
// Sets up React root with simple error boundary and accessibility provider
// RELEVANT FILES: src/packages/ui/components/AppContainer/index.tsx, src/lib/config/environment.ts, src/lib/logging/logger.ts, src/packages/ui/components/ErrorBoundary/ErrorBoundary.tsx

import { StrictMode, Suspense, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { AccessibilityProvider } from '@ui/components/accessibility/AccessibilityProvider';
import { getLogger, logger, LogLevel } from './lib/logging/logger';
import { isDevelopment, isTauriEnvironment, isProduction } from './lib/config/environment';
import './index.css';

// Initialize performance monitoring and profiling infrastructure in development
if (import.meta.env.DEV) {
  // ProfilerOrchestrator temporarily disabled due to import issues
  // Can be re-enabled after fixing module exports
  /*
  import('./lib/performance/ProfilerOrchestrator').then(({ ProfilerOrchestrator }) => {
    const profilerOrchestrator = ProfilerOrchestrator.getInstance();

    // Start lightweight profiling session for app initialization
    profilerOrchestrator.startSession({
      name: 'app-initialization',
      duration: 10000, // Reduced to 10 seconds to minimize overhead
      componentsToTrack: [
        'DesignCanvas',
        'CanvasController',
        'ReactFlowCanvasWrapper'
      ], // Track only the most critical components
      triggerConditions: {
        renderThreshold: 100, // Increased threshold to 100ms
        updateDepthThreshold: 8, // Increased threshold to 8 levels
        memoryThreshold: 200 * 1024 * 1024, // Increased to 200MB
      },
      autoOptimize: false, // Disable auto-optimization to reduce overhead
    });

    // Make profiler orchestrator available globally
    (window as any).__PROFILER_ORCHESTRATOR__ = profilerOrchestrator;
    console.info('🎯 ProfilerOrchestrator initialized. Access via window.__PROFILER_ORCHESTRATOR__');
  }).catch(err => {
    console.warn('Failed to initialize ProfilerOrchestrator:', err);
  });
  */

  // Performance monitor temporarily disabled to reduce overhead
  /*
  import('./shared/utils/performanceMonitor').then(({ performanceMonitor }) => {
    // Make performance monitor available globally in development
    (window as any).__PERFORMANCE_MONITOR__ = performanceMonitor;
    console.info('🎯 Performance monitoring enabled. Access via window.__PERFORMANCE_MONITOR__');
  }).catch(err => {
    console.warn('Failed to initialize performance monitor:', err);
  });
  */

  // Why-did-you-render disabled for now to reduce performance overhead
  // Can be re-enabled when debugging specific render issues
  /*
  Promise.all([
    import('@welldone-software/why-did-you-render'),
    import('react')
  ])
    .then(([whyDidYouRender, reactMod]) => {
      const React = reactMod.default;
      whyDidYouRender.default(React, {
        trackAllPureComponents: false,
        trackHooks: true,
        logOwnerReasons: true,
        collapseGroups: true,
        include: [
          /^AppContent/,
          /^AppContainer/,
          /^ScreenRouter/,
          /^Canvas/,
          /^Design/,
          /^Custom/,
          /^Info/,
          /^Assignment/,
          /^Properties/,
        ],
        exclude: [/^ErrorBoundary/, /^Suspense/, /^StrictMode/, /^Fragment/, /^Provider/],
        notifier: (payload: any) => {
          try {
            const notifications = Array.isArray(payload) ? payload : [payload];
            const perf = (window as any).__PERFORMANCE_MONITOR__;
            const profiler = (window as any).__PROFILER_ORCHESTRATOR__;

            notifications.forEach((n: any) => {
              // Safe integration with performance monitor if available
              if (perf && typeof perf.trackRenderIssue === 'function') {
                perf.trackRenderIssue(n);
              }

              // Integration with ProfilerOrchestrator
              if (profiler && typeof profiler.recordRenderIssue === 'function') {
                const componentName = n?.displayName || n?.Component?.displayName || n?.Component?.name || 'UnknownComponent';
                profiler.recordRenderIssue({
                  componentName,
                  issue: n?.reason || n?.why || n,
                  timestamp: performance.now(),
                  source: 'why-did-you-render'
                });
              }

              // Console debug summary to aid profiling
              const name = n?.displayName || n?.Component?.displayName || n?.Component?.name || 'UnknownComponent';
              const reason = n?.reason || n?.why || n;
              // Keep log concise but informative
              // eslint-disable-next-line no-console
              console.debug('[WDYR]', name, reason);
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('WDYR notifier error:', e, payload);
          }
        }
      });
      console.info('🔍 Why-did-you-render initialized with performance integration');
    })
    .catch(err => {
      console.warn('Failed to initialize why-did-you-render:', err);
    });
  */
}

// Initialize logger early in the application lifecycle
const mainLogger = getLogger('main');

// Simple error boundary component
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    mainLogger.error('React Error Boundary caught error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
          <div className="text-center p-6">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Simple global error handlers
function attachGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    mainLogger.error('Unhandled promise rejection', error);
    event.preventDefault();
  });

  window.addEventListener('error', event => {
    const error = event.error || new Error(event.message || 'Unknown error');
    mainLogger.error('Global error caught', error);
  });
}

// Safe App import with fallback
// App is dynamically loaded later to avoid top-level await

// Enhanced loading fallback
const LoadingFallback = () => (
  <div className='h-screen w-screen flex items-center justify-center bg-background'>
    <div className='flex flex-col items-center gap-4'>
      <div className='relative'>
        <div className='w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin' />
      </div>
      <div className='text-center'>
        <h2 className='text-lg font-semibold text-foreground'>Loading ArchiComm</h2>
        <p className='text-sm text-muted-foreground mt-1'>
          Preparing your architecture workspace...
        </p>
      </div>
    </div>
  </div>
);

// Environment detection and setup with enhanced logging
const initializeEnvironment = () => {
  const envLogger = getLogger('environment');
  try {
    if (isTauriEnvironment()) {
      // Tauri-specific initialization
      envLogger.info('🚀 Running in Tauri environment', {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      });

      // Disable right-click context menu only in production; allow Shift+Right-Click bypass
      if (isProduction()) {
        document.addEventListener('contextmenu', e => {
          const mouseEvent = e as MouseEvent;
          if (mouseEvent.shiftKey) return; // support bypass
          e.preventDefault();
        });
      }

      // Handle window styling for macOS
      document.addEventListener('DOMContentLoaded', () => {
        const appElement = document.getElementById('root');
        if (appElement && navigator.platform.toLowerCase().includes('mac')) {
          appElement.style.borderRadius = '8px';
          appElement.style.overflow = 'hidden';
          envLogger.debug('Applied macOS window styling');
        }
      });

      // Add Tauri-specific styling
      document.documentElement.classList.add('tauri-app');
    } else {
      // Web environment initialization
      envLogger.info('🌐 Running in web environment', {
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
      document.documentElement.classList.add('web-app');
    }

    // Performance monitoring setup with logging
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('app-init-start');
      envLogger.debug('Performance monitoring initialized');
    }

    envLogger.info('Environment initialization completed successfully');
    return true;
  } catch (error) {
    envLogger.error('Environment initialization failed', error);
    return false;
  }
};

// Initialize logger configuration based on environment
const initializeLogging = () => {
  const loggingLogger = getLogger('logging');

  try {
    // Set log level based on environment
    if (isDevelopment()) {
      logger.setLevel(LogLevel.DEBUG);
      loggingLogger.info('Development logging enabled', {
        level: 'DEBUG',
        features: ['console', 'memory-buffer', 'file-logging'],
      });
    } else {
      logger.setLevel(LogLevel.WARN);
      loggingLogger.info('Production logging enabled', {
        level: 'WARN',
        features: ['console', 'memory-buffer'],
      });
    }

    // Log application startup
    loggingLogger.info('ArchiComm application starting', {
      timestamp: new Date().toISOString(),
      environment: isDevelopment() ? 'development' : 'production',
      runtime: isTauriEnvironment() ? 'tauri' : 'web',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize logging:', error);
    return false;
  }
};

// Initialize logging and environment
const loggingReady = initializeLogging();
const environmentReady = initializeEnvironment();

// Root element validation
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    'Root element not found. Please ensure index.html contains <div id="root"></div>'
  );
}

// Enhanced root creation with error handling and logging
let root: any;
const rootLogger = getLogger('react-root');

try {
  root = createRoot(rootElement);
  rootLogger.info('React root created successfully');
} catch (error) {
  const rootError = error instanceof Error ? error : new Error(String(error));
  rootLogger.fatal('Failed to create React root', rootError);

  // Fallback to legacy rendering if available
  rootElement.innerHTML = `
    <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui;">
      <div style="text-align: center; max-width: 400px; padding: 2rem;">
        <h1 style="margin-bottom: 1rem;">ArchiComm</h1>
        <p style="margin-bottom: 1rem; color: #666;">
          Failed to initialize the application. Please try refreshing the page.
        </p>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Refresh
        </button>
      </div>
    </div>
  `;
  throw error;
}

const renderApp = (AppComponent: any) => {
  const renderLogger = getLogger('render');

  try {
    renderLogger.time('app-render');

    root.render(
      <StrictMode>
        <ErrorBoundary>
          <AccessibilityProvider>
            <Suspense fallback={<LoadingFallback />}>
              <AppComponent />
            </Suspense>
          </AccessibilityProvider>
        </ErrorBoundary>
      </StrictMode>
    );

    renderLogger.timeEnd('app-render');
    renderLogger.info('✅ ArchiComm initialized successfully');
  } catch (error) {
    const renderError = error instanceof Error ? error : new Error(String(error));
    renderLogger.fatal('Failed to render application', renderError);

    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-center; font-family: system-ui;">
        <div style="text-center; padding: 2rem;">
          <h1 style="margin-bottom: 1rem;">Application Error</h1>
          <p style="margin-bottom: 1rem; color: #666;">ArchiComm failed to start. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
};

// Load and render the app
function loadAndRenderApp() {
  const loadLogger = getLogger('app-loader');

  loadLogger.time('app-load');
  loadLogger.info('Starting application initialization');

  import('@ui/components/AppContainer')
    .then((appModule) => {
      const AppComponent = appModule.default;
      loadLogger.timeEnd('app-load');
      renderApp(AppComponent);
    })
    .catch(error => {
      loadLogger.timeEnd('app-load');
      const loadError = error instanceof Error ? error : new Error(String(error));
      loadLogger.fatal('Failed to load main App component', loadError);

      const Fallback = () => (
        <div className='h-screen w-screen flex items-center justify-center bg-background'>
          <div className='max-w-md text-center p-6'>
            <h1 className='text-2xl font-bold text-foreground mb-4'>ArchiComm</h1>
            <p className='text-muted-foreground mb-6'>
              Failed to load the application. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
      renderApp(Fallback);
    });
}

// Attach global error handlers and start the application
attachGlobalErrorHandlers();

const startLogger = getLogger('startup');
startLogger.info('Starting ArchiComm application', {
  timestamp: new Date().toISOString(),
  readiness: {
    logging: loggingReady,
    environment: environmentReady,
  },
});

loadAndRenderApp();

// Development-only debugging
if (isDevelopment()) {
  const debugLogger = getLogger('debug');

  debugLogger.info('🔧 Development mode active', {
    loggingReady,
    environmentReady,
    rootElement: !!rootElement,
    logLevel: logger.getLevel(),
  });

  // Simple debug utilities
  (window as any).ArchiCommDebug = {
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      debugLogger.info('Storage cleared');
    },

    logger: {
      getLevel: () => logger.getLevel(),
      setLevel: (level: LogLevel) => {
        logger.setLevel(level);
        debugLogger.info(`Log level changed to ${LogLevel[level]}`);
      },
      clearLogs: () => {
        logger.clearLogs();
        debugLogger.info('Logs cleared');
      },
    },

    getSystemInfo: () => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }),

    environment: {
      isDevelopment: isDevelopment(),
      isTauri: isTauriEnvironment(),
      loggingReady,
      environmentReady,
    },
  };

  (window as any).__ARCHICOMM_LOGGER__ = logger;

  debugLogger.info('🛠️ Debug utilities available at window.ArchiCommDebug');
}