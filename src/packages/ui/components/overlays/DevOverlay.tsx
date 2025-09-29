/**
 * Development Error Overlay Component
 * Displays uncaught errors in a user-friendly red box interface during development
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isDevelopment } from '@/lib/config/environment';
import { errorStore, type AppError, type ErrorSeverity } from '@/lib/logging/errorStore';
import { useGuardedState } from '@/lib/performance/useGuardedState';

// Animation variants for smooth transitions
const overlayVariants = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(4px)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

const errorBoxVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

// Severity color mapping
const severityColors: Record<
  ErrorSeverity,
  { bg: string; border: string; text: string; badge: string }
> = {
  critical: {
    bg: 'bg-red-900/95',
    border: 'border-red-500',
    text: 'text-red-100',
    badge: 'bg-red-500 text-white',
  },
  high: {
    bg: 'bg-orange-900/95',
    border: 'border-orange-500',
    text: 'text-orange-100',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    bg: 'bg-yellow-900/95',
    border: 'border-yellow-500',
    text: 'text-yellow-100',
    badge: 'bg-yellow-500 text-black',
  },
  low: {
    bg: 'bg-blue-900/95',
    border: 'border-blue-500',
    text: 'text-blue-100',
    badge: 'bg-blue-500 text-white',
  },
};

interface DevOverlayProps {
  onOpenDiagnostics?: () => void;
}

export const DevOverlay: React.FC<DevOverlayProps> = ({ onOpenDiagnostics }) => {
  // Using guarded state for rapid error state changes with higher limits for dev overlay
  const [currentError, setCurrentError] = useGuardedState<AppError | null>(null, {
    componentName: 'DevOverlay',
    maxUpdatesPerTick: 25
  });
  const [isVisible, setIsVisible] = useGuardedState(false, {
    componentName: 'DevOverlay',
    maxUpdatesPerTick: 25
  });
  const [isMinimized, setIsMinimized] = useGuardedState(false, {
    componentName: 'DevOverlay',
    maxUpdatesPerTick: 25
  });
  const [errorQueue, setErrorQueue] = useGuardedState<AppError[]>([], {
    componentName: 'DevOverlay',
    maxUpdatesPerTick: 25,
    onTrip: (count) => {
      console.warn(`DevOverlay errorQueue state throttled after ${count} updates`);
    }
  });
  const [currentErrorIndex, setCurrentErrorIndex] = useGuardedState(0, {
    componentName: 'DevOverlay',
    maxUpdatesPerTick: 25,
    onTrip: (count) => {
      console.warn(`DevOverlay currentErrorIndex state throttled after ${count} updates`);
    }
  });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Only render in development mode
  if (!isDevelopment()) {
    return null;
  }

  // Subscribe to new errors
  useEffect(() => {
    const unsubscribeErrorAdded = errorStore.onErrorAdded((error: AppError) => {
      if (!error.resolved) {
        setErrorQueue(prev => {
          const newQueue = [...prev, error];
          // Show the first error if none is currently displayed
          if (!currentError && !isVisible) {
            setCurrentError(error);
            setIsVisible(true);
            setCurrentErrorIndex(0);
          }
          return newQueue;
        });
      }
    });

    // Subscribe to error store changes to handle resolved errors
    const unsubscribeStore = errorStore.subscribe(state => {
      const unresolvedErrors = state.errors.filter(e => !e.resolved);
      setErrorQueue(unresolvedErrors);

      // If current error is resolved, move to next or hide
      if (currentError && currentError.resolved) {
        handleNextError();
      }
    });

    return () => {
      unsubscribeErrorAdded();
      unsubscribeStore();
    };
  }, [currentError, isVisible]);

  // Keyboard shortcuts
  useEffect((): (() => void) | undefined => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isVisible || !currentError) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleDismiss();
          break;
        case 'c':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleCopyError();
          }
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleOpenDiagnostics();
          }
          break;
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleResolveError();
          }
          break;
        case 'ArrowLeft':
          if (errorQueue.length > 1) {
            event.preventDefault();
            handlePreviousError();
          }
          break;
        case 'ArrowRight':
          if (errorQueue.length > 1) {
            event.preventDefault();
            handleNextError();
          }
          break;
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, currentError, errorQueue, currentErrorIndex]);

  // Auto-focus overlay for keyboard navigation
  useEffect(() => {
    if (isVisible && overlayRef.current) {
      overlayRef.current.focus();
    }
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentError(null);
      setCurrentErrorIndex(0);
    }, 200);
  }, []);

  const handleNextError = useCallback(() => {
    if (errorQueue.length === 0) {
      handleDismiss();
      return;
    }

    const nextIndex = (currentErrorIndex + 1) % errorQueue.length;
    setCurrentErrorIndex(nextIndex);
    setCurrentError(errorQueue[nextIndex]);
  }, [errorQueue, currentErrorIndex]);

  const handlePreviousError = useCallback(() => {
    if (errorQueue.length === 0) return;

    const prevIndex = currentErrorIndex === 0 ? errorQueue.length - 1 : currentErrorIndex - 1;
    setCurrentErrorIndex(prevIndex);
    setCurrentError(errorQueue[prevIndex]);
  }, [errorQueue, currentErrorIndex]);

  const handleResolveError = useCallback(() => {
    if (currentError) {
      errorStore.resolveError(currentError.id);
      // The subscription will handle moving to the next error
    }
  }, [currentError]);

  const handleCopyError = useCallback(async () => {
    if (!currentError) return;

    const errorDetails = {
      message: currentError.message,
      stack: currentError.stack,
      category: currentError.category,
      severity: currentError.severity,
      timestamp: new Date(currentError.timestamp).toISOString(),
      count: currentError.count,
      context: currentError.context,
    };

    const errorText = JSON.stringify(errorDetails, null, 2);

    try {
      await navigator.clipboard.writeText(errorText);
      // Could add a toast notification here
      console.log('Error details copied to clipboard');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log('Error details copied to clipboard (fallback)');
    }
  }, [currentError]);

  const handleOpenDiagnostics = useCallback(() => {
    if (onOpenDiagnostics) {
      onOpenDiagnostics();
    }
  }, [onOpenDiagnostics]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatStackTrace = (stack?: string): string[] => {
    if (!stack) return [];
    return stack
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .filter(Boolean);
  };

  const truncateMessage = (message: string, maxLength: number = 200): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (!currentError) return null;

  const colors = severityColors[currentError.severity];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={overlayRef}
          className='fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8'
          style={{ pointerEvents: 'auto' }}
          variants={overlayVariants}
          initial='hidden'
          animate='visible'
          exit='exit'
          tabIndex={-1}
          role='alert'
          aria-live='assertive'
          aria-label='Development Error Overlay'
        >
          {/* Backdrop */}
          <motion.div className='absolute inset-0 bg-black/50' onClick={handleDismiss} />

          {/* Error Box */}
          <motion.div
            className={`relative w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-lg border-2 shadow-2xl ${colors.bg} ${colors.border} ${colors.text}`}
            variants={errorBoxVariants}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between p-4 border-b border-current/20'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse' />
                  <h2 className='text-lg font-bold'>Development Error</h2>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${colors.badge}`}>
                  {currentError.severity.toUpperCase()}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${colors.badge}`}>
                  {currentError.category}
                </span>
                {currentError.count > 1 && (
                  <span className='px-2 py-1 text-xs font-medium bg-gray-600 text-white rounded'>
                    {currentError.count}x
                  </span>
                )}
              </div>

              <div className='flex items-center gap-2'>
                {/* Error navigation */}
                {errorQueue.length > 1 && (
                  <div className='flex items-center gap-1 text-sm'>
                    <motion.button
                      className='p-1 rounded hover:bg-white/10'
                      onClick={handlePreviousError}
                      variants={buttonVariants}
                      whileHover='hover'
                      whileTap='tap'
                      title='Previous error (←)'
                    >
                      ←
                    </motion.button>
                    <span className='px-2'>
                      {currentErrorIndex + 1} / {errorQueue.length}
                    </span>
                    <motion.button
                      className='p-1 rounded hover:bg-white/10'
                      onClick={handleNextError}
                      variants={buttonVariants}
                      whileHover='hover'
                      whileTap='tap'
                      title='Next error (→)'
                    >
                      →
                    </motion.button>
                  </div>
                )}

                {/* Minimize/Maximize */}
                <motion.button
                  className='p-2 rounded hover:bg-white/10'
                  onClick={() => setIsMinimized(!isMinimized)}
                  variants={buttonVariants}
                  whileHover='hover'
                  whileTap='tap'
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? '□' : '−'}
                </motion.button>

                {/* Close */}
                <motion.button
                  className='p-2 rounded hover:bg-white/10'
                  onClick={handleDismiss}
                  variants={buttonVariants}
                  whileHover='hover'
                  whileTap='tap'
                  title='Close (Esc)'
                >
                  ×
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  className='overflow-y-auto max-h-[60vh]'
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className='p-4 space-y-4'>
                    {/* Error Message */}
                    <div>
                      <h3 className='text-sm font-semibold mb-2 opacity-75'>Error Message</h3>
                      <div className='p-3 bg-black/20 rounded font-mono text-sm break-words'>
                        {currentError.message}
                      </div>
                    </div>

                    {/* Stack Trace */}
                    {currentError.stack && (
                      <div>
                        <h3 className='text-sm font-semibold mb-2 opacity-75'>Stack Trace</h3>
                        <div className='p-3 bg-black/20 rounded font-mono text-xs space-y-1 max-h-40 overflow-y-auto'>
                          {formatStackTrace(currentError.stack).map((line, index) => (
                            <div key={index} className='break-all'>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Component Stack */}
                    {currentError.context.componentStack && (
                      <div>
                        <h3 className='text-sm font-semibold mb-2 opacity-75'>Component Stack</h3>
                        <div className='p-3 bg-black/20 rounded font-mono text-xs'>
                          {currentError.context.componentStack}
                        </div>
                      </div>
                    )}

                    {/* User Actions */}
                    {currentError.context.userActions &&
                      currentError.context.userActions.length > 0 && (
                        <div>
                          <h3 className='text-sm font-semibold mb-2 opacity-75'>
                            User Actions Leading to Error
                          </h3>
                          <div className='p-3 bg-black/20 rounded text-sm space-y-1'>
                            {currentError.context.userActions.map((action, index) => (
                              <div key={index} className='flex items-center gap-2'>
                                <span className='text-xs opacity-50'>{index + 1}.</span>
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Context Information */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                      <div>
                        <h4 className='font-semibold mb-1 opacity-75'>Timestamp</h4>
                        <div className='opacity-90'>{formatTimestamp(currentError.timestamp)}</div>
                      </div>
                      {currentError.context.url && (
                        <div>
                          <h4 className='font-semibold mb-1 opacity-75'>URL</h4>
                          <div className='opacity-90 break-all'>{currentError.context.url}</div>
                        </div>
                      )}
                      {currentError.context.performanceMetrics && (
                        <div className='md:col-span-2'>
                          <h4 className='font-semibold mb-1 opacity-75'>Performance Metrics</h4>
                          <div className='grid grid-cols-2 gap-2 text-xs opacity-90'>
                            {currentError.context.performanceMetrics.memoryUsage && (
                              <div>
                                Memory:{' '}
                                {(
                                  currentError.context.performanceMetrics.memoryUsage /
                                  1024 /
                                  1024
                                ).toFixed(2)}{' '}
                                MB
                              </div>
                            )}
                            {currentError.context.performanceMetrics.renderTime && (
                              <div>
                                Render Time:{' '}
                                {currentError.context.performanceMetrics.renderTime.toFixed(2)} ms
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className='flex flex-wrap gap-2 p-4 border-t border-current/20 bg-black/10'>
              <motion.button
                className='px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded transition-colors'
                onClick={handleResolveError}
                variants={buttonVariants}
                whileHover='hover'
                whileTap='tap'
                title='Mark as resolved (Ctrl+R)'
              >
                ✓ Resolve
              </motion.button>

              <motion.button
                className='px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded transition-colors'
                onClick={handleCopyError}
                variants={buttonVariants}
                whileHover='hover'
                whileTap='tap'
                title='Copy error details (Ctrl+C)'
              >
                📋 Copy Details
              </motion.button>

              {onOpenDiagnostics && (
                <motion.button
                  className='px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded transition-colors'
                  onClick={handleOpenDiagnostics}
                  variants={buttonVariants}
                  whileHover='hover'
                  whileTap='tap'
                  title='Open diagnostics (Ctrl+D)'
                >
                  🔧 Diagnostics
                </motion.button>
              )}

              <motion.button
                className='px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded transition-colors'
                onClick={handleDismiss}
                variants={buttonVariants}
                whileHover='hover'
                whileTap='tap'
                title='Dismiss (Esc)'
              >
                ✕ Dismiss
              </motion.button>
            </div>

            {/* Keyboard shortcuts help */}
            <div className='px-4 pb-2 text-xs opacity-50'>
              <div className='flex flex-wrap gap-4'>
                <span>Esc: Dismiss</span>
                <span>Ctrl+C: Copy</span>
                <span>Ctrl+D: Diagnostics</span>
                <span>Ctrl+R: Resolve</span>
                {errorQueue.length > 1 && (
                  <>
                    <span>←/→: Navigate</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DevOverlay;
