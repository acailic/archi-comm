import React from 'react';
import { getLogger } from '../../lib/logger';
import { addReactError, type ErrorSeverity } from '../../lib/errorStore';
import { isDevelopment } from '../../lib/environment';

type Props = { 
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean; // If true, only this boundary's children are affected
};

type State = { 
  hasError: boolean; 
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  severity?: ErrorSeverity;
  retryCount: number;
  lastErrorTime: number;
};

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
  severity: ErrorSeverity;
  canRetry: boolean;
  retryCount: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private logger = getLogger('ErrorBoundary');
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  private retryTimeWindow = 30000; // 30 seconds

  state: State = { 
    hasError: false,
    retryCount: 0,
    lastErrorTime: 0
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    
    // Reset retry count if enough time has passed
    const retryCount = timeSinceLastError > this.retryTimeWindow ? 0 : this.state.retryCount;
    
    // Determine error severity
    const severity = this.determineSeverity(error);
    
    // Create enhanced error context
    const errorContext = this.createErrorContext(error, errorInfo);
    
    // Log to centralized logger
    this.logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      retryCount,
      severity,
      context: errorContext,
      canRetry: this.canRetry(retryCount),
      isolate: this.props.isolate
    });

    // Add to error store for development overlay
    const errorId = addReactError(error, errorInfo.componentStack, {
      ...errorContext,
      performanceMetrics: this.getPerformanceMetrics(),
      additionalData: {
        errorBoundary: this.constructor.name,
        retryCount,
        canRetry: this.canRetry(retryCount),
        isolate: this.props.isolate
      }
    })?.id;

    // Update state
    this.setState({ 
      error,
      errorInfo,
      errorId,
      severity,
      retryCount,
      lastErrorTime: now
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        this.logger.error('Error in custom error handler', handlerError);
      }
    }
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Critical errors that break the app
    if (
      message.includes('cannot read property') ||
      message.includes('cannot access before initialization') ||
      message.includes('maximum call stack') ||
      message.includes('out of memory') ||
      stack.includes('recursion') ||
      stack.includes('maximum call stack')
    ) {
      return 'critical';
    }
    
    // High severity errors that affect functionality
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('permission denied') ||
      message.includes('not found') ||
      error.name === 'ChunkLoadError' ||
      error.name === 'TypeError'
    ) {
      return 'high';
    }
    
    // Medium severity for warnings and deprecations
    if (
      message.includes('warning') ||
      message.includes('deprecated') ||
      message.includes('invalid prop')
    ) {
      return 'medium';
    }
    
    return 'low';
  }

  private createErrorContext(error: Error, errorInfo: React.ErrorInfo) {
    return {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      componentStack: errorInfo.componentStack,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      reactVersion: React.version,
      isDevelopment: isDevelopment(),
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : undefined
    };
  }

  private getPerformanceMetrics() {
    if (typeof performance === 'undefined') return undefined;
    
    try {
      const memory = (performance as any).memory;
      return {
        memoryUsage: memory?.usedJSHeapSize,
        timestamp: Date.now(),
        renderTime: performance.now()
      };
    } catch {
      return undefined;
    }
  }

  private canRetry(retryCount: number): boolean {
    return retryCount < this.maxRetries;
  }

  private handleRetry = () => {
    if (!this.canRetry(this.state.retryCount)) {
      this.logger.warn('Maximum retry attempts reached', {
        retryCount: this.state.retryCount,
        maxRetries: this.maxRetries
      });
      return;
    }

    this.logger.info('Retrying after error', {
      retryCount: this.state.retryCount + 1,
      errorMessage: this.state.error?.message
    });

    // Add delay before retry to prevent rapid retries
    setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        severity: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }, this.retryDelay);
  };

  private handleReset = () => {
    this.logger.info('Resetting error boundary', {
      errorMessage: this.state.error?.message,
      retryCount: this.state.retryCount
    });

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      severity: undefined,
      retryCount: 0,
      lastErrorTime: 0
    });
  };

  private handleCopyError = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

    const errorDetails = this.formatErrorForCopy();
    
    try {
      await navigator.clipboard.writeText(errorDetails);
      this.logger.info('Error details copied to clipboard');
      
      // Show temporary feedback (you might want to use a toast notification)
      if (isDevelopment()) {
        console.log('✅ Error details copied to clipboard');
      }
    } catch (clipboardError) {
      this.logger.warn('Failed to copy to clipboard, falling back to console', clipboardError);
      console.log('Error Details:\n', errorDetails);
    }
  };

  private formatErrorForCopy(): string {
    const { error, errorInfo, severity } = this.state;
    if (!error || !errorInfo) return '';

    const timestamp = new Date().toISOString();
    const context = this.createErrorContext(error, errorInfo);
    
    return `
ArchiComm Error Report
=====================
Timestamp: ${timestamp}
Severity: ${severity}
Error: ${error.name}: ${error.message}

Component Stack:
${errorInfo.componentStack}

Error Stack:
${error.stack}

Context:
${JSON.stringify(context, null, 2)}

Performance Metrics:
${JSON.stringify(this.getPerformanceMetrics(), null, 2)}
`.trim();
  }

  private handleOpenDiagnostics = () => {
    this.logger.info('Opening developer diagnostics');
    
    // Trigger global diagnostics page (this will be handled by App.tsx)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openDeveloperDiagnostics', {
        detail: { errorId: this.state.errorId }
      }));
    }
  };

  private handleReportIssue = () => {
    this.logger.info('Reporting issue');
    
    const errorDetails = this.formatErrorForCopy();
    const subject = encodeURIComponent(`ArchiComm Error Report: ${this.state.error?.name}`);
    const body = encodeURIComponent(errorDetails);
    
    // Open email client or issue tracker
    const mailtoUrl = `mailto:support@archicomm.app?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.handleReset}
            severity={this.state.severity || 'low'}
            canRetry={this.canRetry(this.state.retryCount)}
            retryCount={this.state.retryCount}
          />
        );
      }

      // Default enhanced error UI
      const { error, errorInfo, severity, retryCount } = this.state;
      const canRetry = this.canRetry(retryCount);
      const severityColors = {
        low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        medium: 'text-orange-600 bg-orange-50 border-orange-200',
        high: 'text-red-600 bg-red-50 border-red-200',
        critical: 'text-red-800 bg-red-100 border-red-300'
      };
      const colorClass = severityColors[severity || 'low'];

      return (
        <div className={`p-6 border rounded-lg ${colorClass}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-semibold">
                  {severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : '⚠️'} 
                  Something went wrong
                </span>
                {severity && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    severity === 'critical' ? 'bg-red-200 text-red-800' :
                    severity === 'high' ? 'bg-orange-200 text-orange-800' :
                    severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {severity.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-sm opacity-80 mb-2">
                {this.getErrorDescription(error, severity)}
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-4 p-3 bg-white bg-opacity-50 rounded border">
            <div className="font-medium text-sm mb-1">{error.name}</div>
            <div className="text-sm">{error.message}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                🔄 Try Again {retryCount > 0 && `(${retryCount}/${this.maxRetries})`}
              </button>
            )}
            
            <button
              onClick={this.handleReset}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
            >
              🔄 Reset
            </button>
            
            <button
              onClick={this.handleCopyError}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
            >
              📋 Copy Details
            </button>
            
            {isDevelopment() && (
              <button
                onClick={this.handleOpenDiagnostics}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
              >
                🔍 Open Diagnostics
              </button>
            )}
            
            <button
              onClick={this.handleReportIssue}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
            >
              📧 Report Issue
            </button>
          </div>

          {/* Technical Details */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium mb-2 hover:text-opacity-80">
              🔧 Technical Details
            </summary>
            
            <div className="space-y-3">
              {/* Component Stack */}
              {errorInfo.componentStack && (
                <div>
                  <div className="text-xs font-medium mb-1 opacity-70">Component Stack:</div>
                  <pre className="text-xs overflow-auto max-h-32 p-2 bg-white bg-opacity-50 rounded border whitespace-pre-wrap">
{errorInfo.componentStack.trim()}
                  </pre>
                </div>
              )}
              
              {/* Error Stack */}
              {error.stack && (
                <div>
                  <div className="text-xs font-medium mb-1 opacity-70">Error Stack:</div>
                  <pre className="text-xs overflow-auto max-h-48 p-2 bg-white bg-opacity-50 rounded border whitespace-pre-wrap">
{error.stack.trim()}
                  </pre>
                </div>
              )}
              
              {/* Additional Context */}
              {isDevelopment() && (
                <div>
                  <div className="text-xs font-medium mb-1 opacity-70">Context:</div>
                  <pre className="text-xs overflow-auto max-h-32 p-2 bg-white bg-opacity-50 rounded border whitespace-pre-wrap">
{JSON.stringify(this.createErrorContext(error, errorInfo), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>

          {/* Recovery Suggestions */}
          {this.getRecoverySuggestions(error, severity).length > 0 && (
            <div className="mt-4 p-3 bg-white bg-opacity-30 rounded border">
              <div className="text-sm font-medium mb-2">💡 Suggestions:</div>
              <ul className="text-sm space-y-1">
                {this.getRecoverySuggestions(error, severity).map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }

  private getErrorDescription(error: Error, severity?: ErrorSeverity): string {
    const message = error.message.toLowerCase();
    
    if (severity === 'critical') {
      return 'A critical error occurred that prevents the application from functioning properly.';
    }
    
    if (message.includes('chunk')) {
      return 'Failed to load application resources. This might be due to a network issue or outdated cache.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'A network error occurred while communicating with the server.';
    }
    
    if (message.includes('permission')) {
      return 'The application doesn\'t have the necessary permissions to perform this action.';
    }
    
    if (message.includes('not found')) {
      return 'A required resource or component could not be found.';
    }
    
    return 'An unexpected error occurred in the application.';
  }

  private getRecoverySuggestions(error: Error, severity?: ErrorSeverity): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      suggestions.push('Try refreshing the page to reload the application');
      suggestions.push('Clear your browser cache and reload');
      suggestions.push('Check your internet connection');
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
      suggestions.push('Contact support if the problem persists');
    }
    
    if (message.includes('permission')) {
      suggestions.push('Check if you have the necessary permissions');
      suggestions.push('Try logging out and logging back in');
    }
    
    if (severity === 'critical') {
      suggestions.push('Refresh the page to restart the application');
      suggestions.push('Clear browser data and try again');
      suggestions.push('Contact support with the error details');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Contact support if the issue persists');
    }
    
    return suggestions;
  }
}

// Export default error boundary with sensible defaults
export default ErrorBoundary;

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
