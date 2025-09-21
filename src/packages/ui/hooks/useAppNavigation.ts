import { useCallback, useEffect, useRef } from 'react';
import type { Challenge, AudioData } from '@/shared/contracts/index';
import type { AppStoreActions } from '@/stores/AppStore';

interface UseAppNavigationOptions {
  selectedChallenge: Challenge | null;
  audioData: AudioData | null;
  actions: AppStoreActions;
}

export function useAppNavigation({ selectedChallenge, audioData, actions }: UseAppNavigationOptions) {
  // Store actions in ref to avoid recreation of callbacks when actions object changes
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Store current state in refs to avoid stale closures
  const stateRef = useRef({ selectedChallenge, audioData });
  stateRef.current = { selectedChallenge, audioData };

  // Memoized navigation and palette handlers with stable dependencies
  const handleOpenCommandPalette = useCallback(() => {
    actionsRef.current.setShowCommandPalette(true);
  }, []);

  const handlePaletteClose = useCallback(() => {
    actionsRef.current.setShowCommandPalette(false);
  }, []);

  const handleNavigateFromPalette = useCallback((screen: string) => {
    const { selectedChallenge, audioData } = stateRef.current;
    const actions = actionsRef.current;

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
  }, []);

  const handleNavigateToScreenShortcut = useCallback((screen: string) => {
    const actions = actionsRef.current;
    if (screen === 'challenge-selection') {
      actions.setSelectedChallenge(null);
      actions.setPhase('design');
      actions.setCurrentScreen('challenge-selection');
      actions.setShowDevScenarios(false);
    }
  }, []);

  const handleChallengeSelect = useCallback((c: Challenge) => {
    const actions = actionsRef.current;
    actions.setSelectedChallenge(c);
    actions.setPhase('design');
    actions.setCurrentScreen('design-canvas');
  }, []);

  const handleBackFromAudio = useCallback(() => {
    const actions = actionsRef.current;
    actions.setPhase('design');
    actions.setCurrentScreen('design-canvas');
  }, []);

  const handleStartOver = useCallback(() => {
    const actions = actionsRef.current;
    actions.setSelectedChallenge(null);
    actions.setPhase('design');
    actions.setAudioData(null);
    actions.setCurrentScreen('challenge-selection');
  }, []);

  const handleBackToDesign = useCallback(() => {
    const actions = actionsRef.current;
    actions.setPhase('design');
    actions.setCurrentScreen('design-canvas');
  }, []);

  const handleBackToAudio = useCallback(() => {
    const actions = actionsRef.current;
    actions.setPhase('audio-recording');
    actions.setCurrentScreen('audio-recording');
  }, []);

  const handleConfigBack = useCallback(() => {
    const actions = actionsRef.current;
    actions.setCurrentScreen('design-canvas');
  }, []);

  const handleBackToSelection = useCallback(() => {
    const actions = actionsRef.current;
    actions.setSelectedChallenge(null);
    actions.setPhase('design');
    actions.setCurrentScreen('challenge-selection');
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    const actions = actionsRef.current;
    actions.setShowWelcome(false);
    actions.setCurrentScreen('challenge-selection');
  }, []);

  // Listen for toolbar navigation events (e.g., settings/config)
  useEffect(() => {
    const toConfig = () => actionsRef.current.setCurrentScreen('config');
    window.addEventListener('navigate:config', toConfig as EventListener);
    return () => window.removeEventListener('navigate:config', toConfig as EventListener);
  }, []); // Empty dependency array - the effect should only run once

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
