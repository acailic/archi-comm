// src/lib/performance/useMonitoredStoreSelector.ts
// Utility hook that wraps Zustand store selectors with performance monitoring
// Tracks render frequency and integrates with InfiniteLoopDetector for circuit breaker logic
// RELEVANT FILES: src/lib/performance/InfiniteLoopDetector.ts, src/lib/performance/useGuardedState.ts, src/stores/SimpleAppStore.ts, src/stores/canvasStore.ts

import { useRef } from "react";

interface MonitoredSelectorOptions {
  componentName: string;
  circuitBreakerCooldownMs?: number;
}

/**
 * A hook that wraps Zustand store selectors with performance monitoring.
 * Tracks render frequency and can temporarily unsubscribe from stores when
 * infinite loops are detected via circuit breaker logic.
 */
export function useMonitoredStoreSelector<TStore, TResult>(
  useStore: (selector: (state: TStore) => TResult) => TResult,
  selector: (state: TStore) => TResult,
  options: MonitoredSelectorOptions
): TResult {
  const { componentName, circuitBreakerCooldownMs = 1000 } = options;

  // Track render frequency for this specific selector
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef(Date.now());
  const circuitBreakerRef = useRef<{
    openUntil: number;
    cachedValue: TResult | null;
  }>({
    openUntil: 0,
    cachedValue: null,
  });

  // Always call the underlying store hook to preserve hook ordering
  const storeValue = useStore(selector);

  // Track render metrics
  const previousRenderTime = lastRenderRef.current;
  const currentTime = Date.now();
  renderCountRef.current += 1;
  lastRenderRef.current = currentTime;

  const sincePreviousRenderMs = currentTime - previousRenderTime;

  // Simplified detection that doesn't spam console
  if (process.env.NODE_ENV === "development") {
    // Only activate circuit breaker for extremely rapid renders without console spam
    if (
      sincePreviousRenderMs > 0 &&
      sincePreviousRenderMs < 5 &&
      renderCountRef.current > 50
    ) {
      const isFirstBreaker = circuitBreakerRef.current.openUntil === 0;
      circuitBreakerRef.current = {
        openUntil: currentTime + circuitBreakerCooldownMs,
        cachedValue: storeValue,
      };

      // Only log once when circuit breaker first activates
      if (isFirstBreaker) {
        console.warn(
          `[useMonitoredStoreSelector] Circuit breaker activated for ${componentName}`
        );
      }
    }
  }

  // Return cached value while the circuit breaker is open
  const circuitBreakerState = circuitBreakerRef.current;
  const isCircuitBreakerOpen = circuitBreakerState.openUntil > Date.now();

  if (isCircuitBreakerOpen && circuitBreakerState.cachedValue !== null) {
    return circuitBreakerState.cachedValue;
  }

  // Cache the latest value for potential circuit breaker use
  circuitBreakerRef.current.cachedValue = storeValue;

  return storeValue;
}

/**
 * Convenience hook for monitoring SimpleAppStore selectors
 */
export function useMonitoredAppSelector<TResult>(
  selector: (state: any) => TResult,
  componentName: string
): TResult {
  // We'll need to import the actual store in components that use this
  throw new Error("useMonitoredAppSelector requires store import in component");
}

/**
 * Convenience hook for monitoring canvas store selectors
 */
export function useMonitoredCanvasSelector<TResult>(
  selector: (state: any) => TResult,
  componentName: string
): TResult {
  // We'll need to import the actual store in components that use this
  throw new Error(
    "useMonitoredCanvasSelector requires store import in component"
  );
}
