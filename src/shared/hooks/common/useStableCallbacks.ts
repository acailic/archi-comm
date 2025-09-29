// src/shared/hooks/common/useStableCallbacks.ts
// Utility hook for stabilizing callback references to prevent unnecessary re-renders
// Creates stable callback references using useEvent pattern to avoid dependency issues
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/features/canvas/components/ReactFlowCanvas.tsx

import { renderDebugLogger } from "@/lib/debug/RenderDebugLogger";
import { RenderLoopDiagnostics } from "@/lib/debug/RenderLoopDiagnostics";
import { useCallback, useLayoutEffect, useRef } from "react";

// Callback stability monitoring
interface CallbackStabilityMetrics {
  callbackName: string;
  creationCount: number;
  lastCreatedAt: number;
  referenceChanges: number;
  stabilityScore: number;
  dependencyChanges: Array<{
    timestamp: number;
    dependencyIndex?: number;
    reason: string;
  }>;
  usageFrequency: number;
  performanceImpact: "low" | "medium" | "high";
}

interface CallbackMonitoringState {
  metrics: Map<string, CallbackStabilityMetrics>;
  totalCallbacks: number;
  unstableCallbacks: Set<string>;
  optimizationSuggestions: Set<string>;
}

const callbackMonitoringState: CallbackMonitoringState = {
  metrics: new Map(),
  totalCallbacks: 0,
  unstableCallbacks: new Set(),
  optimizationSuggestions: new Set(),
};

const trackCallbackStability = (
  callbackName: string,
  callback: any,
  isNewReference: boolean,
  dependencyChanges?: string[]
): void => {
  if (!import.meta.env.DEV) return;

  const now = Date.now();
  let metrics = callbackMonitoringState.metrics.get(callbackName);

  if (!metrics) {
    metrics = {
      callbackName,
      creationCount: 0,
      lastCreatedAt: now,
      referenceChanges: 0,
      stabilityScore: 100,
      dependencyChanges: [],
      usageFrequency: 0,
      performanceImpact: "low",
    };
    callbackMonitoringState.metrics.set(callbackName, metrics);
    callbackMonitoringState.totalCallbacks++;
  }

  metrics.creationCount++;
  metrics.usageFrequency++;

  if (isNewReference) {
    metrics.referenceChanges++;
    metrics.lastCreatedAt = now;

    // Calculate stability score (0-100, higher is more stable)
    metrics.stabilityScore = Math.max(
      0,
      100 - (metrics.referenceChanges / metrics.creationCount) * 100
    );

    // Track dependency changes
    if (dependencyChanges && dependencyChanges.length > 0) {
      dependencyChanges.forEach((change) => {
        metrics!.dependencyChanges.push({
          timestamp: now,
          reason: change,
        });
      });

      // Keep only recent dependency changes
      if (metrics.dependencyChanges.length > 20) {
        metrics.dependencyChanges = metrics.dependencyChanges.slice(-20);
      }
    }

    // Determine performance impact
    if (metrics.referenceChanges > 10 && metrics.stabilityScore < 50) {
      metrics.performanceImpact = "high";
    } else if (metrics.referenceChanges > 5 && metrics.stabilityScore < 75) {
      metrics.performanceImpact = "medium";
    } else {
      metrics.performanceImpact = "low";
    }

    // Track unstable callbacks
    if (metrics.stabilityScore < 70) {
      callbackMonitoringState.unstableCallbacks.add(callbackName);
    } else {
      callbackMonitoringState.unstableCallbacks.delete(callbackName);
    }

    // Generate optimization suggestions
    generateOptimizationSuggestions(metrics);

    // Log warnings for problematic callbacks
    if (metrics.stabilityScore < 50 && metrics.creationCount > 10) {
      console.warn(
        `[useStableCallbacks] Unstable callback detected: ${callbackName}`,
        {
          stabilityScore: `${metrics.stabilityScore.toFixed(1)}%`,
          referenceChanges: metrics.referenceChanges,
          creationCount: metrics.creationCount,
          recentDependencyChanges: metrics.dependencyChanges.slice(-3),
          suggestion:
            "Consider reviewing dependencies or using more stable references",
        }
      );
    }

    // Log to render debug system (throttled to prevent feedback loops)
    // Only log on significant events to avoid triggering more renders
    if (metrics.creationCount === 50 || (metrics.creationCount % 100 === 0 && metrics.stabilityScore < 40)) {
      // Use setTimeout to defer logging and break the render cycle
      setTimeout(() => {
        renderDebugLogger.logRender({
          componentName: "StableCallbacks",
          triggerReason: `callback-instability:${callbackName}`,
          callbackExecutions: [
            {
              callbackName,
              executionCount: metrics.creationCount,
              totalExecutionTime: 0,
              averageExecutionTime: 0,
              lastExecuted: now,
            },
          ],
          performanceMetrics: {
            renderDuration: 0,
            componentUpdateTime: 0,
            diffTime: 0,
            reconciliationTime: 0,
          },
        });
      }, 0);
    }

    // Record diagnostics
    RenderLoopDiagnostics.getInstance().recordStabilityWarning(callbackName, {
      stabilityScore: metrics.stabilityScore,
      referenceChanges: metrics.referenceChanges,
      creationCount: metrics.creationCount,
      performanceImpact: metrics.performanceImpact,
      recentDependencyChanges: metrics.dependencyChanges.slice(-5),
    });
  }
};

const generateOptimizationSuggestions = (
  metrics: CallbackStabilityMetrics
): void => {
  const callbackName = metrics.callbackName;

  if (
    metrics.stabilityScore < 60 &&
    !callbackMonitoringState.optimizationSuggestions.has(callbackName)
  ) {
    let suggestion = "";

    if (metrics.dependencyChanges.length > 5) {
      suggestion = `Consider reducing dependencies or using more stable references for ${callbackName}`;
    } else if (metrics.referenceChanges > 8) {
      suggestion = `Consider memoizing ${callbackName} with useCallback and stable dependencies`;
    } else {
      suggestion = `Consider optimizing ${callbackName} for better stability`;
    }

    callbackMonitoringState.optimizationSuggestions.add(suggestion);
    // Throttle console output to prevent spam
    if (metrics.creationCount === 20 || metrics.creationCount % 50 === 0) {
      console.info("[useStableCallbacks] Optimization suggestion:", suggestion);
    }
  }
};

const generateStabilityReport = (): string => {
  const metrics = Array.from(callbackMonitoringState.metrics.values());
  const unstableCallbacks = metrics.filter((m) => m.stabilityScore < 70);
  const highImpactCallbacks = metrics.filter(
    (m) => m.performanceImpact === "high"
  );

  const avgStabilityScore =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.stabilityScore, 0) / metrics.length
      : 100;

  const totalReferenceChanges = metrics.reduce(
    (sum, m) => sum + m.referenceChanges,
    0
  );

  return `
=== Callback Stability Report ===

Overview:
- Total Callbacks: ${callbackMonitoringState.totalCallbacks}
- Average Stability Score: ${avgStabilityScore.toFixed(1)}%
- Unstable Callbacks: ${unstableCallbacks.length}
- High Impact Callbacks: ${highImpactCallbacks.length}
- Total Reference Changes: ${totalReferenceChanges}

Most Unstable Callbacks:
${unstableCallbacks
  .sort((a, b) => a.stabilityScore - b.stabilityScore)
  .slice(0, 5)
  .map(
    (m) =>
      `- ${m.callbackName}: ${m.stabilityScore.toFixed(1)}% (${m.referenceChanges} changes)`
  )
  .join("\n")}

High Impact Callbacks:
${highImpactCallbacks
  .map(
    (m) =>
      `- ${m.callbackName}: ${m.performanceImpact} impact (${m.referenceChanges} changes)`
  )
  .join("\n")}

Optimization Suggestions:
${Array.from(callbackMonitoringState.optimizationSuggestions)
  .slice(0, 5)
  .map((s) => `- ${s}`)
  .join("\n")}
`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

// Export monitoring state for external access in development
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).__CALLBACK_STABILITY_MONITORING__ = {
    getMetrics: () => callbackMonitoringState.metrics,
    getReport: generateStabilityReport,
    getUnstableCallbacks: () =>
      Array.from(callbackMonitoringState.unstableCallbacks),
    getSuggestions: () =>
      Array.from(callbackMonitoringState.optimizationSuggestions),
    reset: () => {
      callbackMonitoringState.metrics.clear();
      callbackMonitoringState.unstableCallbacks.clear();
      callbackMonitoringState.optimizationSuggestions.clear();
      callbackMonitoringState.totalCallbacks = 0;
    },
  };
}

/**
 * Creates a stable callback reference that doesn't change between renders
 * Similar to React's experimental useEvent hook
 * The callback always has access to the latest values from the component scope
 */
export function useStableCallback<T extends AnyFunction>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  const previousCallbackRef = useRef<T | undefined>(undefined);
  const callbackNameRef = useRef<string>(
    callback.name || `anonymous-${Math.random().toString(36).substr(2, 9)}`
  );

  // Track callback changes for stability monitoring
  const isNewReference = previousCallbackRef.current !== callback;
  if (import.meta.env.DEV && isNewReference) {
    trackCallbackStability(
      `useStableCallback:${callbackNameRef.current}`,
      callback,
      true,
      ["callback-reference-changed"]
    );
  }
  previousCallbackRef.current = callback;

  // Update the ref in a layout effect to ensure we have the latest callback
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Return a stable callback that always calls the latest version
  const stableCallback = useCallback(
    ((...args: Parameters<T>) => {
      // Track callback usage
      if (import.meta.env.DEV) {
        const metrics = callbackMonitoringState.metrics.get(
          `useStableCallback:${callbackNameRef.current}`
        );
        if (metrics) {
          metrics.usageFrequency++;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return callbackRef.current(...args);
    }) as T,
    []
  );

  return stableCallback;
}

/**
 * Creates multiple stable callbacks at once with deep comparison
 * Useful for creating stable callback objects for components like React Flow
 * Uses deep comparison to prevent unnecessary recreations when callbacks object changes but individual functions remain the same
 */
export function useStableCallbacks<T extends Record<string, AnyFunction>>(
  callbacks: T
): T {
  const callbacksRef = useRef<T>(callbacks);
  const stableCallbacksRef = useRef<T | null>(null);
  const previousCallbacksRef = useRef<T | undefined>(undefined);
  const previousCallbackRefs = useRef<Map<string, AnyFunction>>(new Map());

  // Deep comparison to detect actual callback changes vs object reference changes
  const hasCallbackChanges = useCallback(
    (prev: T | undefined, current: T): string[] => {
      if (!prev) return Object.keys(current);

      const changedCallbacks: string[] = [];

      // Check for new/changed callbacks
      Object.keys(current).forEach((key) => {
        const prevCallback = prev[key];
        const currentCallback = current[key];

        if (prevCallback !== currentCallback) {
          changedCallbacks.push(key);
        }
      });

      // Check for removed callbacks
      Object.keys(prev).forEach((key) => {
        if (!(key in current)) {
          changedCallbacks.push(key);
        }
      });

      return changedCallbacks;
    },
    []
  );

  // Track callback changes for stability monitoring
  if (import.meta.env.DEV) {
    const changedCallbacks = hasCallbackChanges(
      previousCallbacksRef.current,
      callbacks
    );

    if (changedCallbacks.length > 0) {
      changedCallbacks.forEach((callbackName) => {
        const currentCallback = callbacks[callbackName];
        const previousCallback = previousCallbackRefs.current.get(callbackName);

        // Only track if callback function reference actually changed
        if (previousCallback !== currentCallback) {
          trackCallbackStability(
            `useStableCallbacks:${callbackName}`,
            currentCallback,
            true,
            [`callback-${callbackName}-changed`]
          );

          if (previousCallback) {
            console.debug(
              `[useStableCallbacks] Callback "${callbackName}" reference changed`,
              {
                previousFunction: previousCallback?.name || "anonymous",
                currentFunction: currentCallback?.name || "anonymous",
                recommendation:
                  "Consider using useCallback or stable references",
              }
            );
          }
        }

        // Update the reference map
        if (currentCallback) {
          previousCallbackRefs.current.set(callbackName, currentCallback);
        } else {
          previousCallbackRefs.current.delete(callbackName);
        }
      });
    }
  }

  previousCallbacksRef.current = callbacks;

  // Update the callbacks ref using layout effect for immediate updates
  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Create stable versions only when individual callback functions change, not when object reference changes
  const needsStableCallbacksUpdate = useCallback(() => {
    if (!stableCallbacksRef.current) return true;

    // Check if any individual callback function has changed
    return (
      Object.keys(callbacks).some((key) => {
        const currentCallback = callbacks[key];
        const stableCallback = stableCallbacksRef.current![key];

        // If we don't have a stable callback for this key, we need to create it
        if (!stableCallback) return true;

        // The stable callback wrapper itself shouldn't change, but we need to check if it exists
        return false;
      }) ||
      Object.keys(stableCallbacksRef.current).some((key) => {
        // Check if any stable callback no longer has a corresponding current callback
        return !(key in callbacks);
      })
    );
  }, [callbacks]);

  // Only recreate stable callbacks when individual functions change
  if (!stableCallbacksRef.current || needsStableCallbacksUpdate()) {
    const stableCallbacks = {} as T;

    for (const key in callbacks) {
      if (typeof callbacks[key] === "function") {
        // Create a stable wrapper that always calls the latest version
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stableCallbacks[key] = ((...args: any[]) => {
          // Track callback usage for performance monitoring
          if (import.meta.env.DEV) {
            const metrics = callbackMonitoringState.metrics.get(
              `useStableCallbacks:${key}`
            );
            if (metrics) {
              metrics.usageFrequency++;
            }
          }

          // Always call the latest version from the ref
          const currentCallback = callbacksRef.current[key];
          if (typeof currentCallback === "function") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
            return currentCallback(...args);
          }

          console.warn(
            `[useStableCallbacks] Callback "${key}" is not a function:`,
            typeof currentCallback
          );
        }) as T[typeof key];
      } else {
        // For non-function values, just pass them through
        stableCallbacks[key] = callbacks[key];
      }
    }

    stableCallbacksRef.current = stableCallbacks;

    if (import.meta.env.DEV) {
      console.debug(
        "[useStableCallbacks] Created new stable callbacks object",
        {
          callbackKeys: Object.keys(stableCallbacks),
          reason: "individual-callback-functions-changed",
        }
      );
    }
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
  enabled = import.meta.env.DEV
) {
  const previousCallbackRef = useRef<AnyFunction>();
  const renderCountRef = useRef(0);
  const dependencyChangesRef = useRef<string[]>([]);

  if (enabled) {
    renderCountRef.current++;
    const isNewReference =
      previousCallbackRef.current && previousCallbackRef.current !== callback;

    if (isNewReference) {
      const reason = `recreated-on-render-${renderCountRef.current}`;
      dependencyChangesRef.current.push(reason);

      trackCallbackStability(
        `useCallbackStabilityTracker:${name}`,
        callback,
        true,
        [reason]
      );

      console.warn(
        `[useCallbackStabilityTracker] Callback "${name}" was recreated on render #${renderCountRef.current}. ` +
          "Consider using useStableCallback or reviewing dependencies.",
        {
          renderCount: renderCountRef.current,
          recentChanges: dependencyChangesRef.current.slice(-3),
          stabilityMetrics: callbackMonitoringState.metrics.get(
            `useCallbackStabilityTracker:${name}`
          ),
        }
      );
    }

    previousCallbackRef.current = callback;
  }

  return callback;
}

/**
 * Development helper to get callback stability metrics
 */
export function getCallbackStabilityMetrics(): CallbackStabilityMetrics[] {
  if (!import.meta.env.DEV) {
    return [];
  }
  return Array.from(callbackMonitoringState.metrics.values());
}

/**
 * Development helper to get callback stability report
 */
export function getCallbackStabilityReport(): string {
  if (!import.meta.env.DEV) {
    return "Callback stability tracking is only available in development mode.";
  }
  return generateStabilityReport();
}

/**
 * Development helper to reset callback stability metrics
 */
export function resetCallbackStabilityMetrics(): void {
  if (!import.meta.env.DEV) {
    return;
  }
  callbackMonitoringState.metrics.clear();
  callbackMonitoringState.unstableCallbacks.clear();
  callbackMonitoringState.optimizationSuggestions.clear();
  callbackMonitoringState.totalCallbacks = 0;
}

/**
 * Development helper to analyze callback stability for a specific component
 */
export function analyzeComponentCallbackStability(componentName: string): {
  totalCallbacks: number;
  unstableCallbacks: number;
  averageStabilityScore: number;
  suggestions: string[];
} {
  if (!import.meta.env.DEV) {
    return {
      totalCallbacks: 0,
      unstableCallbacks: 0,
      averageStabilityScore: 100,
      suggestions: [],
    };
  }

  const componentCallbacks = Array.from(
    callbackMonitoringState.metrics.values()
  ).filter((m) => m.callbackName.includes(componentName));

  const unstableCallbacks = componentCallbacks.filter(
    (m) => m.stabilityScore < 70
  ).length;
  const averageStabilityScore =
    componentCallbacks.length > 0
      ? componentCallbacks.reduce((sum, m) => sum + m.stabilityScore, 0) /
        componentCallbacks.length
      : 100;

  const suggestions = Array.from(
    callbackMonitoringState.optimizationSuggestions
  )
    .filter((s) => s.includes(componentName))
    .slice(0, 3);

  return {
    totalCallbacks: componentCallbacks.length,
    unstableCallbacks,
    averageStabilityScore,
    suggestions,
  };
}

// Periodic stability report in development
if (import.meta.env.DEV) {
  setInterval(() => {
    const unstableCount = callbackMonitoringState.unstableCallbacks.size;
    if (unstableCount > 5) {
      console.group("[useStableCallbacks] Periodic Stability Report");
      console.warn(`${unstableCount} unstable callbacks detected`);
      console.log(generateStabilityReport());
      console.groupEnd();
    }
  }, 60000); // Every minute
}
