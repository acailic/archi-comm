import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore, useMemo } from 'react';
import { useRenderGuard } from '@/lib/performance/RenderGuard';
import type { CircuitBreakerDetails } from '@/lib/performance/RenderGuard';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import { RenderStabilityTracker } from '@/lib/performance/RenderStabilityTracker';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import type { Challenge } from '@/shared/contracts';
import {
  subscribeToCanvasCircuitBreaker,
  getCanvasCircuitBreakerSnapshot,
} from '@/stores/canvasStore';
import type { StoreCircuitBreakerSnapshot } from '@/lib/performance/StoreCircuitBreaker';

interface UseDesignCanvasPerformanceProps {
  challenge: Challenge;
  components: any[];
  connections: any[];
  infoCards: any[];
  selectedComponent: string | null;
  isSynced: boolean;
  initialData: any;
  flushDesignDataRef: React.MutableRefObject<((reason: string, options?: { immediate?: boolean }) => void) | undefined>;
}

export function useDesignCanvasPerformance({
  challenge,
  components,
  connections,
  infoCards,
  selectedComponent,
  isSynced,
  initialData,
  flushDesignDataRef,
}: UseDesignCanvasPerformanceProps) {
  const [circuitBreakerDetails, setCircuitBreakerDetails] = useState<CircuitBreakerDetails | null>(null);
  const [emergencyPauseReason, setEmergencyPauseReason] = useState<string | null>(null);
  const lastHandledDetectorReportRef = useRef<string | null>(null);
  const lastStabilityCheckRef = useRef<number>(0);
  const lastMemoryCheckRef = useRef<number>(0);

  const storeCircuitBreakerSnapshot: StoreCircuitBreakerSnapshot = useSyncExternalStore(
    subscribeToCanvasCircuitBreaker,
    getCanvasCircuitBreakerSnapshot,
    getCanvasCircuitBreakerSnapshot
  );

  const stabilityTracker = React.useMemo(
    () => RenderStabilityTracker.forComponent('DesignCanvasCore'),
    []
  );

  // Memoize stable values to prevent unnecessary re-renders
  const stableProps = useMemo(() => ({
    challengeId: challenge.id,
    schemaVersion: initialData.schemaVersion,
    selectedComponent: selectedComponent ?? 'none',
  }), [challenge.id, initialData.schemaVersion, selectedComponent]);

  const stableState = useMemo(() => ({
    componentsLength: components.length,
    connectionsLength: connections.length,
    infoCardsLength: infoCards.length,
    isSynced,
  }), [components.length, connections.length, infoCards.length, isSynced]);

  // Stable flush function to prevent dependency chain issues
  const stableFlushFunction = useCallback((reason: string, options?: { immediate?: boolean }) => {
    flushDesignDataRef.current?.(reason, options);
  }, []);

  const isMountedRef = useRef(true);
  const circuitBreakerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAfterRender = useCallback((task: () => void): ReturnType<typeof setTimeout> => {
    return setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      task();
    }, 0);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (circuitBreakerTimeoutRef.current != null) {
        clearTimeout(circuitBreakerTimeoutRef.current);
        circuitBreakerTimeoutRef.current = null;
      }
    };
  }, []);

  const handleCircuitBreakerOpen = useCallback(
    (details: CircuitBreakerDetails) => {
      if (circuitBreakerTimeoutRef.current != null) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }

      circuitBreakerTimeoutRef.current = scheduleAfterRender(() => {
        circuitBreakerTimeoutRef.current = null;
        if (!isMountedRef.current) {
          return;
        }

        setCircuitBreakerDetails(details);
        setEmergencyPauseReason(details.reason);
        stableFlushFunction('circuit-breaker', { immediate: true });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('archicomm:design-canvas:flush-request', {
              detail: { reason: details.reason ?? 'circuit-breaker' },
            })
          );
        }
      });
    },
    [stableFlushFunction, scheduleAfterRender]
  );

  const handleCircuitBreakerClose = useCallback(() => {
    if (circuitBreakerTimeoutRef.current != null) {
      clearTimeout(circuitBreakerTimeoutRef.current);
    }

    circuitBreakerTimeoutRef.current = scheduleAfterRender(() => {
      circuitBreakerTimeoutRef.current = null;
      if (!isMountedRef.current) {
        return;
      }

      setCircuitBreakerDetails(null);
      setEmergencyPauseReason(null);
    });
  }, [scheduleAfterRender]);

  const renderGuard = useRenderGuard('DesignCanvasCore', {
    warningThreshold: 25,
    errorThreshold: 45,
    circuitBreakerCooldownMs: 4000,
    componentId: challenge.id,
    customErrorMessage:
      'DesignCanvas detected a destabilising render cascade. Safeguards engaged to prevent data loss.',
    context: () => ({
      componentsLength: components.length,
      connectionsLength: connections.length,
      selectedComponent,
      challengeId: challenge.id,
      isSynced,
      storeBreakerOpen: storeCircuitBreakerSnapshot.open,
      storeUpdatesInWindow: storeCircuitBreakerSnapshot.updatesInWindow,
    }),
    propsSnapshot: () => ({
      challengeId: challenge.id,
      initialComponentCount: initialData.components?.length ?? 0,
      initialConnectionCount: initialData.connections?.length ?? 0,
      schemaVersion: initialData.schemaVersion,
    }),
    stateSnapshot: () => ({
      componentsLength: components.length,
      connectionsLength: connections.length,
      infoCardsLength: infoCards.length,
      selectedComponent,
      isSynced,
    }),
    onCircuitBreakerOpen: handleCircuitBreakerOpen,
    onCircuitBreakerClose: handleCircuitBreakerClose,
    linkedStoreBreaker: {
      getSnapshot: () => storeCircuitBreakerSnapshot,
      label: 'CanvasStore',
    },
    pauseWhenStoreBreakerActive: true,
  });

  // Stability tracking effect - now throttled to prevent excessive re-renders
  useEffect(() => {
    if (import.meta.env.PROD) return;

    // Throttle stability checks to prevent render loops
    const now = Date.now();
    if (now - lastStabilityCheckRef.current < 100) {
      return;
    }
    lastStabilityCheckRef.current = now;

    const report = stabilityTracker.track({
      props: stableProps,
      state: stableState,
      metrics: {
        renderCount: renderGuard.renderCount,
        sincePreviousRenderMs: renderGuard.sincePreviousRenderMs,
      },
    });

    if (report.warnings.length > 0) {
      console.warn('[DesignCanvasCore] Render stability warnings detected', report);
      RenderLoopDiagnostics.getInstance().recordStabilityWarning('DesignCanvasCore', report);
    }

    if (report.shouldFreeze && !emergencyPauseReason) {
      setEmergencyPauseReason(report.freezeReason ?? 'stability-tracker');
      stableFlushFunction('stability-freeze', { immediate: true });
    }
  }, [
    stabilityTracker,
    stableProps,
    stableState,
    renderGuard.renderCount,
    renderGuard.sincePreviousRenderMs,
    emergencyPauseReason,
    stableFlushFunction,
  ]);

  // Memory spike monitoring - throttled to prevent excessive checks
  useEffect(() => {
    if (import.meta.env.PROD) return;
    if (!renderGuard.memorySample) return;

    // Throttle memory checks to prevent render loops
    const now = Date.now();
    if (now - lastMemoryCheckRef.current < 500) {
      return;
    }
    lastMemoryCheckRef.current = now;

    const delta = renderGuard.memorySample.deltaSinceBaseline ?? 0;
    if (Math.abs(delta) > 5_000_000) {
      RenderLoopDiagnostics.getInstance().recordMemorySpike('DesignCanvasCore', {
        delta,
        sample: renderGuard.memorySample,
      });
    }
  }, [renderGuard.memorySample]);

  // Infinite loop detection with safe state updates
  useEffect(() => {
    if (import.meta.env.PROD) return;
    if (!isMountedRef.current) return;

    const detector = InfiniteLoopDetector.getInstance();
    const latest = detector.getLatestReport('DesignCanvasCore');
    if (!latest) return;

    if (lastHandledDetectorReportRef.current === latest.id) {
      return;
    }

    if (latest.severity === 'critical') {
      lastHandledDetectorReportRef.current = latest.id;
      if (!emergencyPauseReason && isMountedRef.current) {
        setEmergencyPauseReason(latest.reason ?? 'loop-detector');
        stableFlushFunction('detector-critical', { immediate: true });
      }
    }
  }, [renderGuard.renderCount, emergencyPauseReason, stableFlushFunction]);

  const handleResumeAfterPause = useCallback(() => {
    if (!isMountedRef.current) return;

    renderGuard.reset();
    setEmergencyPauseReason(null);
    setCircuitBreakerDetails(null);
    stableFlushFunction('manual-resume', { immediate: true });
    InfiniteLoopDetector.getInstance().acknowledgeRecovery('DesignCanvasCore');
    RenderLoopDiagnostics.getInstance().recordResume('DesignCanvasCore');
  }, [renderGuard, stableFlushFunction]);

  // Memoize store snapshot values to prevent excessive re-renders
  const storeSnapshot = useMemo(() => ({
    name: storeCircuitBreakerSnapshot.name,
    open: storeCircuitBreakerSnapshot.open,
    reason: storeCircuitBreakerSnapshot.reason ?? 'store-circuit-breaker',
    openUntil: storeCircuitBreakerSnapshot.openUntil ?? Date.now(),
    updatesInWindow: storeCircuitBreakerSnapshot.updatesInWindow,
  }), [
    storeCircuitBreakerSnapshot.name,
    storeCircuitBreakerSnapshot.open,
    storeCircuitBreakerSnapshot.reason,
    storeCircuitBreakerSnapshot.openUntil,
    storeCircuitBreakerSnapshot.updatesInWindow,
  ]);

  // Store circuit breaker integration with safety checks
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (!storeSnapshot.open) {
      if (circuitBreakerDetails?.component === storeSnapshot.name) {
        if (emergencyPauseReason === circuitBreakerDetails.reason) {
          setEmergencyPauseReason(null);
        }
        setCircuitBreakerDetails(null);
      }
      return;
    }

    setEmergencyPauseReason(prev => prev ?? storeSnapshot.reason);
    setCircuitBreakerDetails({
      component: storeSnapshot.name,
      until: storeSnapshot.openUntil,
      reason: storeSnapshot.reason,
      renderCount: storeSnapshot.updatesInWindow,
    });
  }, [
    storeSnapshot,
    circuitBreakerDetails?.component,
    circuitBreakerDetails?.reason,
    emergencyPauseReason,
  ]);

  return {
    renderGuard,
    emergencyPauseReason,
    setEmergencyPauseReason,
    circuitBreakerDetails,
    handleResumeAfterPause,
    storeCircuitBreakerSnapshot,
  };
}
