// src/packages/ui/components/overlays/WelcomeOverlay.tsx
// Welcome screen shown to first-time users
// Provides options for guided tour, simplified tour, or skip
// RELEVANT FILES: OnboardingManager.ts, ScreenRouter.tsx, modules/settings/index.tsx, OnboardingOverlay.tsx

import { ArrowRight, Users, Book, Zap } from 'lucide-react';
import { useOnboarding } from '@/lib/onboarding/OnboardingManager';
import { markOnboardingFlowCompleted } from '@/modules/settings';
import { Button } from '@ui/components/ui/button';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

export function WelcomeOverlay({ onComplete }: WelcomeOverlayProps) {
  const { startOnboarding } = useOnboarding();

  const handleFullTour = () => {
    markOnboardingFlowCompleted('welcome');
    startOnboarding('guided-tour');
    onComplete();
  };

  const handleSimplifiedTour = () => {
    markOnboardingFlowCompleted('welcome');
    startOnboarding('simplified-tour');
    onComplete();
  };

  const handleSkipAll = () => {
    // Mark all tutorial flows as completed
    markOnboardingFlowCompleted('welcome');
    markOnboardingFlowCompleted('guided-tour');
    markOnboardingFlowCompleted('canvas-tour');
    markOnboardingFlowCompleted('simplified-tour');
    onComplete();
  };

  return (
    <div
      className='absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-8'
      role='dialog'
      aria-modal='true'
      aria-labelledby='welcome-title'
      aria-describedby='welcome-description'
    >
      <div className='max-w-md mx-auto text-center space-y-6'>
        {/* Logo */}
        <div className='mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg'>
          <Users className='w-8 h-8 text-primary-foreground' />
        </div>

        {/* Title */}
        <h1 id='welcome-title' className='text-3xl font-bold text-foreground'>
          Welcome to ArchiComm
        </h1>

        {/* Description */}
        <p id='welcome-description' className='text-muted-foreground leading-relaxed'>
          A community tool for learning architectural design and communication. Create designs,
          practice explanations, and improve your skills.
        </p>

        {/* Action Buttons */}
        <div className='space-y-3 pt-4'>
          <Button onClick={handleFullTour} size='lg' className='w-full'>
            <Book className='w-4 h-4 mr-2' />
            Take the Full Tour
            <ArrowRight className='w-4 h-4 ml-2' />
          </Button>

          <Button variant='secondary' onClick={handleSimplifiedTour} size='lg' className='w-full'>
            <Zap className='w-4 h-4 mr-2' />
            Just the Basics
          </Button>

          <Button variant='outline' onClick={handleSkipAll} className='w-full'>
            Skip All Tutorials
          </Button>
        </div>

        <p className='text-xs text-muted-foreground'>Free community version • No signup required</p>
      </div>
    </div>
  );
}
