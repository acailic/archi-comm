import { useCallback, useRef, useSyncExternalStore } from 'react';
import { shallow } from 'zustand/shallow';

import { getDebugFlags, getSelectorOptimizationConfig } from '@/lib/config/performance-config';
import type { SubscriptionSource } from '@stores/StateManager';

const getNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const deriveDebugLabel = (selector: (state: unknown) => unknown): string => {
  if (selector.name) {
    return selector.name;
  }

  try {
    const stack = new Error().stack;
    if (!stack) {
      return 'useOptimizedSelector';
    }

    const lines = stack.split('\n').map(line => line.trim());
    const candidate = lines.find(
      (line) => line.startsWith('at ') && !line.includes('useOptimizedSelector')
    );

    if (candidate) {
      const match = candidate.match(/at ([^ ]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (error) {
    // Ignore stack parsing issues.
  }

  return 'useOptimizedSelector';
};

export interface UseOptimizedSelectorOptions<TSelected> {
  equalityFn?: (a: TSelected, b: TSelected) => boolean;
  debugLabel?: string;
  memoizeResult?: boolean | { size?: number };
}

export function useOptimizedSelector<TState, TSelected>(
  source: SubscriptionSource<TState>,
  selector: (state: TState) => TSelected,
  options?: UseOptimizedSelectorOptions<TSelected>
): TSelected {
  const selectorConfig = getSelectorOptimizationConfig();
  const debugFlags = getDebugFlags();
  const {
    shallowCompareByDefault,
    memoizeExpensiveSelectors,
    recordSelectorTimings,
    warnOnRapidRecompute,
    rapidRecomputeWindowMs,
    rapidRecomputeLimit,
  } = selectorConfig;
  const { enableStoreLogging } = debugFlags;

  const equalityComparer = options?.equalityFn ?? (shallowCompareByDefault ? shallow : Object.is);

  const memoizeOption = options?.memoizeResult ?? memoizeExpensiveSelectors;
  const memoizeEnabled = Boolean(memoizeOption);
  const memoizeSize = Math.max(
    1,
    typeof memoizeOption === 'object' && memoizeOption !== null && 'size' in memoizeOption
      ? memoizeOption.size ?? 10
      : 10
  );

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const latestRef = useRef<TSelected>();
  const memoCacheRef = useRef<TSelected[]>([]);
  const recomputeHistoryRef = useRef<number[]>([]);
  const lastWarningRef = useRef(0);
  const labelRef = useRef<string>();
  const previousSelectorRef = useRef(selector);

  const providedLabel = options?.debugLabel;
  if (previousSelectorRef.current !== selector) {
    previousSelectorRef.current = selector;
    memoCacheRef.current.length = 0;
    recomputeHistoryRef.current = [];
    if (!providedLabel) {
      labelRef.current = undefined;
    }
  }

  if (providedLabel && labelRef.current !== providedLabel) {
    labelRef.current = providedLabel;
  } else if (!labelRef.current) {
    labelRef.current = deriveDebugLabel(selector);
  }

  const debugLabel = labelRef.current;

  if (!memoizeEnabled && memoCacheRef.current.length > 0) {
    memoCacheRef.current.length = 0;
  }

  const reuseFromCache = useCallback(
    (value: TSelected): TSelected => {
      if (!memoizeEnabled) {
        return value;
      }

      const cache = memoCacheRef.current;
      for (let index = 0; index < cache.length; index += 1) {
        const cached = cache[index];
        if (equalityComparer(cached, value)) {
          return cached;
        }
      }

      cache.push(value);
      if (cache.length > memoizeSize) {
        cache.shift();
      }
      return value;
    },
    [memoizeEnabled, memoizeSize, equalityComparer]
  );

  const computeSelection = useCallback(
    (state: TState, phase: 'snapshot' | 'listener'): TSelected => {
      const shouldTime = enableStoreLogging && recordSelectorTimings;
      const start = shouldTime ? getNow() : 0;
      const result = selectorRef.current(state);
      const resolved = reuseFromCache(result);

      if (shouldTime) {
        const duration = getNow() - start;
        // eslint-disable-next-line no-console
        console.debug('[useOptimizedSelector]', {
          label: debugLabel,
          phase,
          duration,
        });
      }

      if (warnOnRapidRecompute) {
        const now = Date.now();
        const history = recomputeHistoryRef.current;
        history.push(now);
        const windowStart = now - rapidRecomputeWindowMs;
        while (history.length && history[0] < windowStart) {
          history.shift();
        }

        if (
          enableStoreLogging &&
          history.length > rapidRecomputeLimit &&
          now - lastWarningRef.current > rapidRecomputeWindowMs
        ) {
          // eslint-disable-next-line no-console
          console.warn('[useOptimizedSelector] Rapid recompute detected', {
            label: debugLabel,
            count: history.length,
            windowMs: rapidRecomputeWindowMs,
          });
          lastWarningRef.current = now;
        }
      }

      return resolved;
    },
    [
      enableStoreLogging,
      recordSelectorTimings,
      warnOnRapidRecompute,
      rapidRecomputeLimit,
      rapidRecomputeWindowMs,
      reuseFromCache,
      debugLabel,
    ]
  );

  const getSnapshot = useCallback(() => {
    const state = source.getState();
    const next = computeSelection(state, 'snapshot');

    if (latestRef.current === undefined || !equalityComparer(latestRef.current, next)) {
      latestRef.current = next;
    }

    return latestRef.current as TSelected;
  }, [source, computeSelection, equalityComparer]);

  const subscribe = useCallback(
    (notify: () => void) => {
      let current = computeSelection(source.getState(), 'subscribe-init');
      latestRef.current = current;

      const listener = () => {
        const next = computeSelection(source.getState(), 'listener');
        if (!equalityComparer(current, next)) {
          current = next;
          latestRef.current = next;
          notify();
        }
      };

      return source.subscribe(listener);
    },
    [source, computeSelection, equalityComparer]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
