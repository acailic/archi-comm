import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

import { createContainer, type Container } from '@/lib/di/Container';
import { ServiceProvider } from '@/lib/di/ServiceProvider';
import { LoggerProvider } from '@/lib/logging/LoggerProvider';
import { RecoveryProvider } from '@/lib/recovery/RecoveryContext';
import { AccessibilityProvider } from '@ui/components/accessibility/AccessibilityProvider';
import { appStore, type AppState } from '@/stores/AppStore';
import { useCanvasStore, type CanvasState } from '@/stores/canvasStore';

interface RenderWithAppProvidersOptions extends RenderOptions {
  appState?: Partial<AppState>;
  canvasState?: Partial<CanvasState>;
  configureContainer?: (container: Container) => void;
}

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

export const resetTestStores = () => {
  appStore.resetToInitial();
  useCanvasStore.setState(state => ({
    ...state,
    components: [],
    connections: [],
    infoCards: [],
    selectedComponent: null,
    connectionStart: null,
  }));
};

const seedAppState = (partial: Partial<AppState>) => {
  const actions = appStore.actions;

  if (partial.selectedChallenge !== undefined) {
    actions.setSelectedChallenge(partial.selectedChallenge ?? null);
  }
  if (partial.designData !== undefined) {
    actions.setDesignData(partial.designData);
  }
  if (partial.audioData !== undefined) {
    actions.setAudioData(partial.audioData ?? null);
  }
  if (partial.phase !== undefined) {
    actions.setPhase(partial.phase);
  }
  if (partial.availableChallenges !== undefined) {
    actions.setAvailableChallenges(partial.availableChallenges);
  }
  if (partial.showCommandPalette !== undefined) {
    actions.setShowCommandPalette(partial.showCommandPalette);
  }
  if (partial.currentScreen !== undefined) {
    actions.setCurrentScreen(partial.currentScreen);
  }
  if (partial.showDevScenarios !== undefined) {
    actions.setShowDevScenarios(partial.showDevScenarios);
  }
  if (partial.isDemoMode !== undefined) {
    actions.setIsDemoMode(partial.isDemoMode);
  }
  if (partial.showWelcome !== undefined) {
    actions.setShowWelcome(partial.showWelcome);
  }
};

export function renderWithAppProviders(
  ui: React.ReactElement,
  { appState, canvasState, configureContainer, ...renderOptions }: RenderWithAppProvidersOptions = {}
): RenderResult {
  resetTestStores();
  if (appState) {
    seedAppState(appState);
  }
  if (canvasState) {
    useCanvasStore.setState(state => ({ ...state, ...canvasState }));
  }

  const container = createContainer();
  configureContainer?.(container);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <LoggerProvider scope='test'>
      <RecoveryProvider>
        <AccessibilityProvider>
          <ServiceProvider container={container}>{children}</ServiceProvider>
        </AccessibilityProvider>
      </RecoveryProvider>
    </LoggerProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
