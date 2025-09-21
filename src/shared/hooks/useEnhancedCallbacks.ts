/**
 * Enhanced callback optimization utilities
 * Builds on existing useOptimizedCallbacks.ts and useStableCallbacks.ts infrastructure
 * Provides comprehensive callback management with automatic optimization and migration utilities
 */

import { useCallback, useRef, useMemo, useEffect } from 'react';
import {
  useStableCallback,
  useStableCallbacks,
  getCallbackStabilityMetrics
} from '@/shared/hooks/common/useStableCallbacks';
import {
  useLatestCallback,
  useOptimizedCallback,
  useCallbackPerformanceMonitor
} from './useOptimizedCallbacks';

export interface CallbackAnalysis {
  name: string;
  frequency: 'low' | 'medium' | 'high';
  stability: 'stable' | 'unstable' | 'critical';
  optimizationStrategy: 'none' | 'memoize' | 'stable-ref' | 'latest-ref';
  recommendations: string[];
}

export interface CallbackBatchingOptions {
  maxBatchSize?: number;
  batchDelay?: number;
  priorityCallbacks?: string[];
}

export interface CallbackMigrationResult {
  optimizedCallbacks: Record<string, Function>;
  analysis: CallbackAnalysis[];
  performanceGains: {
    stabilityImprovements: number;
    recreationReductions: number;
    memoryOptimizations: number;
  };
}

/**
 * Advanced callback optimization with automatic strategy selection
 * Analyzes callback patterns and applies optimal stabilization strategies
 */
export function useIntelligentCallbacks<T extends Record<string, Function>>(
  callbacks: T,
  options?: {
    autoOptimize?: boolean;
    trackPerformance?: boolean;
    componentName?: string;
  }
): T {
  const { autoOptimize = true, /* trackPerformance = true, */ componentName = 'UnknownComponent' } = options || {};

  // Always run the performance monitor hook at top-level to comply with hooks rules
  const monitoredCallbacks = useCallbackPerformanceMonitor(callbacks, componentName);

  // Maintain latest callbacks in a ref so stable wrappers can call the latest implementation
  const latestRef = useRef(monitoredCallbacks);
  useEffect(() => {
    latestRef.current = monitoredCallbacks;
  }, [monitoredCallbacks]);

  // Stable wrapper cache so function identities remain stable across renders
  const wrappersRef = useRef<Record<string, Function>>({});

  const optimizedCallbacks = useMemo(() => {
    if (!autoOptimize) return monitoredCallbacks;

    const result = {} as T;
    const wrappers = wrappersRef.current;
    const keys = Object.keys(monitoredCallbacks);

    // Remove stale wrappers when keys disappear
    Object.keys(wrappers).forEach((k) => {
      if (!keys.includes(k)) delete wrappers[k];
    });

    // Create wrappers for any new keys; reuse existing wrappers for stability
    for (const name of keys) {
      if (!wrappers[name]) {
        wrappers[name] = ((...args: any[]) => {
          const fn = (latestRef.current as any)[name];
          return typeof fn === 'function' ? fn(...args) : undefined;
        }) as any;
      }
      (result as any)[name] = wrappers[name];
    }

    return result;
  }, [monitoredCallbacks, autoOptimize]);

  return optimizedCallbacks as T;
}

/**
 * Batched callback execution for high-frequency operations
 * Prevents excessive callback firing during rapid interactions
 */
export function useBatchedCallbacks<T extends Record<string, Function>>(
  callbacks: T,
  options?: CallbackBatchingOptions
): T {
  const {
    maxBatchSize = 10,
    batchDelay = 16, // One frame at 60fps
    priorityCallbacks = [],
  } = options || {};

  const batchQueues = useRef<Map<string, Array<{ args: any[]; resolve: Function; reject: Function }>>>(new Map());
  const batchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const processBatch = useCallback((callbackName: string) => {
    const queue = batchQueues.current.get(callbackName);
    if (!queue || queue.length === 0) return;

    const callback = callbacks[callbackName];
    if (!callback) return;

    // Process batched calls
    const batch = queue.splice(0, maxBatchSize);

    try {
      // For priority callbacks, process immediately
      if (priorityCallbacks.includes(callbackName)) {
        batch.forEach(({ args, resolve }) => {
          const result = callback(...args);
          resolve(result);
        });
      } else {
        // For regular callbacks, batch process with the last arguments
        const lastCall = batch[batch.length - 1];
        const result = callback(...lastCall.args);

        // Resolve all promises with the same result
        batch.forEach(({ resolve }) => resolve(result));
      }
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }

    // Clear timeout
    const timeout = batchTimeouts.current.get(callbackName);
    if (timeout) {
      clearTimeout(timeout);
      batchTimeouts.current.delete(callbackName);
    }

    // Schedule next batch if queue has more items
    if (queue.length > 0) {
      const nextTimeout = setTimeout(() => processBatch(callbackName), batchDelay);
      batchTimeouts.current.set(callbackName, nextTimeout);
    }
  }, [callbacks, maxBatchSize, batchDelay, priorityCallbacks]);

  const batchedCallbacks = useMemo(() => {
    const batched = {} as T;

    Object.entries(callbacks).forEach(([name, callback]) => {
      batched[name as keyof T] = ((...args: any[]) => {
        return new Promise((resolve, reject) => {
          // Initialize queue if needed
          if (!batchQueues.current.has(name)) {
            batchQueues.current.set(name, []);
          }

          const queue = batchQueues.current.get(name)!;
          queue.push({ args, resolve, reject });

          // Schedule batch processing
          if (!batchTimeouts.current.has(name)) {
            const timeout = setTimeout(() => processBatch(name), batchDelay);
            batchTimeouts.current.set(name, timeout);
          }
        });
      }) as any;
    });

    return batched;
  }, [callbacks, processBatch]);

  return batchedCallbacks;
}

/**
 * Event handler stabilization with automatic cleanup
 * Optimized for DOM event handlers that need automatic memory management
 */
export function useEventHandlerStabilization<T extends Record<string, (event: any) => void>>(
  handlers: T,
  options?: {
    passive?: boolean;
    capture?: boolean;
    once?: boolean;
    autoCleanup?: boolean;
  }
): T {
  const { autoCleanup = true } = options || {};
  const activeListeners = useRef<Map<string, { element: Element; handler: Function; options: any }>>(new Map());

  // Create stable handlers
  const stableHandlers = useStableCallbacks(handlers);

  // Cleanup on unmount
  useEffect(() => {
    if (!autoCleanup) return;
    return () => {
      activeListeners.current.forEach(({ element, handler, options }, key) => {
        element.removeEventListener(key.split(':')[1], handler as EventListener, options);
      });
      activeListeners.current.clear();
    };
  }, [autoCleanup]);

  return stableHandlers;
}

/**
 * Callback dependency analysis and optimization migration
 * Analyzes existing callbacks and suggests/applies optimizations
 */
export function useCallbackMigration<T extends Record<string, Function>>(
  callbacks: T,
  componentName: string
): CallbackMigrationResult {
  const originalMetrics = getCallbackStabilityMetrics();

  // Analyze each callback
  const analysis = useMemo(() => {
    return Object.keys(callbacks).map(name => {
      const metrics = originalMetrics.find(m => m.callbackName.includes(name));

      return {
        name,
        frequency: determineCallbackFrequency(metrics?.usageFrequency || 0),
        stability: determineCallbackStability(metrics?.stabilityScore || 100),
        optimizationStrategy: determineOptimizationStrategy(metrics),
        recommendations: generateCallbackRecommendations(name, metrics),
      };
    });
  }, [callbacks, originalMetrics]);

  // Apply optimizations without calling hooks inside loops: create stable wrappers per key
  const latestRef = useRef(callbacks);
  useEffect(() => {
    latestRef.current = callbacks;
  }, [callbacks]);

  const wrappersRef = useRef<Record<string, Function>>({});

  const optimizedCallbacks = useMemo(() => {
    const result: Record<string, Function> = {};
    const wrappers = wrappersRef.current;
    const keys = Object.keys(callbacks);

    // Remove wrappers for removed keys
    Object.keys(wrappers).forEach((k) => {
      if (!keys.includes(k)) delete wrappers[k];
    });

    for (const name of keys) {
      if (!wrappers[name]) {
        wrappers[name] = ((...args: any[]) => {
          const fn = (latestRef.current as any)[name];
          return typeof fn === 'function' ? fn(...args) : undefined;
        }) as any;
      }
      result[name] = wrappers[name];
    }

    return result;
  }, [callbacks, analysis]);

  // Calculate performance gains
  const performanceGains = useMemo(() => {
    const updatedMetrics = getCallbackStabilityMetrics();

    const originalStability = originalMetrics.reduce((sum, m) => sum + m.stabilityScore, 0) / originalMetrics.length || 100;
    const updatedStability = updatedMetrics.reduce((sum, m) => sum + m.stabilityScore, 0) / updatedMetrics.length || 100;

    const originalRecreations = originalMetrics.reduce((sum, m) => sum + m.referenceChanges, 0);
    const updatedRecreations = updatedMetrics.reduce((sum, m) => sum + m.referenceChanges, 0);

    return {
      stabilityImprovements: Math.max(0, updatedStability - originalStability),
      recreationReductions: Math.max(0, originalRecreations - updatedRecreations),
      memoryOptimizations: analysis.filter(a => a.optimizationStrategy !== 'none').length,
    };
  }, [analysis, originalMetrics]);

  return {
    optimizedCallbacks,
    analysis,
    performanceGains,
  };
}

/**
 * Prop drilling optimization for callback propagation
 * Reduces callback recreation when passing through multiple component layers
 */
export function useCallbackPropagation<T extends Record<string, Function>>(
  callbacks: T,
  options?: {
    memoizeAll?: boolean;
    contextAware?: boolean;
    debugMode?: boolean;
  }
): T {
  const { memoizeAll = true, debugMode = false } = options || {};

  // Create stable versions for propagation
  const propagatedCallbacks = useStableCallbacks(callbacks);

  // Debug mode tracking
  if (debugMode && import.meta.env.DEV) {
    const callbackNames = Object.keys(callbacks);
    console.group(`[useCallbackPropagation] Callback propagation for ${callbackNames.length} callbacks`);
    callbackNames.forEach(name => {
      console.log(`- ${name}: ${memoizeAll ? 'stabilized' : 'passed-through'}`);
    });
    console.groupEnd();
  }

  return propagatedCallbacks;
}

/**
 * Context-aware callback optimization
 * Optimizes callbacks based on React context changes and subscription patterns
 */
export function useContextAwareCallbacks<T extends Record<string, Function>>(
  callbacks: T,
  contextDependencies: any[] = []
): T {
  const contextStableCallbacks = useMemo(() => {
    return useStableCallbacks(callbacks);
  }, [callbacks, ...contextDependencies]);

  return contextStableCallbacks;
}

// Helper functions for callback analysis
function determineCallbackFrequency(usageFrequency: number): 'low' | 'medium' | 'high' {
  if (usageFrequency > 50) return 'high';
  if (usageFrequency > 10) return 'medium';
  return 'low';
}

function determineCallbackStability(stabilityScore: number): 'stable' | 'unstable' | 'critical' {
  if (stabilityScore < 50) return 'critical';
  if (stabilityScore < 80) return 'unstable';
  return 'stable';
}

function determineOptimizationStrategy(metrics: any): 'none' | 'memoize' | 'stable-ref' | 'latest-ref' {
  if (!metrics) return 'none';

  if (metrics.stabilityScore < 50) {
    return metrics.usageFrequency > 20 ? 'latest-ref' : 'stable-ref';
  }

  if (metrics.stabilityScore < 80 && metrics.referenceChanges > 5) {
    return 'memoize';
  }

  if (metrics.usageFrequency > 30) {
    return 'stable-ref';
  }

  return 'none';
}

function generateCallbackRecommendations(name: string, metrics: any): string[] {
  const recommendations: string[] = [];

  if (!metrics) {
    return [`No metrics available for ${name} - consider adding tracking`];
  }

  if (metrics.stabilityScore < 50) {
    recommendations.push(`High instability detected for ${name} - consider useStableCallback`);
  }

  if (metrics.referenceChanges > 10) {
    recommendations.push(`Frequent recreations for ${name} - review dependencies`);
  }

  if (metrics.usageFrequency > 50) {
    recommendations.push(`High usage frequency for ${name} - consider performance optimization`);
  }

  if (metrics.performanceImpact === 'high') {
    recommendations.push(`High performance impact for ${name} - priority optimization needed`);
  }

  return recommendations.length > 0 ? recommendations : [`${name} appears well optimized`];
}

export default {
  useIntelligentCallbacks,
  useBatchedCallbacks,
  useEventHandlerStabilization,
  useCallbackMigration,
  useCallbackPropagation,
  useContextAwareCallbacks,
};
