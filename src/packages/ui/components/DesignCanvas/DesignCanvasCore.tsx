import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { shallow } from "zustand/shallow";

import {
  ExtendedChallenge,
  challengeManager,
} from "../../../../lib/config/challenge-config";
import type { Challenge, DesignData } from "../../../../shared/contracts";
import { useOptimizedSelector } from "../../../../shared/hooks/useOptimizedSelector";
import { useCanvasStore } from "../../../../stores/canvasStore";

import { AssignmentPanel } from "../AssignmentPanel";
import { StatusBar } from "../layout/StatusBar";
import { PropertiesPanel } from "../PropertiesPanel";

import { useInitialCanvasSync } from "../../../../shared/hooks/useInitialCanvasSync";
import { useDesignCanvasCallbacks } from "./hooks/useDesignCanvasCallbacks";
import { useDesignCanvasEffects } from "./hooks/useDesignCanvasEffects";
import { useDesignCanvasImportExport } from "./hooks/useDesignCanvasImportExport";
import { useDesignCanvasState } from "./hooks/useDesignCanvasState";
import { useStatusBarMetrics } from "./hooks/useStatusBarMetrics";

import { SimpleCanvas } from "../../../canvas/SimpleCanvas";
import { CanvasOverlays } from "./components/CanvasOverlays";
import { DesignCanvasLayout } from "./components/DesignCanvasLayout";
import { DesignCanvasHeader } from "./DesignCanvasHeader";

export interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

const DesignCanvasComponent: React.FC<DesignCanvasProps> = ({
  challenge,
  initialData,
  onComplete,
  onBack,
}) => {
  const [sessionStartTime] = useState(() => new Date());
  const flushDesignDataRef = useRef<
    ((reason: string, options?: { immediate?: boolean }) => void) | undefined
  >(undefined);

  const initialSyncPayload = useMemo(
    () => ({
      components: initialData.components ?? [],
      connections: initialData.connections ?? [],
      infoCards: initialData.infoCards ?? [],
    }),
    [initialData.components, initialData.connections, initialData.infoCards]
  );

  const { isSynced } = useInitialCanvasSync({
    initialData: initialSyncPayload,
    challengeId: challenge.id,
    enabled: true,
  });

  const canvasSource = useMemo(
    () => ({
      getState: useCanvasStore.getState,
      subscribe: useCanvasStore.subscribe,
    }),
    []
  );

  const {
    components,
    connections,
    infoCards,
    selectedComponentId,
    connectionStart,
  } =
    useOptimizedSelector(
      canvasSource,
      (state: any) => ({
        components: state.components,
        connections: state.connections,
        infoCards: state.infoCards,
        selectedComponentId: state.selectedComponent,
        connectionStart: state.connectionStart,
      }),
      { debugLabel: "DesignCanvas.canvasState", equalityFn: shallow }
    );

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

  const layers = useMemo(
    () => (Array.isArray(initialData.layers) ? initialData.layers : []),
    [initialData.layers]
  );

  const metadata = useMemo(() => {
    const created = initialData.metadata?.created ?? new Date().toISOString();
    return {
      created,
      lastModified: initialData.metadata?.lastModified ?? created,
      version: initialData.metadata?.version ?? "1.0",
    } satisfies DesignData["metadata"];
  }, [initialData.metadata]);

  const currentDesignData = useMemo<DesignData>(
    () => ({
      components,
      connections,
      infoCards,
      layers,
      metadata,
    }),
    [components, connections, infoCards, layers, metadata]
  );

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

  const exportCurrentDesign = useCallback(
    () => handleQuickExport(currentDesignData),
    [handleQuickExport, currentDesignData]
  );
  const quickSaveCurrentDesign = useCallback(
    () => handleQuickSave(currentDesignData),
    [handleQuickSave, currentDesignData]
  );
  const copyCurrentDesign = useCallback(
    () => handleCopyToClipboard(currentDesignData),
    [handleCopyToClipboard, currentDesignData]
  );
  const saveCurrentDesign = useCallback(
    () => handleSave(currentDesignData),
    [handleSave, currentDesignData]
  );
  const handleContinue = useCallback(
    () => onComplete(currentDesignData),
    [onComplete, currentDesignData]
  );

  const designCanvasEffects = useDesignCanvasEffects({
    components,
    connections,
    infoCards,
    currentDesignData,
    handleQuickExport: exportCurrentDesign,
    handleQuickSave: quickSaveCurrentDesign,
    handleCopyToClipboard: copyCurrentDesign,
    handleImportFromClipboard,
  });

  useEffect(() => {
    flushDesignDataRef.current = designCanvasEffects.flushPendingDesign;
    return () => {
      flushDesignDataRef.current = undefined;
    };
  }, [designCanvasEffects.flushPendingDesign]);

  const extendedChallenge = useMemo<ExtendedChallenge>(
    () =>
      (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) ??
      challenge,
    [challenge]
  );

  const challengeTags = useMemo<string[] | undefined>(() => {
    const tags = (extendedChallenge as ExtendedChallenge)?.tags;
    return Array.isArray(tags) ? tags : undefined;
  }, [extendedChallenge]);

  const { progress } = useStatusBarMetrics({
    components,
    connections,
    sessionStartTime,
  });

  const {
    handleComponentDrop,
    handleComponentMove,
    handleComponentSelect,
    handleDeleteComponent,
    handleCompleteConnection,
    handleStartConnection,
    handleConnectionDelete,
    handleInfoCardAdd,
    handleInfoCardUpdate,
    handleInfoCardDelete,
    handleComponentLabelChange,
    handleStickerEmojiChange,
    handleStickerToggle,
    handleShowLabelToggle,
    handleBgColorChange,
    handleNodeBgChange,
  } = callbacks;

  return (
    <DndProvider backend={HTML5Backend}>
      <DesignCanvasLayout
        header={
          <DesignCanvasHeader
            challenge={challenge}
            showHints={showHints}
            components={components}
            currentDesignData={currentDesignData}
            canvasConfig={canvasConfig}
            onBack={onBack}
            onContinue={handleContinue}
            onToggleHints={() => setShowHints((prev: boolean) => !prev)}
            onSave={saveCurrentDesign}
            onShowCommandPalette={() => setShowCommandPalette(true)}
            onImport={handleImport}
          />
        }
        assignmentPanel={
          <AssignmentPanel
            challenge={extendedChallenge}
            progress={progress}
            currentComponents={components}
          />
        }
        canvas={
          <SimpleCanvas
            components={components}
            connections={connections}
            selectedComponent={selectedComponentId ?? null}
            connectionStart={connectionStart ?? null}
            onConnectionStart={handleStartConnection}
            onComponentSelect={handleComponentSelect}
            onComponentMove={(id, x, y) => handleComponentMove(id, x, y)}
            onComponentDelete={handleDeleteComponent}
            onConnectionCreate={handleCompleteConnection}
            onConnectionDelete={handleConnectionDelete}
            onComponentDrop={handleComponentDrop}
          />
        }
        propertiesPanel={
          <PropertiesPanel
            selectedComponent={selectedComponentId ?? null}
            components={components}
            onLabelChange={handleComponentLabelChange}
            onDelete={handleDeleteComponent}
            onShowLabelToggle={handleShowLabelToggle}
            onStickerToggle={handleStickerToggle}
            onStickerEmojiChange={handleStickerEmojiChange}
            onBgColorChange={handleBgColorChange}
            onNodeBgChange={handleNodeBgChange}
            challengeTags={challengeTags}
          />
        }
        statusBar={
          <StatusBar
            components={components}
            connections={connections}
            infoCards={infoCards}
            selectedComponentId={selectedComponentId}
            sessionStartTime={sessionStartTime}
            currentDesignData={currentDesignData}
          />
        }
        overlays={
          <CanvasOverlays
            showHints={showHints}
            onCloseHints={() => setShowHints(false)}
            challenge={extendedChallenge}
            currentComponents={components}
            showCommandPalette={showCommandPalette}
            onCloseCommandPalette={() => setShowCommandPalette(false)}
            onNavigate={() => {}}
            selectedChallenge={extendedChallenge}
            showConfetti={showConfetti}
            onConfettiDone={() => setShowConfetti(false)}
          />
        }
      />
    </DndProvider>
  );
};

const designCanvasPropsEqual = (
  prev: DesignCanvasProps,
  next: DesignCanvasProps
): boolean => {
  if (prev.challenge.id !== next.challenge.id) return false;
  if (prev.onComplete !== next.onComplete || prev.onBack !== next.onBack)
    return false;
  if (prev.initialData === next.initialData) return true;
  return (
    prev.initialData.components?.length ===
      next.initialData.components?.length &&
    prev.initialData.connections?.length ===
      next.initialData.connections?.length &&
    prev.initialData.infoCards?.length === next.initialData.infoCards?.length &&
    shallow(prev.initialData.metadata, next.initialData.metadata) &&
    shallow(prev.initialData.layers, next.initialData.layers)
  );
};

export const DesignCanvas = React.memo(
  DesignCanvasComponent,
  designCanvasPropsEqual
);

DesignCanvas.displayName = "DesignCanvas";
