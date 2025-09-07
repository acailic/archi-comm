import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UXOptimizer } from '../lib/user-experience/UXOptimizer';
import { SmartTooltip } from './ui/SmartTooltip';

interface HelpContent {
  id: string;
  componentId: string;
  content: string | React.ReactNode;
  type: 'tooltip' | 'panel' | 'tour';
  priority: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  targetSelector?: string;
  interactive?: boolean;
}

interface ContextualHelpSystemProps {
  className?: string;
}

interface HelpState {
  isVisible: boolean;
  content: HelpContent | null;
  targetElement: HTMLElement | null;
}

export const ContextualHelpSystem: React.FC<ContextualHelpSystemProps> = ({
  className
}) => {
  const [helpRegistry, setHelpRegistry] = useState<Map<string, HelpContent>>(new Map());
  const [helpState, setHelpState] = useState<HelpState>({
    isVisible: false,
    content: null,
    targetElement: null
  });
  const [activeHelpQueue, setActiveHelpQueue] = useState<HelpContent[]>([]);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Register help content
  const registerHelpContent = useCallback((componentId: string, content: Omit<HelpContent, 'componentId'>) => {
    const helpContent: HelpContent = {
      ...content,
      componentId
    };
    
    setHelpRegistry(prev => {
      const newRegistry = new Map(prev);
      newRegistry.set(componentId, helpContent);
      return newRegistry;
    });
  }, []);

  // Show help for a specific component
  const showHelp = useCallback((componentId: string, targetElement?: HTMLElement) => {
    const content = helpRegistry.get(componentId);
    if (!content) return;

    const target = targetElement || 
      (content.targetSelector ? document.querySelector(content.targetSelector) as HTMLElement : null);

    // Store previous focus for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;

    setHelpState({
      isVisible: true,
      content,
      targetElement: target
    });

    // Track help interaction
    UXOptimizer.getInstance().trackAction('contextual_help_shown', {
      componentId,
      contentType: content.type,
      priority: content.priority
    });
  }, [helpRegistry]);

  // Hide help
  const hideHelp = useCallback(() => {
    if (helpState.content) {
      UXOptimizer.getInstance().trackAction('contextual_help_hidden', {
        componentId: helpState.content.componentId,
        duration: Date.now() - (helpState.content as any).shownAt
      });
    }

    setHelpState({
      isVisible: false,
      content: null,
      targetElement: null
    });

    // Restore previous focus
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }

    // Show next help in queue if any
    if (activeHelpQueue.length > 0) {
      const [nextHelp, ...remainingQueue] = activeHelpQueue;
      setActiveHelpQueue(remainingQueue);
      setTimeout(() => showHelp(nextHelp.componentId), 100);
    }
  }, [helpState, activeHelpQueue, showHelp]);

  // Handle help conflicts by queueing
  const queueHelp = useCallback((componentId: string) => {
    const content = helpRegistry.get(componentId);
    if (!content) return;

    if (helpState.isVisible) {
      // Add to queue if higher priority, otherwise ignore
      if (content.priority > (helpState.content?.priority || 0)) {
        setActiveHelpQueue(prev => [content, ...prev].sort((a, b) => b.priority - a.priority));
      }
    } else {
      showHelp(componentId);
    }
  }, [helpRegistry, helpState, showHelp]);

  // Listen for UXOptimizer 'show-help' events
  useEffect(() => {
    const handleShowHelp = (data: { componentId: string; targetElement?: HTMLElement }) => {
      if (data.targetElement) {
        showHelp(data.componentId, data.targetElement);
      } else {
        queueHelp(data.componentId);
      }
    };

    UXOptimizer.getInstance().addObserver('show-help', handleShowHelp);

    return () => {
      UXOptimizer.getInstance().removeObserver('show-help', handleShowHelp);
    };
  }, [showHelp, queueHelp]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!helpState.isVisible) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          hideHelp();
          break;
        case 'Tab':
          // Handle focus trapping for complex help content
          if (helpState.content?.type === 'panel' && overlayRef.current) {
            const focusableElements = overlayRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length > 0) {
              const firstElement = focusableElements[0] as HTMLElement;
              const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
              
              if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }
          }
          break;
      }
    };

    if (helpState.isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [helpState.isVisible, helpState.content, hideHelp]);

  // Auto-focus management for panel type help
  useEffect(() => {
    if (helpState.isVisible && helpState.content?.type === 'panel' && overlayRef.current) {
      const firstFocusable = overlayRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [helpState.isVisible, helpState.content]);

  // Render tooltip-type help
  const renderTooltipHelp = () => {
    if (!helpState.content || !helpState.targetElement) return null;

    return (
      <SmartTooltip
        content={helpState.content.content}
        isVisible={true}
        targetElement={helpState.targetElement}
        placement={helpState.content.placement}
        onClose={hideHelp}
        interactive={helpState.content.interactive}
        role="tooltip"
        aria-live="polite"
      />
    );
  };

  // Render panel-type help
  const renderPanelHelp = () => {
    if (!helpState.content) return null;

    return (
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className || ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        aria-describedby="help-content"
      >
        <div className="max-w-md w-full mx-4 bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="help-title" className="text-lg font-semibold text-gray-900">
                Help
              </h3>
              <button
                onClick={hideHelp}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Close help"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            <div id="help-content" className="text-gray-700">
              {helpState.content.content}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={hideHelp}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Expose API to global context
  useEffect(() => {
    (window as any).contextualHelpSystem = {
      registerHelpContent,
      showHelp,
      hideHelp
    };

    return () => {
      delete (window as any).contextualHelpSystem;
    };
  }, [registerHelpContent, showHelp, hideHelp]);

  if (!helpState.isVisible || !helpState.content) return null;

  switch (helpState.content.type) {
    case 'tooltip':
      return renderTooltipHelp();
    case 'panel':
      return renderPanelHelp();
    case 'tour':
      // Tour type would be handled by OnboardingOverlay
      return null;
    default:
      return null;
  }
};

export default ContextualHelpSystem;