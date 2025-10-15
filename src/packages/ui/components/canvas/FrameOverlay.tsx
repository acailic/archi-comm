/**
 * src/packages/ui/components/canvas/FrameOverlay.tsx
 * Renders organizational frames on the canvas (similar to Figma frames)
 * Provides visual containers for grouping related components with drag/resize support
 * RELEVANT FILES: useFrameManagement.ts, canvasStore.ts, shared/contracts/index.ts
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Viewport } from '@xyflow/react';
import type { CanvasFrame } from '@/shared/contracts';

export interface FrameOverlayProps {
  frames: CanvasFrame[];
  viewport: Viewport;
  selectedFrameId?: string | null;
  onFrameSelect?: (frameId: string) => void;
  onFrameResize?: (
    frameId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => void;
  onFrameMove?: (frameId: string, position: { x: number; y: number }) => void;
  interactive?: boolean;
}

const HANDLE_SIZE = 10;
const MIN_FRAME_SIZE = 80;

type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

type ActiveInteraction =
  | {
      type: 'move';
      frameId: string;
      pointerStart: { x: number; y: number };
      initialPosition: { x: number; y: number };
    }
  | {
      type: 'resize';
      frameId: string;
      pointerStart: { x: number; y: number };
      initialBounds: { x: number; y: number; width: number; height: number };
      handle: ResizeHandle;
    };

interface FramePreviewState {
  [frameId: string]: { x: number; y: number; width: number; height: number };
}

const getResizeDelta = (
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  bounds: { x: number; y: number; width: number; height: number },
) => {
  let { x, y, width, height } = bounds;

  switch (handle) {
    case 'top-left':
      x += deltaX;
      y += deltaY;
      width -= deltaX;
      height -= deltaY;
      break;
    case 'top-right':
      y += deltaY;
      width += deltaX;
      height -= deltaY;
      break;
    case 'bottom-left':
      x += deltaX;
      width -= deltaX;
      height += deltaY;
      break;
    case 'bottom-right':
      width += deltaX;
      height += deltaY;
      break;
    case 'top':
      y += deltaY;
      height -= deltaY;
      break;
    case 'bottom':
      height += deltaY;
      break;
    case 'left':
      x += deltaX;
      width -= deltaX;
      break;
    case 'right':
      width += deltaX;
      break;
    default:
      break;
  }

  width = Math.max(MIN_FRAME_SIZE, width);
  height = Math.max(MIN_FRAME_SIZE, height);

  return { x, y, width, height };
};

const getHandleStyle = (handle: ResizeHandle, size: number) => {
  const common: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    backgroundColor: 'white',
    border: '1px solid #3b82f6',
    borderRadius: 4,
    pointerEvents: 'auto',
    cursor: 'nwse-resize',
    zIndex: 2,
  };

  switch (handle) {
    case 'top-left':
      return { ...common, left: -size / 2, top: -size / 2, cursor: 'nwse-resize' };
    case 'top-right':
      return { ...common, right: -size / 2, top: -size / 2, cursor: 'nesw-resize' };
    case 'bottom-left':
      return { ...common, left: -size / 2, bottom: -size / 2, cursor: 'nesw-resize' };
    case 'bottom-right':
      return { ...common, right: -size / 2, bottom: -size / 2, cursor: 'nwse-resize' };
    case 'top':
      return {
        ...common,
        top: -size / 2,
        left: '50%',
        marginLeft: -size / 2,
        cursor: 'ns-resize',
      };
    case 'bottom':
      return {
        ...common,
        bottom: -size / 2,
        left: '50%',
        marginLeft: -size / 2,
        cursor: 'ns-resize',
      };
    case 'left':
      return {
        ...common,
        left: -size / 2,
        top: '50%',
        marginTop: -size / 2,
        cursor: 'ew-resize',
      };
    case 'right':
      return {
        ...common,
        right: -size / 2,
        top: '50%',
        marginTop: -size / 2,
        cursor: 'ew-resize',
      };
    default:
      return common;
  }
};

export const FrameOverlay: React.FC<FrameOverlayProps> = ({
  frames,
  viewport,
  selectedFrameId,
  onFrameSelect,
  onFrameResize,
  onFrameMove,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [previewBounds, setPreviewBounds] = useState<FramePreviewState>({});

  const resetInteraction = useCallback(() => {
    setActiveInteraction(null);
    setPreviewBounds({});
  }, []);

  useEffect(() => {
    if (!activeInteraction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      const zoom = viewport.zoom || 1;
      const deltaX = (event.clientX - activeInteraction.pointerStart.x) / zoom;
      const deltaY = (event.clientY - activeInteraction.pointerStart.y) / zoom;

      if (activeInteraction.type === 'move') {
        const frame = frames.find((f) => f.id === activeInteraction.frameId);
        if (!frame) return;
        const nextX = activeInteraction.initialPosition.x + deltaX;
        const nextY = activeInteraction.initialPosition.y + deltaY;

        setPreviewBounds((prev) => ({
          ...prev,
          [activeInteraction.frameId]: {
            x: nextX,
            y: nextY,
            width: frame.width,
            height: frame.height,
          },
        }));

        onFrameMove?.(activeInteraction.frameId, { x: nextX, y: nextY });
      } else {
        const frame = frames.find((f) => f.id === activeInteraction.frameId);
        if (!frame) return;

        const nextBounds = getResizeDelta(
          activeInteraction.handle,
          deltaX,
          deltaY,
          activeInteraction.initialBounds,
        );

        setPreviewBounds((prev) => ({
          ...prev,
          [activeInteraction.frameId]: nextBounds,
        }));

        onFrameResize?.(activeInteraction.frameId, nextBounds);
      }
    };

    const handlePointerUp = () => {
      resetInteraction();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    window.addEventListener('pointercancel', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeInteraction, frames, onFrameMove, onFrameResize, resetInteraction, viewport.zoom]);

  const handleSelect = useCallback(
    (event: React.MouseEvent, frameId: string) => {
      event.stopPropagation();
      onFrameSelect?.(frameId);
    },
    [onFrameSelect],
  );

  const handleMoveStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, frame: CanvasFrame) => {
      if (!interactive) return;
      event.stopPropagation();
      event.preventDefault();

      setActiveInteraction({
        type: 'move',
        frameId: frame.id,
        pointerStart: { x: event.clientX, y: event.clientY },
        initialPosition: { x: frame.x, y: frame.y },
      });
    },
    [interactive],
  );

  const handleResizeStart = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      frame: CanvasFrame,
      handle: ResizeHandle,
    ) => {
      if (!interactive) return;
      event.stopPropagation();
      event.preventDefault();

      setActiveInteraction({
        type: 'resize',
        frameId: frame.id,
        pointerStart: { x: event.clientX, y: event.clientY },
        initialBounds: {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        },
        handle,
      });
    },
    [interactive],
  );

  const overlayStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      transformOrigin: '0 0',
      zIndex: 10,
    }),
    [viewport.x, viewport.y, viewport.zoom],
  );

  const getFrameBounds = useCallback(
    (frame: CanvasFrame) => previewBounds[frame.id] ?? frame,
    [previewBounds],
  );

  if (!frames.length) {
    return null;
  }

  return (
    <div ref={containerRef} style={overlayStyle} className="canvas-frame-overlay">
      {frames.map((frame) => {
        const bounds = getFrameBounds(frame);
        const isSelected = frame.id === selectedFrameId;
        const color = frame.color ?? '#3b82f6';

        return (
          <div
            key={frame.id}
            role="button"
            tabIndex={-1}
            className={`canvas-frame ${isSelected ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: bounds.x,
              top: bounds.y,
              width: bounds.width,
              height: bounds.height,
              border: `2px ${isSelected ? color : '#a5b4fc'} solid`,
              borderRadius: 8,
              backgroundColor: frame.collapsed ? `${color}16` : `${color}12`,
              boxShadow: isSelected ? `0 0 0 2px ${color}40` : 'none',
              pointerEvents: 'auto',
              userSelect: 'none',
              cursor: interactive ? 'move' : 'default',
            }}
            onPointerDown={(event) => handleMoveStart(event, frame)}
            onClick={(event) => handleSelect(event, frame.id)}
          >
            <div
              style={{
                position: 'absolute',
                top: -24,
                left: 0,
                padding: '2px 8px',
                backgroundColor: color,
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: '4px 4px 0 0',
                pointerEvents: 'none',
              }}
            >
              {frame.name}
            </div>

            {frame.description && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 8,
                  right: 8,
                  fontSize: 11,
                  color: '#4b5563',
                  background: 'rgba(255,255,255,0.85)',
                  padding: '4px 6px',
                  borderRadius: 6,
                  pointerEvents: 'none',
                }}
              >
                {frame.description}
              </div>
            )}

            {interactive && !frame.locked && (
              <>
                {(
                  [
                    'top-left',
                    'top',
                    'top-right',
                    'right',
                    'bottom-right',
                    'bottom',
                    'bottom-left',
                    'left',
                  ] as ResizeHandle[]
                ).map((handle) => (
                  <div
                    key={`${frame.id}-${handle}`}
                    style={getHandleStyle(handle, HANDLE_SIZE)}
                    onPointerDown={(event) => handleResizeStart(event, frame, handle)}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
