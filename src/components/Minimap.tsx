import React, { useCallback, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { Plus, Minus } from 'lucide-react';
import type { DesignComponent, Connection, Layer } from '../App';
import { 
  useOptimizedCallback, 
  useOptimizedMemo 
} from '../lib/performance/PerformanceOptimizer';

export interface ViewportInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  worldWidth: number;
  worldHeight: number;
}

interface MinimapProps {
  components: DesignComponent[];
  connections: Connection[];
  layers: Layer[];
  viewport: ViewportInfo;
  canvasExtents: { width: number; height: number };
  onPanTo: (x: number, y: number) => void;
  onZoomTo: (zoom: number, centerX?: number, centerY?: number) => void;
}

const MINIMAP_WIDTH = 300;
const MINIMAP_HEIGHT = 200;
const VIEWPORT_PADDING = 20;

const getComponentColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'api-gateway': '#3b82f6',
    'microservice': '#10b981',
    'database': '#f59e0b',
    'cache': '#ef4444',
    'queue': '#8b5cf6',
    'cdn': '#06b6d4',
    'load-balancer': '#84cc16',
    'storage': '#f97316',
    'auth-service': '#ec4899',
    'monitoring': '#6b7280'
  };
  return colorMap[type] || '#6b7280';
};

export function Minimap({ 
  components, 
  connections, 
  layers, 
  viewport, 
  canvasExtents,
  onPanTo, 
  onZoomTo 
}: MinimapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const visibleComponents = useOptimizedMemo(() => {
    const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));
    return components.filter(c => !c.layerId || visibleLayerIds.has(c.layerId));
  }, [components, layers]);

  const visibleConnections = useOptimizedMemo(() => {
    const visibleComponentIds = new Set(visibleComponents.map(c => c.id));
    return connections.filter(conn => 
      visibleComponentIds.has(conn.from) && visibleComponentIds.has(conn.to)
    );
  }, [connections, visibleComponents]);

  const scale = useMemo(() => {
    if (canvasExtents.width === 0 || canvasExtents.height === 0) return 1;
    
    const scaleX = (MINIMAP_WIDTH - VIEWPORT_PADDING * 2) / canvasExtents.width;
    const scaleY = (MINIMAP_HEIGHT - VIEWPORT_PADDING * 2) / canvasExtents.height;
    return Math.min(scaleX, scaleY, 1);
  }, [canvasExtents]);

  const scaledViewport = useMemo(() => ({
    x: viewport.x * scale + VIEWPORT_PADDING,
    y: viewport.y * scale + VIEWPORT_PADDING,
    width: viewport.width * scale,
    height: viewport.height * scale
  }), [viewport, scale]);

  const handleMinimapClick = useOptimizedCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - VIEWPORT_PADDING;
    const y = event.clientY - rect.top - VIEWPORT_PADDING;
    
    const worldX = Math.max(0, Math.min(canvasExtents.width, x / scale));
    const worldY = Math.max(0, Math.min(canvasExtents.height, y / scale));
    
    onPanTo(worldX, worldY);
  }, [scale, canvasExtents, onPanTo]);

  const handleZoomIn = useOptimizedCallback(() => {
    const newZoom = Math.min(viewport.zoom * 1.2, 3);
    onZoomTo(newZoom, viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  }, [viewport, onZoomTo]);

  const handleZoomOut = useOptimizedCallback(() => {
    const newZoom = Math.max(viewport.zoom * 0.8, 0.1);
    onZoomTo(newZoom, viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  }, [viewport, onZoomTo]);

  const renderedComponents = useMemo(() => {
    return visibleComponents.map(component => {
      const x = component.x * scale + VIEWPORT_PADDING;
      const y = component.y * scale + VIEWPORT_PADDING;
      const width = Math.max(2, 200 * scale);
      const height = Math.max(2, 120 * scale);
      
      return (
        <rect
          key={component.id}
          x={x}
          y={y}
          width={width}
          height={height}
          fill={getComponentColor(component.type)}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={0.5}
          rx={Math.max(1, 4 * scale)}
        />
      );
    });
  }, [visibleComponents, scale]);

  const renderedConnections = useMemo(() => {
    return visibleConnections.map(connection => {
      const fromComponent = components.find(c => c.id === connection.from);
      const toComponent = components.find(c => c.id === connection.to);
      
      if (!fromComponent || !toComponent) return null;
      
      const fromX = (fromComponent.x + 100) * scale + VIEWPORT_PADDING;
      const fromY = (fromComponent.y + 60) * scale + VIEWPORT_PADDING;
      const toX = (toComponent.x + 100) * scale + VIEWPORT_PADDING;
      const toY = (toComponent.y + 60) * scale + VIEWPORT_PADDING;
      
      return (
        <line
          key={connection.id}
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke="rgba(156, 163, 175, 0.6)"
          strokeWidth={Math.max(0.5, 1 * scale)}
          strokeDasharray={connection.type === 'async' ? `${2 * scale} ${2 * scale}` : undefined}
        />
      );
    });
  }, [visibleConnections, components, scale]);

  return (
    <div className="w-full h-full bg-card border border-border rounded-lg overflow-hidden relative">
      <svg
        ref={svgRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-crosshair"
        onClick={handleMinimapClick}
      >
        <rect
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          fill="hsl(var(--muted))"
          opacity={0.3}
        />
        
        {renderedConnections}
        {renderedComponents}
        
        <rect
          x={scaledViewport.x}
          y={scaledViewport.y}
          width={scaledViewport.width}
          height={scaledViewport.height}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.8}
        />
      </svg>
      
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <Minus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}
