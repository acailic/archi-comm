import React, { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const ChallengeSelection = React.lazy(() => import('@modules/challenges').then(m => ({ default: m.ChallengeSelection })));
const DesignCanvas = React.lazy(() => import('@modules/canvas').then(m => ({ default: m.DesignCanvas })));
const AudioRecording = React.lazy(() => import('@modules/session').then(m => ({ default: m.AudioRecording })));
const ReviewScreen = React.lazy(() => import('@modules/review').then(m => ({ default: m.ReviewScreen })));
const WindowControls = React.lazy(() => import('@modules/status').then(m => ({ default: m.WindowControls })));
const CommandPalette = React.lazy(() => import('@modules/command').then(m => ({ default: m.CommandPalette })));
const WelcomeOverlay = React.lazy(() => import('@modules/onboarding').then(m => ({ default: m.WelcomeOverlay })));
const StatusBar = React.lazy(() => import('@modules/status').then(m => ({ default: m.StatusBar })));
const ChallengeManager = React.lazy(() => import('@modules/challenges').then(m => ({ default: m.ChallengeManager })));

import { tauriAPI, isTauriApp } from './lib/tauri';
import { challengeManager, ExtendedChallenge } from './lib/challenge-config';
import { reloadTracker, preventUnnecessaryReload } from './lib/reload-tracker';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { 
  Zap, 
  Palette, 
  Mic, 
  Eye, 
  CheckCircle, 
  Command as CommandIcon,
  Settings
} from 'lucide-react';

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
  
  // Log app initialization in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('app-init', 'App component initialized');
    }
  }, []);
  
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
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [availableChallenges, setAvailableChallenges] = useState<ExtendedChallenge[]>([]);

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
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, []);
  
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

  // Memoized keyboard shortcuts handler
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Command palette (Cmd/Ctrl + K)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
    
    // Challenge manager (Cmd/Ctrl + Shift + C)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      setShowChallengeManager(true);
    }
    
    // Navigation shortcuts
    if (e.altKey) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          setCurrentScreen(prev => prev !== 'challenge-selection' ? 'challenge-selection' : prev);
          break;
        case '2':
          e.preventDefault();
          if (selectedChallenge) {
            setCurrentScreen(prev => prev !== 'design-canvas' ? 'design-canvas' : prev);
          }
          break;
        case '3':
          e.preventDefault();
          if (selectedChallenge) {
            setCurrentScreen(prev => prev !== 'audio-recording' ? 'audio-recording' : prev);
          }
          break;
        case '4':
          e.preventDefault();
          if (selectedChallenge) {
            setCurrentScreen(prev => prev !== 'review' ? 'review' : prev);
          }
          break;
      }
    }
  }, [selectedChallenge]);
  
  // Keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

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
      clearInterval(progressInterval);
      setIsLoading(false);
      setProgress(0);
    }
  }, []);

  const handleDesignComplete = useCallback(async (data: DesignData) => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('design-complete', `Design completed with ${data.components.length} components`);
    }
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
  }, [designData.components.length]);

  const handleStartOver = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      reloadTracker.logEvent('session-reset', 'User started over');
    }
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
  }, []);

  const goBackToDesign = useCallback(() => {
    setCurrentScreen('design-canvas');
  }, []);

  const goBackToAudio = useCallback(() => {
    setCurrentScreen('audio-recording');
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    setCurrentScreen('challenge-selection');
  }, []);

  const handleChallengeUpdate = useCallback((updatedChallenges: ExtendedChallenge[]) => {
    setAvailableChallenges(updatedChallenges);
  }, []);

  const currentProgress = useMemo(() => getSessionProgress(), [currentScreen]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden">
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
            onClick={() => setShowChallengeManager(true)}
            className="px-2"
            title="Challenge Manager (Ctrl+Shift+C)"
          >
            <Settings className="w-4 h-4" />
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
    </div>
  );
}