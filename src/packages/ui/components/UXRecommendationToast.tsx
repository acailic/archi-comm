import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Lightbulb, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import {
  useUXOptimizer,
  type UXRecommendation as OptimizerRecommendation,
} from '@/lib/user-experience/UXOptimizer';
import WorkflowOptimizer, {
  type WorkflowRecommendation,
  type WorkflowRecommendationType,
} from '@/lib/user-experience/WorkflowOptimizer';
import {
  APP_EVENT,
  dispatchAppEvent,
} from '@/lib/events/appEvents';

const OPTIMIZER_TYPE_MAP: Record<OptimizerRecommendation['type'], UXRecommendation['type']> = {
  tutorial: 'tip',
  feature: 'optimization',
  shortcut: 'shortcut',
  workflow: 'warning',
};

const WORKFLOW_TYPE_MAP: Record<WorkflowRecommendationType, UXRecommendation['type']> = {
  workflow_optimization: 'optimization',
  help_suggestion: 'tip',
  workflow_improvement: 'warning',
};
import { useUXTracker } from '@/shared/hooks/common/useUXTracker';

/**
 * Generate a stable ID for recommendations to prevent duplicates across polls
 */
function generateStableId(source: string, type: string, title: string, category: string): string {
  const content = `${source}-${type}-${title}-${category}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${source}-${Math.abs(hash).toString(36)}`;
}

/**
 * Display toast using Sonner API with proper error handling
 */
function displayToast(
  content: React.ReactNode, 
  toastType: 'success' | 'error' | 'default',
  options: any
): string | number {
  switch (toastType) {
    case 'success':
      return toast.success(content, options);
    case 'error':
      return toast.error(content, options);
    case 'default':
    default:
      return toast(content, options);
  }
}

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
  source?: 'ux' | 'workflow';
}

/**
 * Component that listens for UX recommendations and displays them as toast notifications.
 * Integrates with the UXOptimizer observer pattern and Sonner toast system.
 */
export const UXRecommendationToast: React.FC = () => {
  const { getRecommendations, trackAction } = useUXOptimizer();
  const workflowOptimizer = useMemo(
    () => WorkflowOptimizer.getInstance(),
    [],
  );
  const { trackDialogAction } = useUXTracker();
  const displayedRecommendations = useRef(new Set<string>());
  const lastShownByPriority = useRef<Record<'high' | 'medium' | 'low', number>>({
    high: 0,
    medium: 0,
    low: 0,
  });
  const dismissedTypesRef = useRef(new Set<string>());

  const PRIORITY_COOLDOWN: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 10 * 60 * 1000,
    low: 30 * 60 * 1000,
  };
  const PRIORITY_WEIGHT: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const DISMISSED_TYPES_KEY = 'archicomm.dismissed-recommendation-types';
  const getDismissalKey = (source: string, type: string, category: string) => 
    `${source}-${type}-${category}`;

  const saveDismissedTypes = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        DISMISSED_TYPES_KEY,
        JSON.stringify(Array.from(dismissedTypesRef.current)),
      );
    } catch (error) {
      console.warn('Failed to persist dismissed recommendation types', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DISMISSED_TYPES_KEY);
      if (raw) {
        dismissedTypesRef.current = new Set(JSON.parse(raw));
      }
    } catch (error) {
      console.warn('Failed to load dismissed recommendation types', error);
    }
  }, []);

  const shouldDisplayRecommendation = useCallback(
    (recommendation: UXRecommendation) => {
      const dismissalKey = getDismissalKey(recommendation.source || 'ux', recommendation.type, recommendation.category);
      if (dismissedTypesRef.current.has(dismissalKey)) {
        return false;
      }

      if (displayedRecommendations.current.has(recommendation.id)) {
        return false;
      }

      const now = Date.now();
      const cooldown = PRIORITY_COOLDOWN[recommendation.priority];
      const lastShown = lastShownByPriority.current[recommendation.priority];
      if (now - lastShown < cooldown) {
        return false;
      }

      return true;
    },
    [],
  );

  const handleRecommendationDismiss = useCallback(
    (recommendation: UXRecommendation) => {
      trackDialogAction('dismiss', 'ux-recommendation', {
        recommendationId: recommendation.id,
        type: recommendation.type,
      });
    },
    [trackDialogAction],
  );

  /**
   * Display the actual toast notification
   */
  const displayRecommendationToast = useCallback(
    (recommendation: UXRecommendation) => {
    const icon = getRecommendationIcon(recommendation.type);
    const toastType = getToastAppearance(recommendation);

      let toastId: string | number;

      const handleAction = recommendation.action
        ? () => {
            try {
              recommendation.action?.handler();
              trackDialogAction('accept', 'ux-recommendation', {
                recommendationId: recommendation.id,
                actionTaken: recommendation.action?.label,
              });

              trackAction({
                type: 'recommendation-action',
                data: {
                  recommendationId: recommendation.id,
                  recommendationType: recommendation.type,
                  source: recommendation.source ?? 'ux',
                },
                success: true,
                duration: 0,
                context: {
                  page: 'canvas',
                  component: 'ux-recommendation-toast',
                  userIntent: 'recommendation-action',
                },
              });

              if (recommendation.source === 'workflow') {
                workflowOptimizer.trackAction(
                  'recommendation-action',
                  0,
                  true,
                  recommendation.category,
                  { recommendationId: recommendation.id },
                );
              }
            } catch (error) {
              console.warn('Failed to execute recommendation action:', error);
              trackDialogAction('error', 'ux-recommendation', {
                recommendationId: recommendation.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            } finally {
              if (toastId !== undefined) {
                toast.dismiss(toastId);
              }
            }
          }
        : undefined;

      const handleDismissForever = recommendation.dismissable === false
        ? undefined
        : () => {
            const dismissalKey = getDismissalKey(recommendation.source || 'ux', recommendation.type, recommendation.category);
            dismissedTypesRef.current.add(dismissalKey);
            saveDismissedTypes();
            trackDialogAction('dismiss-forever', 'ux-recommendation', {
              recommendationId: recommendation.id,
              type: recommendation.type,
              source: recommendation.source,
              category: recommendation.category,
            });
            toast.dismiss(toastId);
          };

      const toastContent = (
        <div className='flex items-start gap-3 max-w-md'>
          <div className='flex-shrink-0 mt-0.5'>{icon}</div>
          <div className='flex-1 min-w-0'>
            <div className='font-medium text-sm text-gray-900 mb-1'>{recommendation.title}</div>
            <div className='text-sm text-gray-600 leading-relaxed'>{recommendation.message}</div>

            {(recommendation.action || handleDismissForever) && (
              <div className='mt-3 flex flex-wrap gap-3 text-sm'>
                {recommendation.action && (
                  <button
                    onClick={handleAction}
                    className='text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline'
                  >
                    {recommendation.action.label}
                  </button>
                )}
                {handleDismissForever && (
                  <button
                    onClick={handleDismissForever}
                    className='text-gray-500 hover:text-gray-700 font-medium underline-offset-2 hover:underline'
                  >
                    Don't show again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );

      const toastOptions = {
        duration: recommendation.priority === 'high' ? 8000 : 5000,
        dismissible: recommendation.dismissable !== false,
        onDismiss: () => handleRecommendationDismiss(recommendation),
        className: `ux-recommendation-toast ux-${recommendation.type}`,
      };

      toastId = displayToast(toastContent, toastType, toastOptions);

      trackDialogAction('show', 'ux-recommendation', {
        recommendationId: recommendation.id,
        type: recommendation.type,
        priority: recommendation.priority,
        category: recommendation.category,
      });
    },
    [
      trackAction,
      trackDialogAction,
      workflowOptimizer,
      saveDismissedTypes,
      handleRecommendationDismiss,
    ],
  );

  const handleRecommendation = useCallback(
    (recommendation: UXRecommendation) => {
      displayedRecommendations.current.add(recommendation.id);
      lastShownByPriority.current[recommendation.priority] = Date.now();

      if (displayedRecommendations.current.size > 100) {
        const recentIds = Array.from(displayedRecommendations.current).slice(-50);
        displayedRecommendations.current = new Set(recentIds);
      }

      displayRecommendationToast(recommendation);
    },
    [displayRecommendationToast],
  );

  /**
   * Handle action button clicks
   */
  /**
   * Handle recommendation dismissal
   */
  const mapUXRecommendation = useCallback(
    (recommendation: OptimizerRecommendation): UXRecommendation => {
      const mappedType = OPTIMIZER_TYPE_MAP[recommendation.type];
      const stableId = generateStableId('ux', recommendation.type, recommendation.title, recommendation.type);

      return {
        id: stableId,
        type: mappedType,
        priority: recommendation.priority ?? 'medium',
        title: recommendation.title,
        message: recommendation.description,
        action: recommendation.action
          ? {
              label:
                mappedType === 'shortcut'
                  ? 'Show shortcut'
                  : 'Take action',
              handler: recommendation.action,
            }
          : undefined,
        dismissable: true,
        category: recommendation.type,
        source: 'ux',
      };
    },
    [],
  );

  const mapWorkflowRecommendation = useCallback(
    (recommendation: WorkflowRecommendation): UXRecommendation => {
      const mappedType = WORKFLOW_TYPE_MAP[recommendation.type];
      const category = (recommendation.metadata?.category as string) ?? 'workflow';
      const stableId = generateStableId('workflow', recommendation.type, recommendation.title, category);

      return {
        id: stableId,
        type: mappedType,
        priority: recommendation.priority,
        title: recommendation.title,
        message:
          recommendation.description ||
          'We found a workflow improvement you might like.',
        action: recommendation.actionText
          ? {
              label: recommendation.actionText,
              handler: () => {
                if (typeof window === 'undefined') return;
                dispatchAppEvent(
                  APP_EVENT.WORKFLOW_RECOMMENDATION_SELECTED,
                  recommendation,
                );
              },
            }
          : undefined,
        dismissable: true,
        category,
        source: 'workflow',
      };
    },
    [],
  );

  const pollRecommendations = useCallback(() => {
    const aggregated: UXRecommendation[] = [];

    try {
      const optimizerRecommendations: OptimizerRecommendation[] = getRecommendations();
      optimizerRecommendations.forEach((recommendation: OptimizerRecommendation) => {
        aggregated.push(mapUXRecommendation(recommendation));
      });
    } catch (error) {
      console.warn('Failed to fetch UX optimizer recommendations', error);
    }

    try {
      const workflowRecommendations: WorkflowRecommendation[] = workflowOptimizer.generateRecommendations();
      workflowRecommendations.forEach((recommendation: WorkflowRecommendation) => {
        aggregated.push(mapWorkflowRecommendation(recommendation));
      });
    } catch (error) {
      console.warn('Failed to generate workflow recommendations', error);
    }

    aggregated
      .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
      .forEach((recommendation) => {
        if (shouldDisplayRecommendation(recommendation)) {
          handleRecommendation(recommendation);
        }
      });
  }, [
    getRecommendations,
    workflowOptimizer,
    mapUXRecommendation,
    mapWorkflowRecommendation,
    shouldDisplayRecommendation,
    handleRecommendation,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    pollRecommendations();

    const POLL_INTERVAL = 5 * 60 * 1000;
    const intervalId = window.setInterval(pollRecommendations, POLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pollRecommendations]);

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
 * Map recommendation type and priority to toast appearance
 */
function getToastAppearance(
  recommendation: UXRecommendation
): 'success' | 'error' | 'default' {
  // Map based on recommendation type for visual consistency
  switch (recommendation.type) {
    case 'optimization':
      return 'success';
    case 'warning':
      return 'error';
    case 'tip':
    case 'shortcut':
    default:
      return 'default';
  }
}

export default UXRecommendationToast;
