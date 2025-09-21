import React, { useCallback, useMemo, useRef } from 'react';

import { ErrorBoundary, type ErrorFallbackProps } from '@/shared/ui/ErrorBoundary';
import { errorStore } from '@/lib/logging/errorStore';
import { useErrorRecovery } from '@/shared/hooks/useErrorRecovery';
import { useLogger } from '@/shared/hooks/useLogger';

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  boundaryId?: string;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  autoTriggerRecovery?: boolean;
  isolate?: boolean;
}

const RecoveryFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  severity,
  canRetry,
  retryCount,
}) => {
  const recovery = useErrorRecovery();
  const logger = useLogger('EnhancedErrorBoundaryFallback');

  const handleRetry = useCallback(() => {
    if (canRetry) {
      resetError();
    }
  }, [canRetry, resetError]);

  const handleRecovery = useCallback(() => {
    const recorded = errorStore.getState().lastError;
    if (recorded) {
      void recovery.triggerRecovery(recorded);
    } else {
      logger.warn('No recorded error available for recovery trigger');
    }
  }, [logger, recovery]);

  const showRecovery = severity === 'high' || severity === 'critical';
  const isRecovering = recovery.isRecovering;
  const progress = recovery.recoveryProgress;

  return (
    <div className='flex flex-col gap-4 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive-foreground'>
      <div>
        <h2 className='text-lg font-semibold text-destructive'>Something went wrong</h2>
        <p className='mt-2 text-muted-foreground'>{error.message}</p>
      </div>

      {progress && (
        <div className='rounded-md border border-destructive/30 bg-background/70 p-3'>
          <div className='text-xs font-medium text-destructive'>Recovery in progress…</div>
          <div className='mt-1 flex items-center justify-between text-xs'>
            <span>{progress.step}</span>
            <span>{progress.progress}%</span>
          </div>
          <div className='mt-2 h-1 w-full overflow-hidden rounded-full bg-destructive/20'>
            <div
              className='h-full bg-destructive'
              style={{ width: `${progress.progress}%`, transition: 'width 120ms ease-out' }}
            />
          </div>
        </div>
      )}

      <div className='flex flex-wrap items-center gap-2'>
        {canRetry && (
          <button
            type='button'
            className='rounded bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90'
            onClick={handleRetry}
          >
            Retry
          </button>
        )}

        {showRecovery && (
          <button
            type='button'
            className='rounded border border-destructive px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50'
            onClick={handleRecovery}
            disabled={isRecovering}
          >
            {isRecovering ? 'Recovering…' : 'Run Recovery'}
          </button>
        )}

        <button
          type='button'
          className='rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted'
          onClick={() => recovery.dismissRecovery()}
        >
          Dismiss
        </button>
      </div>

      <div className='rounded-md bg-muted/40 p-3 text-xs text-muted-foreground'>
        <div>Retry attempts: {retryCount}</div>
        <div className='mt-1'>Severity: {severity}</div>
      </div>
    </div>
  );
};

export const EnhancedErrorBoundary: React.FC<EnhancedErrorBoundaryProps> = ({
  children,
  boundaryId,
  fallback,
  autoTriggerRecovery = true,
  isolate,
}) => {
  const recovery = useErrorRecovery();
  const logger = useLogger(boundaryId ? `EnhancedErrorBoundary:${boundaryId}` : 'EnhancedErrorBoundary');
  const lastTriggeredRef = useRef<string | null>(null);

  const handleError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      logger.error('Error captured by boundary', error, {
        boundaryId,
        stack: errorInfo.componentStack,
      });
      const recorded = errorStore.getState().lastError;
      if (recorded && autoTriggerRecovery && (recorded.severity === 'high' || recorded.severity === 'critical')) {
        if (recorded.id !== lastTriggeredRef.current) {
          lastTriggeredRef.current = recorded.id;
          void recovery.triggerRecovery(recorded);
        }
      } else if (!recorded) {
        logger.warn('EnhancedErrorBoundary could not locate recorded error for recovery trigger', {
          message: error.message,
          stack: errorInfo.componentStack,
        });
      }
    },
    [autoTriggerRecovery, recovery, logger]
  );

  const FallbackComponent = useMemo(() => fallback ?? RecoveryFallback, [fallback]);

  return (
    <ErrorBoundary fallback={FallbackComponent} onError={handleError} isolate={isolate}>
      {children}
    </ErrorBoundary>
  );
};
