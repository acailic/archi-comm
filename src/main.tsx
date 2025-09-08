import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import './index.css';

// Global error handlers for unhandled promise rejections and errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent default browser error handling
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Don't prevent default for regular errors
});

// Safe App import with fallback
let App: any;
try {
  // Dynamic import to handle potential loading issues
  const appModule = await import('./App');
  App = appModule.default;
} catch (error) {
  console.error('Failed to load main App component:', error);
  // Fallback App component
  App = () => (
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
      </div>
    </div>
  );
}

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

// Environment detection and setup
const initializeEnvironment = () => {
  try {
    // Detect Tauri environment safely
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    
    if (isTauri) {
      // Tauri-specific initialization
      console.log('🚀 Running in Tauri environment');
      
      // Disable right-click context menu in production
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
      
      // Handle window styling for macOS
      document.addEventListener('DOMContentLoaded', () => {
        const appElement = document.getElementById('root');
        if (appElement && navigator.platform.toLowerCase().includes('mac')) {
          appElement.style.borderRadius = '8px';
          appElement.style.overflow = 'hidden';
        }
      });
      
      // Add Tauri-specific styling
      document.documentElement.classList.add('tauri-app');
    } else {
      // Web environment initialization
      console.log('🌐 Running in web environment');
      document.documentElement.classList.add('web-app');
    }
    
    // Performance monitoring setup
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('app-init-start');
    }
    
    return true;
  } catch (error) {
    console.warn('Environment initialization failed:', error);
    return false;
  }
};

// Initialize environment
const environmentReady = initializeEnvironment();

// Root element validation
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Please ensure index.html contains <div id="root"></div>');
}

// Enhanced root creation with error handling
let root: any;
try {
  root = createRoot(rootElement);
} catch (error) {
  console.error('Failed to create React root:', error);
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

// Application rendering with comprehensive error boundaries
try {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>
  );
  
  // Mark initialization complete
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('app-init-complete');
    performance.measure('app-initialization', 'app-init-start', 'app-init-complete');
  }
  
  console.log('✅ ArchiComm initialized successfully');
  
} catch (error) {
  console.error('Failed to render application:', error);
  
  // Fallback rendering
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
          <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.8rem; overflow-x: auto;">${error.message}</pre>
        </details>
      </div>
    </div>
  `;
}

// Development-only debugging
if (import.meta.env.DEV) {
  // Add helpful debugging information
  console.log('🔧 Development mode active');
  console.log('Environment ready:', environmentReady);
  console.log('Root element:', rootElement);
  
  // Make debugging utilities available globally
  (window as any).ArchiCommDebug = {
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('Storage cleared');
    },
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
    }
  };
  
  console.log('🛠️ Debug utilities available at window.ArchiCommDebug');
}