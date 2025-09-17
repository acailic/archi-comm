export { WelcomeOverlay } from '@ui/components/WelcomeOverlay';

// Basic Onboarding Components
export { OnboardingManager, useOnboarding } from '../../lib/onboarding/OnboardingManager';
export { default as OnboardingOverlay } from '@ui/components/OnboardingOverlay';

// Onboarding Flow Types
export type {
  OnboardingStep,
  OnboardingFlow,
  OnboardingState,
} from '../../lib/onboarding/OnboardingManager';

// Basic Flow Utilities
export const createOnboardingStep = (
  id: string,
  title: string,
  content: string,
  targetSelector: string,
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom'
): import('../../lib/onboarding/OnboardingManager').OnboardingStep => ({
  id,
  title,
  content,
  targetSelector,
  placement,
});

export const createOnboardingFlow = (
  id: string,
  name: string,
  steps: import('../../lib/onboarding/OnboardingManager').OnboardingStep[]
): import('../../lib/onboarding/OnboardingManager').OnboardingFlow => ({
  id,
  name,
  steps,
});
