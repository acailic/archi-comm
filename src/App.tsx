import React, { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const ChallengeSelection = React.lazy(() => import('./components/ChallengeSelection').then(m => ({ default: m.ChallengeSelection })));
const DesignCanvas = React.lazy(() => import('./components/DesignCanvas').then(m => ({ default: m.DesignCanvas })));
const AudioRecording = React.lazy(() => import('./components/AudioRecording').then(m => ({ default: m.AudioRecording })));
const ReviewScreen = React.lazy(() => import('./components/ReviewScreen').then(m => ({ default: m.ReviewScreen })));
const WindowControls = React.lazy(() => import('./components/WindowControls').then(m => ({ default: m.WindowControls })));
const CommandPalette = React.lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const WelcomeOverlay = React.lazy(() => import('./components/WelcomeOverlay').then(m => ({ default: m.WelcomeOverlay })));
const StatusBar = React.lazy(() => import('./components/StatusBar').then(m => ({ default: m.StatusBar })));
const ChallengeManager = React.lazy(() => import('./components/ChallengeManager').then(m => ({ default: m.ChallengeManager })));
const AIConfigPage = React.lazy(() => import('./components/AIConfigPage').then(m => ({ default: m.AIConfigPage })));

import { tauriAPI, isTauriApp } from './lib/tauri';
import { challengeManager, ExtendedChallenge } from './lib/challenge-config';
import { reloadTracker, preventUnnecessaryReload } from './lib/reload-tracker';
import { getGlobalShortcutManager } from './lib/shortcuts/KeyboardShortcuts';
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
import UXRecommendationToast from './components/UXRecommendationToast';
import ContextualHelpSystem from './components/ContextualHelpSystem';
import OnboardingOverlay from './components/OnboardingOverlay';
import ShortcutCustomizationPanel from './components/ShortcutCustomizationPanel';
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

type Screen = 'welcome' | 'challenge-selection' | 'design-canvas' | 'audio-recording' | 'review';

const screenTitles = {
  welcome: 'Welcome to ArchiComm',
  'challenge-selection': 'Select Challenge',
  'design-canvas': 'Design System',
  'audio-recording': 'Record Explanation',
  review: 'Session Review'
};

const screenIcons = {
  welcome: Zap,
  'challenge-selection': Palette,
  'design-canvas': Palette,
  'audio-recording': Mic,
  review: Eye
};

export default function App() {
  // Development reload tracking
  const preventReload = preventUnnecessaryReload('App');
  preventReload();
  
  // UX Tracking integration
  const { trackNavigation, trackKeyboardShortcut, trackError, trackPerformance } = useUXTracker();
  
  // UX Enhancement Systems
  const onboardingManager = OnboardingManager.getInstance();
  const shortcutLearning = ShortcutLearningSystem.getInstance();
  const workflowOptimizer = WorkflowOptimizer.getInstance();
  
  // Initialize UX systems and log app initialization
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('app-init', 'App component initialized');
    }
    
    // Track app initialization performance
    trackPerformance('app-init-time', Date.now(), { version: '1.0' });
    
    // Initialize UX enhancement systems
    try {
      workflowOptimizer.integrateWithUXOptimizer();
      shortcutLearning.trackManualAction('app_init', 1000, 'startup');
      
      // Track workflow actions for optimization
      const trackAction = (type: string, duration: number = 100) => {
        workflowOptimizer.trackAction(type, duration, true, window.location.pathname);
      };
      
      // Global action tracking
      (window as any).trackWorkflowAction = trackAction;
      
    } catch (error) {
      console.error('Failed to initialize UX systems:', error);
      trackError(error as Error, { context: 'ux-system-init' });
    }
  }, [trackPerformance, trackError, workflowOptimizer, shortcutLearning]);
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
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

  const [showWelcome, setShowWelcome] = useState(true);
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

  // Initialize available challenges
  useEffect(() => {
    const loadInitialChallenges = async () => {
      try {
        // Load any external challenges
        const externalChallenges = await challengeManager.loadChallengesFromSource('tauri');
        setAvailableChallenges(challengeManager.getAllChallenges());
      } catch (error) {
        console.error('Error loading challenges:', error);
        setAvailableChallenges(challengeManager.getAllChallenges());
      }
    };
    
    loadInitialChallenges();
  }, []);

  // Session progress calculation
  const getSessionProgress = () => {
    const screens = ['challenge-selection', 'design-canvas', 'audio-recording', 'review'];
    const currentIndex = screens.indexOf(currentScreen);
    return currentIndex >= 0 ? ((currentIndex + 1) / screens.length) * 100 : 0;
  };

  // Debounced auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  
  const autoSave = useCallback(async (sessionData: any) => {
    try {
      await tauriAPI.saveDesign(sessionData, `autosave-${sessionData.challenge.id}`);
      if (process.env.NODE_ENV === 'development') {
        console.log('Auto-save completed');
      }
      // Track successful auto-save
      trackPerformance('auto-save-success', Date.now(), { challengeId: sessionData.challenge.id });
    } catch (error) {
      console.error('Auto-save failed:', error);
      trackError(error as Error, { context: 'auto-save', challengeId: sessionData?.challenge?.id });
    }
  }, [trackPerformance, trackError, workflowOptimizer, shortcutLearning]);
  
  const sessionDataToSave = useMemo(() => {
    if (!selectedChallenge) return null;
    
    return {
      challenge: selectedChallenge,
      design: designData,
      audio: {
        transcript: audioData.transcript,
        duration: audioData.duration,
        wordCount: audioData.wordCount,
        businessValueTags: audioData.businessValueTags
      },
      progress: currentScreen,
      timestamp: new Date().toISOString()
    };
  }, [selectedChallenge, designData.components, designData.connections, audioData.transcript, audioData.duration, audioData.wordCount, audioData.businessValueTags, currentScreen]);
  
  useEffect(() => {
    if (sessionDataToSave && (designData.components.length > 0 || audioData.transcript)) {
      // Create a serialized version to check if data actually changed
      const currentDataString = JSON.stringify({
        components: sessionDataToSave.design.components,
        connections: sessionDataToSave.design.connections,
        transcript: sessionDataToSave.audio.transcript,
        progress: sessionDataToSave.progress
      });
      
      // Only save if data actually changed
      if (currentDataString !== lastSaveDataRef.current) {
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Set new timeout for debounced save
        autoSaveTimeoutRef.current = setTimeout(() => {
          autoSave(sessionDataToSave);
          lastSaveDataRef.current = currentDataString;
        }, 3000); // Debounced to 3 seconds
      }
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [sessionDataToSave, autoSave, designData.components.length, audioData.transcript]);

  // Global keyboard shortcuts integration
  useEffect(() => {
    const manager = getGlobalShortcutManager();
    if (!manager) return;

    // Register App-specific shortcuts
    manager.register({
      key: 'k',
      modifiers: ['ctrl'],
      description: 'Open command palette',
      category: 'general',
      action: () => {
        trackKeyboardShortcut('Ctrl+K', 'command-palette', true);
        window.dispatchEvent(new CustomEvent('shortcut:command-palette'));
      }
    });

    manager.register({
      key: 'k',
      modifiers: ['meta'],
      description: 'Open command palette',
      category: 'general', 
      action: () => {
        trackKeyboardShortcut('Cmd+K', 'command-palette', true);
        window.dispatchEvent(new CustomEvent('shortcut:command-palette'));
      }
    });

    manager.register({
      key: 'c',
      modifiers: ['ctrl', 'shift'],
      description: 'Open challenge manager',
      category: 'general',
      action: () => {
        trackKeyboardShortcut('Ctrl+Shift+C', 'challenge-manager', true);
        shortcutLearning.trackShortcutUsage('challenge-manager', true, 500, 'navigation');
        window.dispatchEvent(new CustomEvent('shortcut:challenge-manager'));
      }
    });

    manager.register({
      key: 'h',
      modifiers: ['ctrl', 'shift'],
      description: 'Open shortcut customization',
      category: 'general',
      action: () => {
        trackKeyboardShortcut('Ctrl+Shift+H', 'shortcut-customization', true);
        shortcutLearning.trackShortcutUsage('shortcut-customization', true, 300, 'settings');
        setShowShortcutCustomization(true);
      }
    });

    manager.register({
      key: 'c',
      modifiers: ['meta', 'shift'],
      description: 'Open challenge manager',
      category: 'general',
      action: () => {
        trackKeyboardShortcut('Cmd+Shift+C', 'challenge-manager', true);
        shortcutLearning.trackShortcutUsage('challenge-manager', true, 500, 'navigation');
        window.dispatchEvent(new CustomEvent('shortcut:challenge-manager'));
      }
    });

    manager.register({
      key: 'h',
      modifiers: ['meta', 'shift'],
      description: 'Open shortcut customization',
      category: 'general',
      action: () => {
        trackKeyboardShortcut('Cmd+Shift+H', 'shortcut-customization', true);
        shortcutLearning.trackShortcutUsage('shortcut-customization', true, 300, 'settings');
        setShowShortcutCustomization(true);
      }
    });

    manager.register({
      key: '1',
      modifiers: ['alt'],
      description: 'Navigate to challenge selection',
      category: 'navigation',
      action: () => {
        trackKeyboardShortcut('Alt+1', 'navigate-challenge-selection', true);
        window.dispatchEvent(new CustomEvent('shortcut:navigate-to-screen', { detail: { screen: 'challenge-selection' } }));
      }
    });

    manager.register({
      key: '2',
      modifiers: ['alt'],
      description: 'Navigate to design canvas',
      category: 'navigation',
      action: () => {
        trackKeyboardShortcut('Alt+2', 'navigate-design-canvas', true);
        window.dispatchEvent(new CustomEvent('shortcut:navigate-to-screen', { detail: { screen: 'design-canvas' } }));
      }
    });

    manager.register({
      key: '3',
      modifiers: ['alt'],
      description: 'Navigate to audio recording',
      category: 'navigation',
      action: () => {
        trackKeyboardShortcut('Alt+3', 'navigate-audio-recording', true);
        window.dispatchEvent(new CustomEvent('shortcut:navigate-to-screen', { detail: { screen: 'audio-recording' } }));
      }
    });

    manager.register({
      key: '4',
      modifiers: ['alt'],
      description: 'Navigate to review',
      category: 'navigation',
      action: () => {
        trackKeyboardShortcut('Alt+4', 'navigate-review', true);
        window.dispatchEvent(new CustomEvent('shortcut:navigate-to-screen', { detail: { screen: 'review' } }));
      }
    });

    // Event listeners for shortcut actions
    const handleCommandPalette = () => {
      setShowCommandPalette(true);
      workflowOptimizer.trackAction('command_palette_open', 200, true, currentScreen);
    };
    const handleChallengeManager = () => {
      setShowChallengeManager(true);
      workflowOptimizer.trackAction('challenge_manager_open', 200, true, currentScreen);
    };
    const handleAISettings = () => {
      setShowAIConfig(true);
      workflowOptimizer.trackAction('ai_settings_open', 200, true, currentScreen);
    };
    const handleNavigateToScreen = (event: CustomEvent) => {
      const { screen } = event.detail;
      const previousScreen = currentScreen;
      
      switch (screen) {
        case 'challenge-selection':
          if (currentScreen !== 'challenge-selection') {
            trackNavigation('challenge-selection', previousScreen);
            workflowOptimizer.trackAction(`navigate_to_${screen}`, 300, true, previousScreen);
            setCurrentScreen('challenge-selection');
          }
          break;
        case 'design-canvas':
          if (selectedChallenge && currentScreen !== 'design-canvas') {
            trackNavigation('design-canvas', previousScreen);
            workflowOptimizer.trackAction(`navigate_to_${screen}`, 300, true, previousScreen);
            setCurrentScreen('design-canvas');
          }
          break;
        case 'audio-recording':
          if (selectedChallenge && currentScreen !== 'audio-recording') {
            trackNavigation('audio-recording', previousScreen);
            workflowOptimizer.trackAction(`navigate_to_${screen}`, 300, true, previousScreen);
            setCurrentScreen('audio-recording');
          }
          break;
        case 'review':
          if (selectedChallenge && currentScreen !== 'review') {
            trackNavigation('review', previousScreen);
            workflowOptimizer.trackAction(`navigate_to_${screen}`, 300, true, previousScreen);
            setCurrentScreen('review');
          }
          break;
      }
    };

    window.addEventListener('shortcut:command-palette', handleCommandPalette);
    window.addEventListener('shortcut:challenge-manager', handleChallengeManager);
    window.addEventListener('shortcut:navigate-to-screen', handleNavigateToScreen);
    window.addEventListener('shortcut:ai-settings', handleAISettings);

    return () => {
      const cleanupManager = getGlobalShortcutManager();
      if (!cleanupManager) return;

      // Cleanup shortcuts
      cleanupManager.unregister('k', ['ctrl']);
      cleanupManager.unregister('k', ['meta']);
      cleanupManager.unregister('c', ['ctrl', 'shift']);
      cleanupManager.unregister('c', ['meta', 'shift']);
      cleanupManager.unregister('h', ['ctrl', 'shift']);
      cleanupManager.unregister('h', ['meta', 'shift']);
      cleanupManager.unregister('1', ['alt']);
      cleanupManager.unregister('2', ['alt']);
      cleanupManager.unregister('3', ['alt']);
      cleanupManager.unregister('4', ['alt']);

      // Cleanup event listeners
      window.removeEventListener('shortcut:command-palette', handleCommandPalette);
      window.removeEventListener('shortcut:challenge-manager', handleChallengeManager);
      window.removeEventListener('shortcut:navigate-to-screen', handleNavigateToScreen);
      window.removeEventListener('shortcut:ai-settings', handleAISettings);
    };
  }, [selectedChallenge, trackKeyboardShortcut, trackNavigation, currentScreen, workflowOptimizer, shortcutLearning]);

  // Memoized window title
  const windowTitle = useMemo(() => {
    return selectedChallenge 
      ? `${screenTitles[currentScreen]} - ${selectedChallenge.title} - ArchiComm`
      : `${screenTitles[currentScreen]} - ArchiComm`;
  }, [currentScreen, selectedChallenge?.title]);
  
  // Set window title based on current screen
  useEffect(() => {
    tauriAPI.setWindowTitle(windowTitle);
  }, [windowTitle]);

  const handleChallengeSelect = useCallback(async (challenge: Challenge) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Challenge selected:', challenge.id);
      reloadTracker.logEvent('challenge-select', `Selected challenge: ${challenge.title}`);
    }
    
    // Track challenge selection
    trackNavigation('design-canvas', 'challenge-selection');
    workflowOptimizer.trackAction('challenge_selected', 1000, true, 'challenge-selection', {
      challengeId: challenge.id,
      difficulty: challenge.difficulty,
      category: challenge.category
    });
    
    setIsLoading(true);
    setProgress(0);
    
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 20, 90));
    }, 100);

    try {
      setSelectedChallenge(challenge);
      setSessionStartTime(new Date());
      
      // Initialize design data with metadata
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

      await new Promise(resolve => setTimeout(resolve, 500)); // Smooth transition
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        setCurrentScreen('design-canvas');
        setIsLoading(false);
        setProgress(0);
      }, 300);
      
    } catch (error) {
      console.error('Error selecting challenge:', error);
      trackError(error as Error, { context: 'challenge-selection', challengeId: challenge.id });
      clearInterval(progressInterval);
      setIsLoading(false);
      setProgress(0);
    }
  }, [trackNavigation, trackError, workflowOptimizer]);

  const handleDesignComplete = useCallback(async (data: DesignData) => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('design-complete', `Design completed with ${data.components.length} components`);
    }
    
    // Track design completion workflow
    workflowOptimizer.trackAction('design_completed', 2000, true, 'design-canvas', {
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
    setCurrentScreen('audio-recording');
    setIsLoading(false);
  }, []);

  const handleAudioComplete = useCallback(async (data: AudioData) => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('audio-complete', `Audio recorded: ${data.duration}s, ${data.wordCount} words`);
    }
    
    // Track session completion
    trackNavigation('review', 'audio-recording');
    workflowOptimizer.trackAction('audio_completed', data.duration * 1000, true, 'audio-recording', {
      duration: data.duration,
      wordCount: data.wordCount,
      tagsCount: data.businessValueTags.length
    });
    
    setIsLoading(true);
    
    // Calculate analysis metrics
    const analysisMetrics = {
      clarityScore: Math.min(100, data.duration > 0 ? (data.wordCount / data.duration) * 2 : 0), // Words per second * 2
      technicalDepth: Math.min(100, designData.components.length * 12.5), // Components * 12.5%
      businessFocus: Math.min(100, data.businessValueTags.length * 25) // Tags * 25%
    };

    const updatedData = {
      ...data,
      analysisMetrics
    };
    
    setAudioData(updatedData);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setCurrentScreen('review');
    setIsLoading(false);
  }, [designData.components.length, trackNavigation, workflowOptimizer, sessionStartTime]);

  const handleStartOver = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('session-reset', 'User started over');
    }
    
    // Track session reset
    trackNavigation('challenge-selection', currentScreen);
    
    setIsLoading(true);
    
    // Reset all state
    setCurrentScreen('challenge-selection');
    setSelectedChallenge(null);
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
    setIsLoading(false);
  }, [trackNavigation, currentScreen, workflowOptimizer]);

  const goBackToDesign = useCallback(() => {
    setCurrentScreen('design-canvas');
  }, []);

  const goBackToAudio = useCallback(() => {
    setCurrentScreen('audio-recording');
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    setCurrentScreen('challenge-selection');
    workflowOptimizer.trackAction('welcome_completed', 500, true, 'welcome');
  }, [workflowOptimizer]);

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

  const currentProgress = useMemo(() => getSessionProgress(), [currentScreen]);

  return (
    <div 
      className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      {/* Tauri Title Bar */}
      
      
      {/* Window Controls */}
      <WindowControls 
        title={screenTitles[currentScreen]}
        showMenu={currentScreen !== 'welcome'}
        onMenuClick={() => setShowCommandPalette(true)}
        additionalActions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('shortcut:ai-settings'))}
            className="px-2"
            title="AI Settings (Ctrl+,)"
          >
            <Brain className="w-4 h-4" />
          </Button>
        }
      />

      {/* Progress Bar */}
      {currentProgress > 0 && currentScreen !== 'welcome' && (
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
          {showWelcome && currentScreen === 'welcome' && (
            <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading…</div>}>
              <WelcomeOverlay 
                key="welcome"
                onComplete={handleWelcomeComplete} 
              />
            </Suspense>
          )}

          {currentScreen === 'challenge-selection' && !showWelcome && (
            <motion.div
              key="challenge-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="h-full"
            >
              <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading challenges…</div>}>
                <ChallengeSelection 
                  onChallengeSelect={handleChallengeSelect}
                  availableChallenges={availableChallenges}
                />
              </Suspense>
            </motion.div>
          )}
          
          {currentScreen === 'design-canvas' && selectedChallenge && (
            <motion.div
              key="design-canvas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="h-full"
            >
              <Suspense fallback={<div className="p-6 text-sm opacity-70">Preparing canvas…</div>}>
                <DesignCanvas
                  challenge={selectedChallenge}
                  initialData={designData}
                  onComplete={handleDesignComplete}
                  onBack={() => setCurrentScreen('challenge-selection')}
                />
              </Suspense>
            </motion.div>
          )}
          
          {currentScreen === 'audio-recording' && selectedChallenge && (
            <motion.div
              key="audio-recording"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="h-full"
            >
              <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading recorder…</div>}>
                <AudioRecording
                  challenge={selectedChallenge}
                  designData={designData}
                  onComplete={handleAudioComplete}
                  onBack={goBackToDesign}
                />
              </Suspense>
            </motion.div>
          )}
          
          {currentScreen === 'review' && selectedChallenge && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="h-full"
            >
              <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading review…</div>}>
                <ReviewScreen
                  challenge={selectedChallenge}
                  designData={designData}
                  audioData={audioData}
                  onStartOver={handleStartOver}
                  onBackToDesign={goBackToDesign}
                  onBackToAudio={goBackToAudio}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <Suspense fallback={null}>
        <StatusBar 
          currentScreen={currentScreen}
          sessionStartTime={sessionStartTime}
          selectedChallenge={selectedChallenge}
        />
      </Suspense>

      {/* Command Palette */}
      <Suspense fallback={null}>
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            setCurrentScreen(screen);
            setShowCommandPalette(false);
          }}
          selectedChallenge={selectedChallenge}
        />
      </Suspense>

      {/* Challenge Manager */}
      <Suspense fallback={null}>
        <ChallengeManager
          isOpen={showChallengeManager}
          onClose={() => setShowChallengeManager(false)}
          onChallengeUpdate={handleChallengeUpdate}
        />
      </Suspense>

      {/* AI Config Page */}
      {showAIConfig && (
        <Suspense fallback={null}>
          <AIConfigPage onClose={() => setShowAIConfig(false)} />
        </Suspense>
      )}

      {/* Shortcuts Overlay */}
      <ShortcutsOverlay 
        isOpen={shortcutsOverlay.isOpen}
        onClose={shortcutsOverlay.close}
      />

      {/* Floating Action Button for Command Palette */}
      {currentScreen !== 'welcome' && (
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
      <ContextualHelpSystem />
      
      {/* Onboarding Overlay */}
      <OnboardingOverlay />
      
      {/* Shortcut Customization Panel */}
      <ShortcutCustomizationPanel
        isOpen={showShortcutCustomization}
        onClose={() => setShowShortcutCustomization(false)}
      />
      
      {/* UX Recommendation Toast System */}
      <UXRecommendationToast />
      
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