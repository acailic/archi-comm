import React, { useRef, useState, useCallback } from 'react';
import { useDrop, useDragLayer } from 'react-dnd';
import { CanvasComponent } from './CanvasComponent';
import { DesignComponent, Connection } from '../App';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2 } from 'lucide-react';

interface DragLayerItem {
  fromId?: string;
  fromComponent?: DesignComponent;
  fromPosition?: 'top' | 'bottom' | 'left' | 'right';
  type?: DesignComponent['type'];
}

interface CanvasAreaProps {
  components: DesignComponent[];
  connections: Connection[];
  selectedComponent: string | null;
  connectionStart: string | null;
  onComponentDrop: (type: DesignComponent['type'], x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string) => void;
  onConnectionLabelChange: (id: string, label: string) => void;
  onConnectionDelete?: (id: string) => void;
  onConnectionTypeChange?: (id: string, type: Connection['type']) => void;
  onStartConnection: (id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
}


const getComponentConnectionPoint = (component: DesignComponent, position: 'top' | 'bottom' | 'left' | 'right') => {
  const width = 128;
  const height = 80;
  switch (position) {
    case 'top': return { x: component.x + width / 2, y: component.y };
    case 'bottom': return { x: component.x + width / 2, y: component.y + height };
    case 'left': return { x: component.x, y: component.y + height / 2 };
    case 'right': return { x: component.x + width, y: component.y + height / 2 };
  }
};

export function CanvasArea({
  components,
  connections,
  selectedComponent,
  connectionStart,
  onComponentDrop,
  onComponentMove,
  onComponentSelect,
  onConnectionLabelChange,
  onConnectionDelete,
  onConnectionTypeChange,
  onStartConnection,
  onCompleteConnection,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'stepped'>('curved');

  function DraggingConnectionPreview() {
    const { item, itemType, currentOffset } = useDragLayer<DragLayerItem>((monitor) => ({
      item: monitor.getItem() as DragLayerItem,
      itemType: monitor.getItemType(),
      currentOffset: monitor.getClientOffset(),
    }));

    // Guard clause to check if item is defined
    if (!item || !currentOffset || itemType !== 'connection-point') {
      return null;
    }

    const { fromComponent, fromPosition } = item;
    if (!fromComponent || !fromPosition) {
      return null;
    }

    const fromPoint = getComponentConnectionPoint(fromComponent, fromPosition);
    
    // Convert canvas-local coordinates to viewport coordinates
    let adjustedFromPoint = fromPoint;
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      adjustedFromPoint = {
        x: fromPoint.x + canvasRect.left,
        y: fromPoint.y + canvasRect.top,
      };
    }

    return (
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <path
          d={`M ${adjustedFromPoint.x} ${adjustedFromPoint.y} L ${currentOffset.x} ${currentOffset.y}`}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
        />
      </svg>
    );
  }

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['component', 'connection-point'],
    drop: (item: any, monitor) => {
      if (monitor.getItemType() === 'component') {
        if (!canvasRef.current) return;
        const offset = monitor.getClientOffset();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        if (offset) {
          const x = offset.x - canvasRect.left;
          const y = offset.y - canvasRect.top;
          onComponentDrop(item.type, x, y);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const getConnectionPoint = useCallback((fromComp: DesignComponent, toComp: DesignComponent) => {
    const fromCenterX = fromComp.x + 64;
    const fromCenterY = fromComp.y + 40;
    const toCenterX = toComp.x + 64;
    const toCenterY = toComp.y + 40;

    const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
    
    const compWidth = 128;
    const compHeight = 80;

    const fromX = fromCenterX + Math.cos(angle) * (compWidth / 2);
    const fromY = fromCenterY + Math.sin(angle) * (compHeight / 2);
    const toX = toCenterX - Math.cos(angle) * (compWidth / 2);
    const toY = toCenterY - Math.sin(angle) * (compHeight / 2);

    return { fromX, fromY, toX, toY };
  }, []);

  const generatePath = useCallback((x1: number, y1: number, x2: number, y2: number, style: string) => {
    switch (style) {
      case 'curved':
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.min(distance * 0.3, 100);
        
        const midX1 = x1 + (dx > 0 ? curvature : -curvature);
        const midX2 = x2 + (dx > 0 ? -curvature : curvature);
        
        return `M ${x1} ${y1} C ${midX1} ${y1}, ${midX2} ${y2}, ${x2} ${y2}`;
      
      case 'stepped':
        const midX = (x1 + x2) / 2;
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
      
      default:
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
  }, []);

  const getConnectionColor = useCallback((connection: Connection) => {
    const colorMap = {
      'data': 'hsl(var(--blue-500))',
      'control': 'hsl(var(--purple-500))',
      'sync': 'hsl(var(--green-500))',
      'async': 'hsl(var(--orange-500))'
    };
    return colorMap[connection.type] || 'hsl(var(--primary))';
  }, []);

  const getConnectionStrokePattern = useCallback((connection: Connection) => {
    return connection.type === 'async' ? '5,5' : undefined;
  }, []);

  const renderConnections = () => {
    return connections.map((connection) => {
      const fromComponent = components.find(c => c.id === connection.from);
      const toComponent = components.find(c => c.id === connection.to);
      
      if (!fromComponent || !toComponent) return null;

      const { fromX, fromY, toX, toY } = getConnectionPoint(fromComponent, toComponent);
      const path = generatePath(fromX, fromY, toX, toY, connectionStyle);
      
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      const isSelected = selectedConnection === connection.id;
      const strokeColor = getConnectionColor(connection);
      const strokeDasharray = getConnectionStrokePattern(connection);

      return (
        <g key={connection.id} className="cursor-pointer">
          <path
            d={path}
            stroke="transparent"
            strokeWidth="12"
            fill="none"
            onClick={() => setSelectedConnection(connection.id)}
          />
          
          <path
            d={path}
            stroke={strokeColor}
            strokeWidth={isSelected ? "3" : "2"}
            strokeDasharray={strokeDasharray}
            fill="none"
            markerEnd={`url(#arrowhead-${connection.type || 'default'})`}
            className={`transition-all duration-200 ${isSelected ? 'drop-shadow-lg' : ''}`}
            onClick={() => setSelectedConnection(connection.id)}
          />

          {connection.type && connection.type !== 'data' && (
            <circle
              cx={fromX + (toX - fromX) * 0.2}
              cy={fromY + (toY - fromY) * 0.2}
              r="6"
              fill={strokeColor}
              className="opacity-80"
            />
          )}

          <foreignObject 
            x={midX - 60} 
            y={midY - 25} 
            width="120" 
            height="50"
            className="pointer-events-auto"
          >
            <div className="flex flex-col items-center space-y-1">
              <input
                className="w-full text-xs text-center bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 shadow-sm"
                value={connection.label}
                onChange={(e) => onConnectionLabelChange(connection.id, e.target.value)}
                placeholder="Connection label"
                onClick={(e) => e.stopPropagation()}
              />
              
              {isSelected && (
                <div className="flex items-center space-x-1">
                  <Select
                    value={connection.type || 'data'}
                    onValueChange={(value) => onConnectionTypeChange?.(connection.id, value as Connection['type'])}
                  >
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="control">Control</SelectItem>
                      <SelectItem value="sync">Sync</SelectItem>
                      <SelectItem value="async">Async</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectionDelete?.(connection.id);
                      setSelectedConnection(null);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </foreignObject>
        </g>
      );
    });
  };

  return (
    <div 
      ref={(node) => {
        canvasRef.current = node;
        drop(node);
      }}
      className={`
        relative w-full h-full bg-muted/10 
        ${isOver ? 'bg-primary/5' : ''}
        transition-colors duration-200
      `}
      style={{ 
        backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <DraggingConnectionPreview />
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5"/>
            </pattern>
            
            <marker id="arrowhead-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" /></marker>
            <marker id="arrowhead-data" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--blue-500))" /></marker>
            <marker id="arrowhead-control" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--purple-500))" /></marker>
            <marker id="arrowhead-sync" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--green-500))" /></marker>
            <marker id="arrowhead-async" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--orange-500))" /></marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-2 bg-card/80 backdrop-blur-xl border border-border/30 rounded-lg p-3 shadow-lg">
          <span className="text-xs text-muted-foreground font-medium">Connection Style:</span>
          <Select value={connectionStyle} onValueChange={(value: any) => setConnectionStyle(value)}>
            <SelectTrigger className="h-8 text-xs bg-background/50 backdrop-blur-sm border-border/20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="straight">Straight</SelectItem>
              <SelectItem value="curved">Curved</SelectItem>
              <SelectItem value="stepped">Stepped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {connections.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-card/80 backdrop-blur-xl border border-border/30 rounded-lg p-4 shadow-lg">
            <h4 className="text-xs font-medium mb-3 text-foreground/90">Connection Types</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3"><div className="w-6 h-0.5 bg-blue-500 rounded-full"></div><span className="text-xs text-muted-foreground">Data Flow</span></div>
              <div className="flex items-center space-x-3"><div className="w-6 h-0.5 bg-purple-500 rounded-full"></div><span className="text-xs text-muted-foreground">Control</span></div>
              <div className="flex items-center space-x-3"><div className="w-6 h-0.5 bg-green-500 rounded-full"></div><span className="text-xs text-muted-foreground">Synchronous</span></div>
              <div className="flex items-center space-x-3"><div className="w-6 h-0.5 bg-orange-500 border-dashed border-t rounded-full"></div><span className="text-xs text-muted-foreground">Asynchronous</span></div>
            </div>
          </div>
        </div>
      )}

      <svg 
        className="absolute inset-0 pointer-events-auto" 
        width="100%" 
        height="100%"
        onClick={(e) => { if (e.target === e.currentTarget) { setSelectedConnection(null); } }}
      >
        {renderConnections()}
      </svg>

      {components.map((component) => (
        <CanvasComponent
          key={component.id}
          component={component}
          isSelected={selectedComponent === component.id}
          isConnectionStart={connectionStart === component.id}
          onMove={onComponentMove}
          onSelect={onComponentSelect}
          onStartConnection={onStartConnection}
          onCompleteConnection={onCompleteConnection}
        />
      ))}

      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 backdrop-blur-xl rounded-xl px-8 py-4 border border-primary/30 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <p className="text-primary font-medium">Drop component here</p>
            </div>
          </div>
        </div>
      )}

      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-8xl mb-6 opacity-60">🎯</div>
            <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-8 border border-border/30 shadow-xl">
              <h3 className="text-xl font-medium mb-3 text-foreground/90">Start Building Your Architecture</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Drag components from the palette to begin designing your system architecture. 
                Connect components to show data flow and relationships.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}