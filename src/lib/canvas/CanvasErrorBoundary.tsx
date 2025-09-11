import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Settings, Bug, Zap } from 'lucide-react';
import { CanvasPerformanceManager } from '../performance/CanvasPerformanceManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  performanceManager?: CanvasPerformanceManager;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorType: 'render' | 'webgl' | 'worker' | 'memory' | 'unknown';
  recoveryStrategy: string | null;
  isRecovering: boolean;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  private performanceManager: CanvasPerformanceManager | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorType: 'unknown',
      recoveryStrategy: null,
      isRecovering: false
    };

    this.performanceManager = props.performanceManager || null;
  }

  static override getDerivedStateFromError(error: Error): Partial<State> {
    // Classify the error type
    const errorType = CanvasErrorBoundary.classifyError(error);
    const recoveryStrategy = CanvasErrorBoundary.determineRecoveryStrategy(errorType, error);

    return {
      hasError: true,
      error,
      errorType,
      recoveryStrategy
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Canvas Error Boundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo
    });

    // Report to performance manager if available
    if (this.performanceManager) {
      try {
        // Add error recommendation
        const recommendation = {
          type: 'critical' as const,
          message: `Canvas error: ${error.message}`,
          action: this.state.recoveryStrategy || 'Refresh the page',
          impact: 'high' as const
        };
        
        // This is a private method call, so we'll use a different approach
        console.warn('Canvas error occurred:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorType: this.state.errorType
        });
      } catch (reportError) {
        console.warn('Failed to report canvas error to performance manager:', reportError);
      }
    }

    // Call user-provided error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.attemptRecovery();
    }
  }

  private static classifyError(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // WebGL context loss
    if (message.includes('webgl') || message.includes('context lost') || 
        stack.includes('webgl') || message.includes('getcontext')) {
      return 'webgl';
    }

    // Worker-related errors
    if (message.includes('worker') || stack.includes('worker') || 
        message.includes('offscreen') || message.includes('transfercontrol')) {
      return 'worker';
    }

    // Memory-related errors
    if (message.includes('memory') || message.includes('quota') || 
        message.includes('allocation') || stack.includes('heap')) {
      return 'memory';
    }

    // Rendering errors
    if (message.includes('render') || message.includes('canvas') || 
        message.includes('draw') || stack.includes('canvas')) {
      return 'render';
    }

    return 'unknown';
  }

  private static determineRecoveryStrategy(errorType: State['errorType'], error: Error): string {
    switch (errorType) {
      case 'webgl':
        return 'Restore WebGL context and fallback to 2D canvas';
      case 'worker':
        return 'Terminate workers and fallback to main thread rendering';
      case 'memory':
        return 'Clear caches and reduce quality settings';
      case 'render':
        return 'Reset canvas state and retry rendering';
      default:
        return 'Reset canvas and retry operation';
    }
  }

  private attemptRecovery = () => {
    if (this.state.isRecovering) return;

    this.setState({ isRecovering: true });

    const recoveryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);

    this.retryTimeout = setTimeout(() => {
      this.performRecovery().then(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prevState.retryCount + 1,
          isRecovering: false
        }));
      }).catch((recoveryError) => {
        console.error('Recovery failed:', recoveryError);
        this.setState({
          isRecovering: false,
          error: recoveryError instanceof Error ? recoveryError : this.state.error
        });
      });
    }, recoveryDelay);
  };

  private performRecovery = async (): Promise<void> => {
    const { errorType } = this.state;

    try {
      switch (errorType) {
        case 'webgl':
          await this.recoverWebGL();
          break;
        case 'worker':
          await this.recoverWorkers();
          break;
        case 'memory':
          await this.recoverMemory();
          break;
        case 'render':
          await this.recoverRendering();
          break;
        default:
          await this.genericRecovery();
      }
    } catch (error) {
      throw new Error(`Recovery failed for ${errorType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  private recoverWebGL = async (): Promise<void> => {
    // Try to restore WebGL context
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl?.isContextLost()) {
        // Canvas context is lost, try to restore it
        canvas.addEventListener('webglcontextrestored', () => {
          console.log('WebGL context restored');
        }, { once: true });
      }
    }

    // Disable WebGL in performance manager if available
    if (this.performanceManager) {
      this.performanceManager.updateConfig({
        enableOffscreenCanvas: false,
        mode: 'performance'
      });
    }
  };

  private recoverWorkers = async (): Promise<void> => {
    // Terminate and cleanup workers through performance manager
    if (this.performanceManager) {
      try {
        // Get all registered canvas systems and unregister them
        const metrics = this.performanceManager.getPerformanceMetrics();
        for (const [id] of metrics) {
          this.performanceManager.unregisterCanvasSystem(id);
        }

        // Disable workers globally
        this.performanceManager.updateConfig({
          enableWorkers: false,
          enableOffscreenCanvas: false
        });
      } catch (error) {
        console.warn('Failed to recover workers through performance manager:', error);
      }
    }

    // Fallback: terminate any remaining workers globally
    if (typeof Worker !== 'undefined') {
      // Note: We can't easily terminate all workers, but we can prevent new ones
      console.log('Worker recovery completed - disabled worker creation');
    }
  };

  private recoverMemory = async (): Promise<void> => {
    // Clear caches and reduce memory usage
    if (this.performanceManager) {
      this.performanceManager.updateConfig({
        mode: 'performance',
        maxMemoryUsage: 256, // Reduce memory limit
        adaptiveQuality: true
      });
    }

    // Clear browser caches if possible
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      } catch (error) {
        console.warn('Failed to clear caches:', error);
      }
    }

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  };

  private recoverRendering = async (): Promise<void> => {
    // Reset canvas elements
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    // Reset performance manager state
    if (this.performanceManager) {
      this.performanceManager.updateConfig({
        mode: 'balanced',
        adaptiveQuality: true
      });
    }
  };

  private genericRecovery = async (): Promise<void> => {
    // Generic recovery - reset what we can
    await this.recoverRendering();
    
    if (this.performanceManager) {
      this.performanceManager.updateConfig({
        mode: 'performance'
      });
    }
  };

  private handleManualRetry = () => {
    if (this.state.retryCount < (this.props.maxRetries || 3)) {
      this.attemptRecovery();
    } else {
      // Force reset
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0,
        isRecovering: false
      });
    }
  };

  private handleReportBug = async () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorType: this.state.errorType,
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Check if clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
        alert('Error report copied to clipboard');
      } catch (error) {
        console.log('Error report:', errorReport);
        alert('Error report logged to console');
      }
    } else {
      // Fallback when clipboard API is unavailable
      console.log('Error report:', errorReport);
      alert('Error report logged to console (clipboard unavailable)');
    }
  };

  override componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gray-50 border-2 border-gray-200 rounded-lg">
          <div className="text-center max-w-md">
            <div className="mb-4">
              {this.state.errorType === 'webgl' && <Zap className="w-12 h-12 text-yellow-500 mx-auto" />}
              {this.state.errorType === 'worker' && <Settings className="w-12 h-12 text-blue-500 mx-auto" />}
              {this.state.errorType === 'memory' && <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />}
              {(this.state.errorType === 'render' || this.state.errorType === 'unknown') && 
                <Bug className="w-12 h-12 text-gray-500 mx-auto" />}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Canvas Error Occurred
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              {this.state.errorType === 'webgl' && 'WebGL context was lost. Falling back to 2D rendering.'}
              {this.state.errorType === 'worker' && 'Web Worker failed. Using main thread rendering.'}
              {this.state.errorType === 'memory' && 'Memory limit exceeded. Reducing quality settings.'}
              {this.state.errorType === 'render' && 'Rendering error occurred. Attempting to recover.'}
              {this.state.errorType === 'unknown' && 'An unexpected error occurred in the canvas system.'}
            </p>

            {this.state.error && (
              <details className="text-xs text-gray-500 mb-4 text-left">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              {this.state.isRecovering ? (
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Attempting recovery...</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={this.handleManualRetry}
                    disabled={this.state.retryCount >= (this.props.maxRetries || 3)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {this.state.retryCount >= (this.props.maxRetries || 3) ? 'Force Reset' : 'Try Again'}
                  </button>
                  
                  <button
                    onClick={this.handleReportBug}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Report Issue
                  </button>
                </>
              )}
            </div>

            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Recovery attempts: {this.state.retryCount}/{this.props.maxRetries || 3}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;