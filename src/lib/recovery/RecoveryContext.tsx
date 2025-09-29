// src/lib/recovery/RecoveryContext.tsx
// React context and provider for recovery system integration
// Provides recovery state management and UI integration for the error recovery system
// RELEVANT FILES: src/lib/recovery/ErrorRecoverySystem.ts, src/lib/logging/errorStore.ts

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppError } from '../errorStore';
import { logger } from '@lib/logging/logger';
import {
  ErrorRecoverySystem,
  RecoveryResult,
  RecoveryProgress,
  RecoveryAttempt,
} from './ErrorRecoverySystem';

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
    const unsubscribe = recoverySystem.subscribe(event => {
      switch (event.type) {
        case 'started':
          setIsRecovering(true);
          setShowRecoveryUI(true);
          setRecoveryProgress({
            strategy: event.strategy,
            step: 'Initializing',
            progress: 0,
            message: 'Starting recovery process...',
            canCancel: false,
          });
          logger.info('Recovery started', { strategy: event.strategy, errorId: event.error.id });
          break;
        case 'progress':
          setRecoveryProgress(event.progress);
          logger.info('Recovery progress', {
            strategy: event.progress.strategy,
            message: event.progress.message,
          });
          break;
        case 'completed':
          setIsRecovering(false);
          setRecoveryProgress(null);
          setLastRecoveryResult(event.result);
          logger.info('Recovery completed', {
            success: event.result.success,
            strategy: event.result.strategy,
            duration: event.duration,
          });
          setTimeout(() => setShowRecoveryUI(false), 3000);
          break;
        case 'failed':
          setIsRecovering(false);
          setRecoveryProgress(null);
          setLastRecoveryResult({
            success: false,
            strategy: 'system',
            message: 'Recovery system encountered an error',
            nextAction: 'reset',
            requiresUserAction: true,
          });
          setShowRecoveryUI(true);
          logger.error('Recovery system failed', { error: event.error, duration: event.duration });
          break;
        default:
          break;
      }
    });

    return unsubscribe;
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
