/**
 * Environment detection and configuration module
 * Provides centralized environment checking and feature flags for ArchiComm
 */

// Runtime environment detection
const detectRuntimeEnvironment = (): 'tauri' | 'web' => {
  try {
    // Check if we're running in Tauri by looking for the __TAURI__ global
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      return 'tauri';
    }

    // Also check for Tauri API availability
    if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
      return 'tauri';
    }

    return 'web';
  } catch (error) {
    // If anything goes wrong, default to web environment
    console.warn('Environment detection failed, defaulting to web:', error);
    return 'web';
  }
};

export const RUNTIME_ENV = detectRuntimeEnvironment();

/**
 * Check if the application is running in Tauri environment
 */
export const isTauriEnvironment = (): boolean => {
  return RUNTIME_ENV === 'tauri';
};

/**
 * Check if the application is running in web environment
 */
export const isWebEnvironment = (): boolean => {
  return RUNTIME_ENV === 'web';
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Check if we're in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

/**
 * Feature flags based on environment
 */
export const FEATURES = {
  // File system operations are only available in Tauri
  FILE_OPERATIONS: isTauriEnvironment(),

  // Native notifications are available in both environments
  NOTIFICATIONS: true,

  // Auto-save disabled per request; can re-enable later via flag
  AUTO_SAVE: false,

  // Window management only in Tauri
  WINDOW_MANAGEMENT: isTauriEnvironment(),

  // Export to native file system only in Tauri
  NATIVE_EXPORT: isTauriEnvironment(),

  // Deep linking support varies by environment
  DEEP_LINKING: isTauriEnvironment(),

  // Keyboard shortcuts work in both but may have different implementations
  KEYBOARD_SHORTCUTS: true,

  // System integration features only in Tauri
  SYSTEM_INTEGRATION: isTauriEnvironment(),

  // Performance monitoring available in both
  PERFORMANCE_MONITORING: true,
} as const;

/**
 * Environment-specific configuration
 */
export const CONFIG = {
  // Maximum file size for operations (bytes)
  MAX_FILE_SIZE: isTauriEnvironment() ? 100 * 1024 * 1024 : 10 * 1024 * 1024, // 100MB Tauri, 10MB web

  // Auto-save interval (milliseconds)
  AUTO_SAVE_INTERVAL: isTauriEnvironment() ? 30000 : 60000, // 30s Tauri, 60s web

  // Maximum number of undo steps
  MAX_UNDO_STEPS: isTauriEnvironment() ? 100 : 50,

  // Chunk size for large operations
  CHUNK_SIZE: isTauriEnvironment() ? 1024 * 1024 : 512 * 1024, // 1MB Tauri, 512KB web

  // Performance monitoring thresholds
  PERFORMANCE_THRESHOLDS: {
    RENDER_TIME: 16, // ms
    MEMORY_USAGE: isTauriEnvironment() ? 500 * 1024 * 1024 : 100 * 1024 * 1024, // 500MB Tauri, 100MB web
    BUNDLE_SIZE: 5 * 1024 * 1024, // 5MB
  },

  // Cache configuration
  CACHE: {
    MAX_ENTRIES: isTauriEnvironment() ? 1000 : 500,
    TTL: 5 * 60 * 1000, // 5 minutes
  },
} as const;

/**
 * Debug utilities for development
 */
export const DEBUG = {
  /**
   * Log environment information
   */
  logEnvironment: () => {
    if (isDevelopment()) {
      console.group('🌍 Environment Information');
      console.log('Runtime:', RUNTIME_ENV);
      console.log('Development:', isDevelopment());
      console.log('Features:', FEATURES);
      console.log('Config:', CONFIG);
      console.groupEnd();
    }
  },

  /**
   * Check if a feature is available and log if not
   */
  checkFeature: (feature: keyof typeof FEATURES, operation: string) => {
    if (!FEATURES[feature]) {
      console.warn(`🚫 Feature "${feature}" not available for operation: ${operation}`);
      return false;
    }
    return true;
  },

  /**
   * Log performance metrics
   */
  logPerformance: (operation: string, duration: number, data?: any) => {
    if (isDevelopment() && FEATURES.PERFORMANCE_MONITORING) {
      console.log(`⚡ ${operation}: ${duration.toFixed(2)}ms`, data);

      if (duration > CONFIG.PERFORMANCE_THRESHOLDS.RENDER_TIME) {
        console.warn(`⚠️ Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  },
} as const;

/**
 * Initialize environment debugging
 */
if (isDevelopment()) {
  DEBUG.logEnvironment();
}
