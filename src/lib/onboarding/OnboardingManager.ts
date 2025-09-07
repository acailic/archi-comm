import { UXOptimizer } from '../user-experience/UXOptimizer';
import { KeyboardShortcutManager } from '../shortcuts/KeyboardShortcuts';

export interface OnboardingStep {
  id: string;
  title: string;
  content: string | (() => string);
  targetSelector: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  prerequisites?: string[];
  skipCondition?: () => boolean;
  action?: () => void;
  validation?: () => boolean;
  responsive?: {
    mobile?: Partial<Omit<OnboardingStep, 'responsive'>>;
    tablet?: Partial<Omit<OnboardingStep, 'responsive'>>;
  };
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  category: 'first-time' | 'feature-intro' | 'advanced-tips';
  version: string;
}

export interface OnboardingProgress {
  flowId: string;
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: number;
  lastAccessedAt: number;
  completed: boolean;
}

export interface OnboardingState {
  isActive: boolean;
  currentFlow: OnboardingFlow | null;
  currentStep: OnboardingStep | null;
  progress: OnboardingProgress | null;
  isVisible: boolean;
}

export type OnboardingEventType = 
  | 'flow-started'
  | 'step-changed' 
  | 'step-completed'
  | 'step-skipped'
  | 'flow-completed'
  | 'flow-cancelled'
  | 'visibility-changed';

export interface OnboardingEvent {
  type: OnboardingEventType;
  data: any;
}

export class OnboardingManager {
  private static instance: OnboardingManager | null = null;
  
  private flows: Map<string, OnboardingFlow> = new Map();
  private state: OnboardingState = {
    isActive: false,
    currentFlow: null,
    currentStep: null,
    progress: null,
    isVisible: false
  };
  private eventListeners: Map<OnboardingEventType, ((event: OnboardingEvent) => void)[]> = new Map();
  private storageKey = 'archicomm_onboarding_progress';
  private shortcutsDisabled = false;

  private constructor() {
    this.loadProgress();
    this.registerDefaultFlows();
  }

  public static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  // Event system
  public addEventListener(type: OnboardingEventType, callback: (event: OnboardingEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(callback);
  }

  public removeEventListener(type: OnboardingEventType, callback: (event: OnboardingEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(type: OnboardingEventType, data: any = null): void {
    const event: OnboardingEvent = { type, data };
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(callback => callback(event));

    // Track onboarding events with UXOptimizer
    UXOptimizer.getInstance().trackAction(`onboarding_${type}`, {
      flowId: this.state.currentFlow?.id,
      stepId: this.state.currentStep?.id,
      ...data
    });
  }

  // Flow management
  public registerFlow(flow: OnboardingFlow): void {
    this.flows.set(flow.id, flow);
  }

  public getFlow(flowId: string): OnboardingFlow | null {
    return this.flows.get(flowId) || null;
  }

  public getAllFlows(): OnboardingFlow[] {
    return Array.from(this.flows.values());
  }

  public getFlowsByCategory(category: OnboardingFlow['category']): OnboardingFlow[] {
    return this.getAllFlows().filter(flow => flow.category === category);
  }

  public getFlowsBySkillLevel(skillLevel: OnboardingFlow['skillLevel']): OnboardingFlow[] {
    return this.getAllFlows().filter(flow => flow.skillLevel === skillLevel);
  }

  // Onboarding control
  public async startOnboarding(flowId: string): Promise<boolean> {
    const flow = this.getFlow(flowId);
    if (!flow) {
      console.warn(`Onboarding flow '${flowId}' not found`);
      return false;
    }

    // Disable keyboard shortcuts during onboarding
    if (!this.shortcutsDisabled) {
      KeyboardShortcutManager.getInstance().setEnabled(false);
      this.shortcutsDisabled = true;
    }

    this.state.isActive = true;
    this.state.currentFlow = flow;
    this.state.progress = {
      flowId,
      currentStepIndex: 0,
      completedSteps: [],
      skippedSteps: [],
      startedAt: Date.now(),
      lastAccessedAt: Date.now(),
      completed: false
    };

    await this.goToStep(0);
    this.saveProgress();
    this.emit('flow-started', { flowId, flow });

    return true;
  }

  public async goToStep(stepIndex: number): Promise<boolean> {
    if (!this.state.currentFlow || stepIndex >= this.state.currentFlow.steps.length || stepIndex < 0) {
      return false;
    }

    const step = this.state.currentFlow.steps[stepIndex];
    
    // Check prerequisites
    if (step.prerequisites) {
      const unmetPrerequisites = step.prerequisites.filter(
        prereq => !this.state.progress?.completedSteps.includes(prereq)
      );
      if (unmetPrerequisites.length > 0) {
        console.warn(`Step '${step.id}' has unmet prerequisites: ${unmetPrerequisites.join(', ')}`);
        return false;
      }
    }

    // Check skip condition
    if (step.skipCondition && step.skipCondition()) {
      return this.skipStep();
    }

    // Validate target element exists
    if (step.targetSelector !== 'center') {
      const targetElement = document.querySelector(step.targetSelector);
      if (!targetElement) {
        console.warn(`Target element '${step.targetSelector}' not found for step '${step.id}'`);
        // Try again after a short delay
        setTimeout(() => this.goToStep(stepIndex), 500);
        return false;
      }
    }

    this.state.currentStep = step;
    if (this.state.progress) {
      this.state.progress.currentStepIndex = stepIndex;
      this.state.progress.lastAccessedAt = Date.now();
    }
    
    this.state.isVisible = true;
    this.saveProgress();
    this.emit('step-changed', { step, stepIndex });

    return true;
  }

  public async nextStep(): Promise<boolean> {
    if (!this.state.currentFlow || !this.state.progress || !this.state.currentStep) {
      return false;
    }

    // Execute step action if present
    if (this.state.currentStep.action) {
      this.state.currentStep.action();
    }

    // Validate step completion if validation function exists
    if (this.state.currentStep.validation && !this.state.currentStep.validation()) {
      console.warn(`Step '${this.state.currentStep.id}' validation failed`);
      return false;
    }

    // Mark current step as completed
    this.state.progress.completedSteps.push(this.state.currentStep.id);
    this.emit('step-completed', { stepId: this.state.currentStep.id });

    // Check if this was the last step
    if (this.state.progress.currentStepIndex >= this.state.currentFlow.steps.length - 1) {
      return this.completeOnboarding();
    }

    // Move to next step
    return this.goToStep(this.state.progress.currentStepIndex + 1);
  }

  public async previousStep(): Promise<boolean> {
    if (!this.state.progress || this.state.progress.currentStepIndex <= 0) {
      return false;
    }

    return this.goToStep(this.state.progress.currentStepIndex - 1);
  }

  public async skipStep(): Promise<boolean> {
    if (!this.state.currentFlow || !this.state.progress || !this.state.currentStep) {
      return false;
    }

    // Mark step as skipped
    this.state.progress.skippedSteps.push(this.state.currentStep.id);
    this.emit('step-skipped', { stepId: this.state.currentStep.id });

    // Check if this was the last step
    if (this.state.progress.currentStepIndex >= this.state.currentFlow.steps.length - 1) {
      return this.completeOnboarding();
    }

    // Move to next step
    return this.goToStep(this.state.progress.currentStepIndex + 1);
  }

  public completeOnboarding(): boolean {
    if (!this.state.progress) return false;

    this.state.progress.completed = true;
    this.state.isActive = false;
    this.state.isVisible = false;

    // Re-enable keyboard shortcuts
    if (this.shortcutsDisabled) {
      KeyboardShortcutManager.getInstance().setEnabled(true);
      this.shortcutsDisabled = false;
    }

    this.saveProgress();
    this.emit('flow-completed', { 
      flowId: this.state.progress.flowId,
      completedSteps: this.state.progress.completedSteps,
      skippedSteps: this.state.progress.skippedSteps,
      duration: Date.now() - this.state.progress.startedAt
    });

    return true;
  }

  public cancelOnboarding(): void {
    if (!this.state.progress) return;

    this.state.isActive = false;
    this.state.isVisible = false;
    
    // Re-enable keyboard shortcuts
    if (this.shortcutsDisabled) {
      KeyboardShortcutManager.getInstance().setEnabled(true);
      this.shortcutsDisabled = false;
    }

    this.emit('flow-cancelled', { 
      flowId: this.state.progress.flowId,
      stepId: this.state.currentStep?.id,
      completedSteps: this.state.progress.completedSteps
    });
  }

  // Progress management
  public getProgress(flowId?: string): OnboardingProgress | null {
    const stored = this.getStoredProgress();
    if (flowId) {
      return stored.find(p => p.flowId === flowId) || null;
    }
    return this.state.progress;
  }

  public resetProgress(flowId?: string): void {
    const stored = this.getStoredProgress();
    const updated = flowId 
      ? stored.filter(p => p.flowId !== flowId)
      : [];
    
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    
    if (!flowId || this.state.progress?.flowId === flowId) {
      this.state.progress = null;
      this.state.isActive = false;
      this.state.currentFlow = null;
      this.state.currentStep = null;
      this.state.isVisible = false;
    }
  }

  public isFlowCompleted(flowId: string): boolean {
    const progress = this.getProgress(flowId);
    return progress?.completed || false;
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
    this.emit('visibility-changed', { visible });
  }

  public getCurrentFlow(): OnboardingFlow | null {
    return this.state.currentFlow;
  }

  public getCurrentStep(): OnboardingStep | null {
    return this.state.currentStep;
  }

  // Responsive helpers
  public getCurrentStepForDevice(): OnboardingStep | null {
    if (!this.state.currentStep) return null;

    const step = { ...this.state.currentStep };
    const screenWidth = window.innerWidth;

    if (screenWidth < 768 && step.responsive?.mobile) {
      Object.assign(step, step.responsive.mobile);
    } else if (screenWidth < 1024 && step.responsive?.tablet) {
      Object.assign(step, step.responsive.tablet);
    }

    return step;
  }

  // Private methods
  private saveProgress(): void {
    if (!this.state.progress) return;

    const stored = this.getStoredProgress();
    const updated = stored.filter(p => p.flowId !== this.state.progress!.flowId);
    updated.push(this.state.progress);
    
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  private loadProgress(): void {
    const stored = this.getStoredProgress();
    
    // Find the most recently accessed incomplete flow
    const incompleteProgress = stored
      .filter(p => !p.completed)
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0];

    if (incompleteProgress) {
      this.state.progress = incompleteProgress;
      const flow = this.getFlow(incompleteProgress.flowId);
      if (flow) {
        this.state.currentFlow = flow;
        this.state.currentStep = flow.steps[incompleteProgress.currentStepIndex];
        this.state.isActive = true;
      }
    }
  }

  private getStoredProgress(): OnboardingProgress[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private registerDefaultFlows(): void {
    // Register default onboarding flows
    this.registerFlow({
      id: 'first-time-user',
      name: 'Welcome to ArchiComm',
      description: 'Get started with the basics of ArchiComm',
      skillLevel: 'beginner',
      category: 'first-time',
      version: '1.0.0',
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

    this.registerFlow({
      id: 'comprehensive-tour',
      name: 'Complete Feature Tour',
      description: 'Comprehensive walkthrough of all ArchiComm features',
      skillLevel: 'intermediate',
      category: 'feature-intro',
      version: '1.0.0',
      steps: [
        {
          id: 'canvas-overview',
          title: 'Design Canvas Overview',
          content: 'The canvas is where all your design magic happens. You can pan, zoom, and select components here.',
          targetSelector: '[data-testid="design-canvas"]',
          placement: 'top'
        },
        {
          id: 'toolbar-features',
          title: 'Toolbar Features',
          content: 'Access essential tools like selection, pan, zoom, and annotation tools from the toolbar.',
          targetSelector: '[data-testid="canvas-toolbar"]',
          placement: 'bottom'
        },
        {
          id: 'keyboard-shortcuts',
          title: 'Keyboard Shortcuts',
          content: 'Press Ctrl+K (or Cmd+K on Mac) to view available keyboard shortcuts and boost your productivity.',
          targetSelector: 'body',
          placement: 'center'
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
    getCurrentStep: () => manager.getCurrentStepForDevice(),
    getProgress: () => manager.getProgress(),
    getAllFlows: () => manager.getAllFlows(),
    getFlowsByCategory: (category: OnboardingFlow['category']) => manager.getFlowsByCategory(category),
    addEventListener: (type: OnboardingEventType, callback: (event: OnboardingEvent) => void) => 
      manager.addEventListener(type, callback),
    removeEventListener: (type: OnboardingEventType, callback: (event: OnboardingEvent) => void) => 
      manager.removeEventListener(type, callback)
  };
};