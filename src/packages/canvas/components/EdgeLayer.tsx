import React, { useEffect, useMemo } from 'react';
import { Edge, useEdgesState, Connection as ReactFlowConnection } from '@xyflow/react';
import { Connection } from '../../../types';
import { useRenderGuard, RenderGuardPresets } from '../../../lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '../../../lib/performance/InfiniteLoopDetector';
import { useCanvasContext } from '../contexts/CanvasContext';

export interface EdgeLayerProps {
  connections: Connection[];
  children?: React.ReactNode;
}

const createReactFlowEdges = (connections: Connection[]): Edge[] => {
  return connections.map(connection => ({
    id: connection.id,
    source: connection.sourceId,
    target: connection.targetId,
    sourceHandle: connection.sourceHandle || null,
    targetHandle: connection.targetHandle || null,
    type: connection.type || 'default',
    animated: connection.animated || false,
    style: {
      stroke: connection.color || '#666',
      strokeWidth: connection.width || 2,
      ...connection.style,
    },
    label: connection.label,
    labelStyle: connection.labelStyle,
    labelShowBg: connection.labelShowBg !== false,
    labelBgStyle: connection.labelBgStyle,
    data: {
      connection,
      sourcePortId: connection.sourcePortId,
      targetPortId: connection.targetPortId,
      properties: connection.properties,
    },
    markerEnd: {
      type: 'arrowclosed',
      width: 20,
      height: 20,
      color: connection.color || '#666',
    },
  }));
};

export const EdgeLayer: React.FC<EdgeLayerProps> = ({ connections, children }) => {
  const renderGuard = useRenderGuard('ReactFlowCanvas.EdgeLayer', RenderGuardPresets.canvasLayers.EdgeLayer);

  const { state, callbacks } = useCanvasContext();
  const { selectedItems } = state;
  const { connection: connectionCallbacks } = callbacks;

  const reactFlowEdges = useMemo(() =>
    createReactFlowEdges(connections),
    [connections]
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  useEffect(() => {
    const selectedConnectionIds = new Set(selectedItems);
    setEdges(currentEdges =>
      currentEdges.map(edge => ({
        ...edge,
        selected: selectedConnectionIds.has(edge.id),
        style: {
          ...edge.style,
          stroke: selectedConnectionIds.has(edge.id)
            ? '#ff6b6b'
            : edge.data?.connection?.color || '#666',
          strokeWidth: selectedConnectionIds.has(edge.id) ? 3 : edge.data?.connection?.width || 2,
        },
      }))
    );
  }, [selectedItems, setEdges]);

  useEffect(() => {
    const propsData = {
      connectionsCount: connections.length,
      selectedItemsCount: selectedItems.length,
      edgeTypes: [...new Set(connections.map(c => c.type || 'default'))],
    };

    InfiniteLoopDetector.recordRender('ReactFlowCanvas.EdgeLayer', {
      componentName: 'EdgeLayer',
      propsHash: JSON.stringify(propsData),
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
    });
  }, [
    connections.length,
    selectedItems.length,
    connections,
    renderGuard.renderCount,
  ]);

  const handleEdgeClick = React.useCallback((event: React.MouseEvent, edge: Edge) => {
    connectionCallbacks.onConnectionSelect(edge.id);
  }, [connectionCallbacks]);

  const handleEdgeDoubleClick = React.useCallback((event: React.MouseEvent, edge: Edge) => {
    connectionCallbacks.onConnectionSelect(edge.id);
  }, [connectionCallbacks]);

  const handleConnect = React.useCallback((connection: ReactFlowConnection) => {
    if (connection.source && connection.target) {
      const newConnection: Connection = {
        id: `${connection.source}-${connection.target}-${Date.now()}`,
        sourceId: connection.source,
        targetId: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        sourcePortId: connection.sourceHandle || undefined,
        targetPortId: connection.targetHandle || undefined,
        type: 'default',
        animated: false,
        properties: {},
      };
      connectionCallbacks.onConnectionCreate(newConnection);
    }
  }, [connectionCallbacks]);

  const handleEdgesDelete = React.useCallback((edgesToDelete: Edge[]) => {
    edgesToDelete.forEach(edge => {
      connectionCallbacks.onConnectionDelete(edge.id);
    });
  }, [connectionCallbacks]);

  const enhancedOnEdgesChange = React.useCallback((changes: any[]) => {
    changes.forEach(change => {
      if (change.type === 'remove') {
        connectionCallbacks.onConnectionDelete(change.id);
      }
    });
    onEdgesChange(changes);
  }, [onEdgesChange, connectionCallbacks]);

  const edgeEventHandlers = useMemo(() => ({
    onEdgeClick: handleEdgeClick,
    onEdgeDoubleClick: handleEdgeDoubleClick,
    onConnect: handleConnect,
    onEdgesDelete: handleEdgesDelete,
    onEdgesChange: enhancedOnEdgesChange,
  }), [
    handleEdgeClick,
    handleEdgeDoubleClick,
    handleConnect,
    handleEdgesDelete,
    enhancedOnEdgesChange,
  ]);

  if (renderGuard.shouldPause) {
    return (
      <div className="edge-layer-paused">
        <p>Edge layer paused due to render loop detection</p>
      </div>
    );
  }

  return (
    <div className="edge-layer">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            edges,
            ...edgeEventHandlers,
          });
        }
        return child;
      })}
    </div>
  );
};