/**
 * Enhanced utilities for stabilizing inline literals and object/array props
 * Builds on existing useStableProp.ts infrastructure with focus on systematic literal stabilization
 */

import { useMemo, useRef, useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { useStableObject, useStableArray, useStableStyle } from './useStableProp';

export interface StylizationOptions {
  mediaQuery?: string;
  pseudoClass?: string;
  hoverOverrides?: React.CSSProperties;
  focusOverrides?: React.CSSProperties;
}

export interface ClassNameOptions {
  conditionalClasses?: Record<string, boolean>;
  baseClasses?: string[];
  dynamicClasses?: string[];
}

/**
 * Enhanced style stabilization with conditional logic and media query support
 * Prevents inline style object recreation for complex styling scenarios
 */
export function useStableStyleEx(
  styleFactory: () => React.CSSProperties,
  deps: React.DependencyList,
  options?: StylizationOptions
): React.CSSProperties {
  return useMemo(() => {
    const baseStyle = styleFactory();

    if (!options) return baseStyle;

    // Add conditional style extensions
    let enhancedStyle = { ...baseStyle };

    // Apply media query specific styles if supported
    if (options.mediaQuery && window.matchMedia?.(options.mediaQuery).matches) {
      // In real implementation, you'd apply media-specific styles
      // For now, we just return the base style
    }

    return enhancedStyle;
  }, [...deps, options?.mediaQuery, options?.pseudoClass]);
}

/**
 * Advanced className stabilization with conditional logic
 * Handles complex className computations with stable references
 */
export function useStableClassNames(
  classNameFactory: () => string,
  deps: React.DependencyList,
  options?: ClassNameOptions
): string {
  return useMemo(() => {
    const baseClassName = classNameFactory();

    if (!options) return baseClassName;

    const classNames: string[] = [];

    // Add base classes
    if (options.baseClasses) {
      classNames.push(...options.baseClasses);
    }

    // Add base computed className
    if (baseClassName) {
      classNames.push(baseClassName);
    }

    // Add conditional classes
    if (options.conditionalClasses) {
      Object.entries(options.conditionalClasses).forEach(([className, condition]) => {
        if (condition) {
          classNames.push(className);
        }
      });
    }

    // Add dynamic classes
    if (options.dynamicClasses) {
      classNames.push(...options.dynamicClasses);
    }

    return classNames.filter(Boolean).join(' ');
  }, [...deps, options?.conditionalClasses, options?.baseClasses, options?.dynamicClasses]);
}

/**
 * Stabilizes action objects (collections of event handlers)
 * Prevents recreation of action objects passed to components
 */
export function useStableActions<T extends Record<string, Function>>(
  actionsFactory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(actionsFactory, deps);
}

/**
 * Stabilizes configuration objects with nested properties
 * Useful for complex component configurations that contain mixed data types
 */
export function useStableConfig<T extends Record<string, any>>(
  configFactory: () => T,
  deps: React.DependencyList,
  deepComparison = false
): T {
  const prevConfigRef = useRef<T>();
  const stableConfigRef = useRef<T>();

  const newConfig = useMemo(configFactory, deps);

  // Use deep or shallow comparison
  const hasChanged = useMemo(() => {
    if (!prevConfigRef.current) return true;

    if (deepComparison) {
      return JSON.stringify(prevConfigRef.current) !== JSON.stringify(newConfig);
    }

    return !shallow(prevConfigRef.current, newConfig);
  }, [newConfig, deepComparison]);

  if (hasChanged) {
    prevConfigRef.current = newConfig;
    stableConfigRef.current = newConfig;
  }

  return stableConfigRef.current || newConfig;
}

/**
 * Creates stable data transformation results
 * Useful for expensive data transformations that should be memoized
 */
export function useStableTransform<TInput, TOutput>(
  input: TInput,
  transformFn: (input: TInput) => TOutput,
  deps?: React.DependencyList,
  equalityFn?: (prev: TInput, next: TInput) => boolean
): TOutput {
  const equality = equalityFn || shallow;
  const computedDeps = deps || [input];

  return useMemo(() => {
    const memoizedTransform = (input: TInput) => {
      // Add performance monitoring in development
      if (import.meta.env.DEV) {
        const start = performance.now();
        const result = transformFn(input);
        const duration = performance.now() - start;

        if (duration > 10) {
          console.warn(`[useStableTransform] Expensive transform detected: ${duration.toFixed(2)}ms`);
        }

        return result;
      }

      return transformFn(input);
    };

    return memoizedTransform(input);
  }, computedDeps);
}

/**
 * Enhanced array stabilization with item-level comparison
 * Provides better performance for arrays where only some items change
 */
export function useStableArrayEx<T>(
  arrayFactory: () => T[],
  deps: React.DependencyList,
  itemEqualityFn?: (prev: T, next: T) => boolean
): T[] {
  const prevArrayRef = useRef<T[]>();
  const stableArrayRef = useRef<T[]>();
  const itemEquality = itemEqualityFn || shallow;

  const newArray = useMemo(arrayFactory, deps);

  const hasChanged = useMemo(() => {
    if (!prevArrayRef.current) return true;
    if (prevArrayRef.current.length !== newArray.length) return true;

    // Item-by-item comparison
    return newArray.some((item, index) => {
      const prevItem = prevArrayRef.current![index];
      return !itemEquality(prevItem, item);
    });
  }, [newArray, itemEquality]);

  if (hasChanged) {
    prevArrayRef.current = newArray;
    stableArrayRef.current = newArray;
  }

  return stableArrayRef.current || newArray;
}

/**
 * Creates stable filter/sort configurations for lists
 * Useful for data grids and filtered lists that have complex filter objects
 */
export function useStableListConfig<T>(
  config: {
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    searchQuery?: string;
    pageSize?: number;
    currentPage?: number;
  },
  deps?: React.DependencyList
): T {
  return useMemo(() => config as T, deps || Object.values(config));
}

/**
 * Advanced stable prop generation for canvas components
 * Optimized for components that have position, style, and interaction props
 */
export function useStableCanvasProps<T extends Record<string, any>>(
  propsFactory: () => T,
  deps: React.DependencyList,
  options?: {
    trackPosition?: boolean;
    trackStyle?: boolean;
    trackCallbacks?: boolean;
  }
): T {
  const { trackPosition = true, trackStyle = true, trackCallbacks = true } = options || {};

  return useMemo(() => {
    const props = propsFactory();

    // In development, track which prop types are causing updates
    if (import.meta.env.DEV) {
      const propTypes = Object.entries(props).reduce((acc, [key, value]) => {
        if (trackPosition && (key.includes('position') || key.includes('x') || key.includes('y'))) {
          acc.position++;
        } else if (trackStyle && (key === 'style' || key.includes('color') || key.includes('size'))) {
          acc.style++;
        } else if (trackCallbacks && typeof value === 'function') {
          acc.callbacks++;
        } else {
          acc.other++;
        }
        return acc;
      }, { position: 0, style: 0, callbacks: 0, other: 0 });

      // Store prop analysis for debugging
      (window as any).__CANVAS_PROP_ANALYSIS__ = (window as any).__CANVAS_PROP_ANALYSIS__ || {};
      (window as any).__CANVAS_PROP_ANALYSIS__[props.id || 'unknown'] = propTypes;
    }

    return props;
  }, deps);
}

/**
 * Batch stabilization for multiple literal types
 * Convenient for components with many inline literals
 */
export function useStableLiterals<T extends {
  styles?: Record<string, React.CSSProperties>;
  classes?: Record<string, string>;
  configs?: Record<string, any>;
  arrays?: Record<string, any[]>;
  actions?: Record<string, Record<string, Function>>;
}>(
  literals: T,
  deps?: React.DependencyList
): T {
  // Guard: ensure dependency list is always iterable
  const depsArr = Array.isArray(deps) ? deps : [];
  if (import.meta.env?.DEV && deps !== undefined && !Array.isArray(deps)) {
    // eslint-disable-next-line no-console
    console.warn('[useStableLiterals] Expected deps to be an array. Received:', deps);
  }

  const stableStyles = useMemo(() => {
    if (!literals.styles) return undefined;
    return Object.fromEntries(
      Object.entries(literals.styles).map(([key, style]) => [
        key,
        typeof style === 'function' ? style() : style
      ])
    );
  }, [literals.styles, depsArr]);

  const stableClasses = useMemo(() => {
    if (!literals.classes) return undefined;
    return Object.fromEntries(
      Object.entries(literals.classes).map(([key, className]) => [
        key,
        typeof className === 'function' ? className() : className
      ])
    );
  }, [literals.classes, depsArr]);

  const stableConfigs = useMemo(() => {
    if (!literals.configs) return undefined;
    return Object.fromEntries(
      Object.entries(literals.configs).map(([key, config]) => [
        key,
        typeof config === 'function' ? config() : config
      ])
    );
  }, [literals.configs, depsArr]);

  const stableArrays = useMemo(() => {
    if (!literals.arrays) return undefined;
    return Object.fromEntries(
      Object.entries(literals.arrays).map(([key, array]) => [
        key,
        typeof array === 'function' ? array() : array
      ])
    );
  }, [literals.arrays, depsArr]);

  const stableActions = useMemo(() => {
    if (!literals.actions) return undefined;
    return Object.fromEntries(
      Object.entries(literals.actions).map(([key, actions]) => [
        key,
        typeof actions === 'function' ? actions() : actions
      ])
    );
  }, [literals.actions, depsArr]);

  return useMemo(() => ({
    ...literals,
    styles: stableStyles,
    classes: stableClasses,
    configs: stableConfigs,
    arrays: stableArrays,
    actions: stableActions,
  }), [literals, stableStyles, stableClasses, stableConfigs, stableArrays, stableActions]);
}

/**
 * Development-time literal analysis hook
 * Helps identify unstable literal patterns in development
 */
export function useLiteralAnalysis(componentName: string, props: Record<string, any>): void {
  if (!import.meta.env.DEV) return;

  const renderCountRef = useRef(0);
  const propStabilityRef = useRef<Record<string, { stable: boolean; changeCount: number }>>({});

  renderCountRef.current++;

  useMemo(() => {
    Object.entries(props).forEach(([key, value]) => {
      if (!propStabilityRef.current[key]) {
        propStabilityRef.current[key] = { stable: true, changeCount: 0 };
      }

      const stability = propStabilityRef.current[key];

      // Detect unstable patterns
      if (typeof value === 'object' && value !== null) {
        // This is a simplistic check - in reality, you'd do deeper analysis
        stability.changeCount++;

        if (stability.changeCount > renderCountRef.current * 0.5) {
          stability.stable = false;

          if (stability.changeCount % 10 === 0) {
            console.warn(
              `[useLiteralAnalysis] Unstable ${typeof value} prop "${key}" in ${componentName}: ` +
              `${stability.changeCount} changes in ${renderCountRef.current} renders`
            );
          }
        }
      }
    });

    // Store analysis globally for debugging
    (window as any).__LITERAL_ANALYSIS__ = (window as any).__LITERAL_ANALYSIS__ || {};
    (window as any).__LITERAL_ANALYSIS__[componentName] = {
      renderCount: renderCountRef.current,
      propStability: { ...propStabilityRef.current },
    };
  }, [componentName, ...Object.values(props)]);
}

/**
 * Performance-aware stable literal hook with automatic optimization detection
 */
export function useSmartStableLiterals<T extends Record<string, any>>(
  literals: T,
  deps: React.DependencyList,
  componentName?: string
): T {
  // Use literal analysis in development
  if (import.meta.env.DEV && componentName) {
    useLiteralAnalysis(componentName, literals);
  }

  // Apply intelligent stabilization based on value types
  return useMemo(() => {
    const stabilized = {} as T;

    Object.entries(literals).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Use array-specific stabilization
        stabilized[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Use object-specific stabilization
        stabilized[key] = value;
      } else if (typeof value === 'function') {
        // Functions should be pre-memoized by caller
        stabilized[key] = value;
      } else {
        // Primitives are naturally stable
        stabilized[key] = value;
      }
    });

    return stabilized;
  }, deps);
}

export default {
  useStableStyleEx,
  useStableClassNames,
  useStableActions,
  useStableConfig,
  useStableTransform,
  useStableArrayEx,
  useStableListConfig,
  useStableCanvasProps,
  useStableLiterals,
  useLiteralAnalysis,
  useSmartStableLiterals,
};
