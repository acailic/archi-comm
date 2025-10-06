import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Viewport } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAnnouncer } from "../../../shared/hooks/useAccessibility";
import { equalityFunctions } from "../../../shared/utils/memoization";
import { EnhancedErrorBoundary } from "../../ui/components/ErrorBoundary/EnhancedErrorBoundary";
import { Connection, DesignComponent, InfoCard } from "../types";
import { CanvasController } from "./CanvasController";
import { CanvasInteractionLayer } from "./CanvasInteractionLayer";
import { EdgeLayer } from "./EdgeLayer";
import { LayoutEngine } from "./LayoutEngine";
import { NodeLayer } from "./NodeLayer";

export interface ReactFlowCanvasWrapperProps {
  components: DesignComponent[];
  connections: Connection[];
  infoCards?: InfoCard[];
  selectedComponentId?: string;
  selectedConnectionId?: string;
  selectedInfoCardId?: string;
  enableAutoLayout?: boolean;
  virtualizationEnabled?: boolean;
  enableDragDrop?: boolean;
  enableContextMenu?: boolean;
  enableKeyboardShortcuts?: boolean;
  showBackground?: boolean;
  showControls?: boolean;
  showMiniMap?: boolean;
  onViewportChange?: (viewport: Viewport) => void;
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
  onInfoCardCreate?: (infoCard: InfoCard) => void;
  onInfoCardUpdate?: (infoCard: InfoCard) => void;
  onInfoCardDelete?: (infoCardId: string) => void;
  onInfoCardSelect?: (infoCardId: string) => void;
}

const ReactFlowCanvasWrapperComponent: React.FC<
  ReactFlowCanvasWrapperProps
> = ({
  components,
  connections,
  infoCards = [],
  selectedComponentId,
  selectedConnectionId,
  selectedInfoCardId,
  enableAutoLayout = false,
  virtualizationEnabled = true,
  enableDragDrop = true,
  enableContextMenu = true,
  enableKeyboardShortcuts = true,
  showBackground = true,
  showControls = true,
  showMiniMap = true,
  onViewportChange,
  onComponentSelect,
  onComponentDeselect,
  onComponentDrop,
  onComponentPositionChange,
  onComponentDelete,
  onConnectionCreate,
  onConnectionDelete,
  onConnectionSelect,
  onInfoCardCreate = () => {},
  onInfoCardUpdate = () => {},
  onInfoCardDelete = () => {},
  onInfoCardSelect = () => {},
}) => {
  const announce = useAnnouncer();
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const hasAnnouncedInitialRef = useRef(false);

  const canvasLabel = useMemo(() => {
    const componentCount = components.length;
    const connectionCount = connections.length;
    return `Design canvas with ${componentCount} component${componentCount === 1 ? "" : "s"} and ${connectionCount} connection${connectionCount === 1 ? "" : "s"}`;
  }, [components.length, connections.length]);

  useEffect(() => {
    if (!hasAnnouncedInitialRef.current && components.length > 0) {
      announce(`Canvas loaded with ${components.length} components`);
      hasAnnouncedInitialRef.current = true;
    }
  }, [announce, components.length]);

  useEffect(() => {
    if (!selectedComponentId) {
      return;
    }
    const selectedComponent = components.find(
      (component) => component.id === selectedComponentId
    );
    if (selectedComponent) {
      announce(
        `Component ${selectedComponent.label ?? selectedComponent.id} selected`
      );
    }
  }, [announce, components, selectedComponentId]);

  useEffect(() => {
    if (!selectedConnectionId) {
      return;
    }
    const connection = connections.find(
      (item) => item.id === selectedConnectionId
    );
    if (connection) {
      announce(
        `Connection from ${connection.from} to ${connection.to} selected`
      );
    }
  }, [announce, connections, selectedConnectionId]);

  const handleKeyboardNavigation = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (components.length === 0) {
        return;
      }

      if (
        event.key === "ArrowRight" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        const direction =
          event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const currentIndex = selectedComponentId
          ? components.findIndex(
              (component) => component.id === selectedComponentId
            )
          : -1;
        const nextIndex =
          (currentIndex + direction + components.length) % components.length;
        const nextComponent = components[nextIndex];
        if (nextComponent) {
          onComponentSelect(nextComponent.id);
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onComponentDeselect();
      }
    },
    [components, onComponentDeselect, onComponentSelect, selectedComponentId]
  );

  return (
    <ReactFlowProvider>
      <CanvasController
        components={components}
        connections={connections}
        infoCards={infoCards}
        selectedComponentId={selectedComponentId}
        selectedConnectionId={selectedConnectionId}
        selectedInfoCardId={selectedInfoCardId}
        enableAutoLayout={enableAutoLayout}
        virtualizationEnabled={virtualizationEnabled}
        onComponentSelect={onComponentSelect}
        onComponentDeselect={onComponentDeselect}
        onComponentDrop={onComponentDrop}
        onComponentPositionChange={onComponentPositionChange}
        onComponentDelete={onComponentDelete}
        onConnectionCreate={onConnectionCreate}
        onConnectionDelete={onConnectionDelete}
        onConnectionSelect={onConnectionSelect}
        onInfoCardCreate={onInfoCardCreate}
        onInfoCardUpdate={onInfoCardUpdate}
        onInfoCardDelete={onInfoCardDelete}
        onInfoCardSelect={onInfoCardSelect}
      >
        <EnhancedErrorBoundary boundaryId="canvas-node-layer">
          <NodeLayer components={components} infoCards={infoCards}>
            <EnhancedErrorBoundary boundaryId="canvas-edge-layer">
              <EdgeLayer connections={connections}>
                <EnhancedErrorBoundary boundaryId="canvas-interaction-layer">
                  <CanvasInteractionLayer
                    enableDragDrop={enableDragDrop}
                    enableContextMenu={enableContextMenu}
                    enableKeyboardShortcuts={enableKeyboardShortcuts}
                  >
                    <div
                      ref={canvasContainerRef}
                      role="application"
                      aria-label={canvasLabel}
                      tabIndex={0}
                      className="react-flow-accessible-container focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-background"
                      onKeyDown={handleKeyboardNavigation}
                    >
                      <ReactFlow
                        fitView
                        attributionPosition="bottom-left"
                        className="react-flow-canvas"
                        onMove={
                          onViewportChange
                            ? (_event, viewportParams) =>
                                onViewportChange(viewportParams)
                            : undefined
                        }
                      >
                        {showBackground && (
                          <Background
                            color="#e5e7eb"
                            gap={20}
                            size={1}
                            variant={BackgroundVariant.Dots}
                            style={{ backgroundColor: '#ffffff' }}
                          />
                        )}
                        {showControls && <Controls />}
                        {showMiniMap && <MiniMap />}
                      </ReactFlow>
                    </div>
                  </CanvasInteractionLayer>
                </EnhancedErrorBoundary>
              </EdgeLayer>
            </EnhancedErrorBoundary>
          </NodeLayer>
        </EnhancedErrorBoundary>

        <LayoutEngine
          components={components}
          connections={connections}
          enableAutoLayout={enableAutoLayout}
        />
      </CanvasController>
    </ReactFlowProvider>
  );
};

// Optimized equality function for ReactFlowCanvasWrapper props
const reactFlowCanvasPropsEqual = (
  prev: ReactFlowCanvasWrapperProps,
  next: ReactFlowCanvasWrapperProps
): boolean => {
  // Fast path: check array lengths first
  if (
    prev.components.length !== next.components.length ||
    prev.connections.length !== next.connections.length ||
    (prev.infoCards?.length ?? 0) !== (next.infoCards?.length ?? 0)
  ) {
    return false;
  }

  // Check selected IDs
  if (
    prev.selectedComponentId !== next.selectedComponentId ||
    prev.selectedConnectionId !== next.selectedConnectionId ||
    prev.selectedInfoCardId !== next.selectedInfoCardId
  ) {
    return false;
  }

  // Check boolean flags
  if (
    prev.enableAutoLayout !== next.enableAutoLayout ||
    prev.virtualizationEnabled !== next.virtualizationEnabled ||
    prev.enableDragDrop !== next.enableDragDrop ||
    prev.enableContextMenu !== next.enableContextMenu ||
    prev.enableKeyboardShortcuts !== next.enableKeyboardShortcuts ||
    prev.showBackground !== next.showBackground ||
    prev.showControls !== next.showControls ||
    prev.showMiniMap !== next.showMiniMap
  ) {
    return false;
  }

  // Check callback references (assume they're stable)
  if (
    prev.onComponentSelect !== next.onComponentSelect ||
    prev.onComponentDeselect !== next.onComponentDeselect ||
    prev.onComponentDrop !== next.onComponentDrop ||
    prev.onComponentPositionChange !== next.onComponentPositionChange ||
    prev.onComponentDelete !== next.onComponentDelete ||
    prev.onConnectionCreate !== next.onConnectionCreate ||
    prev.onConnectionDelete !== next.onConnectionDelete ||
    prev.onConnectionSelect !== next.onConnectionSelect ||
    prev.onInfoCardCreate !== next.onInfoCardCreate ||
    prev.onInfoCardUpdate !== next.onInfoCardUpdate ||
    prev.onInfoCardDelete !== next.onInfoCardDelete ||
    prev.onInfoCardSelect !== next.onInfoCardSelect ||
    prev.onViewportChange !== next.onViewportChange
  ) {
    return false;
  }

  // Use arrays equality function for deep comparison
  return equalityFunctions.arrays(
    {
      components: prev.components,
      connections: prev.connections,
      infoCards: prev.infoCards,
    },
    {
      components: next.components,
      connections: next.connections,
      infoCards: next.infoCards,
    }
  );
};

export const ReactFlowCanvasWrapper = React.memo(
  ReactFlowCanvasWrapperComponent,
  reactFlowCanvasPropsEqual
);
