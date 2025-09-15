import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import { getLogger, logger, LogLevel } from './lib/logger';
import { errorStore, addGlobalError } from './lib/errorStore';
import type { AppError } from './lib/errorStore';
import { ErrorRecoverySystem } from './lib/recovery/ErrorRecoverySystem';
import { isDevelopment, isTauriEnvironment, isProduction } from './lib/environment';
import type { Container } from '@/lib/di/Container';
import { createApplicationContainer } from '@/lib/di/ServiceRegistry';
import { ServiceProvider } from '@/lib/di/ServiceProvider';
import './index.css';

// Initialize logger early in the application lifecycle
const mainLogger = getLogger('main');

// Enhanced global error handlers with centralized logging and error store integration
// These are attached only after the recovery system is initialized
function attachGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', async event => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    // Log through centralized logger with full context
    mainLogger.error('Unhandled promise rejection', error, {
      type: 'unhandledrejection',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      stack: error.stack,
      reason: event.reason,
    });

    // Add to error store for development mode tracking (recovery will be triggered automatically)
    const addedError = addGlobalError(error, {
      userActions: ['Promise rejection occurred'],
      additionalData: {
        type: 'unhandledrejection',
        reason: event.reason,
        url: window.location.href,
      },
    });

    // Trigger recovery in all envs
    const ers = ErrorRecoverySystem.getInstance();
    if (addedError) {
      ers.handleError(addedError);
    } else {
      const appError: AppError = {
        id: `global_${Date.now()}`,
        message: error.message,
        stack: error.stack,
        category: 'global',
        severity: 'high',
        timestamp: Date.now(),
        count: 1,
        resolved: false,
        context: { url: window.location.href, userAgent: navigator.userAgent, timestamp: Date.now() },
        hash: btoa(error.message).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
      };
      ers.handleError(appError);
    }

    // Prevent default browser error handling
    event.preventDefault();
  });

  window.addEventListener('error', async event => {
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
      message: event.message,
    });

    // Add to error store for development mode tracking (recovery will be triggered automatically)
    const addedError = addGlobalError(error, {
      userActions: ['Global error occurred'],
      additionalData: {
        type: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
        url: window.location.href,
      },
    });

    // Trigger recovery in all envs
    const ers = ErrorRecoverySystem.getInstance();
    if (addedError) {
      ers.handleError(addedError);
    } else {
      const appError: AppError = {
        id: `global_${Date.now()}`,
        message: error.message,
        stack: error.stack,
        category: 'global',
        severity: 'high',
        timestamp: Date.now(),
        count: 1,
        resolved: false,
        context: { url: window.location.href, userAgent: navigator.userAgent, timestamp: Date.now() },
        hash: btoa(error.message).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
      };
      ers.handleError(appError);
    }
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
    addGlobalError(error instanceof Error ? error : new Error(String(error)), {
      userActions: ['Environment initialization'],
      additionalData: { phase: 'environment-setup' },
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

// Initialize recovery system with context provider
const initializeRecoverySystem = async () => {
  const recoveryLogger = getLogger('recovery');

  try {
    // Dynamic import to avoid circular dependency
    const { ErrorRecoverySystem } = await import('./lib/recovery/ErrorRecoverySystem');
    const { AutoSaveStrategy } = await import('./lib/recovery/strategies/AutoSaveStrategy');
    const { ComponentResetStrategy } = await import('./lib/recovery/strategies/ComponentResetStrategy');
    const { BackupRestoreStrategy } = await import('./lib/recovery/strategies/BackupRestoreStrategy');
    const { SoftReloadStrategy } = await import('./lib/recovery/strategies/SoftReloadStrategy');
    const { HardResetStrategy } = await import('./lib/recovery/strategies/HardResetStrategy');

    const recoverySystem = ErrorRecoverySystem.getInstance();

    // Register built-in recovery strategies
    recoverySystem.registerStrategy(new AutoSaveStrategy());
    // Component reset for controlled remounts
    recoverySystem.registerStrategy(new ComponentResetStrategy());
    recoverySystem.registerStrategy(new BackupRestoreStrategy());
    recoverySystem.registerStrategy(new SoftReloadStrategy());
    // Last resort hard reset
    recoverySystem.registerStrategy(new HardResetStrategy());

    // Set up context provider for recovery operations
    recoverySystem.setContextProvider(async () => {
      // This will be called when recovery is needed to gather current app state
      try {
        // Try to get current application state
        const currentDesignData = (() => {
          try {
            const stored = localStorage.getItem('current_design');
            return stored ? JSON.parse(stored) : undefined;
          } catch {
            return undefined;
          }
        })();

        const currentAudioData = (() => {
          try {
            const stored = localStorage.getItem('current_audio');
            return stored ? JSON.parse(stored) : undefined;
          } catch {
            return undefined;
          }
        })();

        const userPreferences = (() => {
          try {
            const stored = localStorage.getItem('user_preferences');
            return stored ? JSON.parse(stored) : undefined;
          } catch {
            return undefined;
          }
        })();

        return {
          currentDesignData,
          currentAudioData,
          userPreferences,
          sessionId: `session_${Date.now()}`,
          projectId: localStorage.getItem('current_project_id') || undefined,
        };
      } catch (error) {
        recoveryLogger.warn('Failed to gather recovery context', error);
        return {
          sessionId: `fallback_${Date.now()}`,
        };
      }
    });

    // Check for recovery data from previous soft reload
    const { SoftReloadStrategy: SoftReloadClass } = await import('./lib/recovery/strategies/SoftReloadStrategy');
    const { hasRecovery, recoveryData } = await SoftReloadClass.checkForRecoveryData();

    if (hasRecovery && recoveryData) {
      recoveryLogger.info('Found recovery data from previous session, restoring...');
      try {
        await SoftReloadClass.restoreDataAfterReload(recoveryData);
        recoveryLogger.info('Recovery data restored successfully');
      } catch (restoreError) {
        recoveryLogger.error('Failed to restore recovery data', restoreError);
      }
    }

    recoveryLogger.info('Recovery system initialized successfully', {
      strategies: recoverySystem.getStrategies().map(s => ({ name: s.name, priority: s.priority })),
      hasRecoveryData: hasRecovery
    });

    return true;
  } catch (error) {
    recoveryLogger.error('Failed to initialize recovery system', error);
    return false;
  }
};

// Initialize recovery system BEFORE attaching global handlers
let recoveryReady = false;
try {
  recoveryReady = await initializeRecoverySystem();
  attachGlobalErrorHandlers();
} catch (error) {
  mainLogger.warn('Recovery system initialization failed', error);
}

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

  addGlobalError(rootError, {
    userActions: ['Application initialization', 'React root creation'],
    additionalData: {
      phase: 'react-root-creation',
      rootElement: rootElement ? 'found' : 'missing',
    },
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

const renderWith = (AppComponent: any, container?: Container) => {
  const renderLogger = getLogger('render');

  try {
    renderLogger.time('app-render');

    const AppContent = () => (
      <StrictMode>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <AppComponent />
          </Suspense>
        </ErrorBoundary>
      </StrictMode>
    );

    // Render with or without DI based on container availability
    if (container) {
      renderLogger.info('Rendering with dependency injection container');
      root.render(
        <ServiceProvider container={container}>
          <AppContent />
        </ServiceProvider>
      );
    } else {
      renderLogger.info('Rendering without dependency injection (fallback mode)');
      root.render(<AppContent />);
    }

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
            performanceMarks: performance.getEntriesByType('mark').map(m => m.name),
          });

          // Log performance warning if initialization is slow
          if (initTime > 3000) {
            renderLogger.warn('Slow application initialization detected', {
              duration: initTime,
              threshold: 3000,
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
      runtime: isTauriEnvironment() ? 'tauri' : 'web',
    });
  } catch (error) {
    const renderError = error instanceof Error ? error : new Error(String(error));
    renderLogger.fatal('Failed to render application', renderError);

    addGlobalError(renderError, {
      userActions: ['Application rendering', 'Component mounting'],
      additionalData: {
        phase: 'app-render',
        component: AppComponent?.name || 'Unknown',
      },
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

// Initialize dependency injection container
async function initializeDIContainer(): Promise<Container | null> {
  const diLogger = getLogger('dependency-injection');

  try {
    // Check if DI is enabled via environment variable or localStorage setting
    const diEnabled =
      import.meta.env.VITE_ENABLE_DI !== 'false' &&
      localStorage.getItem('archicomm-disable-di') !== 'true';

    if (!diEnabled) {
      diLogger.info('Dependency injection disabled via configuration');
      return null;
    }

    diLogger.time('di-container-init');
    diLogger.info('Initializing dependency injection container');

    const container = await createApplicationContainer();

    diLogger.timeEnd('di-container-init');
    diLogger.info('Dependency injection container initialized successfully', {
      services: container.getRegisteredServices(),
      dependencies: container.getDependencyGraph(),
    });

    return container;
  } catch (error) {
    const diError = error instanceof Error ? error : new Error(String(error));
    diLogger.error('Failed to initialize DI container, falling back to direct instantiation', diError);

    addGlobalError(diError, {
      userActions: ['Dependency injection initialization'],
      additionalData: {
        phase: 'di-container-init',
        fallbackMode: true,
      },
    });

    return null; // Fall back to direct instantiation
  }
}

// Load App dynamically with enhanced error handling and DI integration
function loadAndRenderApp() {
  const loadLogger = getLogger('app-loader');

  loadLogger.time('app-load');
  loadLogger.info('Starting application initialization with DI support');

  // Load the App component, then try to initialize DI and render with provider
  import('./components/AppContainer')
    .then((appModule) => {
      const AppComponent = appModule.default;
      return initializeDIContainer()
        .then(container => {
          loadLogger.timeEnd('app-load');
          renderWith(AppComponent, container || undefined);
        })
        .catch(err => {
          console.warn('DI initialization failed, rendering without DI:', err);
          loadLogger.timeEnd('app-load');
          renderWith(AppComponent);
        });
    })
    .catch(error => {
      loadLogger.timeEnd('app-load');
      const loadError = error instanceof Error ? error : new Error(String(error));
      loadLogger.fatal('Failed to load main App component', loadError);

      addGlobalError(loadError, {
        userActions: ['Application loading', 'Dynamic import'],
        additionalData: {
          phase: 'app-import',
          importPath: './components/AppContainer',
        },
      });

      try {
        (window as any).__APP_LOAD_ERROR__ = error;
      } catch {
        // Ignore error storing failures
      }

      const Fallback = () => (
        <div className='h-screen w-screen flex items-center justify-center bg-background'>
          <div className='max-w-md text-center p-6'>
            <h1 className='text-2xl font-bold text-foreground mb-4'>ArchiComm</h1>
            <p className='text-muted-foreground mb-6'>
              The application is currently loading. If this message persists, please refresh the
              page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
            >
              Refresh Page
            </button>
            <div className='text-left mt-4'>
              <details>
                <summary className='cursor-pointer text-sm text-muted-foreground'>
                  Technical details
                </summary>
                <pre className='mt-2 text-xs overflow-auto max-h-48 p-2 bg-muted rounded'>
                  {String(
                    (window as any).__APP_LOAD_ERROR__?.stack ||
                      (window as any).__APP_LOAD_ERROR__?.message ||
                      (window as any).__APP_LOAD_ERROR__ ||
                      ''
                  )}
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
    environment: environmentReady,
    recovery: recoveryReady,
  },
});

loadAndRenderApp();

// Enhanced development-only debugging with logging integration
if (isDevelopment()) {
  const debugLogger = getLogger('debug');

  // Add helpful debugging information
  debugLogger.info('🔧 Development mode active', {
    loggingReady,
    environmentReady,
    recoveryReady,
    rootElement: !!rootElement,
    logLevel: logger.getLevel(),
    errorStoreStats: errorStore.getStats(),
    recoveryStats: errorStore.getRecoveryStats(),
  });

  // Enhanced debugging utilities with logging integration and DI support
  (window as any).ArchiCommDebug = {
    // Storage utilities
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      debugLogger.info('Storage cleared');
    },

    // Dependency injection utilities
    dependencyInjection: {
      isEnabled: () => {
        return localStorage.getItem('archicomm-disable-di') !== 'true' &&
               import.meta.env.VITE_ENABLE_DI !== 'false';
      },
      enable: () => {
        localStorage.removeItem('archicomm-disable-di');
        debugLogger.info('Dependency injection enabled (requires refresh)');
      },
      disable: () => {
        localStorage.setItem('archicomm-disable-di', 'true');
        debugLogger.info('Dependency injection disabled (requires refresh)');
      },
      refreshWithDI: () => {
        localStorage.removeItem('archicomm-disable-di');
        window.location.reload();
      },
      refreshWithoutDI: () => {
        localStorage.setItem('archicomm-disable-di', 'true');
        window.location.reload();
      },
      status: () => {
        const enabled = (window as any).ArchiCommDebug.dependencyInjection.isEnabled();
        const containerExists = !!(window as any).__ARCHICOMM_DI_CONTAINER__;
        return {
          configurationEnabled: enabled,
          containerInitialized: containerExists,
          servicesAvailable: containerExists ?
            (window as any).__ARCHICOMM_DI_CONTAINER__.getRegisteredServices() : [],
        };
      },
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
      downloadLogs: (filename?: string, format?: 'json' | 'csv' | 'txt') =>
        logger.downloadLogs(filename, format),
      clearLogs: () => {
        logger.clearLogs();
        debugLogger.info('Logs cleared');
      },
    },

    // Error store utilities
    errorStore: {
      getState: () => errorStore.getState(),
      getStats: () => errorStore.getStats(),
      getRecoveryStats: () => errorStore.getRecoveryStats(),
      isRecoveryEnabled: () => errorStore.isRecoveryEnabled(),
      enableRecovery: (enabled: boolean) => {
        errorStore.enableRecovery(enabled);
        debugLogger.info(`Recovery ${enabled ? 'enabled' : 'disabled'}`);
      },
      getRecoveryHistory: () => errorStore.getRecoveryHistory(),
      isRecoveryInProgress: () => errorStore.isRecoveryInProgress(),
      clearErrors: () => {
        errorStore.clearErrors();
        debugLogger.info('Error store cleared');
      },
      exportErrors: () => errorStore.exportErrors(),
      addTestError: () => {
        addGlobalError('Test error for debugging', {
          userActions: ['Debug test'],
          additionalData: { source: 'ArchiCommDebug' },
        });
        debugLogger.info('Test error added');
      },
      addTestCriticalError: () => {
        addGlobalError('Critical test error that should trigger recovery', {
          userActions: ['Critical debug test'],
          additionalData: { source: 'ArchiCommDebug', critical: true },
        });
        debugLogger.info('Critical test error added (should trigger recovery)');
      },
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
      timestamp: new Date().toISOString(),
    }),

    // Environment utilities
    environment: {
      isDevelopment: isDevelopment(),
      isTauri: isTauriEnvironment(),
      loggingReady,
      environmentReady,
      recoveryReady,
    },
  };

  // Make logger, error store, and DI container globally accessible for debugging
  (window as any).__ARCHICOMM_LOGGER__ = logger;
  (window as any).__ARCHICOMM_ERROR_STORE__ = errorStore;

  // DI container will be set when initialized
  initializeDIContainer().then(container => {
    if (container) {
      (window as any).__ARCHICOMM_DI_CONTAINER__ = container;
      debugLogger.info('DI container available globally as window.__ARCHICOMM_DI_CONTAINER__');
    }
  });

  debugLogger.info('🛠️ Enhanced debug utilities available', {
    ArchiCommDebug: 'window.ArchiCommDebug',
    logger: 'window.__ARCHICOMM_LOGGER__',
    errorStore: 'window.__ARCHICOMM_ERROR_STORE__',
    diContainer: 'window.__ARCHICOMM_DI_CONTAINER__ (when initialized)',
  });
}
