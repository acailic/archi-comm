import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { shallow } from 'zustand/shallow';

import { equalityFunctions } from '@/shared/utils/memoization';
import { useStableObject, useStableConfig } from '@/shared/hooks/useStableProp';
import { useCanvasCallbacks, useLatestCallback } from '@/shared/hooks/useOptimizedCallbacks';

// New performance infrastructure
import { useSmartMemo } from '@/shared/hooks/performance/useSmartMemo';
import { useStableContracts } from '@/shared/hooks/performance/useStableContracts';
import { useCanvasConfig } from '@/packages/canvas/contexts/CanvasConfigContext';
import { useCanvasInteraction } from '@/packages/canvas/contexts/CanvasInteractionContext';

import { ExtendedChallenge, challengeManager } from '@/lib/config/challenge-config';
import { useInitialCanvasSync } from '@hooks/useInitialCanvasSync';
import { usePerformanceMonitor } from '@hooks/usePerformanceMonitor';
import { useStableCallbacks } from '@hooks/useStableCallbacks';
import type { DesignData, Challenge } from '@/shared/contracts';
import { useOptimizedSelector } from '@/shared/hooks/useOptimizedSelector';
import { useComponentRenderTracking } from '@/shared/hooks/useComponentRenderTracking';
import { useCanvasStore } from '@/stores/canvasStore';

import { AssignmentPanel } from '@ui/components/AssignmentPanel';
import { PropertiesPanel } from '@ui/components/PropertiesPanel';
import { StatusBar } from '@ui/components/layout/StatusBar';
import { DesignCanvasLayout } from './components/DesignCanvasLayout';
import { CanvasContent } from './components/CanvasContent';
import { CanvasOverlays } from './components/CanvasOverlays';
import { EmergencyPauseOverlay } from './components/EmergencyPauseOverlay';
import { DesignCanvasHeader } from './DesignCanvasHeader';
import { useDesignCanvasCallbacks } from './hooks/useDesignCanvasCallbacks';
import { useDesignCanvasEffects } from './hooks/useDesignCanvasEffects';
import { useDesignCanvasImportExport } from './hooks/useDesignCanvasImportExport';
import { useDesignCanvasPerformance } from './hooks/useDesignCanvasPerformance.tsx';
import { useDesignCanvasState } from './hooks/useDesignCanvasState.tsx';
import { useStatusBarMetrics } from './hooks/useStatusBarMetrics.tsx';
import type { ReactFlowCanvasWrapperProps } from '@canvas/components/ReactFlowCanvas';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';

// Wrap the main canvas component with React Profiler integration
const ProfiledCanvasContent = reactProfilerIntegration.withCanvasProfiling(
  CanvasContent,
  'MainCanvas'
);

export interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

const DesignCanvasComponent = function DesignCanvas({
  challenge,
  initialData,
  onComplete,
  onBack,
}: DesignCanvasProps) {
  usePerformanceMonitor('DesignCanvas');
  useComponentRenderTracking('DesignCanvasCore', {
    trackProps: {
      challengeId: challenge.id,
      components: initialData.components?.length ?? 0,
      connections: initialData.connections?.length ?? 0,
    },
  });

  const [sessionStartTime] = useState(() => new Date());
  const flushDesignDataRef = useRef<
    ((reason: string, options?: { immediate?: boolean }) => void) | undefined
  >(undefined);

  // Stable props for initial canvas sync using smart memoization
  const stableInitialData = useSmartMemo(
    () => ({
      components: initialData.components ?? [],
      connections: initialData.connections ?? [],
      infoCards: initialData.infoCards ?? [],
    }),
    [
      initialData.components?.length ?? 0,
      initialData.connections?.length ?? 0,
      initialData.infoCards?.length ?? 0
    ],
    {
      componentName: 'DesignCanvasCore',
      strategy: 'mixed',
    }
  );

  const stableSyncConfig = useStableContracts({
    initialData: stableInitialData,
    challengeId: challenge.id,
    enabled: true,
  }, {
    componentName: 'DesignCanvasCore-SyncConfig',
  });

  const { isSynced } = useInitialCanvasSync(stableSyncConfig);

  // Use smart memoization for canvas source
  const canvasSource = useSmartMemo(
    () => ({
      getState: () => useCanvasStore.getState(),
      subscribe: (listener: () => void) => useCanvasStore.subscribe(() => listener()),
    }),
    [],
    {
      componentName: 'DesignCanvasCore',
      strategy: 'shallow',
    }
  );

  // Optimize canvas state selection with smart memoization
  const canvasState = useOptimizedSelector(
    canvasSource,
    (state) => ({
      components: state.components,
      connections: state.connections,
      infoCards: state.infoCards,
      selectedComponentId: state.selectedComponent,
    }),
    { equalityFn: shallow, debugLabel: 'DesignCanvas.canvasState' }
  );

  const { components, connections, infoCards, selectedComponentId } = canvasState;

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

  // Create stable contracts for canvas callbacks to prevent unnecessary re-renders
  const stableCanvasCallbacks = useStableContracts({
    onComponentDrop: callbacks.handleComponentDrop,
    onComponentPositionChange: callbacks.handleComponentMove,
    onComponentSelect: callbacks.handleComponentSelect,
    onComponentDeselect: callbacks.handleComponentDeselect,
    onComponentDelete: callbacks.handleDeleteComponent,
    onConnectionCreate: callbacks.handleCompleteConnection,
    onConnectionDelete: callbacks.handleConnectionDelete,
    onConnectionSelect: callbacks.handleConnectionSelect,
    onInfoCardCreate: callbacks.handleInfoCardAdd,
    onInfoCardUpdate: callbacks.handleInfoCardUpdate,
    onInfoCardDelete: callbacks.handleInfoCardDelete,
    onInfoCardSelect: callbacks.handleInfoCardSelect,
  }, {
    componentName: 'DesignCanvasCore-CanvasCallbacks',
  });

  // Optimized canvas callbacks specifically for high-frequency canvas operations
  const canvasCallbacks = useCanvasCallbacks(stableCanvasCallbacks);

  // Use smart memoization for layers and metadata
  const layers = useSmartMemo<DesignData['layers']>(
    () => (Array.isArray(initialData.layers) ? initialData.layers : []),
    [initialData.layers],
    {
      componentName: 'DesignCanvasCore',
      strategy: 'shallow',
    }
  );

  const metadata = useSmartMemo<DesignData['metadata']>(() => {
    const created = initialData.metadata?.created ?? new Date().toISOString();
    return {
      created,
      lastModified: initialData.metadata?.lastModified ?? created,
      version: initialData.metadata?.version ?? '1.0',
    };
  }, [initialData.metadata], {
    componentName: 'DesignCanvasCore',
    strategy: 'mixed',
  });

  // Smart memoization for current design data
  const currentDesignData = useSmartMemo<DesignData>(
    () => ({
      components,
      connections,
      infoCards,
      layers,
      metadata,
    }),
    [components, connections, infoCards, layers, metadata],
    {
      componentName: 'DesignCanvasCore',
      strategy: 'structural',
      expensiveThreshold: 10,
    }
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

  // Optimized action callbacks that don't need frequent recreation
  const exportCurrentDesign = useLatestCallback(() => handleQuickExport(currentDesignData));
  const quickSaveCurrentDesign = useLatestCallback(() => handleQuickSave(currentDesignData));
  const copyCurrentDesign = useLatestCallback(() => handleCopyToClipboard(currentDesignData));
  const saveCurrentDesign = useLatestCallback(() => handleSave(currentDesignData));
  const handleContinue = useLatestCallback(() => onComplete(currentDesignData));

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

  const {
    renderGuard,
    emergencyPauseReason,
    circuitBreakerDetails,
    handleResumeAfterPause,
    storeCircuitBreakerSnapshot,
  } = useDesignCanvasPerformance({
    challenge,
    components,
    connections,
    infoCards,
    selectedComponent: selectedComponentId ?? null,
    isSynced,
    initialData,
    flushDesignDataRef,
  });

  // Smart memoization for extended challenge
  const extendedChallenge = useSmartMemo<ExtendedChallenge>(() => {
    return (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) ?? challenge;
  }, [challenge], {
    componentName: 'DesignCanvasCore',
    strategy: 'shallow',
  });

  const { progress } = useStatusBarMetrics({
    components,
    connections,
    sessionStartTime,
  });

  // Smart memoization for challenge tags
  const challengeTags = useSmartMemo<string[] | undefined>(() => {
    const tags = (extendedChallenge as any)?.tags;
    return Array.isArray(tags) ? tags : undefined;
  }, [extendedChallenge], {
    componentName: 'DesignCanvasCore',
    strategy: 'shallow',
  });

  // Smart memoization for canvas props with stable contracts
  const canvasProps = useSmartMemo<ReactFlowCanvasWrapperProps>(
    () => {
      const props = {
        components,
        connections,
        infoCards,
        selectedComponentId: selectedComponentId ?? undefined,
        enableAutoLayout: Boolean(canvasConfig?.autoLayout),
        virtualizationEnabled: canvasConfig?.virtualization !== false,
        enableDragDrop: true,
        enableContextMenu: true,
        enableKeyboardShortcuts: true,
        showBackground: true,
        showControls: true,
        showMiniMap: canvasConfig?.showMiniMap ?? false,
        onComponentSelect: canvasCallbacks.onComponentSelect,
        onComponentDeselect: canvasCallbacks.onComponentDeselect,
        onComponentDrop: canvasCallbacks.onComponentDrop,
        onComponentPositionChange: canvasCallbacks.onComponentPositionChange,
        onComponentDelete: canvasCallbacks.onComponentDelete,
        onConnectionCreate: canvasCallbacks.onConnectionCreate,
        onConnectionDelete: canvasCallbacks.onConnectionDelete,
        onConnectionSelect: canvasCallbacks.onConnectionSelect,
        onInfoCardCreate: canvasCallbacks.onInfoCardCreate,
        onInfoCardUpdate: canvasCallbacks.onInfoCardUpdate,
        onInfoCardDelete: canvasCallbacks.onInfoCardDelete,
        onInfoCardSelect: canvasCallbacks.onInfoCardSelect,
      };

      return useStableContracts(props, {
        componentName: 'DesignCanvasCore-CanvasProps',
      });
    },
    [
      components,
      connections,
      infoCards,
      selectedComponentId,
      canvasConfig?.autoLayout,
      canvasConfig?.virtualization,
      canvasConfig?.showMiniMap,
      canvasCallbacks,
    ],
    {
      componentName: 'DesignCanvasCore',
      strategy: 'mixed',
      expensiveThreshold: 5,
    }
  );

  if (emergencyPauseReason || renderGuard.shouldPause) {
    return (
      <EmergencyPauseOverlay
        emergencyPauseReason={emergencyPauseReason ?? 'Render loop protection activated'}
        circuitBreakerDetails={circuitBreakerDetails}
        storeCircuitBreakerSnapshot={storeCircuitBreakerSnapshot}
        onResumeAfterPause={handleResumeAfterPause}
      />
    );
  }

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
            onToggleHints={() => setShowHints((value) => !value)}
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
        canvas={<ProfiledCanvasContent canvasProps={canvasProps} />}
        propertiesPanel={
          <PropertiesPanel
            selectedComponent={selectedComponentId ?? null}
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
        }
        statusBar={
          <StatusBar
            components={components}
            connections={connections}
            infoCards={infoCards}
            selectedComponentId={selectedComponentId}
            sessionStartTime={sessionStartTime}
            currentDesignData={currentDesignData}
            storeCircuitBreakerSnapshot={storeCircuitBreakerSnapshot}
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
            selectedChallenge={challenge}
            showConfetti={showConfetti}
            onConfettiDone={() => setShowConfetti(false)}
          />
        }
      />
    </DndProvider>
  );
};

// Optimized memoization with custom equality function for DesignCanvas props
const designCanvasPropsEqual = (prev: DesignCanvasProps, next: DesignCanvasProps): boolean => {
  // Fast path: check challenge ID first
  if (prev.challenge.id !== next.challenge.id) return false;

  // Check if callbacks have changed (assume they're stable)
  if (prev.onComplete !== next.onComplete || prev.onBack !== next.onBack) return false;

  // Deep comparison for initialData (most important for performance)
  const prevData = prev.initialData;
  const nextData = next.initialData;

  if (prevData === nextData) return true; // Same reference

  // Compare data structure
  return (
    prevData.components?.length === nextData.components?.length &&
    prevData.connections?.length === nextData.connections?.length &&
    prevData.infoCards?.length === nextData.infoCards?.length &&
    shallow(prevData.metadata, nextData.metadata) &&
    shallow(prevData.layers, nextData.layers)
  );
};

export const DesignCanvas = React.memo(DesignCanvasComponent, designCanvasPropsEqual);

DesignCanvas.displayName = 'DesignCanvas';
