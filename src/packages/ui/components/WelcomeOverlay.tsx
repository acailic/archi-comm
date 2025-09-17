import React from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { useOnboarding } from '@/lib/onboarding/OnboardingManager';
import { Button } from './ui/button';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

export function WelcomeOverlay({ onComplete }: WelcomeOverlayProps) {
  const { startOnboarding } = useOnboarding();

  const handleGetStarted = () => {
    const success = startOnboarding('first-time-user');
    if (success) {
      onComplete();
    }
  };

  const handleSkipTour = () => {
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
          <Button onClick={handleGetStarted} size='lg' className='w-full'>
            Start Your Journey
            <ArrowRight className='w-4 h-4 ml-2' />
          </Button>

          <Button variant='outline' onClick={handleSkipTour} className='w-full'>
            Skip Tutorial
          </Button>
        </div>

        <p className='text-xs text-muted-foreground'>Free community version • No signup required</p>
      </div>
    </div>
  );
}
