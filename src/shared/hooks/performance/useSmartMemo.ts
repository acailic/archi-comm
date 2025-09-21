/**
 * Smart Memoization Hook - Automatically determines appropriate equality function
 * Integrates with ComponentOptimizer to track which components benefit from memoization
 * and automatically adjusts memoization strategies based on runtime performance data
 */

import { useMemo, useRef, useCallback } from 'react';
import { ComponentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { equalityFunctions } from '@/shared/utils/memoization';

export type MemoizationStrategy = 'none' | 'shallow' | 'deep' | 'mixed' | 'structural' | 'custom';

export interface SmartMemoOptions<T> {
  /**
   * Override automatic strategy detection
   */
  strategy?: MemoizationStrategy;

  /**
   * Custom equality function
   */
  customEqualityFn?: (prev: T, next: T) => boolean;

  /**
   * Component name for performance tracking
   */
  componentName?: string;

  /**
   * Enable automatic strategy adaptation based on performance
   */
  adaptiveStrategy?: boolean;

  /**
   * Threshold for considering a value "expensive" to compute (in ms)
   */
  expensiveThreshold?: number;

  /**
   * Maximum number of equality checks to track for adaptation
   */
  maxEqualityChecks?: number;

  /**
   * Debug mode for logging optimization decisions
   */
  debug?: boolean;
}

interface MemoizationMetrics {
  equalityChecks: number;
  equalityCheckTimes: number[];
  hitRate: number;
  missRate: number;
  avgEqualityTime: number;
  strategy: MemoizationStrategy;
  adaptations: number;
}

interface SmartMemoState<T> {
  cachedValue: T;
  lastDependencies: unknown[];
  metrics: MemoizationMetrics;
  strategy: MemoizationStrategy;
  equalityFn: (prev: T, next: T) => boolean;
}

const componentOptimizer = ComponentOptimizer.getInstance();

/**
 * Automatically determines the best equality function based on value type and structure
 */
function detectOptimalStrategy<T>(value: T, options: SmartMemoOptions<T>): MemoizationStrategy {
  if (options.strategy) {
    return options.strategy;
  }

  if (options.customEqualityFn) {
    return 'custom';
  }

  // Analyze value structure to determine best strategy
  if (value === null || value === undefined) {
    return 'shallow';
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return 'shallow';
  }

  if (valueType === 'function') {
    return 'shallow'; // Functions are typically stable or should be memoized separately
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'shallow';
    }
    if (value.length < 10) {
      return 'deep';
    }
    if (value.length < 100) {
      return 'mixed';
    }
    return 'structural'; // Large arrays benefit from structural comparison
  }

  if (valueType === 'object') {
    const keys = Object.keys(value as object);
    if (keys.length === 0) {
      return 'shallow';
    }
    if (keys.length < 5) {
      return 'deep';
    }
    if (keys.length < 20) {
      return 'mixed';
    }
    return 'structural'; // Large objects benefit from structural comparison
  }

  return 'mixed'; // Default fallback
}

/**
 * Gets the appropriate equality function for a strategy
 */
function getEqualityFunction<T>(strategy: MemoizationStrategy, customFn?: (prev: T, next: T) => boolean): (prev: T, next: T) => boolean {
  switch (strategy) {
    case 'none':
      return () => false; // Always recompute
    case 'shallow':
      return equalityFunctions.shallow;
    case 'deep':
      return equalityFunctions.deep;
    case 'mixed':
      return equalityFunctions.mixed;
    case 'structural':
      return equalityFunctions.structural;
    case 'custom':
      return customFn || equalityFunctions.mixed;
    default:
      return equalityFunctions.mixed;
  }
}

/**
 * Adapts memoization strategy based on performance metrics
 */
function adaptStrategy<T>(
  currentStrategy: MemoizationStrategy,
  metrics: MemoizationMetrics,
  value: T,
  options: SmartMemoOptions<T>
): MemoizationStrategy {
  if (!options.adaptiveStrategy || metrics.equalityChecks < 10) {
    return currentStrategy;
  }

  const avgTime = metrics.avgEqualityTime;
  const hitRate = metrics.hitRate;
  const expensiveThreshold = options.expensiveThreshold || 5;

  // If equality checks are taking too long, use a simpler strategy
  if (avgTime > expensiveThreshold && currentStrategy !== 'shallow') {
    if (options.debug) {
      console.debug(`[SmartMemo] Adapting to simpler strategy due to slow equality checks (${avgTime.toFixed(2)}ms avg)`);
    }
    return 'shallow';
  }

  // If hit rate is very low, consider if memoization is worth it
  if (hitRate < 0.1 && currentStrategy !== 'none') {
    if (options.debug) {
      console.debug(`[SmartMemo] Disabling memoization due to low hit rate (${(hitRate * 100).toFixed(1)}%)`);
    }
    return 'none';
  }

  // If hit rate is good but equality is expensive, try structural comparison
  if (hitRate > 0.7 && avgTime > expensiveThreshold / 2 && currentStrategy === 'deep') {
    if (options.debug) {
      console.debug(`[SmartMemo] Adapting to structural strategy for better performance`);
    }
    return 'structural';
  }

  // If current strategy is working well, keep it
  return currentStrategy;
}

/**
 * Smart memoization hook that automatically optimizes based on usage patterns
 */
export function useSmartMemo<T>(
  factory: () => T,
  dependencies: unknown[],
  options: SmartMemoOptions<T> = {}
): T {
  const {
    componentName = 'UnknownComponent',
    adaptiveStrategy = true,
    expensiveThreshold = 5,
    maxEqualityChecks = 100,
    debug = false,
  } = options;

  const stateRef = useRef<SmartMemoState<T> | null>(null);

  // Initialize or get current state
  const initializeState = useCallback((): SmartMemoState<T> => {
    const initialValue = factory();
    const initialStrategy = detectOptimalStrategy(initialValue, options);
    const equalityFn = getEqualityFunction(initialStrategy, options.customEqualityFn);

    return {
      cachedValue: initialValue,
      lastDependencies: dependencies,
      strategy: initialStrategy,
      equalityFn,
      metrics: {
        equalityChecks: 0,
        equalityCheckTimes: [],
        hitRate: 0,
        missRate: 0,
        avgEqualityTime: 0,
        strategy: initialStrategy,
        adaptations: 0,
      },
    };
  }, []);

  // Memoize the computation
  return useMemo(() => {
    const now = performance.now();

    // Initialize state if needed
    if (!stateRef.current) {
      stateRef.current = initializeState();
      return stateRef.current.cachedValue;
    }

    const state = stateRef.current;

    // Check if dependencies have changed using current equality function
    const equalityCheckStart = performance.now();
    const dependenciesEqual = state.equalityFn(state.lastDependencies as T, dependencies as T);
    const equalityCheckTime = performance.now() - equalityCheckStart;

    // Update metrics
    state.metrics.equalityChecks++;
    state.metrics.equalityCheckTimes.push(equalityCheckTime);

    // Keep only recent equality check times
    if (state.metrics.equalityCheckTimes.length > maxEqualityChecks) {
      state.metrics.equalityCheckTimes.shift();
    }

    // Update average equality time
    state.metrics.avgEqualityTime = state.metrics.equalityCheckTimes.reduce((sum, time) => sum + time, 0) / state.metrics.equalityCheckTimes.length;

    if (dependenciesEqual) {
      // Cache hit
      state.metrics.hitRate = (state.metrics.hitRate * (state.metrics.equalityChecks - 1) + 1) / state.metrics.equalityChecks;

      // Report to ComponentOptimizer
      if (componentOptimizer && componentName) {
        componentOptimizer.recordSample({
          componentId: componentName,
          duration: equalityCheckTime,
          timestamp: now,
          commitType: 'update',
          propsChanged: [],
        });
      }

      if (debug) {
        console.debug(`[SmartMemo] Cache hit for ${componentName}`, {
          strategy: state.strategy,
          equalityTime: equalityCheckTime.toFixed(2),
          hitRate: (state.metrics.hitRate * 100).toFixed(1),
        });
      }

      return state.cachedValue;
    } else {
      // Cache miss - recompute
      const computationStart = performance.now();
      const newValue = factory();
      const computationTime = performance.now() - computationStart;

      state.metrics.missRate = (state.metrics.missRate * (state.metrics.equalityChecks - 1) + 1) / state.metrics.equalityChecks;

      // Update cached value and dependencies
      state.cachedValue = newValue;
      state.lastDependencies = dependencies;

      // Adapt strategy if needed
      if (adaptiveStrategy && state.metrics.equalityChecks % 20 === 0) {
        const newStrategy = adaptStrategy(state.strategy, state.metrics, newValue, options);
        if (newStrategy !== state.strategy) {
          state.strategy = newStrategy;
          state.equalityFn = getEqualityFunction(newStrategy, options.customEqualityFn);
          state.metrics.adaptations++;
          state.metrics.strategy = newStrategy;

          if (debug) {
            console.debug(`[SmartMemo] Strategy adapted for ${componentName}`, {
              oldStrategy: state.strategy,
              newStrategy,
              adaptations: state.metrics.adaptations,
              metrics: state.metrics,
            });
          }
        }
      }

      // Report to ComponentOptimizer
      if (componentOptimizer && componentName) {
        componentOptimizer.recordSample({
          componentId: componentName,
          duration: computationTime + equalityCheckTime,
          timestamp: now,
          commitType: 'update',
          propsChanged: ['dependencies'],
        });
      }

      if (debug) {
        console.debug(`[SmartMemo] Cache miss for ${componentName}`, {
          strategy: state.strategy,
          equalityTime: equalityCheckTime.toFixed(2),
          computationTime: computationTime.toFixed(2),
          missRate: (state.metrics.missRate * 100).toFixed(1),
        });
      }

      return newValue;
    }
  }, dependencies);
}

/**
 * Smart memo with automatic component name detection
 */
export function useAutoSmartMemo<T>(
  factory: () => T,
  dependencies: unknown[],
  options: Omit<SmartMemoOptions<T>, 'componentName'> = {}
): T {
  // Try to detect component name from stack trace
  const componentName = useMemo(() => {
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
  }, []);

  return useSmartMemo(factory, dependencies, {
    ...options,
    componentName,
  });
}

/**
 * Get memoization metrics for a component
 */
export function useSmartMemoMetrics(componentName?: string): MemoizationMetrics | null {
  return useMemo(() => {
    if (!componentName || !componentOptimizer) {
      return null;
    }

    const insights = componentOptimizer.getInsights(componentName);
    const metrics = componentOptimizer.getMetrics(componentName);

    // Convert ComponentOptimizer metrics to MemoizationMetrics format
    return {
      equalityChecks: metrics.renderCount,
      equalityCheckTimes: metrics.recentSamples.map(s => s.duration),
      hitRate: metrics.renderCount > 0 ? (metrics.renderCount - metrics.updateCount) / metrics.renderCount : 0,
      missRate: metrics.renderCount > 0 ? metrics.updateCount / metrics.renderCount : 0,
      avgEqualityTime: metrics.averageDuration,
      strategy: 'mixed', // Default, actual strategy would need to be tracked separately
      adaptations: 0, // Would need to be tracked separately
    };
  }, [componentName]);
}

/**
 * Hook for creating smart memoized callbacks
 */
export function useSmartCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: unknown[],
  options: SmartMemoOptions<T> = {}
): T {
  return useSmartMemo(() => callback, dependencies, {
    ...options,
    strategy: options.strategy || 'shallow', // Callbacks usually benefit from shallow comparison
  });
}

/**
 * Hook for creating smart memoized values with custom comparison
 */
export function useSmartValue<T>(
  value: T,
  options: SmartMemoOptions<T> = {}
): T {
  return useSmartMemo(() => value, [value], options);
}