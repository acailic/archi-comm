/**
 * src/packages/ui/components/canvas/SelectionBox.tsx
 * Renders visual selection box when user drags to select multiple components
 * Shows dashed blue border with semi-transparent fill during drag operations
 * RELEVANT FILES: src/stores/canvasStore.ts, src/packages/canvas/components/CanvasInteractionLayer.tsx
 */

import { memo, useMemo } from "react";

import { cx } from "@/lib/design/design-system";
import { useSelectionBox } from "@/stores/canvasStore";

export const SelectionBox = memo(() => {
  const selectionBox = useSelectionBox();

  if (!selectionBox) return null;

  const { x, y, width, height } = selectionBox;

  return (
    <div
      className={cx(
        "absolute pointer-events-none",
        "border-2 border-blue-500 border-dashed",
        "bg-blue-500/10",
        "rounded",
        "z-[100]",
      )}
      style={useMemo(
        () => ({
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }),
        [],
      )}
      aria-hidden="true"
    />
  );
});

SelectionBox.displayName = "SelectionBox";
