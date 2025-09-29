/**
 * Reusable memoization utilities for React component optimization
 * Provides consistent comparison functions and memoization strategies
 */

import { shallow } from 'zustand/shallow';

// Type-safe shallow comparison for React.memo
export function shallowEqual<T extends Record<string, any>>(prev: T, next: T): boolean {
  // Guard null/undefined
  if (prev === next) return true;
  if (prev == null || next == null) return prev === next;
  return shallow(prev, next);
}

// Specialized equality functions for different prop patterns
export const equalityFunctions = {
  // Generic shallow comparison across common value types
  shallow: <T>(prev: T, next: T): boolean => {
    if (prev === next) return true;
    if (prev == null || next == null) return prev === next;
    // Arrays: compare length + shallow items
    if (Array.isArray(prev) && Array.isArray(next)) {
      if (prev.length !== next.length) return false;
      for (let i = 0; i < prev.length; i++) {
        if (!shallow(prev[i] as any, next[i] as any)) return false;
      }
      return true;
    }
    if ((Array.isArray(prev) && !Array.isArray(next)) || (!Array.isArray(prev) && Array.isArray(next))) {
      if (import.meta.env.DEV) {
        console.warn('[memoization.shallow] Type mismatch: one value is array and the other is not');
      }
      return false;
    }
    // Objects
    if (
      typeof prev === 'object' && prev !== null &&
      typeof next === 'object' && next !== null
    ) {
      return shallow(prev as any, next as any);
    }
    // Fallback to strict equality for primitives/functions
    return prev === next;
  },

  // Deep comparison (dev-oriented, not optimized for cycles)
  deep: <T>(prev: T, next: T): boolean => {
    if (prev === next) return true;
    if (prev == null || next == null) return prev === next;
    try {
      return JSON.stringify(prev) === JSON.stringify(next);
    } catch {
      // Fallback to shallow if serialization fails
      return equalityFunctions.shallow(prev as any, next as any);
    }
  },

  // Structural comparison suitable for large collections
  structural: <T>(prev: T, next: T): boolean => {
    if (prev === next) return true;
    if (prev == null || next == null) return prev === next;
    // Prefer array-length and key-count fast checks, then shallow
    if (Array.isArray(prev) && Array.isArray(next)) {
      return prev.length === next.length && equalityFunctions.shallow(prev as any, next as any);
    }
    if ((Array.isArray(prev) && !Array.isArray(next)) || (!Array.isArray(prev) && Array.isArray(next))) {
      if (import.meta.env.DEV) {
        console.warn('[memoization.structural] Type mismatch: one value is array and the other is not');
      }
      return false;
    }
    if (
      typeof prev === 'object' && prev !== null &&
      typeof next === 'object' && next !== null
    ) {
      const pk = Object.keys(prev as any);
      const nk = Object.keys(next as any);
      if (pk.length !== nk.length) return false;
      return shallow(prev as any, next as any);
    }
    return prev === next;
  },

  // For components with simple primitive props
  primitives: <T extends Record<string, string | number | boolean | null | undefined>>(
    prev: T,
    next: T
  ): boolean => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    if (prevKeys.length !== nextKeys.length) return false;

    return prevKeys.every(key => prev[key] === next[key]);
  },

  // For components with array props (like components, connections)
  arrays: <T extends Record<string, any>>(prev: T, next: T): boolean => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    if (prevKeys.length !== nextKeys.length) return false;

    return prevKeys.every(key => {
      const prevVal = prev[key];
      const nextVal = next[key];

      if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
        return prevVal.length === nextVal.length &&
               prevVal.every((item, index) => shallow(item, nextVal[index]));
      }

      return shallow(prevVal, nextVal);
    });
  },

  // For components with callback props
  callbacks: <T extends Record<string, any>>(prev: T, next: T): boolean => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    if (prevKeys.length !== nextKeys.length) return false;

    return prevKeys.every(key => {
      const prevVal = prev[key];
      const nextVal = next[key];

      // For functions, use referential equality (assume they're memoized)
      if (typeof prevVal === 'function' && typeof nextVal === 'function') {
        return prevVal === nextVal;
      }

      return shallow(prevVal, nextVal);
    });
  },

  // For components with mixed prop types (most common)
  mixed: <T extends Record<string, any>>(prev: T, next: T): boolean => {
    if (prev === next) return true;
    if (prev == null || next == null) return prev === next;
    if (
      typeof prev === 'object' && prev !== null &&
      typeof next === 'object' && next !== null
    ) {
      return shallow(prev, next);
    }
    // For non-objects/primitives/functions
    return prev === next;
  },

  // For components with specific ID-based props
  idBased: <T extends { id?: string; [key: string]: any }>(prev: T, next: T): boolean => {
    // Fast path: if IDs are different, props are different
    if (prev.id !== next.id) return false;

    return shallow(prev, next);
  },

  // For canvas-specific components with position data
  spatial: <T extends Record<string, any>>(prev: T, next: T): boolean => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    if (prevKeys.length !== nextKeys.length) return false;

    return prevKeys.every(key => {
      const prevVal = prev[key];
      const nextVal = next[key];

      // Special handling for position objects
      if (key === 'position' &&
          typeof prevVal === 'object' &&
          typeof nextVal === 'object' &&
          prevVal && nextVal) {
        return prevVal.x === nextVal.x && prevVal.y === nextVal.y;
      }

      return shallow(prevVal, nextVal);
    });
  }
} as const;

// Memoization factory for creating optimized components
export function createMemoizedComponent<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  equalityFn?: (prev: P, next: P) => boolean,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const MemoizedComponent = React.memo(Component, equalityFn || equalityFunctions.mixed);

  if (displayName) {
    MemoizedComponent.displayName = `Memo(${displayName})`;
  } else if (Component.displayName || Component.name) {
    MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`;
  }

  return MemoizedComponent;
}

// Utility for creating stable prop objects
export function createStableProps<T extends Record<string, any>>(
  factory: () => T,
  dependencies: any[]
): T {
  return React.useMemo(factory, dependencies);
}

// Utility for creating stable callback collections
export function createStableCallbacks<T extends Record<string, Function>>(
  callbacks: T
): T {
  return React.useMemo(() => callbacks, Object.values(callbacks));
}

// Performance-aware memoization for expensive computations
export function useMemoWithPerf<T>(
  factory: () => T,
  deps: React.DependencyList,
  componentName?: string
): T {
  return React.useMemo(() => {
    if (import.meta.env.DEV && componentName) {
      const start = performance.now();
      const result = factory();
      const duration = performance.now() - start;

      if (duration > 5) { // Warn if computation takes > 5ms
        console.warn(
          `[useMemoWithPerf] Expensive computation in ${componentName}: ${duration.toFixed(2)}ms`
        );
      }

      return result;
    }

    return factory();
  }, deps);
}

// Utility for memoizing array transformations
export function useMemoizedArray<T, R>(
  array: T[],
  transform: (item: T, index: number, array: T[]) => R,
  equalityFn?: (prev: T[], next: T[]) => boolean
): R[] {
  const arrayRef = React.useRef<T[]>(array);
  const resultRef = React.useRef<R[]>([]);

  const hasChanged = React.useMemo(() => {
    if (equalityFn) {
      return !equalityFn(arrayRef.current, array);
    }

    // Default: shallow comparison of array items
    if (arrayRef.current.length !== array.length) return true;
    return arrayRef.current.some((item, index) => !shallow(item, array[index]));
  }, [array, equalityFn]);

  if (hasChanged) {
    arrayRef.current = array;
    resultRef.current = array.map(transform);
  }

  return resultRef.current;
}

// Export React import for convenience
import React from 'react';
export { React };
