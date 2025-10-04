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
import { useState } from 'react';

interface ErrorAction {
  label: string;
  onClick: () => void;
}

interface FriendlyErrorStateProps {
  title: string;
  message: string;
  suggestions?: string[];
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
  technicalDetails?: string;
  illustration?: React.ReactNode;
}

export function FriendlyErrorState({
  title,
  message,
  suggestions = [],
  primaryAction,
  secondaryAction,
  technicalDetails,
  illustration,
}: FriendlyErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

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
      <div className="flex gap-3">
        {primaryAction && (
          <Button onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline">
            {secondaryAction.label}
          </Button>
        )}
      </div>

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

// Specific error state variants
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <FriendlyErrorState
      title="Connection lost"
      message="We're having trouble connecting to the server"
      suggestions={[
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the problem persists',
      ]}
      primaryAction={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
      illustration={
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-red-500" />
        </div>
      }
    />
  );
}

export function FileErrorState({ onRetry, onChooseFile }: { onRetry?: () => void; onChooseFile?: () => void }) {
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
              onClick: onRetry,
            }
          : undefined
      }
      secondaryAction={
        onChooseFile
          ? {
              label: 'Choose Different File',
              onClick: onChooseFile,
            }
          : undefined
      }
      illustration={
        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
          <FileX className="w-12 h-12 text-orange-500" />
        </div>
      }
    />
  );
}

export function ValidationErrorState({ errors, onFix }: { errors?: string[]; onFix?: () => void }) {
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
              label: 'Fix Issues',
              onClick: onFix,
            }
          : undefined
      }
      illustration={
        <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-yellow-600" />
        </div>
      }
    />
  );
}

export function PermissionErrorState({ onRequestAccess }: { onRequestAccess?: () => void }) {
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
              onClick: onRequestAccess,
            }
          : undefined
      }
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
              onClick: onReload,
            }
          : undefined
      }
      secondaryAction={
        onReport
          ? {
              label: 'Report Issue',
              onClick: onReport,
            }
          : undefined
      }
      technicalDetails={
        typeof error === 'string'
          ? error
          : error
          ? `${error.name}: ${error.message}\n\n${error.stack || ''}`
          : undefined
      }
      illustration={
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
      }
    />
  );
}
