/**
 * src/lib/canvas/presentation-utils.ts
 * Utility functions for presentation mode viewport transitions and animations
 * Handles slide navigation, camera movements, and viewport calculations
 * RELEVANT FILES: usePresentation.ts, PresentationModeModal.tsx, canvasStore.ts, shared/contracts/index.ts
 */

import type { Viewport } from '@xyflow/react';
import type { PresentationSlide } from '@/shared/contracts';

export interface ViewportTransitionOptions {
  duration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  onComplete?: () => void;
}

/**
 * Calculate the viewport needed to fit specific components on screen
 */
export const calculateViewportForComponents = (
  componentIds: string[],
  components: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  padding: number = 50
): Viewport => {
  if (componentIds.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const targetComponents = components.filter(c => componentIds.includes(c.id));
  if (targetComponents.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  // Calculate bounding box
  const minX = Math.min(...targetComponents.map(c => c.x));
  const minY = Math.min(...targetComponents.map(c => c.y));
  const maxX = Math.max(...targetComponents.map(c => c.x + c.width));
  const maxY = Math.max(...targetComponents.map(c => c.y + c.height));

  const width = maxX - minX;
  const height = maxY - minY;

  // Calculate center point
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  // Calculate zoom to fit (assuming viewport size of 1920x1080)
  const viewportWidth = 1920;
  const viewportHeight = 1080;
  const zoomX = viewportWidth / (width + padding * 2);
  const zoomY = viewportHeight / (height + padding * 2);
  const zoom = Math.min(zoomX, zoomY, 2); // Max zoom of 2x

  return { x: centerX, y: centerY, zoom };
};

/**
 * Animate viewport transition between two states
 * TODO: Implement smooth camera animation with easing
 */
export const animateViewportTransition = (
  from: Viewport,
  to: Viewport,
  options: ViewportTransitionOptions = {}
): Promise<void> => {
  const { duration = 800, easing = 'ease-in-out', onComplete } = options;

  return new Promise((resolve) => {
    // TODO: Implement actual animation using requestAnimationFrame
    // For now, this is a placeholder that immediately completes
    setTimeout(() => {
      onComplete?.();
      resolve();
    }, duration);
  });
};

/**
 * Generate automatic slide sequence from canvas components
 * Creates slides that pan through the canvas in a logical order
 */
export const generateAutoSlides = (
  components: Array<{ id: string; x: number; y: number; width: number; height: number; label?: string }>,
  options: { slidesPerRow?: number; padding?: number } = {}
): Omit<PresentationSlide, 'id'>[] => {
  const { slidesPerRow = 3, padding = 100 } = options;

  // Sort components by position (top-to-bottom, left-to-right)
  const sorted = [...components].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 200) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const slides: Omit<PresentationSlide, 'id'>[] = [];

  // Create slides with groups of components
  for (let i = 0; i < sorted.length; i += slidesPerRow) {
    const group = sorted.slice(i, i + slidesPerRow);
    const viewport = calculateViewportForComponents(
      group.map(c => c.id),
      components,
      padding
    );

    slides.push({
      name: `Slide ${slides.length + 1}`,
      viewport,
      focusedComponentIds: group.map(c => c.id),
      notes: group.map(c => c.label || c.id).join(', '),
      duration: 5000,
    });
  }

  return slides;
};

/**
 * Validate slide viewport bounds
 */
export const validateSlideViewport = (viewport: Viewport): boolean => {
  return (
    typeof viewport.x === 'number' &&
    typeof viewport.y === 'number' &&
    typeof viewport.zoom === 'number' &&
    viewport.zoom > 0 &&
    viewport.zoom <= 5
  );
};
