/**
 * src/packages/ui/components/canvas/SelectionBox.tsx
 * Renders visual selection box when user drags to select multiple components
 * Shows dashed blue border with semi-transparent fill during drag operations
 * RELEVANT FILES: src/stores/canvasStore.ts, src/packages/canvas/components/CanvasInteractionLayer.tsx
 */

import { memo, useMemo } from "react";
import type { Viewport } from "@xyflow/react";

import { cx, overlayZIndex } from "@/lib/design/design-system";
import { useSelectionBox } from "@/stores/canvasStore";

interface SelectionBoxProps {
  viewport?: Viewport;
}

export const SelectionBox = memo(({ viewport }: SelectionBoxProps) => {
  const selectionBox = useSelectionBox();

  const boxStyle = useMemo(() => {
    if (!selectionBox) return null;

    const { x, y, width, height } = selectionBox;

    // Apply viewport transformation if provided
    // Convert world coordinates to screen coordinates
    if (viewport) {
      const screenX = x * viewport.zoom + viewport.x;
      const screenY = y * viewport.zoom + viewport.y;
      const screenWidth = width * viewport.zoom;
      const screenHeight = height * viewport.zoom;

      return {
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        zIndex: overlayZIndex.selection,
      };
    }

    // Fallback to world coordinates (no transformation)
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      zIndex: overlayZIndex.selection,
    };
  }, [selectionBox, viewport]);

  if (!boxStyle) return null;

  return (
    <div
      className={cx(
        "absolute pointer-events-none",
        "border-2 border-blue-500 border-dashed",
        "bg-blue-500/10",
        "rounded",
      )}
      style={boxStyle}
      aria-hidden="true"
    />
  );
});

SelectionBox.displayName = "SelectionBox";
