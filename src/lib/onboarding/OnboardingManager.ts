// src/lib/onboarding/OnboardingManager.ts
// Zustand-based onboarding state management
// Manages onboarding flows and steps with React reactivity
// RELEVANT FILES: OnboardingOverlay.tsx, WelcomeOverlay.tsx, modules/onboarding/index.ts, modules/settings/index.tsx

import { create } from 'zustand';
import { markOnboardingFlowCompleted } from '../../modules/settings';
import { simplifiedTourFlow } from './SimplifiedTour';

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface OnboardingFlow {
  id: string;
  name: string;
  steps: OnboardingStep[];
}

export interface OnboardingState {
  isActive: boolean;
  currentFlow: OnboardingFlow | null;
  currentStep: OnboardingStep | null;
  currentStepIndex: number;
  isVisible: boolean;
  registeredFlows: Record<string, OnboardingFlow>;
}

export interface OnboardingActions {
  registerFlow: (flow: OnboardingFlow) => void;
  startOnboarding: (flowId: string) => boolean;
  nextStep: () => boolean;
  previousStep: () => boolean;
  completeOnboarding: () => void;
  cancelOnboarding: () => void;
  setVisible: (visible: boolean) => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

// Register default flows
const registerDefaultFlows = (): Record<string, OnboardingFlow> => {
  const flows: Record<string, OnboardingFlow> = {};

  // Guided tour flow
  flows['guided-tour'] = {
    id: 'guided-tour',
    name: 'Complete Guided Tour',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to ArchiComm!',
        content: "Let's take a complete tour to get you started with creating architectural designs.",
        targetSelector: '',
        placement: 'center',
      },
      {
        id: 'canvas-intro',
        title: 'Design Canvas',
        content: "This is your main workspace where you'll create and edit your architectural designs.",
        targetSelector: '[data-testid="design-canvas"]',
        placement: 'top',
      },
      {
        id: 'component-palette',
        title: 'Component Palette',
        content: 'Use this palette to add architectural components to your design.',
        targetSelector: '[data-testid="component-palette"]',
        placement: 'right',
      },
      {
        id: 'properties-panel',
        title: 'Properties Panel',
        content: 'Configure selected components here. Adjust colors, sizes, and other properties.',
        targetSelector: '[data-testid="properties-panel"]',
        placement: 'left',
      },
      {
        id: 'toolbar',
        title: 'Canvas Toolbar',
        content: 'Access canvas tools like zoom, pan, and export options.',
        targetSelector: '[data-testid="canvas-toolbar"]',
        placement: 'bottom',
      },
      {
        id: 'command-palette',
        title: 'Command Palette',
        content: 'Press Ctrl/⌘+K anytime to access commands, search, and get help.',
        targetSelector: '[data-testid="command-palette-trigger"]',
        placement: 'bottom',
      },
    ],
  };

  // Register simplified tour
  flows['simplified-tour'] = simplifiedTourFlow;

  return flows;
};

// Create the Zustand store
export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  // Initial state
  isActive: false,
  currentFlow: null,
  currentStep: null,
  currentStepIndex: 0,
  isVisible: false,
  registeredFlows: registerDefaultFlows(),

  // Actions
  registerFlow: (flow: OnboardingFlow) => {
    set((state) => ({
      registeredFlows: {
        ...state.registeredFlows,
        [flow.id]: flow,
      },
    }));
  },

  startOnboarding: (flowId: string) => {
    const state = get();
    const flow = state.registeredFlows[flowId];

    if (!flow || flow.steps.length === 0) {
      return false;
    }

    set({
      isActive: true,
      currentFlow: flow,
      currentStepIndex: 0,
      currentStep: flow.steps[0],
      isVisible: true,
    });

    return true;
  },

  nextStep: () => {
    const state = get();
    const { currentFlow, currentStepIndex } = state;

    if (!currentFlow) {
      return false;
    }

    // Check if we're at the last step
    if (currentStepIndex >= currentFlow.steps.length - 1) {
      // Complete the onboarding instead of cycling
      get().completeOnboarding();
      return true;
    }

    // Move to next step
    const nextIndex = currentStepIndex + 1;
    set({
      currentStepIndex: nextIndex,
      currentStep: currentFlow.steps[nextIndex],
    });

    return true;
  },

  previousStep: () => {
    const state = get();
    const { currentFlow, currentStepIndex } = state;

    if (currentStepIndex <= 0 || !currentFlow) {
      return false;
    }

    const prevIndex = currentStepIndex - 1;
    set({
      currentStepIndex: prevIndex,
      currentStep: currentFlow.steps[prevIndex],
    });

    return true;
  },

  completeOnboarding: () => {
    const state = get();
    const currentFlowId = state.currentFlow?.id;

    // Mark the flow as completed in settings
    if (currentFlowId) {
      markOnboardingFlowCompleted(currentFlowId);
    }

    // Reset state
    set({
      isActive: false,
      isVisible: false,
      currentFlow: null,
      currentStep: null,
      currentStepIndex: 0,
    });
  },

  cancelOnboarding: () => {
    // Cancel without marking as completed
    set({
      isActive: false,
      isVisible: false,
      currentFlow: null,
      currentStep: null,
      currentStepIndex: 0,
    });
  },

  setVisible: (visible: boolean) => {
    set({ isVisible: visible });
  },
}));

// React hook for easy integration (wrapper around the store)
export const useOnboarding = () => {
  const store = useOnboardingStore();

  return {
    startOnboarding: store.startOnboarding,
    nextStep: store.nextStep,
    previousStep: store.previousStep,
    completeOnboarding: store.completeOnboarding,
    cancelOnboarding: store.cancelOnboarding,
    isActive: store.isActive,
    isVisible: store.isVisible,
    setVisible: store.setVisible,
    currentFlow: store.currentFlow,
    currentStep: store.currentStep,
    currentStepIndex: store.currentStepIndex,
    registerFlow: store.registerFlow,
  };
};
