import React, { useEffect, useMemo } from 'react';
import { Edge, useEdgesState, Connection as ReactFlowConnection } from '@xyflow/react';
import type { Connection } from '@/shared/contracts';
import { useRenderGuard, RenderGuardPresets } from '@/lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { useCanvasContext } from '../contexts/CanvasContext';
import { useSmartConnectors } from '../hooks/useSmartConnectors';
import { connectionToEdge } from '../utils/canvasAdapters';
import type { ConnectionToEdgeOptions } from '../utils/canvasAdapters';
import type { SmartRouteResult } from '../utils/smart-routing';

export interface EdgeLayerProps {
  connections: Connection[];
  children?: React.ReactNode;
}

const connectionAdapterOptions: ConnectionToEdgeOptions = {
  edgeType: 'custom',
  allowCircularConnections: true,
  ignoreMissingEndpoints: true,
};

const createReactFlowEdges = (
  connections: Connection[],
  smartRoutes?: Map<string, SmartRouteResult>,
): Edge[] => {
  return connections
    .map((connection) => {
      const baseEdge = connectionToEdge(connection, connectionAdapterOptions);
      if (!baseEdge) {
        return null;
      }

      const smartRoute = smartRoutes?.get(connection.id);
      const augmentedConnection: Connection = smartRoute
        ? {
            ...connection,
            smartPath: smartRoute.points,
            routingMetadata: {
              algorithm: smartRoute.algorithm,
              updatedAt: smartRoute.generatedAt,
              collisionsDetected: smartRoute.collisions,
            },
          }
        : connection;

      const edgeData = {
        ...(baseEdge.data ?? {}),
        connection: augmentedConnection,
        smartPath: smartRoute?.points,
        routingAlgorithm: smartRoute?.algorithm,
        collisions: smartRoute?.collisions,
        connectionStyle: (baseEdge.data as any)?.connectionStyle ?? 'curved',
        isSelected: baseEdge.selected ?? false,
        isStartConnection: (baseEdge.data as any)?.isStartConnection ?? false,
      };

      const edge: Edge = {
        ...baseEdge,
        id: connection.id,
        type: baseEdge.type ?? 'custom',
        source: connection.from,
        target: connection.to,
        sourceHandle: connection.fromHandleId ?? baseEdge.sourceHandle ?? null,
        targetHandle: connection.toHandleId ?? baseEdge.targetHandle ?? null,
        data: edgeData,
      };

      return edge;
    })
    .filter((edge): edge is Edge => edge !== null);
};

export const EdgeLayer: React.FC<EdgeLayerProps> = ({ connections, children }) => {
  const renderGuard = useRenderGuard('ReactFlowCanvas.EdgeLayer', RenderGuardPresets.canvasLayers.EdgeLayer);

  const { state, callbacks } = useCanvasContext();
  const { selectedItems } = state;
  const { connection: connectionCallbacks } = callbacks;

  const smartRoutes = useSmartConnectors(connections);

  const reactFlowEdges = useMemo(
    () => createReactFlowEdges(connections, smartRoutes),
    [connections, smartRoutes]
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  useEffect(() => {
    const selectedConnectionIds = new Set(selectedItems);
    setEdges(currentEdges =>
      currentEdges.map(edge => {
        const isSelected = selectedConnectionIds.has(edge.id);
        const fallbackStroke = edge.style?.stroke ?? '#666';
        const fallbackWidth = (edge.style as any)?.strokeWidth ?? 2;
        return {
          ...edge,
          selected: isSelected,
          style: {
            ...edge.style,
            stroke: isSelected ? '#ff6b6b' : fallbackStroke,
            strokeWidth: isSelected ? 3 : fallbackWidth,
          },
          data: {
            ...(edge.data ?? {}),
            isSelected,
          },
        };
      })
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
    if (!connection.source || !connection.target) {
      return;
    }

    const newConnection: Connection = {
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      from: connection.source,
      to: connection.target,
      sourceId: connection.source,
      targetId: connection.target,
      label: 'Connection',
      type: 'data',
      direction: 'end',
      visualStyle: 'default',
      fromHandleId: connection.sourceHandle ?? undefined,
      toHandleId: connection.targetHandle ?? undefined,
      fromPortId: connection.sourceHandle ?? undefined,
      toPortId: connection.targetHandle ?? undefined,
    };
    connectionCallbacks.onConnectionCreate(newConnection);
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
