import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import { getLogger, logger, LogLevel } from './lib/logger';
import { errorStore, addGlobalError } from './lib/errorStore';
import { isDevelopment, isTauriEnvironment, isProduction } from './lib/environment';
import './index.css';

// Initialize logger early in the application lifecycle
const mainLogger = getLogger('main');

// Enhanced global error handlers with centralized logging and error store integration
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  
  // Log through centralized logger with full context
  mainLogger.error('Unhandled promise rejection', error, {
    type: 'unhandledrejection',
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    stack: error.stack,
    reason: event.reason
  });
  
  // Add to error store for development mode tracking
  addGlobalError(error, {
    userActions: ['Promise rejection occurred'],
    additionalData: {
      type: 'unhandledrejection',
      reason: event.reason,
      url: window.location.href
    }
  });
  
  // Prevent default browser error handling
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  const error = event.error || new Error(event.message || 'Unknown error');
  
  // Log through centralized logger with full context
  mainLogger.error('Global error caught', error, {
    type: 'global',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    message: event.message
  });
  
  // Add to error store for development mode tracking
  addGlobalError(error, {
    userActions: ['Global error occurred'],
    additionalData: {
      type: 'global',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message,
      url: window.location.href
    }
  });
  
  // Don't prevent default for regular errors
});

// Safe App import with fallback
// App is dynamically loaded later to avoid top-level await

// Enhanced loading fallback
const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Loading ArchiComm</h2>
        <p className="text-sm text-muted-foreground mt-1">Preparing your architecture workspace...</p>
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
        userAgent: navigator.userAgent
      });
      
      // Disable right-click context menu only in production; allow Shift+Right-Click bypass
      if (isProduction()) {
        document.addEventListener('contextmenu', (e) => {
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
        userAgent: navigator.userAgent
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
    addGlobalError(error instanceof Error ? error : new Error(String(error)), {
      userActions: ['Environment initialization'],
      additionalData: { phase: 'environment-setup' }
    });
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
        features: ['console', 'memory-buffer', 'file-logging']
      });
    } else {
      logger.setLevel(LogLevel.WARN);
      loggingLogger.info('Production logging enabled', {
        level: 'WARN',
        features: ['console', 'memory-buffer']
      });
    }
    
    // Log application startup
    loggingLogger.info('ArchiComm application starting', {
      timestamp: new Date().toISOString(),
      environment: isDevelopment() ? 'development' : 'production',
      runtime: isTauriEnvironment() ? 'tauri' : 'web',
      url: window.location.href,
      userAgent: navigator.userAgent
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
  throw new Error('Root element not found. Please ensure index.html contains <div id="root"></div>');
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
  
  addGlobalError(rootError, {
    userActions: ['Application initialization', 'React root creation'],
    additionalData: { 
      phase: 'react-root-creation',
      rootElement: rootElement ? 'found' : 'missing'
    }
  });
  
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

const renderWith = (AppComponent: any) => {
  const renderLogger = getLogger('render');
  
  try {
    renderLogger.time('app-render');
    
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <AppComponent />
          </Suspense>
        </ErrorBoundary>
      </StrictMode>
    );

    renderLogger.timeEnd('app-render');

    // Enhanced performance monitoring with logging
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('app-init-complete');
      
      try {
        performance.measure('app-initialization', 'app-init-start', 'app-init-complete');
        const measures = performance.getEntriesByName('app-initialization');
        if (measures.length > 0) {
          const initTime = measures[0].duration;
          renderLogger.info('Application initialization completed', {
            initializationTime: `${initTime.toFixed(2)}ms`,
            performanceMarks: performance.getEntriesByType('mark').map(m => m.name)
          });
          
          // Log performance warning if initialization is slow
          if (initTime > 3000) {
            renderLogger.warn('Slow application initialization detected', {
              duration: initTime,
              threshold: 3000
            });
          }
        }
      } catch (perfError) {
        renderLogger.warn('Performance measurement failed', perfError);
      }
    }

    renderLogger.info('✅ ArchiComm initialized successfully', {
      timestamp: new Date().toISOString(),
      environment: isDevelopment() ? 'development' : 'production',
      runtime: isTauriEnvironment() ? 'tauri' : 'web'
    });
    
  } catch (error) {
    const renderError = error instanceof Error ? error : new Error(String(error));
    renderLogger.fatal('Failed to render application', renderError);
    
    addGlobalError(renderError, {
      userActions: ['Application rendering', 'Component mounting'],
      additionalData: { 
        phase: 'app-render',
        component: AppComponent?.name || 'Unknown'
      }
    });
    
    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui; background: #f8f9fa;">
        <div style="text-align: center; max-width: 500px; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h1 style="margin-bottom: 1rem; color: #dc3545;">Application Error</h1>
          <p style="margin-bottom: 1rem; color: #666; line-height: 1.5;">
            ArchiComm encountered an error during startup. This might be due to a network issue or a temporary problem.
          </p>
          <div style="margin-bottom: 1rem;">
            <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
              Refresh Page
            </button>
            <button onclick="localStorage.clear(); window.location.reload()" style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Reset & Refresh
            </button>
          </div>
          <details style="text-align: left; margin-top: 1rem;">
            <summary style="cursor: pointer; color: #666;">Technical Details</summary>
            <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.8rem; overflow-x: auto;">${(window as any).__APP_LOAD_ERROR__?.message || ''}</pre>
          </details>
        </div>
      </div>
    `;
  }
};

// Load App dynamically with enhanced error handling and logging
function loadAndRenderApp() {
  const loadLogger = getLogger('app-loader');
  
  loadLogger.time('app-load');
  loadLogger.info('Starting dynamic App component import');
  
  import('./App')
    .then((appModule) => {
      loadLogger.timeEnd('app-load');
      loadLogger.info('App component loaded successfully', {
        hasDefault: !!appModule.default,
        exports: Object.keys(appModule)
      });
      renderWith(appModule.default);
    })
    .catch((error) => {
      loadLogger.timeEnd('app-load');
      const loadError = error instanceof Error ? error : new Error(String(error));
      loadLogger.fatal('Failed to load main App component', loadError);
      
      addGlobalError(loadError, {
        userActions: ['Application loading', 'Dynamic import'],
        additionalData: { 
          phase: 'app-import',
          importPath: './App'
        }
      });
      
      try {
        (window as any).__APP_LOAD_ERROR__ = error;
      } catch {}
      
      const Fallback = () => (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
          <div className="max-w-md text-center p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">ArchiComm</h1>
            <p className="text-muted-foreground mb-6">
              The application is currently loading. If this message persists, please refresh the page.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <div className="text-left mt-4">
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">Technical details</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-48 p-2 bg-muted rounded">
{String((window as any).__APP_LOAD_ERROR__?.stack || (window as any).__APP_LOAD_ERROR__?.message || (window as any).__APP_LOAD_ERROR__ || '')}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
      renderWith(Fallback);
    });
}

// Start the application with logging
const startLogger = getLogger('startup');
startLogger.info('Starting ArchiComm application', {
  timestamp: new Date().toISOString(),
  readiness: {
    logging: loggingReady,
    environment: environmentReady
  }
});

loadAndRenderApp();

// Enhanced development-only debugging with logging integration
if (isDevelopment()) {
  const debugLogger = getLogger('debug');
  
  // Add helpful debugging information
  debugLogger.info('🔧 Development mode active', {
    loggingReady,
    environmentReady,
    rootElement: !!rootElement,
    logLevel: logger.getLevel(),
    errorStoreStats: errorStore.getStats()
  });
  
  // Enhanced debugging utilities with logging integration
  (window as any).ArchiCommDebug = {
    // Storage utilities
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      debugLogger.info('Storage cleared');
    },
    
    // Performance utilities
    getPerformanceMarks: () => {
      if (performance.getEntriesByType) {
        return performance.getEntriesByType('mark');
      }
      return [];
    },
    getPerformanceMeasures: () => {
      if (performance.getEntriesByType) {
        return performance.getEntriesByType('measure');
      }
      return [];
    },
    
    // Logging utilities
    logger: {
      getLevel: () => logger.getLevel(),
      setLevel: (level: LogLevel) => {
        logger.setLevel(level);
        debugLogger.info(`Log level changed to ${LogLevel[level]}`);
      },
      getLogs: (filter?: any) => logger.getFilteredLogs(filter),
      exportLogs: (format?: 'json' | 'csv' | 'txt') => logger.exportLogs(format),
      downloadLogs: (filename?: string, format?: 'json' | 'csv' | 'txt') => logger.downloadLogs(filename, format),
      clearLogs: () => {
        logger.clearLogs();
        debugLogger.info('Logs cleared');
      }
    },
    
    // Error store utilities
    errorStore: {
      getState: () => errorStore.getState(),
      getStats: () => errorStore.getStats(),
      clearErrors: () => {
        errorStore.clearErrors();
        debugLogger.info('Error store cleared');
      },
      exportErrors: () => errorStore.exportErrors(),
      addTestError: () => {
        addGlobalError('Test error for debugging', {
          userActions: ['Debug test'],
          additionalData: { source: 'ArchiCommDebug' }
        });
        debugLogger.info('Test error added');
      }
    },
    
    // System utilities
    getSystemInfo: () => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      memory: (performance as any).memory,
      timing: performance.timing,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    }),
    
    // Environment utilities
    environment: {
      isDevelopment: isDevelopment(),
      isTauri: isTauriEnvironment(),
      loggingReady,
      environmentReady
    }
  };
  
  // Make logger and error store globally accessible for debugging
  (window as any).__ARCHICOMM_LOGGER__ = logger;
  (window as any).__ARCHICOMM_ERROR_STORE__ = errorStore;
  
  debugLogger.info('🛠️ Enhanced debug utilities available', {
    ArchiCommDebug: 'window.ArchiCommDebug',
    logger: 'window.__ARCHICOMM_LOGGER__',
    errorStore: 'window.__ARCHICOMM_ERROR_STORE__'
  });
}
