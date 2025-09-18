import { useCallback } from 'react';
import { isDevelopment } from '@/lib/environment';
import type { AppStoreActions } from '@/stores/AppStore';

interface UseDevTogglesProps {
  actions: AppStoreActions;
  showDevScenarios: boolean;
  isDemoMode: boolean;
}

export function useDevToggles({ actions, showDevScenarios, isDemoMode }: UseDevTogglesProps) {
  const handleToggleScenarios = useCallback(() => {
    if (isDevelopment()) {
      const newShowDev = !showDevScenarios;
      actions.setShowDevScenarios(newShowDev);
      if (newShowDev) {
        window.history.pushState({}, '', '/dev/scenarios');
      } else {
        window.history.back();
      }
    }
  }, [actions, showDevScenarios]);

  const handleToggleDemoMode = useCallback(() => {
    actions.setIsDemoMode(!isDemoMode);
  }, [actions, isDemoMode]);

  const handleDevReset = useCallback(() => {
    if (showDevScenarios) {
      actions.setShowDevScenarios(false);
      window.history.pushState({}, '', '/');
    }
    actions.setSelectedChallenge(null);
    actions.setPhase('design');
    actions.setCurrentScreen('challenge-selection');
    actions.setAudioData(null);
    actions.setShowCommandPalette(false);
  }, [actions, showDevScenarios]);

  return {
    handleToggleScenarios,
    handleToggleDemoMode,
    handleDevReset,
  };
}
