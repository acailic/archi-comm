/**
 * src/features/canvas/utils/connection-paths.ts
 * Utilities for generating SVG paths for canvas connections
 * Contains pure functions for calculating connection points and paths
 * RELEVANT FILES: CanvasArea.tsx, ConnectionSvgLayer.tsx, design-system.ts
 */

import type { DesignComponent, Connection } from '@/shared/contracts';
import { type Point, type ConnectionPoint } from '@/shared/types';

export interface ConnectionEndpoints {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/**
 * Calculate the connection points on a component's edges
 */
export function calculateConnectionPoints(component: DesignComponent): Record<string, ConnectionPoint> {
  const centerX = component.x + 64; // Half of component width (128px)
  const centerY = component.y + 40; // Half of component height (80px)

  return {
    top: { x: centerX, y: component.y - 1 },
    bottom: { x: centerX, y: component.y + 81 },
    left: { x: component.x - 1, y: centerY },
    right: { x: component.x + 129, y: centerY }
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
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(distance * 0.3, 100);
  
  const midX1 = from.x + (dx > 0 ? curvature : -curvature);
  const midX2 = to.x + (dx > 0 ? -curvature : curvature);
  
  return `M ${from.x} ${from.y} C ${midX1} ${from.y}, ${midX2} ${to.y}, ${to.x} ${to.y}`;
}

/**
 * Generate stepped/orthogonal path between two points
 */
export function createSteppedPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

/**
 * Calculate connection endpoints between two components
 */
export function getConnectionEndpoints(
  fromComponent: DesignComponent,
  toComponent: DesignComponent
): ConnectionEndpoints {
  const fromCenterX = fromComponent.x + 64;
  const fromCenterY = fromComponent.y + 40;
  const toCenterX = toComponent.x + 64;
  const toCenterY = toComponent.y + 40;

  // Calculate angle between components
  const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
  
  // Component dimensions
  const compWidth = 128;
  const compHeight = 80;

  // Calculate edge points
  const fromX = fromCenterX + Math.cos(angle) * (compWidth / 2);
  const fromY = fromCenterY + Math.sin(angle) * (compHeight / 2);
  const toX = toCenterX - Math.cos(angle) * (compWidth / 2);
  const toY = toCenterY - Math.sin(angle) * (compHeight / 2);

  return { fromX, fromY, toX, toY };
}

/**
 * Generate full connection path based on style
 */
export function getConnectionPath(
  connection: Connection,
  components: DesignComponent[],
  style: 'straight' | 'curved' | 'stepped' = 'curved'
): string {
  const fromComponent = components.find(c => c.id === connection.from);
  const toComponent = components.find(c => c.id === connection.to);
  
  if (!fromComponent || !toComponent) return '';

  const { fromX, fromY, toX, toY } = getConnectionEndpoints(fromComponent, toComponent);
  const from = { x: fromX, y: fromY };
  const to = { x: toX, y: toY };

  switch (style) {
    case 'curved':
      return createCurvedPath(from, to);
    case 'stepped':
      return createSteppedPath(from, to);
    default:
      return createStraightPath(from, to);
  }
}