import { useCallback } from 'react';
import { useAppStore } from '@hooks/useAppStore';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';

type RecoveryStage = 'flush' | 'soft-reset' | 'hard-reset';

interface UseInfiniteLoopRecoveryOptions {
  persistChanged: (options?: { force?: boolean; reason?: string }) => Promise<void>;
}

export function useInfiniteLoopRecovery({ persistChanged }: UseInfiniteLoopRecoveryOptions) {
  const { actions } = useAppStore();
  const loopDetector = InfiniteLoopDetector.getInstance();

  // Handle infinite loop recovery by resetting sync state
  const handleInfiniteLoopReset = useCallback(() => {
    // Trigger global component reset event to remount DesignCanvas
    window.dispatchEvent(new CustomEvent('archicomm:component-reset'));
  }, []);

  const requestRecovery = useCallback(
    async (stage: RecoveryStage) => {
      RenderLoopDiagnostics.getInstance().recordRecoveryStrategy('DesignCanvasCore', { stage });

      switch (stage) {
        case 'flush': {
          window.dispatchEvent(
            new CustomEvent('archicomm:design-canvas:flush-request', {
              detail: { reason: 'boundary-recovery' },
            })
          );
          await persistChanged({ force: true, reason: 'recovery-flush' });
          break;
        }
        case 'soft-reset': {
          handleInfiniteLoopReset();
          await new Promise(resolve => setTimeout(resolve, 150));
          break;
        }
        case 'hard-reset': {
          actions.resetToInitial();
          handleInfiniteLoopReset();
          await persistChanged({ force: true, reason: 'recovery-hard-reset' });
          break;
        }
        default:
          break;
      }

      loopDetector.recordRecovery(stage);
    },
    [actions, handleInfiniteLoopReset, persistChanged, loopDetector]
  );

  return {
    handleInfiniteLoopReset,
    requestRecovery,
  };
}