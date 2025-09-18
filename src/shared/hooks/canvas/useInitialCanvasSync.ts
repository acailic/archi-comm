// src/shared/hooks/canvas/useInitialCanvasSync.ts
// Custom hook to handle initial data synchronization without causing infinite render loops
// Prevents circular dependencies between DesignCanvas and canvas store
// RELEVANT FILES: src/stores/canvasStore.ts, src/components/DesignCanvas.tsx, src/shared/hooks/common/useStableCallbacks.ts

import { useCallback, useEffect, useRef } from 'react';
import type { Connection, DesignComponent, InfoCard } from '@shared/contracts';
import { useCanvasActions, getCanvasState } from '@/stores/canvasStore';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';

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

const hashCache = new WeakMap<object, string>();

const computeStableHash = (value: unknown, visited = new WeakSet<object>()): string => {
  if (value == null) return String(value);
  const valueType = typeof value;
  if (valueType === 'number' || valueType === 'boolean' || valueType === 'bigint') {
    return `${valueType}:${value}`;
  }
  if (valueType === 'string') {
    return `string:${value}`;
  }
  if (value instanceof Date) {
    return `date:${value.getTime()}`;
  }
  if (Array.isArray(value)) {
    if (visited.has(value)) {
      return 'array:circular';
    }
    visited.add(value);
    const hashed = `array:[${value.map(item => computeStableHash(item, visited)).join('|')}]`;
    visited.delete(value);
    return hashed;
  }
  if (valueType === 'object') {
    const obj = value as Record<string, unknown>;
    if (visited.has(obj)) {
      return 'object:circular';
    }
    visited.add(obj);
    const cached = hashCache.get(obj);
    if (cached) {
      visited.delete(obj);
      return cached;
    }
    const keys = Object.keys(obj).sort();
    const hashed = `object:{${keys.map(key => `${key}:${computeStableHash(obj[key], visited)}`).join('|')}}`;
    hashCache.set(obj, hashed);
    visited.delete(obj);
    return hashed;
  }
  if (valueType === 'function') {
    return `function:${(value as (...args: unknown[]) => unknown).name || 'anonymous'}`;
  }
  return `${valueType}:${String(value)}`;
};

const validateCanvasDataShape = (data: CanvasData, challengeId: string): boolean => {
  const stack: Array<{ value: unknown; path: string }> = [{ value: data, path: '$' }];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const { value, path } = current;

    if (!value || typeof value !== 'object') {
      continue;
    }

    const objectValue = value as Record<string, unknown>;
    if (seen.has(objectValue)) {
      RenderLoopDiagnostics.getInstance().recordInitialSync({
        challengeId,
        status: 'circular-warning',
        path,
      });
      return false;
    }
    seen.add(objectValue);

    for (const key of Object.keys(objectValue)) {
      stack.push({ value: objectValue[key], path: `${path}.${key}` });
    }
  }

  return true;
};

/**
 * Hook to synchronize initial canvas data with the store
 * Prevents infinite render loops by using deep equality checks and stable references
 */
export function useInitialCanvasSync(options: UseInitialCanvasSyncOptions) {
  const { initialData, challengeId, enabled = true } = options;

  // Get actions only (stable reference) - no subscription to state
  const { updateCanvasData } = useCanvasActions();

  // Track if initial sync has been completed for this challenge
  const syncCompletedRef = useRef<string | null>(null);
  const lastSyncDataRef = useRef<CanvasData | null>(null);
  const syncInProgressRef = useRef<boolean>(false);
  const syncLockRef = useRef<boolean>(false);
  const syncAttemptsRef = useRef(0);
  const loopDetectorRef = useRef(InfiniteLoopDetector.getInstance());
  const lastSerializedHashRef = useRef<string | null>(null);

  const stableHashData = useCallback((data: CanvasData | null) => {
    if (!data) return '';
    return computeStableHash(data);
  }, []);

  const isDataEqual = useCallback(
    (data1: CanvasData | null, data2: CanvasData | null): boolean => {
      if (data1 === data2) return true;
      if (!data1 || !data2) return false;

      if (
        data1.components?.length !== data2.components?.length ||
        data1.connections?.length !== data2.connections?.length ||
        data1.infoCards?.length !== data2.infoCards?.length
      ) {
        return false;
      }

      return stableHashData(data1) === stableHashData(data2);
    },
    [stableHashData]
  );

  useEffect(() => {
    if (!enabled || !initialData || !challengeId) {
      return;
    }

    if (syncInProgressRef.current || syncLockRef.current) {
      return;
    }

    if (!validateCanvasDataShape(initialData, challengeId)) {
      return;
    }

    const serializedHash = stableHashData(initialData);

    if (
      syncCompletedRef.current === challengeId &&
      lastSerializedHashRef.current === serializedHash &&
      isDataEqual(lastSyncDataRef.current, initialData)
    ) {
      return;
    }

    const currentState = getCanvasState();
    const currentCanvasData = {
      components: currentState.components,
      connections: currentState.connections,
      infoCards: currentState.infoCards,
    };

    if (isDataEqual(currentCanvasData, initialData)) {
      syncCompletedRef.current = challengeId;
      lastSyncDataRef.current = initialData;
      lastSerializedHashRef.current = serializedHash;
      return;
    }

    syncLockRef.current = true;
    syncAttemptsRef.current += 1;

    const detector = loopDetectorRef.current;
    const attempt = syncAttemptsRef.current;

    RenderLoopDiagnostics.getInstance().recordInitialSync({
      challengeId,
      attempt,
      status: 'started',
    });
    detector.noteInitialSyncStart(challengeId, attempt);

    const timeout = setTimeout(() => {
      RenderLoopDiagnostics.getInstance().recordInitialSync({
        challengeId,
        attempt,
        status: 'timeout',
      });
      detector.noteInitialSyncTimeout(challengeId);
      syncLockRef.current = false;
    }, 2000);

    const performSync = async () => {
      try {
        syncInProgressRef.current = true;
        await updateCanvasData(initialData, { silent: true });
        syncCompletedRef.current = challengeId;
        lastSyncDataRef.current = initialData;
        lastSerializedHashRef.current = serializedHash;
        RenderLoopDiagnostics.getInstance().recordInitialSync({
          challengeId,
          attempt,
          status: 'success',
        });
        detector.noteInitialSyncSuccess(challengeId);
      } catch (error) {
        RenderLoopDiagnostics.getInstance().recordInitialSync({
          challengeId,
          attempt,
          status: 'failed',
          error: error as Error,
        });
        detector.noteInitialSyncFailure(challengeId, error as Error);
      } finally {
        clearTimeout(timeout);
        syncInProgressRef.current = false;
        syncLockRef.current = false;
      }
    };

    void performSync();

    return () => {
      clearTimeout(timeout);
      syncLockRef.current = false;
    };
  }, [
    challengeId,
    initialData,
    enabled,
    updateCanvasData,
    isDataEqual,
    stableHashData,
  ]);

  // Reset sync state when challenge changes
  useEffect(() => {
    if (challengeId && syncCompletedRef.current !== challengeId) {
      syncCompletedRef.current = null;
      lastSyncDataRef.current = null;
      lastSerializedHashRef.current = null;
      syncAttemptsRef.current = 0;
    }
  }, [challengeId]);

  return {
    isSynced: syncCompletedRef.current === challengeId,
    lastSyncedChallengeId: syncCompletedRef.current,
  };
}
