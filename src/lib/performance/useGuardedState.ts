import React from 'react';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';

export interface GuardOptions {
  maxUpdatesPerTick?: number;
  componentName?: string;
  onTrip?: (count: number) => void;
}

/**
 * Development-only guarded state that prevents excessive setState churn within a single tick.
 * When the max updates per tick is exceeded, further updates in that tick are ignored and
 * a warning is emitted. This helps prevent cascading setState loops from reaching React's
 * "Maximum update depth exceeded" threshold while surfacing a clear signal for diagnostics.
 */
export function useGuardedState<S>(
  initial: S,
  options: GuardOptions = {}
): [S, React.Dispatch<React.SetStateAction<S>>] {
  const dev = import.meta.env.DEV;
  if (!dev) {
    return React.useState<S>(initial);
  }

  const { maxUpdatesPerTick = 20, componentName = 'GuardedState', onTrip } = options;

  const [state, realSetState] = React.useState<S>(initial);
  const updatesInTickRef = React.useRef(0);
  const tickScheduledRef = React.useRef(false);

  const scheduleReset = () => {
    if (tickScheduledRef.current) return;
    tickScheduledRef.current = true;
    // Reset per microtask + next frame for safety
    Promise.resolve().then(() => {
      updatesInTickRef.current = 0;
      tickScheduledRef.current = false;
    });
  };

  const setStateGuarded = React.useCallback<React.Dispatch<React.SetStateAction<S>>>((updater) => {
    updatesInTickRef.current += 1;
    scheduleReset();

    if (updatesInTickRef.current > maxUpdatesPerTick) {
      const count = updatesInTickRef.current;
      // Record with the global detector for unified diagnostics
      try {
        InfiniteLoopDetector.recordRender(componentName, {
          componentName,
          renderCount: count,
          reason: 'update-depth-limit',
          timestamp: Date.now(),
        } as any);
      } catch {}

      // Notify listener and ignore the update to break the cascade
      onTrip?.(count);
      if (typeof console !== 'undefined') {
        console.warn(
          `[useGuardedState] Ignored setState after ${count} updates in one tick for ${componentName}`
        );
      }
      return;
    }

    realSetState(updater);
  }, [componentName, maxUpdatesPerTick, onTrip]);

  return [state, setStateGuarded];
}
