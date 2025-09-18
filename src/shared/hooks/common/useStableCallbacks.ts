// src/shared/hooks/common/useStableCallbacks.ts
// Utility hook for stabilizing callback references to prevent unnecessary re-renders
// Creates stable callback references using useEvent pattern to avoid dependency issues
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/features/canvas/components/ReactFlowCanvas.tsx

import { useCallback, useLayoutEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/**
 * Creates a stable callback reference that doesn't change between renders
 * Similar to React's experimental useEvent hook
 * The callback always has access to the latest values from the component scope
 */
export function useStableCallback<T extends AnyFunction>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  // Update the ref in a layout effect to ensure we have the latest callback
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Return a stable callback that always calls the latest version
  const stableCallback = useCallback(
    ((...args: Parameters<T>) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return callbackRef.current(...args);
    }) as T,
    []
  );

  return stableCallback;
}

/**
 * Creates multiple stable callbacks at once
 * Useful for creating stable callback objects for components like React Flow
 */
export function useStableCallbacks<T extends Record<string, AnyFunction>>(callbacks: T): T {
  const callbacksRef = useRef<T>(callbacks);
  const stableCallbacksRef = useRef<T | null>(null);

  // Update the callbacks ref
  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Create stable versions only once
  if (!stableCallbacksRef.current) {
    const stableCallbacks = {} as T;

    for (const key in callbacks) {
      if (typeof callbacks[key] === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stableCallbacks[key] = ((...args: any[]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
          return callbacksRef.current[key](...args);
        }) as T[typeof key];
      }
    }

    stableCallbacksRef.current = stableCallbacks;
  }

  return stableCallbacksRef.current;
}

/**
 * Hook for creating stable event handlers that don't cause re-renders
 * Automatically handles the common pattern of event handlers that depend on state
 */
export function useStableEventHandler<T extends Event = Event>(
  handler: (event: T) => void
): (event: T) => void {
  return useStableCallback(handler);
}

/**
 * Creates a stable callback for functional state updates
 * Eliminates the need to include state values in dependency arrays
 */
export function useStableUpdater<T>(updater: (prev: T) => T): (prev: T) => T {
  return useStableCallback(updater);
}

/**
 * Development mode helper to track callback stability
 * Logs warnings when callbacks are recreated unnecessarily
 */
export function useCallbackStabilityTracker(
  name: string,
  callback: AnyFunction,
  enabled = process.env.NODE_ENV === 'development'
) {
  const previousCallbackRef = useRef<AnyFunction>();
  const renderCountRef = useRef(0);

  if (enabled) {
    renderCountRef.current++;

    if (previousCallbackRef.current && previousCallbackRef.current !== callback) {
      console.warn(
        `[useCallbackStabilityTracker] Callback "${name}" was recreated on render #${renderCountRef.current}. ` +
          'Consider using useStableCallback or reviewing dependencies.'
      );
    }

    previousCallbackRef.current = callback;
  }

  return callback;
}
