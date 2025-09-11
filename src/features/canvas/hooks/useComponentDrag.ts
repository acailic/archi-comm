/**
 * src/features/canvas/hooks/useComponentDrag.ts
 * Custom hook for managing component drag and drop behavior
 * Handles drag state, snap-to-grid, and connection dropping
 * RELEVANT FILES: CanvasComponent.tsx, CanvasArea.tsx, canvas-utils.ts
 */

import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { XYCoord } from 'react-dnd';
import type { DesignComponent } from '@/shared/contracts';
import { snapToGrid } from '@/shared/canvasUtils';

interface UseComponentDragProps {
  component: DesignComponent;
  onMove: (id: string, x: number, y: number) => void;
  onCompleteConnection?: (fromId: string, toId: string) => void;
  snapToGrid?: boolean;
  gridSpacing?: number;
}

// Type definitions for drag and drop items
interface DragItem {
  id: string;
}

interface DropItem {
  fromId: string;
}

interface DragCollectedProps {
  isDragging: boolean;
}

interface DropCollectedProps {
  // Add any drop-related collected props here if needed
}

interface UseComponentDragResult {
  isDragging: boolean;
  isDragPreview: boolean;
  ref: (el: HTMLDivElement | null) => void;
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
  
  // Store initial client offset for proper coordinate calculation
  const initialClientOffset = useRef<XYCoord | null>(null);

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, DragCollectedProps>(() => ({
    type: 'canvas-component',
    item: { id: component.id },
    collect: (monitor): DragCollectedProps => ({
      isDragging: monitor.isDragging(),
    }),
    begin: (monitor) => {
      setIsDragPreview(true);
      // Store initial client offset for coordinate calculation
      initialClientOffset.current = monitor.getInitialClientOffset();
      return { id: component.id };
    },
    end: (item, monitor) => {
      setIsDragPreview(false);
      if (!monitor.didDrop() && ref.current && initialClientOffset.current) {
        const currentClientOffset = monitor.getClientOffset();
        if (currentClientOffset) {
          // Calculate position using canvas coordinate system
          const canvasRect = ref.current.parentElement?.getBoundingClientRect();
          if (canvasRect) {
            // Calculate the difference in client coordinates
            const deltaX = currentClientOffset.x - initialClientOffset.current.x;
            const deltaY = currentClientOffset.y - initialClientOffset.current.y;
            
            let newX = component.x + deltaX;
            let newY = component.y + deltaY;

            // Apply snap-to-grid if enabled
            if (shouldSnapToGrid) {
              const snapped = snapToGrid(newX, newY, gridSpacing);
              newX = snapped.x;
              newY = snapped.y;
            }

            onMove(component.id, newX, newY);
          }
        }
      }
      // Reset initial offset
      initialClientOffset.current = null;
    },
  }), [component.id, component.x, component.y, onMove, shouldSnapToGrid, gridSpacing]);

  const [, drop] = useDrop<DropItem, unknown, DropCollectedProps>(() => ({
    accept: 'connection-point',
    drop: (item) => {
      // Add null checks to prevent runtime errors
      if (item?.fromId && item.fromId !== component.id && onCompleteConnection) {
        onCompleteConnection(item.fromId, component.id);
      }
    },
  }), [component.id, onCompleteConnection]);

  // Combine drag and drop refs into a single callback ref
  const combinedRef = (el: HTMLDivElement | null) => {
    ref.current = el;
    drag(drop(el));
  };

  return {
    isDragging,
    isDragPreview,
    ref: combinedRef
  };
}
