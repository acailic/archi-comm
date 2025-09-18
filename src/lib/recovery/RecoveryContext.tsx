// src/lib/recovery/RecoveryContext.tsx
// React context and provider for recovery system integration
// Provides recovery state management and UI integration for the error recovery system
// RELEVANT FILES: src/lib/recovery/ErrorRecoverySystem.ts, src/lib/logging/errorStore.ts

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppError } from '../errorStore';
import { logger } from '@lib/logging/logger';
import { ErrorRecoverySystem, RecoveryResult, RecoveryProgress } from './ErrorRecoverySystem';

// Recovery attempt history item
export interface RecoveryAttempt {
  timestamp: number;
  error: AppError;
  strategy: string;
  result: RecoveryResult;
  duration: number;
}

// Recovery context type definition
export interface RecoveryContextType {
  isRecovering: boolean;
  recoveryProgress: RecoveryProgress | null;
  lastRecoveryResult: RecoveryResult | null;
  showRecoveryUI: boolean;
  triggerRecovery: (error: AppError) => Promise<void>;
  dismissRecovery: () => void;
  getRecoveryHistory: () => RecoveryAttempt[];
  cancelRecovery: () => void;
}

// Create the recovery context
const RecoveryContext = createContext<RecoveryContextType | null>(null);

// Recovery provider props
interface RecoveryProviderProps {
  children: ReactNode;
}

// Recovery provider component
export function RecoveryProvider({ children }: RecoveryProviderProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState<RecoveryProgress | null>(null);
  const [lastRecoveryResult, setLastRecoveryResult] = useState<RecoveryResult | null>(null);
  const [showRecoveryUI, setShowRecoveryUI] = useState(false);
  const [recoverySystem] = useState(() => ErrorRecoverySystem.getInstance());

  // Initialize recovery system and event listeners
  useEffect(() => {
    const handleRecoveryStarted = (event: CustomEvent) => {
      const { strategy, error } = event.detail;
      setIsRecovering(true);
      setShowRecoveryUI(true);
      setRecoveryProgress({
        strategy,
        step: 'Initializing',
        progress: 0,
        message: 'Starting recovery process...',
        canCancel: false
      });
      logger.info('Recovery started', { strategy, errorId: error.id });
    };

    const handleStrategyStarted = (event: CustomEvent) => {
      const { strategy, progress } = event.detail;
      setRecoveryProgress(progress);
      logger.info('Recovery strategy started', { strategy });
    };

    const handleRecoveryCompleted = (event: CustomEvent) => {
      const { result, duration } = event.detail;
      setIsRecovering(false);
      setRecoveryProgress(null);
      setLastRecoveryResult(result);

      // Show UI for a few seconds to display result
      setTimeout(() => {
        setShowRecoveryUI(false);
      }, 3000);

      logger.info('Recovery completed', {
        success: result.success,
        strategy: result.strategy,
        duration
      });
    };

    const handleRecoveryFailed = (event: CustomEvent) => {
      const { error, duration } = event.detail;
      setIsRecovering(false);
      setRecoveryProgress(null);
      setLastRecoveryResult({
        success: false,
        strategy: 'system',
        message: 'Recovery system encountered an error'
      });
      setShowRecoveryUI(true);

      logger.error('Recovery system failed', { error, duration });
    };

    // Register event listeners
    recoverySystem.addEventListener('recovery-started', handleRecoveryStarted);
    recoverySystem.addEventListener('strategy-started', handleStrategyStarted);
    recoverySystem.addEventListener('recovery-completed', handleRecoveryCompleted);
    recoverySystem.addEventListener('recovery-failed', handleRecoveryFailed);

    return () => {
      recoverySystem.removeEventListener('recovery-started', handleRecoveryStarted);
      recoverySystem.removeEventListener('strategy-started', handleStrategyStarted);
      recoverySystem.removeEventListener('recovery-completed', handleRecoveryCompleted);
      recoverySystem.removeEventListener('recovery-failed', handleRecoveryFailed);
    };
  }, [recoverySystem]);

  // Trigger recovery manually
  const triggerRecovery = useCallback(async (error: AppError) => {
    try {
      logger.info('Manual recovery triggered', { errorId: error.id });
      await recoverySystem.handleError(error);
    } catch (error) {
      logger.error('Failed to trigger recovery', error);
      setLastRecoveryResult({
        success: false,
        strategy: 'manual',
        message: 'Failed to trigger recovery'
      });
      setShowRecoveryUI(true);
    }
  }, [recoverySystem]);

  // Dismiss recovery UI
  const dismissRecovery = useCallback(() => {
    setShowRecoveryUI(false);
    setLastRecoveryResult(null);
    setRecoveryProgress(null);
    logger.info('Recovery UI dismissed');
  }, []);

  // Cancel ongoing recovery (if possible)
  const cancelRecovery = useCallback(() => {
    if (isRecovering && recoveryProgress?.canCancel) {
      // Implementation would depend on recovery system supporting cancellation
      logger.info('Recovery cancellation requested');
      // For now, just dismiss the UI
      dismissRecovery();
    }
  }, [isRecovering, recoveryProgress, dismissRecovery]);

  // Get recovery history
  const getRecoveryHistory = useCallback(() => {
    return recoverySystem.getRecoveryHistory();
  }, [recoverySystem]);

  // Context value
  const contextValue: RecoveryContextType = {
    isRecovering,
    recoveryProgress,
    lastRecoveryResult,
    showRecoveryUI,
    triggerRecovery,
    dismissRecovery,
    getRecoveryHistory,
    cancelRecovery
  };

  return (
    <RecoveryContext.Provider value={contextValue}>
      {children}
    </RecoveryContext.Provider>
  );
}

// Custom hook to use recovery context
export function useRecovery(): RecoveryContextType {
  const context = useContext(RecoveryContext);

  if (!context) {
    throw new Error('useRecovery must be used within a RecoveryProvider');
  }

  return context;
}

// Hook with safe fallback for optional usage
export function useRecoverySafe(): RecoveryContextType | null {
  return useContext(RecoveryContext);
}

// Helper hook for recovery status
export function useRecoveryStatus() {
  const recovery = useRecovery();

  return {
    isRecovering: recovery.isRecovering,
    hasRecentFailure: recovery.lastRecoveryResult && !recovery.lastRecoveryResult.success,
    canRecover: !recovery.isRecovering,
    lastStrategy: recovery.lastRecoveryResult?.strategy,
    recoveryMessage: recovery.lastRecoveryResult?.message
  };
}

// Helper hook for recovery actions
export function useRecoveryActions() {
  const recovery = useRecovery();

  return {
    triggerRecovery: recovery.triggerRecovery,
    dismissRecovery: recovery.dismissRecovery,
    cancelRecovery: recovery.cancelRecovery,
    getHistory: recovery.getRecoveryHistory
  };
}
