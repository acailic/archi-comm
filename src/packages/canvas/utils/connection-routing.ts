/**
 * File: src/packages/canvas/utils/connection-routing.ts
 * Purpose: Smart connection routing with collision detection and path optimization
 * Why: Improves connection clarity in complex diagrams by avoiding component overlaps
 * Related: src/packages/canvas/utils/connection-paths.ts, src/packages/canvas/SimpleCanvas.tsx
 */

import type { DesignComponent } from '../../../shared/contracts';

export interface Point {
  x: number;
  y: number;
}

export interface CollisionInfo {
  componentId: string;
  intersectionPoint: Point;
}

/**
 * Check if a line segment intersects a rectangle
 */
function lineIntersectsRect(
  lineStart: Point,
  lineEnd: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const rectLeft = rect.x;
  const rectRight = rect.x + rect.width;
  const rectTop = rect.y;
  const rectBottom = rect.y + rect.height;

  // Check if either endpoint is inside the rectangle
  const startInside =
    lineStart.x >= rectLeft &&
    lineStart.x <= rectRight &&
    lineStart.y >= rectTop &&
    lineStart.y <= rectBottom;

  const endInside =
    lineEnd.x >= rectLeft &&
    lineEnd.x <= rectRight &&
    lineEnd.y >= rectTop &&
    lineEnd.y <= rectBottom;

  if (startInside || endInside) {
    return true;
  }

  // Check if line intersects any of the four edges of the rectangle
  const edges = [
    { start: { x: rectLeft, y: rectTop }, end: { x: rectRight, y: rectTop } }, // top
    { start: { x: rectRight, y: rectTop }, end: { x: rectRight, y: rectBottom } }, // right
    { start: { x: rectLeft, y: rectBottom }, end: { x: rectRight, y: rectBottom } }, // bottom
    { start: { x: rectLeft, y: rectTop }, end: { x: rectLeft, y: rectBottom } }, // left
  ];

  return edges.some((edge) =>
    linesIntersect(lineStart, lineEnd, edge.start, edge.end)
  );
}

/**
 * Check if two line segments intersect
 */
function linesIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const ccw = (a: Point, b: Point, c: Point) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Detect collisions between a connection path and components
 */
export function detectCollisions(
  connectionPath: Point[],
  components: DesignComponent[]
): CollisionInfo[] {
  const collisions: CollisionInfo[] = [];

  // Default component dimensions (can be made configurable)
  const defaultWidth = 120;
  const defaultHeight = 80;

  for (let i = 0; i < connectionPath.length - 1; i++) {
    const segmentStart = connectionPath[i];
    const segmentEnd = connectionPath[i + 1];

    components.forEach((component) => {
      const rect = {
        x: component.x - defaultWidth / 2,
        y: component.y - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
      };

      if (lineIntersectsRect(segmentStart, segmentEnd, rect)) {
        collisions.push({
          componentId: component.id,
          intersectionPoint: {
            x: (segmentStart.x + segmentEnd.x) / 2,
            y: (segmentStart.y + segmentEnd.y) / 2,
          },
        });
      }
    });
  }

  return collisions;
}

/**
 * Adjust path to avoid collisions with simple heuristic
 */
export function adjustPathForCollisions(
  from: Point,
  to: Point,
  components: DesignComponent[]
): Point[] {
  const directPath = [from, to];
  const collisions = detectCollisions(directPath, components);

  if (collisions.length === 0) {
    return directPath;
  }

  // Simple avoidance: add waypoint above or below the colliding component
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Determine if we should route above or below
  const routeAbove = from.y < to.y;
  const offsetY = routeAbove ? -50 : 50;

  const waypoint1 = { x: from.x, y: midY + offsetY };
  const waypoint2 = { x: to.x, y: midY + offsetY };

  return [from, waypoint1, waypoint2, to];
}

/**
 * Create orthogonal (Manhattan-style) path
 */
export function createOrthogonalPath(
  from: Point,
  to: Point,
  components: DesignComponent[]
): Point[] {
  const path: Point[] = [from];

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Determine routing direction based on relative positions
  if (Math.abs(dx) > Math.abs(dy)) {
    // Route horizontally first, then vertically
    const midX = from.x + dx / 2;
    path.push({ x: midX, y: from.y });
    path.push({ x: midX, y: to.y });
  } else {
    // Route vertically first, then horizontally
    const midY = from.y + dy / 2;
    path.push({ x: from.x, y: midY });
    path.push({ x: to.x, y: midY });
  }

  path.push(to);

  // Check for collisions and adjust if necessary
  const collisions = detectCollisions(path, components);
  if (collisions.length > 0) {
    return adjustPathForCollisions(from, to, components);
  }

  return path;
}

/**
 * Smooth path with rounded corners
 */
export function smoothPath(points: Point[], radius: number = 10): string {
  if (points.length < 2) {
    return '';
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let pathData = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate direction vectors
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Normalize
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 === 0 || len2 === 0) continue;

    const ndx1 = dx1 / len1;
    const ndy1 = dy1 / len1;
    const ndx2 = dx2 / len2;
    const ndy2 = dy2 / len2;

    // Calculate corner points
    const r = Math.min(radius, len1 / 2, len2 / 2);
    const corner1 = {
      x: curr.x - ndx1 * r,
      y: curr.y - ndy1 * r,
    };
    const corner2 = {
      x: curr.x + ndx2 * r,
      y: curr.y + ndy2 * r,
    };

    // Add line to first corner, then quadratic curve to second corner
    pathData += ` L ${corner1.x} ${corner1.y}`;
    pathData += ` Q ${curr.x} ${curr.y} ${corner2.x} ${corner2.y}`;
  }

  // Add final line to end point
  const lastPoint = points[points.length - 1];
  pathData += ` L ${lastPoint.x} ${lastPoint.y}`;

  return pathData;
}

/**
 * Calculate optimal connection point on component edge
 */
export function getOptimalConnectionPoint(
  component: DesignComponent,
  targetPoint: Point,
  componentWidth: number = 120,
  componentHeight: number = 80
): Point {
  const cx = component.x;
  const cy = component.y;

  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;

  const angle = Math.atan2(dy, dx);

  // Determine which edge of the component to use
  const halfWidth = componentWidth / 2;
  const halfHeight = componentHeight / 2;

  const absAngle = Math.abs(angle);

  if (absAngle < Math.PI / 4) {
    // Right edge
    return { x: cx + halfWidth, y: cy };
  } else if (absAngle > (3 * Math.PI) / 4) {
    // Left edge
    return { x: cx - halfWidth, y: cy };
  } else if (angle > 0) {
    // Bottom edge
    return { x: cx, y: cy + halfHeight };
  } else {
    // Top edge
    return { x: cx, y: cy - halfHeight };
  }
}
