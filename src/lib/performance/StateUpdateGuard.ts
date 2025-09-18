// State update guards for critical operations to prevent infinite loops
// Provides wrapped setState functions with built-in protection mechanisms
// RELEVANT FILES: UpdateDepthMonitor.ts, RenderGuard.ts, InfiniteLoopDetector.ts

import { useCallback, useRef } from 'react';
import { UpdateDepthMonitor } from './UpdateDepthMonitor';
import { InfiniteLoopDetector } from './InfiniteLoopDetector';

interface StateUpdateOptions {
  componentName: string;
  stateName: string;
  maxUpdatesPerSecond?: number;
  enableDeduplication?: boolean;
  enableThrottling?: boolean;
  debugMode?: boolean;
}

interface GuardedUpdateResult<T> {
  success: boolean;
  blocked: boolean;
  value: T;
  reason?: string;
}

class StateUpdateGuard {
  private static pendingUpdates = new Map<string, { value: any; timestamp: number }>();
  private static throttleTimers = new Map<string, number>();

  static createGuardedSetter<T>(
    setter: (value: T | ((prev: T) => T)) => void,
    options: StateUpdateOptions
  ) {
    const updateMonitor = UpdateDepthMonitor.getInstance();
    const loopDetector = InfiniteLoopDetector.getInstance();

    return (value: T | ((prev: T) => T), forceUpdate = false): GuardedUpdateResult<T> => {
      const key = `${options.componentName}.${options.stateName}`;
      const now = Date.now();

      // Check if monitor is in emergency mode
      if (updateMonitor.isEmergencyMode() && !forceUpdate) {
        if (options.debugMode) {
          console.warn(`StateUpdateGuard: Blocked update for ${key} - emergency mode active`);
        }
        return {
          success: false,
          blocked: true,
          value: typeof value === 'function' ? (value as any)(undefined) : value,
          reason: 'Emergency mode active'
        };
      }

      // Record update attempt
      const canUpdate = updateMonitor.recordUpdate(key);
      if (!canUpdate && !forceUpdate) {
        return {
          success: false,
          blocked: true,
          value: typeof value === 'function' ? (value as any)(undefined) : value,
          reason: 'Update rate limit exceeded'
        };
      }

      // Check for rapid successive identical updates (deduplication)
      if (options.enableDeduplication) {
        const pending = StateUpdateGuard.pendingUpdates.get(key);
        const actualValue = typeof value === 'function' ? (value as any)(undefined) : value;

        if (pending && now - pending.timestamp < 16 && pending.value === actualValue) {
          if (options.debugMode) {
            console.warn(`StateUpdateGuard: Deduplicated identical update for ${key}`);
          }
          return {
            success: false,
            blocked: true,
            value: actualValue,
            reason: 'Duplicate update deduplicated'
          };
        }

        StateUpdateGuard.pendingUpdates.set(key, { value: actualValue, timestamp: now });
      }

      // Apply throttling if enabled
      if (options.enableThrottling) {
        const maxRate = options.maxUpdatesPerSecond || 60;
        const minInterval = 1000 / maxRate;
        const lastUpdate = StateUpdateGuard.throttleTimers.get(key) || 0;

        if (now - lastUpdate < minInterval && !forceUpdate) {
          if (options.debugMode) {
            console.warn(`StateUpdateGuard: Throttled update for ${key}`);
          }

          // Schedule the update for later
          setTimeout(() => {
            StateUpdateGuard.throttleTimers.set(key, Date.now());
            setter(value);
          }, minInterval - (now - lastUpdate));

          return {
            success: true,
            blocked: false,
            value: typeof value === 'function' ? (value as any)(undefined) : value,
            reason: 'Update scheduled (throttled)'
          };
        }

        StateUpdateGuard.throttleTimers.set(key, now);
      }

      // Record render event for loop detection
      loopDetector.recordRender(key, {
        componentName: options.componentName,
        propsHash: options.stateName,
        timestamp: now,
        renderCount: 1
      });

      // Perform the actual update
      try {
        setter(value);

        if (options.debugMode) {
          console.debug(`StateUpdateGuard: Successfully updated ${key}`);
        }

        return {
          success: true,
          blocked: false,
          value: typeof value === 'function' ? (value as any)(undefined) : value
        };
      } catch (error) {
        console.error(`StateUpdateGuard: Failed to update ${key}`, error);
        return {
          success: false,
          blocked: false,
          value: typeof value === 'function' ? (value as any)(undefined) : value,
          reason: `Update failed: ${error}`
        };
      }
    };
  }

  static cleanup() {
    StateUpdateGuard.pendingUpdates.clear();
    StateUpdateGuard.throttleTimers.clear();
  }
}

// React hook for creating guarded state setters
export function useGuardedState<T>(
  initialValue: T,
  options: StateUpdateOptions
): [T, (value: T | ((prev: T) => T)) => GuardedUpdateResult<T>] {
  const valueRef = useRef(initialValue);

  const guardedSetter = useCallback(
    StateUpdateGuard.createGuardedSetter<T>(
      (newValue) => {
        if (typeof newValue === 'function') {
          valueRef.current = (newValue as (prev: T) => T)(valueRef.current);
        } else {
          valueRef.current = newValue;
        }
      },
      options
    ),
    [options.componentName, options.stateName, options.enableDeduplication, options.enableThrottling]
  );

  return [valueRef.current, guardedSetter];
}

// Utility to wrap existing setState functions
export function wrapSetStateWithGuard<T>(
  setter: (value: T | ((prev: T) => T)) => void,
  options: StateUpdateOptions
) {
  return StateUpdateGuard.createGuardedSetter(setter, options);
}

// Emergency circuit breaker
export function createEmergencyBreaker(componentName: string, maxFailures = 5) {
  let failureCount = 0;
  let lastFailure = 0;
  const resetInterval = 10000; // 10 seconds

  return {
    canExecute(): boolean {
      const now = Date.now();

      // Reset failure count if enough time has passed
      if (now - lastFailure > resetInterval) {
        failureCount = 0;
      }

      return failureCount < maxFailures;
    },

    recordFailure() {
      failureCount++;
      lastFailure = Date.now();

      if (failureCount >= maxFailures) {
        console.error(`Emergency breaker activated for ${componentName} after ${maxFailures} failures`);
        InfiniteLoopDetector.getInstance().recordStabilityWarning(
          componentName,
          `Emergency breaker activated after ${maxFailures} consecutive failures`
        );
      }
    },

    recordSuccess() {
      if (failureCount > 0) {
        failureCount = Math.max(0, failureCount - 1);
      }
    },

    isTripped(): boolean {
      return failureCount >= maxFailures;
    },

    reset() {
      failureCount = 0;
      lastFailure = 0;
    }
  };
}

export { StateUpdateGuard, type StateUpdateOptions, type GuardedUpdateResult };