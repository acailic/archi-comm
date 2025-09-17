import React, { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Lightbulb, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import { useUXOptimizer } from '@/lib/user-experience/UXOptimizer';
import { useUXTracker } from '../hooks/useUXTracker';

export interface UXRecommendation {
  id: string;
  type: 'tip' | 'shortcut' | 'optimization' | 'warning';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissable?: boolean;
  category: string;
}

/**
 * Component that listens for UX recommendations and displays them as toast notifications.
 * Integrates with the UXOptimizer observer pattern and Sonner toast system.
 */
export const UXRecommendationToast: React.FC = () => {
  const uxOptimizer = useUXOptimizer();
  const { trackDialogAction } = useUXTracker();
  const lastRecommendationTime = useRef(0);
  const displayedRecommendations = useRef(new Set<string>());

  // Minimum time between recommendations (5 minutes)
  const RECOMMENDATION_COOLDOWN = 5 * 60 * 1000;

  /**
   * Handle recommendation display with rate limiting and deduplication
   */
  const handleRecommendation = useCallback((recommendation: UXRecommendation) => {
    const now = Date.now();

    // Rate limiting: don't show recommendations too frequently
    if (now - lastRecommendationTime.current < RECOMMENDATION_COOLDOWN) {
      return;
    }

    // Deduplication: don't show the same recommendation multiple times
    if (displayedRecommendations.current.has(recommendation.id)) {
      return;
    }

    lastRecommendationTime.current = now;
    displayedRecommendations.current.add(recommendation.id);

    // Clear old recommendations from cache (keep last 50)
    if (displayedRecommendations.current.size > 50) {
      const recommendationsArray = Array.from(displayedRecommendations.current);
      displayedRecommendations.current = new Set(recommendationsArray.slice(-25));
    }

    displayRecommendationToast(recommendation);
  }, []);

  /**
   * Display the actual toast notification
   */
  const displayRecommendationToast = (recommendation: UXRecommendation) => {
    const icon = getRecommendationIcon(recommendation.type);
    const toastType = getToastType(recommendation.priority);

    const toastContent = (
      <div className='flex items-start gap-3 max-w-md'>
        <div className='flex-shrink-0 mt-0.5'>{icon}</div>
        <div className='flex-1 min-w-0'>
          <div className='font-medium text-sm text-gray-900 mb-1'>{recommendation.title}</div>
          <div className='text-sm text-gray-600 leading-relaxed'>{recommendation.message}</div>
          {recommendation.action && (
            <button
              onClick={handleActionClick(recommendation)}
              className='mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline'
            >
              {recommendation.action.label}
            </button>
          )}
        </div>
      </div>
    );

    // Display toast with appropriate styling
    const toastOptions = {
      duration: recommendation.priority === 'high' ? 8000 : 5000,
      dismissible: recommendation.dismissable !== false,
      onDismiss: () => handleRecommendationDismiss(recommendation),
      className: `ux-recommendation-toast ux-${recommendation.type}`,
    };

    switch (toastType) {
      case 'success':
        toast.success(toastContent, toastOptions);
        break;
      case 'warning':
        toast.warning(toastContent, toastOptions);
        break;
      case 'error':
        toast.error(toastContent, toastOptions);
        break;
      default:
        toast(toastContent, toastOptions);
    }

    // Track recommendation display
    trackDialogAction('show', 'ux-recommendation', {
      recommendationId: recommendation.id,
      type: recommendation.type,
      priority: recommendation.priority,
      category: recommendation.category,
    });
  };

  /**
   * Handle action button clicks
   */
  const handleActionClick = (recommendation: UXRecommendation) => () => {
    if (recommendation.action) {
      try {
        recommendation.action.handler();

        // Track recommendation acceptance
        trackDialogAction('accept', 'ux-recommendation', {
          recommendationId: recommendation.id,
          actionTaken: recommendation.action.label,
        });
      } catch (error) {
        console.warn('Failed to execute recommendation action:', error);
        trackDialogAction('error', 'ux-recommendation', {
          recommendationId: recommendation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  /**
   * Handle recommendation dismissal
   */
  const handleRecommendationDismiss = (recommendation: UXRecommendation) => {
    trackDialogAction('dismiss', 'ux-recommendation', {
      recommendationId: recommendation.id,
      type: recommendation.type,
    });
  };

  /**
   * Set up recommendation listener
   */
  useEffect(() => {
    if (!uxOptimizer) return;

    const handleRecommendationEvent = (event: CustomEvent) => {
      const recommendation = event.detail as UXRecommendation;
      handleRecommendation(recommendation);
    };

    // Listen for recommendation events from UXOptimizer
    const observer = (recommendations: UXRecommendation[]) => {
      recommendations.forEach(recommendation => {
        handleRecommendation(recommendation);
      });
    };

    // Add observer to UXOptimizer if it supports the observer pattern
    if (typeof uxOptimizer.addObserver === 'function') {
      uxOptimizer.addObserver(observer);
    }

    // Also listen for custom events as a fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('ux-recommendation', handleRecommendationEvent as EventListener);
    }

    // Cleanup
    return () => {
      if (typeof uxOptimizer.removeObserver === 'function') {
        uxOptimizer.removeObserver(observer);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('ux-recommendation', handleRecommendationEvent as EventListener);
      }
    };
  }, [uxOptimizer, handleRecommendation]);

  // This component doesn't render anything visible itself
  return null;
};

/**
 * Get appropriate icon for recommendation type
 */
function getRecommendationIcon(type: UXRecommendation['type']) {
  const iconProps = { size: 16, className: 'text-current' };

  switch (type) {
    case 'tip':
      return <Lightbulb {...iconProps} className='text-blue-500' />;
    case 'shortcut':
      return <Zap {...iconProps} className='text-purple-500' />;
    case 'optimization':
      return <TrendingUp {...iconProps} className='text-green-500' />;
    case 'warning':
      return <AlertCircle {...iconProps} className='text-orange-500' />;
    default:
      return <Lightbulb {...iconProps} className='text-blue-500' />;
  }
}

/**
 * Map recommendation priority to toast type
 */
function getToastType(
  priority: UXRecommendation['priority']
): 'success' | 'warning' | 'error' | 'default' {
  switch (priority) {
    case 'high':
      return 'warning';
    case 'medium':
      return 'success';
    case 'low':
    default:
      return 'default';
  }
}

export default UXRecommendationToast;
