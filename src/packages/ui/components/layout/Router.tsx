/**
 * Router component for managing screen navigation in ArchiComm
 * Extracted from App.tsx to reduce complexity and improve maintainability
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEBUG as ENV_DEBUG, isTauriEnvironment as detectTauriEnvironment } from '@/lib/config/environment';
import {
  WebNotificationManager,
  webNotificationManager as defaultWebNotificationManager,
} from '@services/web-fallback';

const DEBUG = ENV_DEBUG ?? { logPerformance: () => {} };
const isTauriEnvironment =
  typeof detectTauriEnvironment === 'function' ? detectTauriEnvironment : () => false;
const webNotificationManager =
  defaultWebNotificationManager ?? new WebNotificationManager();

// Screen types and configuration
export type Screen =
  | 'welcome'
  | 'challenge-selection'
  | 'design-canvas'
  | 'audio-recording'
  | 'review'
  | 'pro-version';

export interface ScreenConfig {
  title: string;
  icon: React.ComponentType;
  requiresChallenge?: boolean;
  allowedPrevious?: Screen[];
  allowedNext?: Screen[];
}

export interface NavigationState {
  currentScreen: Screen;
  previousScreen: Screen | null;
  navigationHistory: Screen[];
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  category: 'system-design' | 'architecture' | 'scaling';
}

// Router context
interface RouterContextValue {
  navigationState: NavigationState;
  selectedChallenge: Challenge | null;
  navigateTo: (screen: Screen, options?: NavigationOptions) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  setChallenge: (challenge: Challenge | null) => void;
  getScreenProgress: () => number;
  isValidNavigation: (screen: Screen) => boolean;
}

export interface NavigationOptions {
  force?: boolean;
  skipHistory?: boolean;
  onBeforeNavigate?: () => Promise<boolean>;
  onAfterNavigate?: (screen: Screen) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

// Custom hook to use router with fallback
export const useRouter = (): RouterContextValue => {
  const context = useContext(RouterContext);
  if (!context) {
    // Return fallback implementation instead of throwing
    console.warn('useRouter called outside RouterProvider, using fallback');
    return {
      navigationState: {
        currentScreen: 'challenge-selection' as Screen,
        previousScreen: null,
        navigationHistory: ['challenge-selection'] as Screen[],
        canGoBack: false,
        canGoForward: false,
      },
      selectedChallenge: null,
      navigateTo: async () => false,
      goBack: async () => false,
      goForward: async () => false,
      setChallenge: () => {},
      getScreenProgress: () => 0,
      isValidNavigation: () => true,
    };
  }
  return context;
};

// Screen transition animations
const screenTransitions = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

// Navigation validation rules
const navigationRules: Record<Screen, { requiresChallenge?: boolean; allowedFrom?: Screen[] }> = {
  welcome: {},
  'challenge-selection': {},
  'design-canvas': {
    requiresChallenge: true,
    allowedFrom: ['challenge-selection', 'audio-recording', 'review'],
  },
  'audio-recording': {
    requiresChallenge: true,
    allowedFrom: ['design-canvas', 'review'],
  },
  review: {
    requiresChallenge: true,
    allowedFrom: ['audio-recording', 'design-canvas'],
  },
  'pro-version': {},
};

// Router provider component
export interface RouterProviderProps {
  children: ReactNode;
  initialScreen?: Screen;
  onNavigate?: (screen: Screen, previousScreen: Screen | null) => void;
  onError?: (error: Error, context: string) => void;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({
  children,
  initialScreen = 'challenge-selection',
  onNavigate,
  onError,
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: initialScreen,
    previousScreen: null,
    navigationHistory: [initialScreen],
    canGoBack: false,
    canGoForward: false,
  });

  // Helper function to check if navigation is valid
  const isValidNavigation = useCallback(
    (targetScreen: Screen): boolean => {
      try {
        const t0 = performance.now();
        const rules = navigationRules[targetScreen];

        // Check if challenge is required
        if (rules?.requiresChallenge && !selectedChallenge) {
          if (DEBUG?.logPerformance) {
            DEBUG.logPerformance('navigation-blocked', Math.max(0, performance.now() - t0), {
              reason: 'no-challenge',
              target: targetScreen,
            });
          }
          return false;
        }

        // Check allowed previous screens
        if (rules?.allowedFrom && !rules.allowedFrom.includes(navigationState.currentScreen)) {
          if (DEBUG?.logPerformance) {
            DEBUG.logPerformance('navigation-blocked', Math.max(0, performance.now() - t0), {
              reason: 'invalid-flow',
              from: navigationState.currentScreen,
              to: targetScreen,
            });
          }
          return false;
        }

        return true;
      } catch (error) {
        console.warn('Error in navigation validation:', error);
        return true; // Allow navigation if validation fails
      }
    },
    [selectedChallenge, navigationState.currentScreen]
  );

  // Calculate session progress
  const getScreenProgress = useCallback((): number => {
    const sessionScreens = ['challenge-selection', 'design-canvas', 'audio-recording', 'review'];
    const currentIndex = sessionScreens.indexOf(navigationState.currentScreen);
    return currentIndex >= 0 ? ((currentIndex + 1) / sessionScreens.length) * 100 : 0;
  }, [navigationState.currentScreen]);

  // Main navigation function
  const navigateTo = useCallback(
    async (screen: Screen, options: NavigationOptions = {}): Promise<boolean> => {
      const navStart = performance.now();
      const { force = false, skipHistory = false, onBeforeNavigate, onAfterNavigate } = options;

      try {
        // Skip if already on target screen
        if (navigationState.currentScreen === screen && !force) {
          return true;
        }

        // Validate navigation
        if (!force && !isValidNavigation(screen)) {
          const errorMessage = `Cannot navigate to ${screen} from ${navigationState.currentScreen}`;
          console.warn(errorMessage);

          if (onError) {
            onError(new Error(errorMessage), 'navigation-validation');
          }

          // Show user-friendly notification
          if (navigationRules[screen]?.requiresChallenge && !selectedChallenge) {
            try {
              if (webNotificationManager?.showNotification) {
                await webNotificationManager.showNotification({
                  title: 'Challenge Required',
                  body: 'Please select a challenge before proceeding to this section.',
                });
              }
            } catch (error) {
              console.warn('Failed to show notification:', error);
            }
          }

          return false;
        }

        // Call before navigate hook
        if (onBeforeNavigate) {
          const shouldContinue = await onBeforeNavigate();
          if (!shouldContinue) {
            return false;
          }
        }

        // Unified navigation timing; single measurement

        const previousScreen = navigationState.currentScreen;

        // Update navigation state
        setNavigationState(prev => {
          const newHistory = skipHistory
            ? prev.navigationHistory
            : [...prev.navigationHistory, screen];

          return {
            currentScreen: screen,
            previousScreen: prev.currentScreen,
            navigationHistory: newHistory,
            canGoBack: newHistory.length > 1,
            canGoForward: false, // Reset forward navigation
          };
        });

        // Call navigation callback
        if (onNavigate) {
          onNavigate(screen, previousScreen);
        }

        // Call after navigate hook
        if (onAfterNavigate) {
          onAfterNavigate(screen);
        }

        if (DEBUG?.logPerformance) {
          DEBUG.logPerformance('navigation', performance.now() - navStart, {
            from: previousScreen,
            to: screen,
            blocked: false,
          });
        }

        return true;
      } catch (error) {
        console.error('Navigation error:', error);
        if (onError) {
          onError(error as Error, 'navigation');
        }
        return false;
      }
    },
    [navigationState, isValidNavigation, selectedChallenge, onNavigate, onError]
  );

  // Back navigation
  const goBack = useCallback(async (): Promise<boolean> => {
    if (!navigationState.canGoBack || navigationState.navigationHistory.length <= 1) {
      return false;
    }

    const history = [...navigationState.navigationHistory];
    history.pop(); // Remove current screen
    const previousScreen = history[history.length - 1];

    return await navigateTo(previousScreen, { skipHistory: true });
  }, [navigationState, navigateTo]);

  // Forward navigation (placeholder for future implementation)
  const goForward = useCallback(async (): Promise<boolean> => {
    // Forward navigation would require maintaining a forward stack
    // For now, return false as it's not implemented
    return false;
  }, []);

  // Set challenge with validation
  const setChallenge = useCallback((challenge: Challenge | null) => {
    const t0 = performance.now();
    setSelectedChallenge(challenge);

    if (challenge && DEBUG?.logPerformance) {
      DEBUG.logPerformance('challenge-selected', Math.max(0, performance.now() - t0), {
        challengeId: challenge.id,
        difficulty: challenge.difficulty,
      });
    }
  }, []);

  // Provide keyboard navigation support
  useEffect(() => {
    const handleKeyNavigation = (event: KeyboardEvent) => {
      // Alt + Arrow keys for screen navigation
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();

        switch (event.key) {
          case 'ArrowLeft':
            goBack();
            break;
          case 'ArrowRight': {
            // Navigate to next logical screen
            const sessionScreens = [
              'challenge-selection',
              'design-canvas',
              'audio-recording',
              'review',
            ];
            const currentIndex = sessionScreens.indexOf(navigationState.currentScreen);
            if (currentIndex >= 0 && currentIndex < sessionScreens.length - 1) {
              navigateTo(sessionScreens[currentIndex + 1] as Screen);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyNavigation);
    return () => {
      window.removeEventListener('keydown', handleKeyNavigation);
    };
  }, [navigationState.currentScreen, navigateTo, goBack]);

  const contextValue: RouterContextValue = {
    navigationState,
    selectedChallenge,
    navigateTo,
    goBack,
    goForward,
    setChallenge,
    getScreenProgress,
    isValidNavigation,
  };

  return <RouterContext.Provider value={contextValue}>{children}</RouterContext.Provider>;
};

// Screen wrapper component with transitions
export interface ScreenWrapperProps {
  screen: Screen;
  isActive: boolean;
  children: ReactNode;
  className?: string;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  screen,
  isActive,
  children,
  className = '',
}) => {
  if (!isActive) return null;

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={screen}
        className={`screen-wrapper ${className}`}
        initial={screenTransitions.initial}
        animate={screenTransitions.animate}
        exit={screenTransitions.exit}
        transition={screenTransitions.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Navigation breadcrumb component
export interface NavigationBreadcrumbProps {
  className?: string;
  maxItems?: number;
}

export const NavigationBreadcrumb: React.FC<NavigationBreadcrumbProps> = ({
  className = '',
  maxItems = 4,
}) => {
  const { navigationState } = useRouter();

  const displayHistory = navigationState.navigationHistory.slice(-maxItems);

  return (
    <nav className={`navigation-breadcrumb ${className}`} aria-label='Navigation breadcrumb'>
      <ol className='breadcrumb-list'>
        {displayHistory.map((screen, index) => (
          <li
            key={`${screen}-${index}`}
            className={`breadcrumb-item ${index === displayHistory.length - 1 ? 'current' : ''}`}
          >
            {screen.replace('-', ' ')}
            {index < displayHistory.length - 1 && <span className='separator'>→</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Screen progress indicator
export interface ScreenProgressProps {
  className?: string;
  showPercentage?: boolean;
}

export const ScreenProgress: React.FC<ScreenProgressProps> = ({
  className = '',
  showPercentage = false,
}) => {
  const { getScreenProgress } = useRouter();
  const progress = getScreenProgress();

  return (
    <div className={`screen-progress ${className}`}>
      <div
        className='progress-bar'
        style={{ width: `${progress}%` }}
        role='progressbar'
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      {showPercentage && <span className='progress-text'>{Math.round(progress)}%</span>}
    </div>
  );
};

export default RouterProvider;
