import React from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DesignComponent, Connection, InfoCard } from '../../../types';
import { CanvasController } from './CanvasController';
import { NodeLayer } from './NodeLayer';
import { EdgeLayer } from './EdgeLayer';
import { LayoutEngine } from './LayoutEngine';
import { VirtualizationLayer } from './VirtualizationLayer';
import { CanvasInteractionLayer } from './CanvasInteractionLayer';

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
  onComponentSelect: (componentId: string) => void;
  onComponentDeselect: () => void;
  onComponentDrop: (component: DesignComponent, position: { x: number; y: number }) => void;
  onComponentPositionChange: (componentId: string, position: { x: number; y: number }) => void;
  onComponentDelete: (componentId: string) => void;
  onConnectionCreate: (connection: Connection) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionSelect: (connectionId: string) => void;
  onInfoCardCreate?: (infoCard: InfoCard) => void;
  onInfoCardUpdate?: (infoCard: InfoCard) => void;
  onInfoCardDelete?: (infoCardId: string) => void;
  onInfoCardSelect?: (infoCardId: string) => void;
}

export const ReactFlowCanvasWrapper: React.FC<ReactFlowCanvasWrapperProps> = ({
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
        <NodeLayer components={components} infoCards={infoCards}>
          <EdgeLayer connections={connections}>
            <VirtualizationLayer nodes={[]} edges={[]}>
              <CanvasInteractionLayer
                enableDragDrop={enableDragDrop}
                enableContextMenu={enableContextMenu}
                enableKeyboardShortcuts={enableKeyboardShortcuts}
              >
                <ReactFlow
                  fitView
                  attributionPosition="bottom-left"
                  className="react-flow-canvas"
                >
                  {showBackground && <Background />}
                  {showControls && <Controls />}
                  {showMiniMap && <MiniMap />}
                </ReactFlow>
              </CanvasInteractionLayer>
            </VirtualizationLayer>
          </EdgeLayer>
        </NodeLayer>

        <LayoutEngine
          components={components}
          connections={connections}
          enableAutoLayout={enableAutoLayout}
        />
      </CanvasController>
    </ReactFlowProvider>
  );
};