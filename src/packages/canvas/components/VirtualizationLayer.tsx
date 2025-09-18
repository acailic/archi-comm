import React, { useMemo, useCallback, useEffect } from 'react';
import { Node, Edge, useReactFlow, Viewport } from '@xyflow/react';
import { useRenderGuard, RenderGuardPresets } from '../../../lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '../../../lib/performance/InfiniteLoopDetector';
import { useCanvasContext } from '../contexts/CanvasContext';

export interface VirtualizationLayerProps {
  nodes: Node[];
  edges: Edge[];
  children: React.ReactNode;
}

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VirtualizationStats {
  totalNodes: number;
  visibleNodes: number;
  totalEdges: number;
  visibleEdges: number;
  culledNodes: number;
  culledEdges: number;
}

const DEFAULT_BUFFER_ZONE = 200;
const DEFAULT_MAX_VISIBLE_ITEMS = 100;

const isNodeInViewport = (node: Node, viewport: ViewportBounds, bufferZone: number): boolean => {
  const nodeLeft = node.position.x;
  const nodeTop = node.position.y;
  const nodeRight = nodeLeft + (node.width || 150);
  const nodeBottom = nodeTop + (node.height || 100);

  const viewportLeft = viewport.x - bufferZone;
  const viewportTop = viewport.y - bufferZone;
  const viewportRight = viewport.x + viewport.width + bufferZone;
  const viewportBottom = viewport.y + viewport.height + bufferZone;

  return !(
    nodeRight < viewportLeft ||
    nodeLeft > viewportRight ||
    nodeBottom < viewportTop ||
    nodeTop > viewportBottom
  );
};

const isEdgeInViewport = (edge: Edge, nodes: Node[], viewport: ViewportBounds, bufferZone: number): boolean => {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  return (
    isNodeInViewport(sourceNode, viewport, bufferZone) ||
    isNodeInViewport(targetNode, viewport, bufferZone)
  );
};

export const VirtualizationLayer: React.FC<VirtualizationLayerProps> = ({
  nodes,
  edges,
  children,
}) => {
  const renderGuard = useRenderGuard('ReactFlowCanvas.Virtualization', RenderGuardPresets.canvasLayers.VirtualizationLayer);

  const { state } = useCanvasContext();
  const { virtualizationConfig } = state;
  const reactFlow = useReactFlow();

  const viewport = reactFlow.getViewport();
  const bounds = useMemo<ViewportBounds>(() => {
    const { x, y, zoom } = viewport;
    return {
      x: -x / zoom,
      y: -y / zoom,
      width: window.innerWidth / zoom,
      height: window.innerHeight / zoom,
    };
  }, [viewport]);

  const bufferZone = virtualizationConfig.bufferZone || DEFAULT_BUFFER_ZONE;
  const maxVisibleItems = virtualizationConfig.maxVisibleItems || DEFAULT_MAX_VISIBLE_ITEMS;

  const virtualizedNodes = useMemo(() => {
    if (!virtualizationConfig.enabled) {
      return nodes;
    }

    const visibleNodes = nodes.filter(node =>
      isNodeInViewport(node, bounds, bufferZone)
    );

    if (visibleNodes.length <= maxVisibleItems) {
      return visibleNodes;
    }

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    return visibleNodes
      .map(node => ({
        node,
        distance: Math.sqrt(
          Math.pow(node.position.x - centerX, 2) + Math.pow(node.position.y - centerY, 2)
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxVisibleItems)
      .map(item => item.node);
  }, [nodes, bounds, bufferZone, maxVisibleItems, virtualizationConfig.enabled]);

  const virtualizedEdges = useMemo(() => {
    if (!virtualizationConfig.enabled) {
      return edges;
    }

    return edges.filter(edge =>
      isEdgeInViewport(edge, virtualizedNodes, bounds, bufferZone)
    );
  }, [edges, virtualizedNodes, bounds, bufferZone, virtualizationConfig.enabled]);

  const virtualizationStats = useMemo<VirtualizationStats>(() => ({
    totalNodes: nodes.length,
    visibleNodes: virtualizedNodes.length,
    totalEdges: edges.length,
    visibleEdges: virtualizedEdges.length,
    culledNodes: nodes.length - virtualizedNodes.length,
    culledEdges: edges.length - virtualizedEdges.length,
  }), [nodes.length, virtualizedNodes.length, edges.length, virtualizedEdges.length]);

  useEffect(() => {
    const propsData = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      virtualizationEnabled: virtualizationConfig.enabled,
      bufferZone,
      maxVisibleItems,
      viewportBounds: bounds,
      stats: virtualizationStats,
    };

    InfiniteLoopDetector.recordRender('ReactFlowCanvas.Virtualization', {
      componentName: 'VirtualizationLayer',
      propsHash: JSON.stringify(propsData),
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
    });
  }, [
    nodes.length,
    edges.length,
    virtualizationConfig.enabled,
    bufferZone,
    maxVisibleItems,
    bounds,
    virtualizationStats,
    renderGuard.renderCount,
  ]);

  const enhancedChildren = useMemo(() => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          nodes: virtualizedNodes,
          edges: virtualizedEdges,
          virtualizationStats,
        });
      }
      return child;
    });
  }, [children, virtualizedNodes, virtualizedEdges, virtualizationStats]);

  if (renderGuard.shouldPause) {
    return (
      <div className="virtualization-layer-paused">
        <p>Virtualization layer paused due to render loop detection</p>
        <div className="virtualization-stats">
          <p>Total Nodes: {nodes.length}</p>
          <p>Total Edges: {edges.length}</p>
        </div>
      </div>
    );
  }

  if (!virtualizationConfig.enabled) {
    return <>{children}</>;
  }

  return (
    <div className="virtualization-layer">
      {process.env.NODE_ENV === 'development' && (
        <div className="virtualization-debug" style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div>Nodes: {virtualizationStats.visibleNodes}/{virtualizationStats.totalNodes}</div>
          <div>Edges: {virtualizationStats.visibleEdges}/{virtualizationStats.totalEdges}</div>
          <div>Culled: {virtualizationStats.culledNodes}N + {virtualizationStats.culledEdges}E</div>
        </div>
      )}
      {enhancedChildren}
    </div>
  );
};