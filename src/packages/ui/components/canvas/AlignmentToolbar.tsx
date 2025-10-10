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
        label="Align left edges of selected components"
        onClick={() => handleAlign("left")}
        tooltip="Align left edges of selected components"
        shortcut="Ctrl+Shift+ArrowLeft"
      />
      <AlignButton
        icon={AlignHorizontalCenter}
        label="Center selected components horizontally"
        onClick={() => handleAlign("center-h")}
        tooltip="Center selected components horizontally"
      />
      <AlignButton
        icon={AlignHorizontalRight}
        label="Align right edges of selected components"
        onClick={() => handleAlign("right")}
        tooltip="Align right edges of selected components"
        shortcut="Ctrl+Shift+ArrowRight"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Vertical Alignment */}
      <AlignButton
        icon={AlignVerticalTop}
        label="Align top edges of selected components"
        onClick={() => handleAlign("top")}
        tooltip="Align top edges of selected components"
        shortcut="Ctrl+Shift+ArrowUp"
      />
      <AlignButton
        icon={AlignVerticalCenter}
        label="Center selected components vertically"
        onClick={() => handleAlign("center-v")}
        tooltip="Center selected components vertically"
      />
      <AlignButton
        icon={AlignVerticalBottom}
        label="Align bottom edges of selected components"
        onClick={() => handleAlign("bottom")}
        tooltip="Align bottom edges of selected components"
        shortcut="Ctrl+Shift+ArrowDown"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Distribution - Always rendered but disabled when less than 3 components */}
      <AlignButton
        icon={AlignHorizontalSpaceAround}
        label="Distribute selected components horizontally with equal spacing (requires 3+ components)"
        onClick={() => handleDistribute("horizontal")}
        tooltip={
          canDistribute
            ? "Distribute selected components horizontally with equal spacing"
            : "Select 3 or more components to distribute"
        }
        disabled={!canDistribute}
      />
      <AlignButton
        icon={AlignVerticalSpaceAround}
        label="Distribute selected components vertically with equal spacing (requires 3+ components)"
        onClick={() => handleDistribute("vertical")}
        tooltip={
          canDistribute
            ? "Distribute selected components vertically with equal spacing"
            : "Select 3 or more components to distribute"
        }
        disabled={!canDistribute}
      />
    </div>
  );
});

AlignmentToolbar.displayName = "AlignmentToolbar";

interface AlignButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tooltip: string;
  shortcut?: string;
  disabled?: boolean;
}

function AlignButton({
  icon: Icon,
  label,
  onClick,
  tooltip,
  shortcut,
  disabled = false,
}: AlignButtonProps) {
  const tooltipText = shortcut ? `${tooltip} (Shortcut: ${shortcut})` : tooltip;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={cx(
        "group relative flex items-center justify-center",
        "w-8 h-8 rounded-md border-2 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-60"
          : "bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",
      )}
      type="button"
      aria-label={label}
      aria-disabled={disabled ? "true" : undefined}
      disabled={disabled}
      title={tooltipText}
    >
      <Icon className="w-4 h-4 text-gray-700" aria-hidden="true" />

      {/* Tooltip */}
      <div
        className={cx(
          "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
          "px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "pointer-events-none z-50",
        )}
      >
        {tooltipText}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </div>
    </button>
  );
}
