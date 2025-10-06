/**
 * src/packages/ui/components/canvas/AlignmentToolbar.tsx
 * Provides alignment and distribution tools for selected components
 * Appears when 2+ components are selected to enable bulk alignment operations
 * RELEVANT FILES: src/stores/canvasStore.ts, src/packages/ui/components/canvas/CanvasToolbar.tsx
 */

import {
  AlignHorizontalCenter,
  AlignHorizontalLeft,
  AlignHorizontalRight,
  AlignHorizontalSpaceAround,
  AlignVerticalBottom,
  AlignVerticalCenter,
  AlignVerticalSpaceAround,
  AlignVerticalTop,
} from "lucide-react";
import { memo, useCallback } from "react";
import type { CSSProperties } from "react";

import { cx } from "@/lib/design/design-system";
import { useSelectedComponentIds, useCanvasActions } from "@/stores/canvasStore";

interface AlignmentToolbarProps {
  className?: string;
  style?: CSSProperties;
}

export const AlignmentToolbar = memo<AlignmentToolbarProps>(({ className, style }) => {
  const selectedIds = useSelectedComponentIds();
  const actions = useCanvasActions();
  const hasSelection = selectedIds.length >= 2;
  const canDistribute = selectedIds.length >= 3;

  const handleAlign = useCallback(
    (
      alignment: "left" | "right" | "top" | "bottom" | "center-h" | "center-v",
    ) => {
      if (!hasSelection) return;
      actions.alignComponents(selectedIds, alignment);
    },
    [selectedIds, hasSelection, actions],
  );

  const handleDistribute = useCallback(
    (direction: "horizontal" | "vertical") => {
      if (!canDistribute) return;
      actions.distributeComponents(selectedIds, direction);
    },
    [selectedIds, canDistribute, actions],
  );

  if (!hasSelection) return null;

  return (
    <div
      className={cx(
        "flex items-center gap-1 px-2 py-1 bg-white border-2 border-gray-900 rounded-lg shadow-lg",
        className,
      )}
      style={style}
    >
      <span className="text-xs font-medium text-gray-600 mr-2">Align:</span>

      {/* Horizontal Alignment */}
      <AlignButton
        icon={AlignHorizontalLeft}
        label="Align Left"
        onClick={() => handleAlign("left")}
        tooltip="Align selected components to the left"
      />
      <AlignButton
        icon={AlignHorizontalCenter}
        label="Align Center H"
        onClick={() => handleAlign("center-h")}
        tooltip="Align selected components horizontally to center"
      />
      <AlignButton
        icon={AlignHorizontalRight}
        label="Align Right"
        onClick={() => handleAlign("right")}
        tooltip="Align selected components to the right"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Vertical Alignment */}
      <AlignButton
        icon={AlignVerticalTop}
        label="Align Top"
        onClick={() => handleAlign("top")}
        tooltip="Align selected components to the top"
      />
      <AlignButton
        icon={AlignVerticalCenter}
        label="Align Center V"
        onClick={() => handleAlign("center-v")}
        tooltip="Align selected components vertically to center"
      />
      <AlignButton
        icon={AlignVerticalBottom}
        label="Align Bottom"
        onClick={() => handleAlign("bottom")}
        tooltip="Align selected components to the bottom"
      />

      {canDistribute ? (
        <>
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Distribution */}
          <AlignButton
            icon={AlignHorizontalSpaceAround}
            label="Distribute H"
            onClick={() => handleDistribute("horizontal")}
            tooltip="Distribute selected components horizontally"
          />
          <AlignButton
            icon={AlignVerticalSpaceAround}
            label="Distribute V"
            onClick={() => handleDistribute("vertical")}
            tooltip="Distribute selected components vertically"
          />
        </>
      ) : null}
    </div>
  );
});

AlignmentToolbar.displayName = "AlignmentToolbar";

interface AlignButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tooltip: string;
}

function AlignButton({
  icon: Icon,
  label,
  onClick,
  tooltip,
}: AlignButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "group relative flex items-center justify-center",
        "w-8 h-8 rounded-md",
        "bg-white border-2 border-gray-300",
        "hover:bg-gray-50 hover:border-gray-400",
        "active:bg-gray-100",
        "transition-all duration-200",
      )}
      aria-label={label}
      title={tooltip}
    >
      <Icon className="w-4 h-4 text-gray-700" />

      {/* Tooltip */}
      <div
        className={cx(
          "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
          "px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "pointer-events-none z-50",
        )}
      >
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </div>
    </button>
  );
}
