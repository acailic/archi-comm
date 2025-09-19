// src/components/DesignCanvas/DesignCanvasCore.tsx
// Core DesignCanvas component logic and orchestration
// Main component structure, hooks integration, and render guard logic
// RELEVANT FILES: DesignCanvasHeader.tsx, hooks/useDesignCanvasCallbacks.ts, hooks/useDesignCanvasState.ts, hooks/useDesignCanvasEffects.ts

import {
  ExtendedChallenge,
  challengeManager,
} from "@/lib/config/challenge-config";
import { renderDebugLogger } from "@/lib/debug/RenderDebugLogger";
import { RenderLoopDiagnostics } from "@/lib/debug/RenderLoopDiagnostics";
import type { Challenge, DesignData } from "@/shared/contracts";
import {
  useCanvasComponents,
  useCanvasConnectionStart,
  useCanvasConnections,
  useCanvasInfoCards,
  useCanvasSelectedComponent,
  useCanvasVisualTheme,
} from "@/stores/canvasStore";
import { ReactFlowCanvas } from "@canvas/components/ReactFlowCanvas";
import { useInitialCanvasSync } from "@hooks/useInitialCanvasSync";
import { usePerformanceMonitor } from "@hooks/usePerformanceMonitor";
import { useStableCallbacks } from "@hooks/useStableCallbacks";
import { AssignmentPanel } from "@ui/components/AssignmentPanel";
import { PropertiesPanel } from "@ui/components/PropertiesPanel";
import { StatusBar } from "@ui/components/layout/StatusBar";
import { ResizablePanel } from "@ui/components/ui/ResizablePanel";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DesignCanvasHeader } from "./DesignCanvasHeader";
import { CanvasOverlays } from "./components/CanvasOverlays";
import { EmergencyPauseOverlay } from "./components/EmergencyPauseOverlay";
import { useDesignCanvasCallbacks } from "./hooks/useDesignCanvasCallbacks";
import { useDesignCanvasEffects } from "./hooks/useDesignCanvasEffects";
import { useDesignCanvasImportExport } from "./hooks/useDesignCanvasImportExport";
import { useDesignCanvasPerformance } from "./hooks/useDesignCanvasPerformance";
import { useDesignCanvasState } from "./hooks/useDesignCanvasState";
import { useRenderSnapshotDebug } from "./hooks/useRenderSnapshotDebug";
import { useStatusBarMetrics } from "./hooks/useStatusBarMetrics";

// Component render tracking
interface ComponentRenderMetrics {
  renderCount: number;
  lastRenderTime: number;
  propChangeHistory: PropChangeRecord[];
  hookDependencyChanges: HookDependencyChangeRecord[];
  memoizationEffectiveness: MemoizationStats;
  renderReasons: Map<string, number>;
}

interface PropChangeRecord {
  timestamp: number;
  propName: string;
  oldValue: any;
  newValue: any;
  changeType: "primitive" | "object" | "array" | "function";
  renderTriggered: boolean;
}

interface HookDependencyChangeRecord {
  timestamp: number;
  hookName: string;
  dependencyIndex: number;
  oldValue: any;
  newValue: any;
  forced: boolean;
}

interface MemoizationStats {
  useMemoHits: number;
  useMemoMisses: number;
  useCallbackHits: number;
  useCallbackMisses: number;
  memoHits: number;
  memoMisses: number;
}

const componentRenderMetrics: ComponentRenderMetrics = {
  renderCount: 0,
  lastRenderTime: 0,
  propChangeHistory: [],
  hookDependencyChanges: [],
  memoizationEffectiveness: {
    useMemoHits: 0,
    useMemoMisses: 0,
    useCallbackHits: 0,
    useCallbackMisses: 0,
    memoHits: 0,
    memoMisses: 0,
  },
  renderReasons: new Map(),
};

const trackMemoization = (
  type: "useMemo" | "useCallback" | "memo",
  hit: boolean
) => {
  if (process.env.NODE_ENV !== "development") return;

  if (type === "useMemo") {
    if (hit) componentRenderMetrics.memoizationEffectiveness.useMemoHits++;
    else componentRenderMetrics.memoizationEffectiveness.useMemoMisses++;
  } else if (type === "useCallback") {
    if (hit) componentRenderMetrics.memoizationEffectiveness.useCallbackHits++;
    else componentRenderMetrics.memoizationEffectiveness.useCallbackMisses++;
  } else if (type === "memo") {
    if (hit) componentRenderMetrics.memoizationEffectiveness.memoHits++;
    else componentRenderMetrics.memoizationEffectiveness.memoMisses++;
  }
};

const trackPropChange = (
  propName: string,
  oldValue: any,
  newValue: any,
  renderTriggered: boolean
) => {
  if (process.env.NODE_ENV !== "development") return;

  const changeType: "primitive" | "object" | "array" | "function" =
    typeof newValue === "function"
      ? "function"
      : Array.isArray(newValue)
        ? "array"
        : typeof newValue === "object" && newValue !== null
          ? "object"
          : "primitive";

  const record: PropChangeRecord = {
    timestamp: Date.now(),
    propName,
    oldValue,
    newValue,
    changeType,
    renderTriggered,
  };

  componentRenderMetrics.propChangeHistory.push(record);
  if (componentRenderMetrics.propChangeHistory.length > 50) {
    componentRenderMetrics.propChangeHistory.shift();
  }

  if (renderTriggered) {
    const reason = `prop:${propName}:${changeType}`;
    componentRenderMetrics.renderReasons.set(
      reason,
      (componentRenderMetrics.renderReasons.get(reason) || 0) + 1
    );
  }
};

const trackHookDependencyChange = (
  hookName: string,
  dependencyIndex: number,
  oldValue: any,
  newValue: any,
  forced: boolean
) => {
  if (process.env.NODE_ENV !== "development") return;

  const record: HookDependencyChangeRecord = {
    timestamp: Date.now(),
    hookName,
    dependencyIndex,
    oldValue,
    newValue,
    forced,
  };

  componentRenderMetrics.hookDependencyChanges.push(record);
  if (componentRenderMetrics.hookDependencyChanges.length > 30) {
    componentRenderMetrics.hookDependencyChanges.shift();
  }

  if (forced) {
    const reason = `hook:${hookName}:dep${dependencyIndex}`;
    componentRenderMetrics.renderReasons.set(
      reason,
      (componentRenderMetrics.renderReasons.get(reason) || 0) + 1
    );
  }
};

const EMPTY_LAYERS: ReadonlyArray<any> = Object.freeze([]);

export interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

export function DesignCanvas({
  challenge,
  initialData,
  onComplete,
  onBack,
}: DesignCanvasProps) {
  usePerformanceMonitor("DesignCanvas");

  // Enhanced render tracking
  const renderStartTime = useRef(performance.now());
  const previousPropsRef = useRef<DesignCanvasProps | null>(null);
  const canvasPropsRef = useRef<any>(null);

  componentRenderMetrics.renderCount++;
  componentRenderMetrics.lastRenderTime = Date.now();

  // Track prop changes with detailed analysis
  if (previousPropsRef.current) {
    const prevProps = previousPropsRef.current;

    if (prevProps.challenge !== challenge) {
      trackPropChange("challenge", prevProps.challenge, challenge, true);
    }
    if (prevProps.initialData !== initialData) {
      trackPropChange("initialData", prevProps.initialData, initialData, true);
    }
    if (prevProps.onComplete !== onComplete) {
      trackPropChange("onComplete", prevProps.onComplete, onComplete, false);
    }
    if (prevProps.onBack !== onBack) {
      trackPropChange("onBack", prevProps.onBack, onBack, false);
    }
  }
  previousPropsRef.current = { challenge, initialData, onComplete, onBack };

  const mountedRef = useRef(false);
  const lastRenderSnapshotRef = useRef<{
    componentsLength: number;
    connectionsLength: number;
    infoCardsLength: number;
    selectedComponent: string | null;
    challengeId: string;
    isSynced: boolean;
  } | null>(null);
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

  const { isSynced } = useInitialCanvasSync({
    initialData: {
      components: initialData.components || [],
      connections: initialData.connections || [],
      infoCards: initialData.infoCards || [],
    },
    challengeId: challenge.id,
    enabled: true,
  });

  // Selective subscriptions to prevent unnecessary re-renders with detailed tracking
  const componentsRef = useRef<any[]>();
  const connectionsRef = useRef<any[]>();
  const infoCardsRef = useRef<any[]>();
  const selectedComponentRef = useRef<string | null>();
  const connectionStartRef = useRef<string | null>();
  const visualThemeRef = useRef<string>();

  const components = useCanvasComponents();
  const connections = useCanvasConnections();
  const infoCards = useCanvasInfoCards();
  const selectedComponent = useCanvasSelectedComponent();
  const connectionStart = useCanvasConnectionStart();
  const visualTheme = useCanvasVisualTheme();

  // Track hook dependency changes
  if (process.env.NODE_ENV === "development") {
    if (componentsRef.current !== components) {
      trackHookDependencyChange(
        "useCanvasComponents",
        0,
        componentsRef.current,
        components,
        true
      );
      componentsRef.current = components;
    }
    if (connectionsRef.current !== connections) {
      trackHookDependencyChange(
        "useCanvasConnections",
        0,
        connectionsRef.current,
        connections,
        true
      );
      connectionsRef.current = connections;
    }
    if (infoCardsRef.current !== infoCards) {
      trackHookDependencyChange(
        "useCanvasInfoCards",
        0,
        infoCardsRef.current,
        infoCards,
        true
      );
      infoCardsRef.current = infoCards;
    }
    if (selectedComponentRef.current !== selectedComponent) {
      trackHookDependencyChange(
        "useCanvasSelectedComponent",
        0,
        selectedComponentRef.current,
        selectedComponent,
        true
      );
      selectedComponentRef.current = selectedComponent;
    }
    if (connectionStartRef.current !== connectionStart) {
      trackHookDependencyChange(
        "useCanvasConnectionStart",
        0,
        connectionStartRef.current,
        connectionStart,
        true
      );
      connectionStartRef.current = connectionStart;
    }
    if (visualThemeRef.current !== visualTheme) {
      trackHookDependencyChange(
        "useCanvasVisualTheme",
        0,
        visualThemeRef.current,
        visualTheme,
        true
      );
      visualThemeRef.current = visualTheme;
    }
  }

  // Performance monitoring with extracted hook
  const {
    renderGuard,
    emergencyPauseReason,
    setEmergencyPauseReason,
    circuitBreakerDetails,
    handleResumeAfterPause,
    storeCircuitBreakerSnapshot,
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
    const result =
      Array.isArray(initialData.layers) && initialData.layers.length > 0
        ? initialData.layers
        : EMPTY_LAYERS;

    if (process.env.NODE_ENV === "development") {
      trackMemoization(
        "useMemo",
        result === EMPTY_LAYERS && !Array.isArray(initialData.layers)
      );
      trackHookDependencyChange(
        "useMemo:stableLayers",
        0,
        undefined,
        initialData.layers,
        false
      );
    }

    return result;
  }, [initialData.layers]);

  const baseMetadata = useMemo(() => {
    const created = initialData.metadata?.created ?? new Date().toISOString();
    const lastModified = initialData.metadata?.lastModified ?? created;
    const version = initialData.metadata?.version ?? "1.0";

    const result = {
      created,
      lastModified,
      version,
    };

    if (process.env.NODE_ENV === "development") {
      trackMemoization("useMemo", false); // Always recomputes due to dependencies
      trackHookDependencyChange(
        "useMemo:baseMetadata",
        0,
        undefined,
        initialData.metadata?.created,
        false
      );
      trackHookDependencyChange(
        "useMemo:baseMetadata",
        1,
        undefined,
        initialData.metadata?.lastModified,
        false
      );
      trackHookDependencyChange(
        "useMemo:baseMetadata",
        2,
        undefined,
        initialData.metadata?.version,
        false
      );
    }

    return result;
  }, [
    initialData.metadata?.created,
    initialData.metadata?.lastModified,
    initialData.metadata?.version,
  ]);

  // Create current design data with stable reference and tracking
  const currentDesignData: DesignData = useMemo(() => {
    const result = {
      components,
      connections,
      infoCards,
      layers: stableLayers as DesignData["layers"],
      metadata: baseMetadata,
    };

    if (process.env.NODE_ENV === "development") {
      trackMemoization("useMemo", false); // Always recomputes due to dependencies
      trackHookDependencyChange(
        "useMemo:currentDesignData",
        0,
        undefined,
        components,
        false
      );
      trackHookDependencyChange(
        "useMemo:currentDesignData",
        1,
        undefined,
        connections,
        false
      );
      trackHookDependencyChange(
        "useMemo:currentDesignData",
        2,
        undefined,
        infoCards,
        false
      );
      trackHookDependencyChange(
        "useMemo:currentDesignData",
        3,
        undefined,
        stableLayers,
        false
      );
      trackHookDependencyChange(
        "useMemo:currentDesignData",
        4,
        undefined,
        baseMetadata,
        false
      );
    }

    return result;
  }, [components, connections, infoCards, stableLayers, baseMetadata]);

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
    if (process.env.NODE_ENV === "development") {
      trackMemoization("useCallback", false); // Dependencies may change
      trackHookDependencyChange(
        "useCallback:handleContinue",
        0,
        undefined,
        currentDesignData,
        false
      );
      trackHookDependencyChange(
        "useCallback:handleContinue",
        1,
        undefined,
        onComplete,
        false
      );
    }

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

  // Create stable callbacks object for ReactFlowCanvas with enhanced tracking
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

  // Track canvas props stability
  const stableCanvasProps = useMemo(() => {
    const props = {
      components,
      connections,
      infoCards,
      selectedComponent,
      connectionStart,
      visualTheme,
      ...stableCanvasCallbacks,
    };

    if (process.env.NODE_ENV === "development") {
      if (canvasPropsRef.current) {
        const prevProps = canvasPropsRef.current;
        if (prevProps.components !== components) {
          trackPropChange(
            "canvas.components",
            prevProps.components,
            components,
            true
          );
        }
        if (prevProps.connections !== connections) {
          trackPropChange(
            "canvas.connections",
            prevProps.connections,
            connections,
            true
          );
        }
        if (prevProps.infoCards !== infoCards) {
          trackPropChange(
            "canvas.infoCards",
            prevProps.infoCards,
            infoCards,
            true
          );
        }
        if (prevProps.selectedComponent !== selectedComponent) {
          trackPropChange(
            "canvas.selectedComponent",
            prevProps.selectedComponent,
            selectedComponent,
            true
          );
        }
        if (prevProps.connectionStart !== connectionStart) {
          trackPropChange(
            "canvas.connectionStart",
            prevProps.connectionStart,
            connectionStart,
            true
          );
        }
        if (prevProps.visualTheme !== visualTheme) {
          trackPropChange(
            "canvas.visualTheme",
            prevProps.visualTheme,
            visualTheme,
            true
          );
        }
      }
      canvasPropsRef.current = props;
    }

    return props;
  }, [
    components,
    connections,
    infoCards,
    selectedComponent,
    connectionStart,
    visualTheme,
    stableCanvasCallbacks,
  ]);

  // Get extended challenge data
  const extendedChallenge =
    (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) ||
    challenge;

  // Status bar calculations
  const { progress } = useStatusBarMetrics({
    components,
    connections,
    sessionStartTime,
  });

  const challengeTags = React.useMemo((): string[] | undefined => {
    const tags = (extendedChallenge as any)?.tags;
    const result = Array.isArray(tags) ? (tags as string[]) : undefined;

    if (process.env.NODE_ENV === "development") {
      trackMemoization("useMemo", false); // Depends on extendedChallenge
      trackHookDependencyChange(
        "useMemo:challengeTags",
        0,
        undefined,
        extendedChallenge,
        false
      );
    }

    return result;
  }, [extendedChallenge]);

  if (emergencyPauseReason) {
    return (
      <EmergencyPauseOverlay
        emergencyPauseReason={emergencyPauseReason}
        circuitBreakerDetails={circuitBreakerDetails}
        storeCircuitBreakerSnapshot={storeCircuitBreakerSnapshot}
        onResumeAfterPause={handleResumeAfterPause}
      />
    );
  }

  // Performance analysis and logging
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;

    // Log render performance every 10 renders or if slow
    if (componentRenderMetrics.renderCount % 10 === 0 || renderDuration > 16) {
      const propChanges = componentRenderMetrics.propChangeHistory.slice(-5);
      const hookChanges =
        componentRenderMetrics.hookDependencyChanges.slice(-5);
      const renderReasons = Array.from(
        componentRenderMetrics.renderReasons.entries()
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      console.debug("[DesignCanvasCore] Render performance analysis:", {
        renderCount: componentRenderMetrics.renderCount,
        renderDuration: `${renderDuration.toFixed(2)}ms`,
        recentPropChanges: propChanges.map((change) => ({
          prop: change.propName,
          type: change.changeType,
          triggered: change.renderTriggered,
        })),
        recentHookChanges: hookChanges.map((change) => ({
          hook: change.hookName,
          dependency: change.dependencyIndex,
          forced: change.forced,
        })),
        topRenderReasons: renderReasons,
        memoizationEffectiveness: {
          useMemoEfficiency: `${(
            (componentRenderMetrics.memoizationEffectiveness.useMemoHits /
              (componentRenderMetrics.memoizationEffectiveness.useMemoHits +
                componentRenderMetrics.memoizationEffectiveness
                  .useMemoMisses)) *
            100
          ).toFixed(1)}%`,
          useCallbackEfficiency: `${(
            (componentRenderMetrics.memoizationEffectiveness.useCallbackHits /
              (componentRenderMetrics.memoizationEffectiveness.useCallbackHits +
                componentRenderMetrics.memoizationEffectiveness
                  .useCallbackMisses)) *
            100
          ).toFixed(1)}%`,
        },
        performance: {
          isSlowRender: renderDuration > 16,
          averageRenderTime:
            componentRenderMetrics.lastRenderTime /
            componentRenderMetrics.renderCount,
        },
      });

      // Log to render debug system
      renderDebugLogger.logRender({
        componentName: "DesignCanvasCore",
        renderCount: componentRenderMetrics.renderCount,
        renderDuration,
        triggerReason: renderReasons[0]?.[0] || "unknown",
        propChanges: propChanges.map((change) => ({
          propName: change.propName,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changeType: change.changeType as any,
          isDeepChange: change.changeType !== "primitive",
          changeSize: 1,
        })),
        performanceMetrics: {
          renderDuration,
          componentUpdateTime: renderDuration,
          diffTime: 0,
          reconciliationTime: 0,
        },
        renderOptimizations: [],
      });

      // Record diagnostics
      RenderLoopDiagnostics.getInstance().record("design-canvas-render", {
        componentName: "DesignCanvasCore",
        renderCount: componentRenderMetrics.renderCount,
        renderDuration,
        propChanges: propChanges.length,
        hookChanges: hookChanges.length,
        memoizationStats: componentRenderMetrics.memoizationEffectiveness,
      });
    }

    renderStartTime.current = renderEndTime;
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col">
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

        <div className="flex-1 flex">
          <ResizablePanel
            side="left"
            defaultWidth={320}
            minWidth={200}
            maxWidth={500}
          >
            <AssignmentPanel
              challenge={extendedChallenge}
              progress={progress}
              currentComponents={components}
            />
          </ResizablePanel>

          <div className="flex-1 relative">
            <ReactFlowCanvas {...stableCanvasProps} />
          </div>

          <ResizablePanel
            side="right"
            defaultWidth={320}
            minWidth={250}
            maxWidth={600}
          >
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
          storeCircuitBreakerSnapshot={storeCircuitBreakerSnapshot}
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
