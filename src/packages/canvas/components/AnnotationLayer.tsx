// src/packages/canvas/components/AnnotationLayer.tsx
// Renders persisted annotations on top of the React Flow canvas.

import React, { useMemo } from "react";
import type { Annotation } from "@/shared/contracts";
import { cn } from "@/packages/ui/components/ui/utils";
import { sanitizeHtmlContent } from "@/lib/canvas/CanvasAnnotations";

const DEFAULT_COLORS: Record<
  Annotation["type"],
  { background: string; border: string; text: string }
> = {
  comment: { background: "rgba(254, 243, 199, 0.95)", border: "rgba(245, 158, 11, 0.65)", text: "#92400e" },
  note: { background: "rgba(219, 234, 254, 0.95)", border: "rgba(59, 130, 246, 0.55)", text: "#1d4ed8" },
  label: { background: "rgba(220, 252, 231, 0.95)", border: "rgba(34, 197, 94, 0.55)", text: "#166534" },
  arrow: { background: "transparent", border: "rgba(239, 68, 68, 0.7)", text: "#ef4444" },
  highlight: { background: "rgba(254, 240, 138, 0.35)", border: "rgba(234, 179, 8, 0.25)", text: "#92400e" },
};

const MIN_DIMENSION = 32;

export interface AnnotationLayerProps {
  annotations: Annotation[];
  viewport: { x: number; y: number; zoom: number };
  selectedAnnotationId?: string | null;
  highlightedAnnotationId?: string | null;
  onSelect?: (annotationId: string) => void;
}

const renderArrow = (
  id: string,
  width: number,
  height: number,
  stroke: string,
  fill: string,
) => {
  const arrowWidth = Math.max(width, MIN_DIMENSION);
  const arrowHeight = Math.max(height, MIN_DIMENSION);
  return (
    <svg
      key={`arrow-${id}`}
      className="h-full w-full"
      viewBox={`0 0 ${arrowWidth} ${arrowHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="8"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L0,8 L8,4 z" fill={stroke} />
        </marker>
      </defs>
      <line
        x1={8}
        y1={arrowHeight - 8}
        x2={arrowWidth - 8}
        y2={8}
        stroke={stroke}
        strokeWidth={Math.max(2, Math.min(6, arrowWidth * 0.05))}
        strokeLinecap="round"
        markerEnd={`url(#arrowhead-${id})`}
      />
      <circle cx={8} cy={arrowHeight - 8} r={6} fill={stroke} opacity={0.6} />
      <circle
        cx={arrowWidth - 8}
        cy={8}
        r={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
    </svg>
  );
};

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  viewport,
  selectedAnnotationId,
  highlightedAnnotationId,
  onSelect,
}) => {
  const visibleAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.visible !== false),
    [annotations],
  );

  if (visibleAnnotations.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[35]">
      {visibleAnnotations.map((annotation) => {
        const zoom = viewport.zoom || 1;
        const baseColors = DEFAULT_COLORS[annotation.type];

        const background = (annotation.style?.backgroundColor as string) ?? baseColors.background;
        const borderColor = (annotation.style?.borderColor as string) ?? baseColors.border;
        const textColor = (annotation.style?.textColor as string) ?? baseColors.text;

        const width = Math.max((annotation.width ?? 0) * zoom, MIN_DIMENSION);
        const height = Math.max((annotation.height ?? 0) * zoom, MIN_DIMENSION);

        const left = annotation.x * zoom + viewport.x;
        const top = annotation.y * zoom + viewport.y;

        const isSelected = selectedAnnotationId === annotation.id;
        const isHighlighted = highlightedAnnotationId === annotation.id;

        const sanitizedContent = sanitizeHtmlContent(annotation.content ?? "")
          .replace(/<[^>]+>/g, " ")
          .trim();

        return (
          <div
            key={annotation.id}
            className={cn(
              "absolute rounded-xl border shadow-sm transition-all duration-200",
              "pointer-events-auto select-none backdrop-blur-[1px]",
              annotation.type !== "arrow" && "px-3 py-2",
              isSelected && "ring-2 ring-offset-2 ring-offset-white ring-blue-500",
              !isSelected && isHighlighted && "ring-2 ring-amber-400/80",
            )}
            style={{
              left,
              top,
              width,
              height,
              backgroundColor: background,
              borderColor,
              borderWidth: Math.max(1, Number(annotation.style?.borderWidth) || 1),
              borderStyle: (annotation.style?.borderStyle as React.CSSProperties["borderStyle"]) ?? "solid",
              color: textColor,
              opacity: annotation.type === "highlight" ? 0.8 : 1,
              transformOrigin: "top left",
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(annotation.id);
            }}
          >
            {annotation.type === "arrow" ? (
              renderArrow(annotation.id, width, height, borderColor, background || "#ffffff")
            ) : (
              <div className="flex h-full w-full flex-col justify-between gap-1 overflow-hidden text-xs leading-relaxed">
                <div className="line-clamp-4 whitespace-pre-wrap text-sm">
                  {sanitizedContent || (annotation.type === "label" ? "Label" : "Add details")}
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
                  <span>{annotation.author ?? "You"}</span>
                  <span>{new Date(annotation.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

AnnotationLayer.displayName = "AnnotationLayer";
