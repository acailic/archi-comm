import React, { useEffect, useMemo } from "react";
import { RenderLoopDiagnostics } from "../../../lib/debug/RenderLoopDiagnostics";
import { InfiniteLoopDetector } from "../../../lib/performance/InfiniteLoopDetector";
import {
  RenderGuardPresets,
  useRenderGuard,
} from "../../../lib/performance/RenderGuard";
import { Connection, DesignComponent, InfoCard } from "../../../types";
import {
  CanvasCallbacks,
  CanvasContextProvider,
  CanvasState,
  VirtualizationConfig,
} from "../contexts/CanvasContext";

export interface CanvasControllerProps {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
  selectedComponentId?: string;
  selectedConnectionId?: string;
  selectedInfoCardId?: string;
  enableAutoLayout?: boolean;
  virtualizationEnabled?: boolean;
  onComponentSelect: (componentId: string) => void;
  onComponentDeselect: () => void;
  onComponentDrop: (
    component: DesignComponent,
    position: { x: number; y: number }
  ) => void;
  onComponentPositionChange: (
    componentId: string,
    position: { x: number; y: number }
  ) => void;
  onComponentDelete: (componentId: string) => void;
  onConnectionCreate: (connection: Connection) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionSelect: (connectionId: string) => void;
  onInfoCardCreate: (infoCard: InfoCard) => void;
  onInfoCardUpdate: (infoCard: InfoCard) => void;
  onInfoCardDelete: (infoCardId: string) => void;
  onInfoCardSelect: (infoCardId: string) => void;
  children: React.ReactNode;
}

export const CanvasController: React.FC<CanvasControllerProps> = ({
  components,
  connections,
  infoCards,
  selectedComponentId,
  selectedConnectionId,
  selectedInfoCardId,
  enableAutoLayout = false,
  virtualizationEnabled = true,
  onComponentSelect,
  onComponentDeselect,
  onComponentDrop,
  onComponentPositionChange,
  onComponentDelete,
  onConnectionCreate,
  onConnectionDelete,
  onConnectionSelect,
  onInfoCardCreate,
  onInfoCardUpdate,
  onInfoCardDelete,
  onInfoCardSelect,
  children,
}) => {
  const [emergencyPause, setEmergencyPause] = React.useState(false);

  // Memoize incoming callback props to ensure stability
  const stableOnComponentSelect = React.useCallback(onComponentSelect, [
    onComponentSelect,
  ]);
  const stableOnComponentDeselect = React.useCallback(onComponentDeselect, [
    onComponentDeselect,
  ]);
  const stableOnComponentDrop = React.useCallback(onComponentDrop, [
    onComponentDrop,
  ]);
  const stableOnComponentPositionChange = React.useCallback(
    onComponentPositionChange,
    [onComponentPositionChange]
  );
  const stableOnComponentDelete = React.useCallback(onComponentDelete, [
    onComponentDelete,
  ]);
  const stableOnConnectionCreate = React.useCallback(onConnectionCreate, [
    onConnectionCreate,
  ]);
  const stableOnConnectionDelete = React.useCallback(onConnectionDelete, [
    onConnectionDelete,
  ]);
  const stableOnConnectionSelect = React.useCallback(onConnectionSelect, [
    onConnectionSelect,
  ]);
  const stableOnInfoCardCreate = React.useCallback(onInfoCardCreate, [
    onInfoCardCreate,
  ]);
  const stableOnInfoCardUpdate = React.useCallback(onInfoCardUpdate, [
    onInfoCardUpdate,
  ]);
  const stableOnInfoCardDelete = React.useCallback(onInfoCardDelete, [
    onInfoCardDelete,
  ]);
  const stableOnInfoCardSelect = React.useCallback(onInfoCardSelect, [
    onInfoCardSelect,
  ]);

  const handleEmergencyPause = React.useCallback(() => {
    setEmergencyPause((prev) => {
      if (prev) return prev; // Already paused, avoid redundant update
      RenderLoopDiagnostics.recordStabilityWarning(
        "ReactFlowCanvas.Controller",
        "Emergency pause triggered"
      );
      return true;
    });
  }, []);

  const handleCircuitBreakerOpen = React.useCallback(() => {
    setEmergencyPause((prev) => (prev ? prev : true)); // Only update if not already paused
  }, []);

  const handleOnTrip = React.useCallback(
    (details: { componentName: string; renderCount: number; error: any }) => {
      setEmergencyPause((prev) => (prev ? prev : true)); // Only update if not already paused
    },
    []
  );

  const renderGuard = useRenderGuard("ReactFlowCanvas.Controller", {
    ...RenderGuardPresets.canvasLayers.Controller,
    disableSyntheticError: true,
    onCircuitBreakerOpen: handleCircuitBreakerOpen,
    onTrip: handleOnTrip,
    circuitBreakerCooldownMs: 5000,
  });

  const virtualizationConfig = useMemo<VirtualizationConfig>(
    () => ({
      bufferZone: 200,
      maxVisibleItems: 100,
      enabled: virtualizationEnabled,
    }),
    [virtualizationEnabled]
  );

  const selectedItems = useMemo(() => {
    const items: string[] = [];
    if (selectedComponentId) items.push(selectedComponentId);
    if (selectedConnectionId) items.push(selectedConnectionId);
    if (selectedInfoCardId) items.push(selectedInfoCardId);
    return items;
  }, [selectedComponentId, selectedConnectionId, selectedInfoCardId]);

  const initialState = useMemo<CanvasState>(
    () => ({
      layoutPositions: {},
      virtualizationConfig,
      selectedItems,
      reactFlowInstance: null,
      emergencyPause: emergencyPause,
    }),
    [virtualizationConfig, selectedItems, emergencyPause]
  );

  const handleEmergencyResume = React.useCallback(() => {
    setEmergencyPause((prev) => {
      if (!prev) return prev; // Already resumed, avoid redundant update
      RenderLoopDiagnostics.recordResume("ReactFlowCanvas.Controller");
      return false;
    });
  }, []);

  const callbacks = useMemo<CanvasCallbacks>(
    () => ({
      component: {
        onComponentSelect: stableOnComponentSelect,
        onComponentDeselect: stableOnComponentDeselect,
        onComponentDrop: stableOnComponentDrop,
        onComponentPositionChange: stableOnComponentPositionChange,
        onComponentDelete: stableOnComponentDelete,
      },
      connection: {
        onConnectionCreate: stableOnConnectionCreate,
        onConnectionDelete: stableOnConnectionDelete,
        onConnectionSelect: stableOnConnectionSelect,
      },
      infoCard: {
        onInfoCardCreate: stableOnInfoCardCreate,
        onInfoCardUpdate: stableOnInfoCardUpdate,
        onInfoCardDelete: stableOnInfoCardDelete,
        onInfoCardSelect: stableOnInfoCardSelect,
      },
      onEmergencyPause: handleEmergencyPause,
      onEmergencyResume: handleEmergencyResume,
    }),
    [
      stableOnComponentSelect,
      stableOnComponentDeselect,
      stableOnComponentDrop,
      stableOnComponentPositionChange,
      stableOnComponentDelete,
      stableOnConnectionCreate,
      stableOnConnectionDelete,
      stableOnConnectionSelect,
      stableOnInfoCardCreate,
      stableOnInfoCardUpdate,
      stableOnInfoCardDelete,
      stableOnInfoCardSelect,
      handleEmergencyPause,
      handleEmergencyResume,
    ]
  );

  useEffect(() => {
    if (emergencyPause) {
      InfiniteLoopDetector.recordRender("ReactFlowCanvas.Controller", {
        componentName: "CanvasController",
        propsHash: JSON.stringify({
          componentsCount: components.length,
          connectionsCount: connections.length,
          infoCardsCount: infoCards.length,
          selectedItems,
        }),
        timestamp: Date.now(),
        renderCount: renderGuard.renderCount,
      });
    }
  }, [
    emergencyPause,
    renderGuard.renderCount,
    components.length,
    connections.length,
    infoCards.length,
    selectedItems,
  ]);

  useEffect(() => {
    const propsData = {
      componentsCount: components.length,
      connectionsCount: connections.length,
      infoCardsCount: infoCards.length,
      enableAutoLayout,
      virtualizationEnabled,
      selectedItems,
    };

    InfiniteLoopDetector.recordRender("ReactFlowCanvas.Controller", {
      componentName: "CanvasController",
      propsHash: JSON.stringify(propsData),
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
    });
  }, [
    components.length,
    connections.length,
    infoCards.length,
    enableAutoLayout,
    virtualizationEnabled,
    selectedItems,
    renderGuard.renderCount,
  ]);

  if (emergencyPause) {
    return (
      <div className="canvas-emergency-pause">
        <div className="emergency-pause-overlay">
          <h3>Canvas Paused</h3>
          <p>
            Render loop detected. Canvas has been paused to prevent performance
            issues.
          </p>
          <button onClick={handleEmergencyResume}>Resume Canvas</button>
        </div>
      </div>
    );
  }

  return (
    <CanvasContextProvider initialState={initialState} callbacks={callbacks}>
      {children}
    </CanvasContextProvider>
  );
};
