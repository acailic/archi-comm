/**
 * Error Store for Development Mode
 * Lightweight error management system for tracking application errors during development
 */

import { useEffect, useState } from 'react';
import { isDevelopment } from '../config/environment';
import type { RecoveryResult } from '@lib/recovery/ErrorRecoverySystem';

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
  timestamp?: number;
  additionalData?: Record<string, any>;
  recoveryAttempted?: boolean;
  recoveryResult?: RecoveryResult;
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

  // Recovery system integration
  private recoveryEnabled = true;
  private recoverySystem?: any; // Dynamic import to avoid circular dependency
  private recoveryRateLimit = new Map<string, number>();
  private recoveryRateLimitWindow = 60 * 1000; // 1 minute
  private maxRecoveryAttempts = 3;

  constructor() {
    if (isDevelopment()) {
      this.startCleanupTimer();
      this.initializeRecoverySystem();
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

    // Trigger recovery if conditions are met
    this.maybeTrigerRecovery(appError);

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
    const categories = this.state.errors.reduce(
      (acc, error) => {
        acc[error.category] = (acc[error.category] || 0) + 1;
        return acc;
      },
      {} as Record<ErrorCategory, number>
    );

    const severities = this.state.errors.reduce(
      (acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      },
      {} as Record<ErrorSeverity, number>
    );

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
    return btoa(hashInput)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
  }

  private determineSeverity(message: string, category: ErrorCategory): ErrorSeverity {
    const lowerMessage = message.toLowerCase();

    // Critical errors
    if (
      lowerMessage.includes('cannot read property') ||
      lowerMessage.includes('cannot access before initialization') ||
      lowerMessage.includes('maximum call stack') ||
      category === 'react'
    ) {
      return 'critical';
    }

    // High severity
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('timeout') ||
      category === 'performance'
    ) {
      return 'high';
    }

    // Medium severity
    if (lowerMessage.includes('warning') || lowerMessage.includes('deprecated')) {
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
   * Recovery system integration methods
   */

  private async initializeRecoverySystem(): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { ErrorRecoverySystem } = await import('@lib/recovery/ErrorRecoverySystem');
      this.recoverySystem = ErrorRecoverySystem.getInstance();
    } catch (error) {
      console.warn('Failed to initialize recovery system:', error);
      this.recoveryEnabled = false;
    }
  }

  private maybeTrigerRecovery(error: AppError): void {
    if (!this.recoveryEnabled || !this.recoverySystem) {
      return;
    }

    // Check if error meets recovery criteria
    if (!this.shouldTriggerRecovery(error)) {
      return;
    }

    // Check rate limiting
    if (this.isRecoveryRateLimited(error)) {
      return;
    }

    // Trigger recovery asynchronously
    this.triggerRecovery(error);
  }

  private shouldTriggerRecovery(error: AppError): boolean {
    // Trigger recovery for critical and high severity errors
    if (error.severity === 'critical' || error.severity === 'high') {
      return true;
    }

    // Trigger recovery for specific categories
    const recoverableCategories: ErrorCategory[] = ['react', 'global', 'performance'];
    if (recoverableCategories.includes(error.category)) {
      return true;
    }

    // Don't trigger recovery if already attempted
    if (error.context.recoveryAttempted) {
      return false;
    }

    return false;
  }

  private isRecoveryRateLimited(error: AppError): boolean {
    const now = Date.now();
    const rateKey = `${error.category}_${error.severity}`;
    const lastAttempt = this.recoveryRateLimit.get(rateKey) || 0;

    if (now - lastAttempt < this.recoveryRateLimitWindow) {
      return true;
    }

    // Check global rate limit
    const attempts = Array.from(this.recoveryRateLimit.values())
      .filter(timestamp => now - timestamp < this.recoveryRateLimitWindow);

    return attempts.length >= this.maxRecoveryAttempts;
  }

  private async triggerRecovery(error: AppError): Promise<void> {
    try {
      const rateKey = `${error.category}_${error.severity}`;
      this.recoveryRateLimit.set(rateKey, Date.now());

      // Mark error as having recovery attempted
      error.context.recoveryAttempted = true;

      // Trigger recovery
      const recoveryResult = await this.recoverySystem.handleError(error);

      // Update error context with recovery result
      error.context.recoveryResult = recoveryResult;

      // Notify listeners of the updated error
      this.notifyListeners();
    } catch (recoveryError) {
      console.error('Recovery system failed:', recoveryError);

      // Update error context with recovery failure
      error.context.recoveryResult = {
        success: false,
        strategy: 'system',
        message: 'Recovery system encountered an error'
      };

      this.notifyListeners();
    }
  }

  /**
   * Recovery system control methods
   */

  public enableRecovery(enabled: boolean): void {
    this.recoveryEnabled = enabled;
  }

  public isRecoveryEnabled(): boolean {
    return this.recoveryEnabled && !!this.recoverySystem;
  }

  public getRecoveryHistory(): any[] {
    return this.recoverySystem?.getRecoveryHistory() || [];
  }

  public isRecoveryInProgress(): boolean {
    return this.recoverySystem?.isRecoveryInProgress() || false;
  }

  /**
   * Get recovery statistics
   */
  public getRecoveryStats() {
    const errorsWithRecovery = this.state.errors.filter(e => e.context.recoveryAttempted);
    const successfulRecoveries = errorsWithRecovery.filter(e => e.context.recoveryResult?.success);
    const failedRecoveries = errorsWithRecovery.filter(e => e.context.recoveryResult && !e.context.recoveryResult.success);

    const recoveryStrategies = errorsWithRecovery.reduce((acc, error) => {
      const strategy = error.context.recoveryResult?.strategy || 'unknown';
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAttempts: errorsWithRecovery.length,
      successful: successfulRecoveries.length,
      failed: failedRecoveries.length,
      successRate: errorsWithRecovery.length > 0 ? (successfulRecoveries.length / errorsWithRecovery.length) * 100 : 0,
      strategies: recoveryStrategies,
      rateLimitActive: this.recoveryRateLimit.size > 0,
      recoveryEnabled: this.recoveryEnabled
    };
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
    this.recoveryRateLimit.clear();
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
    addTestCriticalError: () => {
      const error = new Error('Test critical error that should trigger recovery');
      errorStore.addError(error, 'global', {
        additionalData: { testCriticalError: true },
      });
    },
    clearAll: () => errorStore.clearErrors(),
    exportToConsole: () => console.log(errorStore.exportErrors()),
    getStats: () => errorStore.getStats(),
    getRecoveryStats: () => errorStore.getRecoveryStats(),
    isRecoveryEnabled: () => errorStore.isRecoveryEnabled(),
    enableRecovery: (enabled: boolean) => errorStore.enableRecovery(enabled),
    getRecoveryHistory: () => errorStore.getRecoveryHistory(),
    isRecoveryInProgress: () => errorStore.isRecoveryInProgress(),
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    errorStore.destroy();
  });
}
