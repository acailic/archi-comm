/**
 * File: src/packages/ui/components/canvas/DrawingOverlay.tsx
 * Purpose: Main drawing overlay component that captures drawing input and renders strokes
 * Why: Provides freehand drawing capability over React Flow canvas with smooth stroke rendering
 * Related: drawing-utils.ts, perfect-freehand library, SimpleCanvas.tsx
 */

import { useReactFlow } from "@xyflow/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildStrokeSegmentIndex,
  getStrokeOutline,
  getSvgPathFromStroke,
  isPointNearStroke,
  pointerEventToFlowPosition,
  pointsToStroke,
  queryStrokeSegmentIndex,
} from "../../../../lib/canvas/drawing-utils";
import { cx } from "../../../../lib/design/design-system";
import type {
  DrawingSettings,
  DrawingStroke,
  DrawingTool,
  StrokePoint,
} from "../../../../shared/contracts";

interface DrawingOverlayProps {
  strokes: DrawingStroke[];
  currentTool: DrawingTool;
  color: string;
  size: number;
  settings: DrawingSettings;
  onStrokeComplete: (stroke: DrawingStroke) => void;
  onStrokeDelete: (strokeId: string) => void;
  enabled: boolean;
  className?: string;
}

const HIGHLIGHTER_OPACITY = 0.5;
const DEFAULT_PRESSURE = 0.5;
const ERASER_INDEX_THRESHOLD = 40;
const COLOR_WITH_ALPHA_REGEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;

const normalizeColorHex = (value: string): { base: string; alpha?: number } => {
  const match = COLOR_WITH_ALPHA_REGEX.exec(value);
  if (!match) {
    return { base: value };
  }

  const [, base, alpha] = match;
  return {
    base: `#${base}`,
    alpha: alpha ? parseInt(alpha, 16) / 255 : undefined,
  };
};

const stripAlphaFromColor = (value: string): string =>
  normalizeColorHex(value).base;

const getStrokeVisualAttributes = (
  stroke: DrawingStroke,
): { color: string; opacity: number } => {
  const { base, alpha } = normalizeColorHex(stroke.color);
  const opacity =
    stroke.tool === "highlighter"
      ? HIGHLIGHTER_OPACITY
      : alpha !== undefined
        ? alpha
        : 1;

  return {
    color: base,
    opacity,
  };
};

/**
 * Drawing overlay component that sits on top of React Flow
 */
const DrawingOverlayComponent: React.FC<DrawingOverlayProps> = ({
  strokes,
  currentTool,
  color,
  size,
  settings,
  onStrokeComplete,
  onStrokeDelete,
  enabled,
  className,
}) => {
  const reactFlowInstance = useReactFlow();
  const svgRef = useRef<SVGSVGElement>(null);

  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoveredStrokeId, setHoveredStrokeId] = useState<string | null>(null);

  const currentPointsRef = useRef<StrokePoint[]>([]);
  const pendingPointsRef = useRef<StrokePoint[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const appendPoints = useCallback((pointsToAdd: StrokePoint[]) => {
    if (!pointsToAdd.length) return;
    currentPointsRef.current = [...currentPointsRef.current, ...pointsToAdd];
    setCurrentPoints((prev) => [...prev, ...pointsToAdd]);
  }, []);

  const cancelScheduledFlush = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const flushPendingPoints = useCallback(() => {
    if (pendingPointsRef.current.length) {
      const batch = pendingPointsRef.current;
      pendingPointsRef.current = [];
      appendPoints(batch);
    }
    cancelScheduledFlush();
  }, [appendPoints, cancelScheduledFlush]);

  const schedulePointAppend = useCallback(
    (point: StrokePoint) => {
      pendingPointsRef.current.push(point);
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          const batch = pendingPointsRef.current;
          pendingPointsRef.current = [];
          rafIdRef.current = null;
          appendPoints(batch);
        });
      }
    },
    [appendPoints],
  );

  const resetStrokeState = useCallback(() => {
    cancelScheduledFlush();
    pendingPointsRef.current = [];
    currentPointsRef.current = [];
    setCurrentPoints([]);
    setIsDrawing(false);
  }, [cancelScheduledFlush]);

  const strokeMap = useMemo(() => {
    const map = new Map<string, DrawingStroke>();
    strokes.forEach((stroke) => {
      map.set(stroke.id, stroke);
    });
    return map;
  }, [strokes]);

  const eraserIndex = useMemo(() => {
    if (strokes.length <= ERASER_INDEX_THRESHOLD) {
      return null;
    }
    return buildStrokeSegmentIndex(strokes, size + 5);
  }, [strokes, size]);

  // Clear drawing state when tool changes or overlay is disabled
  useEffect(() => {
    if (!enabled || !currentTool) {
      resetStrokeState();
      setHoveredStrokeId(null);
    }
  }, [enabled, currentTool, resetStrokeState]);

  // Pointer down handler - start drawing
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled || !currentTool || currentTool === "eraser") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (svgRef.current) {
        svgRef.current.setPointerCapture(event.pointerId);
      }

      cancelScheduledFlush();
      pendingPointsRef.current = [];

      const [flowX, flowY] = pointerEventToFlowPosition(
        event,
        reactFlowInstance,
      );
      const pressure = event.pressure || DEFAULT_PRESSURE;
      const initialPoint: StrokePoint = [flowX, flowY, pressure];

      currentPointsRef.current = [initialPoint];
      setCurrentPoints([initialPoint]);
      setIsDrawing(true);
      setHoveredStrokeId(null);
    },
    [enabled, currentTool, reactFlowInstance, cancelScheduledFlush],
  );

  // Pointer move handler - add points to current stroke
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) {
        return;
      }

      const [flowX, flowY] = pointerEventToFlowPosition(
        event,
        reactFlowInstance,
      );
      const pressure = event.pressure || DEFAULT_PRESSURE;

      if (isDrawing && currentTool && currentTool !== "eraser") {
        schedulePointAppend([flowX, flowY, pressure]);
      } else if (currentTool === "eraser") {
        let hoveredStroke: DrawingStroke | undefined;

        if (eraserIndex) {
          const candidates = queryStrokeSegmentIndex(
            eraserIndex,
            flowX,
            flowY,
            size + 5,
          );

          for (const candidateId of candidates) {
            const candidate = strokeMap.get(candidateId);
            if (
              candidate &&
              isPointNearStroke([flowX, flowY], candidate, size + 5)
            ) {
              hoveredStroke = candidate;
              break;
            }
          }
        } else {
          hoveredStroke = strokes.find((stroke) =>
            isPointNearStroke([flowX, flowY], stroke, size + 5),
          );
        }

        setHoveredStrokeId(hoveredStroke?.id ?? null);
      }
    },
    [
      enabled,
      isDrawing,
      currentTool,
      reactFlowInstance,
      schedulePointAppend,
      eraserIndex,
      strokeMap,
      strokes,
      size,
    ],
  );

  // Pointer up handler - finalize stroke
  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) {
        return;
      }

      if (svgRef.current) {
        svgRef.current.releasePointerCapture(event.pointerId);
      }

      flushPendingPoints();

      if (currentTool === "eraser") {
        if (hoveredStrokeId) {
          onStrokeDelete(hoveredStrokeId);
          setHoveredStrokeId(null);
        }
        resetStrokeState();
        return;
      }

      if (isDrawing && currentTool) {
        const strokePoints = currentPointsRef.current;
        if (strokePoints.length > 1) {
          const baseColor = stripAlphaFromColor(color);
          const stroke = pointsToStroke(strokePoints, baseColor, size, {
            tool: currentTool,
          });
          onStrokeComplete(stroke);
        }
      }

      resetStrokeState();
    },
    [
      enabled,
      currentTool,
      flushPendingPoints,
      hoveredStrokeId,
      isDrawing,
      color,
      size,
      onStrokeComplete,
      onStrokeDelete,
      resetStrokeState,
    ],
  );

  // Pointer cancel handler - cancel drawing
  const handlePointerCancel = useCallback(() => {
    resetStrokeState();
    setHoveredStrokeId(null);
  }, [resetStrokeState]);

  // Handle click on stroke for eraser
  const handleStrokeClick = useCallback(
    (strokeId: string, event: React.MouseEvent) => {
      if (currentTool === "eraser") {
        event.preventDefault();
        event.stopPropagation();
        onStrokeDelete(strokeId);
      }
    },
    [currentTool, onStrokeDelete],
  );

  // Memoized stroke paths for performance
  const strokePaths = useMemo(() => {
    return strokes.map((stroke) => {
      const outline = getStrokeOutline(stroke.points, {
        size: stroke.size,
        thinning: settings.thinning,
        smoothing: settings.smoothing,
        streamline: settings.streamline,
      });
      const pathData = getSvgPathFromStroke(outline);
      const visuals = getStrokeVisualAttributes(stroke);
      return {
        id: stroke.id,
        pathData,
        fillColor: visuals.color,
        fillOpacity: visuals.opacity,
      };
    });
  }, [strokes, settings]);

  // Current stroke preview
  const currentStrokePath = useMemo(() => {
    if (!isDrawing || currentPoints.length < 2) {
      return null;
    }

    const outline = getStrokeOutline(currentPoints as StrokePoint[], {
      size,
      thinning: settings.thinning,
      smoothing: settings.smoothing,
      streamline: settings.streamline,
    });
    const pathData = getSvgPathFromStroke(outline);
    const baseColor = stripAlphaFromColor(color);
    const previewOpacity =
      currentTool === "highlighter" ? HIGHLIGHTER_OPACITY : 1;

    return { pathData, color: baseColor, opacity: previewOpacity };
  }, [isDrawing, currentPoints, size, settings, currentTool, color]);

  // Handle escape key to cancel drawing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (isDrawing || currentTool)) {
        handlePointerCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, currentTool, handlePointerCancel]);

  useEffect(() => {
    return () => {
      resetStrokeState();
    };
  }, [resetStrokeState]);

  // Don't render if not enabled or no tool selected
  if (!enabled || !currentTool) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      className={cx(
        "absolute inset-0 w-full h-full pointer-events-auto",
        currentTool === "eraser" ? "cursor-crosshair" : "cursor-crosshair",
        className,
      )}
      style={{ zIndex: 10 }} // Above React Flow but below UI controls
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label="Drawing overlay"
    >
      {/* Render saved strokes */}
      {strokePaths.map((stroke) => (
        <path
          key={stroke.id}
          d={stroke.pathData}
          fill={stroke.fillColor}
          fillOpacity={stroke.fillOpacity}
          className={cx(
            "transition-opacity duration-200",
            hoveredStrokeId === stroke.id && currentTool === "eraser"
              ? "opacity-50"
              : "opacity-100",
          )}
          style={{
            pointerEvents: currentTool === "eraser" ? "auto" : "none",
          }}
          onClick={(event) => handleStrokeClick(stroke.id, event)}
        />
      ))}

      {/* Render current stroke preview */}
      {currentStrokePath && (
        <path
          d={currentStrokePath.pathData}
          fill={currentStrokePath.color}
          fillOpacity={currentStrokePath.opacity}
          className="opacity-80"
          style={{ pointerEvents: "none" }}
        />
      )}
    </svg>
  );
};

export const DrawingOverlay = memo(DrawingOverlayComponent);
