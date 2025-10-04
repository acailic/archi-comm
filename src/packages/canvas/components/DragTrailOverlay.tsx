// src/packages/canvas/components/DragTrailOverlay.tsx
// Canvas overlay component that renders drag trail effects for components being dragged
// Provides visual feedback during drag operations with a subtle trail/shadow effect
// RELEVANT FILES: src/packages/canvas/hooks/useComponentDrag.ts, src/lib/animations/component-animations.ts, src/stores/canvasStore.ts

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { nodeAnimations } from '@/lib/animations/component-animations';
import { getComponentIcon } from '@/lib/design/component-icons';

interface TrailPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface DragTrailOverlayProps {
  draggedComponentId: string | null;
  dragPosition: { x: number; y: number } | null;
  componentType: string;
}

const TRAIL_LENGTH = 6;
const TRAIL_SPACING_MS = 30; // Minimum time between trail points

export function DragTrailOverlay({
  draggedComponentId,
  dragPosition,
  componentType,
}: DragTrailOverlayProps) {
  const [trailPositions, setTrailPositions] = useState<TrailPosition[]>([]);

  // Update trail positions when drag position changes
  useEffect(() => {
    if (!dragPosition || !draggedComponentId) {
      setTrailPositions([]);
      return;
    }

    const now = Date.now();
    setTrailPositions((prev) => {
      // Check if enough time has passed since last position
      const lastPosition = prev[0];
      if (lastPosition && now - lastPosition.timestamp < TRAIL_SPACING_MS) {
        return prev;
      }

      // Add new position at the front
      const newTrail = [
        { x: dragPosition.x, y: dragPosition.y, timestamp: now },
        ...prev,
      ].slice(0, TRAIL_LENGTH);

      return newTrail;
    });
  }, [dragPosition, draggedComponentId]);

  // Clear trail when drag ends
  useEffect(() => {
    if (!draggedComponentId) {
      setTrailPositions([]);
    }
  }, [draggedComponentId]);

  if (!draggedComponentId || trailPositions.length === 0) {
    return null;
  }

  const Icon = getComponentIcon(componentType);

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <AnimatePresence>
        {trailPositions.map((position, index) => {
          // Skip the first position (that's the actual component)
          if (index === 0) return null;

          const opacity = 1 - index / TRAIL_LENGTH;
          const scale = 1 - index * 0.05;

          return (
            <motion.div
              key={`${position.timestamp}-${index}`}
              className="absolute"
              style={{
                left: position.x - 20,
                top: position.y - 20,
              }}
              initial={{ opacity: opacity * 0.3, scale }}
              animate={{ opacity: 0, scale: scale * 0.95 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 backdrop-blur-sm"
                style={{
                  opacity: opacity * 0.5,
                  transform: `scale(${scale})`,
                }}
              >
                {Icon && <Icon className="h-5 w-5 text-blue-400" />}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
