import { useRef, useSyncExternalStore } from 'react';

import type { SubscriptionSource } from '@stores/StateManager';

export interface UseOptimizedSelectorOptions<TSelected> {
  equalityFn?: (a: TSelected, b: TSelected) => boolean;
  debugLabel?: string;
}

export function useOptimizedSelector<TState, TSelected>(
  source: SubscriptionSource<TState>,
  selector: (state: TState) => TSelected,
  options?: UseOptimizedSelectorOptions<TSelected>
): TSelected {
  const equalityFn = options?.equalityFn ?? Object.is;
  const latestRef = useRef<TSelected>();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const debugLabel = options?.debugLabel;

  const getSnapshot = () => {
    const state = source.getState();
    const next = selectorRef.current(state);

    if (latestRef.current === undefined || !equalityFn(latestRef.current, next)) {
      if (import.meta.env.DEV && (window as any).__DEBUG_SELECTORS__ && debugLabel) {
        // eslint-disable-next-line no-console
        console.debug('[selector:getSnapshot]', debugLabel, {
          changed: latestRef.current !== undefined,
          prev: latestRef.current,
          next,
        });
      }
      latestRef.current = next;
    }

    return latestRef.current as TSelected;
  };

  const subscribe = (notify: () => void) => {
    let current = selectorRef.current(source.getState());
    latestRef.current = current;

    const listener = () => {
      const next = selectorRef.current(source.getState());
      if (!equalityFn(current, next)) {
        if (import.meta.env.DEV && (window as any).__DEBUG_SELECTORS__ && debugLabel) {
          // eslint-disable-next-line no-console
          console.debug('[selector:listener]', debugLabel, {
            prev: current,
            next,
          });
        }
        current = next;
        latestRef.current = next;
        notify();
      }
    };

    return source.subscribe(listener);
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
