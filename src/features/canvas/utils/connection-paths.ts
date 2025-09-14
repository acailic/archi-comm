/**
 * src/features/canvas/utils/connection-paths.ts
 * Utilities for generating SVG paths for canvas connections
 * Contains pure functions for calculating connection points and paths
 * RELEVANT FILES: CanvasArea.tsx, ConnectionSvgLayer.tsx, design-system.ts
 */

import { getBoxToBoxArrow } from 'perfect-arrows';
import type { Connection, DesignComponent } from '@/shared/contracts';
import type { ConnectionPoint, Point } from '@/shared/types';

export interface ConnectionEndpoints {
  from: Point;
  to: Point;
}

/**
 * Calculate the connection points on a component's edges
 */
export function calculateConnectionPoints(component: DesignComponent): Record<string, ConnectionPoint> {
  const width = 220; // Default component width
  const height = 140; // Default component height

  return {
    top: { x: component.x + width / 2, y: component.y },
    right: { x: component.x + width, y: component.y + height / 2 },
    bottom: { x: component.x + width / 2, y: component.y + height },
    left: { x: component.x, y: component.y + height / 2 }
  };
}

/**
 * Generate straight line path between two points
 */
export function createStraightPath(from: Point, to: Point): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/**
 * Generate curved bezier path between two points
 */
export function createCurvedPath(from: Point, to: Point): string {
  // Use perfect-arrows for a nicer, collision-aware curve
  // Treat endpoints as 1x1 boxes to get properly padded curves
  const [sx, sy, cx, cy, ex, ey] = getBoxToBoxArrow(
    from.x,
    from.y,
    1,
    1,
    to.x,
    to.y,
    1,
    1,
    {
      bow: 0.2,
      stretch: 0.5,
      stretchMin: 40,
      stretchMax: 420,
      padStart: 8,
      padEnd: 12,
      straights: true,
    }
  ) as unknown as [number, number, number, number, number, number];

  // Quadratic Bezier path: start -> control -> end
  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
}

/**
 * Generate stepped/orthogonal path between two points
 */
export function createSteppedPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

/**
 * Get connection endpoints based on component positions and connection type
 */
function getConnectionEndpoints(connection: Connection, components: DesignComponent[]): ConnectionEndpoints | null {
  const fromComponent = components.find(c => c.id === connection.from);
  const toComponent = components.find(c => c.id === connection.to);

  if (!fromComponent || !toComponent) return null;

  const fromPoints = calculateConnectionPoints(fromComponent);
  const toPoints = calculateConnectionPoints(toComponent);

  // Default to connecting bottom-to-top
  return {
    from: fromPoints.bottom,
    to: toPoints.top
  };
}

/**
 * Generate the SVG path for a connection based on style
 */
export function getConnectionPath(
  connection: Connection,
  components: DesignComponent[],
  style: 'straight' | 'curved' | 'stepped' = 'curved'
): string | null {
  const endpoints = getConnectionEndpoints(connection, components);
  if (!endpoints) return null;

  switch (style) {
    case 'straight':
      return createStraightPath(endpoints.from, endpoints.to);
    case 'curved':
      return createCurvedPath(endpoints.from, endpoints.to);
    case 'stepped':
      return createSteppedPath(endpoints.from, endpoints.to);
    default:
      return createCurvedPath(endpoints.from, endpoints.to);
  }
}
