/**
 * src/features/canvas/hooks/useComponentDrag.ts
 * Custom hook for managing component drag and drop behavior
 * Handles drag state, snap-to-grid, and connection dropping
 * RELEVANT FILES: CanvasComponent.tsx, CanvasArea.tsx, canvas-utils.ts
 */

import { snapToGrid } from '@/shared/canvasUtils';
import type { DesignComponent } from '@/shared/contracts';
import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

interface UseComponentDragProps {
  component: DesignComponent;
  onMove: (id: string, x: number, y: number) => void;
  onCompleteConnection?: (fromId: string, toId: string) => void;
  snapToGrid?: boolean;
  gridSpacing?: number;
}

interface UseComponentDragResult {
  isDragging: boolean;
  isDragPreview: boolean;
  ref: React.RefObject<HTMLDivElement>;
}

export function useComponentDrag({
  component,
  onMove,
  onCompleteConnection,
  snapToGrid: shouldSnapToGrid = false,
  gridSpacing = 20
}: UseComponentDragProps): UseComponentDragResult {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragPreview, setIsDragPreview] = useState(false);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'canvas-component',
    item: { id: component.id },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    begin: () => {
      setIsDragPreview(true);
      return { id: component.id };
    },
    end: (item, monitor) => {
      setIsDragPreview(false);
      if (!monitor.didDrop() && ref.current) {
        const offset = monitor.getDifferenceFromInitialOffset();
        if (offset) {
          let newX = component.x + offset.x;
          let newY = component.y + offset.y;

          // Apply snap-to-grid if enabled
          if (shouldSnapToGrid) {
            const snapped = snapToGrid(newX, newY, gridSpacing);
            newX = snapped.x;
            newY = snapped.y;
          }

          onMove(component.id, newX, newY);
        }
      }
    },
  }), [component.id, component.x, component.y, onMove, shouldSnapToGrid, gridSpacing]);

  const [, drop] = useDrop(() => ({
    accept: 'connection-point',
    drop: (item: { fromId: string }) => {
      if (item.fromId !== component.id && onCompleteConnection) {
        onCompleteConnection(item.fromId, component.id);
      }
    },
  }), [component.id, onCompleteConnection]);

  // Combine drag and drop refs
  const combinedRef = (el: HTMLDivElement | null) => {
    ref.current = el;
    drag(drop(el));
  };

  return {
    isDragging,
    isDragPreview,
    ref: {
      current: ref.current,
      set current(value) {
        combinedRef(value);
      }
    }
  };
}
