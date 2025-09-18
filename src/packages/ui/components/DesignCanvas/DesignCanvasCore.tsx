// src/components/DesignCanvas/DesignCanvasCore.tsx
// Core DesignCanvas component logic and orchestration
// Main component structure, hooks integration, and render guard logic
// RELEVANT FILES: DesignCanvasHeader.tsx, hooks/useDesignCanvasCallbacks.ts, hooks/useDesignCanvasState.ts, hooks/useDesignCanvasEffects.ts

import { usePerformanceMonitor } from '@hooks/usePerformanceMonitor';
import { useInitialCanvasSync } from '@hooks/useInitialCanvasSync';
import { useStableCallbacks, useStableCallback } from '@hooks/useStableCallbacks';
import { storage } from '@services/storage';
import {
  useCanvasActions,
  useCanvasComponents,
  useCanvasConnectionStart,
  useCanvasConnections,
  useCanvasInfoCards,
  useCanvasSelectedComponent,
  useCanvasVisualTheme,
} from '@/stores/canvasStore';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import { ReactFlowCanvas } from '@canvas/components/ReactFlowCanvas';
import { ExtendedChallenge, challengeManager } from '@/lib/config/challenge-config';
import type { Challenge, DesignData } from '@/shared/contracts';
import { AssignmentPanel } from '@ui/components/AssignmentPanel';
import { PropertiesPanel } from '@ui/components/PropertiesPanel';
import { StatusBar } from '@ui/components/layout/StatusBar';
import { ResizablePanel } from '@ui/components/ui/ResizablePanel';
import { DesignCanvasHeader } from './DesignCanvasHeader';
import { useDesignCanvasCallbacks } from './hooks/useDesignCanvasCallbacks';
import { useDesignCanvasState } from './hooks/useDesignCanvasState';
import { useDesignCanvasEffects } from './hooks/useDesignCanvasEffects';
import { useDesignCanvasImportExport } from './hooks/useDesignCanvasImportExport';
import { useDesignCanvasPerformance } from './hooks/useDesignCanvasPerformance';
import { useRenderSnapshotDebug } from './hooks/useRenderSnapshotDebug';
import { useStatusBarMetrics } from './hooks/useStatusBarMetrics';
import { EmergencyPauseOverlay } from './components/EmergencyPauseOverlay';
import { CanvasOverlays } from './components/CanvasOverlays';

const EMPTY_LAYERS: ReadonlyArray<any> = Object.freeze([]);

export interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack }: DesignCanvasProps) {
  usePerformanceMonitor('DesignCanvas');

  const mountedRef = useRef(false);
  const lastRenderSnapshotRef = useRef<
    | {
        componentsLength: number;
        connectionsLength: number;
        infoCardsLength: number;
        selectedComponent: string | null;
        challengeId: string;
        isSynced: boolean;
      }
    | null
  >(null);
  const [sessionStartTime] = React.useState<Date>(new Date());
  const flushDesignDataRef = React.useRef<
    ((reason: string, options?: { immediate?: boolean }) => void) | undefined
  >(undefined);

  // Mount detection
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Canvas actions and state
  const canvasActions = useCanvasActions();
  const { isSynced } = useInitialCanvasSync({
    initialData: {
      components: initialData.components || [],
      connections: initialData.connections || [],
      infoCards: initialData.infoCards || [],
    },
    challengeId: challenge.id,
    enabled: true,
  });

  // Selective subscriptions to prevent unnecessary re-renders
  const components = useCanvasComponents();
  const connections = useCanvasConnections();
  const infoCards = useCanvasInfoCards();
  const selectedComponent = useCanvasSelectedComponent();
  const connectionStart = useCanvasConnectionStart();
  const visualTheme = useCanvasVisualTheme();

  // Performance monitoring with extracted hook
  const {
    renderGuard,
    emergencyPauseReason,
    setEmergencyPauseReason,
    circuitBreakerDetails,
    handleResumeAfterPause,
  } = useDesignCanvasPerformance({
    challenge,
    components,
    connections,
    infoCards,
    selectedComponent,
    isSynced,
    initialData,
    flushDesignDataRef,
  });

  useRenderSnapshotDebug({
    components,
    connections,
    infoCards,
    selectedComponent,
    challengeId: challenge.id,
    isSynced,
    renderGuard,
    lastRenderSnapshotRef,
  });


  // Initialize state and callbacks
  const {
    showHints,
    setShowHints,
    showCommandPalette,
    setShowCommandPalette,
    showConfetti,
    setShowConfetti,
    canvasConfig,
    setCanvasConfig,
    serializer,
    buildDesignSnapshot,
    markDesignModified,
  } = useDesignCanvasState({ initialData, sessionStartTime });

  const callbacks = useDesignCanvasCallbacks();

  const stableLayers = useMemo(() => {
    if (Array.isArray(initialData.layers) && initialData.layers.length > 0) {
      return initialData.layers;
    }
    return EMPTY_LAYERS;
  }, [initialData.layers]);

  const baseMetadata = useMemo(() => {
    const created = initialData.metadata?.created ?? new Date().toISOString();
    const lastModified = initialData.metadata?.lastModified ?? created;
    const version = initialData.metadata?.version ?? '1.0';
    return {
      created,
      lastModified,
      version,
    };
  }, [initialData.metadata?.created, initialData.metadata?.lastModified, initialData.metadata?.version]);

  // Create current design data with stable reference
  const currentDesignData: DesignData = useMemo(
    () => ({
      components,
      connections,
      infoCards,
      layers: stableLayers as DesignData['layers'],
      metadata: baseMetadata,
    }),
    [components, connections, infoCards, stableLayers, baseMetadata]
  );

  // Import/Export functionality with extracted hook
  const {
    handleImport,
    handleQuickExport,
    handleQuickSave,
    handleCopyToClipboard,
    handleImportFromClipboard,
    handleSave,
  } = useDesignCanvasImportExport({
    serializer,
    canvasConfig,
    challenge,
    buildDesignSnapshot,
    markDesignModified,
    setCanvasConfig,
  });

  const handleContinue = useCallback(() => {
    onComplete(currentDesignData);
  }, [currentDesignData, onComplete]);


  // Initialize effects
  const designCanvasEffects = useDesignCanvasEffects({
    components,
    connections,
    infoCards,
    currentDesignData,
    handleQuickExport: (data: any) => handleQuickExport(data),
    handleQuickSave: (data: any) => handleQuickSave(data),
    handleCopyToClipboard: (data: any) => handleCopyToClipboard(data),
    handleImportFromClipboard,
  });

  useEffect(() => {
    flushDesignDataRef.current = designCanvasEffects.flushPendingDesign;
    return () => {
      flushDesignDataRef.current = undefined;
    };
  }, [designCanvasEffects.flushPendingDesign]);

  // Create stable callbacks object for ReactFlowCanvas
  const stableCanvasCallbacks = useStableCallbacks({
    onComponentDrop: callbacks.handleComponentDrop,
    onComponentMove: callbacks.handleComponentMove,
    onComponentSelect: callbacks.handleComponentSelect,
    onComponentLabelChange: callbacks.handleComponentLabelChange,
    onConnectionLabelChange: callbacks.handleConnectionLabelChange,
    onConnectionDelete: callbacks.handleConnectionDelete,
    onConnectionTypeChange: callbacks.handleConnectionTypeChange,
    onConnectionVisualStyleChange: callbacks.handleConnectionVisualStyleChange,
    onStartConnection: callbacks.handleStartConnection,
    onCompleteConnection: callbacks.handleCompleteConnection,
    onInfoCardAdd: callbacks.handleInfoCardAdd,
    onInfoCardUpdate: callbacks.handleInfoCardUpdate,
    onInfoCardDelete: callbacks.handleInfoCardDelete,
    onInfoCardColorChange: callbacks.handleInfoCardColorChange,
  });

  // Get extended challenge data
  const extendedChallenge =
    (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) || challenge;

  // Status bar calculations
  const { progress } = useStatusBarMetrics({
    components,
    connections,
    sessionStartTime,
  });

  const challengeTags = React.useMemo((): string[] | undefined => {
    const tags = (extendedChallenge as any)?.tags;
    return Array.isArray(tags) ? (tags as string[]) : undefined;
  }, [extendedChallenge]);

  if (emergencyPauseReason) {
    return (
      <EmergencyPauseOverlay
        emergencyPauseReason={emergencyPauseReason}
        circuitBreakerDetails={circuitBreakerDetails}
        onResumeAfterPause={handleResumeAfterPause}
      />
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className='h-screen flex flex-col'>
        <DesignCanvasHeader
          challenge={challenge}
          showHints={showHints}
          components={components}
          currentDesignData={currentDesignData}
          canvasConfig={canvasConfig}
          onBack={onBack}
          onContinue={handleContinue}
          onToggleHints={() => setShowHints(!showHints)}
          onSave={() => handleSave(currentDesignData)}
          onShowCommandPalette={() => setShowCommandPalette(true)}
          onImport={handleImport}
        />

        <div className='flex-1 flex'>
          <ResizablePanel side='left' defaultWidth={320} minWidth={200} maxWidth={500}>
            <AssignmentPanel
              challenge={extendedChallenge}
              progress={progress}
              currentComponents={components}
            />
          </ResizablePanel>

          <div className='flex-1 relative'>
            <ReactFlowCanvas
              components={components}
              connections={connections}
              infoCards={infoCards}
              selectedComponent={selectedComponent}
              connectionStart={connectionStart}
              visualTheme={visualTheme}
              {...stableCanvasCallbacks}
            />

          </div>

          <ResizablePanel side='right' defaultWidth={320} minWidth={250} maxWidth={600}>
            <PropertiesPanel
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={callbacks.handleComponentLabelChange}
              onDelete={callbacks.handleDeleteComponent}
              onShowLabelToggle={callbacks.handleShowLabelToggle}
              onStickerToggle={callbacks.handleStickerToggle}
              onStickerEmojiChange={callbacks.handleStickerEmojiChange}
              onBgColorChange={callbacks.handleBgColorChange}
              onNodeBgChange={callbacks.handleNodeBgChange}
              challengeTags={challengeTags}
            />
          </ResizablePanel>
        </div>

        <StatusBar
          components={components}
          connections={connections}
          infoCards={infoCards}
          selectedComponentId={selectedComponent}
          sessionStartTime={sessionStartTime}
          currentDesignData={currentDesignData}
        />

        <CanvasOverlays
          showHints={showHints}
          onCloseHints={() => setShowHints(false)}
          challenge={extendedChallenge}
          currentComponents={components}
          showCommandPalette={showCommandPalette}
          onCloseCommandPalette={() => setShowCommandPalette(false)}
          onNavigate={() => {}}
          selectedChallenge={challenge}
          showConfetti={showConfetti}
          onConfettiDone={() => setShowConfetti(false)}
        />
      </div>
    </DndProvider>
  );
}
