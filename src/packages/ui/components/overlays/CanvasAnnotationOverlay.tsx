// src/packages/ui/components/overlays/CanvasAnnotationOverlay.tsx
// Simplified annotation input overlay. Converts pointer events into canvas annotations
// and forwards them to the parent for persistence. Rendering of annotations happens in
// AnnotationLayer.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Annotation, AnnotationType } from "@/shared/contracts";
import { newAnnotationId } from "@/lib/utils/id";

export interface CanvasAnnotationOverlayProps {
  annotations: Annotation[];
  selectedTool: AnnotationType | null;
  isActive: boolean;
  viewportZoom: number;
  projectPointer: (event: React.MouseEvent<HTMLDivElement>) => { x: number; y: number } | null;
  onAnnotationCreate?: (annotation: Annotation) => void;
  onAnnotationSelect?: (annotationId: string | null) => void;
}

const TOOL_LABEL: Record<AnnotationType, string> = {
  comment: "Comment",
  note: "Note",
  label: "Label",
  arrow: "Arrow",
  highlight: "Highlight",
};

const POINTER_SIZE: Record<AnnotationType, number> = {
  comment: 44,
  note: 48,
  label: 32,
  arrow: 54,
  highlight: 88,
};

const DEFAULT_DIMENSIONS: Record<AnnotationType, { width: number; height: number }> = {
  comment: { width: 240, height: 140 },
  note: { width: 220, height: 120 },
  label: { width: 160, height: 48 },
  arrow: { width: 160, height: 40 },
  highlight: { width: 260, height: 160 },
};

const STYLE_PRESETS: Record<AnnotationType, Record<string, unknown>> = {
  comment: { backgroundColor: "#fef3c7", borderColor: "#f59e0b" },
  note: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  label: { backgroundColor: "#dcfce7", borderColor: "#22c55e" },
  arrow: { borderColor: "#ef4444", borderWidth: 2, backgroundColor: "transparent" },
  highlight: { backgroundColor: "#fef08a", opacity: 0.5 },
};

const HIT_PADDING = 12;

export const CanvasAnnotationOverlay: React.FC<CanvasAnnotationOverlayProps> = ({
  annotations,
  selectedTool,
  isActive,
  viewportZoom,
  projectPointer,
  onAnnotationCreate,
  onAnnotationSelect,
}) => {
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      setPointerPosition(null);
      setHoveredAnnotationId(null);
    }
  }, [isActive]);

  const pointerPreviewSize = useMemo(() => {
    if (!selectedTool) return 40;
    return POINTER_SIZE[selectedTool] ?? 40;
  }, [selectedTool]);

  const hitTestAnnotation = useCallback(
    (x: number, y: number): Annotation | undefined => {
      const padding = HIT_PADDING / Math.max(viewportZoom, 0.01);
      return annotations.find((annotation) => {
        const width = annotation.width ?? DEFAULT_DIMENSIONS[annotation.type].width;
        const height = annotation.height ?? DEFAULT_DIMENSIONS[annotation.type].height;
        const left = annotation.x - padding;
        const right = annotation.x + width + padding;
        const top = annotation.y - padding;
        const bottom = annotation.y + height + padding;
        return x >= left && x <= right && y >= top && y <= bottom;
      });
    },
    [annotations, viewportZoom],
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isActive || !selectedTool) {
        return;
      }

      const flowPoint = projectPointer(event);
      if (!flowPoint) {
        return;
      }

      // First check for selection on existing annotations
      const existing = hitTestAnnotation(flowPoint.x, flowPoint.y);
      if (existing) {
        onAnnotationSelect?.(existing.id);
        return;
      }

      if (!onAnnotationCreate) {
        return;
      }

      const { width, height } = DEFAULT_DIMENSIONS[selectedTool] ?? DEFAULT_DIMENSIONS.comment;
      const style = STYLE_PRESETS[selectedTool] ?? {};

      const annotation: Annotation = {
        id: newAnnotationId(),
        type: selectedTool,
        content:
          selectedTool === "label"
            ? "Label"
            : selectedTool === "comment"
            ? "New comment"
            : selectedTool === "note"
            ? "New note"
            : "",
        x: flowPoint.x,
        y: flowPoint.y,
        width,
        height,
        timestamp: Date.now(),
        author: "You",
        resolved: false,
        visible: true,
        style,
      };

      onAnnotationCreate(annotation);
      onAnnotationSelect?.(annotation.id);
    },
    [isActive, selectedTool, projectPointer, hitTestAnnotation, onAnnotationCreate, onAnnotationSelect],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isActive) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      setPointerPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      const flowPoint = projectPointer(event);
      if (!flowPoint) {
        setHoveredAnnotationId(null);
        return;
      }

      const hit = hitTestAnnotation(flowPoint.x, flowPoint.y);
      setHoveredAnnotationId(hit?.id ?? null);
    },
    [isActive, projectPointer, hitTestAnnotation],
  );

  const handleMouseLeave = useCallback(() => {
    setPointerPosition(null);
    setHoveredAnnotationId(null);
  }, []);

  if (!isActive || !selectedTool) {
    return null;
  }

  const cursor = hoveredAnnotationId
    ? "pointer"
    : selectedTool === "arrow"
    ? "crosshair"
    : selectedTool === "highlight"
    ? "cell"
    : "copy";

  return (
    <div
      data-testid="annotation-overlay"
      className="absolute inset-0 z-[40]"
      style={{ cursor }}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {pointerPosition && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-blue-500/70 bg-blue-500/10 shadow-md transition-transform duration-150"
          style={{
            left: pointerPosition.x - pointerPreviewSize / 2,
            top: pointerPosition.y - pointerPreviewSize / 2,
            width: pointerPreviewSize,
            height: pointerPreviewSize,
          }}
        />
      )}

      {hoveredAnnotationId && pointerPosition && (
        <div
          className="pointer-events-none absolute rounded-lg border border-blue-500/60 bg-blue-500/10 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] transition-opacity duration-150"
          style={{
            left: pointerPosition.x - 30,
            top: pointerPosition.y - 30,
            width: 60,
            height: 60,
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
        <div className="flex items-center gap-3 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
          <span>Annotation mode</span>
          <span className="hidden sm:inline">
            Click to place {TOOL_LABEL[selectedTool] ?? "annotation"}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              Esc
            </kbd>
            exit
          </span>
        </div>
      </div>
    </div>
  );
};

CanvasAnnotationOverlay.displayName = "CanvasAnnotationOverlay";
