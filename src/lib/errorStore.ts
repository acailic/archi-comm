/**
 * Error Store for Development Mode
 * Lightweight error management system for tracking application errors during development
 */

import React, { useEffect, useState } from 'react';
import { isDevelopment } from './environment';

// Error types and interfaces
export type ErrorCategory = 'react' | 'global' | 'performance' | 'network' | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  componentStack?: string;
  userActions?: string[];
  performanceMetrics?: {
    memoryUsage?: number;
    renderTime?: number;
    timestamp: number;
  };
  url?: string;
  userAgent?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

export interface AppError {
  id: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  count: number;
  resolved: boolean;
  context: ErrorContext;
  hash: string; // For deduplication
}

export interface ErrorStoreState {
  errors: AppError[];
  totalErrors: number;
  resolvedErrors: number;
  lastError?: AppError;
}

type ErrorListener = (state: ErrorStoreState) => void;
type ErrorAddListener = (error: AppError) => void;

class ErrorStoreImpl {
  private state: ErrorStoreState = {
    errors: [],
    totalErrors: 0,
    resolvedErrors: 0,
  };

  private listeners: ErrorListener[] = [];
  private errorAddListeners: ErrorAddListener[] = [];
  private maxErrors = 100; // Maximum number of errors to keep in memory
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes
  private maxErrorAge = 30 * 60 * 1000; // 30 minutes
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    if (isDevelopment()) {
      this.startCleanupTimer();
    }
  }

  /**
   * Add a new error to the store
   */
  addError(
    error: Error | string,
    category: ErrorCategory = 'unknown',
    context: Partial<ErrorContext> = {}
  ): AppError | null {
    if (!isDevelopment()) {
      return null;
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    
    // Create error hash for deduplication
    const hash = this.createErrorHash(errorMessage, errorStack, category);
    
    // Check if this error already exists
    const existingError = this.state.errors.find(e => e.hash === hash && !e.resolved);
    
    if (existingError) {
      // Increment count and update timestamp
      existingError.count++;
      existingError.timestamp = Date.now();
      existingError.context = { ...existingError.context, ...context };
      this.notifyListeners();
      return existingError;
    }

    // Create new error
    const appError: AppError = {
      id: this.generateId(),
      message: errorMessage,
      stack: errorStack,
      category,
      severity: this.determineSeverity(errorMessage, category),
      timestamp: Date.now(),
      count: 1,
      resolved: false,
      context: {
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        sessionId: this.getSessionId(),
        ...context,
      },
      hash,
    };

    // Add to state
    this.state.errors.unshift(appError);
    this.state.totalErrors++;
    this.state.lastError = appError;

    // Trim errors if we exceed max
    if (this.state.errors.length > this.maxErrors) {
      this.state.errors = this.state.errors.slice(0, this.maxErrors);
    }

    this.notifyListeners();
    this.notifyErrorAddListeners(appError);

    return appError;
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string): boolean {
    if (!isDevelopment()) {
      return false;
    }

    const error = this.state.errors.find(e => e.id === errorId);
    if (error && !error.resolved) {
      error.resolved = true;
      this.state.resolvedErrors++;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    if (!isDevelopment()) {
      return;
    }

    this.state.errors = [];
    this.state.totalErrors = 0;
    this.state.resolvedErrors = 0;
    this.state.lastError = undefined;
    this.notifyListeners();
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    if (!isDevelopment()) {
      return;
    }

    const unresolvedErrors = this.state.errors.filter(e => !e.resolved);
    const removedCount = this.state.errors.length - unresolvedErrors.length;
    
    this.state.errors = unresolvedErrors;
    this.state.resolvedErrors = Math.max(0, this.state.resolvedErrors - removedCount);
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState(): ErrorStoreState {
    return { ...this.state };
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.state.errors.filter(e => e.category === category);
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): AppError[] {
    return this.state.errors.filter(e => !e.resolved);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.state.errors.filter(e => e.severity === severity);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ErrorListener): () => void {
    if (!isDevelopment()) {
      return () => {};
    }

    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to new error additions
   */
  onErrorAdded(listener: ErrorAddListener): () => void {
    if (!isDevelopment()) {
      return () => {};
    }

    this.errorAddListeners.push(listener);
    return () => {
      this.errorAddListeners = this.errorAddListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get error statistics
   */
  getStats() {
    const unresolved = this.getUnresolvedErrors();
    const categories = this.state.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const severities = this.state.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      total: this.state.totalErrors,
      current: this.state.errors.length,
      unresolved: unresolved.length,
      resolved: this.state.resolvedErrors,
      categories,
      severities,
      lastErrorTime: this.state.lastError?.timestamp,
    };
  }

  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    if (!isDevelopment()) {
      return '[]';
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      errors: this.state.errors.map(error => ({
        ...error,
        timestampISO: new Date(error.timestamp).toISOString(),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Private methods

  private createErrorHash(message: string, stack?: string, category?: ErrorCategory): string {
    const hashInput = `${message}|${stack?.split('\n')[0] || ''}|${category}`;
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private determineSeverity(message: string, category: ErrorCategory): ErrorSeverity {
    const lowerMessage = message.toLowerCase();
    
    // Critical errors
    if (lowerMessage.includes('cannot read property') || 
        lowerMessage.includes('cannot access before initialization') ||
        lowerMessage.includes('maximum call stack') ||
        category === 'react') {
      return 'critical';
    }
    
    // High severity
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('timeout') ||
        category === 'performance') {
      return 'high';
    }
    
    // Medium severity
    if (lowerMessage.includes('warning') || 
        lowerMessage.includes('deprecated')) {
      return 'medium';
    }
    
    return 'low';
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('errorStore_sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorStore_sessionId', sessionId);
    }
    return sessionId;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in error store listener:', error);
      }
    });
  }

  private notifyErrorAddListeners(error: AppError): void {
    this.errorAddListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error add listener:', listenerError);
      }
    });
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldErrors();
    }, this.cleanupInterval);
  }

  private cleanupOldErrors(): void {
    const now = Date.now();
    const initialLength = this.state.errors.length;
    
    this.state.errors = this.state.errors.filter(error => {
      const age = now - error.timestamp;
      return age < this.maxErrorAge || !error.resolved;
    });

    if (this.state.errors.length !== initialLength) {
      this.notifyListeners();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.listeners = [];
    this.errorAddListeners = [];
  }
}

// Create singleton instance
const errorStore = new ErrorStoreImpl();

// Export the store instance and types
export { errorStore };

// Convenience functions for common operations
export const addError = (
  error: Error | string,
  category: ErrorCategory = 'unknown',
  context: Partial<ErrorContext> = {}
): AppError | null => {
  return errorStore.addError(error, category, context);
};

export const addReactError = (
  error: Error,
  componentStack?: string,
  context: Partial<ErrorContext> = {}
): AppError | null => {
  return errorStore.addError(error, 'react', {
    ...context,
    componentStack,
  });
};

export const addPerformanceError = (
  message: string,
  performanceMetrics: ErrorContext['performanceMetrics'],
  context: Partial<ErrorContext> = {}
): AppError | null => {
  return errorStore.addError(message, 'performance', {
    ...context,
    performanceMetrics,
  });
};

export const addGlobalError = (
  error: Error | string,
  context: Partial<ErrorContext> = {}
): AppError | null => {
  return errorStore.addError(error, 'global', context);
};

export const addNetworkError = (
  error: Error | string,
  context: Partial<ErrorContext> = {}
): AppError | null => {
  return errorStore.addError(error, 'network', context);
};

// Hook for React components (simple subscription)
export const useErrorStore = () => {
  const [state, setState] = useState(errorStore.getState());
  
  useEffect(() => {
    const unsubscribe = errorStore.subscribe(setState);
    return unsubscribe;
  }, []);
  
  return {
    ...state,
    addError: errorStore.addError.bind(errorStore),
    resolveError: errorStore.resolveError.bind(errorStore),
    clearErrors: errorStore.clearErrors.bind(errorStore),
    clearResolvedErrors: errorStore.clearResolvedErrors.bind(errorStore),
    getStats: errorStore.getStats.bind(errorStore),
    exportErrors: errorStore.exportErrors.bind(errorStore),
  };
};

// Development-only utilities
if (isDevelopment()) {
  // Make error store available globally for debugging
  (window as any).__ERROR_STORE__ = errorStore;
  
  // Add some helpful debugging functions
  (window as any).__ERROR_STORE_DEBUG__ = {
    addTestError: () => {
      errorStore.addError('Test error for debugging', 'unknown', {
        userActions: ['clicked button', 'navigated to page'],
        additionalData: { testData: true },
      });
    },
    addTestReactError: () => {
      const error = new Error('Test React component error');
      error.stack = 'Error: Test React component error\n    at TestComponent (test.tsx:10:5)';
      errorStore.addError(error, 'react', {
        componentStack: 'TestComponent > App > Root',
      });
    },
    clearAll: () => errorStore.clearErrors(),
    exportToConsole: () => console.log(errorStore.exportErrors()),
    getStats: () => errorStore.getStats(),
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    errorStore.destroy();
  });
}
