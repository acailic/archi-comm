import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';

import { useRenderGuard } from '@/lib/performance/RenderGuard';
import { getDebugFlags, getPerformanceBudgets } from '@/lib/config/performance-config';
import type { Challenge } from '@/shared/contracts';
import { getCanvasCircuitBreakerSnapshot, subscribeToCanvasCircuitBreaker } from '@/stores/canvasStore';

interface UseDesignCanvasPerformanceProps {
  challenge: Challenge;
  components: unknown[];
  connections: unknown[];
  infoCards: unknown[];
  selectedComponent: string | null;
  isSynced: boolean;
  flushDesignDataRef: MutableRefObject<
    ((reason: string, options?: { immediate?: boolean }) => void) | undefined
  >;
}

export interface RenderGuardPauseMetadata {
  renderCount: number;
  resetAt: number | null;
}

export interface PerformanceBudgetStatus {
  rendersPerMinute: number;
  overBudget: boolean;
  limit: number;
}

export function useDesignCanvasPerformance({
  challenge,
  components,
  connections,
  infoCards,
  selectedComponent,
  isSynced,
  flushDesignDataRef,
}: UseDesignCanvasPerformanceProps) {
  const performanceBudgets = useMemo(() => getPerformanceBudgets(), []);
  const debugFlags = getDebugFlags();

  const renderGuard = useRenderGuard('DesignCanvasCore', {
    componentId: challenge.id,
    context: debugFlags.enableRenderLogging
      ? () => ({
          components: components.length,
          connections: connections.length,
          infoCards: infoCards.length,
          selectedComponent,
          isSynced,
        })
      : undefined,
  });

  const { shouldPause, renderCount, circuitBreakerResetAt, reset } = renderGuard;

  const storeRateSnapshot = useSyncExternalStore(
    subscribeToCanvasCircuitBreaker,
    getCanvasCircuitBreakerSnapshot,
    getCanvasCircuitBreakerSnapshot
  );

  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<PerformanceBudgetStatus>({
    rendersPerMinute: 0,
    overBudget: false,
    limit: performanceBudgets.maxRendersPerMinute,
  });

  const renderTimestampsRef = useRef<number[]>([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!shouldPause) {
      pausedRef.current = false;
      setPauseReason(null);
      return;
    }

    if (!pausedRef.current) {
      flushDesignDataRef.current?.('render-guard-pause', { immediate: true });
    }

    pausedRef.current = true;
    setPauseReason('Rendering paused temporarily to preserve canvas stability.');
  }, [shouldPause, flushDesignDataRef]);

  useEffect(() => {
    const now = Date.now();
    const timestamps = renderTimestampsRef.current;
    timestamps.push(now);
    while (timestamps.length > 0 && now - timestamps[0] > 60_000) {
      timestamps.shift();
    }

    const rendersPerMinute = timestamps.length;
    const overBudget = rendersPerMinute > performanceBudgets.maxRendersPerMinute;
    setBudgetStatus({
      rendersPerMinute,
      overBudget,
      limit: performanceBudgets.maxRendersPerMinute,
    });

    if (overBudget && debugFlags.enableRenderLogging) {
      console.warn('[DesignCanvasCore] Render budget exceeded', {
        rendersPerMinute,
        maxRendersPerMinute: performanceBudgets.maxRendersPerMinute,
        components: components.length,
        connections: connections.length,
        infoCards: infoCards.length,
        selectedComponent,
        isSynced,
      });
    }
  }, [
    renderCount,
    performanceBudgets.maxRendersPerMinute,
    debugFlags.enableRenderLogging,
    components.length,
    connections.length,
    infoCards.length,
    selectedComponent,
    isSynced,
  ]);

  const pauseMetadata: RenderGuardPauseMetadata | null = useMemo(() => {
    if (!shouldPause) {
      return null;
    }
    return {
      renderCount,
      resetAt: circuitBreakerResetAt,
    };
  }, [shouldPause, renderCount, circuitBreakerResetAt]);

  const handleResumeAfterPause = useCallback(() => {
    reset();
    flushDesignDataRef.current?.('manual-resume', { immediate: true });
  }, [reset, flushDesignDataRef]);

  return {
    renderGuard,
    emergencyPauseReason: pauseReason,
    pauseMetadata,
    handleResumeAfterPause,
    storeCircuitBreakerSnapshot: storeRateSnapshot,
    budgetStatus,
  };
}
