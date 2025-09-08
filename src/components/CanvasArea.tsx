import React, { useRef, useState, useCallback, useMemo, forwardRef, useEffect, Suspense } from 'react';
import { useDrop, useDragLayer } from 'react-dnd';
import { CanvasComponent } from './CanvasComponent';
import { AnnotationEditDialog } from './AnnotationEditDialog';
import { DesignComponent, Connection } from '../App';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2 } from 'lucide-react';
import { Annotation } from '../lib/canvas/CanvasAnnotations';
import { getGlobalShortcutManager, ShortcutConfig } from '../lib/shortcuts/KeyboardShortcuts';
import { 
  useOptimizedCallback, 
  useOptimizedMemo, 
  useStableReference,
  useVirtualizedList
} from '../lib/performance/PerformanceOptimizer';
import { useUXTracker } from '../hooks/useUXTracker';

// Lazy load heavy performance components
const LazyCanvasAnnotationOverlay = React.lazy(() => import('./CanvasAnnotationOverlay').then(m => ({ default: m.CanvasAnnotationOverlay })));

// Lightweight loading indicator for canvas initialization
const CanvasInitializingState = () => (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <span className="text-sm text-muted-foreground">Initializing canvas...</span>
    </div>
  </div>
);

// Constants for performance thresholds
const COMPONENT_WIDTH = 200;
const COMPONENT_HEIGHT = 120;
const COMPONENT_VIRTUALIZATION_THRESHOLD = 50;
const VIRTUALIZATION_THRESHOLD = 100;

// Performance optimization hooks
const useLightweightCanvas = () => {
  const [isFullyInitialized, setIsFullyInitialized] = useState(false);
  const [performanceMonitor, setPerformanceMonitor] = useState<any>(null);
  const [memoryOptimizer, setMemoryOptimizer] = useState<any>(null);
  const [optimizedEventSystem, setOptimizedEventSystem] = useState<any>(null);
  
  const initializePerformanceUtils = useCallback(async () => {
    if (!performanceMonitor) {
      const { PerformanceMonitor, MemoryOptimizer, OptimizedEventSystem } = await import('../lib/performance/PerformanceOptimizer');
      setPerformanceMonitor(PerformanceMonitor.getInstance());
      setMemoryOptimizer(MemoryOptimizer);
      setOptimizedEventSystem(new OptimizedEventSystem());
      setIsFullyInitialized(true);
    }
  }, [performanceMonitor]);
  
  return {
    isFullyInitialized,
    performanceMonitor,
    memoryOptimizer, 
    optimizedEventSystem,
    initializePerformanceUtils
  };
};

const useCanvasInteraction = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  
  const markInteraction = useCallback(() => {
    setHasInteracted(true);
    setInteractionCount(prev => prev + 1);
  }, []);
  
  return { hasInteracted, interactionCount, markInteraction };
};

const useVirtualizationThreshold = (componentCount: number) => {
  return useMemo(() => {
    return componentCount > COMPONENT_VIRTUALIZATION_THRESHOLD;
  }, [componentCount]);
};

interface CanvasAreaProps {
  components: DesignComponent[];
  connections: Connection[];
  selectedComponent: string | null;
  connectionStart: string | null;
  commentMode?: string | null;
  isCommentModeActive?: boolean;
  onComponentDrop: (type: string, x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string) => void;
  onConnectionLabelChange?: (id: string, label: string) => void;
  onConnectionDelete?: (id: string) => void;
  onConnectionTypeChange?: (id: string, type: Connection['type']) => void;
  onConnectionDirectionChange?: (id: string, direction: Connection['direction']) => void;
  onStartConnection: (id: string) => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
}

interface DragLayerItem {
  fromComponent?: DesignComponent;
  fromPosition?: 'top' | 'bottom' | 'left' | 'right';
}

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
  const [canvasNode, setCanvasNode] = useState<HTMLDivElement | null>(null);
  const annotationOverlayRef = useRef<any>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'stepped'>('curved');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  
  // Progressive performance optimization
  const { isFullyInitialized, performanceMonitor, memoryOptimizer, optimizedEventSystem, initializePerformanceUtils } = useLightweightCanvas();
  const { hasInteracted, interactionCount, markInteraction } = useCanvasInteraction();
  const shouldUseVirtualization = useVirtualizationThreshold(components.length);
  
  // UX Tracking integration
  const { trackCanvasAction, trackKeyboardShortcut, trackPerformance } = useUXTracker();

  // Use stable references for complex objects to prevent unnecessary re-renders
  const stableComponents = useStableReference(components);
  const stableConnections = useStableReference(connections);

  // Initialize performance utils on first interaction
  useEffect(() => {
    if (hasInteracted && !isFullyInitialized) {
      initializePerformanceUtils();
    }
  }, [hasInteracted, isFullyInitialized, initializePerformanceUtils]);

  // Memoized connection point calculation for performance
  const getComponentConnectionPoint = useMemo(() => {
    if (memoryOptimizer?.memoizeWeak) {
      return memoryOptimizer.memoizeWeak(
        (component: DesignComponent, position: 'top' | 'bottom' | 'left' | 'right') => {
          switch (position) {
            case 'top': return { x: component.x + COMPONENT_WIDTH / 2, y: component.y };
            case 'bottom': return { x: component.x + COMPONENT_WIDTH / 2, y: component.y + COMPONENT_HEIGHT };
            case 'left': return { x: component.x, y: component.y + COMPONENT_HEIGHT / 2 };
            case 'right': return { x: component.x + COMPONENT_WIDTH, y: component.y + COMPONENT_HEIGHT / 2 };
          }
        },
        (component, position) => `${component.id}-${component.x}-${component.y}-${position}`
      );
    }
    // Fallback for when performance utils aren't loaded yet
    return (component: DesignComponent, position: 'top' | 'bottom' | 'left' | 'right') => {
      switch (position) {
        case 'top': return { x: component.x + COMPONENT_WIDTH / 2, y: component.y };
        case 'bottom': return { x: component.x + COMPONENT_WIDTH / 2, y: component.y + COMPONENT_HEIGHT };
        case 'left': return { x: component.x, y: component.y + COMPONENT_HEIGHT / 2 };
        case 'right': return { x: component.x + COMPONENT_WIDTH, y: component.y + COMPONENT_HEIGHT / 2 };
      }
    };
  }, [memoryOptimizer]);

  // Optimized edge intersection utility function with conditional memoization
  const calculateEdgeIntersection = useMemo(() => {
    const baseFunction = (fromComp: DesignComponent, toComp: DesignComponent) => {
      const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
      return measureFn('edge-intersection', () => {
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
      });
    };
    
    if (memoryOptimizer?.memoizeWeak) {
      return memoryOptimizer.memoizeWeak(
        baseFunction,
        (fromComp, toComp) => `${fromComp.id}-${fromComp.x}-${fromComp.y}-${toComp.id}-${toComp.x}-${toComp.y}`
      );
    }
    
    return baseFunction;
  }, [memoryOptimizer, performanceMonitor]);

  // DND drop handling
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['component', 'connection-point'],
    drop: (item: any, monitor) => {
      markInteraction(); // Mark that user has interacted
      const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
      measureFn('drag-drop-operation', () => {
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
        }
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [markInteraction, performanceMonitor]);

  // Path generation for connections
  const generatePath = useOptimizedCallback((x1: number, y1: number, x2: number, y2: number, style: string) => {
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    return measureFn('path-generation', () => {
      // Use object pooling if available, otherwise generate directly
      const pathFactory = () => {
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
      };
      
      if (memoryOptimizer?.poolObject) {
        return memoryOptimizer.poolObject('svg-path', pathFactory);
      }
      
      return pathFactory();
    });
  }, [performanceMonitor, memoryOptimizer]);

  // Connection styling utilities
  const getConnectionColor = useOptimizedMemo(() => {
    const colorMap = {
      'data': 'hsl(var(--blue-500, 210 100% 50%))',
      'control': 'hsl(var(--purple-500, 262 100% 50%))',
      'sync': 'hsl(var(--green-500, 120 100% 40%))',
      'async': 'hsl(var(--orange-500, 25 100% 50%))'
    };
    return (connection: Connection) => colorMap[connection.type] || 'hsl(var(--primary, 203 12% 15%))';
  }, []);

  const getConnectionStrokePattern = useOptimizedMemo(() => {
    return (connection: Connection) => connection.type === 'async' ? '5,5' : undefined;
  }, []);

  // Virtualized connection rendering for large datasets
  const renderConnections = useOptimizedMemo(() => {
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    return measureFn('connection-rendering', () => {
      const connectionsToRender = stableConnections.length > VIRTUALIZATION_THRESHOLD 
        ? stableConnections.filter(connection => {
            // Viewport culling for connections
            const fromComponent = stableComponents.find(c => c.id === connection.from);
            const toComponent = stableComponents.find(c => c.id === connection.to);
            
            if (!fromComponent || !toComponent) return false;
            
            // Simple viewport intersection check
            const minX = Math.min(fromComponent.x, toComponent.x);
            const maxX = Math.max(fromComponent.x + COMPONENT_WIDTH, toComponent.x + COMPONENT_WIDTH);
            const minY = Math.min(fromComponent.y, toComponent.y);
            const maxY = Math.max(fromComponent.y + COMPONENT_HEIGHT, toComponent.y + COMPONENT_HEIGHT);
            
            return !(maxX < viewportBounds.x || minX > viewportBounds.x + viewportBounds.width ||
                    maxY < viewportBounds.y || minY > viewportBounds.y + viewportBounds.height);
          })
        : stableConnections;

      return connectionsToRender.map((connection) => {
        const fromComponent = stableComponents.find(c => c.id === connection.from);
        const toComponent = stableComponents.find(c => c.id === connection.to);
        
        if (!fromComponent || !toComponent) return null;

        const { fromX, fromY, toX, toY } = calculateEdgeIntersection(fromComponent, toComponent);
        const path = generatePath(fromX, fromY, toX, toY, connectionStyle);
        
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;

        const isSelected = selectedConnection === connection.id;
        const strokeColor = getConnectionColor(connection);
        const strokeDasharray = getConnectionStrokePattern(connection);

        // Level-of-detail rendering for distant connections
        const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const isDetailed = distance < 500 || isSelected || zoomLevel > 0.8;

        return (
          <g key={connection.id} className="cursor-pointer">
            <path
              d={path}
              stroke="transparent"
              strokeWidth="12"
              fill="none"
              onClick={() => {
                const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
                measureFn('connection-selection', () => setSelectedConnection(connection.id));
              }}
            />
            
            <path
              d={path}
              stroke={strokeColor}
              strokeWidth={isSelected ? "3" : "2"}
              strokeDasharray={strokeDasharray}
              strokeOpacity="1"
              fill="none"
              className={`transition-all duration-200 ${isSelected ? 'drop-shadow-lg' : ''}`}
              onClick={() => {
                const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
                measureFn('connection-selection', () => setSelectedConnection(connection.id));
              }}
            />

            {isDetailed && connection.type && connection.type !== 'data' && (
              <circle
                cx={fromX + (toX - fromX) * 0.2}
                cy={fromY + (toY - fromY) * 0.2}
                r="6"
                fill={strokeColor}
                className="opacity-80"
              />
            )}

            {isDetailed && (
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
                    onChange={(e) => onConnectionLabelChange?.(connection.id, e.target.value)}
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
                            const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
                            measureFn('connection-deletion', () => {
                              onConnectionDelete?.(connection.id);
                              setSelectedConnection(null);
                              // Release pooled objects for deleted connection if available
                              if (memoryOptimizer?.releaseObject) {
                                memoryOptimizer.releaseObject('svg-path', path);
                              }
                            });
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
            )}
          </g>
        );
      });
    });
  }, [stableConnections, stableComponents, connectionStyle, selectedConnection, zoomLevel, viewportBounds, calculateEdgeIntersection, generatePath, getConnectionColor, getConnectionStrokePattern, onConnectionLabelChange, onConnectionTypeChange, onConnectionDelete, onConnectionDirectionChange, performanceMonitor, memoryOptimizer]);

  // Conditional virtualized component rendering for large datasets
  const virtualizedComponents = useVirtualizedList(
    shouldUseVirtualization ? stableComponents : [],
    COMPONENT_HEIGHT + 20, // Include margin
    canvasRef.current?.clientHeight || 0
  );

  // Optimized annotation event handlers with conditional performance monitoring
  const handleAnnotationCreate = useOptimizedCallback((annotation: Annotation) => {
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    measureFn('annotation-create', () => {
      setAnnotations(prev => [...prev, annotation]);
    });
  }, [performanceMonitor]);

  const handleAnnotationUpdate = useOptimizedCallback((updatedAnnotation: Annotation) => {
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    measureFn('annotation-update', () => {
      setAnnotations(prev => 
        prev.map(ann => ann.id === updatedAnnotation.id ? updatedAnnotation : ann)
      );
      setSelectedAnnotation(null);
      setIsEditDialogOpen(false);
    });
  }, [performanceMonitor]);

  const handleAnnotationDelete = useOptimizedCallback((annotationId: string) => {
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    measureFn('annotation-delete', () => {
      setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
      setSelectedAnnotation(null);
      setIsEditDialogOpen(false);
    });
  }, [performanceMonitor]);

  const handleAnnotationSelect = useOptimizedCallback((annotation: Annotation | null) => {
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    measureFn('annotation-select', () => {
      setSelectedAnnotation(annotation);
    });
  }, [performanceMonitor]);

  // Optimized keyboard shortcuts with conditional performance monitoring
  useEffect(() => {
    if (!optimizedEventSystem) return; // Only initialize when event system is loaded
    
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    
    const handleSelectAll = () => {
      measureFn('select-all-operation', () => {
        const allComponentIds = stableComponents.map(comp => comp.id);
        setSelectedItems(allComponentIds);
      });
    };

    const handleClearSelection = () => {
      measureFn('clear-selection-operation', () => {
        setSelectedItems([]);
        setSelectedConnection(null);
        onComponentSelect('');
      });
    };

    const handleDeleteSelected = () => {
      measureFn('delete-selected-operation', () => {
        if (selectedConnection && onConnectionDelete) {
          onConnectionDelete(selectedConnection);
          setSelectedConnection(null);
        }
      });
    };

    const handleZoomIn = () => {
      measureFn('zoom-operation', () => {
        setZoomLevel(prev => Math.min(prev * 1.2, 3));
      });
    };

    const handleZoomOut = () => {
      measureFn('zoom-operation', () => {
        setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
      });
    };

    const handleZoomReset = () => {
      measureFn('zoom-operation', () => {
        setZoomLevel(1);
      });
    };

    // Use optimized event system for better performance
    const cleanupFunctions = [
      optimizedEventSystem.addEventListener(window, 'shortcut:select-all', handleSelectAll),
      optimizedEventSystem.addEventListener(window, 'shortcut:clear-selection', handleClearSelection),
      optimizedEventSystem.addEventListener(window, 'shortcut:delete-selected', handleDeleteSelected),
      optimizedEventSystem.addEventListener(window, 'shortcut:zoom-in', handleZoomIn),
      optimizedEventSystem.addEventListener(window, 'shortcut:zoom-out', handleZoomOut),
      optimizedEventSystem.addEventListener(window, 'shortcut:zoom-reset', handleZoomReset),
    ];

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [stableComponents, selectedConnection, onConnectionDelete, onComponentSelect, optimizedEventSystem, performanceMonitor]);

  // Handle edit annotation events from overlay with conditional optimized event system
  useEffect(() => {
    if (!canvasNode || !optimizedEventSystem) return;
    
    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());
    
    const handleEditAnnotation = (event: CustomEvent) => {
      measureFn('annotation-edit-trigger', () => {
        const annotation = event.detail as Annotation;
        setSelectedAnnotation(annotation);
        setIsEditDialogOpen(true);
      });
    };

    const cleanup = optimizedEventSystem.addEventListener(
      canvasNode, 
      'editAnnotation', 
      handleEditAnnotation as EventListener
    );

    return cleanup;
  }, [canvasNode, optimizedEventSystem, performanceMonitor]);

  // Performance monitoring for canvas operations with conditional loading
  useEffect(() => {
    if (!canvasRef.current || !optimizedEventSystem) return;

    const measureFn = performanceMonitor?.measure || ((name: string, fn: () => any) => fn());

    const handleMouseMove = (event: MouseEvent) => {
      // Throttled mouse move for performance
      measureFn('canvas-mouse-interaction', () => {
        markInteraction(); // Track interaction
        // Update viewport bounds for intersection calculations
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (event.clientX - rect.left) / zoomLevel;
        const y = (event.clientY - rect.top) / zoomLevel;
        
        // Update viewport bounds if significantly changed
        if (Math.abs(x - viewportBounds.x) > 50 || Math.abs(y - viewportBounds.y) > 50) {
          setViewportBounds(prev => ({
            ...prev,
            x: x - prev.width / 2,
            y: y - prev.height / 2
          }));
        }
      });
    };

    const cleanup = optimizedEventSystem.addEventListener(
      canvasRef.current,
      'mousemove',
      handleMouseMove
    );

    return cleanup;
  }, [zoomLevel, viewportBounds, optimizedEventSystem, performanceMonitor, markInteraction]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      // Release all pooled objects if memory optimizer is available
      if (memoryOptimizer?.releaseObject) {
        stableConnections.forEach(connection => {
          memoryOptimizer.releaseObject('svg-path', connection.id);
        });
      }
      
      // Cleanup intersection observer
      intersectionObserverRef.current?.disconnect();
    };
  }, [stableConnections, memoryOptimizer]);

  // Optimized dragging connection preview component
  const DraggingConnectionPreview = React.memo(() => {
    const dragLayerData = useDragLayer<DragLayerItem>((monitor) => {
      const currentOffset = monitor.getClientOffset();
      const item = monitor.getItem() as DragLayerItem;
      const itemType = monitor.getItemType();
      
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
      fromComponentX, 
      fromComponentY, 
      fromPosition 
    } = dragLayerData;

    // Early return with guard clauses
    if (!isDragging || !currentOffset || itemType !== 'connection-point' || 
        fromComponentX === undefined || fromComponentY === undefined || !fromPosition) {
      return null;
    }

    // Calculate connection point
    const fromComponent: DesignComponent = {
      id: 'temp-from',
      type: 'server',
      x: fromComponentX,
      y: fromComponentY,
      label: 'temp'
    };
    
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

  // Connection refs for imperative access
  React.useImperativeHandle(ref, () => canvasRef.current!);

  // Canvas node ref callback
  const canvasRefCallback = useCallback((node: HTMLDivElement | null) => {
    canvasRef.current = node;
    setCanvasNode(node);
    if (node && drop) {
      drop(node);
    }
  }, [drop]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <div
        ref={canvasRefCallback}
        className={`relative w-full h-full transition-all duration-200 ${
          isOver ? 'bg-primary/5' : ''
        }`}
        style={{ 
          transform: `scale(${zoomLevel})`,
          transformOrigin: '0 0'
        }}
        onMouseDown={markInteraction}
      >
        {/* Progressive component rendering based on interaction */}
        {!isFullyInitialized && !hasInteracted && (
          <CanvasInitializingState />
        )}
        
        {/* Conditional virtualized component rendering for performance */}
        {shouldUseVirtualization && isFullyInitialized ? (
          virtualizedComponents.visibleItems.map((component, index) => (
            <CanvasComponent
              key={component.id}
              component={component}
              isSelected={selectedComponent === component.id}
              isConnectionStart={connectionStart === component.id}
              onMove={onComponentMove}
              onSelect={onComponentSelect}
              onStartConnection={onStartConnection}
              onCompleteConnection={onCompleteConnection}
              data-component-id={component.id}
            />
          ))
        ) : (
          stableComponents.map((component) => (
            <CanvasComponent
              key={component.id}
              component={component}
              isSelected={selectedComponent === component.id}
              isConnectionStart={connectionStart === component.id}
              onMove={onComponentMove}
              onSelect={onComponentSelect}
              onStartConnection={onStartConnection}
              onCompleteConnection={onCompleteConnection}
              data-component-id={component.id}
            />
          ))
        )}

        {/* Connection rendering layer */}
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Arrow markers for different connection types */}
            <marker
              id="arrowhead-data"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--blue-500, 210 100% 50%))"
              />
            </marker>
            <marker
              id="arrowhead-control"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--purple-500, 262 100% 50%))"
              />
            </marker>
            <marker
              id="arrowhead-sync"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--green-500, 120 100% 40%))"
              />
            </marker>
            <marker
              id="arrowhead-async"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--orange-500, 25 100% 50%))"
              />
            </marker>
          </defs>
          <g className="pointer-events-auto">
            {renderConnections}
          </g>
        </svg>

        {/* Annotation Overlay - Lazy loaded when needed */}
        {isCommentModeActive && (
          <Suspense fallback={<div className="absolute inset-0 bg-transparent" />}>
            <LazyCanvasAnnotationOverlay 
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
          </Suspense>
        )}

        {/* Dragging connection preview */}
        <DraggingConnectionPreview />
      </div>

      {/* Connection style selector */}
      {selectedConnection && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
          <Select
            value={connectionStyle}
            onValueChange={(value) => setConnectionStyle(value as typeof connectionStyle)}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight">Straight</SelectItem>
              <SelectItem value="curved">Curved</SelectItem>
              <SelectItem value="stepped">Stepped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1 text-xs">
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Annotation edit dialog */}
      {selectedAnnotation && (
        <AnnotationEditDialog
          isOpen={isEditDialogOpen}
          annotation={selectedAnnotation}
          onSave={handleAnnotationUpdate}
          onDelete={handleAnnotationDelete}
          onClose={() => {
            setSelectedAnnotation(null);
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
});