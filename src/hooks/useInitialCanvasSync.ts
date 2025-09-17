// src/hooks/useInitialCanvasSync.ts
// Custom hook to handle initial data synchronization without causing infinite render loops
// Prevents circular dependencies between DesignCanvas and canvas store
// RELEVANT FILES: src/stores/canvasStore.ts, src/components/DesignCanvas.tsx, src/hooks/useStableCallbacks.ts

import { useCallback, useEffect, useRef } from 'react';
import type { Connection, DesignComponent, InfoCard } from '../shared/contracts';
import { useCanvasStore, getCanvasState } from '../stores/canvasStore';

interface CanvasData {
  components?: DesignComponent[];
  connections?: Connection[];
  infoCards?: InfoCard[];
}

interface UseInitialCanvasSyncOptions {
  initialData?: CanvasData;
  challengeId?: string;
  enabled?: boolean;
}

/**
 * Hook to synchronize initial canvas data with the store
 * Prevents infinite render loops by using deep equality checks and stable references
 */
export function useInitialCanvasSync(options: UseInitialCanvasSyncOptions) {
  const { initialData, challengeId, enabled = true } = options;

  // Get actions only (stable reference)
  const { updateCanvasData } = useCanvasStore();

  // Track if initial sync has been completed for this challenge
  const syncCompletedRef = useRef<string | null>(null);
  const lastSyncDataRef = useRef<CanvasData | null>(null);
  const syncInProgressRef = useRef<boolean>(false);

  // Memoized deep equality check to prevent unnecessary comparisons
  const isDataEqual = useCallback((data1: CanvasData | null, data2: CanvasData | null): boolean => {
    if (data1 === data2) return true;
    if (!data1 || !data2) return false;

    try {
      // Fast path: check array lengths first
      if (
        data1.components?.length !== data2.components?.length ||
        data1.connections?.length !== data2.connections?.length ||
        data1.infoCards?.length !== data2.infoCards?.length
      ) {
        return false;
      }

      // Deep equality check using JSON comparison (sufficient for our use case)
      return JSON.stringify(data1) === JSON.stringify(data2);
    } catch (error) {
      console.warn('Error in deep equality check:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !initialData || !challengeId || syncInProgressRef.current) {
      return;
    }

    // Check if we've already synced this challenge and the data hasn't changed
    if (
      syncCompletedRef.current === challengeId &&
      isDataEqual(lastSyncDataRef.current, initialData)
    ) {
      return;
    }

    // Use imperative store access to avoid subscriptions
    const currentState = getCanvasState();
    const currentCanvasData = {
      components: currentState.components,
      connections: currentState.connections,
      infoCards: currentState.infoCards,
    };

    if (isDataEqual(currentCanvasData, initialData)) {
      syncCompletedRef.current = challengeId;
      lastSyncDataRef.current = initialData;
      return;
    }

    // Perform the sync with silent option to prevent re-renders
    if (process.env.NODE_ENV === 'development') {
      console.warn('useInitialCanvasSync: Syncing initial data for challenge:', challengeId);
    }

    try {
      syncInProgressRef.current = true;
      updateCanvasData(initialData, { silent: true });
      syncCompletedRef.current = challengeId;
      lastSyncDataRef.current = initialData;
    } catch (error) {
      console.error('Error syncing initial canvas data:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [
    challengeId,
    initialData,
    enabled,
    updateCanvasData,
    isDataEqual,
  ]);

  // Reset sync state when challenge changes
  useEffect(() => {
    if (challengeId && syncCompletedRef.current !== challengeId) {
      syncCompletedRef.current = null;
      lastSyncDataRef.current = null;
    }
  }, [challengeId]);

  return {
    isSynced: syncCompletedRef.current === challengeId,
    lastSyncedChallengeId: syncCompletedRef.current,
  };
}
