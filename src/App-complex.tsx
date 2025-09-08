import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Core components (eagerly loaded)
import { ChallengeSelection } from './components/ChallengeSelection';
import { DesignCanvas } from './components/DesignCanvas';

// Enhanced lazy loading with error boundaries
import { LazyComponentWrapper, createLazyComponent } from './components/LazyComponentWrapper';

// Router for navigation management
import { RouterProvider, useRouter, ScreenWrapper } from './components/Router';

// Environment and services
import { isTauriEnvironment, DEBUG, FEATURES } from './lib/environment';
import { initializeWebFallbacks } from './services/web-fallback';

// Enhanced hooks
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

// Lazy components with enhanced error handling
const AudioRecording = createLazyComponent(
  () => import('./components/AudioRecording').then(m => ({ default: m.AudioRecording })),
  { componentName: 'AudioRecording' }
);

const ReviewScreen = createLazyComponent(
  () => import('./components/ReviewScreen').then(m => ({ default: m.ReviewScreen })),
  { componentName: 'ReviewScreen' }
);

const WindowControls = createLazyComponent(
  () => import('./components/WindowControls').then(m => ({ default: m.WindowControls })),
  { componentName: 'WindowControls' }
);

const CommandPalette = createLazyComponent(
  () => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })),
  { componentName: 'CommandPalette' }
);

const WelcomeOverlay = createLazyComponent(
  () => import('./components/WelcomeOverlay').then(m => ({ default: m.WelcomeOverlay })),
  { componentName: 'WelcomeOverlay' }
);

const StatusBar = createLazyComponent(
  () => import('./components/StatusBar').then(m => ({ default: m.StatusBar })),
  { componentName: 'StatusBar' }
);

const ChallengeManager = createLazyComponent(
  () => import('./components/ChallengeManager').then(m => ({ default: m.ChallengeManager })),
  { componentName: 'ChallengeManager' }
);

const AIConfigPage = createLazyComponent(
  () => import('./components/AIConfigPage').then(m => ({ default: m.AIConfigPage })),
  { componentName: 'AIConfigPage' }
);

const ProVersionPage = createLazyComponent(
  () => import('./components/ProVersionPage').then(m => ({ default: m.ProVersionPage })),
  { componentName: 'ProVersionPage' }
);

// Legacy imports for compatibility
import { challengeManager, ExtendedChallenge } from './lib/challenge-config';
import { reloadTracker, preventUnnecessaryReload } from './lib/reload-tracker';
import { ShortcutsOverlay, useShortcutsOverlay } from './components/shortcuts/ShortcutsOverlay';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { 
  Zap, 
  Palette, 
  Mic, 
  Eye, 
  CheckCircle, 
  Command as CommandIcon,
  Settings,
  Brain
} from 'lucide-react';
import { useUXTracker } from './hooks/useUXTracker';

// Enhanced lazy components
const UXRecommendationToast = createLazyComponent(
  () => import('./components/UXRecommendationToast').then(m => ({ default: m.default })),
  { componentName: 'UXRecommendationToast' }
);

const ContextualHelpSystem = createLazyComponent(
  () => import('./components/ContextualHelpSystem').then(m => ({ default: m.default })),
  { componentName: 'ContextualHelpSystem' }
);

const OnboardingOverlay = createLazyComponent(
  () => import('./components/OnboardingOverlay').then(m => ({ default: m.default })),
  { componentName: 'OnboardingOverlay' }
);

const ShortcutCustomizationPanel = createLazyComponent(
  () => import('./components/ShortcutCustomizationPanel').then(m => ({ default: m.default })),
  { componentName: 'ShortcutCustomizationPanel' }
);

// UX Systems
import { OnboardingManager } from './lib/onboarding/OnboardingManager';
import { ShortcutLearningSystem } from './lib/shortcuts/ShortcutLearningSystem';
import { WorkflowOptimizer } from './lib/user-experience/WorkflowOptimizer';
import { Toaster } from 'sonner';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  category: 'system-design' | 'architecture' | 'scaling';
}

export interface DesignComponent {
  id: string;
  type: 'server' | 'database' | 'load-balancer' | 'cache' | 'api-gateway' | 'client' | 
        'message-queue' | 'cdn' | 'microservice' | 'container' | 'kubernetes' | 'docker' |
        'redis' | 'mongodb' | 'postgresql' | 'mysql' | 'elasticsearch' | 'kibana' |
        'monitoring' | 'logging' | 'metrics' | 'alerting' | 'security' | 'firewall' |
        'authentication' | 'authorization' | 'oauth' | 'jwt' | 'blockchain' | 'ai-ml' |
        'data-warehouse' | 'data-lake' | 'etl' | 'stream-processing' | 'event-sourcing' |
        'cqrs' | 'graphql' | 'rest-api' | 'websocket' | 'grpc' | 'mobile-app' | 'web-app' |
        'desktop-app' | 'iot-device' | 'edge-computing' | 'serverless' | 'lambda' |
        'cloud-function' | 'storage' | 's3' | 'blob-storage' | 'file-system' | 'note';
  x: number;
  y: number;
  label: string;
  description?: string;
  properties?: Record<string, any>;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  type: 'data' | 'control' | 'sync' | 'async';
  protocol?: string;
  direction?: 'none' | 'end' | 'both';
}

export interface DesignData {
  components: DesignComponent[];
  connections: Connection[];
  metadata: {
    created: string;
    lastModified: string;
    version: string;
  };
}

export interface AudioData {
  blob: Blob | null;
  transcript: string;
  duration: number;
  wordCount: number;
  businessValueTags: string[];
  analysisMetrics: {
    clarityScore: number;
    technicalDepth: number;
    businessFocus: number;
  };
}

type Screen = 'welcome' | 'challenge-selection' | 'design-canvas' | 'audio-recording' | 'review' | 'pro-version';

const screenTitles = {
  welcome: 'Welcome to ArchiComm',
  'challenge-selection': 'Select Challenge',
  'design-canvas': 'Design System',
  'audio-recording': 'Record Explanation',
  review: 'Session Review',
  'pro-version': 'ArchiComm Pro'
};

// Helper to check first visit using localStorage
function checkFirstVisit(): boolean {
  try {
    const flag = window.localStorage.getItem('archicomm_first_visit');
    return flag === null;
  } catch (e) {
    // Fallback: treat as first visit if localStorage is unavailable
    return true;
  }
}

// Main App component - refactored for better maintainability
function AppContent() {
  // Router context
  const { navigationState, selectedChallenge, navigateTo, setChallenge } = useRouter();
  
  // UX Tracking integration  
  const { trackNavigation, trackKeyboardShortcut, trackError, trackPerformance } = useUXTracker();

  // UX Enhancement Systems - lazy initialization
  const [uxSystems, setUxSystems] = useState<{
    onboarding?: OnboardingManager;
    shortcuts?: ShortcutLearningSystem;
    workflow?: WorkflowOptimizer;
  }>({});

  // Initialize UX systems and environment
  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        DEBUG.logPerformance('app-init-start', performance.now());
        
        // Initialize web fallbacks if needed
        if (!isTauriEnvironment()) {
          await initializeWebFallbacks();
        }
        
        // Initialize UX enhancement systems
        const onboardingManager = OnboardingManager.getInstance();
        const shortcutLearning = ShortcutLearningSystem.getInstance();
        const workflowOptimizer = WorkflowOptimizer.getInstance();
        
        if (isMounted) {
          setUxSystems({ 
            onboarding: onboardingManager, 
            shortcuts: shortcutLearning, 
            workflow: workflowOptimizer 
          });
          
          // Setup integrations
          workflowOptimizer.integrateWithUXOptimizer();
          shortcutLearning.trackManualAction('app_init', 1000, 'startup');
        }
        
        DEBUG.logPerformance('app-init-complete', performance.now());
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        trackError(error as Error, { context: 'app-init' });
      }
    };
    
    initializeApp();
    
    return () => {
      isMounted = false;
    };
  }, [trackError]);

  // App state - simplified with router handling navigation
  const [designData, setDesignData] = useState<DesignData>({
    components: [],
    connections: [],
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0'
    }
  });
  
  const [audioData, setAudioData] = useState<AudioData>({
    blob: null,
    transcript: '',
    duration: 0,
    wordCount: 0,
    businessValueTags: [],
    analysisMetrics: {
      clarityScore: 0,
      technicalDepth: 0,
      businessFocus: 0
    }
  });

  // UI state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showChallengeManager, setShowChallengeManager] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showShortcutCustomization, setShowShortcutCustomization] = useState(false);
  const shortcutsOverlay = useShortcutsOverlay();
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [availableChallenges, setAvailableChallenges] = useState<ExtendedChallenge[]>([]);
  const [contextMenu, setContextMenu] = useState<{x: number; y: number; visible: boolean}>({
    x: 0,
    y: 0,
    visible: false
  });
  
  // Check for first visit
  const isFirstVisit = useMemo(() => checkFirstVisit(), []);
  const [showWelcome, setShowWelcome] = useState(isFirstVisit);

  // Performance optimization: prevent unnecessary re-renders of availableChallenges
  const memoizedChallenges = useMemo(() => availableChallenges, [availableChallenges]);

  // Initialize available challenges
  useEffect(() => {
    setAvailableChallenges(challengeManager.getAllChallenges());

    const loadExternalChallenges = async () => {
      try {
        const cached = localStorage.getItem('archicomm_cached_challenges');
        if (cached) {
          JSON.parse(cached).forEach((c) => challengeManager.addCustomChallenge(c));
          setAvailableChallenges(challengeManager.getAllChallenges());
        }

        const external = await challengeManager.loadChallengesFromSource('tauri');
        if (external.length > 0) {
          external.forEach((c) => challengeManager.addCustomChallenge(c));
          setAvailableChallenges(challengeManager.getAllChallenges());
          localStorage.setItem('archicomm_cached_challenges', JSON.stringify(external));
        }
      } catch (err) {
        console.error('Background loading failed:', err);
      }
    };

    loadExternalChallenges();
  }, []);

  // Global keyboard shortcuts with enhanced management
  useGlobalShortcuts({
    handlers: {
      onCommandPalette: () => {
        setShowCommandPalette(true);
        uxSystems.workflow?.trackAction('command_palette_open', 200, true, navigationState.currentScreen);
      },
      onChallengeManager: () => {
        setShowChallengeManager(true);
        uxSystems.workflow?.trackAction('challenge_manager_open', 200, true, navigationState.currentScreen);
      },
      onAISettings: () => {
        setShowAIConfig(true);
        uxSystems.workflow?.trackAction('ai_settings_open', 200, true, navigationState.currentScreen);
      },
      onShortcutCustomization: () => setShowShortcutCustomization(true),
      onNavigateToScreen: (screen: string) => {
        navigateTo(screen as any);
      },
    },
    tracking: {
      trackKeyboardShortcut,
      trackShortcutUsage: uxSystems.shortcuts?.trackShortcutUsage.bind(uxSystems.shortcuts),
      trackWorkflowAction: uxSystems.workflow?.trackAction.bind(uxSystems.workflow),
    },
    currentScreen: navigationState.currentScreen,
    selectedChallenge,
  });

  // Window title management
  const windowTitle = useMemo(() => {
    return selectedChallenge 
      ? `${screenTitles[navigationState.currentScreen]} - ${selectedChallenge.title} - ArchiComm`
      : `${screenTitles[navigationState.currentScreen]} - ArchiComm`;
  }, [navigationState.currentScreen, selectedChallenge?.title]);
  
  // Set window title - with environment awareness
  useEffect(() => {
    if (isTauriEnvironment()) {
      // Use Tauri API for title setting
      import('./lib/tauri').then(({ tauriAPI }) => {
        tauriAPI.setWindowTitle(windowTitle);
      });
    } else {
      document.title = windowTitle;
    }
  }, [windowTitle]);

  const handleChallengeSelect = useCallback(async (challenge: Challenge) => {
    DEBUG.logPerformance('challenge-select-start', performance.now(), { challengeId: challenge.id });
    
    // Track challenge selection
    trackNavigation('design-canvas', 'challenge-selection');
    uxSystems.workflow?.trackAction('challenge_selected', 1000, true, 'challenge-selection', {
      challengeId: challenge.id,
      difficulty: challenge.difficulty,
      category: challenge.category
    });
    
    setIsLoading(true);
    setProgress(0);
    
    try {
      // Set challenge using router
      setChallenge(challenge);
      setSessionStartTime(new Date());
      
      // Initialize design data
      const initialDesignData = {
        components: [],
        connections: [],
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: '1.0'
        }
      };
      setDesignData(initialDesignData);

      // Smooth progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 500));
      clearInterval(progressInterval);
      setProgress(100);
      
      // Navigate using router
      setTimeout(async () => {
        await navigateTo('design-canvas');
        setIsLoading(false);
        setProgress(0);
      }, 300);
      
    } catch (error) {
      console.error('Error selecting challenge:', error);
      trackError(error as Error, { context: 'challenge-selection', challengeId: challenge.id });
      setIsLoading(false);
      setProgress(0);
    }
  }, [trackNavigation, trackError, uxSystems.workflow, setChallenge, navigateTo]);

  const handleDesignComplete = useCallback(async (data: DesignData) => {
    DEBUG.logPerformance('design-complete', performance.now(), { 
      componentsCount: data.components.length,
      connectionsCount: data.connections.length
    });
    
    // Track design completion
    uxSystems.workflow?.trackAction('design_completed', 2000, true, 'design-canvas', {
      componentsCount: data.components.length,
      connectionsCount: data.connections.length,
      designDuration: sessionStartTime ? Date.now() - sessionStartTime.getTime() : 0
    });
    
    setIsLoading(true);
    
    const updatedData = {
      ...data,
      metadata: {
        ...data.metadata,
        lastModified: new Date().toISOString()
      }
    };
    
    setDesignData(updatedData);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    await navigateTo('audio-recording');
    setIsLoading(false);
  }, [uxSystems.workflow, sessionStartTime, navigateTo]);

  const handleAudioComplete = useCallback(async (data: AudioData) => {
    DEBUG.logPerformance('audio-complete', performance.now(), {
      duration: data.duration,
      wordCount: data.wordCount
    });
    
    // Track session completion
    trackNavigation('review', 'audio-recording');
    uxSystems.workflow?.trackAction('audio_completed', data.duration * 1000, true, 'audio-recording', {
      duration: data.duration,
      wordCount: data.wordCount,
      tagsCount: data.businessValueTags.length
    });
    
    setIsLoading(true);
    
    // Calculate analysis metrics
    const analysisMetrics = {
      clarityScore: Math.min(100, data.duration > 0 ? (data.wordCount / data.duration) * 2 : 0),
      technicalDepth: Math.min(100, designData.components.length * 12.5),
      businessFocus: Math.min(100, data.businessValueTags.length * 25)
    };

    const updatedData = {
      ...data,
      analysisMetrics
    };
    
    setAudioData(updatedData);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    await navigateTo('review');
    setIsLoading(false);
  }, [designData.components.length, trackNavigation, uxSystems.workflow, navigateTo]);

  const handleStartOver = useCallback(async () => {
    DEBUG.logPerformance('session-reset', performance.now());
    
    // Track session reset
    trackNavigation('challenge-selection', navigationState.currentScreen);
    
    setIsLoading(true);
    
    // Reset all state
    setChallenge(null);
    setDesignData({
      components: [],
      connections: [],
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0'
      }
    });
    setAudioData({
      blob: null,
      transcript: '',
      duration: 0,
      wordCount: 0,
      businessValueTags: [],
      analysisMetrics: {
        clarityScore: 0,
        technicalDepth: 0,
        businessFocus: 0
      }
    });
    setSessionStartTime(null);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    await navigateTo('challenge-selection');
    setIsLoading(false);
  }, [trackNavigation, navigationState.currentScreen, setChallenge, navigateTo]);

  const goBackToDesign = useCallback(() => {
    navigateTo('design-canvas');
  }, [navigateTo]);

  const goBackToAudio = useCallback(() => {
    navigateTo('audio-recording');
  }, [navigateTo]);

  const handleWelcomeComplete = useCallback(() => {
    try {
      window.localStorage.setItem('archicomm_first_visit', 'completed');
    } catch (e) {
      // Ignore localStorage errors
    }
    setShowWelcome(false);
    navigateTo('challenge-selection');
    uxSystems.workflow?.trackAction('welcome_completed', 500, true, 'welcome');
  }, [uxSystems.workflow, navigateTo]);

  const handleChallengeUpdate = useCallback((updatedChallenges: ExtendedChallenge[]) => {
    setAvailableChallenges(updatedChallenges);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  }, []);

  const handleReload = useCallback(() => {
    setContextMenu({x: 0, y: 0, visible: false});
    window.location.reload();
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({x: 0, y: 0, visible: false});
  }, []);

  useEffect(() => {
    const handleClick = () => hideContextMenu();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible, hideContextMenu]);

  // Session progress calculation using router
  const currentProgress = useMemo(() => {
    const screens = ['challenge-selection', 'design-canvas', 'audio-recording', 'review'];
    const currentIndex = screens.indexOf(navigationState.currentScreen);
    return currentIndex >= 0 ? ((currentIndex + 1) / screens.length) * 100 : 0;
  }, [navigationState.currentScreen]);

  return (
    <div 
      className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      {/* Window Controls */}
      <LazyComponentWrapper componentName="WindowControls">
        <WindowControls 
          title={screenTitles[navigationState.currentScreen]}
          showMenu={navigationState.currentScreen !== 'welcome'}
          onMenuClick={() => setShowCommandPalette(true)}
          additionalActions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIConfig(true)}
              className="px-2"
              title="AI Settings (Ctrl+,)"
            >
              <Brain className="w-4 h-4" />
            </Button>
          }
        />
      </LazyComponentWrapper>

      {/* Progress Bar */}
      {currentProgress > 0 && navigationState.currentScreen !== 'welcome' && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="px-4 py-2 bg-card/50 backdrop-blur-sm border-b border-border/30"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Session Progress</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <Progress value={currentProgress} className="h-1.5" />
        </motion.div>
      )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-xl p-6 shadow-2xl border border-border/50 min-w-64"
            >
              <div className="flex items-center space-x-3 mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="w-5 h-5 text-primary" />
                </motion.div>
                <span className="font-medium">Processing...</span>
              </div>
              {progress > 0 && (
                <Progress value={progress} className="h-2" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <ScreenWrapper 
            screen="welcome" 
            isActive={showWelcome && navigationState.currentScreen === 'welcome'}
          >
            <WelcomeOverlay onComplete={handleWelcomeComplete} />
          </ScreenWrapper>

          <ScreenWrapper 
            screen="challenge-selection" 
            isActive={navigationState.currentScreen === 'challenge-selection' && !showWelcome}
          >
            <ChallengeSelection 
              onChallengeSelect={handleChallengeSelect}
              availableChallenges={memoizedChallenges}
            />
          </ScreenWrapper>
          
          <ScreenWrapper 
            screen="design-canvas" 
            isActive={navigationState.currentScreen === 'design-canvas' && !!selectedChallenge}
          >
            <DesignCanvas
              challenge={selectedChallenge!}
              initialData={designData}
              onComplete={handleDesignComplete}
              onBack={() => navigateTo('challenge-selection')}
            />
          </ScreenWrapper>
          
          <ScreenWrapper 
            screen="audio-recording" 
            isActive={navigationState.currentScreen === 'audio-recording' && !!selectedChallenge}
          >
            <AudioRecording
              challenge={selectedChallenge!}
              designData={designData}
              onComplete={handleAudioComplete}
              onBack={goBackToDesign}
            />
          </ScreenWrapper>
          
          <ScreenWrapper 
            screen="review" 
            isActive={navigationState.currentScreen === 'review' && !!selectedChallenge}
          >
            <ReviewScreen
              challenge={selectedChallenge!}
              designData={designData}
              audioData={audioData}
              onStartOver={handleStartOver}
              onBackToDesign={goBackToDesign}
              onBackToAudio={goBackToAudio}
            />
          </ScreenWrapper>

          <ScreenWrapper 
            screen="pro-version" 
            isActive={navigationState.currentScreen === 'pro-version'}
          >
            <ProVersionPage />
          </ScreenWrapper>
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <LazyComponentWrapper componentName="StatusBar" fallback={null}>
        <StatusBar 
          currentScreen={navigationState.currentScreen}
          sessionStartTime={sessionStartTime}
          selectedChallenge={selectedChallenge}
        />
      </LazyComponentWrapper>

      {/* Command Palette */}
      <LazyComponentWrapper componentName="CommandPalette" fallback={null}>
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          currentScreen={navigationState.currentScreen}
          onNavigate={(screen) => {
            navigateTo(screen);
            setShowCommandPalette(false);
          }}
          selectedChallenge={selectedChallenge}
        />
      </LazyComponentWrapper>

      {/* Challenge Manager */}
      <LazyComponentWrapper componentName="ChallengeManager" fallback={null}>
        <ChallengeManager
          isOpen={showChallengeManager}
          onClose={() => setShowChallengeManager(false)}
          onChallengeUpdate={handleChallengeUpdate}
        />
      </LazyComponentWrapper>

      {/* AI Config Page */}
      {showAIConfig && (
        <LazyComponentWrapper componentName="AIConfigPage" fallback={null}>
          <AIConfigPage onClose={() => setShowAIConfig(false)} />
        </LazyComponentWrapper>
      )}

      {/* Shortcuts Overlay */}
      <ShortcutsOverlay 
        isOpen={shortcutsOverlay.isOpen}
        onClose={shortcutsOverlay.close}
      />

      {/* Floating Action Button for Command Palette */}
      {navigationState.currentScreen !== 'welcome' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Button
            onClick={() => setShowCommandPalette(true)}
            size="lg"
            className="rounded-full w-12 h-12 p-0 bg-primary/90 hover:bg-primary shadow-2xl border border-primary/20 backdrop-blur-sm"
          >
            <CommandIcon className="w-5 h-5" />
          </Button>
        </motion.div>
      )}

      {/* UX Enhancement Systems */}
      <LazyComponentWrapper componentName="ContextualHelpSystem" fallback={null}>
        <ContextualHelpSystem />
      </LazyComponentWrapper>
      
      {/* Onboarding Overlay */}
      <LazyComponentWrapper componentName="OnboardingOverlay" fallback={null}>
        <OnboardingOverlay />
      </LazyComponentWrapper>
      
      {/* Shortcut Customization Panel */}
      <LazyComponentWrapper componentName="ShortcutCustomizationPanel" fallback={null}>
        <ShortcutCustomizationPanel
          isOpen={showShortcutCustomization}
          onClose={() => setShowShortcutCustomization(false)}
        />
      </LazyComponentWrapper>
      
      {/* UX Recommendation Toast System */}
      <LazyComponentWrapper componentName="UXRecommendationToast" fallback={null}>
        <UXRecommendationToast />
      </LazyComponentWrapper>
      
      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right"
        expand={true}
        richColors
        closeButton
      />

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-32"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button
            onClick={handleReload}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            Reload App
          </button>
        </div>
      )}
    </div>
  );
}

// Main App wrapper with router
export default function App() {
  // Development reload tracking
  const preventReload = preventUnnecessaryReload('App');
  preventReload();
  
  // Check first visit for initial screen
  const isFirstVisit = checkFirstVisit();
  const initialScreen = isFirstVisit ? 'welcome' : 'challenge-selection';
  
  return (
    <RouterProvider 
      initialScreen={initialScreen}
      onNavigate={(screen, previousScreen) => {
        DEBUG.logPerformance('navigation', performance.now(), { 
          from: previousScreen, 
          to: screen 
        });
      }}
      onError={(error, context) => {
        console.error(`Router error [${context}]:`, error);
      }}
    >
      <AppContent />
    </RouterProvider>
  );
}