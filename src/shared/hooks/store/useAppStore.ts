import { useSyncExternalStore, useMemo } from 'react';
import { appStore, type AppState, type AppStoreActions } from '@/stores/AppStore';

export function useAppStore(): { state: AppState; actions: AppStoreActions } {
  const state = useSyncExternalStore(appStore.subscribe, appStore.getState, appStore.getState);
  // Actions are stable getters off the singleton; memoize for referential stability
  const actions = useMemo(() => appStore.actions, []);
  return { state, actions };
}

export function useAppStoreSelector<T>(selector: (state: AppState) => T): T {
  // Bridge selector through useSyncExternalStore so unsubscribe happens on unmount
  const getSnapshot = () => selector(appStore.getState());
  return useSyncExternalStore(appStore.subscribe, getSnapshot, getSnapshot);
}

