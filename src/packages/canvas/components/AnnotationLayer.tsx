import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { Viewport } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { Annotation } from '@/shared/contracts';
import { Badge } from '@ui/components/ui/badge';
import { cx } from '@/lib/design/design-system';
import { annotationStyleTokens } from '@/lib/canvas/annotation-utils';

export interface AnnotationLayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  annotations: Annotation[];
  selectedAnnotationId?: string | null;
  highlightedAnnotationId?: string | null;
  viewport: Viewport;
  visible?: boolean;
  opacity?: number;
  debugMode?: boolean;
  onSelect?: (annotation: Annotation) => void;
  onDoubleClick?: (annotation: Annotation) => void;
  onHover?: (annotation: Annotation | null) => void;
  onMove?: (annotationId: string, position: { x: number; y: number }) => void;
}

const DEFAULT_DIMENSIONS = { width: 220, height: 120 };
const VIRTUALIZATION_BUFFER = 200;

const formatRelativeTime = (timestamp: number): string => {
  const delta = Date.now() - timestamp;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

const getAnnotationDimensions = (annotation: Annotation) => ({
  width: annotation.width ?? DEFAULT_DIMENSIONS.width,
  height: annotation.height ?? DEFAULT_DIMENSIONS.height,
});

const AnnotationLayerComponent: React.FC<AnnotationLayerProps> = ({
  annotations,
  selectedAnnotationId,
  highlightedAnnotationId,
  viewport,
  visible = true,
  opacity = 1,
  debugMode = false,
  className,
  style,
  onSelect,
  onDoubleClick,
  onHover,
  onMove,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Development mode logging
  if (import.meta.env.DEV) {
    React.useEffect(() => {
      console.log('[AnnotationLayer] Rendering', {
        annotationCount: annotations.length,
        visible,
        opacity,
        selectedAnnotationId,
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
      });
    }, [annotations.length, visible, opacity, selectedAnnotationId, viewport.x, viewport.y, viewport.zoom]);
  }
  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    offset: { x: number; y: number };
  } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});

  const projectCanvasToScreen = useCallback(
    (position: { x: number; y: number }) => ({
      x: (position.x - viewport.x) * viewport.zoom,
      y: (position.y - viewport.y) * viewport.zoom,
    }),
    [viewport.x, viewport.y, viewport.zoom]
  );

  const projectScreenToCanvas = useCallback(
    (point: { x: number; y: number }) => ({
      x: viewport.x + point.x / viewport.zoom,
      y: viewport.y + point.y / viewport.zoom,
    }),
    [viewport.x, viewport.y, viewport.zoom]
  );

  const visibleAnnotations = useMemo(() => {
    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 1080;
    const viewportBounds = {
      minX: viewport.x - VIRTUALIZATION_BUFFER / viewport.zoom,
      minY: viewport.y - VIRTUALIZATION_BUFFER / viewport.zoom,
      maxX:
        viewport.x +
        (viewportWidth + VIRTUALIZATION_BUFFER) / viewport.zoom,
      maxY:
        viewport.y +
        (viewportHeight + VIRTUALIZATION_BUFFER) / viewport.zoom,
    };

    const filtered = annotations
      .filter((annotation) => annotation.visible !== false)
      .filter((annotation) => {
        const override = overrides[annotation.id];
        const { width, height } = getAnnotationDimensions(annotation);
        const x = override?.x ?? annotation.x;
        const y = override?.y ?? annotation.y;
        const maxX = x + width;
        const maxY = y + height;
        return (
          maxX >= viewportBounds.minX &&
          x <= viewportBounds.maxX &&
          maxY >= viewportBounds.minY &&
          y <= viewportBounds.maxY
        );
      })
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    if (import.meta.env.DEV) {
      const hiddenByVisibleFlag = annotations.filter(a => a.visible === false).length;
      const hiddenByViewport = annotations.length - hiddenByVisibleFlag - filtered.length;
      console.log('[AnnotationLayer] Visibility filtering', {
        total: annotations.length,
        visible: filtered.length,
        hiddenByVisibleFlag,
        hiddenByViewport,
      });
    }

    return filtered;
  }, [annotations, overrides, viewport]);

  const handlePointerDown = useCallback(
    (annotation: Annotation) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!onMove) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const pointerScreen = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const pointerCanvas = projectScreenToCanvas(pointerScreen);
      const origin = overrides[annotation.id] ?? {
        x: annotation.x,
        y: annotation.y,
      };
      const offset = {
        x: pointerCanvas.x - origin.x,
        y: pointerCanvas.y - origin.y,
      };

      dragStateRef.current = {
        id: annotation.id,
        pointerId: event.pointerId,
        offset,
      };

      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [onMove, overrides, projectScreenToCanvas]
  );

  const handlePointerMove = useCallback(
    (annotation: Annotation) => (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.id !== annotation.id) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const pointerScreen = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const pointerCanvas = projectScreenToCanvas(pointerScreen);
      const nextPosition = {
        x: pointerCanvas.x - state.offset.x,
        y: pointerCanvas.y - state.offset.y,
      };

      setOverrides((current) => ({
        ...current,
        [annotation.id]: nextPosition,
      }));
    },
    [projectScreenToCanvas]
  );

  const handlePointerUp = useCallback(
    (annotation: Annotation) => (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.id !== annotation.id) return;

      const nextPosition = overrides[annotation.id];
      dragStateRef.current = null;
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);

      if (nextPosition && onMove) {
        onMove(annotation.id, nextPosition);
      }

      setOverrides((current) => {
        const copy = { ...current };
        delete copy[annotation.id];
        return copy;
      });
    },
    [onMove, overrides]
  );

  const renderAnnotationContent = useCallback(
    (annotation: Annotation, isSelected: boolean) => {
      const tokens = annotationStyleTokens[annotation.type];
      const baseStyle = cx(
        'relative flex h-full w-full flex-col gap-2 rounded-xl border p-3 transition-transform duration-150',
        tokens.background,
        tokens.border,
        tokens.shadow,
        annotation.type === 'note' ? 'rotate-[-1.5deg]' : null,
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : null
      );

      switch (annotation.type) {
        case 'comment':
        case 'note':
          return (
            <div className={baseStyle}>
              <div className='flex items-center justify-between gap-2'>
                <span className={cx('text-sm font-semibold', tokens.text)}>
                  {annotation.author ?? 'Author'}
                </span>
                <Badge variant='secondary' className={cx('h-5 px-2 text-[10px]', tokens.accent)}>
                  {formatRelativeTime(annotation.timestamp)}
                </Badge>
              </div>
              <div
                className='line-clamp-5 whitespace-pre-wrap text-sm'
                style={annotation.style}
              >
                {annotation.content}
              </div>
            </div>
          );
        case 'label':
          return (
            <div className={cx(baseStyle, 'items-start justify-center p-2')}> 
              <Badge className='mb-1' variant='outline'>Label</Badge>
              <span className={cx('text-sm font-medium', tokens.text)}>{annotation.content}</span>
            </div>
          );
        case 'highlight':
          return (
            <div
              className={cx(
                'h-full w-full rounded-lg border-2 border-dashed p-3 backdrop-blur-sm transition-all duration-200',
                tokens.border,
                tokens.background
              )}
            >
              <span className={cx('text-xs font-medium uppercase', tokens.text)}>
                {annotation.content || 'Highlighted area'}
              </span>
            </div>
          );
        case 'arrow':
          return (
            <div className={cx('relative flex h-full w-full flex-col justify-between gap-2 rounded-xl border border-dashed border-border bg-white/70 p-2')}>
              <svg className='h-12 w-full text-slate-500' viewBox='0 0 100 40'>
                <defs>
                  <marker id={`arrowhead-${annotation.id}`} markerWidth='8' markerHeight='6' refX='4' refY='3' orient='auto'>
                    <polygon points='0 0, 8 3, 0 6' fill='currentColor' />
                  </marker>
                </defs>
                <line
                  x1='10'
                  y1='20'
                  x2='90'
                  y2='20'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                  markerEnd={`url(#arrowhead-${annotation.id})`}
                />
              </svg>
              <span className='text-xs font-medium text-slate-700'>{annotation.content}</span>
            </div>
          );
        default:
          return null;
      }
    },
    []
  );

  if (!visible) {
    if (import.meta.env.DEV) {
      console.log('[AnnotationLayer] Layer hidden (visible=false)');
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      {...rest}
      data-testid="annotation-layer"
      className={cx('pointer-events-auto absolute inset-0', className)}
      style={{ ...style, opacity }}
      aria-hidden={!visible}
    >
      {/* Empty state indicator in dev mode */}
      {import.meta.env.DEV && annotations.length === 0 && (
        <div className="pointer-events-none absolute top-4 left-4 bg-yellow-100 border border-yellow-400 px-3 py-2 rounded text-xs text-yellow-800">
          AnnotationLayer: No annotations yet
        </div>
      )}
      {visibleAnnotations.map((annotation) => {
        const override = overrides[annotation.id];
        const { width, height } = getAnnotationDimensions(annotation);
        const position = projectCanvasToScreen({
          x: override?.x ?? annotation.x,
          y: override?.y ?? annotation.y,
        });
        const isSelected = annotation.id === selectedAnnotationId;
        const isHighlighted = annotation.id === highlightedAnnotationId;

        const style: CSSProperties = {
          width: width * viewport.zoom,
          height: height * viewport.zoom,
          transform: `translate(${position.x}px, ${position.y}px)` +
            (override ? ' scale(1.02)' : ''),
          zIndex: (annotation.zIndex ?? 0) + (isSelected ? 100 : 0),
        };

        const handleClick = () => {
          onSelect?.(annotation);
        };

        const handleDoubleClick = () => {
          onDoubleClick?.(annotation);
        };

        const handlePointerEnter = () => {
          onHover?.(annotation);
        };

        const handlePointerLeave = () => {
          onHover?.(null);
        };

        return (
          <motion.div
            key={annotation.id}
            data-testid={`annotation-${annotation.id}`}
            data-annotation-type={annotation.type}
            layout
            className={cx(
              'annotation-layer-item absolute origin-top-left will-change-transform',
              'cursor-pointer rounded-xl transition-shadow duration-150',
              isHighlighted ? 'ring-2 ring-primary/60' : null,
              debugMode ? 'ring-4 ring-yellow-400 ring-offset-2' : null
            )}
            style={style}
            whileHover={{ scale: 1.01 }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown(annotation)}
            onPointerMove={handlePointerMove(annotation)}
            onPointerUp={handlePointerUp(annotation)}
            onPointerCancel={handlePointerUp(annotation)}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            {renderAnnotationContent(annotation, isSelected)}
            {debugMode && (
              <div className="absolute bottom-0 left-0 bg-yellow-400 text-black text-[10px] px-1 py-0.5 font-mono pointer-events-none">
                {annotation.id.slice(0, 8)} | {annotation.type}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export const AnnotationLayer = memo(AnnotationLayerComponent);

AnnotationLayer.displayName = 'AnnotationLayer';
