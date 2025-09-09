import React, { useEffect, useMemo, useRef } from 'react';
import type { Connection, DesignComponent } from '@/shared/contracts';
import { CanvasOptimizer } from '@/lib/performance/PerformanceOptimizer';

type StyleType = 'straight' | 'curved' | 'stepped';

interface Props {
  width: number;
  height: number;
  zoom: number;
  viewport: { x: number; y: number; width: number; height: number };
  connections: Connection[];
  components: DesignComponent[];
  connectionStyle: StyleType;
  getConnectionColor: (c: Connection) => string;
  getConnectionStrokePattern?: (c: Connection) => string | undefined;
  onSelectConnection?: (id: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export const CanvasConnectionLayer: React.FC<Props> = ({
  width,
  height,
  zoom,
  viewport,
  connections,
  components,
  connectionStyle,
  getConnectionColor,
  onSelectConnection,
  style,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const optimizerRef = useRef<CanvasOptimizer | null>(null);
  const hitRegions = useRef<Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>>([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    optimizerRef.current = new CanvasOptimizer(canvasRef.current);
  }, []);

  const compIndex = useMemo(() => {
    const map = new Map<string, DesignComponent>();
    components.forEach(c => map.set(c.id, c));
    return map;
  }, [components]);

  function getEndpoints(from: DesignComponent, to: DesignComponent) {
    const fromX = from.x + 110; // approx half width
    const fromY = from.y + 70; // approx half height
    const toX = to.x + 110;
    const toY = to.y + 70;
    return { x1: fromX, y1: fromY, x2: toX, y2: toY };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform to align with viewport
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-viewport.x, -viewport.y);

    hitRegions.current = [];

    connections.forEach(conn => {
      const from = compIndex.get(conn.from);
      const to = compIndex.get(conn.to);
      if (!from || !to) return;
      const { x1, y1, x2, y2 } = getEndpoints(from, to);

      ctx.beginPath();
      switch (connectionStyle) {
        case 'curved': {
          const dx = x2 - x1;
          const distance = Math.hypot(x2 - x1, y2 - y1);
          const curvature = Math.min(distance * 0.3, 100);
          const c1x = x1 + (dx > 0 ? curvature : -curvature);
          const c2x = x2 + (dx > 0 ? -curvature : curvature);
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo(c1x, y1, c2x, y2, x2, y2);
          break;
        }
        case 'stepped': {
          const midX = (x1 + x2) / 2;
          ctx.moveTo(x1, y1);
          ctx.lineTo(midX, y1);
          ctx.lineTo(midX, y2);
          ctx.lineTo(x2, y2);
          break;
        }
        default: {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
      }
      ctx.strokeStyle = getConnectionColor(conn);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.stroke();

      hitRegions.current.push({ id: conn.id, x1, y1, x2, y2 });
    });

    ctx.restore();
  }, [width, height, zoom, viewport, connections, compIndex, connectionStyle, getConnectionColor]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectConnection) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom + viewport.x;
    const y = (e.clientY - rect.top) / zoom + viewport.y;

    const threshold = 6; // px
    for (let i = hitRegions.current.length - 1; i >= 0; i--) {
      const { id, x1, y1, x2, y2 } = hitRegions.current[i];
      // distance from point to segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const dist = Math.hypot(x - px, y - py);
      if (dist <= threshold) {
        onSelectConnection(id);
        break;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', ...style }}
      width={width}
      height={height}
      onClick={handleClick}
    />
  );
};

