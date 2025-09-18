import React, { Suspense, useEffect, useMemo, useCallback } from 'react';
import { isDevelopment, isTauriEnvironment } from '@/lib/environment';
import { CommandPalette } from '@ui/components/CommandPalette';
import { getLogger } from '@/lib/logger';
import { challengeManager } from '@/lib/challenge-config';
import type { DesignData, AudioData } from '@/shared/contracts/index';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useDevShortcuts } from '@/dev/DevShortcuts';
import { useRecovery } from '@/lib/recovery/RecoveryContext';
import { RecoveryOverlay } from '@ui/components/RecoveryOverlay';
import { useAppStore, useAppStoreSelector } from '@/hooks/useAppStore';
import { TooltipProvider } from '@ui/components/ui/tooltip';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useAppPersistence } from '../../hooks/useAppPersistence';
import { useInfiniteLoopRecovery } from '../../hooks/useInfiniteLoopRecovery';
import { useDevToggles } from '../../hooks/useDevToggles';
import { ScreenRouter } from './ScreenRouter';
import { RecoveryStatusWidget } from './components/RecoveryStatusWidget';

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
export function AppContent() {
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

  // Use extracted hooks
  const { persistChanged } = useAppPersistence({
    designData,
    audioData,
    selectedChallenge,
    variant,
    features,
    currentScreen,
    phase,
    isDemoMode,
  });

  const navigation = useAppNavigation({ selectedChallenge, audioData });
  const infiniteLoopRecovery = useInfiniteLoopRecovery({ persistChanged });

  const { handleToggleScenarios, handleToggleDemoMode, handleDevReset } = useDevToggles({
    actions,
    showDevScenarios,
    isDemoMode,
  });

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

  // Global shortcuts integration
  const globalShortcuts = useGlobalShortcuts({
    handlers: {
      onCommandPalette: navigation.handleOpenCommandPalette,
      onNavigateToScreen: navigation.handleNavigateToScreenShortcut,
    },
    currentScreen,
    selectedChallenge,
  });

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
            onInfiniteLoopReset={infiniteLoopRecovery.handleInfiniteLoopReset}
            onRequestRecovery={infiniteLoopRecovery.requestRecovery}
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

        {features.diagnostics && isDevelopment() ? (
          <RecoveryStatusWidget variant={variant} isRecovering={recovery.isRecovering} />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
