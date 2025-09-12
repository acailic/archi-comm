import { useGesture } from '@use-gesture/react';
import { useMemo } from 'react';

export interface CanvasGestureHandlers {
  onPan?: (dx: number, dy: number, event: WheelEvent | PointerEvent | MouseEvent) => void;
  onZoom?: (delta: number, origin: { x: number; y: number }, event: WheelEvent | PointerEvent) => void;
}

/**
 * Lightweight wrapper around @use-gesture/react for panning and zooming overlays.
 * Attach the returned bind props to any container element.
 */
export function useCanvasGestures({ onPan, onZoom }: CanvasGestureHandlers) {
  const bind = useGesture(
    {
      onWheel: state => {
        const { event, delta: [, dy], ctrlKey } = state;
        // ctrlKey wheel usually means zoom (trackpad pinch)
        if (onZoom && (ctrlKey || Math.abs(dy) > 0)) {
          const e = event as WheelEvent;
          const origin = { x: (e as any).clientX ?? 0, y: (e as any).clientY ?? 0 };
          onZoom(-dy, origin, e);
        }
      },
      onPinch: state => {
        const { event, da, origin } = state;
        if (onZoom) onZoom(da[0], { x: origin[0], y: origin[1] }, event as any);
      },
      onDrag: state => {
        const { event, delta } = state;
        if (onPan) onPan(delta[0], delta[1], event as any);
      },
    },
    {
      drag: { filterTaps: true },
      wheel: { eventOptions: { passive: false } },
      pinch: { scaleBounds: { min: 0.1, max: 4 } },
    }
  );

  return useMemo(() => ({ bind }), [bind]);
}

