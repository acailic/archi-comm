/**
 * Hook for creating stable prop objects and eliminating inline object creation
 * Provides performance-optimized alternatives to inline props
 */

import { useMemo, useRef } from 'react';
import { shallow } from 'zustand/shallow';

/**
 * Creates a stable object that only changes when the input changes
 * More efficient than inline object creation
 */
export function useStableObject<T extends Record<string, any>>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * Creates a stable array that only changes when inputs change
 * Useful for prop arrays that would otherwise be recreated on every render
 */
export function useStableArray<T>(
  factory: () => T[],
  deps: React.DependencyList
): T[] {
  return useMemo(factory, deps);
}

/**
 * Creates stable props for React components, eliminating re-renders from object recreation
 * Uses shallow comparison to determine if props actually changed
 */
export function useStableProps<T extends Record<string, any>>(
  propsFactory: () => T,
  equalityFn?: (prev: T, next: T) => boolean
): T {
  const previousPropsRef = useRef<T>();
  const equalityCheck = equalityFn || shallow;

  const newProps = useMemo(propsFactory, [propsFactory]);

  // Only update if props actually changed
  if (!previousPropsRef.current || !equalityCheck(previousPropsRef.current, newProps)) {
    previousPropsRef.current = newProps;
  }

  return previousPropsRef.current;
}

/**
 * Optimized style object creation for React components
 * Prevents style object recreation when style values haven't changed
 */
export function useStableStyle(
  styleFactory: () => React.CSSProperties,
  deps: React.DependencyList
): React.CSSProperties {
  return useMemo(styleFactory, deps);
}

/**
 * Creates stable className strings from conditional logic
 * Useful for complex className computations
 */
export function useStableClassName(
  classNameFactory: () => string,
  deps: React.DependencyList
): string {
  return useMemo(classNameFactory, deps);
}

/**
 * Creates stable event handler props object
 * Combines multiple event handlers into a stable object reference
 */
export function useStableEventHandlers<T extends Record<string, Function>>(
  handlers: T
): T {
  const handlerKeys = Object.keys(handlers);
  const handlerValues = Object.values(handlers);

  return useMemo(
    () => handlers,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    handlerValues
  );
}

/**
 * Performance-optimized prop stabilization for large component trees
 * Automatically detects and stabilizes complex prop patterns
 */
export function useOptimizedProps<T extends Record<string, any>>(
  props: T,
  options?: {
    stabilizeArrays?: boolean;
    stabilizeObjects?: boolean;
    stabilizeFunctions?: boolean;
    customEquality?: (prev: T, next: T) => boolean;
  }
): T {
  const {
    stabilizeArrays = true,
    stabilizeObjects = true,
    stabilizeFunctions = true,
    customEquality
  } = options || {};

  const previousPropsRef = useRef<T>();
  const stablePropsRef = useRef<T>();

  const propsChanged = useMemo(() => {
    if (!previousPropsRef.current) return true;

    if (customEquality) {
      return !customEquality(previousPropsRef.current, props);
    }

    return !shallow(previousPropsRef.current, props);
  }, [props, customEquality]);

  if (propsChanged) {
    const stabilizedProps = {} as T;

    for (const [key, value] of Object.entries(props)) {
      if (stabilizeArrays && Array.isArray(value)) {
        // Create stable array reference if content is the same
        const prevValue = previousPropsRef.current?.[key];
        if (Array.isArray(prevValue) &&
            prevValue.length === value.length &&
            prevValue.every((item, index) => shallow(item, value[index]))) {
          stabilizedProps[key] = prevValue;
        } else {
          stabilizedProps[key] = value;
        }
      } else if (stabilizeObjects &&
                 typeof value === 'object' &&
                 value !== null &&
                 !Array.isArray(value)) {
        // Create stable object reference if content is the same
        const prevValue = previousPropsRef.current?.[key];
        if (typeof prevValue === 'object' && prevValue !== null && shallow(prevValue, value)) {
          stabilizedProps[key] = prevValue;
        } else {
          stabilizedProps[key] = value;
        }
      } else if (stabilizeFunctions && typeof value === 'function') {
        // Keep function references stable if they're the same
        const prevValue = previousPropsRef.current?.[key];
        if (prevValue === value) {
          stabilizedProps[key] = prevValue;
        } else {
          stabilizedProps[key] = value;
        }
      } else {
        stabilizedProps[key] = value;
      }
    }

    previousPropsRef.current = props;
    stablePropsRef.current = stabilizedProps;
  }

  return stablePropsRef.current || props;
}

/**
 * Memoizes expensive prop computations
 * Useful for derived props that require complex calculations
 */
export function useComputedProps<TInput, TOutput>(
  input: TInput,
  computeFn: (input: TInput) => TOutput,
  equalityFn?: (prev: TInput, next: TInput) => boolean
): TOutput {
  const inputRef = useRef<TInput>();
  const outputRef = useRef<TOutput>();
  const equality = equalityFn || shallow;

  const inputChanged = !inputRef.current || !equality(inputRef.current, input);

  if (inputChanged) {
    inputRef.current = input;
    outputRef.current = computeFn(input);
  }

  return outputRef.current!;
}

/**
 * Creates stable configuration objects for complex components
 * Useful for component configurations that involve multiple options
 */
export function useStableConfig<T extends Record<string, any>>(
  config: T,
  dependencies?: React.DependencyList
): T {
  return useMemo(() => config, dependencies || Object.values(config));
}

export default {
  useStableObject,
  useStableArray,
  useStableProps,
  useStableStyle,
  useStableClassName,
  useStableEventHandlers,
  useOptimizedProps,
  useComputedProps,
  useStableConfig
};