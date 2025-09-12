// Auto-layout utilities for canvas nodes
// Provides ELK-based layout with a simple API and sensible defaults

import ELK from 'elkjs/lib/elk.bundled.js';
import type { DesignComponent, Connection } from '@/shared/contracts';

export type LayoutEngine = 'elk';

export interface LayoutOptions {
  engine?: LayoutEngine;
  direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  nodeSeparation?: number;
  layerSeparation?: number;
  edgeSeparation?: number;
  defaultNodeSize?: { width: number; height: number };
}

const DEFAULT_NODE_SIZE = { width: 220, height: 140 };

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

export type PositionMap = Record<string, { x: number; y: number }>;

/**
 * Compute layout positions for components using ELK (layered algorithm)
 */
export async function computeLayout(
  components: DesignComponent[],
  connections: Connection[],
  opts: LayoutOptions = {}
): Promise<PositionMap> {
  const elk = new ELK();

  const {
    direction = 'RIGHT',
    nodeSeparation = 60,
    layerSeparation = 100,
    edgeSeparation = 40,
    defaultNodeSize = DEFAULT_NODE_SIZE,
  } = opts;

  // Build ELK graph
  const graph: any = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': `${nodeSeparation}`,
      'elk.layered.spacing.nodeNodeBetweenLayers': `${layerSeparation}`,
      'elk.layered.spacing.edgeNodeBetweenLayers': `${edgeSeparation}`,
      'elk.layered.spacing.edgeNodeBetweenLayers.default': `${edgeSeparation}`,
      'elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: components.map(c => ({
      id: c.id,
      width: c.width ?? defaultNodeSize.width,
      height: c.height ?? defaultNodeSize.height,
    })),
    edges: connections.map(conn => ({ id: conn.id, sources: [conn.from], targets: [conn.to] })),
  };

  try {
    const res = await elk.layout(graph);
    const map: PositionMap = {};
    for (const n of res.children ?? []) {
      map[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
    }
    return map;
  } catch (err) {
    console.warn('ELK layout failed, returning empty map', err);
    return {};
  }
}

