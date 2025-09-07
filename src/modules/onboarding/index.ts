export { WelcomeOverlay } from '@/components/WelcomeOverlay';

// Enhanced Onboarding Components
export { OnboardingManager, useOnboarding } from '../../lib/onboarding/OnboardingManager';
export { default as OnboardingOverlay } from '../../components/OnboardingOverlay';

// Onboarding Flow Types
export type {
  OnboardingStep,
  OnboardingFlow,
  OnboardingProgress,
  OnboardingState,
  OnboardingEventType,
  OnboardingEvent
} from '../../lib/onboarding/OnboardingManager';

// Flow Utilities
export const createOnboardingStep = (
  id: string,
  title: string,
  content: string,
  targetSelector: string,
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom',
  options: Partial<import('../../lib/onboarding/OnboardingManager').OnboardingStep> = {}
): import('../../lib/onboarding/OnboardingManager').OnboardingStep => ({
  id,
  title,
  content,
  targetSelector,
  placement,
  ...options
});

export const createOnboardingFlow = (
  id: string,
  name: string,
  description: string,
  steps: import('../../lib/onboarding/OnboardingManager').OnboardingStep[],
  skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  category: 'first-time' | 'feature-intro' | 'advanced-tips' = 'feature-intro',
  version: string = '1.0.0'
): import('../../lib/onboarding/OnboardingManager').OnboardingFlow => ({
  id,
  name,
  description,
  steps,
  skillLevel,
  category,
  version
});

// Predefined Flow Templates
export const flowTemplates = {
  quickStart: createOnboardingFlow(
    'quick-start-template',
    'Quick Start Template',
    'Basic introduction to key features',
    [
      createOnboardingStep(
        'welcome',
        'Welcome!',
        'Welcome to ArchiComm. Let\'s get you started quickly.',
        'center',
        'center'
      ),
      createOnboardingStep(
        'canvas-basics',
        'Design Canvas',
        'This is where you create your system architecture diagrams.',
        '[data-testid="design-canvas"]',
        'top'
      ),
      createOnboardingStep(
        'component-palette',
        'Component Library',
        'Drag components from here onto the canvas to build your system.',
        '[data-testid="component-palette"]',
        'right'
      )
    ],
    'beginner',
    'first-time'
  ),

  comprehensiveTour: createOnboardingFlow(
    'comprehensive-tour-template',
    'Complete Feature Tour Template',
    'Detailed walkthrough of all major features',
    [
      createOnboardingStep(
        'overview',
        'ArchiComm Overview',
        'ArchiComm helps you practice system design through interactive exercises.',
        'center',
        'center'
      ),
      createOnboardingStep(
        'challenge-selection',
        'Challenge Selection',
        'Choose from various system design challenges based on real-world scenarios.',
        '[data-testid="challenge-list"]',
        'top'
      ),
      createOnboardingStep(
        'design-workflow',
        'Design Workflow',
        'Follow the guided workflow: Design → Explain → Review.',
        '[data-testid="progress-bar"]',
        'bottom'
      ),
      createOnboardingStep(
        'shortcuts',
        'Keyboard Shortcuts',
        'Use keyboard shortcuts to work efficiently. Press Ctrl+K to see all available shortcuts.',
        'body',
        'center'
      )
    ],
    'intermediate',
    'feature-intro'
  ),

  advancedFeatures: createOnboardingFlow(
    'advanced-features-template',
    'Advanced Features Template',
    'Power-user features and advanced techniques',
    [
      createOnboardingStep(
        'performance-mode',
        'Performance Mode',
        'Enable performance mode for large designs with many components.',
        '[data-help-target="design-canvas-performance"]',
        'bottom'
      ),
      createOnboardingStep(
        'custom-shortcuts',
        'Custom Shortcuts',
        'Create and customize keyboard shortcuts for your workflow.',
        'body',
        'center'
      ),
      createOnboardingStep(
        'export-options',
        'Export Options',
        'Export your designs as JSON or high-quality images.',
        '[data-help-target="design-canvas-export"]',
        'bottom'
      )
    ],
    'advanced',
    'advanced-tips'
  )
};

// Onboarding Analytics and Progress Tracking
export const onboardingAnalytics = {
  trackStepCompletion: (flowId: string, stepId: string, duration: number) => {
    if (typeof window !== 'undefined' && (window as any).trackWorkflowAction) {
      (window as any).trackWorkflowAction('onboarding_step_completed', duration, {
        flowId,
        stepId
      });
    }
  },

  trackFlowCompletion: (flowId: string, totalDuration: number, completedSteps: number, skippedSteps: number) => {
    if (typeof window !== 'undefined' && (window as any).trackWorkflowAction) {
      (window as any).trackWorkflowAction('onboarding_flow_completed', totalDuration, {
        flowId,
        completedSteps,
        skippedSteps,
        completionRate: completedSteps / (completedSteps + skippedSteps)
      });
    }
  },

  trackFlowAbandonment: (flowId: string, stepId: string, duration: number) => {
    if (typeof window !== 'undefined' && (window as any).trackWorkflowAction) {
      (window as any).trackWorkflowAction('onboarding_flow_abandoned', duration, {
        flowId,
        abandonedAtStep: stepId
      });
    }
  }
};

// Onboarding State Persistence
export const onboardingStorage = {
  STORAGE_KEY: 'archicomm_onboarding_state',

  saveProgress: (progress: import('../../lib/onboarding/OnboardingManager').OnboardingProgress) => {
    try {
      const existing = onboardingStorage.loadAllProgress();
      const updated = existing.filter(p => p.flowId !== progress.flowId);
      updated.push(progress);
      localStorage.setItem(onboardingStorage.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  },

  loadProgress: (flowId: string): import('../../lib/onboarding/OnboardingManager').OnboardingProgress | null => {
    try {
      const all = onboardingStorage.loadAllProgress();
      return all.find(p => p.flowId === flowId) || null;
    } catch {
      return null;
    }
  },

  loadAllProgress: (): import('../../lib/onboarding/OnboardingManager').OnboardingProgress[] => {
    try {
      const stored = localStorage.getItem(onboardingStorage.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  clearProgress: (flowId?: string) => {
    try {
      if (flowId) {
        const existing = onboardingStorage.loadAllProgress();
        const filtered = existing.filter(p => p.flowId !== flowId);
        localStorage.setItem(onboardingStorage.STORAGE_KEY, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(onboardingStorage.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear onboarding progress:', error);
    }
  }
};