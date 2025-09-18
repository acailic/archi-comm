import { useCallback, useRef, useEffect } from 'react';
import { getLogger } from '@/lib/logging/logger';
import { storage } from '@services/storage';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import type { DesignData, AudioData, Challenge } from '@/shared/contracts/index';
import type { AppVariant, FeatureConfig } from '../components/AppContainer';

const logger = getLogger('app-persistence');

interface UseAppPersistenceOptions {
  designData: DesignData | null;
  audioData: AudioData | null;
  selectedChallenge: Challenge | null;
  variant: AppVariant;
  features: FeatureConfig;
  currentScreen: string;
  phase: string;
  isDemoMode: boolean;
}

export function useAppPersistence({
  designData,
  audioData,
  selectedChallenge,
  variant,
  features,
  currentScreen,
  phase,
  isDemoMode,
}: UseAppPersistenceOptions) {
  // Add mount detection to prevent store updates during initial render
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loopDetector = InfiniteLoopDetector.getInstance();

  // Debounced, diff-aware recovery persistence
  const lastSerializedRef = useRef({
    design: '' as string,
    audio: '' as string,
    prefs: '' as string,
    projectId: '' as string,
  });
  const idleCallbackId = useRef<number | null>(null);
  const debounceTimer = useRef<number | null>(null);

  const safeLocalSet = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      try {
        // Fallback to sessionStorage on quota or other failures
        sessionStorage.setItem(key, value);
      } catch (e2) {
        logger.warn('Failed to persist to storage', { key, error: e2 });
      }
    }
  }, []);

  const persistChanged = useCallback(
    async ({ force = false, reason = 'state-change' }: { force?: boolean; reason?: string } = {}) => {
      if (!mountedRef.current) return;

      const allowDesignPersist = force || currentScreen !== 'design-canvas';

      const nextDesign = designData && Object.keys(designData).length > 0 ? JSON.stringify(designData) : '';
      const nextAudio = audioData ? JSON.stringify(audioData) : '';
      const userPreferences = JSON.stringify({ variant, features, currentScreen, phase, isDemoMode });
      const nextProjectId = selectedChallenge?.id ?? '';

      const last = lastSerializedRef.current;

      try {
        if (nextDesign !== last.design) {
          if (allowDesignPersist && nextDesign) {
            safeLocalSet('current_design', nextDesign);
            loopDetector.notePersistence('designData', { reason, forced: force });
          } else if (!allowDesignPersist) {
            RenderLoopDiagnostics.getInstance().recordAutoSaveSuppressed({
              channel: 'designData',
              reason,
              screen: currentScreen,
            });
            loopDetector.markPersistenceSuppressed('designData', reason);
          }
          last.design = nextDesign;
        }

        if (nextAudio !== last.audio) {
          if (nextAudio) {
            try {
              await storage.setItem('current_audio', nextAudio);
              loopDetector.notePersistence('audioData', { reason, forced: force });
            } catch (e: any) {
              try {
                sessionStorage.setItem('current_audio', nextAudio);
              } catch (e2) {
                logger.warn('Failed to persist audio data', e2);
              }
            }
          }
          last.audio = nextAudio;
        }

        if (nextProjectId !== last.projectId) {
          if (nextProjectId) {
            safeLocalSet('current_project_id', nextProjectId);
            loopDetector.notePersistence('projectId', { reason, forced: force });
          }
          last.projectId = nextProjectId;
        }

        if (userPreferences !== last.prefs) {
          safeLocalSet('user_preferences', userPreferences);
          loopDetector.notePersistence('preferences', { reason, forced: force });
          last.prefs = userPreferences;
        }
      } catch (error) {
        logger.warn('Failed to update recovery context', error);
        RenderLoopDiagnostics.getInstance().recordPersistenceFailure({ reason, error: error as Error });
      }
    },
    [
      designData,
      audioData,
      selectedChallenge,
      variant,
      features,
      currentScreen,
      phase,
      isDemoMode,
      safeLocalSet,
      loopDetector,
    ]
  );

  const schedulePersist = useCallback(
    (options?: { force?: boolean; reason?: string }) => {
      if (!mountedRef.current) return;

      if (idleCallbackId.current != null && 'cancelIdleCallback' in window) {
        // @ts-expect-error cancelIdleCallback exists in browsers
        (window as any).cancelIdleCallback(idleCallbackId.current);
        idleCallbackId.current = null;
      }

      if (debounceTimer.current != null) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      if ('requestIdleCallback' in window) {
        // @ts-expect-error requestIdleCallback exists in browsers
        idleCallbackId.current = (window as any).requestIdleCallback(() => {
          persistChanged(options);
          idleCallbackId.current = null;
        }, { timeout: 1000 });
      } else {
        debounceTimer.current = window.setTimeout(() => {
          persistChanged(options);
          debounceTimer.current = null;
        }, 500);
      }
    },
    [persistChanged]
  );

  // Set up recovery context provider to give current app state to recovery system
  const updateRecoveryContext = useCallback(() => {
    schedulePersist({ reason: 'state-change' });
  }, [schedulePersist]);

  useEffect(() => {
    // Update context whenever state changes
    updateRecoveryContext();
  }, [updateRecoveryContext]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void persistChanged({ force: true, reason: 'before-unload' });
    };

    const handleNavigateToConfig = () => {
      void persistChanged({ force: true, reason: 'navigate:config' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('navigate:config', handleNavigateToConfig as EventListener);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('navigate:config', handleNavigateToConfig as EventListener);
    };
  }, [persistChanged]);

  const previousScreenRef = useRef(currentScreen);
  useEffect(() => {
    if (previousScreenRef.current === 'design-canvas' && currentScreen !== 'design-canvas') {
      void persistChanged({ force: true, reason: 'screen-transition' });
    }
    previousScreenRef.current = currentScreen;
  }, [currentScreen, persistChanged]);

  return {
    persistChanged,
    schedulePersist,
  };
}