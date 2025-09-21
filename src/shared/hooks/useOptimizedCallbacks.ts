/**
 * Enhanced callback optimization hooks for preventing re-renders
 * Provides systematic callback stabilization and dependency optimization
 */

import { useCallback, useRef, useMemo } from 'react';
import { useStableCallbacks } from '@/shared/hooks/common/useStableCallbacks';

/**
 * Creates a callback that's stable across renders but always calls the latest version
 * More efficient than useCallback for frequently changing dependencies
 */
export function useLatestCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Creates stable callbacks with automatic dependency optimization
 * Detects stable vs unstable dependencies and optimizes accordingly
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  // Track dependency stability
  const previousDepsRef = useRef(deps);
  const stableDepsCountRef = useRef(0);

  const depsChanged = useMemo(() => {
    if (!previousDepsRef.current || previousDepsRef.current.length !== deps.length) {
      previousDepsRef.current = deps;
      return true;
    }

    const changed = deps.some((dep, index) => previousDepsRef.current![index] !== dep);
    if (!changed) {
      stableDepsCountRef.current++;
    } else {
      stableDepsCountRef.current = 0;
    }

    previousDepsRef.current = deps;
    return changed;
  }, deps);

  // If dependencies are frequently stable, use latest callback pattern
  if (stableDepsCountRef.current > 5) {
    return useLatestCallback(callback);
  }

  // Otherwise use normal useCallback
  return useCallback(callback, deps);
}

/**
 * Creates a collection of optimized callbacks for component props
 * Automatically stabilizes the entire callback object
 */
export function useCallbackCollection<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T
): T {
  return useStableCallbacks(callbacks);
}

/**
 * Creates event handlers that don't cause re-renders
 * Optimized for form inputs and frequent UI interactions
 */
export function useEventHandlers<T extends Record<string, (event: any) => void>>(
  handlers: T
): T {
  const stableHandlers = useMemo(() => {
    const stabilized = {} as T;

    for (const [key, handler] of Object.entries(handlers)) {
      stabilized[key as keyof T] = useLatestCallback(handler as any);
    }

    return stabilized;
  }, Object.values(handlers));

  return stableHandlers;
}

/**
 * Creates stable action callbacks for state updates
 * Prevents re-renders caused by action callback recreation
 */
export function useActionCallbacks<TActions extends Record<string, (...args: any[]) => any>>(
  actions: TActions
): TActions {
  return useMemo(() => {
    const stableActions = {} as TActions;

    for (const [key, action] of Object.entries(actions)) {
      // Actions are typically stable, so we can safely use them directly
      stableActions[key as keyof TActions] = action as any;
    }

    return stableActions;
  }, Object.values(actions));
}

/**
 * Optimizes callbacks based on their usage patterns
 * Automatically detects high-frequency vs low-frequency callbacks
 */
export function useSmartCallbacks<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T,
  options?: {
    trackUsage?: boolean;
    optimizeFrequent?: boolean;
  }
): T {
  const { trackUsage = true, optimizeFrequent = true } = options || {};

  const usageCountRef = useRef(new Map<string, number>());
  const previousCallbacksRef = useRef<T>();

  return useMemo(() => {
    const optimizedCallbacks = {} as T;

    for (const [key, callback] of Object.entries(callbacks)) {
      const usageCount = usageCountRef.current.get(key) || 0;

      if (optimizeFrequent && usageCount > 10) {
        // High-frequency callbacks get latest callback treatment
        optimizedCallbacks[key as keyof T] = useLatestCallback(callback as any);
      } else {
        // Low-frequency callbacks can use normal optimization
        const prevCallback = previousCallbacksRef.current?.[key as keyof T];
        if (prevCallback === callback) {
          optimizedCallbacks[key as keyof T] = prevCallback;
        } else {
          optimizedCallbacks[key as keyof T] = callback as any;
        }
      }

      if (trackUsage) {
        // Wrap to track usage
        const originalCallback = optimizedCallbacks[key as keyof T];
        optimizedCallbacks[key as keyof T] = ((...args: any[]) => {
          usageCountRef.current.set(key, usageCount + 1);
          return originalCallback(...args);
        }) as any;
      }
    }

    previousCallbacksRef.current = callbacks;
    return optimizedCallbacks;
  }, Object.values(callbacks));
}

/**
 * Creates stable callbacks for canvas interactions
 * Specifically optimized for high-frequency canvas operations
 */
export function useCanvasCallbacks<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T
): T {
  // Canvas callbacks are typically high-frequency, so use latest callback pattern
  const stableCallbacks = useMemo(() => {
    const stabilized = {} as T;

    for (const [key, callback] of Object.entries(callbacks)) {
      stabilized[key as keyof T] = useLatestCallback(callback as any);
    }

    return stabilized;
  }, Object.keys(callbacks));

  return stableCallbacks;
}

/**
 * Performance monitoring for callback optimization
 * Tracks callback recreation and provides insights
 */
export function useCallbackPerformanceMonitor<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T,
  componentName: string
): T {
  const previousCallbacksRef = useRef<T>();
  const recreationCountRef = useRef(new Map<string, number>());

  // Track callback recreations
  if (import.meta.env.DEV) {
    Object.keys(callbacks).forEach(key => {
      const currentCallback = callbacks[key as keyof T];
      const previousCallback = previousCallbacksRef.current?.[key as keyof T];

      if (previousCallback && previousCallback !== currentCallback) {
        const count = recreationCountRef.current.get(key) || 0;
        recreationCountRef.current.set(key, count + 1);

        if (count > 5) {
          console.warn(
            `[useCallbackPerformanceMonitor] Callback "${key}" in ${componentName} ` +
            `has been recreated ${count} times. Consider using useLatestCallback or ` +
            `optimizing dependencies.`
          );
        }
      }
    });
  }

  previousCallbacksRef.current = callbacks;
  return callbacks;
}

export default {
  useLatestCallback,
  useOptimizedCallback,
  useCallbackCollection,
  useEventHandlers,
  useActionCallbacks,
  useSmartCallbacks,
  useCanvasCallbacks,
  useCallbackPerformanceMonitor
};
