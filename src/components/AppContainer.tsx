import React, { Suspense, useEffect, useMemo, useCallback } from 'react';
import { isDevelopment, isTauriEnvironment } from '@/lib/environment';
import { ChallengeSelection } from '@/components/ChallengeSelection';
import { DesignCanvas } from '@/components/DesignCanvas';
import { CommandPalette } from '@/components/CommandPalette';
import { getLogger } from '@/lib/logger';
import { challengeManager } from '@/lib/challenge-config';
import type { DesignData, Challenge, AudioData } from '@/shared/contracts/index';
import { AudioRecording } from '@/components/AudioRecording';
import { ReviewScreen } from '@/components/ReviewScreen';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { ConfigPage } from '@/components/ConfigPage';
import { ScenarioViewer } from '@/dev';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useDevShortcuts } from '@/dev/DevShortcuts';
import { RecoveryProvider, useRecovery } from '@/lib/recovery/RecoveryContext';
import { RecoveryOverlay } from '@/components/RecoveryOverlay';
import { useAppStore, useAppStoreSelector } from '@/hooks/useAppStore';

export type AppVariant = 'basic' | 'complex' | 'safe';

export interface FeatureConfig {
  router: boolean;
  ux: boolean;
  commandPalette: boolean;
  diagnostics: boolean;
}

function detectVariant(): AppVariant {
  const env = (import.meta as any).env || {};
  const variant =
    (env.VITE_APP_VARIANT as AppVariant) || (isTauriEnvironment() ? 'complex' : 'basic');
  return variant;
}

function featuresForVariant(variant: AppVariant): FeatureConfig {
  switch (variant) {
    case 'complex':
      return { router: true, ux: true, commandPalette: true, diagnostics: true };
    case 'safe':
      return { router: false, ux: false, commandPalette: false, diagnostics: true };
    default:
      return { router: false, ux: true, commandPalette: true, diagnostics: true };
  }
}

const logger = getLogger('app-container');

// Main app content component that uses recovery system
function AppContent() {
  const variant = useMemo(detectVariant, []);
  const features = useMemo(() => featuresForVariant(variant), [variant]);

  // Recovery system integration
  const recovery = useRecovery();
  const { actions } = useAppStore();
  const selectedChallenge = useAppStoreSelector(s => s.selectedChallenge);
  const designData = useAppStoreSelector(s => s.designData);
  const audioData = useAppStoreSelector(s => s.audioData);
  const phase = useAppStoreSelector(s => s.phase);
  const availableChallenges = useAppStoreSelector(s => s.availableChallenges);
  const showCommandPalette = useAppStoreSelector(s => s.showCommandPalette);
  const currentScreen = useAppStoreSelector(s => s.currentScreen);
  const showDevScenarios = useAppStoreSelector(s => s.showDevScenarios);
  const isDemoMode = useAppStoreSelector(s => s.isDemoMode);
  const showWelcome = useAppStoreSelector(s => s.showWelcome);

  // Set up recovery context provider to give current app state to recovery system
  const updateRecoveryContext = useCallback(() => {
    try {
      // Save current app state for recovery
      if (designData && Object.keys(designData).length > 0) {
        localStorage.setItem('current_design', JSON.stringify(designData));
      }
      if (audioData) {
        localStorage.setItem('current_audio', JSON.stringify(audioData));
      }
      if (selectedChallenge) {
        localStorage.setItem('current_project_id', selectedChallenge.id);
      }

      // Save user preferences
      const userPreferences = {
        variant,
        features,
        currentScreen,
        phase,
        isDemoMode,
      };
      localStorage.setItem('user_preferences', JSON.stringify(userPreferences));
    } catch (error) {
      logger.warn('Failed to update recovery context', error);
    }
  }, [
    designData,
    audioData,
    selectedChallenge,
    variant,
    features,
    currentScreen,
    phase,
    isDemoMode,
  ]);

  useEffect(() => {
    // Update context whenever state changes
    updateRecoveryContext();
  }, [updateRecoveryContext]);

  useEffect(() => {
    try {
      actions.setAvailableChallenges(challengeManager.getAllChallenges());
    } catch (error) {
      logger.error('Failed to load challenges', error as any);
    }
  }, []);

  // Check for development scenario viewer route
  useEffect(() => {
    if (isDevelopment()) {
      const checkDevRoute = () => {
        const pathname = window.location.pathname || '';
        actions.setShowDevScenarios(pathname.includes('/dev/scenarios'));
      };

      checkDevRoute();

      // Listen for navigation changes
      window.addEventListener('popstate', checkDevRoute);
      return () => window.removeEventListener('popstate', checkDevRoute);
    }
  }, []);

  const handleComplete = (data: DesignData) => {
    actions.setDesignData(data);
    actions.setPhase('audio-recording');
    actions.setCurrentScreen('audio-recording');
  };

  const handleAudioComplete = (data: AudioData) => {
    actions.setAudioData(data);
    actions.setPhase('review');
    actions.setCurrentScreen('review');
  };

  const handleWelcomeComplete = () => {
    actions.setShowWelcome(false);
    actions.setCurrentScreen('challenge-selection');
  };

  // Global shortcuts integration
  const globalShortcuts = useGlobalShortcuts({
    handlers: {
      onCommandPalette: () => actions.setShowCommandPalette(true),
      onNavigateToScreen: (screen: string) => {
        if (screen === 'challenge-selection') {
          actions.setSelectedChallenge(null);
          actions.setPhase('design');
          actions.setCurrentScreen('challenge-selection');
          actions.setShowDevScenarios(false);
        }
      },
    },
    currentScreen,
    selectedChallenge,
  });

  // Development shortcuts integration
  const devShortcuts = useDevShortcuts({
    handlers: {
      onToggleScenarios: () => {
        if (isDevelopment()) {
          const newShowDev = !showDevScenarios;
          actions.setShowDevScenarios(newShowDev);
          if (newShowDev) {
            // Update URL to /dev/scenarios
            window.history.pushState({}, '', '/dev/scenarios');
          } else {
            // Go back to previous route
            window.history.back();
          }
        }
      },
      onToggleDemoMode: () => {
        actions.setIsDemoMode(!isDemoMode);
      },
      onReset: () => {
        if (showDevScenarios) {
          actions.setShowDevScenarios(false);
          window.history.pushState({}, '', '/');
        }
        // Reset main app state
        actions.setSelectedChallenge(null);
        actions.setPhase('design');
        actions.setCurrentScreen('challenge-selection');
        actions.setAudioData(null);
        actions.setShowCommandPalette(false);
      },
    },
    enabled: isDevelopment(),
    scenarioViewerActive: showDevScenarios,
  });

  // Legacy keyboard shortcuts for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close command palette
      if (e.key === 'Escape' && showCommandPalette) {
        actions.setShowCommandPalette(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette]);

  const Screen = () => {
    // Development-only scenario viewer
    if (isDevelopment() && showDevScenarios) {
      return <ScenarioViewer />;
    }

    // Show welcome screen first
    if (showWelcome) {
      return <WelcomeOverlay onComplete={handleWelcomeComplete} />;
    }

    if (!selectedChallenge) {
      return (
        <ChallengeSelection
          availableChallenges={availableChallenges}
          onChallengeSelect={(c: Challenge) => {
            actions.setSelectedChallenge(c);
            actions.setPhase('design');
            actions.setCurrentScreen('design-canvas');
          }}
        />
      );
    }

    if (phase === 'audio-recording') {
      return (
        <AudioRecording
          challenge={selectedChallenge}
          designData={designData}
          onComplete={handleAudioComplete}
          onBack={() => {
            actions.setPhase('design');
            actions.setCurrentScreen('design-canvas');
          }}
        />
      );
    }

    if (phase === 'review' && audioData) {
      return (
        <ReviewScreen
          challenge={selectedChallenge}
          designData={designData}
          audioData={audioData}
          onStartOver={() => {
            actions.setSelectedChallenge(null);
            actions.setPhase('design');
            actions.setAudioData(null);
            actions.setCurrentScreen('challenge-selection');
          }}
          onBackToDesign={() => {
            actions.setPhase('design');
            actions.setCurrentScreen('design-canvas');
          }}
          onBackToAudio={() => {
            actions.setPhase('audio-recording');
            actions.setCurrentScreen('audio-recording');
          }}
        />
      );
    }

    // Show config page if requested
    if (currentScreen === 'config') {
      return (
        <ConfigPage
          onBack={() => {
            actions.setCurrentScreen('design-canvas');
          }}
        />
      );
    }

    // Default to design canvas
    return (
      <DesignCanvas
        challenge={selectedChallenge}
        initialData={designData}
        onComplete={handleComplete}
        onBack={() => {
          actions.setSelectedChallenge(null);
          actions.setPhase('design');
          actions.setCurrentScreen('challenge-selection');
        }}
      />
    );
  };

  return (
    <div className='w-full h-full'>
      <Suspense fallback={<div className='p-4'>Loading…</div>}>
        <Screen />
      </Suspense>

      {/* Command Palette */}
      {features.commandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => actions.setShowCommandPalette(false)}
          currentScreen={selectedChallenge ? currentScreen : 'challenge-selection'}
          onNavigate={screen => {
            if (screen === 'challenge-selection') {
              actions.setSelectedChallenge(null);
              actions.setPhase('design');
              actions.setCurrentScreen('challenge-selection');
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
          }}
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
        onRetry={
          recovery.lastRecoveryResult && !recovery.lastRecoveryResult.success
            ? () => {
                if (recovery.lastRecoveryResult) {
                  // Create an error to retry recovery
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
                }
              }
            : undefined
        }
      />

      {features.diagnostics && isDevelopment() ? (
        <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 11, opacity: 0.5 }}>
          Variant: {variant} | Recovery: {recovery.isRecovering ? 'Active' : 'Ready'}
        </div>
      ) : null}
    </div>
  );
}

// Main app container with recovery provider
export default function AppContainer() {
  const [resetCounter, setResetCounter] = React.useState(0);

  // Listen for controlled component reset requests from recovery strategies
  React.useEffect(() => {
    const handler = () => setResetCounter(c => c + 1);
    window.addEventListener('archicomm:component-reset', handler as EventListener);
    return () => window.removeEventListener('archicomm:component-reset', handler as EventListener);
  }, []);

  return (
    <RecoveryProvider>
      {/* key change forces controlled remount */}
      <AppContent key={resetCounter} />
    </RecoveryProvider>
  );
}
