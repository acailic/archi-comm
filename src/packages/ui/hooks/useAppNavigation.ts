import { useCallback, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import type { Challenge, AudioData } from '@/shared/contracts/index';

interface UseAppNavigationOptions {
  selectedChallenge: Challenge | null;
  audioData: AudioData | null;
}

export function useAppNavigation({ selectedChallenge, audioData }: UseAppNavigationOptions) {
  const { actions } = useAppStore();

  // Memoized navigation and palette handlers
  const handleOpenCommandPalette = useCallback(() => {
    actions.setShowCommandPalette(true);
  }, [actions]);

  const handlePaletteClose = useCallback(() => {
    actions.setShowCommandPalette(false);
  }, [actions]);

  const handleNavigateFromPalette = useCallback((screen: string) => {
    if (screen === 'challenge-selection') {
      actions.setSelectedChallenge(null);
      actions.setPhase('design');
      actions.setCurrentScreen('challenge-selection');
    }
    if (screen === 'design-canvas' && selectedChallenge) {
      actions.setPhase('design');
      actions.setCurrentScreen('design-canvas');
    }
    if (screen === 'pro-version') {
      actions.setCurrentScreen('config'); // or navigate to a dedicated Pro/Upgrade route if available
    }
    if (screen === 'audio-recording' && selectedChallenge) {
      actions.setPhase('audio-recording');
      actions.setCurrentScreen('audio-recording');
    }
    if (screen === 'review' && selectedChallenge && audioData) {
      actions.setPhase('review');
      actions.setCurrentScreen('review');
    }
    if (screen === 'config') {
      actions.setCurrentScreen('config');
    }
    actions.setShowCommandPalette(false);
  }, [actions, selectedChallenge, audioData]);

  const handleNavigateToScreenShortcut = useCallback((screen: string) => {
    if (screen === 'challenge-selection') {
      actions.setSelectedChallenge(null);
      actions.setPhase('design');
      actions.setCurrentScreen('challenge-selection');
      actions.setShowDevScenarios(false);
    }
  }, [actions]);

  const handleChallengeSelect = useCallback((c: Challenge) => {
    actions.setSelectedChallenge(c);
    actions.setPhase('design');
    actions.setCurrentScreen('design-canvas');
  }, [actions]);

  const handleBackFromAudio = useCallback(() => {
    actions.setPhase('design');
    actions.setCurrentScreen('design-canvas');
  }, [actions]);

  const handleStartOver = useCallback(() => {
    actions.setSelectedChallenge(null);
    actions.setPhase('design');
    actions.setAudioData(null);
    actions.setCurrentScreen('challenge-selection');
  }, [actions]);

  const handleBackToDesign = useCallback(() => {
    actions.setPhase('design');
    actions.setCurrentScreen('design-canvas');
  }, [actions]);

  const handleBackToAudio = useCallback(() => {
    actions.setPhase('audio-recording');
    actions.setCurrentScreen('audio-recording');
  }, [actions]);

  const handleConfigBack = useCallback(() => {
    actions.setCurrentScreen('design-canvas');
  }, [actions]);

  const handleBackToSelection = useCallback(() => {
    actions.setSelectedChallenge(null);
    actions.setPhase('design');
    actions.setCurrentScreen('challenge-selection');
  }, [actions]);

  const handleWelcomeComplete = useCallback(() => {
    actions.setShowWelcome(false);
    actions.setCurrentScreen('challenge-selection');
  }, [actions]);

  // Listen for toolbar navigation events (e.g., settings/config)
  useEffect(() => {
    const toConfig = () => actions.setCurrentScreen('config');
    window.addEventListener('navigate:config', toConfig as EventListener);
    return () => window.removeEventListener('navigate:config', toConfig as EventListener);
  }, [actions]);

  return {
    handleOpenCommandPalette,
    handlePaletteClose,
    handleNavigateFromPalette,
    handleNavigateToScreenShortcut,
    handleChallengeSelect,
    handleBackFromAudio,
    handleStartOver,
    handleBackToDesign,
    handleBackToAudio,
    handleConfigBack,
    handleBackToSelection,
    handleWelcomeComplete,
  };
}