import { useMemo } from "react";
import { ScenarioViewer } from "../../../../dev";
import { isDevelopment } from "../../../../lib/config/environment";
import { isOnboardingFlowCompleted } from "../../../../modules/settings";
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
  onNavigateToConfig?: () => void;
  onSkipToReview?: () => void;
  onFinishAndExport?: () => void;
  onSkipReview?: () => void;
  onFinishSession?: () => void;
  onBackToCanvas?: () => void;
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
  onNavigateToConfig,
  onSkipToReview,
  onFinishAndExport,
  onSkipReview,
  onFinishSession,
  onBackToCanvas,
}: ScreenRouterProps) {
  // Development-only scenario viewer
  if (isDevelopment() && showDevScenarios) {
    return <ScenarioViewer />;
  }

  // Show welcome screen first (defense-in-depth: check both app state and persisted settings)
  if (showWelcome && !isOnboardingFlowCompleted('welcome')) {
    return <WelcomeOverlay onComplete={onWelcomeComplete} />;
  }

  if (!selectedChallenge) {
    return (
      <ChallengeSelection
        availableChallenges={availableChallenges}
        onChallengeSelect={onChallengeSelect}
        onNavigateToConfig={onNavigateToConfig}
      />
    );
  }

  if (phase === "recording") {
    return (
      <AudioRecording
        challenge={selectedChallenge}
        designData={designData}
        onComplete={onAudioComplete}
        onBack={onBackFromAudio}
        onSkipReview={onSkipReview}
        onBackToCanvas={onBackToCanvas}
      />
    );
  }

  // Users can skip recording and go directly to review
  // Review phase now handles cases where audioData might be null (recording was skipped)
  if (phase === "review") {
    const skipRecording = !audioData || !audioData.blob;
    return (
      <ReviewScreen
        challenge={selectedChallenge}
        designData={designData}
        audioData={audioData || { blob: null, transcript: '', duration: 0, wordCount: 0, businessValueTags: [], analysisMetrics: { clarityScore: 0, technicalDepth: 0, businessFocus: 0 } }}
        onStartOver={onStartOver}
        onBackToDesign={onBackToDesign}
        onBackToAudio={onBackToAudio}
        onFinishSession={onFinishSession}
        skipRecording={skipRecording}
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
        onSkipToReview={onSkipToReview}
        onFinishAndExport={onFinishAndExport}
      />
    </InfiniteLoopErrorBoundary>
  );
}
