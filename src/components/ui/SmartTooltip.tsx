/**
 * ArchiComm Smart Tooltip Component
 * Context-aware tooltips with learning capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UXOptimizer } from '../../lib/user-experience/UXOptimizer';

interface SmartTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  disabled?: boolean;
  shortcut?: string;
  advanced?: boolean;
  learnFromUsage?: boolean;
  contextualHelp?: string;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  content,
  children,
  position = 'auto',
  delay = 500,
  disabled = false,
  shortcut,
  advanced = false,
  learnFromUsage = true,
  contextualHelp
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const uxOptimizer = UXOptimizer.getInstance();

  useEffect(() => {
    if (learnFromUsage) {
      const storedUsage = localStorage.getItem(`tooltip-usage-${content}`);
      if (storedUsage) {
        setUsageCount(parseInt(storedUsage, 10));
      }
    }
  }, [content, learnFromUsage]);

  const shouldShowTooltip = (): boolean => {
    if (disabled) return false;
    
    // Don't show basic tooltips for expert users after they've seen them multiple times
    if (learnFromUsage && !advanced && usageCount > 5) {
      return false;
    }
    
    return true;
  };

  const calculatePosition = (): 'top' | 'bottom' | 'left' | 'right' => {
    if (position !== 'auto' || !triggerRef.current) return position as any;

    const rect = triggerRef.current.getBoundingClientRect();
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
      { position: 'right', space: spaceRight }
    ] as const;

    return spaces.sort((a, b) => b.space - a.space)[0].position;
  };

  const handleMouseEnter = () => {
    if (!shouldShowTooltip()) return;

    timeoutRef.current = setTimeout(() => {
      setActualPosition(calculatePosition());
      setIsVisible(true);
      
      if (learnFromUsage) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem(`tooltip-usage-${content}`, newCount.toString());
      }

      // Track tooltip usage for UX optimization
      uxOptimizer.trackAction({
        type: 'tooltip-shown',
        data: { content, position: actualPosition, usageCount },
        success: true,
        context: {
          page: window.location.pathname,
          component: 'tooltip',
          userIntent: 'get-help'
        }
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    setShowAdvanced(false);
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
        userIntent: 'explore-features'
      }
    });
  };

  const getTooltipClasses = () => {
    const base = 'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700';
    
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

  const getArrowClasses = () => {
    const base = 'absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 border border-gray-700 transform rotate-45';
    
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

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={getTooltipClasses()}
            style={{ maxWidth: '300px' }}
          >
            {/* Arrow */}
            <div className={getArrowClasses()} />
            
            {/* Main content */}
            <div className="relative">
              <div className="font-medium text-sm leading-relaxed">
                {content}
              </div>
              
              {/* Shortcut display */}
              {shortcut && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Shortcut:</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 rounded border border-gray-600">
                      {shortcut}
                    </kbd>
                  </div>
                </div>
              )}
              
              {/* Advanced content */}
              {(advanced || contextualHelp) && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <button
                    onClick={handleAdvancedToggle}
                    className="flex items-center text-xs text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <span className="mr-1">
                      {showAdvanced ? '▼' : '▶'}
                    </span>
                    Learn more
                  </button>
                  
                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 text-xs text-gray-300 leading-relaxed">
                          {contextualHelp || 'Advanced features available in settings.'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {/* Usage hint for learning tooltips */}
              {learnFromUsage && usageCount > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">
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
};

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
    setContent
  };
};

// Context-aware tooltip that adapts based on user skill level
export const ContextualTooltip: React.FC<{
  children: React.ReactNode;
  basicContent: string;
  advancedContent?: string;
  expertContent?: string;
  shortcut?: string;
}> = ({ children, basicContent, advancedContent, expertContent, shortcut }) => {
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
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
      content={getContentForLevel()}
      shortcut={userLevel !== 'beginner' ? shortcut : undefined}
      advanced={userLevel === 'expert'}
      learnFromUsage={true}
    >
      {children}
    </SmartTooltip>
  );
};