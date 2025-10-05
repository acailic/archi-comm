// src/packages/ui/components/AppContainer/AppContent.tsx
// Main application content component that handles routing and state management
// Provides simplified state management without complex DI or recovery systems
// RELEVANT FILES: src/packages/ui/components/AppContainer/ScreenRouter.tsx, src/lib/config/challenge-config.ts, src/packages/ui/components/CommandPalette.tsx, src/shared/contracts/index.ts

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { challengeManager } from "../../../../lib/config/challenge-config";
import { isDevelopment } from "../../../../lib/config/environment";
import type {
  AudioData,
  Challenge,
  DesignData,
} from "../../../../shared/contracts/index";
import { useAppStore, type AppState } from "../../../../stores/SimpleAppStore";
import { CommandPalette } from "../CommandPalette";
import { TooltipProvider } from "../ui/tooltip";
import { ScreenRouter } from "./ScreenRouter";
import { OnboardingOverlay } from "../overlays/OnboardingOverlay";

export function AppContent() {
  // Use a simple state object to avoid Zustand selector issues
  const [appState, setAppState] = useState<AppState>({
    selectedChallenge: null,
    designData: null,
    audioData: null,
    phase: "challenge-selection",
    availableChallenges: [],
    completedPhases: new Set(),
    skippedPhases: new Set(),
    sessionMode: 'full',
    showCommandPalette: false,
    currentScreen: "challenge-selection",
    showDevScenarios: false,
    isDemoMode: false,
    showWelcome: true,
    isLoading: false,
    error: null,
  });

  // Subscribe to store changes with useEffect
  useEffect(() => {
    // Get initial state
    const store = useAppStore.getState();
    setAppState(store);

    // Subscribe to changes
    const unsubscribe = useAppStore.subscribe((state: AppState) => {
      setAppState(state);
    });

    return unsubscribe;
  }, []);

  // Extract state for cleaner code
  const {
    selectedChallenge,
    phase,
    currentScreen,
    showCommandPalette,
    availableChallenges,
    designData,
    audioData,
    showDevScenarios,

    showWelcome,
  } = appState;

  // Get actions directly from store without hooks
  const store = useAppStore.getState();
  const {
    setSelectedChallenge,
    setPhase,
    setCurrentScreen,
    setShowCommandPalette,
    setDesignData,
    setAudioData,
    setAvailableChallenges,
    setShowDevScenarios,

    setShowWelcome,
    resetAll,
  } = store;

  // Simple features object
  const features = useMemo(
    () => ({
      commandPalette: true,
    }),
    []
  );

  // Stable navigation handlers with proper memoization
  const handleChallengeSelect = useCallback(
    (challenge: Challenge) => {
      setSelectedChallenge(challenge);
      setCurrentScreen("design-canvas");
      setPhase("design");
    },
    [setSelectedChallenge, setCurrentScreen, setPhase]
  );

  const handleOpenCommandPalette = useCallback(
    () => setShowCommandPalette(true),
    [setShowCommandPalette]
  );
  const handlePaletteClose = useCallback(
    () => setShowCommandPalette(false),
    [setShowCommandPalette]
  );
  const handleNavigateToScreenShortcut = useCallback(() => {}, []);
  const handleNavigateFromPalette = useCallback(() => {}, []);

  const handleBackFromAudio = useCallback(() => {
    setCurrentScreen("design-canvas");
    setPhase("design");
  }, [setCurrentScreen, setPhase]);

  const handleStartOver = useCallback(() => {
    resetAll();
    setCurrentScreen("challenge-selection");
    setPhase("challenge-selection");
  }, [resetAll, setCurrentScreen, setPhase]);

  const handleBackToDesign = useCallback(() => {
    setCurrentScreen("design-canvas");
    setPhase("design");
  }, [setCurrentScreen, setPhase]);

  const handleBackToAudio = useCallback(() => {
    setCurrentScreen("audio-recording");
    setPhase("recording");
  }, [setCurrentScreen, setPhase]);

  const handleConfigBack = useCallback(() => {
    setCurrentScreen("challenge-selection");
    setPhase("challenge-selection");
  }, [setCurrentScreen, setPhase]);

  const handleNavigateToConfig = useCallback(() => {
    setCurrentScreen("config");
  }, [setCurrentScreen]);

  const handleBackToSelection = useCallback(() => {
    setSelectedChallenge(null);
    setCurrentScreen("challenge-selection");
    setPhase("challenge-selection");
  }, [setSelectedChallenge, setCurrentScreen, setPhase]);

  const handleWelcomeComplete = useCallback(
    () => setShowWelcome(false),
    [setShowWelcome]
  );

  // New handlers for optional flow
  const handleSkipToReview = useCallback(() => {
    const store = useAppStore.getState();
    // Mark design as completed and recording as skipped
    store.markPhaseCompleted('design');
    store.markPhaseSkipped('recording');
    store.setSessionMode('design-and-review');
    // Create empty audio data
    const emptyAudioData: AudioData = {
      blob: null,
      transcript: '',
      duration: 0,
      wordCount: 0,
      businessValueTags: [],
      analysisMetrics: { clarityScore: 0, technicalDepth: 0, businessFocus: 0 },
    };
    setAudioData(emptyAudioData);
    setPhase('review');
    setCurrentScreen('review');
  }, [setAudioData, setPhase, setCurrentScreen]);

  const handleFinishAndExport = useCallback(() => {
    const store = useAppStore.getState();
    // Mark design as completed
    store.markPhaseCompleted('design');
    store.markPhaseSkipped('recording');
    store.markPhaseSkipped('review');
    store.setSessionMode('design-only');
    // Export design data
    if (designData) {
      const exportData = {
        challenge: selectedChallenge?.title || 'Unknown',
        design: designData,
        timestamp: new Date().toISOString(),
      };
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archicomm-design-${selectedChallenge?.id || 'unknown'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
    // Return to challenge selection
    store.finishSession();
  }, [designData, selectedChallenge]);

  const handleSkipReview = useCallback(() => {
    const store = useAppStore.getState();
    store.markPhaseCompleted('recording');
    store.markPhaseSkipped('review');
    store.setSessionMode('design-and-recording');
    store.finishSession();
  }, []);

  const handleFinishSession = useCallback(() => {
    const store = useAppStore.getState();
    store.markPhaseCompleted('review');
    store.finishSession();
  }, []);

  const handleBackToCanvas = useCallback(() => {
    setCurrentScreen('design-canvas');
    setPhase('design');
  }, [setCurrentScreen, setPhase]);

  // Group navigation handlers into a stable object
  const navigation = useMemo(
    () => ({
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
      handleNavigateToConfig,
      handleBackToSelection,
      handleWelcomeComplete,
      handleSkipToReview,
      handleFinishAndExport,
      handleSkipReview,
      handleFinishSession,
      handleBackToCanvas,
    }),
    [
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
      handleNavigateToConfig,
      handleBackToSelection,
      handleWelcomeComplete,
      handleSkipToReview,
      handleFinishAndExport,
      handleSkipReview,
      handleFinishSession,
      handleBackToCanvas,
    ]
  );

  useEffect(() => {
    try {
      setAvailableChallenges(challengeManager.getAllChallenges());
    } catch (error) {
      console.error("Failed to load challenges", error);
    }
  }, []); // No dependencies - load challenges only once on mount

  // Check for development scenario viewer route
  useEffect(() => {
    if (!isDevelopment()) return;

    const checkDevRoute = () => {
      const pathname = window.location.pathname || "";
      setShowDevScenarios(pathname.includes("/dev/scenarios"));
    };

    checkDevRoute();

    // Listen for navigation changes
    window.addEventListener("popstate", checkDevRoute);
    return () => window.removeEventListener("popstate", checkDevRoute);
  }, [setShowDevScenarios]); // Depend on the action

  useEffect(() => {
    const handleConfigNavigation = (_event: Event) => {
      handleNavigateToConfig();
    };

    window.addEventListener("navigate:config", handleConfigNavigation);
    return () => window.removeEventListener("navigate:config", handleConfigNavigation);
  }, [handleNavigateToConfig]);

  const handleComplete = useCallback(
    (data: DesignData) => {
      setDesignData(data);
      setPhase("recording");
      setCurrentScreen("audio-recording");
    },
    [setDesignData, setPhase, setCurrentScreen]
  );

  const handleAudioComplete = useCallback(
    (data: AudioData) => {
      setAudioData(data);
      setPhase("review");
      setCurrentScreen("review");
    },
    [setAudioData, setPhase, setCurrentScreen]
  );

  // Simplified keyboard shortcuts for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showCommandPalette, setShowCommandPalette]);

  return (
    <TooltipProvider>
      <a href="#app-main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="w-full h-full">
        <Suspense fallback={<div className="p-4">Loading…</div>}>
          <main id="app-main-content" className="w-full h-full focus:outline-none" tabIndex={-1}>
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
              onNavigateToConfig={navigation.handleNavigateToConfig}
              onSkipToReview={navigation.handleSkipToReview}
              onFinishAndExport={navigation.handleFinishAndExport}
              onSkipReview={navigation.handleSkipReview}
              onFinishSession={navigation.handleFinishSession}
              onBackToCanvas={navigation.handleBackToCanvas}
            />
          </main>
        </Suspense>

        {/* Onboarding Overlay */}
        <OnboardingOverlay />

        {/* Command Palette */}
        {features.commandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={navigation.handlePaletteClose}
            currentScreen={
              selectedChallenge ? currentScreen : "challenge-selection"
            }
            onNavigate={navigation.handleNavigateFromPalette}
            selectedChallenge={selectedChallenge}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
