/**
 * Stable Contracts Hook - Creates stable prop contracts for components
 * Ensures callback props and object props maintain referential stability across renders
 * Provides warnings in development mode for prop instability detection
 */

import { useRef, useMemo, useCallback } from 'react';
import { useStableCallbacks } from '@/shared/hooks/common/useStableCallbacks';
import { useStableLiterals } from '@/shared/hooks/useStableLiterals';
import { equalityFunctions } from '@/shared/utils/memoization';

export interface StableContractOptions {
  /**
   * Component name for debugging
   */
  componentName?: string;

  /**
   * Enable warnings for prop instability in development
   */
  enableWarnings?: boolean;

  /**
   * Custom equality function for object props
   */
  objectEqualityFn?: (prev: any, next: any) => boolean;

  /**
   * Custom equality function for callback props
   */
  callbackEqualityFn?: (prev: any, next: any) => boolean;

  /**
   * Track prop stability metrics
   */
  trackMetrics?: boolean;

  /**
   * Maximum number of instability warnings per component
   */
  maxWarnings?: number;
}

export interface PropStabilityMetrics {
  componentName: string;
  totalProps: number;
  stableProps: number;
  unstableProps: string[];
  instabilityCount: Record<string, number>;
  lastCheck: number;
}

interface StabilityTracker {
  propName: string;
  changeCount: number;
  lastChangeTime: number;
  isStable: boolean;
}

interface ContractState {
  trackers: Map<string, StabilityTracker>;
  metrics: PropStabilityMetrics;
  warningCount: number;
}

/**
 * Creates a stable contract for component props
 */
export function useStableContracts<T extends Record<string, any>>(
  props: T,
  options: StableContractOptions = {}
): T {
  const {
    componentName = 'UnknownComponent',
    enableWarnings = import.meta.env.DEV,
    objectEqualityFn = equalityFunctions.mixed,
    callbackEqualityFn = equalityFunctions.shallow,
    trackMetrics = import.meta.env.DEV,
    maxWarnings = 5,
  } = options;

  const stateRef = useRef<ContractState>({
    trackers: new Map(),
    metrics: {
      componentName,
      totalProps: 0,
      stableProps: 0,
      unstableProps: [],
      instabilityCount: {},
      lastCheck: Date.now(),
    },
    warningCount: 0,
  });

  const prevPropsRef = useRef<T | null>(null);

  // Extract callbacks and objects for separate stabilization
  const { callbacks, objects, primitives } = useMemo(() => {
    const callbacks: Record<string, Function> = {};
    const objects: Record<string, any> = {};
    const primitives: Record<string, any> = {};

    Object.entries(props).forEach(([key, value]) => {
      if (typeof value === 'function') {
        callbacks[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        objects[key] = value;
      } else {
        primitives[key] = value;
      }
    });

    return { callbacks, objects, primitives };
  }, [props]);

  // Stabilize callbacks
  const stableCallbacks = useStableCallbacks(callbacks);

  // Stabilize objects
  const stableObjects = useMemo(() => {
    const stabilized: Record<string, any> = {};

    Object.entries(objects).forEach(([key, value]) => {
      // Use previous stable reference if equal
      const prevProps = prevPropsRef.current;
      if (prevProps && objectEqualityFn(prevProps[key], value)) {
        stabilized[key] = prevProps[key];
      } else {
        stabilized[key] = value;
      }
    });

    return stabilized;
  }, [objects, objectEqualityFn]);

  // Stabilize primitives (usually stable already, but check for unnecessary changes)
  const stablePrimitives = useStableLiterals(primitives);

  // Track prop stability if enabled
  const trackPropStability = useCallback(() => {
    if (!trackMetrics) return;

    const state = stateRef.current;
    const now = Date.now();
    const propKeys = Object.keys(props);

    state.metrics.totalProps = propKeys.length;
    state.metrics.lastCheck = now;

    let stableCount = 0;
    const unstableProps: string[] = [];

    propKeys.forEach(key => {
      const currentValue = props[key];
      const prevValue = prevPropsRef.current?.[key];

      let tracker = state.trackers.get(key);
      if (!tracker) {
        tracker = {
          propName: key,
          changeCount: 0,
          lastChangeTime: now,
          isStable: true,
        };
        state.trackers.set(key, tracker);
      }

      // Determine if prop changed
      let hasChanged = false;
      if (typeof currentValue === 'function') {
        hasChanged = !callbackEqualityFn(prevValue, currentValue);
      } else if (typeof currentValue === 'object' && currentValue !== null) {
        hasChanged = !objectEqualityFn(prevValue, currentValue);
      } else {
        hasChanged = prevValue !== currentValue;
      }

      if (hasChanged) {
        tracker.changeCount++;
        tracker.lastChangeTime = now;
        tracker.isStable = tracker.changeCount < 3; // Consider stable if changed < 3 times

        if (!tracker.isStable) {
          unstableProps.push(key);
          state.metrics.instabilityCount[key] = (state.metrics.instabilityCount[key] || 0) + 1;

          // Warn about instability
          if (enableWarnings && state.warningCount < maxWarnings) {
            console.warn(
              `[StableContracts] Prop "${key}" is unstable in ${componentName}`,
              {
                changeCount: tracker.changeCount,
                currentValue,
                prevValue,
                suggestion: getStabilityAdvice(key, currentValue),
              }
            );
            state.warningCount++;
          }
        }
      }

      if (tracker.isStable) {
        stableCount++;
      }
    });

    state.metrics.stableProps = stableCount;
    state.metrics.unstableProps = unstableProps;

    // Log stability report periodically
    if (import.meta.env.DEV && state.trackers.size > 0 && state.trackers.size % 10 === 0) {
      console.debug(`[StableContracts] Stability report for ${componentName}:`, {
        totalProps: state.metrics.totalProps,
        stableProps: state.metrics.stableProps,
        stabilityRate: `${((state.metrics.stableProps / state.metrics.totalProps) * 100).toFixed(1)}%`,
        unstableProps: state.metrics.unstableProps,
        instabilityCount: state.metrics.instabilityCount,
      });
    }
  }, [props, componentName, enableWarnings, maxWarnings, trackMetrics, objectEqualityFn, callbackEqualityFn]);

  // Create stable contract
  const stableContract = useMemo(() => {
    const contract = {
      ...stablePrimitives,
      ...stableObjects,
      ...stableCallbacks,
    } as T;

    // Track stability after creating contract
    trackPropStability();

    // Update previous props reference
    prevPropsRef.current = contract;

    return contract;
  }, [stablePrimitives, stableObjects, stableCallbacks, trackPropStability]);

  return stableContract;
}

/**
 * Get stability advice for a specific prop type
 */
function getStabilityAdvice(propName: string, value: any): string {
  if (typeof value === 'function') {
    return `Use useCallback() to stabilize the "${propName}" callback`;
  }

  if (Array.isArray(value)) {
    return `Use useMemo() to stabilize the "${propName}" array, or consider if the array reference needs to change`;
  }

  if (typeof value === 'object' && value !== null) {
    return `Use useMemo() to stabilize the "${propName}" object, or consider extracting stable properties`;
  }

  return `Consider if "${propName}" needs to change on every render, or if it can be moved outside the component`;
}

/**
 * Hook for creating stable callback props specifically
 */
export function useStableCallbackContract<T extends Record<string, Function>>(
  callbacks: T,
  options: Omit<StableContractOptions, 'callbackEqualityFn'> = {}
): T {
  return useStableContracts(callbacks, {
    ...options,
    callbackEqualityFn: equalityFunctions.shallow,
  });
}

/**
 * Hook for creating stable object props specifically
 */
export function useStableObjectContract<T extends Record<string, any>>(
  objects: T,
  options: Omit<StableContractOptions, 'objectEqualityFn'> = {}
): T {
  return useStableContracts(objects, {
    ...options,
    objectEqualityFn: equalityFunctions.mixed,
  });
}

/**
 * Hook for getting prop stability metrics
 */
export function usePropStabilityMetrics(componentName?: string): PropStabilityMetrics | null {
  const stateRef = useRef<ContractState | null>(null);

  return useMemo(() => {
    if (!componentName || !stateRef.current) {
      return null;
    }

    return { ...stateRef.current.metrics };
  }, [componentName]);
}

/**
 * Higher-order hook that automatically applies stable contracts to component props
 */
export function useAutoStableContracts<T extends Record<string, any>>(
  props: T,
  componentName?: string
): T {
  // Try to detect component name from stack trace if not provided
  const detectedComponentName = useMemo(() => {
    if (componentName) return componentName;

    try {
      const stack = new Error().stack || '';
      const lines = stack.split('\n');

      // Look for a line that contains a component name (starts with uppercase)
      for (const line of lines) {
        const match = line.match(/at ([A-Z][a-zA-Z0-9]*)/);
        if (match && match[1] !== 'Error') {
          return match[1];
        }
      }

      return 'AutoDetectedComponent';
    } catch {
      return 'AutoDetectedComponent';
    }
  }, [componentName]);

  return useStableContracts(props, {
    componentName: detectedComponentName,
    enableWarnings: true,
    trackMetrics: true,
  });
}

/**
 * Hook for creating stable component interfaces
 */
export function useStableInterface<TProps extends Record<string, any>, TCallbacks extends Record<string, Function>>(
  props: TProps,
  callbacks: TCallbacks,
  options: StableContractOptions = {}
): TProps & TCallbacks {
  const stableProps = useStableContracts(props, options);
  const stableCallbacks = useStableCallbacks(callbacks);

  return useMemo(() => ({
    ...stableProps,
    ...stableCallbacks,
  }), [stableProps, stableCallbacks]);
}

/**
 * Development helper to manually check prop stability
 */
export function checkPropStability<T extends Record<string, any>>(
  props: T,
  prevProps: T | null,
  componentName: string = 'UnknownComponent'
): { stable: string[]; unstable: string[]; new: string[]; removed: string[] } {
  if (!import.meta.env.DEV) {
    return { stable: [], unstable: [], new: [], removed: [] };
  }

  const stable: string[] = [];
  const unstable: string[] = [];
  const newProps: string[] = [];
  const removed: string[] = [];

  const currentKeys = Object.keys(props);
  const prevKeys = prevProps ? Object.keys(prevProps) : [];

  // Check for new props
  currentKeys.forEach(key => {
    if (!prevProps || !(key in prevProps)) {
      newProps.push(key);
      return;
    }

    const currentValue = props[key];
    const prevValue = prevProps[key];

    // Determine stability based on type
    let isStable = false;
    if (typeof currentValue === 'function') {
      isStable = currentValue === prevValue;
    } else if (typeof currentValue === 'object' && currentValue !== null) {
      isStable = equalityFunctions.mixed(currentValue, prevValue);
    } else {
      isStable = currentValue === prevValue;
    }

    if (isStable) {
      stable.push(key);
    } else {
      unstable.push(key);
    }
  });

  // Check for removed props
  if (prevProps) {
    prevKeys.forEach(key => {
      if (!(key in props)) {
        removed.push(key);
      }
    });
  }

  console.debug(`[PropStability] Analysis for ${componentName}:`, {
    stable: stable.length,
    unstable: unstable.length,
    new: newProps.length,
    removed: removed.length,
    details: { stable, unstable, new: newProps, removed },
  });

  return { stable, unstable, new: newProps, removed };
}

/**
 * Development utility to monitor component prop stability over time
 */
export function useDevPropStabilityMonitor<T extends Record<string, any>>(
  props: T,
  componentName?: string,
  interval: number = 5000
): void {
  const prevPropsRef = useRef<T | null>(null);
  const stabilityHistoryRef = useRef<Array<{ timestamp: number; stable: number; unstable: number }>>([]);

  const detectedComponentName = useMemo(() => {
    if (componentName) return componentName;

    try {
      const stack = new Error().stack || '';
      const lines = stack.split('\n');

      for (const line of lines) {
        const match = line.match(/at ([A-Z][a-zA-Z0-9]*)/);
        if (match && match[1] !== 'Error') {
          return match[1];
        }
      }

      return 'MonitoredComponent';
    } catch {
      return 'MonitoredComponent';
    }
  }, [componentName]);

  // Monitor stability periodically
  useMemo(() => {
    if (!import.meta.env.DEV) return;

    const analysis = checkPropStability(props, prevPropsRef.current, detectedComponentName);
    const now = Date.now();

    stabilityHistoryRef.current.push({
      timestamp: now,
      stable: analysis.stable.length,
      unstable: analysis.unstable.length,
    });

    // Keep only recent history
    stabilityHistoryRef.current = stabilityHistoryRef.current.filter(
      entry => now - entry.timestamp < interval * 10
    );

    prevPropsRef.current = props;
  }, [props, detectedComponentName, interval]);

  // Log periodic stability reports
  useMemo(() => {
    if (!import.meta.env.DEV) return;

    const timeoutId = setTimeout(() => {
      const history = stabilityHistoryRef.current;
      if (history.length > 1) {
        const avgStable = history.reduce((sum, entry) => sum + entry.stable, 0) / history.length;
        const avgUnstable = history.reduce((sum, entry) => sum + entry.unstable, 0) / history.length;
        const stabilityRate = avgStable / (avgStable + avgUnstable) * 100;

        console.log(`[PropStabilityMonitor] ${detectedComponentName} stability over ${interval}ms:`, {
          avgStableProps: avgStable.toFixed(1),
          avgUnstableProps: avgUnstable.toFixed(1),
          stabilityRate: `${stabilityRate.toFixed(1)}%`,
          sampleCount: history.length,
        });
      }
    }, interval);

    return () => clearTimeout(timeoutId);
  }, [detectedComponentName, interval]);
}