import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Core components (eagerly loaded)
import { ChallengeSelection } from './components/ChallengeSelection';
import { DesignCanvas } from './components/DesignCanvas';

// Lazy components - with safe fallbacks
const AudioRecording = React.lazy(() => 
  import('./components/AudioRecording')
    .then(m => ({ default: m.AudioRecording }))
    .catch(() => ({ default: () => <div>Audio Recording not available</div> }))
);

const ReviewScreen = React.lazy(() => 
  import('./components/ReviewScreen')
    .then(m => ({ default: m.ReviewScreen }))
    .catch(() => ({ default: () => <div>Review Screen not available</div> }))
);

const WindowControls = React.lazy(() => 
  import('./components/WindowControls')
    .then(m => ({ default: m.WindowControls }))
    .catch(() => ({ default: () => <div>Window Controls not available</div> }))
);

const WelcomeOverlay = React.lazy(() => 
  import('./components/WelcomeOverlay')
    .then(m => ({ default: m.WelcomeOverlay }))
    .catch(() => ({ default: ({ onComplete }: any) => <div><button onClick={onComplete}>Welcome - Click to Continue</button></div> }))
);

const StatusBar = React.lazy(() => 
  import('./components/StatusBar')
    .then(m => ({ default: m.StatusBar }))
    .catch(() => ({ default: () => null }))
);

// Environment detection with fallbacks
let isTauriEnvironment: () => boolean;
let DEBUG: any;

try {
  const envModule = require('./lib/environment');
  isTauriEnvironment = envModule.isTauriEnvironment || (() => false);
  DEBUG = envModule.DEBUG || { logPerformance: () => {} };
} catch (error) {
  console.warn('Environment module not available, using fallbacks');
  isTauriEnvironment = () => {
    try {
      return typeof window !== 'undefined' && !!(window as any).__TAURI__;
    } catch {
      return false;
    }
  };
  DEBUG = { logPerformance: () => {} };
}

// Legacy imports for compatibility
import { challengeManager, ExtendedChallenge } from './lib/challenge-config';
import { reloadTracker, preventUnnecessaryReload } from './lib/reload-tracker';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { 
  Zap, 
  Brain
} from 'lucide-react';
import { useUXTracker } from './hooks/useUXTracker';
import { Toaster } from 'sonner';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  category: 'system-design' | 'architecture' | 'scaling';
}

export interface DesignComponent {
  id: string;
  type: string;
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
    return true;
  }
}

export default function App() {
  // Development reload tracking
  const preventReload = preventUnnecessaryReload('App');
  preventReload();

  // UX Tracking integration
  const { trackNavigation, trackError } = useUXTracker();

  // App state
  const isFirstVisit = useMemo(() => checkFirstVisit(), []);
  const [currentScreen, setCurrentScreen] = useState<Screen>(isFirstVisit ? 'welcome' : 'challenge-selection');
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

  const [showWelcome, setShowWelcome] = useState(isFirstVisit);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [availableChallenges, setAvailableChallenges] = useState<ExtendedChallenge[]>([]);

  // Memoized challenges
  const memoizedChallenges = useMemo(() => availableChallenges, [availableChallenges]);

  // Initialize challenges
  useEffect(() => {
    try {
      setAvailableChallenges(challengeManager.getAllChallenges());
    } catch (error) {
      console.error('Failed to load challenges:', error);
      trackError(error as Error, { context: 'challenge-loading' });
    }
  }, [trackError]);

  // Window title management
  const windowTitle = useMemo(() => {
    return selectedChallenge 
      ? `${screenTitles[currentScreen]} - ${selectedChallenge.title} - ArchiComm`
      : `${screenTitles[currentScreen]} - ArchiComm`;
  }, [currentScreen, selectedChallenge?.title]);
  
  useEffect(() => {
    try {
      if (isTauriEnvironment()) {
        import('./lib/tauri').then(({ tauriAPI }) => {
          tauriAPI.setWindowTitle(windowTitle);
        });
      } else {
        document.title = windowTitle;
      }
    } catch (error) {
      console.warn('Failed to set window title:', error);
    }
  }, [windowTitle]);

  const handleChallengeSelect = useCallback(async (challenge: Challenge) => {
    try {
      DEBUG.logPerformance?.('challenge-select-start', performance.now());
      
      trackNavigation('design-canvas', 'challenge-selection');
      
      setIsLoading(true);
      setProgress(0);
      
      setSelectedChallenge(challenge);
      setSessionStartTime(new Date());
      
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

      // Progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 500));
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        setCurrentScreen('design-canvas');
        setIsLoading(false);
        setProgress(0);
      }, 300);
      
    } catch (error) {
      console.error('Error selecting challenge:', error);
      trackError(error as Error, { context: 'challenge-selection' });
      setIsLoading(false);
      setProgress(0);
    }
  }, [trackNavigation, trackError]);

  const handleDesignComplete = useCallback(async (data: DesignData) => {
    try {
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
    } catch (error) {
      console.error('Error completing design:', error);
      setIsLoading(false);
    }
  }, []);

  const handleAudioComplete = useCallback(async (data: AudioData) => {
    try {
      setIsLoading(true);
      
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
      setCurrentScreen('review');
      setIsLoading(false);
    } catch (error) {
      console.error('Error completing audio:', error);
      setIsLoading(false);
    }
  }, [designData.components.length]);

  const handleStartOver = useCallback(async () => {
    try {
      setIsLoading(true);
      
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
    } catch (error) {
      console.error('Error starting over:', error);
      setIsLoading(false);
    }
  }, []);

  const goBackToDesign = useCallback(() => {
    setCurrentScreen('design-canvas');
  }, []);

  const goBackToAudio = useCallback(() => {
    setCurrentScreen('audio-recording');
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    try {
      window.localStorage.setItem('archicomm_first_visit', 'completed');
    } catch (e) {
      // Ignore localStorage errors
    }
    setShowWelcome(false);
    setCurrentScreen('challenge-selection');
  }, []);

  // Session progress calculation
  const currentProgress = useMemo(() => {
    const screens = ['challenge-selection', 'design-canvas', 'audio-recording', 'review'];
    const currentIndex = screens.indexOf(currentScreen);
    return currentIndex >= 0 ? ((currentIndex + 1) / screens.length) * 100 : 0;
  }, [currentScreen]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden">
      {/* Window Controls */}
      <Suspense fallback={<div className="h-12 bg-card border-b" />}>
        <WindowControls 
          title={screenTitles[currentScreen]}
          showMenu={currentScreen !== 'welcome'}
          onMenuClick={() => {}}
          additionalActions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {}}
              className="px-2"
              title="AI Settings"
            >
              <Brain className="w-4 h-4" />
            </Button>
          }
        />
      </Suspense>

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
            <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading welcome...</div>}>
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
              <ChallengeSelection 
                onChallengeSelect={handleChallengeSelect}
                availableChallenges={memoizedChallenges}
                onNavigateToPro={() => setCurrentScreen('pro-version')}
              />
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
              <DesignCanvas
                challenge={selectedChallenge}
                initialData={designData}
                onComplete={handleDesignComplete}
                onBack={() => setCurrentScreen('challenge-selection')}
              />
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
              <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading recorder...</div>}>
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
              <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading review...</div>}>
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

      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right"
        expand={true}
        richColors
        closeButton
      />
    </div>
  );
}
