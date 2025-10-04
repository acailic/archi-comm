/**
 * File: src/lib/canvas/drawing-utils.ts
 * Purpose: Utility functions for drawing operations with perfect-freehand integration
 * Why: Centralized drawing logic for smooth stroke generation and coordinate transformations
 * Related: DrawingOverlay.tsx, canvasStore.ts, perfect-freehand library
 */

import { getStroke } from "perfect-freehand";
import type {
  DrawingStroke,
  DrawingTool,
  StrokePoint,
} from "../../shared/contracts";

/**
 * Default options for perfect-freehand stroke generation
 */
const DEFAULT_STROKE_OPTIONS = {
  size: 4,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  easing: (t: number) => t,
  start: {
    cap: true,
    taper: 0,
    easing: (t: number) => t,
  },
  end: {
    cap: true,
    taper: 100,
    easing: (t: number) => t,
  },
};

interface PointsToStrokeOptions {
  author?: string;
  tool?: DrawingTool;
}

/**
 * Wrapper for perfect-freehand's getStroke function with default options
 */
export function getStrokeOutline(
  points: StrokePoint[],
  options: Partial<typeof DEFAULT_STROKE_OPTIONS> = {},
): number[][] {
  const strokeOptions = { ...DEFAULT_STROKE_OPTIONS, ...options };
  return getStroke(points, strokeOptions);
}

/**
 * Convert stroke outline points to SVG path string
 */
export function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return "";

  const [startX, startY] = points[0] as StrokePoint;

  const d = points.reduce(
    (acc, point, i, arr) => {
      const [x0, y0] = point as StrokePoint;
      const [x1, y1] = arr[(i + 1) % arr.length] as StrokePoint;
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", startX, startY, "Q"],
  );

  d.push("Z");
  return d.join(" ");
}

/**
 * Convert raw pointer points to a DrawingStroke object
 */
export function pointsToStroke(
  points: StrokePoint[],
  color: string,
  size: number,
  options: PointsToStrokeOptions = {},
): DrawingStroke {
  return {
    id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    points,
    color,
    size,
    timestamp: Date.now(),
    author: options.author,
    visible: true,
    zIndex: 0,
    tool: options.tool,
  };
}

/**
 * Check if a point is near a stroke (for eraser hit detection)
 */
export function isPointNearStroke(
  point: [number, number],
  stroke: DrawingStroke,
  threshold: number = 10,
): boolean {
  const [px, py] = point;

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const [x1, y1] = stroke.points[i];
    const [x2, y2] = stroke.points[i + 1];

    // Calculate distance from point to line segment
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Convert pointer event to flow coordinates without double-offsetting
 */
export function pointerEventToFlowPosition(
  evt: PointerEvent | MouseEvent,
  rf: any,
): [number, number] {
  if (rf?.screenToFlowPosition) {
    try {
      const pos = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      return [pos.x, pos.y];
    } catch {
      // fallthrough to returning raw coordinates when conversion fails
    }
  }

  return [evt.clientX, evt.clientY];
}

/**
 * Convert screen coordinates to flow coordinates
 */
export function screenToFlowPosition(
  screenX: number,
  screenY: number,
  reactFlowInstance: any,
): [number, number] {
  if (!reactFlowInstance) {
    return [screenX, screenY];
  }

  try {
    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: screenX,
      y: screenY,
    });
    return [flowPosition.x, flowPosition.y];
  } catch {
    return [screenX, screenY];
  }
}

/**
 * Convert flow coordinates to screen coordinates
 */
export function flowToScreenPosition(
  flowX: number,
  flowY: number,
  reactFlowInstance: any,
): [number, number] {
  if (!reactFlowInstance) {
    return [flowX, flowY];
  }

  try {
    const screenPosition = reactFlowInstance.flowToScreenPosition({
      x: flowX,
      y: flowY,
    });
    return [screenPosition.x, screenPosition.y];
  } catch {
    return [flowX, flowY];
  }
}

type StrokeSegmentIndexItem = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  strokeId: string;
};

type StrokeSegmentIndex = any;

/**
 * Build an RBush spatial index for stroke segments to accelerate eraser hit-tests.
 */
export function buildStrokeSegmentIndex(
  strokes: DrawingStroke[],
  padding: number = 0,
): StrokeSegmentIndex | null {
  if (!strokes.length) return null;

  let RBushModule: any;
  try {
    RBushModule = require("rbush");
  } catch {
    return null;
  }

  const tree = new RBushModule();
  const items: StrokeSegmentIndexItem[] = [];

  strokes.forEach((stroke) => {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const [x1, y1] = stroke.points[i] as StrokePoint;
      const [x2, y2] = stroke.points[i + 1] as StrokePoint;

      const minX = Math.min(x1, x2) - padding;
      const minY = Math.min(y1, y2) - padding;
      const maxX = Math.max(x1, x2) + padding;
      const maxY = Math.max(y1, y2) + padding;

      items.push({
        minX,
        minY,
        maxX,
        maxY,
        strokeId: stroke.id,
      });
    }
  });

  if (!items.length) return null;
  tree.load(items);
  return tree;
}

/**
 * Query the stroke segment index around a point and return candidate stroke IDs.
 */
export function queryStrokeSegmentIndex(
  index: StrokeSegmentIndex | null,
  x: number,
  y: number,
  radius: number = 0,
): string[] {
  if (!index) return [];

  const hits = index.search({
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius,
  }) as StrokeSegmentIndexItem[];

  const unique = new Set<string>();
  hits.forEach((item) => {
    if (item.strokeId) unique.add(item.strokeId);
  });

  return Array.from(unique);
}

/**
 * Serialize strokes to JSON for export
 */
export function serializeStrokes(strokes: DrawingStroke[]): string {
  try {
    return JSON.stringify(strokes || []);
  } catch {
    return "[]";
  }
}

/**
 * Parse strokes from JSON for import
 */
export function deserializeStrokes(json: string): DrawingStroke[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate each stroke has required fields
    return parsed.filter(
      (stroke: any) =>
        stroke &&
        typeof stroke.id === "string" &&
        Array.isArray(stroke.points) &&
        typeof stroke.color === "string" &&
        typeof stroke.size === "number" &&
        typeof stroke.timestamp === "number",
    );
  } catch {
    return [];
  }
}
