// src/packages/canvas/components/DragTrailOverlay.tsx
// Canvas overlay component that renders drag trail effects for components being dragged
// Provides visual feedback during drag operations with a subtle trail/shadow effect
// RELEVANT FILES: src/packages/canvas/hooks/useComponentDrag.ts, src/lib/animations/component-animations.ts, src/stores/canvasStore.ts

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { getComponentIcon } from '@/lib/design/component-icons';
import { useCanvasStore, useDraggedComponentId } from '@/stores/canvasStore';

interface DragTrailOverlayProps {
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

interface DragEventDetail {
  componentId: string;
  positions: Array<{ x: number; y: number }>;
}

const TRAIL_LIMIT = 5;

export function DragTrailOverlay({ viewport }: DragTrailOverlayProps) {
  const draggedComponentId = useDraggedComponentId();
  const animationsEnabled = useCanvasStore((state) => state.animationsEnabled);
  const components = useCanvasStore((state) => state.components);

  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const [trailPositions, setTrailPositions] = useState<
    Array<{ x: number; y: number }>
  >([]);

  const componentId = draggedComponentId ?? activeComponentId;

  const draggedComponent = useMemo(() => {
    if (!componentId) {
      return null;
    }
    return (
      components.find((component) => component.id === componentId) ?? null
    );
  }, [components, componentId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleDragUpdate = (event: Event) => {
      const detail = (event as CustomEvent<DragEventDetail>).detail;
      if (!detail) {
        return;
      }

      setActiveComponentId(detail.componentId);
      setTrailPositions(detail.positions.slice(-TRAIL_LIMIT));
    };

    window.addEventListener('canvas:component-dragging', handleDragUpdate);
    return () => {
      window.removeEventListener('canvas:component-dragging', handleDragUpdate);
    };
  }, []);

  useEffect(() => {
    if (!draggedComponentId || !animationsEnabled) {
      setTrailPositions([]);
      if (!draggedComponentId) {
        setActiveComponentId(null);
      }
    }
  }, [draggedComponentId, animationsEnabled]);

  const tailSegments = useMemo(() => {
    if (!trailPositions.length) {
      return [] as Array<{
        x: number;
        y: number;
        key: string;
        index: number;
      }>;
    }

    const ordered = [...trailPositions].reverse();
    // Remove the most recent position (the live component)
    const segments = ordered.slice(1, TRAIL_LIMIT + 1);

    return segments.map((position, index) => ({
      ...position,
      key: `${position.x}-${position.y}-${index}`,
      index,
    }));
  }, [trailPositions]);

  const trailSprites = useMemo(() => {
    return tailSegments.map((segment) => {
      const screenX = segment.x * viewport.zoom + viewport.x;
      const screenY = segment.y * viewport.zoom + viewport.y;

      const orderIndex = segment.index + 1; // ensure non-zero divisor
      const opacity = Math.max(0, 0.6 - orderIndex * 0.1);
      const scale = Math.max(0.45, 1 - orderIndex * 0.12);

      return {
        ...segment,
        screenX,
        screenY,
        opacity,
        scale,
      };
    });
  }, [tailSegments, viewport]);

  const Icon = draggedComponent
    ? getComponentIcon(draggedComponent.type as string)
    : null;

  const ghostSize = useMemo(() => {
    if (!draggedComponent) {
      return 48;
    }
    const base = draggedComponent.width ?? 220;
    return Math.max(36, Math.min(72, base * 0.25));
  }, [draggedComponent]);

  if (
    !animationsEnabled ||
    !componentId ||
    !draggedComponent ||
    trailSprites.length === 0
  ) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[60]">
      <AnimatePresence>
        {trailSprites.map((segment) => (
          <motion.div
            key={`${componentId}-${segment.key}`}
            className="absolute"
            initial={{
              opacity: 0,
              scale: segment.scale * 0.9,
              x: segment.screenX - ghostSize / 2,
              y: segment.screenY - ghostSize / 2,
            }}
            animate={{
              opacity: segment.opacity,
              scale: segment.scale,
              x: segment.screenX - ghostSize / 2,
              y: segment.screenY - ghostSize / 2,
            }}
            exit={{ opacity: 0, scale: segment.scale * 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="flex items-center justify-center rounded-xl bg-blue-500/15 backdrop-blur-sm shadow-lg shadow-blue-500/10"
              style={{
                width: ghostSize,
                height: ghostSize,
                opacity: segment.opacity,
              }}
            >
              {Icon && (
                <Icon
                  className="text-blue-400"
                  style={{
                    width: ghostSize * 0.45,
                    height: ghostSize * 0.45,
                  }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
