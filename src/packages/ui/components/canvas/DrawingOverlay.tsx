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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { thinning, smoothing, streamline } = settings;
  
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoveredStrokeId, setHoveredStrokeId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isStraightLineMode, setIsStraightLineMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  
  const currentPointsRef = useRef<StrokePoint[]>([]);
  const pendingPointsRef = useRef<StrokePoint[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const previousStrokeCountRef = useRef(strokes.length);

  const appendPoints = useCallback((pointsToAdd: StrokePoint[]) => {
    if (!pointsToAdd.length) return;
    currentPointsRef.current.push(...pointsToAdd);
    setCurrentPoints((prev) => [...prev, ...pointsToAdd]);
  }, []);

  const isPalmContact = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    return (
      event.pointerType === 'touch' &&
      event.width > 40 &&
      event.height > 40 &&
      event.pressure === 0
    );
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
      setCursorPosition(null);
      setIsStraightLineMode(false);
    }
  }, [enabled, currentTool, resetStrokeState]);

  useEffect(() => {
    if (!currentTool) return;
    const label = currentTool === 'highlighter' ? 'highlighter' : currentTool;
    setAnnouncement(`Drawing tool set to ${label}`);
  }, [currentTool]);

  useEffect(() => {
    if (strokes.length !== previousStrokeCountRef.current) {
      if (strokes.length > previousStrokeCountRef.current) {
        setAnnouncement(`Stroke added. Total strokes ${strokes.length}`);
      }
      previousStrokeCountRef.current = strokes.length;
    }
  }, [strokes.length]);

  // Pointer down handler - start drawing
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled || !currentTool || currentTool === "eraser") {
        return;
      }

      if (event.pointerType === "touch" && !event.isPrimary) {
        return;
      }

      if (isPalmContact(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (svgRef.current) {
        svgRef.current.setPointerCapture(event.pointerId);
      }

      cancelScheduledFlush();
      pendingPointsRef.current = [];

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCursorPosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }

      const [flowX, flowY] = pointerEventToFlowPosition(
        event.nativeEvent,
        reactFlowInstance,
      );
      const pressure = event.pressure || DEFAULT_PRESSURE;
      const initialPoint: StrokePoint = [flowX, flowY, pressure];

      currentPointsRef.current = [initialPoint];
      setCurrentPoints([initialPoint]);
      setIsDrawing(true);
      setHoveredStrokeId(null);
      setIsStraightLineMode(event.shiftKey);
    },
    [
      enabled,
      currentTool,
      reactFlowInstance,
      cancelScheduledFlush,
      isPalmContact,
    ],
  );

  // Pointer move handler - add points to current stroke
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) {
        return;
      }

      if (isPalmContact(event)) {
        return;
      }

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCursorPosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }

      let [flowX, flowY] = pointerEventToFlowPosition(
        event.nativeEvent,
        reactFlowInstance,
      );
      const pressure = event.pressure || DEFAULT_PRESSURE;

      if (isDrawing && currentTool && currentTool !== "eraser") {
        if (event.shiftKey && currentPointsRef.current.length > 0) {
          const [anchorX, anchorY] = currentPointsRef.current[0];
          if (Math.abs(flowX - anchorX) > Math.abs(flowY - anchorY)) {
            flowY = anchorY;
          } else {
            flowX = anchorX;
          }
          if (!isStraightLineMode) {
            setIsStraightLineMode(true);
          }
        } else if (isStraightLineMode) {
          setIsStraightLineMode(false);
        }

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
      } else {
        setIsStraightLineMode(false);
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
      isPalmContact,
      isStraightLineMode,
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

      setCursorPosition(null);
      setIsStraightLineMode(false);

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

  const handlePointerLeave = useCallback(() => {
    setCursorPosition(null);
    setIsStraightLineMode(false);
  }, []);

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
        thinning,
        smoothing,
        streamline,
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
  }, [strokes, thinning, smoothing, streamline]);

  // Current stroke preview
  const currentStrokePath = useMemo(() => {
    if (!isDrawing || currentPoints.length < 2) {
      return null;
    }

    const outline = getStrokeOutline(currentPoints as StrokePoint[], {
      size,
      thinning,
      smoothing,
      streamline,
    });
    const pathData = getSvgPathFromStroke(outline);
    const baseColor = stripAlphaFromColor(color);
    const previewOpacity =
      currentTool === "highlighter" ? HIGHLIGHTER_OPACITY : 1;

    return { pathData, color: baseColor, opacity: previewOpacity };
  }, [isDrawing, currentPoints, size, thinning, smoothing, streamline, currentTool, color]);

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

  const cursorDiameter = currentTool === "eraser" ? size * 1.4 : size;

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement || `Drawing mode active. Current tool: ${currentTool || 'none'}. ${strokes.length} strokes on canvas.`}
      </span>
      <div 
        ref={containerRef} 
        className={cx(
          "relative h-full w-full",
          currentTool === "pen" && "cursor-crosshair",
          currentTool === "eraser" && "cursor-pointer",
          currentTool === "highlighter" && "cursor-crosshair",
          className
        )}
      >
        {enabled && currentTool && strokes.length === 0 && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-sm text-blue-700 animate-pulse">
              Click and drag to start drawing
            </div>
          </div>
        )}
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
          aria-label="Drawing overlay"
        >
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

          {currentStrokePath ? (
            <path
              d={currentStrokePath.pathData}
              fill={currentStrokePath.color}
              fillOpacity={currentStrokePath.opacity}
              className={cx(
                "opacity-85",
                isStraightLineMode ? "shadow-[0_0_0_2px_rgba(59,130,246,0.35)]" : undefined,
              )}
              style={{ pointerEvents: "none" }}
            />
          ) : null}
        </svg>

        {cursorPosition && currentTool && (
          <div
            className={cx(
              "pointer-events-none absolute rounded-full border-2 transition-transform duration-75",
              currentTool === "pen" && "border-blue-500/60",
              currentTool === "eraser" && "border-red-500/60 bg-red-100/20",
              currentTool === "highlighter" && "border-yellow-500/60",
              isStraightLineMode
                ? "shadow-[0_0_0_2px_rgba(59,130,246,0.35)]"
                : "shadow-[0_0_0_1px_rgba(59,130,246,0.25)]",
            )}
            style={{
              width: cursorDiameter,
              height: cursorDiameter,
              transform: `translate(${cursorPosition.x - cursorDiameter / 2}px, ${cursorPosition.y - cursorDiameter / 2}px)`,
            }}
          />
        )}
      </div>
    </>
  );
};

export const DrawingOverlay = memo(DrawingOverlayComponent);
