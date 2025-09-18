import React from 'react';
import { RenderLoopDetectedError } from '@/lib/performance/RenderGuard';
import { getLogger } from '@/lib/logger';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import type { DetectorReport } from '@/lib/performance/InfiniteLoopDetector';

const logger = getLogger('app-container');

type RecoveryStage = 'flush' | 'soft-reset' | 'hard-reset';
const RECOVERY_STAGES: RecoveryStage[] = ['flush', 'soft-reset', 'hard-reset'];

interface InfiniteLoopErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorCount: number;
  recoveryStageIndex: number;
  recovering: boolean;
  attemptedStages: RecoveryStage[];
  lastReport: DetectorReport | null;
  syntheticError?: RenderLoopDetectedError;
}

interface InfiniteLoopErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
  onRequestRecovery?: (stage: RecoveryStage) => Promise<void> | void;
}

// Error boundary specifically for infinite render loops with progressive recovery
export class InfiniteLoopErrorBoundary extends React.Component<
  InfiniteLoopErrorBoundaryProps,
  InfiniteLoopErrorBoundaryState
> {
  state: InfiniteLoopErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    errorCount: 0,
    recoveryStageIndex: 0,
    recovering: false,
    attemptedStages: [],
    lastReport: null,
    syntheticError: undefined,
  };

  private isUnmounted = false;

  static getDerivedStateFromError(error: Error): Partial<InfiniteLoopErrorBoundaryState> {
    const isRenderLoop =
      error instanceof RenderLoopDetectedError ||
      /Maximum render limit exceeded|infinite loop|render limit/i.test(error.message);

    if (!isRenderLoop) {
      throw error;
    }

    return {
      hasError: true,
      errorMessage: error.message,
      syntheticError: error instanceof RenderLoopDetectedError ? error : undefined,
      recovering: false,
      recoveryStageIndex: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const detector = InfiniteLoopDetector.getInstance();
    const report = detector.getLatestReport('DesignCanvasCore');

    logger.error('Render loop protection triggered:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      report,
    });

    RenderLoopDiagnostics.getInstance().recordBoundaryCapture('DesignCanvasCore', {
      error,
      errorInfo,
      report,
    });

    this.safeSetState(
      prev => ({
        errorCount: prev.errorCount + 1,
        lastReport: report ?? prev.lastReport,
        attemptedStages: [],
        recoveryStageIndex: 0,
      }),
      () => {
        void this.beginProgressiveRecovery();
      }
    );
  }

  componentWillUnmount() {
    this.isUnmounted = true;
  }

  private safeSetState(
    updater:
      | Partial<InfiniteLoopErrorBoundaryState>
      | ((prev: InfiniteLoopErrorBoundaryState) => Partial<InfiniteLoopErrorBoundaryState>),
    callback?: () => void
  ) {
    if (this.isUnmounted) return;
    this.setState(updater as any, callback);
  }

  private async beginProgressiveRecovery() {
    if (!this.props.onRequestRecovery) {
      return;
    }

    this.safeSetState({ recovering: true });

    for (let index = this.state.recoveryStageIndex; index < RECOVERY_STAGES.length; index += 1) {
      const stage = RECOVERY_STAGES[index];

      RenderLoopDiagnostics.getInstance().recordRecoveryAttempt('DesignCanvasCore', { stage });

      this.safeSetState(prev => ({
        recoveryStageIndex: index,
        attemptedStages: prev.attemptedStages.includes(stage)
          ? prev.attemptedStages
          : [...prev.attemptedStages, stage],
      }));

      try {
        await this.props.onRequestRecovery(stage);
      } catch (error) {
        RenderLoopDiagnostics.getInstance().recordRecoveryFailure('DesignCanvasCore', {
          stage,
          error: error as Error,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 120));

      const detector = InfiniteLoopDetector.getInstance();
      if (!detector.isComponentFlagged('DesignCanvasCore')) {
        detector.acknowledgeRecovery('DesignCanvasCore');
        this.safeSetState({
          hasError: false,
          errorMessage: '',
          recovering: false,
          recoveryStageIndex: 0,
          attemptedStages: [],
          lastReport: detector.getLatestReport('DesignCanvasCore'),
          syntheticError: undefined,
        });
        this.props.onReset();
        return;
      }
    }

    this.safeSetState({ recovering: false, recoveryStageIndex: RECOVERY_STAGES.length });
  }

  private handleRetry = () => {
    if (this.state.recovering) return;
    this.safeSetState({ attemptedStages: [], recoveryStageIndex: 0 }, () => {
      void this.beginProgressiveRecovery();
    });
  };

  private handleResume = () => {
    if (this.state.recovering) return;
    InfiniteLoopDetector.getInstance().acknowledgeRecovery('DesignCanvasCore');
    this.safeSetState({
      hasError: false,
      errorMessage: '',
      recovering: false,
      recoveryStageIndex: 0,
      attemptedStages: [],
      syntheticError: undefined,
    });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { errorMessage, recovering, attemptedStages, syntheticError, lastReport } = this.state;

    const stageDescriptions: Record<RecoveryStage, string> = {
      flush: 'Flush pending design changes',
      'soft-reset': 'Remount the design canvas view',
      'hard-reset': 'Reset application state to defaults',
    };

    return (
      <div className='flex items-center justify-center h-full bg-background'>
        <div className='max-w-xl w-full p-6 text-center space-y-4'>
          <div className='space-y-2'>
            <div className='text-red-500 text-4xl'>⚠️</div>
            <h2 className='text-lg font-semibold'>Render Loop Protection Active</h2>
            <p className='text-sm text-muted-foreground'>{errorMessage}</p>
          </div>

          <div className='text-xs text-left bg-muted/60 rounded-md p-3 space-y-1 font-mono whitespace-pre-wrap'>
            {syntheticError?.meta ? (
              <>
                <div>renderCount: {syntheticError.meta.renderCount}</div>
                <div>sinceFirstRenderMs: {Math.round(syntheticError.meta.sinceFirstRenderMs)}</div>
                <div>sincePreviousRenderMs: {Math.round(syntheticError.meta.sincePreviousRenderMs)}</div>
                {syntheticError.meta.memorySample?.deltaSinceBaseline != null ? (
                  <div>memoryDelta: {syntheticError.meta.memorySample.deltaSinceBaseline}</div>
                ) : null}
              </>
            ) : null}
            {lastReport ? (
              <div>
                detectorSeverity: {lastReport.severity} · recentRenders: {lastReport.metrics.renderCount}
              </div>
            ) : null}
          </div>

          <div className='text-xs text-left text-muted-foreground space-y-1'>
            <p className='font-medium'>Recovery stages</p>
            <ul className='space-y-1'>
              {RECOVERY_STAGES.map(stage => {
                const attempted = attemptedStages.includes(stage);
                return (
                  <li key={stage} className={attempted ? 'text-foreground' : ''}>
                    <span className='font-semibold capitalize'>{stage.replace('-', ' ')}</span>: {stageDescriptions[stage]} {attempted ? '✓ attempted' : '(pending)'}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className='flex flex-col gap-2 sm:flex-row sm:justify-center'>
            <button
              onClick={this.handleRetry}
              disabled={recovering}
              className='px-4 py-2 rounded-md border border-border text-sm hover:bg-muted disabled:opacity-60'
            >
              {recovering ? 'Recovering…' : 'Retry Recovery'}
            </button>
            <button
              onClick={this.handleResume}
              disabled={recovering}
              className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60'
            >
              Resume Editing
            </button>
          </div>

          {recovering ? (
            <p className='text-xs text-muted-foreground'>Attempting {RECOVERY_STAGES[this.state.recoveryStageIndex] ?? 'recovery'}…</p>
          ) : null}
        </div>
      </div>
    );
  }
}