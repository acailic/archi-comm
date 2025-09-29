import { useMemo } from "react";
import { ScenarioViewer } from "../../../../dev";
import { isDevelopment } from "../../../../lib/config/environment";
import type {
  AudioData,
  Challenge,
  DesignData,
} from "../../../../shared/contracts/index";
import { AudioRecording } from "../AudioRecording";
import { ChallengeSelection } from "../ChallengeSelection";
import { DesignCanvas } from "../DesignCanvas";
import { WelcomeOverlay } from "../overlays/WelcomeOverlay";
import { ConfigPage } from "../pages/ConfigPage";
import { ReviewScreen } from "../pages/ReviewScreen";
import { InfiniteLoopErrorBoundary } from "./InfiniteLoopErrorBoundary";

interface ScreenRouterProps {
  showDevScenarios: boolean;
  showWelcome: boolean;
  selectedChallenge: Challenge | null;
  availableChallenges: Challenge[];
  phase: string;
  audioData: AudioData | null;
  currentScreen: string;
  designData: DesignData | null;
  onChallengeSelect: (challenge: Challenge) => void;
  onComplete: (data: DesignData) => void;
  onAudioComplete: (data: AudioData) => void;
  onBackFromAudio: () => void;
  onStartOver: () => void;
  onBackToDesign: () => void;
  onBackToAudio: () => void;
  onConfigBack: () => void;
  onBackToSelection: () => void;
  onWelcomeComplete: () => void;
  onInfiniteLoopReset: () => void;
  onRequestRecovery: () => void;
}

export function ScreenRouter({
  showDevScenarios,
  showWelcome,
  selectedChallenge,
  availableChallenges,
  phase,
  audioData,
  currentScreen,
  designData,
  onChallengeSelect,
  onComplete,
  onAudioComplete,
  onBackFromAudio,
  onStartOver,
  onBackToDesign,
  onBackToAudio,
  onConfigBack,
  onBackToSelection,
  onWelcomeComplete,
  onInfiniteLoopReset,
  onRequestRecovery,
}: ScreenRouterProps) {
  // Development-only scenario viewer
  if (isDevelopment() && showDevScenarios) {
    return <ScenarioViewer />;
  }

  // Show welcome screen first
  if (showWelcome) {
    return <WelcomeOverlay onComplete={onWelcomeComplete} />;
  }

  if (!selectedChallenge) {
    return (
      <ChallengeSelection
        availableChallenges={availableChallenges}
        onChallengeSelect={onChallengeSelect}
      />
    );
  }

  if (phase === "audio-recording") {
    return (
      <AudioRecording
        challenge={selectedChallenge}
        designData={designData}
        onComplete={onAudioComplete}
        onBack={onBackFromAudio}
      />
    );
  }

  if (phase === "review" && audioData) {
    return (
      <ReviewScreen
        challenge={selectedChallenge}
        designData={designData}
        audioData={audioData}
        onStartOver={onStartOver}
        onBackToDesign={onBackToDesign}
        onBackToAudio={onBackToAudio}
      />
    );
  }

  // Show config page if requested
  if (currentScreen === "config") {
    return <ConfigPage onBack={onConfigBack} />;
  }

  // Default to design canvas with memoized initialData
  const memoizedDesignData = useMemo(() => {
    return (
      designData || {
        schemaVersion: 1,
        components: [],
        connections: [],
        infoCards: [],
        layers: [],
        metadata: { version: "1.0" },
      }
    );
  }, [designData]);

  return (
    <InfiniteLoopErrorBoundary
      onReset={onInfiniteLoopReset}
      onRequestRecovery={onRequestRecovery}
    >
      <DesignCanvas
        challenge={selectedChallenge}
        initialData={memoizedDesignData}
        onComplete={onComplete}
        onBack={onBackToSelection}
      />
    </InfiniteLoopErrorBoundary>
  );
}
