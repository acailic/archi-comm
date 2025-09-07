import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOnboarding, OnboardingStep } from '../lib/onboarding/OnboardingManager';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingOverlayProps {
  className?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HighlightPosition extends TooltipPosition {
  borderRadius: number;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  className = ''
}) => {
  const {
    nextStep,
    previousStep,
    skipStep,
    cancelOnboarding,
    getCurrentStep,
    getCurrentFlow,
    getProgress,
    isVisible,
    addEventListener,
    removeEventListener
  } = useOnboarding();

  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [highlightPosition, setHighlightPosition] = useState<HighlightPosition | null>(null);
  const [isCalculatingPosition, setIsCalculatingPosition] = useState(false);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previousTargetRef = useRef<Element | null>(null);

  // Update current step when onboarding state changes
  useEffect(() => {
    const handleStepChange = () => {
      const step = getCurrentStep();
      setCurrentStep(step);
      if (step) {
        calculatePosition(step);
      }
    };

    const handleVisibilityChange = () => {
      if (!isVisible()) {
        setCurrentStep(null);
        setTooltipPosition(null);
        setHighlightPosition(null);
      }
    };

    addEventListener('step-changed', handleStepChange);
    addEventListener('visibility-changed', handleVisibilityChange);

    // Initialize current step if onboarding is active
    if (isVisible()) {
      handleStepChange();
    }

    return () => {
      removeEventListener('step-changed', handleStepChange);
      removeEventListener('visibility-changed', handleVisibilityChange);
    };
  }, [getCurrentStep, isVisible, addEventListener, removeEventListener]);

  // Calculate tooltip and highlight positions
  const calculatePosition = useCallback((step: OnboardingStep) => {
    if (isCalculatingPosition) return;
    
    setIsCalculatingPosition(true);

    // Handle center placement (modal-style)
    if (step.targetSelector === 'center' || step.placement === 'center') {
      setTooltipPosition({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 200,
        width: 400,
        height: 300
      });
      setHighlightPosition(null);
      setIsCalculatingPosition(false);
      return;
    }

    // Find target element
    const targetElement = document.querySelector(step.targetSelector);
    if (!targetElement) {
      console.warn(`Target element not found: ${step.targetSelector}`);
      setIsCalculatingPosition(false);
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 300;
    const tooltipHeight = 200;
    const padding = 16;
    const arrowSize = 8;

    // Calculate highlight position (around target element)
    const highlight: HighlightPosition = {
      top: targetRect.top - 4,
      left: targetRect.left - 4,
      width: targetRect.width + 8,
      height: targetRect.height + 8,
      borderRadius: 8
    };

    // Calculate tooltip position based on placement
    let tooltip: TooltipPosition = {
      top: 0,
      left: 0,
      width: tooltipWidth,
      height: tooltipHeight
    };

    switch (step.placement) {
      case 'top':
        tooltip.top = targetRect.top - tooltipHeight - arrowSize - padding;
        tooltip.left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        tooltip.top = targetRect.bottom + arrowSize + padding;
        tooltip.left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        tooltip.top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        tooltip.left = targetRect.left - tooltipWidth - arrowSize - padding;
        break;
      case 'right':
        tooltip.top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        tooltip.left = targetRect.right + arrowSize + padding;
        break;
    }

    // Ensure tooltip stays within viewport bounds
    if (tooltip.left < padding) {
      tooltip.left = padding;
    } else if (tooltip.left + tooltipWidth > viewportWidth - padding) {
      tooltip.left = viewportWidth - tooltipWidth - padding;
    }

    if (tooltip.top < padding) {
      tooltip.top = padding;
    } else if (tooltip.top + tooltipHeight > viewportHeight - padding) {
      tooltip.top = viewportHeight - tooltipHeight - padding;
    }

    setHighlightPosition(highlight);
    setTooltipPosition(tooltip);
    setIsCalculatingPosition(false);

    // Scroll target into view if needed
    if (previousTargetRef.current !== targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      previousTargetRef.current = targetElement;
    }
  }, [isCalculatingPosition]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (currentStep) {
        setTimeout(() => calculatePosition(currentStep), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep, calculatePosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible() || !currentStep) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleCancel();
          break;
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case ' ':
          if (event.ctrlKey) {
            event.preventDefault();
            handleSkip();
          }
          break;
      }
    };

    if (isVisible()) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, currentStep]);

  // Auto-focus management
  useEffect(() => {
    if (isVisible() && tooltipRef.current) {
      const firstButton = tooltipRef.current.querySelector('button') as HTMLButtonElement;
      if (firstButton) {
        firstButton.focus();
      }
    }
  }, [isVisible, currentStep]);

  const handleNext = async () => {
    await nextStep();
  };

  const handlePrevious = async () => {
    await previousStep();
  };

  const handleSkip = async () => {
    await skipStep();
  };

  const handleCancel = () => {
    cancelOnboarding();
  };

  const renderProgressIndicator = () => {
    const flow = getCurrentFlow();
    const progress = getProgress();
    
    if (!flow || !progress) return null;

    const currentIndex = progress.currentStepIndex;
    const totalSteps = flow.steps.length;

    return (
      <div className="flex items-center justify-center space-x-2 mb-4">
        {flow.steps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              index < currentIndex
                ? 'bg-green-500'
                : index === currentIndex
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
            aria-label={`Step ${index + 1} of ${totalSteps}${
              index < currentIndex ? ' completed' : 
              index === currentIndex ? ' current' : ''
            }`}
          />
        ))}
      </div>
    );
  };

  const renderCenterTooltip = () => {
    if (!currentStep || !tooltipPosition) return null;

    return (
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg shadow-xl p-6 max-w-md"
        style={{
          position: 'absolute',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: tooltipPosition.width,
          zIndex: 60
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-content"
      >
        <div className="text-center">
          {renderProgressIndicator()}
          
          <h3 
            id="onboarding-title" 
            className="text-xl font-semibold text-gray-900 mb-3"
          >
            {currentStep.title}
          </h3>
          
          <div 
            id="onboarding-content" 
            className="text-gray-700 mb-6"
          >
            {typeof currentStep.content === 'function' 
              ? currentStep.content() 
              : currentStep.content
            }
          </div>

          <div className="flex justify-center space-x-3">
            {getProgress()?.currentStepIndex > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="px-4 py-2"
              >
                Previous
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleSkip}
              className="px-4 py-2"
            >
              Skip
            </Button>
            
            <Button
              onClick={handleNext}
              className="px-6 py-2"
            >
              {getCurrentFlow()?.steps.length === (getProgress()?.currentStepIndex || 0) + 1 
                ? 'Complete' 
                : 'Next'
              }
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPositionedTooltip = () => {
    if (!currentStep || !tooltipPosition) return null;

    const isLastStep = getCurrentFlow()?.steps.length === (getProgress()?.currentStepIndex || 0) + 1;
    const arrowClasses = {
      top: 'after:absolute after:top-full after:left-1/2 after:transform after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white',
      bottom: 'after:absolute after:bottom-full after:left-1/2 after:transform after:-translate-x-1/2 after:border-8 after:border-transparent after:border-b-white',
      left: 'after:absolute after:left-full after:top-1/2 after:transform after:-translate-y-1/2 after:border-8 after:border-transparent after:border-l-white',
      right: 'after:absolute after:right-full after:top-1/2 after:transform after:-translate-y-1/2 after:border-8 after:border-transparent after:border-r-white'
    };

    return (
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.2 }}
        className={`bg-white rounded-lg shadow-xl p-4 relative ${arrowClasses[currentStep.placement as keyof typeof arrowClasses] || ''}`}
        style={{
          position: 'absolute',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: tooltipPosition.width,
          zIndex: 60
        }}
        role="tooltip"
        aria-live="polite"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-content"
      >
        {renderProgressIndicator()}
        
        <h3 
          id="onboarding-title" 
          className="text-lg font-semibold text-gray-900 mb-2"
        >
          {currentStep.title}
        </h3>
        
        <div 
          id="onboarding-content" 
          className="text-gray-700 mb-4 text-sm"
        >
          {typeof currentStep.content === 'function' 
            ? currentStep.content() 
            : currentStep.content
          }
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {getProgress()?.currentStepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
              >
                Previous
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </Button>
            
            <Button
              size="sm"
              onClick={handleNext}
            >
              {isLastStep ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderHighlight = () => {
    if (!highlightPosition) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10"
        style={{
          top: highlightPosition.top,
          left: highlightPosition.left,
          width: highlightPosition.width,
          height: highlightPosition.height,
          borderRadius: highlightPosition.borderRadius,
          zIndex: 55,
          pointerEvents: 'none'
        }}
      />
    );
  };

  if (!isVisible() || !currentStep) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 ${className}`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Semi-transparent overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black bg-opacity-20"
        style={{ pointerEvents: 'auto' }}
        onClick={handleCancel}
      />

      <AnimatePresence mode="wait">
        {/* Highlight */}
        {renderHighlight()}

        {/* Tooltip */}
        <div style={{ pointerEvents: 'auto' }}>
          {currentStep.placement === 'center' 
            ? renderCenterTooltip() 
            : renderPositionedTooltip()
          }
        </div>
      </AnimatePresence>

      {/* Screen reader announcements */}
      <div 
        aria-live="assertive" 
        aria-atomic="true" 
        className="sr-only"
      >
        {currentStep && `Onboarding step: ${currentStep.title}. ${
          typeof currentStep.content === 'function' 
            ? currentStep.content() 
            : currentStep.content
        }`}
      </div>
    </div>
  );
};

export default OnboardingOverlay;