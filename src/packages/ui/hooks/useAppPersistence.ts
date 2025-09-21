import { useCallback, useRef, useEffect } from 'react';
import { getLogger } from '@/lib/logging/logger';
import { storage } from '@services/storage';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import type { DesignData, AudioData, Challenge } from '@/shared/contracts/index';
import type { AppVariant, VariantFeatures } from '@/shared/hooks/useAppVariant';

const logger = getLogger('app-persistence');

interface UseAppPersistenceOptions {
  designData: DesignData | null;
  audioData: AudioData | null;
  selectedChallenge: Challenge | null;
  variant: AppVariant;
  features: VariantFeatures;
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

  // Store current state in ref to avoid recreation of persistChanged
  const currentStateRef = useRef({
    designData,
    audioData,
    selectedChallenge,
    variant,
    features,
    currentScreen,
    phase,
    isDemoMode,
  });

  // Update ref without triggering re-renders
  currentStateRef.current = {
    designData,
    audioData,
    selectedChallenge,
    variant,
    features,
    currentScreen,
    phase,
    isDemoMode,
  };

  const persistChanged = useCallback(
    async ({ force = false, reason = 'state-change' }: { force?: boolean; reason?: string } = {}) => {
      if (!mountedRef.current) return;

      const state = currentStateRef.current;
      const allowDesignPersist = force || state.currentScreen !== 'design-canvas';

      const nextDesign = state.designData && Object.keys(state.designData).length > 0 ? JSON.stringify(state.designData) : '';
      const nextAudio = state.audioData ? JSON.stringify(state.audioData) : '';
      const userPreferences = JSON.stringify({
        variant: state.variant,
        features: state.features,
        currentScreen: state.currentScreen,
        phase: state.phase,
        isDemoMode: state.isDemoMode
      });
      const nextProjectId = state.selectedChallenge?.id ?? '';

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
              screen: state.currentScreen,
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
    [safeLocalSet, loopDetector] // Only include stable dependencies
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

  // Track significant state changes and trigger persistence
  const prevStateRef = useRef<typeof currentStateRef.current | null>(null);

  useEffect(() => {
    if (!mountedRef.current) return;

    const current = currentStateRef.current;
    const prev = prevStateRef.current;

    if (prev === null) {
      // Initial mount - don't persist yet
      prevStateRef.current = current;
      return;
    }

    // Only persist if significant state actually changed
    const hasSignificantChange = (
      current.designData !== prev.designData ||
      current.audioData !== prev.audioData ||
      current.selectedChallenge?.id !== prev.selectedChallenge?.id ||
      current.variant !== prev.variant ||
      current.currentScreen !== prev.currentScreen ||
      current.phase !== prev.phase ||
      current.isDemoMode !== prev.isDemoMode
    );

    if (hasSignificantChange) {
      schedulePersist({ reason: 'state-change' });
    }

    prevStateRef.current = current;
  });

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
