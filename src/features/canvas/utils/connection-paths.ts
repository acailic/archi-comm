/**
 * src/features/canvas/utils/connection-paths.ts
 * Utilities for generating SVG paths for canvas connections
 * Contains pure functions for calculating connection points and paths
 * RELEVANT FILES: CanvasArea.tsx, ConnectionSvgLayer.tsx, design-system.ts
 */

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
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const cp1x = from.x + (midX - from.x) * 0.5;
  const cp1y = from.y;
  const cp2x = to.x - (to.x - midX) * 0.5;
  const cp2y = to.y;

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
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
