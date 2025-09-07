import { useUXOptimizer } from '../lib/user-experience/UXOptimizer';

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
 */
export const useUXTracker = () => {
  const uxOptimizer = useUXOptimizer();

  /**
   * Track navigation between screens or views
   * @param screen - The destination screen/view identifier
   * @param previousScreen - The previous screen/view identifier
   */
  const trackNavigation = (screen: string, previousScreen: string) => {
    try {
      const actionData = {
        type: 'navigate',
        data: {
          screen,
          previousScreen,
          timestamp: Date.now()
        },
        context: {
          page: screen,
          component: 'Navigation',
          userIntent: 'navigate'
        },
        success: true
      };
      uxOptimizer.trackAction(actionData);
    } catch (error) {
      console.warn('Failed to track navigation:', error);
    }
  };

  /**
   * Track canvas-related actions (component operations, connections, etc.)
   * @param actionType - Type of canvas action (component-drop, annotation-create, etc.)
   * @param data - Action-specific data
   * @param success - Whether the action was successful
   */
  const trackCanvasAction = (actionType: string, data: Record<string, any>, success: boolean = true) => {
    try {
      const actionData = {
        type: actionType,
        data: {
          ...data,
          timestamp: Date.now()
        },
        context: {
          page: 'design-canvas',
          component: 'Canvas',
          userIntent: getCanvasUserIntent(actionType)
        },
        success
      };
      uxOptimizer.trackAction(actionData);
    } catch (error) {
      console.warn('Failed to track canvas action:', error);
    }
  };

  /**
   * Track dialog interactions (open, edit, save, cancel, etc.)
   * @param actionType - Type of dialog action (open, save, cancel, etc.)
   * @param dialogType - Type of dialog (annotation-edit, confirmation, etc.)
   * @param data - Action-specific data
   */
  const trackDialogAction = (actionType: string, dialogType: string, data: Record<string, any>) => {
    try {
      const success = actionType !== 'error' && actionType !== 'cancel';
      const actionData = {
        type: `dialog-${actionType}`,
        data: {
          dialogType,
          ...data,
          timestamp: Date.now()
        },
        context: {
          page: 'dialog',
          component: dialogType,
          userIntent: getDialogUserIntent(actionType)
        },
        success
      };
      uxOptimizer.trackAction(actionData);
    } catch (error) {
      console.warn('Failed to track dialog action:', error);
    }
  };

  /**
   * Track keyboard shortcut usage
   * @param shortcut - The keyboard shortcut used (e.g., 'Ctrl+S', 'Escape')
   * @param action - The action performed by the shortcut
   * @param success - Whether the shortcut action was successful
   */
  const trackKeyboardShortcut = (shortcut: string, action: string, success: boolean = true) => {
    try {
      const actionData = {
        type: 'keyboard-shortcut',
        data: {
          shortcut,
          action,
          timestamp: Date.now()
        },
        context: {
          page: getCurrentPage(),
          component: 'Keyboard',
          userIntent: 'efficiency'
        },
        success
      };
      uxOptimizer.trackAction(actionData);
    } catch (error) {
      console.warn('Failed to track keyboard shortcut:', error);
    }
  };

  /**
   * Track performance-related events
   * @param metric - Performance metric name
   * @param value - Metric value
   * @param context - Additional context for the metric
   */
  const trackPerformance = (metric: string, value: number, context?: Record<string, any>) => {
    try {
      const actionData = {
        type: 'performance-metric',
        data: {
          metric,
          value,
          context: context || {},
          timestamp: Date.now()
        },
        context: {
          page: getCurrentPage(),
          component: 'Performance',
          userIntent: 'performance'
        },
        success: true
      };
      uxOptimizer.trackAction(actionData);
    } catch (error) {
      console.warn('Failed to track performance:', error);
    }
  };

  /**
   * Track error events
   * @param error - Error information
   * @param context - Additional context about when/where the error occurred
   */
  const trackError = (error: string | Error, context?: Record<string, any>) => {
    try {
      const actionData = {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          context: context || {},
          timestamp: Date.now()
        },
        context: {
          page: getCurrentPage(),
          component: 'Error',
          userIntent: 'recover'
        },
        success: false
      };
      uxOptimizer.trackAction(actionData);
    } catch (trackingError) {
      console.warn('Failed to track error:', trackingError);
    }
  };

  return {
    trackNavigation,
    trackCanvasAction,
    trackDialogAction,
    trackKeyboardShortcut,
    trackPerformance,
    trackError,
    uxOptimizer
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
    'save': 'preserve',
    'export': 'share',
    'zoom': 'navigate'
  };
  
  return intentMap[actionType] || 'interact';
}

/**
 * Determine user intent based on dialog action type
 */
function getDialogUserIntent(actionType: string): string {
  const intentMap: Record<string, string> = {
    'open': 'access',
    'save': 'confirm',
    'cancel': 'abandon',
    'delete': 'remove',
    'edit': 'modify'
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