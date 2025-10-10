/**
 * src/features/canvas/hooks/useComponentDrag.ts
 * Custom hook for managing component drag and drop behavior
 * Handles drag state, snap-to-grid, and connection dropping
 * RELEVANT FILES: CanvasComponent.tsx, CanvasArea.tsx, canvas-utils.ts
 */

import { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { DragSourceMonitor, XYCoord } from 'react-dnd';
import type { DesignComponent } from '@/shared/contracts';
import { snapToGrid } from '@/shared/canvasUtils';
import { useCanvasActions } from '@/stores/canvasStore';

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
  const canvasActions = useCanvasActions();
  const canvasActionsRef = useRef(canvasActions);
  useEffect(() => {
    canvasActionsRef.current = canvasActions;
  }, [canvasActions]);
  
  // Store initial client offset for proper coordinate calculation
  const initialClientOffset = useRef<XYCoord | null>(null);
  const initialComponentPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragMonitorRef = useRef<DragSourceMonitor<DragItem, unknown> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const trailPositionsRef = useRef<Array<{ x: number; y: number }>>([]);
  const lastSnapFeedbackAtRef = useRef<number>(0);

  const stopAnimationLoop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const emitTrailUpdate = (positions: Array<{ x: number; y: number }>) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('canvas:component-dragging', {
        detail: {
          componentId: component.id,
          positions,
        },
      }),
    );
  };

  const updateDragTrail = () => {
    if (!dragMonitorRef.current || !initialClientOffset.current || !initialComponentPositionRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateDragTrail);
      return;
    }

    const clientOffset = dragMonitorRef.current.getClientOffset();
    if (!clientOffset) {
      animationFrameRef.current = requestAnimationFrame(updateDragTrail);
      return;
    }

    const base = initialComponentPositionRef.current;
    const newX = base.x + (clientOffset.x - initialClientOffset.current.x);
    const newY = base.y + (clientOffset.y - initialClientOffset.current.y);

    const last = trailPositionsRef.current[trailPositionsRef.current.length - 1];
    if (!last || Math.abs(last.x - newX) > 0.5 || Math.abs(last.y - newY) > 0.5) {
      trailPositionsRef.current = [...trailPositionsRef.current, { x: newX, y: newY }].slice(-5);
      emitTrailUpdate(trailPositionsRef.current);
    }

    if (shouldSnapToGrid) {
      const snapped = snapToGrid(newX, newY, gridSpacing);
      const distance = Math.hypot(snapped.x - newX, snapped.y - newY);
      const now = Date.now();
      if (distance < 1 && now - lastSnapFeedbackAtRef.current > 150) {
        canvasActionsRef.current.setSnappingComponent(component.id);
        lastSnapFeedbackAtRef.current = now;
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateDragTrail);
  };

  useEffect(() => {
    return () => {
      stopAnimationLoop();
      emitTrailUpdate([]);
      dragMonitorRef.current = null;
      initialComponentPositionRef.current = null;
    };
  }, []);

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
      initialComponentPositionRef.current = { x: component.x, y: component.y };
      trailPositionsRef.current = [{ x: component.x, y: component.y }];
      dragMonitorRef.current = monitor;
      lastSnapFeedbackAtRef.current = 0;
      canvasActionsRef.current.setDraggedComponent(component.id);
      emitTrailUpdate(trailPositionsRef.current);
      stopAnimationLoop();
      animationFrameRef.current = requestAnimationFrame(updateDragTrail);
      return { id: component.id };
    },
    end: (item, monitor) => {
      setIsDragPreview(false);
      stopAnimationLoop();
      emitTrailUpdate([]);
      canvasActionsRef.current.setDraggedComponent(null);
      dragMonitorRef.current = null;
      if (!monitor.didDrop() && initialClientOffset.current) {
        const currentClientOffset = monitor.getClientOffset();
        if (currentClientOffset) {
          const initialPosition = initialComponentPositionRef.current ?? {
            x: component.x,
            y: component.y,
          };
          const deltaX = currentClientOffset.x - initialClientOffset.current.x;
          const deltaY = currentClientOffset.y - initialClientOffset.current.y;

          let newX = initialPosition.x + deltaX;
          let newY = initialPosition.y + deltaY;
          let snappedTriggered = false;

          if (shouldSnapToGrid) {
            const snapped = snapToGrid(newX, newY, gridSpacing);
            snappedTriggered = snapped.x !== newX || snapped.y !== newY;
            newX = snapped.x;
            newY = snapped.y;
          }

          onMove(component.id, newX, newY);

          if (snappedTriggered) {
            canvasActionsRef.current.setSnappingComponent(component.id);
          }
        }
      }
      canvasActionsRef.current.setDroppedComponent(component.id);
      // Reset initial offset
      initialClientOffset.current = null;
      initialComponentPositionRef.current = null;
      trailPositionsRef.current = [];
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
