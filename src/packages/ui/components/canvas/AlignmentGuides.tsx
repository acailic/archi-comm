/**
 * src/packages/ui/components/canvas/AlignmentGuides.tsx
 * Smart alignment guides that appear when dragging components
 * Shows blue guide lines with fade animation when components align
 *
 * COORDINATE SYSTEM: Guide positions are stored in world coordinates in the store.
 * This component transforms them to screen coordinates using viewport zoom/pan for rendering.
 * The transformation formula: screenPos = worldPos * zoom + viewportOffset
 *
 * RELEVANT FILES: src/stores/canvasStore.ts, src/shared/contracts/index.ts
 */

import { memo, useMemo } from "react";

import { cx, overlayZIndex } from "@/lib/design/design-system";
import type { AlignmentGuide } from "@/shared/contracts";
import { useCanvasStore } from "@/stores/canvasStore";

interface AlignmentGuidesProps {
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const AlignmentGuides = memo<AlignmentGuidesProps>(({ viewport }) => {
  const showGuides = useCanvasStore((state) => state.showAlignmentGuides);
  const guides = useCanvasStore((state) => state.alignmentGuides);
  const visibleGuides = useMemo(
    () => guides.filter((guide) => guide.visible),
    [guides],
  );

  if (!showGuides || visibleGuides.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: overlayZIndex.guides }}
    >
      {visibleGuides.map((guide) => (
        <Guide key={guide.id} guide={guide} viewport={viewport} />
      ))}
    </div>
  );
});

AlignmentGuides.displayName = "AlignmentGuides";

interface GuideProps {
  guide: AlignmentGuide;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

const Guide = memo<GuideProps>(({ guide, viewport }) => {
  const isHorizontal = guide.type === "horizontal";
  const componentCount = guide.componentIds.length;
  const delta = guide.delta ?? null;
  const isStrongSnap = delta !== null ? delta <= 1 : false;
  const labelText = useMemo(() => {
    const prefix = isHorizontal ? "H-aligned" : "V-aligned";
    const countLabel = componentCount > 1 ? ` (${componentCount})` : "";
    const deltaLabel =
      delta !== null ? ` • Δ${Math.round(delta * 10) / 10}px` : "";
    return `${prefix}${countLabel}${deltaLabel}`;
  }, [componentCount, delta, isHorizontal]);

  const style = useMemo(
    () => ({
      [isHorizontal ? "top" : "left"]: `${
        guide.position * viewport.zoom +
        (isHorizontal ? viewport.y : viewport.x)
      }px`,
    }),
    [guide.position, viewport.x, viewport.y, viewport.zoom, isHorizontal],
  );

  const labelStyle = useMemo(
    () => ({
      transform: `translate(-50%, -50%) scale(${1 / Math.max(viewport.zoom, 0.1)})`,
    }),
    [viewport.zoom],
  );

  return (
    <div
      className={cx(
        "absolute",
        "animate-in fade-in duration-150",
        isHorizontal ? "h-px left-0 right-0" : "w-px top-0 bottom-0",
        isStrongSnap ? "bg-blue-500" : "bg-blue-400/80",
        "shadow-[0_0_6px_rgba(59,130,246,0.35)]",
      )}
      style={style}
      role="presentation"
    >
      <div
        className={cx(
          "absolute px-1.5 py-0.5 rounded text-[10px] font-medium",
          "bg-blue-500 text-white whitespace-nowrap flex items-center gap-1",
          isHorizontal ? "left-2 -top-4" : "top-2 -left-16",
          "backdrop-blur-sm",
        )}
        style={labelStyle}
      >
        <span>{labelText}</span>
        <span
          className={cx(
            "inline-flex h-2 w-2 rounded-full",
            isStrongSnap ? "bg-emerald-300" : "bg-blue-200",
          )}
          aria-hidden="true"
        />
        <span className="sr-only">
          {componentCount} components aligned. Offset {delta ?? 0} pixels.
        </span>
      </div>
    </div>
  );
});

Guide.displayName = "Guide";
