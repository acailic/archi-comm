import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { isDevelopment, isTauriEnvironment } from '@/lib/environment';
import { ChallengeSelection } from '@/components/ChallengeSelection';
import { DesignCanvas } from '@/components/DesignCanvas';
import { CommandPalette } from '@/components/CommandPalette';
import { getLogger } from '@/lib/logger';
import { challengeManager, ExtendedChallenge } from '@/lib/challenge-config';
import type { DesignData, Challenge, AudioData } from '@/shared/contracts';
import { AudioRecording } from '@/components/AudioRecording';
import { ReviewScreen } from '@/components/ReviewScreen';

export type AppVariant = 'basic' | 'complex' | 'safe';

export interface FeatureConfig {
  router: boolean;
  ux: boolean;
  commandPalette: boolean;
  diagnostics: boolean;
}

function detectVariant(): AppVariant {
  const env = (import.meta as any).env || {};
  const variant = (env.VITE_APP_VARIANT as AppVariant) || (isTauriEnvironment() ? 'complex' : 'basic');
  return variant;
}

function featuresForVariant(variant: AppVariant): FeatureConfig {
  switch (variant) {
    case 'complex':
      return { router: true, ux: true, commandPalette: true, diagnostics: true };
    case 'safe':
      return { router: false, ux: false, commandPalette: false, diagnostics: true };
    default:
      return { router: false, ux: true, commandPalette: true, diagnostics: true };
  }
}

const logger = getLogger('app-container');

export default function AppContainer() {
  const variant = useMemo(detectVariant, []);
  const features = useMemo(() => featuresForVariant(variant), [variant]);

  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [designData, setDesignData] = useState<DesignData>({
    components: [],
    connections: [],
    layers: [],
    metadata: { created: new Date().toISOString(), lastModified: new Date().toISOString(), version: '1.0' },
  });
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [phase, setPhase] = useState<'design' | 'audio-recording' | 'review'>('design');
  const [availableChallenges, setAvailableChallenges] = useState<ExtendedChallenge[]>([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<
    'challenge-selection' | 'design-canvas' | 'audio-recording' | 'review'
  >('challenge-selection');

  useEffect(() => {
    try {
      setAvailableChallenges(challengeManager.getAllChallenges());
    } catch (error) {
      logger.error('Failed to load challenges', error as any);
    }
  }, []);

  const handleComplete = (data: DesignData) => {
    setDesignData(data);
    setPhase('audio-recording');
    setCurrentScreen('audio-recording');
  };

  const handleAudioComplete = (data: AudioData) => {
    setAudioData(data);
    setPhase('review');
    setCurrentScreen('review');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Escape to close command palette
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette]);

  const Screen = () => {
    if (!selectedChallenge) {
      return (
        <ChallengeSelection
          availableChallenges={availableChallenges}
          onChallengeSelect={(c: Challenge) => {
            setSelectedChallenge(c);
            setPhase('design');
            setCurrentScreen('design-canvas');
          }}
        />
      );
    }

    if (phase === 'audio-recording') {
      return (
        <AudioRecording
          challenge={selectedChallenge}
          designData={designData}
          onComplete={handleAudioComplete}
          onBack={() => {
            setPhase('design');
            setCurrentScreen('design-canvas');
          }}
        />
      );
    }

    if (phase === 'review' && audioData) {
      return (
        <ReviewScreen
          challenge={selectedChallenge}
          designData={designData}
          audioData={audioData}
          onStartOver={() => {
            setSelectedChallenge(null);
            setPhase('design');
            setAudioData(null);
            setCurrentScreen('challenge-selection');
          }}
          onBackToDesign={() => {
            setPhase('design');
            setCurrentScreen('design-canvas');
          }}
          onBackToAudio={() => {
            setPhase('audio-recording');
            setCurrentScreen('audio-recording');
          }}
        />
      );
    }

    // Default to design canvas
    return (
      <DesignCanvas
        challenge={selectedChallenge}
        initialData={designData}
        onComplete={handleComplete}
        onBack={() => {
          setSelectedChallenge(null);
          setPhase('design');
          setCurrentScreen('challenge-selection');
        }}
      />
    );
  };

  return (
    <div className="w-full h-full">
      <Suspense fallback={<div className="p-4">Loading…</div>}>
        <Screen />
      </Suspense>
      
      {/* Command Palette */}
      {features.commandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          currentScreen={selectedChallenge ? currentScreen : 'challenge-selection'}
          onNavigate={(screen) => {
            if (screen === 'challenge-selection') {
              setSelectedChallenge(null);
              setPhase('design');
              setCurrentScreen('challenge-selection');
            }
            if (screen === 'audio-recording' && selectedChallenge) {
              setPhase('audio-recording');
              setCurrentScreen('audio-recording');
            }
            if (screen === 'review' && selectedChallenge && audioData) {
              setPhase('review');
              setCurrentScreen('review');
            }
            setShowCommandPalette(false);
          }}
          selectedChallenge={selectedChallenge}
        />
      )}
      
      {features.diagnostics && isDevelopment() ? (
        <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 11, opacity: 0.5 }}>
          Variant: {variant}
        </div>
      ) : null}
    </div>
  );
}
