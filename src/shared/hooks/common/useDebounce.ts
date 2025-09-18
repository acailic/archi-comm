import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DebouncedFunction<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

/**
 * Returns a debounced version of the provided callback that delays execution
 * until after the specified delay has elapsed since the last time it was invoked.
 * Prevents synchronous execution during initial mount to avoid infinite loops.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): DebouncedFunction<Args> {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    callbackRef.current = callback;
    return () => {
      mountedRef.current = false;
    };
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args: Args) => {
      cancel();

      // Always use async execution, never synchronous
      timeoutRef.current = setTimeout(() => {
        // Double-check component is still mounted before execution
        if (mountedRef.current) {
          callbackRef.current(...args);
        }
      }, Math.max(delay, 0)); // Ensure minimum delay of 0 to force async
    },
    [cancel, delay]
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => Object.assign(debounced as DebouncedFunction<Args>, { cancel }), [cancel, debounced]);
}

/**
 * Debounces a value by the specified delay. Useful for reacting to user input
 * without triggering updates on every keystroke.
 * Prevents synchronous execution during initial mount.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Always use async execution to prevent synchronous updates
    const handler = setTimeout(() => {
      if (mountedRef.current) {
        setDebouncedValue(value);
      }
    }, Math.max(delay, 0)); // Ensure minimum delay of 0 to force async

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
