import { useUXOptimizer } from '../lib/user-experience/UXOptimizer';
import { getLogger } from '../lib/logger';
import { addError, addPerformanceError, errorStore } from '../lib/errorStore';
import { useCallback, useMemo } from 'react';

export interface NavigationData {
  screen: string;
  previousScreen: string;
  timestamp?: number;
}

export interface CanvasActionData {
  actionType: string;
  data: Record<string, any>;
  success: boolean;
  componentType?: string;
  position?: { x: number; y: number };
  complexity?: number;
}

export interface DialogActionData {
  actionType: string;
  dialogType: string;
  data: Record<string, any>;
  duration?: number;
  success?: boolean;
}

export interface KeyboardShortcutData {
  shortcut: string;
  action: string;
  success: boolean;
  context?: string;
}

/**
 * Custom hook for tracking user experience and interactions throughout the application.
 * Provides convenience methods for common tracking scenarios while wrapping the UXOptimizer functionality.
 * Enhanced with centralized logging and error tracking for better debugging and analysis.
 */
export const useUXTracker = () => {
  const uxOptimizer = useUXOptimizer();

  // Create a scoped logger for UX tracking
  const logger = useMemo(() => getLogger('ux-tracker'), []);

  /**
   * Track navigation between screens or views
   * @param screen - The destination screen/view identifier
   * @param previousScreen - The previous screen/view identifier
   */
  const trackNavigation = useCallback(
    (screen: string, previousScreen: string) => {
      const startTime = performance.now();

      try {
        const actionData = {
          type: 'navigate',
          data: {
            screen,
            previousScreen,
            timestamp: Date.now(),
          },
          context: {
            page: screen,
            component: 'Navigation',
            userIntent: 'navigate',
          },
          success: true,
        };

        // Track with UX optimizer
        uxOptimizer.trackAction(actionData);

        // Log navigation event with performance timing
        const duration = performance.now() - startTime;
        logger.info('User navigation tracked', {
          screen,
          previousScreen,
          duration: Math.round(duration * 100) / 100,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Failed to track navigation', error, {
          screen,
          previousScreen,
          duration,
          attemptedAction: 'trackNavigation',
        });

        // Add to error store for development debugging
        addError(error instanceof Error ? error : new Error(String(error)), 'unknown', {
          userActions: [`navigate from ${previousScreen} to ${screen}`],
          additionalData: { screen, previousScreen, duration },
        });
      }
    },
    [uxOptimizer, logger]
  );

  /**
   * Track canvas-related actions (component operations, connections, etc.)
   * @param actionType - Type of canvas action (component-drop, annotation-create, etc.)
   * @param data - Action-specific data
   * @param success - Whether the action was successful
   */
  const trackCanvasAction = useCallback(
    (actionType: string, data: Record<string, any>, success: boolean = true) => {
      const startTime = performance.now();
      const memoryBefore = (performance as any).memory?.usedJSHeapSize;

      try {
        const actionData = {
          type: actionType,
          data: {
            ...data,
            timestamp: Date.now(),
          },
          context: {
            page: 'design-canvas',
            component: 'Canvas',
            userIntent: getCanvasUserIntent(actionType),
          },
          success,
        };

        // Track with UX optimizer
        uxOptimizer.trackAction(actionData);

        // Log canvas action with performance metrics
        const duration = performance.now() - startTime;
        const memoryAfter = (performance as any).memory?.usedJSHeapSize;
        const memoryDelta = memoryAfter && memoryBefore ? memoryAfter - memoryBefore : undefined;

        const logLevel = success ? 'info' : 'warn';
        logger[logLevel](`Canvas action: ${actionType}`, {
          actionType,
          success,
          duration: Math.round(duration * 100) / 100,
          memoryDelta,
          userIntent: getCanvasUserIntent(actionType),
          data: {
            ...data,
            componentType: data.componentType,
            position: data.position,
            complexity: data.complexity,
          },
          timestamp: new Date().toISOString(),
        });

        // Track performance issues
        if (duration > 100) {
          // Actions taking longer than 100ms
          addPerformanceError(
            `Slow canvas action: ${actionType}`,
            {
              renderTime: duration,
              memoryUsage: memoryAfter,
              timestamp: Date.now(),
            },
            {
              userActions: [`performed ${actionType} on canvas`],
              additionalData: { actionType, data, duration },
            }
          );
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Failed to track canvas action', error, {
          actionType,
          data,
          duration,
          attemptedAction: 'trackCanvasAction',
        });

        // Add to error store with canvas context
        addError(error instanceof Error ? error : new Error(String(error)), 'unknown', {
          userActions: [`attempted ${actionType} on canvas`],
          additionalData: { actionType, data, duration },
        });
      }
    },
    [uxOptimizer, logger]
  );

  /**
   * Track dialog interactions (open, edit, save, cancel, etc.)
   * @param actionType - Type of dialog action (open, save, cancel, etc.)
   * @param dialogType - Type of dialog (annotation-edit, confirmation, etc.)
   * @param data - Action-specific data
   */
  const trackDialogAction = useCallback(
    (actionType: string, dialogType: string, data: Record<string, any>) => {
      const startTime = performance.now();

      try {
        const success = actionType !== 'error' && actionType !== 'cancel';
        const actionData = {
          type: `dialog-${actionType}`,
          data: {
            dialogType,
            ...data,
            timestamp: Date.now(),
          },
          context: {
            page: 'dialog',
            component: dialogType,
            userIntent: getDialogUserIntent(actionType),
          },
          success,
        };

        // Track with UX optimizer
        uxOptimizer.trackAction(actionData);

        // Log dialog interaction with timing
        const duration = performance.now() - startTime;
        const logLevel = success ? 'info' : 'warn';
        logger[logLevel](`Dialog action: ${actionType}`, {
          actionType,
          dialogType,
          success,
          duration: Math.round(duration * 100) / 100,
          userIntent: getDialogUserIntent(actionType),
          data: {
            ...data,
            dialogDuration: data.duration,
          },
          timestamp: new Date().toISOString(),
        });

        // Track dialog errors specifically
        if (actionType === 'error') {
          addError(data.error || `Dialog error in ${dialogType}`, 'unknown', {
            userActions: [`interacted with ${dialogType} dialog`],
            additionalData: { actionType, dialogType, data },
          });
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Failed to track dialog action', error, {
          actionType,
          dialogType,
          data,
          duration,
          attemptedAction: 'trackDialogAction',
        });

        // Add to error store with dialog context
        addError(error instanceof Error ? error : new Error(String(error)), 'unknown', {
          userActions: [`attempted ${actionType} on ${dialogType} dialog`],
          additionalData: { actionType, dialogType, data, duration },
        });
      }
    },
    [uxOptimizer, logger]
  );

  /**
   * Track keyboard shortcut usage
   * @param shortcut - The keyboard shortcut used (e.g., 'Ctrl+S', 'Escape')
   * @param action - The action performed by the shortcut
   * @param success - Whether the shortcut action was successful
   */
  const trackKeyboardShortcut = useCallback(
    (shortcut: string, action: string, success: boolean = true) => {
      const startTime = performance.now();

      try {
        const actionData = {
          type: 'keyboard-shortcut',
          data: {
            shortcut,
            action,
            timestamp: Date.now(),
          },
          context: {
            page: getCurrentPage(),
            component: 'Keyboard',
            userIntent: 'efficiency',
          },
          success,
        };

        // Track with UX optimizer
        uxOptimizer.trackAction(actionData);

        // Log keyboard shortcut usage for efficiency analysis
        const duration = performance.now() - startTime;
        const logLevel = success ? 'debug' : 'warn';
        logger[logLevel](`Keyboard shortcut used: ${shortcut}`, {
          shortcut,
          action,
          success,
          duration: Math.round(duration * 100) / 100,
          page: getCurrentPage(),
          userIntent: 'efficiency',
          timestamp: new Date().toISOString(),
        });

        // Track failed shortcuts for UX improvement
        if (!success) {
          logger.warn('Keyboard shortcut failed', {
            shortcut,
            action,
            page: getCurrentPage(),
            possibleCause: 'shortcut conflict or disabled state',
          });
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Failed to track keyboard shortcut', error, {
          shortcut,
          action,
          duration,
          attemptedAction: 'trackKeyboardShortcut',
        });

        // Add to error store with keyboard context
        addError(error instanceof Error ? error : new Error(String(error)), 'unknown', {
          userActions: [`used keyboard shortcut ${shortcut} for ${action}`],
          additionalData: { shortcut, action, duration },
        });
      }
    },
    [uxOptimizer, logger]
  );

  /**
   * Track performance-related events
   * @param metric - Performance metric name
   * @param value - Metric value
   * @param context - Additional context for the metric
   */
  const trackPerformance = useCallback(
    (metric: string, value: number, context?: Record<string, any>) => {
      const startTime = performance.now();
      const memoryUsage = (performance as any).memory?.usedJSHeapSize;

      try {
        const actionData = {
          type: 'performance-metric',
          data: {
            metric,
            value,
            context: context || {},
            timestamp: Date.now(),
          },
          context: {
            page: getCurrentPage(),
            component: 'Performance',
            userIntent: 'performance',
          },
          success: true,
        };

        // Track with UX optimizer
        uxOptimizer.trackAction(actionData);

        // Log performance metric with detailed context
        const duration = performance.now() - startTime;
        logger.info(`Performance metric: ${metric}`, {
          metric,
          value,
          duration: Math.round(duration * 100) / 100,
          memoryUsage,
          page: getCurrentPage(),
          context: context || {},
          timestamp: new Date().toISOString(),
          performanceEntry: {
            name: metric,
            value,
            unit: getMetricUnit(metric),
            threshold: getMetricThreshold(metric),
          },
        });

        // Track performance issues
        const threshold = getMetricThreshold(metric);
        if (threshold && value > threshold) {
          addPerformanceError(
            `Performance threshold exceeded for ${metric}`,
            {
              renderTime: metric.includes('render') ? value : undefined,
              memoryUsage: metric.includes('memory') ? value : memoryUsage,
              timestamp: Date.now(),
            },
            {
              userActions: [`triggered performance metric: ${metric}`],
              additionalData: { metric, value, threshold, context },
            }
          );

          logger.warn(`Performance threshold exceeded`, {
            metric,
            value,
            threshold,
            exceedBy: value - threshold,
            context,
          });
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('Failed to track performance metric', error, {
          metric,
          value,
          context,
          duration,
          attemptedAction: 'trackPerformance',
        });

        // Add to error store with performance context
        addError(error instanceof Error ? error : new Error(String(error)), 'performance', {
          userActions: [`tracked performance metric: ${metric}`],
          additionalData: { metric, value, context, duration },
        });
      }
    },
    [uxOptimizer, logger]
  );

  /**
   * Track error events
   * @param error - Error information
   * @param context - Additional context about when/where the error occurred
   */
  const trackError = useCallback(
    (error: string | Error, context?: Record<string, any>) => {
      const startTime = performance.now();
      const memoryUsage = (performance as any).memory?.usedJSHeapSize;

      try {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const actionData = {
          type: 'error',
          data: {
            error: errorObj.message,
            stack: errorObj.stack,
            context: context || {},
            timestamp: Date.now(),
          },
          context: {
            page: getCurrentPage(),
            component: 'Error',
            userIntent: 'recover',
          },
          success: false,
        };

        // Track with UX optimizer
        uxOptimizer.trackAction(actionData);

        // Log error with comprehensive context
        const duration = performance.now() - startTime;
        logger.error('User experience error tracked', errorObj, {
          duration: Math.round(duration * 100) / 100,
          memoryUsage,
          page: getCurrentPage(),
          userContext: context || {},
          errorDetails: {
            message: errorObj.message,
            stack: errorObj.stack,
            name: errorObj.name,
          },
          timestamp: new Date().toISOString(),
        });

        // Add to error store with UX context
        const appError = addError(errorObj, 'unknown', {
          userActions: context?.userActions || ['encountered error during UX interaction'],
          additionalData: {
            ...context,
            page: getCurrentPage(),
            memoryUsage,
            trackingDuration: duration,
          },
        });

        // Log error store addition
        if (appError) {
          logger.debug('Error added to error store', {
            errorId: appError.id,
            category: appError.category,
            severity: appError.severity,
            count: appError.count,
          });
        }
      } catch (trackingError) {
        const duration = performance.now() - startTime;
        logger.fatal('Critical failure in error tracking', trackingError, {
          originalError: error instanceof Error ? error.message : String(error),
          context,
          duration,
          attemptedAction: 'trackError',
        });

        // Last resort: try to add tracking error to error store
        try {
          addError(
            trackingError instanceof Error ? trackingError : new Error(String(trackingError)),
            'unknown',
            {
              userActions: ['error tracking system failure'],
              additionalData: { originalError: String(error), context, duration },
            }
          );
        } catch (finalError) {
          // If even this fails, we can only log to console as fallback
          console.error('Complete failure in error tracking system:', {
            trackingError,
            originalError: error,
            finalError,
            context,
          });
        }
      }
    },
    [uxOptimizer, logger]
  );

  /**
   * Get recent user actions for error context
   */
  const getRecentUserActions = useCallback(
    (limit: number = 5): string[] => {
      try {
        const errorStoreState = errorStore.getState();
        const recentErrors = errorStoreState.errors
          .slice(0, limit)
          .flatMap(error => error.context.userActions || []);

        return recentErrors.length > 0 ? recentErrors : ['no recent actions tracked'];
      } catch (error) {
        logger.warn('Failed to get recent user actions', { error: String(error) });
        return ['failed to retrieve recent actions'];
      }
    },
    [logger]
  );

  /**
   * Log user interaction patterns for analysis
   */
  const logUserInteractionPattern = useCallback(
    (pattern: {
      sequence: string[];
      duration: number;
      success: boolean;
      context?: Record<string, any>;
    }) => {
      try {
        logger.info('User interaction pattern detected', {
          pattern: {
            sequence: pattern.sequence,
            duration: Math.round(pattern.duration * 100) / 100,
            success: pattern.success,
            sequenceLength: pattern.sequence.length,
            averageActionTime: pattern.duration / pattern.sequence.length,
          },
          context: pattern.context || {},
          timestamp: new Date().toISOString(),
          page: getCurrentPage(),
        });
      } catch (error) {
        logger.error('Failed to log user interaction pattern', error, {
          pattern,
          attemptedAction: 'logUserInteractionPattern',
        });
      }
    },
    [logger]
  );

  return {
    trackNavigation,
    trackCanvasAction,
    trackDialogAction,
    trackKeyboardShortcut,
    trackPerformance,
    trackError,
    getRecentUserActions,
    logUserInteractionPattern,
    uxOptimizer,
    logger,
  };
};

/**
 * Determine user intent based on canvas action type
 */
function getCanvasUserIntent(actionType: string): string {
  const intentMap: Record<string, string> = {
    'component-drop': 'design',
    'component-move': 'adjust',
    'component-select': 'select',
    'component-delete': 'cleanup',
    'annotation-create': 'document',
    'annotation-edit': 'clarify',
    'connection-create': 'relate',
    save: 'preserve',
    export: 'share',
    zoom: 'navigate',
  };

  return intentMap[actionType] || 'interact';
}

/**
 * Determine user intent based on dialog action type
 */
function getDialogUserIntent(actionType: string): string {
  const intentMap: Record<string, string> = {
    open: 'access',
    save: 'confirm',
    cancel: 'abandon',
    delete: 'remove',
    edit: 'modify',
  };

  return intentMap[actionType] || 'interact';
}

/**
 * Get current page context based on URL or app state
 */
function getCurrentPage(): string {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.includes('canvas')) return 'design-canvas';
    if (path.includes('review')) return 'review';
    return 'app';
  }
  return 'app';
}

/**
 * Get appropriate unit for performance metrics
 */
function getMetricUnit(metric: string): string {
  if (metric.includes('time') || metric.includes('duration')) return 'ms';
  if (metric.includes('memory') || metric.includes('size')) return 'bytes';
  if (metric.includes('fps') || metric.includes('frame')) return 'fps';
  if (metric.includes('count') || metric.includes('number')) return 'count';
  return 'value';
}

/**
 * Get performance threshold for metrics
 */
function getMetricThreshold(metric: string): number | null {
  const thresholds: Record<string, number> = {
    'render-time': 16.67, // 60fps threshold
    'load-time': 1000, // 1 second
    'memory-usage': 50 * 1024 * 1024, // 50MB
    fps: 30, // Minimum acceptable FPS
    'interaction-delay': 100, // 100ms for responsive feel
    'canvas-render-time': 33, // 30fps for canvas operations
    'dialog-open-time': 200, // 200ms for dialog responsiveness
  };

  return thresholds[metric] || null;
}
