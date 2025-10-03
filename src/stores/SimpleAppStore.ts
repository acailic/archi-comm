// src/stores/SimpleAppStore.ts
// Simplified Zustand-based store to replace complex RxJS AppStore
// Provides essential state management without observables and complex debugging
// RELEVANT FILES: AppStore.ts (original), main.tsx, components using store

import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AudioData, Challenge, DesignData } from "../shared/contracts";
import { persistenceCoordinator } from "./PersistenceCoordinator";
import { shouldShowWelcome, updateOnboardingSettings } from "../modules/settings";

// Simplified state shape focusing on essential data
export interface AppState {
  // Core application state
  selectedChallenge: Challenge | null;
  designData: DesignData | null;
  audioData: AudioData | null;
  phase: "challenge-selection" | "design" | "recording" | "review";
  availableChallenges: Challenge[];

  // UI state
  showCommandPalette: boolean;
  currentScreen: string;
  showDevScenarios: boolean;
  isDemoMode: boolean;
  showWelcome: boolean;

  // Simple loading states
  isLoading: boolean;
  error: string | null;
}

// Action interfaces for type safety
export interface AppActions {
  // Challenge actions
  setSelectedChallenge: (challenge: Challenge | null) => void;
  setAvailableChallenges: (challenges: Challenge[]) => void;

  // Data actions
  setDesignData: (data: DesignData | null) => void;
  setAudioData: (data: AudioData | null) => void;

  // Phase management
  setPhase: (phase: AppState["phase"]) => void;
  nextPhase: () => void;
  previousPhase: () => void;
  resetToChallenge: () => void;

  // UI actions
  setShowCommandPalette: (show: boolean) => void;
  setCurrentScreen: (screen: string) => void;
  setShowDevScenarios: (show: boolean) => void;
  setIsDemoMode: (demo: boolean) => void;
  setShowWelcome: (show: boolean) => void;

  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset actions
  resetDesignData: () => void;
  resetAudioData: () => void;
  resetAll: () => void;
}

// Complete store type
export type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  selectedChallenge: null,
  designData: null,
  audioData: null,
  phase: "challenge-selection",
  availableChallenges: [],
  showCommandPalette: false,
  currentScreen: "challenge-selection",
  showDevScenarios: false,
  isDemoMode: false,
  showWelcome: shouldShowWelcome(),
  isLoading: false,
  error: null,
};

// Phase progression helper
const getNextPhase = (currentPhase: AppState["phase"]): AppState["phase"] => {
  switch (currentPhase) {
    case "challenge-selection":
      return "design";
    case "design":
      return "recording";
    case "recording":
      return "review";
    case "review":
      return "review"; // Stay at review
    default:
      return "challenge-selection";
  }
};

const getPreviousPhase = (
  currentPhase: AppState["phase"]
): AppState["phase"] => {
  switch (currentPhase) {
    case "design":
      return "challenge-selection";
    case "recording":
      return "design";
    case "review":
      return "recording";
    case "challenge-selection":
      return "challenge-selection"; // Stay at start
    default:
      return "challenge-selection";
  }
};

// Wrap the set function to use persistence coordinator
const createCoordinatedSet = (originalSet: any) => {
  return (update: any) => {
    // Enqueue the state update through the coordinator
    persistenceCoordinator.enqueue(async () => {
      originalSet(update);
    });
  };
};

// Create the store
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      // Wrap set to coordinate persistence
      const coordinatedSet = createCoordinatedSet(set);

      return {
        // Spread initial state
        ...initialState,

        // Challenge actions
        setSelectedChallenge: (challenge) => {
          coordinatedSet({ selectedChallenge: challenge });
          // Auto-advance to design phase when challenge is selected
          if (challenge && get().phase === "challenge-selection") {
            coordinatedSet({ phase: "design" });
          }
        },

        setAvailableChallenges: (challenges) =>
          coordinatedSet({ availableChallenges: challenges }),

        // Data actions
        setDesignData: (data) => coordinatedSet({ designData: data }),

        setAudioData: (data) => coordinatedSet({ audioData: data }),

        // Phase management
        setPhase: (phase) => coordinatedSet({ phase }),

        nextPhase: () => {
          const currentPhase = get().phase;
          const nextPhase = getNextPhase(currentPhase);
          coordinatedSet({ phase: nextPhase });
        },

        previousPhase: () => {
          const currentPhase = get().phase;
          const previousPhase = getPreviousPhase(currentPhase);
          coordinatedSet({ phase: previousPhase });
        },

        resetToChallenge: () =>
          coordinatedSet({
            phase: "challenge-selection",
            selectedChallenge: null,
            designData: null,
            audioData: null,
            error: null,
          }),

        // UI actions
        setShowCommandPalette: (show) => coordinatedSet({ showCommandPalette: show }),

        setCurrentScreen: (screen) => coordinatedSet({ currentScreen: screen }),

        setShowDevScenarios: (show) => coordinatedSet({ showDevScenarios: show }),

        setIsDemoMode: (demo) => coordinatedSet({ isDemoMode: demo }),

        setShowWelcome: (show) => {
          coordinatedSet({ showWelcome: show });
          if (!show) {
            updateOnboardingSettings({ showWelcomeOnStartup: false });
          }
        },

        // Utility actions
        setLoading: (loading) => coordinatedSet({ isLoading: loading }),

        setError: (error) => coordinatedSet({ error }),

        clearError: () => coordinatedSet({ error: null }),

        // Reset actions
        resetDesignData: () => coordinatedSet({ designData: null }),

        resetAudioData: () => coordinatedSet({ audioData: null }),

        resetAll: () =>
          coordinatedSet({
            ...initialState,
            availableChallenges: get().availableChallenges, // Keep loaded challenges
          }),
      };
    },
    {
      name: "archicomm-app-store", // Storage key
      partialize: (state) => ({
        // Only persist essential data, not UI state
        selectedChallenge: state.selectedChallenge,
        designData: state.designData,
        audioData: state.audioData,
        phase: state.phase,
        availableChallenges: state.availableChallenges,
      }),
    }
  )
);

// Convenience hooks for specific state slices
export const useSelectedChallenge = () =>
  useAppStore((state) => state.selectedChallenge);
export const useDesignData = () => useAppStore((state) => state.designData);
export const useAudioData = () => useAppStore((state) => state.audioData);
export const useCurrentPhase = () => useAppStore((state) => state.phase);
export const useAvailableChallenges = () =>
  useAppStore((state) => state.availableChallenges);
export const useAppLoading = () => useAppStore((state) => state.isLoading);
export const useAppError = () => useAppStore((state) => state.error);

// Create a stable actions selector to prevent render loops
const actionsSelector = (state: AppStore) => ({
  setSelectedChallenge: state.setSelectedChallenge,
  setDesignData: state.setDesignData,
  setAudioData: state.setAudioData,
  setPhase: state.setPhase,
  nextPhase: state.nextPhase,
  previousPhase: state.previousPhase,
  resetToChallenge: state.resetToChallenge,
  setShowCommandPalette: state.setShowCommandPalette,
  setCurrentScreen: state.setCurrentScreen,
  setShowDevScenarios: state.setShowDevScenarios,
  setIsDemoMode: state.setIsDemoMode,
  setShowWelcome: state.setShowWelcome,
  setAvailableChallenges: state.setAvailableChallenges,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  resetAll: state.resetAll,
});

// Action hooks
export const useAppActions = () => useAppStore(actionsSelector);

// Helper function to check if we can proceed to next phase
export const useCanProceedToNextPhase = () => {
  const selector = useCallback((state: AppState) => {
    switch (state.phase) {
      case "challenge-selection":
        return !!state.selectedChallenge;
      case "design":
        return !!state.designData?.components?.length;
      case "recording":
        return !!state.audioData;
      case "review":
        return true; // Can always stay in review
      default:
        return false;
    }
  }, []);

  return useAppStore(selector);
};

// Helper to get current phase data
export const useCurrentPhaseData = () => {
  const selector = useCallback((state: AppState) => {
    switch (state.phase) {
      case "challenge-selection":
        return {
          challenge: state.selectedChallenge,
          challenges: state.availableChallenges,
        };
      case "design":
        return {
          challenge: state.selectedChallenge,
          designData: state.designData,
        };
      case "recording":
        return {
          challenge: state.selectedChallenge,
          designData: state.designData,
        };
      case "review":
        return {
          challenge: state.selectedChallenge,
          designData: state.designData,
          audioData: state.audioData,
        };
      default:
        return {};
    }
  }, []);

  return useAppStore(selector);
};

export default useAppStore;
