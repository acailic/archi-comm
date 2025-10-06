/**
 * src/packages/ui/components/canvas/AlignmentGuides.tsx
 * Smart alignment guides that appear when dragging components
 * Shows blue guide lines with fade animation when components align
 * RELEVANT FILES: src/stores/canvasStore.ts, src/shared/contracts/index.ts
 */

import { memo, useMemo } from "react";

import { cx } from "@/lib/design/design-system";
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
    <div className="absolute inset-0 pointer-events-none z-[60]">
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
  const style = useMemo(
    () => ({
      [isHorizontal ? "top" : "left"]: `${
        guide.position * viewport.zoom +
        (isHorizontal ? viewport.y : viewport.x)
      }px`,
    }),
    [guide.position, viewport.x, viewport.y, viewport.zoom, isHorizontal],
  );

  return (
    <div
      className={cx(
        "absolute",
        "bg-blue-500",
        "animate-in fade-in duration-150",
        isHorizontal ? "h-px left-0 right-0" : "w-px top-0 bottom-0",
      )}
      style={style}
    >
      {/* Guide label */}
      <div
        className={cx(
          "absolute px-1.5 py-0.5 rounded text-[10px] font-medium",
          "bg-blue-500 text-white whitespace-nowrap",
          isHorizontal ? "left-2 -top-4" : "top-2 -left-12",
        )}
      >
        Aligned
      </div>
    </div>
  );
});

Guide.displayName = "Guide";
