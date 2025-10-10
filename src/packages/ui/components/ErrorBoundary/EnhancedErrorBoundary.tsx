import React, { useCallback, useMemo, useRef } from 'react';

import { ErrorBoundary, type ErrorFallbackProps } from '@/shared/ui/ErrorBoundary';
import { errorStore } from '@/lib/logging/errorStore';
import { useErrorRecovery } from '@/shared/hooks/useErrorRecovery';
import { useLogger } from '@/shared/hooks/useLogger';
import {
  NetworkErrorState,
  FileErrorState,
  ValidationErrorState,
  PermissionErrorState,
  GenericErrorState,
} from '@/packages/ui/components/errors/FriendlyErrorState';

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  boundaryId?: string;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  autoTriggerRecovery?: boolean;
  isolate?: boolean;
}

// Helper to categorize errors based on message/metadata
function categorizeError(error: Error): 'network' | 'file' | 'validation' | 'permission' | 'generic' {
  const message = error.message.toLowerCase();
  const metadata = (error as any).metadata || {};

  // Check error metadata first
  if (metadata.category) {
    return metadata.category;
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('offline') ||
    error.name === 'NetworkError' ||
    error.name === 'FetchError'
  ) {
    return 'network';
  }

  // File errors
  if (
    message.includes('file') ||
    message.includes('parse') ||
    message.includes('invalid json') ||
    message.includes('corrupted') ||
    error.name === 'SyntaxError' ||
    error.name === 'FileError'
  ) {
    return 'file';
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('must be') ||
    error.name === 'ValidationError'
  ) {
    return 'validation';
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('access denied') ||
    error.name === 'PermissionError' ||
    error.name === 'UnauthorizedError'
  ) {
    return 'permission';
  }

  return 'generic';
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
      // Track recovery action
      logger.info('User triggered error recovery', { retryCount, severity });
      resetError();
    }
  }, [canRetry, resetError, logger, retryCount, severity]);

  const handleRecovery = useCallback(() => {
    const recorded = errorStore.getState().lastError;
    if (recorded) {
      logger.info('User triggered full recovery', { errorId: recorded.id });
      void recovery.triggerRecovery(recorded);
    } else {
      logger.warn('No recorded error available for recovery trigger');
    }
  }, [logger, recovery]);

  const handleReport = useCallback(() => {
    logger.info('User reported error', { message: error.message, severity });
    // Dispatch event to report the error
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('error:report', {
          detail: { error, severity, retryCount },
        }),
      );
    }
  }, [error, severity, retryCount, logger]);

  // Categorize error type
  const errorCategory = useMemo(() => categorizeError(error), [error]);

  // Render appropriate error state variant
  switch (errorCategory) {
    case 'network':
      return <NetworkErrorState onRetry={canRetry ? handleRetry : undefined} />;

    case 'file':
      return <FileErrorState onRetry={canRetry ? handleRetry : undefined} />;

    case 'validation':
      return (
        <ValidationErrorState
          errors={[(error as any).metadata?.errors || error.message]}
          onFix={canRetry ? handleRetry : undefined}
        />
      );

    case 'permission':
      return <PermissionErrorState />;

    case 'generic':
    default:
      return (
        <GenericErrorState
          error={error}
          onReload={canRetry ? handleRetry : undefined}
          onReport={handleReport}
        />
      );
  }
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
