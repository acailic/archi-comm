/**
 * ArchiComm Smart Tooltip Component
 * Context-aware tooltips with learning capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UXOptimizer } from '../../lib/user-experience/UXOptimizer';
import { ShortcutLearningSystem } from '../../lib/shortcuts/ShortcutLearningSystem';

interface SmartTooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  disabled?: boolean;
  shortcut?: string;
  advanced?: boolean;
  learnFromUsage?: boolean;
  contextualHelp?: string;
  isVisible?: boolean;
  targetElement?: HTMLElement | null;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onClose?: () => void;
  interactive?: boolean;
  role?: string;
  'aria-live'?: 'polite' | 'assertive';
}

export const SmartTooltip = React.forwardRef<HTMLDivElement, SmartTooltipProps>(({
  content,
  children,
  position = 'auto',
  delay = 500,
  disabled = false,
  shortcut,
  advanced = false,
  learnFromUsage = true,
  contextualHelp,
  isVisible: externalVisible,
  targetElement,
  placement,
  onClose,
  interactive = false,
  role = 'tooltip',
  'aria-live': ariaLive = 'polite',
}, ref) => {
  // Global kill-switch for all tooltips (temporary UX request)
  // Temporarily disable tooltips globally (can be toggled later)
  const isGloballyDisabled = true;

  if (disabled || isGloballyDisabled) {
    // Render children directly with no tooltip behavior
    return <>{children}</>;
  }
  const [internalVisible, setInternalVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const uxOptimizer = UXOptimizer.getInstance();
  const shortcutLearning = ShortcutLearningSystem.getInstance();

  const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;
  const currentPosition = placement || position;

  useEffect(() => {
    if (learnFromUsage) {
      const contentKey = typeof content === 'string' ? content : 'complex-content';
      const storedUsage = localStorage.getItem(`tooltip-usage-${contentKey}`);
      if (storedUsage) {
        setUsageCount(parseInt(storedUsage, 10));
      }
    }
  }, [content, learnFromUsage]);

  // Accessibility: Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          hideTooltip();
          break;
        case 'Tab':
          if (interactive && tooltipRef.current) {
            const focusableElements = tooltipRef.current.querySelectorAll(
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

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, interactive]);

  // Focus management
  useEffect(() => {
    if (isVisible && interactive && tooltipRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const firstFocusable = tooltipRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      if (firstFocusable) {
        firstFocusable.focus();
      }
    } else if (!isVisible && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isVisible, interactive]);

  const shouldShowTooltip = (): boolean => {
    if (disabled) return false;

    // Don't show basic tooltips for expert users after they've seen them multiple times
    if (learnFromUsage && !advanced && usageCount > 5) {
      return false;
    }

    return true;
  };

  const calculatePosition = (): 'top' | 'bottom' | 'left' | 'right' => {
    if (currentPosition !== 'auto') return currentPosition as any;

    const element = targetElement || triggerRef.current;
    if (!element) return 'top';

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space in each direction
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;

    // Prefer positions with more space
    const spaces = [
      { position: 'top', space: spaceTop },
      { position: 'bottom', space: spaceBottom },
      { position: 'left', space: spaceLeft },
      { position: 'right', space: spaceRight },
    ] as const;

    return spaces.sort((a, b) => b.space - a.space)[0].position;
  };

  const showTooltip = () => {
    if (!shouldShowTooltip()) return;

    setActualPosition(calculatePosition());
    if (externalVisible === undefined) {
      setInternalVisible(true);
    }

    if (learnFromUsage) {
      const contentKey = typeof content === 'string' ? content : 'complex-content';
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem(`tooltip-usage-${contentKey}`, newCount.toString());

      // Track with shortcut learning system
      shortcutLearning.trackManualAction('tooltip_shown', 200, 'help_seeking');
    }

    // Track tooltip usage for UX optimization
    uxOptimizer.trackAction({
      type: 'tooltip-shown',
      data: { content, position: actualPosition, usageCount },
      success: true,
      context: {
        page: window.location.pathname,
        component: 'tooltip',
        userIntent: 'get-help',
      },
    });
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (externalVisible === undefined) {
      setInternalVisible(false);
    }

    if (onClose) {
      onClose();
    }

    setShowAdvanced(false);
  };

  const handleMouseEnter = () => {
    if (!shouldShowTooltip()) return;

    timeoutRef.current = setTimeout(showTooltip, delay);
  };

  const handleFocus = (event: React.FocusEvent) => {
    if (!shouldShowTooltip()) return;
    setFocusedElement(event.target as HTMLElement);
    showTooltip();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    if (!interactive) {
      hideTooltip();
    }
  };

  const handleBlur = (event: React.FocusEvent) => {
    // Only hide if focus is moving outside the tooltip system
    if (
      !interactive ||
      (!tooltipRef.current?.contains(event.relatedTarget as Node) &&
        !triggerRef.current?.contains(event.relatedTarget as Node))
    ) {
      hideTooltip();
    }
  };

  const handleAdvancedToggle = () => {
    setShowAdvanced(!showAdvanced);
    uxOptimizer.trackAction({
      type: 'tooltip-advanced-toggle',
      data: { content, expanded: !showAdvanced },
      success: true,
      context: {
        page: window.location.pathname,
        component: 'tooltip',
        userIntent: 'explore-features',
      },
    });
  };

  const getTooltipClasses = () => {
    if (targetElement) {
      // For external tooltips, use fixed positioning
      return 'fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700';
    }

    const base =
      'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700';

    switch (actualPosition) {
      case 'top':
        return `${base} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${base} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${base} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${base} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${base} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getTooltipPosition = () => {
    if (!targetElement) return {};

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 300; // Approximate width
    const tooltipHeight = 100; // Approximate height
    const offset = 8;

    switch (actualPosition) {
      case 'top':
        return {
          top: rect.top - tooltipHeight - offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.left - tooltipWidth - offset,
        };
      case 'right':
        return {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + offset,
        };
      default:
        return {
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
    }
  };

  const getArrowClasses = () => {
    const base =
      'absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 border border-gray-700 transform rotate-45';

    switch (actualPosition) {
      case 'top':
        return `${base} top-full left-1/2 -translate-x-1/2 -mt-1 border-t-0 border-l-0`;
      case 'bottom':
        return `${base} bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-0 border-r-0`;
      case 'left':
        return `${base} left-full top-1/2 -translate-y-1/2 -ml-1 border-l-0 border-b-0`;
      case 'right':
        return `${base} right-full top-1/2 -translate-y-1/2 -mr-1 border-r-0 border-t-0`;
      default:
        return `${base} top-full left-1/2 -translate-x-1/2 -mt-1 border-t-0 border-l-0`;
    }
  };

  if (disabled && !targetElement) {
    return <>{children}</>;
  }

  // Render external tooltip (for ContextualHelpSystem)
  if (targetElement) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={getTooltipClasses()}
            style={{
              ...getTooltipPosition(),
              maxWidth: '300px',
            }}
            role={role}
            aria-live={ariaLive}
            onMouseLeave={interactive ? undefined : hideTooltip}
            onBlur={handleBlur}
            tabIndex={interactive ? 0 : -1}
          >
            {/* Arrow */}
            <div className={getArrowClasses()} />

            {/* Content */}
            <div className='relative'>
              <div className='font-medium text-sm leading-relaxed'>{content}</div>

              {interactive && (
                <button
                  onClick={hideTooltip}
                  className='absolute top-0 right-0 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
                  aria-label='Close tooltip'
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div
      ref={ref || triggerRef}
      className='relative inline-block'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role='button'
      aria-describedby={isVisible ? 'smart-tooltip' : undefined}
      aria-expanded={isVisible}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            id='smart-tooltip'
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={getTooltipClasses()}
            style={{ maxWidth: '300px' }}
            role={role}
            aria-live={ariaLive}
            onMouseLeave={interactive ? undefined : handleMouseLeave}
            onBlur={handleBlur}
            tabIndex={interactive ? 0 : -1}
          >
            {/* Arrow */}
            <div className={getArrowClasses()} />

            {/* Main content */}
            <div className='relative'>
              {interactive && (
                <button
                  onClick={hideTooltip}
                  className='absolute top-0 right-0 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
                  aria-label='Close tooltip'
                >
                  ✕
                </button>
              )}

              <div className='font-medium text-sm leading-relaxed'>{content}</div>

              {/* Shortcut display */}
              {shortcut && (
                <div className='mt-2 pt-2 border-t border-gray-600'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-300'>Shortcut:</span>
                    <kbd className='px-2 py-1 text-xs font-mono bg-gray-700 rounded border border-gray-600'>
                      {shortcut}
                    </kbd>
                  </div>
                </div>
              )}

              {/* Advanced content */}
              {(advanced || contextualHelp) && (
                <div className='mt-2 pt-2 border-t border-gray-600'>
                  <button
                    onClick={handleAdvancedToggle}
                    className='flex items-center text-xs text-blue-300 hover:text-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
                    aria-expanded={showAdvanced}
                    aria-controls='advanced-tooltip-content'
                  >
                    <span className='mr-1'>{showAdvanced ? '▼' : '▶'}</span>
                    Learn more
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        id='advanced-tooltip-content'
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className='overflow-hidden'
                        role='region'
                        aria-label='Advanced tooltip content'
                      >
                        <div className='mt-2 text-xs text-gray-300 leading-relaxed'>
                          {contextualHelp || 'Advanced features available in settings.'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Usage hint for learning tooltips */}
              {learnFromUsage && usageCount > 0 && (
                <div className='mt-2 pt-2 border-t border-gray-600'>
                  <div className='text-xs text-gray-400'>
                    💡 This tooltip will hide after you've mastered it
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SmartTooltip.displayName = 'SmartTooltip';

// Smart tooltip hook for dynamic content
export const useSmartTooltip = (baseContent: string, learnFromUsage = true) => {
  const [content, setContent] = useState(baseContent);
  const [usageCount, setUsageCount] = useState(0);
  const uxOptimizer = UXOptimizer.getInstance();

  useEffect(() => {
    if (learnFromUsage) {
      const storedUsage = localStorage.getItem(`tooltip-usage-${baseContent}`);
      if (storedUsage) {
        const count = parseInt(storedUsage, 10);
        setUsageCount(count);

        // Adapt content based on usage
        if (count > 10) {
          setContent(`${baseContent} (Expert mode available)`);
        } else if (count > 5) {
          setContent(`${baseContent} (Try the shortcut!)`);
        }
      }
    }
  }, [baseContent, learnFromUsage]);

  const shouldShow = usageCount < 10 || !learnFromUsage;

  return {
    content,
    shouldShow,
    usageCount,
    setContent,
  };
};

// Context-aware tooltip that adapts based on user skill level
export const ContextualTooltip = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    basicContent: string;
    advancedContent?: string;
    expertContent?: string;
    shortcut?: string;
  }
>(({ children, basicContent, advancedContent, expertContent, shortcut }, ref) => {
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>(
    'intermediate'
  );
  const uxOptimizer = UXOptimizer.getInstance();

  useEffect(() => {
    // Get user skill level from UX optimizer
    const observer = (event: string, data: any) => {
      if (event === 'skill-level-updated') {
        setUserLevel(data.skillLevel);
      }
    };

    uxOptimizer.addObserver(observer);
    return () => uxOptimizer.removeObserver(observer);
  }, [uxOptimizer]);

  const getContentForLevel = (): string => {
    switch (userLevel) {
      case 'beginner':
        return basicContent;
      case 'intermediate':
        return advancedContent || basicContent;
      case 'advanced':
      case 'expert':
        return expertContent || advancedContent || basicContent;
      default:
        return basicContent;
    }
  };

  return (
    <SmartTooltip
      ref={ref}
      content={getContentForLevel()}
      shortcut={userLevel !== 'beginner' ? shortcut : undefined}
      advanced={userLevel === 'expert'}
      learnFromUsage={true}
    >
      {children}
    </SmartTooltip>
  );
});

ContextualTooltip.displayName = 'ContextualTooltip';
