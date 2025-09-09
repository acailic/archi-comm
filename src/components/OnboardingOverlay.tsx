import React, { useEffect, useState } from 'react';
import { useOnboarding, OnboardingStep } from '../lib/onboarding/OnboardingManager';
import { Button } from './ui/button';

interface OnboardingOverlayProps {
  className?: string;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ className = '' }) => {
  const {
    nextStep,
    previousStep,
    skipStep,
    cancelOnboarding,
    getCurrentStep,
    getCurrentFlow,
    isVisible,
  } = useOnboarding();

  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);

  // Update current step when onboarding state changes
  useEffect(() => {
    const step = getCurrentStep();
    setCurrentStep(step);
  }, [getCurrentStep]);

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSkip = () => {
    skipStep();
  };

  const handleCancel = () => {
    cancelOnboarding();
  };

  const renderTooltip = () => {
    if (!currentStep) return null;

    const flow = getCurrentFlow();
    const isFirstStep = flow?.steps[0]?.id === currentStep.id;
    const isLastStep = flow?.steps[flow.steps.length - 1]?.id === currentStep.id;

    return (
      <div className='bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto'>
        <h3 className='text-xl font-semibold text-gray-900 mb-3'>{currentStep.title}</h3>

        <div className='text-gray-700 mb-6'>{currentStep.content}</div>

        <div className='flex justify-between space-x-3'>
          <div className='flex space-x-2'>
            {!isFirstStep && (
              <Button variant='outline' onClick={handlePrevious}>
                Previous
              </Button>
            )}

            <Button variant='outline' onClick={handleSkip}>
              Skip
            </Button>
          </div>

          <div className='flex space-x-2'>
            <Button variant='outline' onClick={handleCancel}>
              Close
            </Button>

            <Button onClick={handleNext}>{isLastStep ? 'Complete' : 'Next'}</Button>
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible() || !currentStep) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Semi-transparent overlay */}
      <div className='absolute inset-0 bg-black bg-opacity-50' onClick={handleCancel} />

      {/* Tooltip */}
      <div className='relative z-10'>{renderTooltip()}</div>
    </div>
  );
};

export default OnboardingOverlay;
