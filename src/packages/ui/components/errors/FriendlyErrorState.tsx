// src/packages/ui/components/errors/FriendlyErrorState.tsx
// Friendly, helpful error state components with illustrations and actionable guidance
// Replaces generic error messages with beautiful, helpful error states
// RELEVANT FILES: src/lib/animations/canvas-empty-states.tsx, src/packages/ui/components/ErrorBoundary/EnhancedErrorBoundary.tsx

import { motion } from 'framer-motion';
import {
  AlertCircle,
  RefreshCw,
  FileX,
  WifiOff,
  Lock,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/packages/ui/components/ui/button';
import { useMemo, useState } from 'react';
import { UXOptimizer } from '@/lib/user-experience/UXOptimizer';

interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}

interface FriendlyErrorStateProps {
  title: string;
  message: string;
  suggestions?: string[];
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
  extraActions?: ErrorAction[];
  technicalDetails?: string;
  illustration?: React.ReactNode;
}

export function FriendlyErrorState({
  title,
  message,
  suggestions = [],
  primaryAction,
  secondaryAction,
  extraActions,
  technicalDetails,
  illustration,
}: FriendlyErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
const actions: ErrorAction[] = [];
  if (primaryAction) actions.push({ ...primaryAction, variant: 'default' });
  if (secondaryAction) actions.push({ ...secondaryAction, variant: 'outline' });
  if (extraActions?.length) {
    extraActions.forEach((action) =>
      actions.push({ ...action, variant: action.variant ?? 'ghost' }),
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-6 p-8 max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {illustration}
      </motion.div>

      {/* Title and message */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-gray-700">Things to try:</p>
          <ul className="space-y-1 text-sm text-gray-600">
            {suggestions.map((suggestion, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-2"
              >
                <span className="text-blue-500 mt-1">•</span>
                <span>{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant={action.variant}
              size="sm"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Technical details (collapsible) */}
      {technicalDetails && (
        <div className="w-full">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Technical details
          </button>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-40"
            >
              {technicalDetails}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const trackErrorInteraction = (action: string, metadata?: Record<string, any>) => {
  try {
    const optimizer = UXOptimizer.getInstance();
    optimizer.trackAction({
      type: 'error-action',
      data: { action, ...metadata },
      success: true,
      duration: 0,
      context: {
        page: 'error-state',
        component: action,
      },
    });
  } catch (error) {
    console.warn('Failed to record error interaction', error);
  }
};

// Specific error state variants
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const handleRetry = () => {
    trackErrorInteraction('network-retry');
    onRetry?.();
  };

  const handleWorkOffline = () => {
    trackErrorInteraction('network-offline-mode');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('network:work-offline'));
    }
  };

  const handleStatusPage = () => {
    trackErrorInteraction('network-status-page');
    if (typeof window !== 'undefined') {
      window.open('https://status.archicomm.app', '_blank', 'noopener');
    }
  };

  return (
    <FriendlyErrorState
      title="Connection lost"
      message={
        isOnline
          ? "We're having trouble reaching the server."
          : "You're currently offline."
      }
      suggestions={[
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the problem persists',
      ]}
      primaryAction={
        onRetry
          ? {
              label: 'Try Again',
              onClick: handleRetry,
            }
          : undefined
      }
      secondaryAction={{
        label: 'View Status',
        onClick: handleStatusPage,
        variant: 'outline',
      }}
      extraActions={[
        {
          label: 'Work Offline',
          onClick: handleWorkOffline,
          variant: 'ghost',
        },
      ]}
      illustration={
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-red-500" />
        </div>
      }
    />
  );
}

export function FileErrorState({ onRetry, onChooseFile }: { onRetry?: () => void; onChooseFile?: () => void }) {
  const handleRetry = () => {
    trackErrorInteraction('file-retry');
    onRetry?.();
  };

  const handleChooseFile = () => {
    trackErrorInteraction('file-choose-different');
    onChooseFile?.();
  };

  const handleViewRequirements = () => {
    trackErrorInteraction('file-view-requirements');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('docs:open', { detail: { topic: 'file-requirements' } }),
      );
    }
  };

  return (
    <FriendlyErrorState
      title="File error"
      message="We couldn't load that file"
      suggestions={[
        'Make sure the file is a valid ArchiComm design',
        'Try exporting the file again',
        'Check file permissions',
      ]}
      primaryAction={
        onRetry
          ? {
              label: 'Try Again',
              onClick: handleRetry,
            }
          : undefined
      }
      secondaryAction={
        onChooseFile
          ? {
              label: 'Choose Different File',
              onClick: handleChooseFile,
            }
          : undefined
      }
      extraActions={[
        {
          label: 'View File Requirements',
          onClick: handleViewRequirements,
          variant: 'ghost',
        },
      ]}
      illustration={
        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
          <FileX className="w-12 h-12 text-orange-500" />
        </div>
      }
    />
  );
}

export function ValidationErrorState({ errors, onFix }: { errors?: string[]; onFix?: () => void }) {
  const handleFix = () => {
    trackErrorInteraction('validation-auto-fix');
    onFix?.();
  };

  const handleShowExamples = () => {
    trackErrorInteraction('validation-show-examples');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('docs:open', { detail: { topic: 'validation-examples' } }),
      );
    }
  };

  return (
    <FriendlyErrorState
      title="Validation failed"
      message="Some issues need to be fixed before continuing"
      suggestions={errors || [
        'Check all required fields are filled',
        'Verify component connections are valid',
        'Review component properties',
      ]}
      primaryAction={
        onFix
          ? {
              label: 'Fix Automatically',
              onClick: handleFix,
            }
          : undefined
      }
      extraActions={[
        {
          label: 'Show Examples',
          onClick: handleShowExamples,
          variant: 'ghost',
        },
      ]}
      illustration={
        <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-yellow-600" />
        </div>
      }
    />
  );
}

export function PermissionErrorState({ onRequestAccess }: { onRequestAccess?: () => void }) {
  const handleRequest = () => {
    trackErrorInteraction('permission-request');
    onRequestAccess?.();
  };

  const handleLearnMore = () => {
    trackErrorInteraction('permission-learn-more');
    if (typeof window !== 'undefined') {
      window.open('https://docs.archicomm.app/permissions', '_blank', 'noopener');
    }
  };

  return (
    <FriendlyErrorState
      title="Access denied"
      message="You don't have permission to access this"
      suggestions={[
        'Sign in with an account that has access',
        'Request access from the owner',
        'Contact your administrator',
      ]}
      primaryAction={
        onRequestAccess
          ? {
              label: 'Request Access',
              onClick: handleRequest,
            }
          : undefined
      }
      secondaryAction={{
        label: 'Learn More',
        onClick: handleLearnMore,
        variant: 'outline',
      }}
      illustration={
        <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center">
          <Lock className="w-12 h-12 text-purple-500" />
        </div>
      }
    />
  );
}

export function NotFoundErrorState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <FriendlyErrorState
      title="Not found"
      message="We couldn't find what you're looking for"
      suggestions={[
        'Check the URL for typos',
        'Go back to the homepage',
        'Try searching for what you need',
      ]}
      primaryAction={
        onGoBack
          ? {
              label: 'Go Back',
              onClick: onGoBack,
            }
          : undefined
      }
      illustration={
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
      }
    />
  );
}

export function GenericErrorState({ onReload, onReport, error }: {
  onReload?: () => void;
  onReport?: () => void;
  error?: Error | string;
}) {
  const errorDetails = useMemo(() => {
    if (typeof error === 'string') return error;
    if (error) {
      return `${error.name}: ${error.message}\n\n${error.stack || ''}`;
    }
    return undefined;
  }, [error]);

  const handleReload = () => {
    trackErrorInteraction('generic-reload');
    onReload?.();
  };

  const handleReport = () => {
    trackErrorInteraction('generic-report');
    onReport?.();
  };

  const handleCopyDetails = async () => {
    trackErrorInteraction('generic-copy-details');
    try {
      if (errorDetails) {
        await navigator.clipboard.writeText(errorDetails);
      }
    } catch (err) {
      console.warn('Failed to copy error details', err);
    }
  };

  const handleReset = () => {
    trackErrorInteraction('generic-reset-last-save');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:restore-last-save'));
    }
  };

  return (
    <FriendlyErrorState
      title="Something went wrong"
      message="An unexpected error occurred"
      suggestions={[
        'Reload the page and try again',
        'Check the console for more details',
        'Report this issue if it persists',
      ]}
      primaryAction={
        onReload
          ? {
              label: 'Reload',
              onClick: handleReload,
            }
          : undefined
      }
      secondaryAction={
        onReport
          ? {
              label: 'Report Issue',
              onClick: handleReport,
            }
          : undefined
      }
      extraActions={[
        {
          label: 'Copy Error Details',
          onClick: handleCopyDetails,
          variant: 'ghost',
        },
        {
          label: 'Reset to Last Save',
          onClick: handleReset,
          variant: 'ghost',
        },
      ]}
      technicalDetails={errorDetails}
      illustration={
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
      }
    />
  );
}
