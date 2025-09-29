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

export function AppContent() {
  // Use a simple state object to avoid Zustand selector issues
  const [appState, setAppState] = useState<AppState>({
    selectedChallenge: null,
    designData: null,
    audioData: null,
    phase: "challenge-selection",
    availableChallenges: [],
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

  const handleBackToSelection = useCallback(() => {
    setCurrentScreen("challenge-selection");
    setPhase("challenge-selection");
  }, [setCurrentScreen, setPhase]);

  const handleWelcomeComplete = useCallback(
    () => setShowWelcome(false),
    [setShowWelcome]
  );

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
      handleBackToSelection,
      handleWelcomeComplete,
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
      handleBackToSelection,
      handleWelcomeComplete,
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
      <div className="w-full h-full">
        <Suspense fallback={<div className="p-4">Loading…</div>}>
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
