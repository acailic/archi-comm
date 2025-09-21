import { useRecovery } from '@/lib/recovery/RecoveryContext';

export function useErrorRecovery() {
  const recovery = useRecovery();

  return {
    isRecovering: recovery.isRecovering,
    recoveryProgress: recovery.recoveryProgress,
    lastRecoveryResult: recovery.lastRecoveryResult,
    showRecoveryUI: recovery.showRecoveryUI,
    triggerRecovery: recovery.triggerRecovery,
    dismissRecovery: recovery.dismissRecovery,
    getRecoveryHistory: recovery.getRecoveryHistory,
    cancelRecovery: recovery.cancelRecovery,
  };
}
