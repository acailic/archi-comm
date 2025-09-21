import React, { Suspense, useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { isDevelopment } from '@/lib/config/environment';
import { CommandPalette } from '@ui/components/CommandPalette';
import { challengeManager } from '@/lib/config/challenge-config';
import type { DesignData, AudioData } from '@/shared/contracts/index';
import { useRecovery } from '@/lib/recovery/RecoveryContext';
import { RecoveryOverlay } from '@ui/components/overlays/RecoveryOverlay';
import { TooltipProvider } from '@ui/components/ui/tooltip';
import { ScreenRouter } from './ScreenRouter';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
// Temporarily disabled complex state management to fix infinite loops
// import { useUnifiedState } from '@/shared/hooks/useUnifiedState';
// import { shallow } from 'zustand/shallow';
// import { useAppVariant } from '@/shared/hooks/useAppVariant';
// import { useLogger } from '@/shared/hooks/useLogger';
// import type { AppState } from '@/stores/AppStore';

// Simplified state management to fix infinite loops
export function AppContent() {
  // Infinite loop detection
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const loopDetector = InfiniteLoopDetector.getInstance();

  // Track renders for debugging
  renderCountRef.current++;
  const now = Date.now();
  if (now - lastRenderTime.current < 100 && renderCountRef.current % 10 === 0) {
    console.warn(`AppContent rendered ${renderCountRef.current} times in quick succession`);
    loopDetector.notifyRenderLoop('AppContent', renderCountRef.current);
  }
  lastRenderTime.current = now;

  // Use simple local state instead of complex unified state
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [designData, setDesignData] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [phase, setPhase] = useState('challenge-selection');
  const [availableChallenges, setAvailableChallenges] = useState([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('challenge-selection');
  const [showDevScenarios, setShowDevScenarios] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Simple actions object
  const appActions = useMemo(() => ({
    setSelectedChallenge,
    setDesignData,
    setAudioData,
    setPhase,
    setAvailableChallenges,
    setShowCommandPalette,
    setCurrentScreen,
    setShowDevScenarios,
    setIsDemoMode,
    setShowWelcome,
  }), []);

  // Simple features object
  const features = useMemo(() => ({
    commandPalette: true,
  }), []);

  // Recovery system integration
  const recovery = useRecovery();

  // Stable navigation handlers with proper memoization
  const handleChallengeSelect = useCallback((challenge) => {
    setSelectedChallenge(challenge);
    setCurrentScreen('design-canvas');
    setPhase('design');
  }, []);

  const handleOpenCommandPalette = useCallback(() => setShowCommandPalette(true), []);
  const handlePaletteClose = useCallback(() => setShowCommandPalette(false), []);
  const handleNavigateToScreenShortcut = useCallback(() => {}, []);
  const handleNavigateFromPalette = useCallback(() => {}, []);

  const handleBackFromAudio = useCallback(() => {
    setCurrentScreen('design-canvas');
    setPhase('design');
  }, []);

  const handleStartOver = useCallback(() => {
    setCurrentScreen('challenge-selection');
    setPhase('challenge-selection');
    setSelectedChallenge(null);
    setDesignData(null);
    setAudioData(null);
  }, []);

  const handleBackToDesign = useCallback(() => {
    setCurrentScreen('design-canvas');
    setPhase('design');
  }, []);

  const handleBackToAudio = useCallback(() => {
    setCurrentScreen('audio-recording');
    setPhase('audio-recording');
  }, []);

  const handleConfigBack = useCallback(() => {
    setCurrentScreen('challenge-selection');
    setPhase('challenge-selection');
  }, []);

  const handleBackToSelection = useCallback(() => {
    setCurrentScreen('challenge-selection');
    setPhase('challenge-selection');
  }, []);

  const handleWelcomeComplete = useCallback(() => setShowWelcome(false), []);

  // Group navigation handlers into a stable object
  const navigation = useMemo(() => ({
    handleChallengeSelect,
    handleOpenCommandPalette,
    handlePaletteClose,
    handleNavigateToScreenShortcut,
    handleNavigateFromPalette,
    handleBackFromAudio,
    handleStartOver,
    handleBackToDesign,
    handleBackToAudio,
    handleConfigBack,
    handleBackToSelection,
    handleWelcomeComplete,
  }), [
    handleChallengeSelect,
    handleOpenCommandPalette,
    handlePaletteClose,
    handleNavigateToScreenShortcut,
    handleNavigateFromPalette,
    handleBackFromAudio,
    handleStartOver,
    handleBackToDesign,
    handleBackToAudio,
    handleConfigBack,
    handleBackToSelection,
    handleWelcomeComplete,
  ]);

  useEffect(() => {
    try {
      setAvailableChallenges(challengeManager.getAllChallenges());
    } catch (error) {
      console.error('Failed to load challenges', error);
    }
  }, []); // Empty dependency array - this should only run once

  // Check for development scenario viewer route
  useEffect(() => {
    if (!isDevelopment()) return;

    const checkDevRoute = () => {
      const pathname = window.location.pathname || '';
      setShowDevScenarios(pathname.includes('/dev/scenarios'));
    };

    checkDevRoute();

    // Listen for navigation changes
    window.addEventListener('popstate', checkDevRoute);
    return () => window.removeEventListener('popstate', checkDevRoute);
  }, []); // Empty dependency array - this should only run once

  const handleComplete = useCallback((data: DesignData) => {
    setDesignData(data);
    setPhase('audio-recording');
    setCurrentScreen('audio-recording');
  }, []);

  const handleAudioComplete = useCallback((data: AudioData) => {
    setAudioData(data);
    setPhase('review');
    setCurrentScreen('review');
  }, []);

  // Simplified keyboard shortcuts for command palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showCommandPalette) {
      setShowCommandPalette(false);
    }
  }, [showCommandPalette]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const recoveryRetryHandler = React.useMemo<(() => void) | undefined>(() => {
    if (recovery.lastRecoveryResult && !recovery.lastRecoveryResult.success) {
      return () => {
        const retryError = {
          id: `retry_${Date.now()}`,
          message: 'Manual retry requested',
          category: 'unknown' as const,
          severity: 'high' as const,
          timestamp: Date.now(),
          count: 1,
          resolved: false,
          context: { userActions: ['Manual retry'], additionalData: { retry: true } },
          hash: `retry_${Date.now()}`,
        };
        recovery.triggerRecovery(retryError);
      };
    }
    return undefined;
  }, [recovery.lastRecoveryResult]);

  return (
    <TooltipProvider>
      <div className='w-full h-full'>
        <Suspense fallback={<div className='p-4'>Loading…</div>}>
          <ScreenRouter
            showDevScenarios={showDevScenarios}
            showWelcome={showWelcome}
            selectedChallenge={selectedChallenge}
            availableChallenges={availableChallenges}
            phase={phase}
            audioData={audioData}
            currentScreen={currentScreen}
            designData={designData}
            onChallengeSelect={navigation.handleChallengeSelect}
            onComplete={handleComplete}
            onAudioComplete={handleAudioComplete}
            onBackFromAudio={navigation.handleBackFromAudio}
            onStartOver={navigation.handleStartOver}
            onBackToDesign={navigation.handleBackToDesign}
            onBackToAudio={navigation.handleBackToAudio}
            onConfigBack={navigation.handleConfigBack}
            onBackToSelection={navigation.handleBackToSelection}
            onWelcomeComplete={navigation.handleWelcomeComplete}
            onInfiniteLoopReset={() => {}}
            onRequestRecovery={() => {}}
          />
        </Suspense>

        {/* Command Palette */}
        {features.commandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={navigation.handlePaletteClose}
            currentScreen={selectedChallenge ? currentScreen : 'challenge-selection'}
            onNavigate={navigation.handleNavigateFromPalette}
            selectedChallenge={selectedChallenge}
          />
        )}

        {/* Recovery Overlay */}
        <RecoveryOverlay
          isVisible={recovery.showRecoveryUI}
          recoveryProgress={recovery.recoveryProgress}
          recoveryResult={recovery.lastRecoveryResult}
          onCancel={recovery.cancelRecovery}
          onDismiss={recovery.dismissRecovery}
          onRetry={recoveryRetryHandler}
        />

        {/* diagnostics UI removed */}
      </div>
    </TooltipProvider>
  );
}
