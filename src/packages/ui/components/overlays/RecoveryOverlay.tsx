// src/components/RecoveryOverlay.tsx
// Recovery UI overlay component for user feedback and interaction during recovery processes
// Displays recovery progress, results, and provides user actions for recovery cancellation and dismissal
// RELEVANT FILES: src/shared/ui/ErrorBoundary.tsx, src/components/ui/dialog.tsx

import React from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { RecoveryProgress, RecoveryResult } from '@/lib/recovery/ErrorRecoverySystem';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/components/ui/dialog';
import { Button } from '@ui/components/ui/button';
import { Progress } from '@ui/components/ui/progress';
import { Card, CardContent } from '@ui/components/ui/card';

interface RecoveryOverlayProps {
  isVisible: boolean;
  recoveryProgress?: RecoveryProgress | null;
  recoveryResult?: RecoveryResult | null;
  onCancel?: () => void;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function RecoveryOverlay({
  isVisible,
  recoveryProgress,
  recoveryResult,
  onCancel,
  onDismiss,
  onRetry
}: RecoveryOverlayProps) {
  if (!isVisible) return null;

  const isRecovering = !!recoveryProgress;
  const hasResult = !!recoveryResult;

  return (
    <Dialog open={isVisible} onOpenChange={() => onDismiss?.()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRecovering && (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                Recovering Application
              </>
            )}
            {hasResult && !isRecovering && (
              <>
                {recoveryResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Recovery {recoveryResult.success ? 'Successful' : 'Failed'}
              </>
            )}
            {!isRecovering && !hasResult && (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Recovery Required
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isRecovering && 'Please wait while we recover your application...'}
            {hasResult && !isRecovering && 'Recovery process completed.'}
            {!isRecovering && !hasResult && 'An error occurred that requires recovery.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recovery Progress */}
          {isRecovering && recoveryProgress && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Strategy and Step */}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Strategy: {recoveryProgress.strategy}
                    </div>
                    <div className="text-sm text-gray-600">
                      {recoveryProgress.step}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Progress
                      value={recoveryProgress.progress}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{recoveryProgress.message}</span>
                      <span>{recoveryProgress.progress}%</span>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>This may take a few seconds...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recovery Result */}
          {hasResult && recoveryResult && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Result Status */}
                  <div className={`flex items-start gap-3 p-3 rounded-lg ${
                    recoveryResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex-shrink-0">
                      {recoveryResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className={`text-sm font-medium ${
                        recoveryResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {recoveryResult.success ? 'Recovery Completed' : 'Recovery Failed'}
                      </div>
                      <div className={`text-sm ${
                        recoveryResult.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {recoveryResult.message}
                      </div>
                    </div>
                  </div>

                  {/* Strategy Used */}
                  <div className="text-xs text-gray-500">
                    Strategy used: <span className="font-medium">{recoveryResult.strategy}</span>
                  </div>

                  {/* Preserved Data Info */}
                  {recoveryResult.preservedData && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-900 mb-1">
                        Data Preservation
                      </div>
                      <div className="text-xs text-blue-700">
                        {recoveryResult.preservedData.saved?.length > 0 && (
                          <div>✅ Saved: {recoveryResult.preservedData.saved.join(', ')}</div>
                        )}
                        {recoveryResult.preservedData.failed?.length > 0 && (
                          <div>❌ Failed: {recoveryResult.preservedData.failed.join(', ')}</div>
                        )}
                        {recoveryResult.preservedData.restored?.length > 0 && (
                          <div>🔄 Restored: {recoveryResult.preservedData.restored.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next Action */}
                  {recoveryResult.nextAction && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-yellow-900 mb-1">
                        Next Steps
                      </div>
                      <div className="text-xs text-yellow-700">
                        {recoveryResult.nextAction === 'reload' && 'The application will reload automatically.'}
                        {recoveryResult.nextAction === 'reset' && 'Consider restarting the application.'}
                        {recoveryResult.nextAction === 'continue' && 'You can continue using the application.'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            {/* Cancel Button (only during recovery) */}
            {isRecovering && recoveryProgress?.canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-gray-600"
              >
                Cancel
              </Button>
            )}

            {/* Retry Button (only for failed results) */}
            {hasResult && !recoveryResult?.success && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}

            {/* Dismiss Button */}
            {!isRecovering && onDismiss && (
              <Button
                size="sm"
                onClick={onDismiss}
                className={
                  recoveryResult?.success
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              >
                {recoveryResult?.success ? 'Continue' : 'Dismiss'}
              </Button>
            )}

            {/* Close Button (top right) */}
            {!isRecovering && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="absolute top-4 right-4 p-1 h-6 w-6"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Technical Details (development only) */}
          {import.meta.env.DEV && hasResult && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                🔧 Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(recoveryResult, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RecoveryOverlay;
