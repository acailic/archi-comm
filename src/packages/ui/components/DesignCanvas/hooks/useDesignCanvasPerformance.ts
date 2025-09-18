import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRenderGuard } from '@/lib/performance/RenderGuard';
import type { CircuitBreakerDetails } from '@/lib/performance/RenderGuard';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import { RenderStabilityTracker } from '@/lib/performance/RenderStabilityTracker';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import type { Challenge } from '@/shared/contracts';

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

  const stabilityTracker = React.useMemo(
    () => RenderStabilityTracker.forComponent('DesignCanvasCore'),
    []
  );

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
        flushDesignDataRef.current?.('circuit-breaker', { immediate: true });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('archicomm:design-canvas:flush-request', {
              detail: { reason: details.reason ?? 'circuit-breaker' },
            })
          );
        }
      });
    },
    [flushDesignDataRef, scheduleAfterRender]
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
  });

  // Stability tracking effect
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const report = stabilityTracker.track({
      props: {
        challengeId: challenge.id,
        schemaVersion: initialData.schemaVersion,
        selectedComponent: selectedComponent ?? 'none',
      },
      state: {
        componentsLength: components.length,
        connectionsLength: connections.length,
        infoCardsLength: infoCards.length,
        isSynced,
      },
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
      flushDesignDataRef.current?.('stability-freeze', { immediate: true });
    }
  }, [
    stabilityTracker,
    challenge.id,
    initialData.schemaVersion,
    selectedComponent,
    components.length,
    connections.length,
    infoCards.length,
    isSynced,
    renderGuard.renderCount,
    renderGuard.sincePreviousRenderMs,
    emergencyPauseReason,
  ]);

  // Memory spike monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!renderGuard.memorySample) return;
    const delta = renderGuard.memorySample.deltaSinceBaseline ?? 0;
    if (Math.abs(delta) > 5_000_000) {
      RenderLoopDiagnostics.getInstance().recordMemorySpike('DesignCanvasCore', {
        delta,
        sample: renderGuard.memorySample,
      });
    }
  }, [renderGuard.memorySample]);

  // Infinite loop detection
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const detector = InfiniteLoopDetector.getInstance();
    const latest = detector.getLatestReport('DesignCanvasCore');
    if (!latest) return;

    if (lastHandledDetectorReportRef.current === latest.id) {
      return;
    }

    if (latest.severity === 'critical') {
      lastHandledDetectorReportRef.current = latest.id;
      if (!emergencyPauseReason) {
        setEmergencyPauseReason(latest.reason ?? 'loop-detector');
      }
      flushDesignDataRef.current?.('detector-critical', { immediate: true });
    }
  }, [renderGuard.renderCount, emergencyPauseReason]);

  const handleResumeAfterPause = useCallback(() => {
    renderGuard.reset();
    setEmergencyPauseReason(null);
    setCircuitBreakerDetails(null);
    flushDesignDataRef.current?.('manual-resume', { immediate: true });
    InfiniteLoopDetector.getInstance().acknowledgeRecovery('DesignCanvasCore');
    RenderLoopDiagnostics.getInstance().recordResume('DesignCanvasCore');
  }, [renderGuard]);

  return {
    renderGuard,
    emergencyPauseReason,
    setEmergencyPauseReason,
    circuitBreakerDetails,
    handleResumeAfterPause,
  };
}
