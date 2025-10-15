import React, { useEffect, useCallback, useMemo } from 'react';
import { useRenderGuard, RenderGuardPresets } from '@/lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { useCanvasContext } from '../contexts/CanvasContext';
import type { DesignComponent, Connection } from '@/shared/contracts';

export interface LayoutEngineProps {
  components: DesignComponent[];
  connections: Connection[];
  enableAutoLayout?: boolean;
  layoutDirection?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing?: number;
  rankSpacing?: number;
}

interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

interface LayoutEdge {
  id: string;
  sources: string[];
  targets: string[];
}

interface ElkNode extends LayoutNode {
  x?: number;
  y?: number;
  children?: ElkNode[];
  edges?: LayoutEdge[];
}

interface LayoutOptions {
  'elk.algorithm': string;
  'elk.direction': string;
  'elk.spacing.nodeNode': string;
  'elk.layered.spacing.nodeNodeBetweenLayers': string;
  'elk.spacing.edgeNode': string;
  'elk.spacing.edgeEdge': string;
}

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 100;

export const LayoutEngine: React.FC<LayoutEngineProps> = ({
  components,
  connections,
  enableAutoLayout = false,
  layoutDirection = 'TB',
  nodeSpacing = 50,
  rankSpacing = 100,
}) => {
  const renderGuard = useRenderGuard('ReactFlowCanvas.LayoutEngine', RenderGuardPresets.canvasLayers.LayoutEngine);

  const versionRef = React.useRef(0);
  const inFlightRef = React.useRef<Promise<void> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const { state, updateLayoutPositions } = useCanvasContext();
  const { layoutPositions } = state;

  const layoutOptions = useMemo<LayoutOptions>(() => ({
    'elk.algorithm': 'layered',
    'elk.direction': layoutDirection,
    'elk.spacing.nodeNode': nodeSpacing.toString(),
    'elk.layered.spacing.nodeNodeBetweenLayers': rankSpacing.toString(),
    'elk.spacing.edgeNode': '20',
    'elk.spacing.edgeEdge': '10',
  }), [layoutDirection, nodeSpacing, rankSpacing]);

  const elkNodes = useMemo<LayoutNode[]>(() =>
    components.map(component => ({
      id: component.id,
      width: component.width || DEFAULT_NODE_WIDTH,
      height: component.height || DEFAULT_NODE_HEIGHT,
    })),
    [components]
  );

  const elkEdges = useMemo<LayoutEdge[]>(() =>
    connections
      .map((connection) => {
        const source = connection.from ?? (connection as any).sourceId;
        const target = connection.to ?? (connection as any).targetId;
        if (!source || !target) {
          return null;
        }
        return {
          id: connection.id,
          sources: [source],
          targets: [target],
        };
      })
      .filter((edge): edge is LayoutEdge => edge !== null),
    [connections]
  );

  const elkGraph = useMemo<ElkNode>(() => ({
    id: 'root',
    width: 800,
    height: 600,
    children: elkNodes,
    edges: elkEdges,
  }), [elkNodes, elkEdges]);

  const computeLayout = useCallback(async () => {
    if (!enableAutoLayout || elkNodes.length === 0) {
      return;
    }

    const myVersion = ++versionRef.current;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const layoutPromise = (async () => {
      try {
        const ELK = await import('elkjs');
        const elk = new ELK.default();

        const layoutedGraph = await elk.layout(elkGraph, {
          layoutOptions,
        });

        if (myVersion !== versionRef.current) {
          InfiniteLoopDetector.recordStabilityWarning('ReactFlowCanvas.LayoutEngine', 'Dropped stale ELK result');
          return;
        }

        if (layoutedGraph.children) {
          const newPositions: Record<string, { x: number; y: number }> = {};

          layoutedGraph.children.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
              newPositions[node.id] = {
                x: node.x,
                y: node.y,
              };
            }
          });

          updateLayoutPositions({
            ...layoutPositions,
            ...newPositions,
          });
        }
      } catch (error) {
        if (myVersion === versionRef.current && !(error instanceof Error && error.name === 'AbortError')) {
          console.error('Layout computation failed:', error);
        }
      } finally {
        if (myVersion === versionRef.current) {
          inFlightRef.current = null;
          abortRef.current = null;
        }
      }
    })();

    inFlightRef.current = layoutPromise;
    return layoutPromise;
  }, [
    enableAutoLayout,
    elkNodes.length,
    elkGraph,
    layoutOptions,
    layoutPositions,
    updateLayoutPositions,
  ]);

  const triggerLayoutComputation = useCallback(() => {
    if (enableAutoLayout && elkNodes.length > 0) {
      if (inFlightRef.current) {
        return;
      }
      computeLayout();
    }
  }, [enableAutoLayout, elkNodes.length, computeLayout]);

  useEffect(() => {
    const propsData = {
      componentsCount: components.length,
      connectionsCount: connections.length,
      enableAutoLayout,
      layoutDirection,
      nodeSpacing,
      rankSpacing,
    };

    InfiniteLoopDetector.recordRender('ReactFlowCanvas.LayoutEngine', {
      componentName: 'LayoutEngine',
      propsHash: JSON.stringify(propsData),
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
    });
  }, [
    components.length,
    connections.length,
    enableAutoLayout,
    layoutDirection,
    nodeSpacing,
    rankSpacing,
    renderGuard.renderCount,
  ]);

  useEffect(() => {
    if (enableAutoLayout) {
      const debounceTimer = setTimeout(triggerLayoutComputation, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [enableAutoLayout, components, connections, triggerLayoutComputation]);

  if (renderGuard.shouldPause) {
    return (
      <div className="layout-engine-paused">
        <p>Layout engine paused due to render loop detection</p>
      </div>
    );
  }

  return null;
};
