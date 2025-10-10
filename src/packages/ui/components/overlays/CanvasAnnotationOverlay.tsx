// src/packages/ui/components/overlays/CanvasAnnotationOverlay.tsx
// Pure input handler overlay for annotation creation on the canvas
// Captures user clicks and translates them to annotation creation callbacks
// RELEVANT FILES: src/shared/contracts/index.ts, src/packages/canvas/components/AnnotationLayer.tsx, src/packages/ui/components/DesignCanvas/components/CanvasContent.tsx

import React, { useCallback, useMemo, useState } from 'react';
import type { Annotation, AnnotationType } from '@/shared/contracts';
import { newAnnotationId } from '@/lib/utils/id';

export interface CanvasAnnotationOverlayProps {
  width: number;
  height: number;
  selectedTool?: string;
  isActive: boolean;
  viewportZoom?: number;
  annotations: Annotation[];
  onAnnotationCreate?: (annotation: Partial<Annotation>) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
}

const TOOL_NAME_MAP: Record<string, string> = {
  comment: 'Comment',
  note: 'Note',
  label: 'Label',
  arrow: 'Arrow',
  highlight: 'Highlight',
};

const POINTER_PREVIEW_SIZE: Record<string, number> = {
  comment: 44,
  note: 48,
  label: 40,
  arrow: 54,
  highlight: 88,
};

const DEFAULT_ANNOTATION_WIDTH = 220;
const DEFAULT_ANNOTATION_HEIGHT = 120;
const HIT_TEST_PADDING = 8; // Additional padding for easier clicking

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Check if a point (x, y) lies within an annotation's bounds with padding.
 * Uses rectangular bounds rather than distance-based proximity.
 */
const isPointInAnnotationBounds = (
  pointX: number,
  pointY: number,
  annotation: Annotation,
  padding = HIT_TEST_PADDING,
  viewportZoom = 1
): boolean => {
  const width = annotation.width ?? DEFAULT_ANNOTATION_WIDTH;
  const height = annotation.height ?? DEFAULT_ANNOTATION_HEIGHT;

  // Scale padding by zoom for consistent hit area
  const scaledPadding = padding / viewportZoom;

  const left = annotation.x - scaledPadding;
  const top = annotation.y - scaledPadding;
  const right = annotation.x + width + scaledPadding;
  const bottom = annotation.y + height + scaledPadding;

  return pointX >= left && pointX <= right && pointY >= top && pointY <= bottom;
};

export const CanvasAnnotationOverlay: React.FC<CanvasAnnotationOverlayProps> = ({
  width,
  height,
  selectedTool,
  isActive,
  viewportZoom,
  annotations,
  onAnnotationCreate,
  onAnnotationSelect,
}) => {
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationIndicator, setCreationIndicator] = useState<
    { x: number; y: number } | null
  >(null);

  // No longer need proximity threshold - using bounds-based hit testing

  // Clear state when overlay becomes inactive
  React.useEffect(() => {
    if (!isActive) {
      setPointerPosition(null);
      setHoveredAnnotationId(null);
      setCreationIndicator(null);
    }
  }, [isActive]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isActive || !selectedTool || !onAnnotationCreate) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      // Convert screen coordinates to canvas coordinates
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const canvasX = screenX * scaleX;
      const canvasY = screenY * scaleY;

      // Check if clicking on an existing annotation (for selection) using bounds
      const clickedAnnotation = annotations.find(ann =>
        isPointInAnnotationBounds(canvasX, canvasY, ann, HIT_TEST_PADDING, viewportZoom)
      );

      if (clickedAnnotation) {
        onAnnotationSelect?.(clickedAnnotation);
        return;
      }

      // Create annotation based on selected tool
      let type: AnnotationType;
      let content = '';
      let style: Record<string, any> = {};

      switch (selectedTool) {
        case 'comment':
          type = 'comment';
          content = 'New comment';
          style = { backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
          break;
        case 'note':
          type = 'note';
          content = 'New note';
          style = { backgroundColor: '#dbeafe', borderColor: '#3b82f6' };
          break;
        case 'label':
          type = 'label';
          content = 'New label';
          style = { backgroundColor: '#dcfce7', borderColor: '#22c55e' };
          break;
        case 'arrow':
          type = 'arrow';
          content = '';
          style = { borderColor: '#ef4444', borderWidth: 2, backgroundColor: 'transparent' };
          break;
        case 'highlight':
          type = 'highlight';
          content = '';
          style = { backgroundColor: '#fef08a', opacity: 0.6 };
          break;
        default:
          return;
      }

      setIsCreating(true);
      setCreationIndicator({ x: screenX, y: screenY });

      // Create annotation object using centralized ID generation
      const newAnnotation: Partial<Annotation> = {
        id: newAnnotationId(),
        type,
        content,
        x: canvasX,
        y: canvasY,
        timestamp: Date.now(),
        author: 'User',
        resolved: false,
        visible: true,
        style,
      };

      // Call creation callback
      onAnnotationCreate(newAnnotation);

      // Clear creation state after animation
      setTimeout(() => {
        setIsCreating(false);
        setCreationIndicator(null);
      }, 450);
    },
    [
      isActive,
      selectedTool,
      width,
      height,
      viewportZoom,
      annotations,
      onAnnotationCreate,
      onAnnotationSelect,
    ]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isActive) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      setPointerPosition({ x: screenX, y: screenY });

      // Convert to canvas coordinates for hover detection
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const canvasX = screenX * scaleX;
      const canvasY = screenY * scaleY;

      // Check if hovering over existing annotations using bounds
      const hoveredAnnotation = annotations.find(annotation =>
        isPointInAnnotationBounds(canvasX, canvasY, annotation, HIT_TEST_PADDING, viewportZoom)
      );

      setHoveredAnnotationId(hoveredAnnotation?.id ?? null);
    },
    [isActive, width, height, viewportZoom, annotations]
  );

  const handleMouseLeave = useCallback(() => {
    setPointerPosition(null);
    setHoveredAnnotationId(null);
  }, []);

  const getCursor = () => {
    if (!isActive) return 'default';
    if (isCreating) return 'wait';
    if (hoveredAnnotationId) return 'pointer';

    switch (selectedTool) {
      case 'arrow':
        return 'crosshair';
      case 'highlight':
        return 'cell';
      case 'comment':
      case 'note':
      case 'label':
        return 'copy';
      default:
        return selectedTool ? 'copy' : 'default';
    }
  };

  const toolName = selectedTool ? TOOL_NAME_MAP[selectedTool] ?? selectedTool : null;
  const pointerPreviewSize = selectedTool
    ? POINTER_PREVIEW_SIZE[selectedTool] ?? 44
    : 44;

  if (!isActive) {
    return null;
  }

  return (
    <div
      data-testid="annotation-overlay"
      className="absolute inset-0"
      style={{ cursor: getCursor() }}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pointer preview circle */}
      {pointerPosition && selectedTool && !isCreating && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-blue-500/70 bg-blue-500/10 shadow-lg transition-all duration-150"
          style={{
            left: pointerPosition.x - pointerPreviewSize / 2,
            top: pointerPosition.y - pointerPreviewSize / 2,
            width: pointerPreviewSize,
            height: pointerPreviewSize,
          }}
        />
      )}

      {/* Hover highlight for existing annotations */}
      {pointerPosition && hoveredAnnotationId && (
        <div
          className="pointer-events-none absolute rounded-lg border border-blue-500/60 bg-blue-500/10 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] transition-all duration-150"
          style={{
            left: pointerPosition.x - 30,
            top: pointerPosition.y - 30,
            width: 60,
            height: 60,
          }}
        />
      )}

      {/* Creation in progress indicator */}
      {isCreating && (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-blue-600/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            <span className="h-3 w-3 animate-spin rounded-full border-[3px] border-white/80 border-t-transparent" />
            <span>Placing annotation…</span>
          </div>
        </div>
      )}

      {/* Creation indicator ping animation */}
      {creationIndicator && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: creationIndicator.x - 18,
            top: creationIndicator.y - 18,
            width: 36,
            height: 36,
          }}
        >
          <span className="block h-full w-full rounded-full bg-blue-400/60 opacity-70 animate-ping" />
        </div>
      )}

      {/* Mode instructions */}
      {selectedTool && !isCreating && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-full bg-slate-900/80 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
            <span className="text-slate-200/90">Annotation mode</span>
            <span className="hidden sm:inline text-slate-200/75">Click to place {toolName ?? 'annotation'}</span>
            <span className="flex items-center gap-1 text-slate-200/70">
              <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Esc</kbd>
              exit
            </span>
          </div>
        </div>
      )}

      {/* Development mode indicator */}
      {import.meta.env.DEV && (
        <div className="absolute top-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
          Annotation Overlay Active
        </div>
      )}
    </div>
  );
};

CanvasAnnotationOverlay.displayName = 'CanvasAnnotationOverlay';
