import React, { useRef, useState, useCallback, useMemo, forwardRef, useEffect } from 'react';
import { useDrop, useDragLayer } from 'react-dnd';
import { CanvasComponent } from './CanvasComponent';
import { CanvasAnnotationOverlay, CanvasAnnotationOverlayRef } from './CanvasAnnotationOverlay';
import { AnnotationEditDialog } from './AnnotationEditDialog';
import { DesignComponent, Connection } from '../App';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2 } from 'lucide-react';
import { Annotation } from '../lib/canvas/CanvasAnnotations';
import { getGlobalShortcutManager, ShortcutConfig } from '../lib/shortcuts/KeyboardShortcuts';

// Component dimension constants
const COMPONENT_WIDTH = 128;
const COMPONENT_HEIGHT = 80;

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
  commentMode?: string | null;
  isCommentModeActive?: boolean;
  onComponentDrop: (type: DesignComponent['type'], x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string) => void;
  onConnectionLabelChange: (id: string, label: string) => void;
  onConnectionDelete?: (id: string) => void;
  onConnectionTypeChange?: (id: string, type: Connection['type']) => void;
  onConnectionDirectionChange?: (id: string, direction: Connection['direction']) => void;
  onStartConnection: (id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
}


const getComponentConnectionPoint = (component: DesignComponent, position: 'top' | 'bottom' | 'left' | 'right') => {
  switch (position) {
    case 'top': return { x: component.x + COMPONENT_WIDTH / 2, y: component.y };
    case 'bottom': return { x: component.x + COMPONENT_WIDTH / 2, y: component.y + COMPONENT_HEIGHT };
    case 'left': return { x: component.x, y: component.y + COMPONENT_HEIGHT / 2 };
    case 'right': return { x: component.x + COMPONENT_WIDTH, y: component.y + COMPONENT_HEIGHT / 2 };
  }
};

// Edge intersection utility function
const calculateEdgeIntersection = (fromComp: DesignComponent, toComp: DesignComponent) => {
  const fromCenterX = fromComp.x + COMPONENT_WIDTH / 2;
  const fromCenterY = fromComp.y + COMPONENT_HEIGHT / 2;
  const toCenterX = toComp.x + COMPONENT_WIDTH / 2;
  const toCenterY = toComp.y + COMPONENT_HEIGHT / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  
  // Calculate intersection with 'from' component edge
  const fromSx = COMPONENT_WIDTH / 2;
  const fromSy = COMPONENT_HEIGHT / 2;
  const fromK = 1 / Math.max(Math.abs(dx) / fromSx, Math.abs(dy) / fromSy);
  const fromX = fromCenterX + dx * fromK;
  const fromY = fromCenterY + dy * fromK;
  
  // Calculate intersection with 'to' component edge
  const toSx = COMPONENT_WIDTH / 2;
  const toSy = COMPONENT_HEIGHT / 2;
  const toK = 1 / Math.max(Math.abs(-dx) / toSx, Math.abs(-dy) / toSy);
  const toX = toCenterX - dx * toK;
  const toY = toCenterY - dy * toK;
  
  return { fromX, fromY, toX, toY };
};

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(function CanvasArea({
  components,
  connections,
  selectedComponent,
  connectionStart,
  commentMode,
  isCommentModeActive,
  onComponentDrop,
  onComponentMove,
  onComponentSelect,
  onConnectionLabelChange,
  onConnectionDelete,
  onConnectionTypeChange,
  onConnectionDirectionChange,
  onStartConnection,
  onCompleteConnection,
}, ref) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Comment 1 & 2: Track the actual DOM node in state for reliable event listener attachment
  const [canvasNode, setCanvasNode] = useState<HTMLDivElement | null>(null);
  const annotationOverlayRef = useRef<CanvasAnnotationOverlayRef>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'stepped'>('curved');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Optimized and memoized DraggingConnectionPreview component
  const DraggingConnectionPreview = React.memo(() => {
    const dragLayerData = useDragLayer<DragLayerItem>((monitor) => {
      const currentOffset = monitor.getClientOffset();
      const item = monitor.getItem() as DragLayerItem;
      const itemType = monitor.getItemType();
      
      // Only return primitive values to minimize re-renders
      return {
        isDragging: monitor.isDragging(),
        itemType,
        currentOffset,
        fromComponentId: item?.fromComponent?.id,
        fromComponentX: item?.fromComponent?.x,
        fromComponentY: item?.fromComponent?.y,
        fromPosition: item?.fromPosition,
      };
    });

    const { 
      isDragging, 
      itemType, 
      currentOffset, 
      fromComponentId, 
      fromComponentX, 
      fromComponentY, 
      fromPosition 
    } = dragLayerData;

    // Memoized coordinate calculation to prevent expensive recalculations
    const adjustedFromPoint = useMemo(() => {
      if (!isDragging || itemType !== 'connection-point' || 
          fromComponentX === undefined || fromComponentY === undefined || !fromPosition) {
        return null;
      }

      // Create a temporary component object for the edge intersection calculation
      const fromComponent: DesignComponent = {
        id: 'temp-from',
        type: 'server',
        x: fromComponentX,
        y: fromComponentY,
        label: 'temp'
      };
      
      // Calculate connection point using the same utility as main rendering
      const fromPoint = getComponentConnectionPoint(fromComponent, fromPosition);

      // Convert canvas-local coordinates to viewport coordinates
      if (canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        return {
          x: fromPoint.x + canvasRect.left,
          y: fromPoint.y + canvasRect.top,
        };
      }
      
      return fromPoint;
    }, [isDragging, itemType, fromComponentX, fromComponentY, fromPosition]);

    // Early return with guard clauses
    if (!isDragging || !currentOffset || itemType !== 'connection-point' || !adjustedFromPoint) {
      return null;
    }

    // Memoized path calculation
    const pathData = `M ${adjustedFromPoint.x} ${adjustedFromPoint.y} L ${currentOffset.x} ${currentOffset.y}`;

    return (
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <path
          d={pathData}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
        />
      </svg>
    );
  });

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['component', 'connection-point'],
    drop: (item: any, monitor) => {
      try {
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
      } catch (error) {
        console.error('Error during drag-and-drop operation:', error);
        // Optionally, provide user feedback here (e.g., toast notification)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const getConnectionPoint = useCallback((fromComp: DesignComponent, toComp: DesignComponent) => {
    return calculateEdgeIntersection(fromComp, toComp);
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
      'data': 'hsl(var(--blue-500, 210 100% 50%))',
      'control': 'hsl(var(--purple-500, 262 100% 50%))',
      'sync': 'hsl(var(--green-500, 120 100% 40%))',
      'async': 'hsl(var(--orange-500, 25 100% 50%))'
    };
    return colorMap[connection.type] || 'hsl(var(--primary, 203 12% 15%))';
  }, []);

  const getConnectionStrokePattern = useCallback((connection: Connection) => {
    return connection.type === 'async' ? '5,5' : undefined;
  }, []);

  const getConnectionMarkers = useCallback((connection: Connection) => {
    const direction = connection.direction || 'end';
    const type = connection.type || 'default';
    
    switch (direction) {
      case 'none':
        return { markerStart: undefined, markerEnd: undefined };
      case 'both':
        return { 
          markerStart: `url(#arrowhead-start-${type})`, 
          markerEnd: `url(#arrowhead-${type})` 
        };
      case 'end':
      default:
        return { markerStart: undefined, markerEnd: `url(#arrowhead-${type})` };
    }
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
      const { markerStart, markerEnd } = getConnectionMarkers(connection);

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
            strokeOpacity="1"
            fill="none"
            markerStart={markerStart}
            markerEnd={markerEnd}
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
                <div className="flex flex-col items-center space-y-1">
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
                  
                  <Select
                    value={connection.direction || 'end'}
                    onValueChange={(value) => onConnectionDirectionChange?.(connection.id, value as Connection['direction'])}
                  >
                    <SelectTrigger className="h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No arrows</SelectItem>
                      <SelectItem value="end">End arrow</SelectItem>
                      <SelectItem value="both">Both arrows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </foreignObject>
        </g>
      );
    });
  };

  // Canvas-specific keyboard shortcuts integration
  useEffect(() => {
    const handleSelectAll = () => {
      const allComponentIds = components.map(comp => comp.id);
      setSelectedItems(allComponentIds);
    };

    const handleClearSelection = () => {
      setSelectedItems([]);
      setSelectedConnection(null);
      onComponentSelect('');
    };

    const handleDeleteSelected = () => {
      if (selectedConnection && onConnectionDelete) {
        onConnectionDelete(selectedConnection);
        setSelectedConnection(null);
      }
    };

    const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev * 1.2, 3));
    };

    const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
    };

    const handleZoomReset = () => {
      setZoomLevel(1);
    };

    const handleMoveUp = () => {
      if (selectedComponent) {
        const component = components.find(c => c.id === selectedComponent);
        if (component) {
          onComponentMove(selectedComponent, component.x, component.y - 10);
        }
      }
    };

    const handleMoveDown = () => {
      if (selectedComponent) {
        const component = components.find(c => c.id === selectedComponent);
        if (component) {
          onComponentMove(selectedComponent, component.x, component.y + 10);
        }
      }
    };

    const handleMoveLeft = () => {
      if (selectedComponent) {
        const component = components.find(c => c.id === selectedComponent);
        if (component) {
          onComponentMove(selectedComponent, component.x - 10, component.y);
        }
      }
    };

    const handleMoveRight = () => {
      if (selectedComponent) {
        const component = components.find(c => c.id === selectedComponent);
        if (component) {
          onComponentMove(selectedComponent, component.x + 10, component.y);
        }
      }
    };

    // Add event listeners for canvas-specific shortcuts
    window.addEventListener('shortcut:select-all', handleSelectAll);
    window.addEventListener('shortcut:clear-selection', handleClearSelection);
    window.addEventListener('shortcut:delete-selected', handleDeleteSelected);
    window.addEventListener('shortcut:zoom-in', handleZoomIn);
    window.addEventListener('shortcut:zoom-out', handleZoomOut);
    window.addEventListener('shortcut:zoom-reset', handleZoomReset);
    window.addEventListener('shortcut:move-up', handleMoveUp);
    window.addEventListener('shortcut:move-down', handleMoveDown);
    window.addEventListener('shortcut:move-left', handleMoveLeft);
    window.addEventListener('shortcut:move-right', handleMoveRight);

    return () => {
      // Cleanup event listeners
      window.removeEventListener('shortcut:select-all', handleSelectAll);
      window.removeEventListener('shortcut:clear-selection', handleClearSelection);
      window.removeEventListener('shortcut:delete-selected', handleDeleteSelected);
      window.removeEventListener('shortcut:zoom-in', handleZoomIn);
      window.removeEventListener('shortcut:zoom-out', handleZoomOut);
      window.removeEventListener('shortcut:zoom-reset', handleZoomReset);
      window.removeEventListener('shortcut:move-up', handleMoveUp);
      window.removeEventListener('shortcut:move-down', handleMoveDown);
      window.removeEventListener('shortcut:move-left', handleMoveLeft);
      window.removeEventListener('shortcut:move-right', handleMoveRight);
    };
  }, [components, selectedComponent, selectedConnection, onComponentMove, onConnectionDelete, onComponentSelect]);

  // Annotation event handlers
  const handleAnnotationCreate = useCallback((annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
  }, []);

  const handleAnnotationUpdate = useCallback((updatedAnnotation: Annotation) => {
    setAnnotations(prev => 
      prev.map(ann => ann.id === updatedAnnotation.id ? updatedAnnotation : ann)
    );
    setSelectedAnnotation(null);
    setIsEditDialogOpen(false);
  }, []);

  const handleAnnotationDelete = useCallback((annotationId: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
    setSelectedAnnotation(null);
    setIsEditDialogOpen(false);
  }, []);

  const handleAnnotationSelect = useCallback((annotation: Annotation | null) => {
    setSelectedAnnotation(annotation);
  }, []);

  // Handle edit annotation events from overlay
  useEffect(() => {
    if (!canvasNode) return;
    const handleEditAnnotation = (event: CustomEvent) => {
      const annotation = event.detail as Annotation;
      setSelectedAnnotation(annotation);
      setIsEditDialogOpen(true);
    };
    canvasNode.addEventListener('editAnnotation', handleEditAnnotation as EventListener);
    return () => {
      canvasNode.removeEventListener('editAnnotation', handleEditAnnotation as EventListener);
    };
  }, [canvasNode]);

  return (
    <div 
      data-testid="canvas"
      ref={(node) => {
        canvasRef.current = node;
        setCanvasNode(node); // Comment 2: update state with DOM node
        drop(node);
        if (ref) {
          if (typeof ref === 'function') {
            ref(node);
          } else {
            ref.current = node;
          }
        }
      }}
      className={`
        relative w-full h-full bg-muted/10 
        ${isOver ? 'bg-primary/5' : ''}
        transition-colors duration-200
      `}
      style={{ 
        backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        transform: `scale(${zoomLevel})`,
        transformOrigin: '50% 50%'
      }}
    >
      <DraggingConnectionPreview />
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5"/>
            </pattern>
            
            <marker id="arrowhead-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary, 203 12% 15%))" /></marker>
            <marker id="arrowhead-data" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--blue-500, 210 100% 50%))" /></marker>
            <marker id="arrowhead-control" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--purple-500, 262 100% 50%))" /></marker>
            <marker id="arrowhead-sync" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--green-500, 120 100% 40%))" /></marker>
            <marker id="arrowhead-async" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--orange-500, 25 100% 50%))" /></marker>
            
            <marker id="arrowhead-start-default" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="hsl(var(--primary, 203 12% 15%))" /></marker>
            <marker id="arrowhead-start-data" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="hsl(var(--blue-500, 210 100% 50%))" /></marker>
            <marker id="arrowhead-start-control" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="hsl(var(--purple-500, 262 100% 50%))" /></marker>
            <marker id="arrowhead-start-sync" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="hsl(var(--green-500, 120 100% 40%))" /></marker>
            <marker id="arrowhead-start-async" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="hsl(var(--orange-500, 25 100% 50%))" /></marker>
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

      {/* Annotation Overlay */}
      <CanvasAnnotationOverlay
        ref={annotationOverlayRef}
        width={canvasRef.current?.clientWidth || 0}
        height={canvasRef.current?.clientHeight || 0}
        selectedTool={commentMode || undefined}
        isActive={isCommentModeActive || false}
        onAnnotationCreate={handleAnnotationCreate}
        onAnnotationUpdate={handleAnnotationUpdate}
        onAnnotationDelete={handleAnnotationDelete}
        onAnnotationSelect={handleAnnotationSelect}
      />

      {/* Annotation Edit Dialog */}
      <AnnotationEditDialog
        annotation={selectedAnnotation}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedAnnotation(null);
        }}
        onSave={handleAnnotationUpdate}
        onDelete={handleAnnotationDelete}
      />
    </div>
  );
});
