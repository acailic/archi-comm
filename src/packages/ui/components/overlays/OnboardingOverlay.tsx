// src/packages/ui/components/overlays/OnboardingOverlay.tsx
// Onboarding tour overlay that displays step-by-step guidance
// Works with Zustand-based OnboardingManager for state management
// RELEVANT FILES: OnboardingManager.ts, WelcomeOverlay.tsx, AppContent.tsx

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useOnboardingStore } from '@/lib/onboarding/OnboardingManager';
import { Button } from '@ui/components/ui/button';
import { X } from 'lucide-react';

const DEFAULT_CARD_STYLE: React.CSSProperties = {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

const VIEWPORT_MARGIN = 16;
const CARD_GAP = 12;
const HIGHLIGHT_PADDING = 12;

const isPartiallyVisible = (rect: DOMRect | null) => {
  if (!rect) return false;
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

const getScrollableAncestors = (element: HTMLElement) => {
  const ancestors: Array<Element | Window> = [];
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflow}${style.overflowX}${style.overflowY}`;
    if (/(auto|scroll)/.test(overflow)) {
      ancestors.push(parent);
    }
    parent = parent.parentElement;
  }
  ancestors.push(window);
  return ancestors;
};

interface OnboardingOverlayProps {
  className?: string;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ className = '' }) => {
  // Use separate selectors to avoid creating new objects on every render
  const isVisible = useOnboardingStore(state => state.isVisible);
  const currentStep = useOnboardingStore(state => state.currentStep);
  const currentFlow = useOnboardingStore(state => state.currentFlow);
  const currentStepIndex = useOnboardingStore(state => state.currentStepIndex);
  const nextStep = useOnboardingStore(state => state.nextStep);
  const previousStep = useOnboardingStore(state => state.previousStep);
  const completeOnboarding = useOnboardingStore(state => state.completeOnboarding);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>(DEFAULT_CARD_STYLE);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Track the active target element for positioning and highlighting
  useLayoutEffect(() => {
    if (!isVisible || !currentStep?.targetSelector) {
      setTargetElement(null);
      setTargetRect(null);
      setCardStyle(DEFAULT_CARD_STYLE);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    setTargetElement(element);

    if (!element) {
      setTargetRect(null);
      setCardStyle(DEFAULT_CARD_STYLE);
      return;
    }

    const updateRect = () => {
      setTargetRect(element.getBoundingClientRect());
    };

    updateRect();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateRect)
      : null;
    resizeObserver?.observe(element);

    const scrollables = getScrollableAncestors(element);
    scrollables.forEach((ancestor) => {
      ancestor.addEventListener('scroll', updateRect, { passive: true });
    });

    window.addEventListener('resize', updateRect);

    if (!isPartiallyVisible(element.getBoundingClientRect())) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    return () => {
      resizeObserver?.disconnect();
      scrollables.forEach((ancestor) => {
        ancestor.removeEventListener('scroll', updateRect);
      });
      window.removeEventListener('resize', updateRect);
    };
  }, [currentStep?.targetSelector, currentStep?.id, isVisible]);

  // Compute card positioning relative to the target element
  useLayoutEffect(() => {
    if (!cardRef.current || !targetRect || !currentStep?.placement || !currentStep.targetSelector) {
      setCardStyle(DEFAULT_CARD_STYLE);
      return;
    }

    const card = cardRef.current;
    const { width: cardWidth, height: cardHeight } = card.getBoundingClientRect();
    let top = targetRect.top;
    let left = targetRect.left;

    switch (currentStep.placement) {
      case 'top':
        top = targetRect.top - cardHeight - CARD_GAP;
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + CARD_GAP;
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
        left = targetRect.left - cardWidth - CARD_GAP;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
        left = targetRect.right + CARD_GAP;
        break;
      case 'center':
      default:
        setCardStyle(DEFAULT_CARD_STYLE);
        return;
    }

    // Clamp into viewport
    const maxTop = window.innerHeight - cardHeight - VIEWPORT_MARGIN;
    const maxLeft = window.innerWidth - cardWidth - VIEWPORT_MARGIN;
    const clampedTop = Math.min(Math.max(top, VIEWPORT_MARGIN), Math.max(maxTop, VIEWPORT_MARGIN));
    const clampedLeft = Math.min(Math.max(left, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN));

    setCardStyle({
      top: clampedTop,
      left: clampedLeft,
      transform: 'none',
    });
  }, [targetRect, currentStep?.placement, currentStep?.targetSelector]);

  // Highlight the target element via data attribute to allow custom styling
  useEffect(() => {
    if (!targetElement) {
      return undefined;
    }

    targetElement.setAttribute('data-onboarding-highlight', 'true');
    return () => {
      targetElement.removeAttribute('data-onboarding-highlight');
    };
  }, [targetElement]);

  if (!isVisible || !currentStep || !currentFlow) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === currentFlow.steps.length - 1;
  const totalSteps = currentFlow.steps.length;

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const highlightStyle = useMemo(() => {
    if (!targetRect) return undefined;
    return {
      top: Math.max(targetRect.top - HIGHLIGHT_PADDING, 0),
      left: Math.max(targetRect.left - HIGHLIGHT_PADDING, 0),
      width: targetRect.width + HIGHLIGHT_PADDING * 2,
      height: targetRect.height + HIGHLIGHT_PADDING * 2,
    } satisfies React.CSSProperties;
  }, [targetRect]);

  return (
    <div className={`fixed inset-0 z-[100] ${className}`}>
      {/* Backdrop overlay with blur */}
      <button
        type='button'
        className='absolute inset-0 bg-transparent backdrop-blur-sm'
        onClick={handleSkip}
        aria-label='Skip tutorial'
      />

      {/* Highlight spotlight */}
      {highlightStyle && (
        <div
          className='pointer-events-none fixed border-2 border-primary/80 rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-200 ease-out'
          style={highlightStyle}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className='fixed z-10 bg-background border border-border rounded-lg shadow-2xl p-6 max-w-md mx-4'
        style={cardStyle}
        role='dialog'
        aria-modal='true'
        aria-labelledby='onboarding-title'
        aria-describedby='onboarding-content'
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className='absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors'
          aria-label='Skip tutorial'
        >
          <X className='w-5 h-5' />
        </button>

        {/* Progress indicator */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              {currentFlow.name}
            </span>
            <span className='text-xs font-medium text-muted-foreground'>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
          <div className='w-full bg-muted rounded-full h-1.5'>
            <div
              className='bg-primary h-1.5 rounded-full transition-all duration-300'
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Title */}
        <h3 id='onboarding-title' className='text-xl font-semibold text-foreground mb-3'>
          {currentStep.title}
        </h3>

        {/* Content */}
        <div id='onboarding-content' className='text-muted-foreground mb-6 leading-relaxed'>
          {currentStep.content}
        </div>

        {/* Action buttons */}
        <div className='flex justify-between items-center gap-3'>
          <div className='flex gap-2'>
            {!isFirstStep && (
              <Button
                variant='outline'
                onClick={handlePrevious}
                size='sm'
              >
                Previous
              </Button>
            )}
            <Button
              variant='ghost'
              onClick={handleSkip}
              size='sm'
              className='text-muted-foreground'
            >
              Skip Tutorial
            </Button>
          </div>

          <Button
            onClick={handleNext}
            size='sm'
            className='min-w-[100px]'
          >
            {isLastStep ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
