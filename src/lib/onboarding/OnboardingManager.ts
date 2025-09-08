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
}

export class OnboardingManager {
  private static instance: OnboardingManager | null = null;
  
  private flows: Map<string, OnboardingFlow> = new Map();
  private state: OnboardingState = {
    isActive: false,
    currentFlow: null,
    currentStep: null,
    currentStepIndex: 0,
    isVisible: false
  };

  private constructor() {
    this.registerDefaultFlows();
  }

  public static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  // Flow management
  public registerFlow(flow: OnboardingFlow): void {
    this.flows.set(flow.id, flow);
  }

  public getFlow(flowId: string): OnboardingFlow | null {
    return this.flows.get(flowId) || null;
  }

  // Onboarding control
  public startOnboarding(flowId: string): boolean {
    const flow = this.getFlow(flowId);
    if (!flow || flow.steps.length === 0) {
      return false;
    }

    this.state.isActive = true;
    this.state.currentFlow = flow;
    this.state.currentStepIndex = 0;
    this.state.currentStep = flow.steps[0];
    this.state.isVisible = true;

    return true;
  }

  public nextStep(): boolean {
    if (!this.state.currentFlow || this.state.currentStepIndex >= this.state.currentFlow.steps.length - 1) {
      return this.completeOnboarding();
    }

    this.state.currentStepIndex++;
    this.state.currentStep = this.state.currentFlow.steps[this.state.currentStepIndex];
    return true;
  }

  public previousStep(): boolean {
    if (this.state.currentStepIndex <= 0 || !this.state.currentFlow) {
      return false;
    }

    this.state.currentStepIndex--;
    this.state.currentStep = this.state.currentFlow.steps[this.state.currentStepIndex];
    return true;
  }

  public skipStep(): boolean {
    return this.nextStep();
  }

  public completeOnboarding(): boolean {
    this.state.isActive = false;
    this.state.isVisible = false;
    this.state.currentFlow = null;
    this.state.currentStep = null;
    this.state.currentStepIndex = 0;
    return true;
  }

  public cancelOnboarding(): void {
    this.completeOnboarding();
  }

  // State getters
  public getState(): Readonly<OnboardingState> {
    return { ...this.state };
  }

  public isActive(): boolean {
    return this.state.isActive;
  }

  public isVisible(): boolean {
    return this.state.isVisible;
  }

  public setVisible(visible: boolean): void {
    this.state.isVisible = visible;
  }

  public getCurrentFlow(): OnboardingFlow | null {
    return this.state.currentFlow;
  }

  public getCurrentStep(): OnboardingStep | null {
    return this.state.currentStep;
  }

  // Private methods
  private registerDefaultFlows(): void {
    this.registerFlow({
      id: 'first-time-user',
      name: 'Welcome to ArchiComm',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to ArchiComm!',
          content: 'Let\'s take a quick tour to get you started with creating your first architectural design.',
          targetSelector: 'center',
          placement: 'center'
        },
        {
          id: 'canvas-intro',
          title: 'Design Canvas',
          content: 'This is your main workspace where you\'ll create and edit your architectural designs.',
          targetSelector: '[data-testid="design-canvas"]',
          placement: 'top'
        },
        {
          id: 'component-palette',
          title: 'Component Palette',
          content: 'Use this palette to add architectural components like walls, doors, and windows to your design.',
          targetSelector: '[data-testid="component-palette"]',
          placement: 'right'
        }
      ]
    });
  }
}

// React hook for easy integration
export const useOnboarding = () => {
  const manager = OnboardingManager.getInstance();
  
  return {
    startOnboarding: (flowId: string) => manager.startOnboarding(flowId),
    nextStep: () => manager.nextStep(),
    previousStep: () => manager.previousStep(),
    skipStep: () => manager.skipStep(),
    completeOnboarding: () => manager.completeOnboarding(),
    cancelOnboarding: () => manager.cancelOnboarding(),
    isActive: () => manager.isActive(),
    isVisible: () => manager.isVisible(),
    setVisible: (visible: boolean) => manager.setVisible(visible),
    getCurrentFlow: () => manager.getCurrentFlow(),
    getCurrentStep: () => manager.getCurrentStep()
  };
};
