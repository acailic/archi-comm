import React, { useEffect, useMemo } from 'react';
import { DesignComponent, Connection, InfoCard } from '../../../types';
import { useRenderGuard, RenderGuardPresets } from '../../../lib/performance/RenderGuard';
import { RenderLoopDiagnostics } from '../../../lib/debug/RenderLoopDiagnostics';
import { InfiniteLoopDetector } from '../../../lib/performance/InfiniteLoopDetector';
import {
  CanvasContextProvider,
  CanvasState,
  CanvasCallbacks,
  VirtualizationConfig,
} from '../contexts/CanvasContext';

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
  onComponentDrop: (component: DesignComponent, position: { x: number; y: number }) => void;
  onComponentPositionChange: (componentId: string, position: { x: number; y: number }) => void;
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

  const handleEmergencyPause = React.useCallback(() => {
    RenderLoopDiagnostics.recordStabilityWarning('ReactFlowCanvas.Controller', 'Emergency pause triggered');
    setEmergencyPause(true);
  }, []);

  const handleCircuitBreakerOpen = React.useCallback(() => {
    setEmergencyPause(true);
  }, []);

  const handleOnTrip = React.useCallback((details: { componentName: string; renderCount: number; error: any }) => {
    setEmergencyPause(true);
  }, []);

  const renderGuard = useRenderGuard('ReactFlowCanvas.Controller', {
    ...RenderGuardPresets.canvasLayers.Controller,
    disableSyntheticError: true,
    onCircuitBreakerOpen: handleCircuitBreakerOpen,
    onTrip: handleOnTrip,
    circuitBreakerCooldownMs: 5000,
  });

  const virtualizationConfig = useMemo<VirtualizationConfig>(() => ({
    bufferZone: 200,
    maxVisibleItems: 100,
    enabled: virtualizationEnabled,
  }), [virtualizationEnabled]);

  const selectedItems = useMemo(() => {
    const items: string[] = [];
    if (selectedComponentId) items.push(selectedComponentId);
    if (selectedConnectionId) items.push(selectedConnectionId);
    if (selectedInfoCardId) items.push(selectedInfoCardId);
    return items;
  }, [selectedComponentId, selectedConnectionId, selectedInfoCardId]);

  const initialState = useMemo<CanvasState>(() => ({
    layoutPositions: {},
    virtualizationConfig,
    selectedItems,
    reactFlowInstance: null,
    emergencyPause: emergencyPause,
  }), [virtualizationConfig, selectedItems, emergencyPause]);

  const handleEmergencyResume = React.useCallback(() => {
    RenderLoopDiagnostics.recordResume('ReactFlowCanvas.Controller');
    setEmergencyPause(false);
  }, []);

  const callbacks = useMemo<CanvasCallbacks>(() => ({
    component: {
      onComponentSelect,
      onComponentDeselect,
      onComponentDrop,
      onComponentPositionChange,
      onComponentDelete,
    },
    connection: {
      onConnectionCreate,
      onConnectionDelete,
      onConnectionSelect,
    },
    infoCard: {
      onInfoCardCreate,
      onInfoCardUpdate,
      onInfoCardDelete,
      onInfoCardSelect,
    },
    onEmergencyPause: handleEmergencyPause,
    onEmergencyResume: handleEmergencyResume,
  }), [
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
    handleEmergencyPause,
    handleEmergencyResume,
  ]);

  useEffect(() => {
    if (emergencyPause) {
      InfiniteLoopDetector.recordRender('ReactFlowCanvas.Controller', {
        componentName: 'CanvasController',
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
  }, [emergencyPause, renderGuard.renderCount, components.length, connections.length, infoCards.length, selectedItems]);

  useEffect(() => {
    const propsData = {
      componentsCount: components.length,
      connectionsCount: connections.length,
      infoCardsCount: infoCards.length,
      enableAutoLayout,
      virtualizationEnabled,
      selectedItems,
    };

    InfiniteLoopDetector.recordRender('ReactFlowCanvas.Controller', {
      componentName: 'CanvasController',
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
          <p>Render loop detected. Canvas has been paused to prevent performance issues.</p>
          <button onClick={handleEmergencyResume}>Resume Canvas</button>
        </div>
      </div>
    );
  }

  return (
    <CanvasContextProvider
      initialState={initialState}
      callbacks={callbacks}
    >
      {children}
    </CanvasContextProvider>
  );
};