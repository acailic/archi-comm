import React, { Suspense, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { storage } from '@/services/storage';

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

  const persistChanged = useCallback(async () => {
    // Compute current serialized snapshots
    const nextDesign = designData && Object.keys(designData).length > 0 ? JSON.stringify(designData) : '';
    const nextAudio = audioData ? JSON.stringify(audioData) : '';
    const userPreferences = JSON.stringify({ variant, features, currentScreen, phase, isDemoMode });
    const nextProjectId = selectedChallenge?.id ?? '';

    const last = lastSerializedRef.current;

    try {
      // Only persist changed entries
      if (nextDesign !== last.design) {
        if (nextDesign) {
          safeLocalSet('current_design', nextDesign);
        }
        last.design = nextDesign;
      }

      if (nextAudio !== last.audio) {
        if (nextAudio) {
          try {
            // Large data -> IndexedDB via localforage-backed storage
            await storage.setItem('current_audio', nextAudio);
          } catch (e: any) {
            try {
              // Final fallback to sessionStorage if both IDB and localStorage fail
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
        }
        last.projectId = nextProjectId;
      }

      if (userPreferences !== last.prefs) {
        safeLocalSet('user_preferences', userPreferences);
        last.prefs = userPreferences;
      }
    } catch (error) {
      logger.warn('Failed to update recovery context', error);
    }
  }, [designData, audioData, selectedChallenge, variant, features, currentScreen, phase, isDemoMode, safeLocalSet]);

  const schedulePersist = useCallback(() => {
    // Clear any pending idle callback
    if (idleCallbackId.current != null && 'cancelIdleCallback' in window) {
      // @ts-expect-error cancelIdleCallback exists in browsers
      (window as any).cancelIdleCallback(idleCallbackId.current);
      idleCallbackId.current = null;
    }
    // Clear debounce timer
    if (debounceTimer.current != null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    // Prefer requestIdleCallback if available; otherwise debounce ~500ms
    if ('requestIdleCallback' in window) {
      // @ts-expect-error requestIdleCallback exists in browsers
      idleCallbackId.current = (window as any).requestIdleCallback(() => {
        persistChanged();
        idleCallbackId.current = null;
      }, { timeout: 1000 });
    } else {
      debounceTimer.current = window.setTimeout(() => {
        persistChanged();
        debounceTimer.current = null;
      }, 500);
    }
  }, [persistChanged]);

  // Set up recovery context provider to give current app state to recovery system
  const updateRecoveryContext = useCallback(() => {
    schedulePersist();
  }, [schedulePersist]);

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

  const handleComplete = useCallback((data: DesignData) => {
    actions.setDesignData(data);
    actions.setPhase('audio-recording');
    actions.setCurrentScreen('audio-recording');
  }, [actions]);

  const handleAudioComplete = useCallback((data: AudioData) => {
    actions.setAudioData(data);
    actions.setPhase('review');
    actions.setCurrentScreen('review');
  }, [actions]);

  const handleWelcomeComplete = useCallback(() => {
    actions.setShowWelcome(false);
    actions.setCurrentScreen('challenge-selection');
  }, [actions]);

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

  // Listen for toolbar navigation events (e.g., settings/config)
  useEffect(() => {
    const toConfig = () => actions.setCurrentScreen('config');
    window.addEventListener('navigate:config', toConfig as EventListener);
    return () => window.removeEventListener('navigate:config', toConfig as EventListener);
  }, [actions]);

  // Global shortcuts integration
  const globalShortcuts = useGlobalShortcuts({
    handlers: {
      onCommandPalette: handleOpenCommandPalette,
      onNavigateToScreen: handleNavigateToScreenShortcut,
    },
    currentScreen,
    selectedChallenge,
  });

  // Development shortcuts integration
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

  const devShortcuts = useDevShortcuts({
    handlers: {
      onToggleScenarios: handleToggleScenarios,
      onToggleDemoMode: handleToggleDemoMode,
      onReset: handleDevReset,
    },
    enabled: isDevelopment(),
    scenarioViewerActive: showDevScenarios,
  });

  // Legacy keyboard shortcuts for command palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showCommandPalette) {
      actions.setShowCommandPalette(false);
    }
  }, [actions, showCommandPalette]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
          onChallengeSelect={handleChallengeSelect}
        />
      );
    }

    if (phase === 'audio-recording') {
      return (
        <AudioRecording
          challenge={selectedChallenge}
          designData={designData}
          onComplete={handleAudioComplete}
          onBack={handleBackFromAudio}
        />
      );
    }

    if (phase === 'review' && audioData) {
      return (
        <ReviewScreen
          challenge={selectedChallenge}
          designData={designData}
          audioData={audioData}
          onStartOver={handleStartOver}
          onBackToDesign={handleBackToDesign}
          onBackToAudio={handleBackToAudio}
        />
      );
    }

    // Show config page if requested
    if (currentScreen === 'config') {
      return (
        <ConfigPage onBack={handleConfigBack} />
      );
    }

    // Default to design canvas
    return (
      <DesignCanvas
        challenge={selectedChallenge}
        initialData={designData}
        onComplete={handleComplete}
        onBack={handleBackToSelection}
      />
    );
  };

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
    <div className='w-full h-full'>
      <Suspense fallback={<div className='p-4'>Loading…</div>}>
        <Screen />
      </Suspense>

      {/* Command Palette */}
      {features.commandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={handlePaletteClose}
          currentScreen={selectedChallenge ? currentScreen : 'challenge-selection'}
          onNavigate={handleNavigateFromPalette}
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
