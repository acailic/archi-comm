import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useEffect,
  Suspense,
} from 'react';
import { useDrop, useDragLayer } from 'react-dnd';
import { CanvasComponent } from './CanvasComponent';
import { AnnotationEditDialog } from './AnnotationEditDialog';
import type { DesignComponent, Connection, Layer, GridConfig, ToolType } from '../shared/contracts';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from './ui/context-menu';
import type { ViewportInfo } from '../shared/contracts';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2 } from 'lucide-react';
import { Annotation } from '../lib/canvas/CanvasAnnotations';
import { CanvasConnectionLayer } from './CanvasConnectionLayer';
import { snapToGrid, getVisibleComponents } from '../shared/canvasUtils';
import { getGlobalShortcutManager, ShortcutConfig } from '../lib/shortcuts/KeyboardShortcuts';
import {
  useOptimizedCallback,
  useOptimizedMemo,
  useStableReference,
  useVirtualizedList,
} from '../lib/performance/PerformanceOptimizer';
import { useUXTracker } from '../hooks/useUXTracker';
import { useCanvasPerformanceManager } from '../lib/performance/CanvasPerformanceManager';

// Lazy load heavy performance components
const LazyCanvasAnnotationOverlay = React.lazy(() =>
  import('./CanvasAnnotationOverlay').then(m => ({ default: m.CanvasAnnotationOverlay }))
);

// Lightweight loading indicator for canvas initialization
const CanvasInitializingState = () => (
  <div className='absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none'>
    <div className='text-center'>
      <div className='w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2' />
      <span className='text-sm text-muted-foreground'>Initializing canvas...</span>
    </div>
  </div>
);

// Constants for performance thresholds - optimized for architecture diagrams
const COMPONENT_WIDTH = 220;
const COMPONENT_HEIGHT = 140;
const COMPONENT_VIRTUALIZATION_THRESHOLD = 50;
const VIRTUALIZATION_THRESHOLD = 100;
const COMPONENT_CULLING_THRESHOLD = 30;

// Enhanced interaction constants
const ZOOM_SENSITIVITY = 0.001;
const PAN_SENSITIVITY = 1.2;
const SNAP_THRESHOLD = 15;
const AUTO_SAVE_DEBOUNCE = 2000;
const GESTURE_THRESHOLD = 50;

// Visual quality constants
const DETAIL_ZOOM_THRESHOLD = 0.5;
const HIGH_QUALITY_ZOOM_THRESHOLD = 1.5;
const SHADOW_QUALITY_LEVELS = {
  low: '0 2px 8px rgba(0,0,0,0.1)',
  medium: '0 4px 20px rgba(0,0,0,0.15)',
  high: '0 8px 32px rgba(0,0,0,0.2)'
};

// Types for enhanced interactions
interface SmartGuide {
  type: 'vertical' | 'horizontal';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

interface ContextualUIState {
  mode: 'focus' | 'hints' | 'alignment';
  targetIds?: string[];
  hints?: ContextualHint[];
  dimOthers?: boolean;
}

interface ContextualHint {
  x: number;
  y: number;
  message: string;
}

interface AssistiveGuide {
  type: 'alignment' | 'distribution' | 'spacing';
  elements: string[];
  suggestion: string;
}

interface VisualFeedback {
  type: 'zoom' | 'selection' | 'alignment' | 'tool' | 'success' | 'error';
  message?: string;
  level?: string;
  action?: () => void;
  duration?: number;
}

// Performance optimization hooks
const useLightweightCanvas = () => {
  const [isFullyInitialized, setIsFullyInitialized] = useState(false);
  const [performanceMonitor, setPerformanceMonitor] = useState<any>(null);
  const [memoryOptimizer, setMemoryOptimizer] = useState<any>(null);
  const [optimizedEventSystem, setOptimizedEventSystem] = useState<any>(null);

  const initializePerformanceUtils = useCallback(async () => {
    if (!performanceMonitor) {
      const { PerformanceMonitor, MemoryOptimizer, OptimizedEventSystem } = await import(
        '../lib/performance/PerformanceOptimizer'
      );
      setPerformanceMonitor(PerformanceMonitor.getInstance());
      // Important: wrap class in function to avoid React treating it as an updater
      setMemoryOptimizer(() => MemoryOptimizer);
      setOptimizedEventSystem(OptimizedEventSystem.getInstance());
      setIsFullyInitialized(true);
    }
  }, [performanceMonitor]);

  return {
    isFullyInitialized,
    performanceMonitor,
    memoryOptimizer,
    optimizedEventSystem,
    initializePerformanceUtils,
  };
};

const useCanvasInteraction = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const markInteraction = useCallback(() => {
    setHasInteracted(true);
    setInteractionCount(prev => prev + 1);
  }, []);

  // Fallback: auto-mark interaction shortly after mount so canvas initializes
  useEffect(() => {
    const id = window.setTimeout(() => {
      setHasInteracted(true);
    }, 150);
    return () => window.clearTimeout(id);
  }, []);

  return { hasInteracted, interactionCount, markInteraction };
};

const useVirtualizationThreshold = (componentCount: number) => {
  return useMemo(() => {
    return componentCount > COMPONENT_VIRTUALIZATION_THRESHOLD;
  }, [componentCount]);
};

// Deprecated custom culling hook replaced by shared utils for consistency
const useViewportCulling = (
  components: DesignComponent[],
  viewportBounds: { x: number; y: number; width: number; height: number } | null | undefined
) => {
  return useMemo(() => {
    if (!viewportBounds) return components;
    return getVisibleComponents(components as any, viewportBounds as any, 100);
  }, [components, viewportBounds]);
};

interface CanvasAreaProps {
  components: DesignComponent[];
  connections: Connection[];
  layers: Layer[];
  activeLayerId: string | null;
  selectedComponent: string | null;
  connectionStart: string | null;
  commentMode?: string | null;
  isCommentModeActive?: boolean;
  gridConfig?: GridConfig;
  selectedComponents?: string[];
  activeTool?: ToolType;
  componentConnectionCounts?: Record<string, number>;
  componentHealth?: Record<string, 'healthy' | 'warning' | 'error'>;
  onComponentDrop: (type: string, x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string) => void;
  onConnectionLabelChange?: (id: string, label: string) => void;
  onConnectionDelete?: (id: string) => void;
  onConnectionTypeChange?: (id: string, type: Connection['type']) => void;
  onConnectionDirectionChange?: (id: string, direction: Connection['direction']) => void;
  onStartConnection: (id: string) => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
  onMultiComponentSelect?: (componentIds: string[]) => void;
  onClearSelection?: () => void;
  onSelectAll?: (componentIds: string[]) => void;
  onGroupMove?: (componentIds: string[], deltaX: number, deltaY: number) => void;
  onGroupDelete?: (componentIds: string[]) => void;
  onViewportChange?: (viewport: ViewportInfo) => void;
  onAddComponent?: (x: number, y: number) => void;
  onAddAnnotation?: (x: number, y: number) => void;
  onPaste?: (x: number, y: number) => void;
  onZoomToFit?: () => void;
  onResetZoom?: () => void;
}

interface DragLayerItem {
  fromComponent?: DesignComponent;
  fromPosition?: 'top' | 'bottom' | 'left' | 'right';
}

// GridOverlay component
const GridOverlay: React.FC<{ config: GridConfig; width: number; height: number }> = ({
  config,
  width,
  height,
}) => {
  if (!config.visible) return null;
  const { spacing, color = 'hsl(var(--border))' } = config;
  const lines: React.ReactNode[] = [];

  // Background subtle gradient
  lines.push(
    <rect key='bg' x={0} y={0} width={width} height={height} fill='url(#canvas-gradient)' />
  );

  // Defs for dot pattern and gradient
  lines.push(
    <defs key='defs'>
      <linearGradient id='canvas-gradient' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0%' stopColor='rgba(0,0,0,0.02)' />
        <stop offset='100%' stopColor='rgba(0,0,0,0.00)' />
      </linearGradient>
      <pattern id='grid-dots' width={spacing} height={spacing} patternUnits='userSpaceOnUse'>
        <circle cx='1' cy='1' r='1' fill={color} opacity='0.25' />
      </pattern>
    </defs>
  );

  // Dot pattern overlay
  lines.push(<rect key='dots' x={0} y={0} width={width} height={height} fill='url(#grid-dots)' />);

  // Guiding lines every 4th interval
  for (let x = 0; x <= width; x += spacing * 4) {
    lines.push(
      <line
        key={`gv-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={color}
        strokeWidth='1'
        opacity={0.15}
      />
    );
  }
  for (let y = 0; y <= height; y += spacing * 4) {
    lines.push(
      <line
        key={`gh-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth='1'
        opacity={0.15}
      />
    );
  }

  return <g className='grid-overlay mix-blend-multiply'>{lines}</g>;
};

export const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(function CanvasArea(
  {
    components,
    connections,
    layers,
    activeLayerId,
    selectedComponent,
    connectionStart,
    commentMode,
    isCommentModeActive,
    gridConfig,
    selectedComponents = [],
    activeTool,
    onComponentDrop,
    onComponentMove,
    onComponentSelect,
    onConnectionLabelChange,
    onConnectionDelete,
    onConnectionTypeChange,
    onConnectionDirectionChange,
    onStartConnection,
    onCompleteConnection,
    onMultiComponentSelect,
    onClearSelection,
    onSelectAll,
    onGroupMove,
    onGroupDelete,
    onViewportChange,
    onAddComponent,
    onAddAnnotation,
    onPaste,
    onZoomToFit,
    onResetZoom,
    componentConnectionCounts,
    componentHealth,
  },
  ref
) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasNode, setCanvasNode] = useState<HTMLDivElement | null>(null);
  const annotationOverlayRef = useRef<any>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'stepped'>(
    'curved'
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  // All transforms derive from viewportBounds + zoomLevel
  const [isZooming, setIsZooming] = useState(false);
  const [touchGestures, setTouchGestures] = useState({
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 }
  });
  const [smartSnapGuides, setSmartSnapGuides] = useState<SmartGuide[]>([]);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Enhanced tool-based cursor and interaction styling
  const getCursorStyle = useCallback((tool: ToolType | undefined, interactionState?: string) => {
    const baseStyles = {
      select: isPanning ? 'cursor-grabbing' : 'cursor-default',
      pan: isPanning ? 'cursor-grabbing' : 'cursor-grab',
      zoom: isZooming ? 'cursor-zoom-out' : 'cursor-zoom-in',
      annotate: 'cursor-crosshair',
    };
    
    const modifier = interactionState === 'dragging' ? ' opacity-75' : 
                    interactionState === 'hovering' ? ' brightness-110' : '';
    
    return (baseStyles[tool as keyof typeof baseStyles] || 'cursor-default') + modifier;
  }, [isPanning, isZooming]);
  
  // Smart component placement - will be defined after stableComponents
  
  // Enhanced zoom at point function
  const handleZoomAtPoint = useCallback((newZoom: number, pointX: number, pointY: number) => {
    setIsZooming(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const newWidthWorld = rect.width / newZoom;
      const newHeightWorld = rect.height / newZoom;
      const newX = Math.max(0, pointX - newWidthWorld / 2);
      const newY = Math.max(0, pointY - newHeightWorld / 2);
      setViewportBounds({ x: newX, y: newY, width: newWidthWorld, height: newHeightWorld });
      setZoomLevel(newZoom);
      if (onViewportChange) {
        const extents = getCanvasExtents();
        onViewportChange({
          x: newX,
          y: newY,
          width: newWidthWorld,
          height: newHeightWorld,
          zoom: newZoom,
          worldWidth: extents.width,
          worldHeight: extents.height,
        });
      }
    } else {
      setZoomLevel(newZoom);
    }
    const qualityLevel =
      newZoom > HIGH_QUALITY_ZOOM_THRESHOLD ? 'high' : newZoom > DETAIL_ZOOM_THRESHOLD ? 'medium' : 'low';
    setVisualFeedback({ type: 'zoom', level: qualityLevel });
    setTimeout(() => setIsZooming(false), 150);
  }, [onViewportChange, getCanvasExtents]);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [currentCursorPosition, setCurrentCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Enhanced interaction state
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [contextualUI, setContextualUI] = useState<ContextualUIState | null>(null);
  const [assistiveGuides, setAssistiveGuides] = useState<AssistiveGuide[]>([]);
  const [visualFeedback, setVisualFeedback] = useState<VisualFeedback | null>(null);

  // Progressive performance optimization
  const {
    isFullyInitialized,
    performanceMonitor,
    memoryOptimizer,
    optimizedEventSystem,
    initializePerformanceUtils,
  } = useLightweightCanvas();
  const { hasInteracted, interactionCount, markInteraction } = useCanvasInteraction();
  const shouldUseVirtualization = useVirtualizationThreshold(components.length);

  // UX Tracking integration
  const { trackCanvasAction, trackKeyboardShortcut, trackPerformance } = useUXTracker();

  // Performance manager wiring
  const { manager, registerCanvas, unregisterCanvas } = useCanvasPerformanceManager({
    mode: 'balanced',
    adaptiveQuality: true,
    enableWorkers: false,
    enableOffscreenCanvas: false,
    maxMemoryUsage: 512,
    targetFPS: 60,
    debugMode: false,
  });

  // Track canvas size for canvas-based layers
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layer filtering and z-index management
  const getVisibleLayerIds = useOptimizedMemo(() => {
    return layers.filter(layer => layer.visible).map(layer => layer.id);
  }, [layers]);

  const filterComponentsByVisibility = useOptimizedMemo(() => {
    const visibleLayerIds = getVisibleLayerIds;
    return components.filter(
      component => !component.layerId || visibleLayerIds.includes(component.layerId)
    );
  }, [components, getVisibleLayerIds]);

  const filterConnectionsByVisibility = useOptimizedMemo(() => {
    const visibleLayerIds = getVisibleLayerIds;
    return connections.filter(connection => {
      const fromComponent = components.find(c => c.id === connection.from);
      const toComponent = components.find(c => c.id === connection.to);

      const fromLayerVisible =
        !fromComponent?.layerId || visibleLayerIds.includes(fromComponent.layerId);
      const toLayerVisible = !toComponent?.layerId || visibleLayerIds.includes(toComponent.layerId);

      return fromLayerVisible && toLayerVisible;
    });
  }, [connections, components, getVisibleLayerIds]);

  const calculateZIndex = useOptimizedCallback(
    (component: DesignComponent) => {
      if (!component.layerId) return 10; // Default z-index
      const layer = layers.find(l => l.id === component.layerId);
      return layer ? 10 + layer.order : 10;
    },
    [layers]
  );

  // Use stable references for complex objects to prevent unnecessary re-renders
  const stableComponents = useStableReference(filterComponentsByVisibility);
  const stableConnections = useStableReference(filterConnectionsByVisibility);

  // Viewport culling for components
  const componentsForRenderRaw = useViewportCulling(stableComponents, viewportBounds);
  const componentsForRender = useMemo(
    () => (stableComponents.length <= COMPONENT_CULLING_THRESHOLD ? stableComponents : componentsForRenderRaw),
    [stableComponents, componentsForRenderRaw]
  );

  const shouldUseCanvasConnections = useMemo(() => stableConnections.length > 50, [stableConnections.length]);
  // Track whether space is held for panning
  const [isSpacePanning, setIsSpacePanning] = useState(false);

  // Smart component placement with architectural patterns
  const getSmartPlacement = useCallback((componentType: string, position: { x: number; y: number }) => {
    try {
      const architecturalPatterns = {
        'load-balancer': { suggestedY: 100, alignsWithTypes: ['server', 'microservice'] },
        'database': { suggestedY: 400, alignsWithTypes: ['server', 'microservice'] },
        'cache': { suggestedY: 250, alignsWithTypes: ['database'] },
        'api-gateway': { suggestedY: 50, alignsWithTypes: ['microservice'] },
        'client': { suggestedY: 20, alignsWithTypes: ['api-gateway'] }
      };
      
      const pattern = architecturalPatterns[componentType as keyof typeof architecturalPatterns];
      if (!pattern) return position;
      
      // Ensure stableComponents is available
      if (!stableComponents || !Array.isArray(stableComponents)) return position;
      
      // Find nearby components of suggested types for smart alignment
      const nearbyComponents = stableComponents.filter(comp => 
        comp && comp.type &&
        pattern.alignsWithTypes.includes(comp.type) &&
        typeof comp.x === 'number' && typeof position.x === 'number' &&
        Math.abs(comp.x - position.x) < 300
      );
      
      if (nearbyComponents.length > 0) {
        const avgX = nearbyComponents.reduce((sum, comp) => sum + comp.x, 0) / nearbyComponents.length;
        return {
          x: avgX,
          y: pattern.suggestedY
        };
      }
      
      return {
        ...position,
        y: pattern.suggestedY
      };
    } catch (error) {
      console.warn('Error in getSmartPlacement:', error);
      return position;
    }
  }, [stableComponents]);

  // Calculate components intersecting with marquee rectangle
  const calculateComponentsInMarquee = useOptimizedCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      return stableComponents
        .filter(component => {
          const compRect = {
            x: component.x,
            y: component.y,
            width: COMPONENT_WIDTH,
            height: COMPONENT_HEIGHT,
          };

          // Check if rectangles intersect
          return (
            rect.x < compRect.x + compRect.width &&
            rect.x + rect.width > compRect.x &&
            rect.y < compRect.y + compRect.height &&
            rect.y + rect.height > compRect.y
          );
        })
        .map(comp => comp.id);
    },
    [stableComponents]
  );

  // Initialize performance utils on first interaction
  useEffect(() => {
    if (hasInteracted && !isFullyInitialized) {
      initializePerformanceUtils();
    }
  }, [hasInteracted, isFullyInitialized, initializePerformanceUtils]);

  // Clear selection when component's layer becomes invisible
  useEffect(() => {
    if (selectedComponent) {
      const component = components.find(c => c.id === selectedComponent);
      if (component && component.layerId) {
        const layer = layers.find(l => l.id === component.layerId);
        if (layer && !layer.visible) {
          onComponentSelect('');
        }
      }
    }
  }, [selectedComponent, components, layers, onComponentSelect]);

  // Memoized connection point calculation for performance
  const getComponentConnectionPoint = useMemo(() => {
    if (memoryOptimizer?.memoizeWeak) {
      return memoryOptimizer.memoizeWeak(
        (component: DesignComponent, position: 'top' | 'bottom' | 'left' | 'right') => {
          switch (position) {
            case 'top':
              return { x: component.x + COMPONENT_WIDTH / 2, y: component.y };
            case 'bottom':
              return { x: component.x + COMPONENT_WIDTH / 2, y: component.y + COMPONENT_HEIGHT };
            case 'left':
              return { x: component.x, y: component.y + COMPONENT_HEIGHT / 2 };
            case 'right':
              return { x: component.x + COMPONENT_WIDTH, y: component.y + COMPONENT_HEIGHT / 2 };
          }
        },
        (component, position) => `${component.id}-${component.x}-${component.y}-${position}`
      );
    }
    // Fallback for when performance utils aren't loaded yet
    return (component: DesignComponent, position: 'top' | 'bottom' | 'left' | 'right') => {
      switch (position) {
        case 'top':
          return { x: component.x + COMPONENT_WIDTH / 2, y: component.y };
        case 'bottom':
          return { x: component.x + COMPONENT_WIDTH / 2, y: component.y + COMPONENT_HEIGHT };
        case 'left':
          return { x: component.x, y: component.y + COMPONENT_HEIGHT / 2 };
        case 'right':
          return { x: component.x + COMPONENT_WIDTH, y: component.y + COMPONENT_HEIGHT / 2 };
      }
    };
  }, [memoryOptimizer]);

  // Optimized edge intersection utility function with conditional memoization
  const calculateEdgeIntersection = useMemo(() => {
    const baseFunction = (fromComp: DesignComponent, toComp: DesignComponent) => {
      const measureFn = performanceMonitor
        ? performanceMonitor.measure.bind(performanceMonitor)
        : (name: string, fn: () => any) => fn();
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
        (fromComp, toComp) =>
          `${fromComp.id}-${fromComp.x}-${fromComp.y}-${toComp.id}-${toComp.x}-${toComp.y}`
      );
    }

    return baseFunction;
  }, [memoryOptimizer, performanceMonitor]);

  // Mouse event handlers for marquee selection
  const handleMouseDown = useOptimizedCallback(
    (event: React.MouseEvent) => {
      // Panning with pan tool or while space held
      if (activeTool === 'pan' || isSpacePanning) {
        setIsPanning(true);
        setPanStart({ x: event.clientX, y: event.clientY });
        event.preventDefault();
        return;
      }
      if (
        event.target === event.currentTarget ||
        (event.target as Element).classList.contains('marquee-selectable')
      ) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (event.clientX - rect.left) / zoomLevel;
          const y = (event.clientY - rect.top) / zoomLevel;

          setIsMarqueeSelecting(true);
          setMarqueeStart({ x, y });
          setMarqueeEnd({ x, y });
          setMarqueeRect({ x, y, width: 0, height: 0 });

          // Clear existing selection if not holding Ctrl/Cmd
          if (!event.ctrlKey && !event.metaKey) {
            onClearSelection?.();
          }
        }
      }
    },
    [zoomLevel, onClearSelection]
  );

  const handleMouseMove = useOptimizedCallback(
    (event: React.MouseEvent) => {
      // Handle panning updates
      if (isPanning && panStart && canvasRef.current) {
        const dx = (event.clientX - panStart.x) / (1 / zoomLevel);
        const dy = (event.clientY - panStart.y) / (1 / zoomLevel);
        const nextX = Math.max(0, viewportBounds.x - dx / PAN_SENSITIVITY);
        const nextY = Math.max(0, viewportBounds.y - dy / PAN_SENSITIVITY);
        setViewportBounds(prev => ({ ...prev, x: nextX, y: nextY }));
        const node = canvasRef.current;
        if (onViewportChange) {
          const rect = node.getBoundingClientRect();
          const extents = getCanvasExtents();
          onViewportChange({
            x: nextX,
            y: nextY,
            width: rect.width / zoomLevel,
            height: rect.height / zoomLevel,
            zoom: zoomLevel,
            worldWidth: extents.width,
            worldHeight: extents.height,
          });
        }
        return;
      }
      if (isMarqueeSelecting && marqueeStart && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / zoomLevel;
        const y = (event.clientY - rect.top) / zoomLevel;

        setMarqueeEnd({ x, y });

        // Calculate marquee rectangle
        const marqueeX = Math.min(marqueeStart.x, x);
        const marqueeY = Math.min(marqueeStart.y, y);
        const marqueeWidth = Math.abs(x - marqueeStart.x);
        const marqueeHeight = Math.abs(y - marqueeStart.y);

        const newMarqueeRect = {
          x: marqueeX,
          y: marqueeY,
          width: marqueeWidth,
          height: marqueeHeight,
        };
        setMarqueeRect(newMarqueeRect);

        // Calculate intersecting components
        const intersectingIds = calculateComponentsInMarquee(newMarqueeRect);

        // Update selection
        if (event.ctrlKey || event.metaKey) {
          // Additive selection - merge with existing
          const combinedSelection = [...new Set([...selectedComponents, ...intersectingIds])];
          onMultiComponentSelect?.(combinedSelection);
        } else {
          // Replace selection
          onMultiComponentSelect?.(intersectingIds);
        }
      }
    },
    [
      isMarqueeSelecting,
      marqueeStart,
      zoomLevel,
      calculateComponentsInMarquee,
      selectedComponents,
      onMultiComponentSelect,
    ]
  );

  const handleMouseUp = useOptimizedCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      setMarqueeRect(null);
    }
  }, [isMarqueeSelecting]);

  // DND drop handling
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ['component', 'connection-point'],
      drop: (item: any, monitor) => {
        markInteraction(); // Mark that user has interacted
        const measureFn = performanceMonitor
          ? performanceMonitor.measure.bind(performanceMonitor)
          : (name: string, fn: () => any) => fn();
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
      collect: monitor => ({
        isOver: monitor.isOver(),
      }),
    }),
    [markInteraction, performanceMonitor]
  );

  // Path generation for connections
  const generatePath = useOptimizedCallback(
    (x1: number, y1: number, x2: number, y2: number, style: string) => {
      const measureFn = performanceMonitor
        ? performanceMonitor.measure.bind(performanceMonitor)
        : (name: string, fn: () => any) => fn();
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
    },
    [performanceMonitor, memoryOptimizer]
  );

  // Connection styling utilities
  const getConnectionColor = useOptimizedMemo(() => {
    const colorMap = {
      data: 'hsl(var(--blue-500, 210 100% 50%))',
      control: 'hsl(var(--purple-500, 262 100% 50%))',
      sync: 'hsl(var(--green-500, 120 100% 40%))',
      async: 'hsl(var(--orange-500, 25 100% 50%))',
    };
    return (connection: Connection) =>
      colorMap[connection.type] || 'hsl(var(--primary, 203 12% 15%))';
  }, []);

  const getConnectionStrokePattern = useOptimizedMemo(() => {
    return (connection: Connection) => (connection.type === 'async' ? '5,5' : undefined);
  }, []);

  // Virtualized connection rendering for large datasets
  const renderConnections = useOptimizedMemo(() => {
    const measureFn = performanceMonitor
      ? performanceMonitor.measure.bind(performanceMonitor)
      : (name: string, fn: () => any) => fn();
    return measureFn('connection-rendering', () => {
      const connectionsToRender =
        stableConnections.length > VIRTUALIZATION_THRESHOLD
          ? stableConnections.filter(connection => {
              // Viewport culling for connections
              const fromComponent = stableComponents.find(c => c.id === connection.from);
              const toComponent = stableComponents.find(c => c.id === connection.to);

              if (!fromComponent || !toComponent) return false;

              // Simple viewport intersection check
              const minX = Math.min(fromComponent.x, toComponent.x);
              const maxX = Math.max(
                fromComponent.x + COMPONENT_WIDTH,
                toComponent.x + COMPONENT_WIDTH
              );
              const minY = Math.min(fromComponent.y, toComponent.y);
              const maxY = Math.max(
                fromComponent.y + COMPONENT_HEIGHT,
                toComponent.y + COMPONENT_HEIGHT
              );

              return !(
                maxX < viewportBounds.x ||
                minX > viewportBounds.x + viewportBounds.width ||
                maxY < viewportBounds.y ||
                minY > viewportBounds.y + viewportBounds.height
              );
            })
          : stableConnections;

      return connectionsToRender.map(connection => {
        const fromComponent = stableComponents.find(c => c.id === connection.from);
        const toComponent = stableComponents.find(c => c.id === connection.to);

        if (!fromComponent || !toComponent) return null;

        const { fromX, fromY, toX, toY } = calculateEdgeIntersection(fromComponent, toComponent);
        const path = generatePath(fromX, fromY, toX, toY, connectionStyle);

        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        // Offset the label slightly perpendicular to the connection for readability
        const dxLine = toX - fromX;
        const dyLine = toY - fromY;
        const lenLine = Math.max(1, Math.hypot(dxLine, dyLine));
        const nx = -dyLine / lenLine;
        const ny = dxLine / lenLine;
        const labelOffset = 16; // px away from the stroke
        const labelX = midX + nx * labelOffset;
        const labelY = midY + ny * labelOffset;

        const isSelected = selectedConnection === connection.id;
        const strokeColor = getConnectionColor(connection);
        const strokeDasharray = getConnectionStrokePattern(connection);

        // Level-of-detail rendering for distant connections
        const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const isDetailed = distance < 500 || isSelected || zoomLevel > 0.8;

        return (
          <g key={connection.id} className='cursor-pointer'>
            <path
              d={path}
              stroke='transparent'
              strokeWidth='12'
              fill='none'
              onClick={() => {
                const measureFn = performanceMonitor
                  ? performanceMonitor.measure.bind(performanceMonitor)
                  : (name: string, fn: () => any) => fn();
                measureFn('connection-selection', () => setSelectedConnection(connection.id));
              }}
            />

            <path
              d={path}
              stroke={strokeColor}
              strokeWidth={isSelected ? '3' : '2'}
              strokeDasharray={strokeDasharray}
              strokeOpacity='1'
              fill='none'
              className={`transition-all duration-200 ${isSelected ? 'drop-shadow-lg' : ''}`}
              markerStart={
                connection.direction === 'both'
                  ? `url(#arrowhead-${connection.type || 'data'})`
                  : undefined
              }
              markerEnd={
                connection.direction === 'end' || connection.direction === 'both'
                  ? `url(#arrowhead-${connection.type || 'data'})`
                  : undefined
              }
              onClick={() => {
                const measureFn = performanceMonitor
                  ? performanceMonitor.measure.bind(performanceMonitor)
                  : (name: string, fn: () => any) => fn();
                measureFn('connection-selection', () => setSelectedConnection(connection.id));
              }}
            />

            {isDetailed && connection.type && connection.type !== 'data' && (
              <circle
                cx={fromX + (toX - fromX) * 0.2}
                cy={fromY + (toY - fromY) * 0.2}
                r='6'
                fill={strokeColor}
                className='opacity-80'
              />
            )}

            {isDetailed && (
              <foreignObject
                x={labelX - 60}
                y={labelY - 25}
                width='120'
                height='50'
                className='pointer-events-auto'
              >
                <div className='flex flex-col items-center space-y-1'>
                  <input
                    className='w-full text-xs text-center bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1 shadow-sm drop-shadow'
                    value={connection.label}
                    onChange={e => onConnectionLabelChange?.(connection.id, e.target.value)}
                    placeholder='Connection label'
                    onClick={e => e.stopPropagation()}
                  />

                  {isSelected && (
                    <div className='flex flex-col items-center space-y-1'>
                      <div className='flex items-center space-x-1'>
                        <Select
                          value={connection.type || 'data'}
                          onValueChange={value =>
                            onConnectionTypeChange?.(connection.id, value as Connection['type'])
                          }
                        >
                          <SelectTrigger className='h-6 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='data'>Data</SelectItem>
                            <SelectItem value='control'>Control</SelectItem>
                            <SelectItem value='sync'>Sync</SelectItem>
                            <SelectItem value='async'>Async</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant='destructive'
                          size='sm'
                          className='h-6 w-6 p-0'
                          onClick={e => {
                            e.stopPropagation();
                            const measureFn = performanceMonitor
                              ? performanceMonitor.measure.bind(performanceMonitor)
                              : (name: string, fn: () => any) => fn();
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
                          <Trash2 className='w-3 h-3' />
                        </Button>
                      </div>

                      <Select
                        value={connection.direction || 'end'}
                        onValueChange={value =>
                          onConnectionDirectionChange?.(
                            connection.id,
                            value as Connection['direction']
                          )
                        }
                      >
                        <SelectTrigger className='h-6 text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='none'>No arrows</SelectItem>
                          <SelectItem value='end'>End arrow</SelectItem>
                          <SelectItem value='both'>Both arrows</SelectItem>
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
  }, [
    stableConnections,
    stableComponents,
    connectionStyle,
    selectedConnection,
    zoomLevel,
    viewportBounds,
    calculateEdgeIntersection,
    generatePath,
    getConnectionColor,
    getConnectionStrokePattern,
    onConnectionLabelChange,
    onConnectionTypeChange,
    onConnectionDelete,
    onConnectionDirectionChange,
    performanceMonitor,
    memoryOptimizer,
  ]);

  // Conditional virtualized component rendering for large datasets
  const virtualizedComponents = useVirtualizedList(
    shouldUseVirtualization ? stableComponents : [],
    COMPONENT_HEIGHT + 20, // Include margin
    canvasRef.current?.clientHeight || 0
  );

  // Optimized annotation event handlers with conditional performance monitoring
  const handleAnnotationCreate = useOptimizedCallback(
    (annotation: Annotation) => {
      const measureFn = performanceMonitor
        ? performanceMonitor.measure.bind(performanceMonitor)
        : (name: string, fn: () => any) => fn();
      measureFn('annotation-create', () => {
        setAnnotations(prev => [...prev, annotation]);
      });
    },
    [performanceMonitor]
  );

  const handleAnnotationUpdate = useOptimizedCallback(
    (updatedAnnotation: Annotation) => {
      const measureFn = performanceMonitor
        ? performanceMonitor.measure.bind(performanceMonitor)
        : (name: string, fn: () => any) => fn();
      measureFn('annotation-update', () => {
        setAnnotations(prev =>
          prev.map(ann => (ann.id === updatedAnnotation.id ? updatedAnnotation : ann))
        );
        setSelectedAnnotation(null);
        setIsEditDialogOpen(false);
      });
    },
    [performanceMonitor]
  );

  const handleAnnotationDelete = useOptimizedCallback(
    (annotationId: string) => {
      const measureFn = performanceMonitor
        ? performanceMonitor.measure.bind(performanceMonitor)
        : (name: string, fn: () => any) => fn();
      measureFn('annotation-delete', () => {
        setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
        setSelectedAnnotation(null);
        setIsEditDialogOpen(false);
      });
    },
    [performanceMonitor]
  );

  const handleAnnotationSelect = useOptimizedCallback(
    (annotation: Annotation | null) => {
      const measureFn = performanceMonitor
        ? performanceMonitor.measure.bind(performanceMonitor)
        : (name: string, fn: () => any) => fn();
      measureFn('annotation-select', () => {
        setSelectedAnnotation(annotation);
      });
    },
    [performanceMonitor]
  );

  // Optimized keyboard shortcuts with conditional performance monitoring
  useEffect(() => {
    if (!optimizedEventSystem) return; // Only initialize when event system is loaded

    const measureFn = performanceMonitor
      ? performanceMonitor.measure.bind(performanceMonitor)
      : (name: string, fn: () => any) => fn();

    const handleSelectAll = () => {
      measureFn('select-all-operation', () => {
        const allComponentIds = stableComponents.map(comp => comp.id);
        setSelectedItems(allComponentIds);
        onSelectAll?.(allComponentIds);
      });
    };

    const handleClearSelection = () => {
      measureFn('clear-selection-operation', () => {
        setSelectedItems([]);
        setSelectedConnection(null);
        onComponentSelect('');
        onClearSelection?.();
      });
    };

    const handleDeleteSelected = () => {
      measureFn('delete-selected-operation', () => {
        if (selectedConnection && onConnectionDelete) {
          onConnectionDelete(selectedConnection);
          setSelectedConnection(null);
        }
        // Also delete selected components
        if (selectedComponents.length > 0) {
          onGroupDelete?.(selectedComponents);
        }
      });
    };

    const handleGroupMove = (
      direction: 'up' | 'down' | 'left' | 'right',
      fine: boolean = false
    ) => {
      measureFn('group-move-operation', () => {
        if (selectedComponents.length > 0) {
          const step = fine ? 1 : 10;
          let deltaX = 0,
            deltaY = 0;

          switch (direction) {
            case 'up':
              deltaY = -step;
              break;
            case 'down':
              deltaY = step;
              break;
            case 'left':
              deltaX = -step;
              break;
            case 'right':
              deltaX = step;
              break;
          }

          onGroupMove?.(selectedComponents, deltaX, deltaY);
        }
      });
    };

    const handleDuplicateSelected = () => {
      measureFn('duplicate-selected-operation', () => {
        // This would be implemented by the parent component
        console.log('Duplicate selected components:', selectedComponents);
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

    // Keyboard event handler for group operations
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete key
      if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDeleteSelected();
      }
      // Arrow keys for moving selection
      else if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            handleGroupMove('up', true);
            break;
          case 'ArrowDown':
            event.preventDefault();
            handleGroupMove('down', true);
            break;
          case 'ArrowLeft':
            event.preventDefault();
            handleGroupMove('left', true);
            break;
          case 'ArrowRight':
            event.preventDefault();
            handleGroupMove('right', true);
            break;
          case 'd':
            event.preventDefault();
            handleDuplicateSelected();
            break;
        }
      }
      // Regular arrow keys (larger steps)
      else if (selectedComponents.length > 0) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            handleGroupMove('up');
            break;
          case 'ArrowDown':
            event.preventDefault();
            handleGroupMove('down');
            break;
          case 'ArrowLeft':
            event.preventDefault();
            handleGroupMove('left');
            break;
          case 'ArrowRight':
            event.preventDefault();
            handleGroupMove('right');
            break;
        }
      }
    };

    // Use optimized event system for better performance
    const handleKeyDownGeneral = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        setIsSpacePanning(true);
        ev.preventDefault();
      }
    };

    const handleKeyUpGeneral = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        setIsSpacePanning(false);
      }
    };

    const cleanupFunctions = [
      optimizedEventSystem.addEventListener(window, 'shortcut:select-all', handleSelectAll),
      optimizedEventSystem.addEventListener(
        window,
        'shortcut:clear-selection',
        handleClearSelection
      ),
      optimizedEventSystem.addEventListener(
        window,
        'shortcut:delete-selected',
        handleDeleteSelected
      ),
      optimizedEventSystem.addEventListener(window, 'shortcut:zoom-in', handleZoomIn),
      optimizedEventSystem.addEventListener(window, 'shortcut:zoom-out', handleZoomOut),
      optimizedEventSystem.addEventListener(window, 'shortcut:zoom-reset', handleZoomReset),
      optimizedEventSystem.addEventListener(window, 'keydown', handleKeyDown),
      optimizedEventSystem.addEventListener(window, 'keydown', handleKeyDownGeneral),
      optimizedEventSystem.addEventListener(window, 'keyup', handleKeyUpGeneral),
    ];

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [
    stableComponents,
    selectedConnection,
    selectedComponents,
    onConnectionDelete,
    onComponentSelect,
    onSelectAll,
    onClearSelection,
    onGroupDelete,
    onGroupMove,
    optimizedEventSystem,
    performanceMonitor,
  ]);

  // Handle edit annotation events from overlay with conditional optimized event system
  useEffect(() => {
    if (!canvasNode || !optimizedEventSystem) return;

    const measureFn = performanceMonitor
      ? performanceMonitor.measure.bind(performanceMonitor)
      : (name: string, fn: () => any) => fn();

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

    const measureFn = performanceMonitor
      ? performanceMonitor.measure.bind(performanceMonitor)
      : (name: string, fn: () => any) => fn();

    const handleMouseMove = (event: MouseEvent) => {
      // Throttled mouse move for performance
      measureFn('canvas-mouse-interaction', () => {
        markInteraction(); // Track interaction
        // Update viewport bounds for intersection calculations
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (event.clientX - rect.left) / zoomLevel;
        const y = (event.clientY - rect.top) / zoomLevel;

        // Update current cursor position for minimap
        setCurrentCursorPosition({ x, y });

        // Update viewport bounds if significantly changed
        if (Math.abs(x - viewportBounds.x) > 50 || Math.abs(y - viewportBounds.y) > 50) {
          setViewportBounds(prev => ({
            ...prev,
            x: x - prev.width / 2,
            y: y - prev.height / 2,
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

  // Register event listeners through OptimizedEventSystem
  useEffect(() => {
    if (!optimizedEventSystem || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const cleanupFunctions: (() => void)[] = [];

    // Register canvas-specific event listeners
    cleanupFunctions.push(
      optimizedEventSystem.addEventListener(canvas, 'contextmenu', (e) => {
        e.preventDefault(); // Prevent default context menu to show custom one
      }),
      optimizedEventSystem.addEventListener(canvas, 'wheel', (e) => {
        e.preventDefault(); // Prevent page scroll
      }),
      optimizedEventSystem.addEventListener(canvas, 'dragover', (e) => {
        e.preventDefault(); // Allow drop
      })
    );

    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Failed to cleanup event listener:', error);
        }
      });
    };
  }, [optimizedEventSystem, canvasRef.current]);

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

      // Cleanup performance manager canvas registration
      try {
        unregisterCanvas('main-canvas');
      } catch (error) {
        console.warn('Failed to cleanup performance registration:', error);
      }

      // Cleanup event system listeners (OptimizedEventSystem manages its own cleanup)
      if (optimizedEventSystem?.cleanup) {
        try {
          optimizedEventSystem.cleanup();
        } catch (error) {
          console.warn('Failed to cleanup event system:', error);
        }
      }
    };
  }, [stableConnections, memoryOptimizer, unregisterCanvas, optimizedEventSystem]);

  // Optimized dragging connection preview component
  const DraggingConnectionPreview = React.memo(() => {
    const dragLayerData = useDragLayer<DragLayerItem>(monitor => {
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

    const { isDragging, itemType, currentOffset, fromComponentX, fromComponentY, fromPosition } =
      dragLayerData;

    // Early return with guard clauses
    if (
      !isDragging ||
      !currentOffset ||
      itemType !== 'connection-point' ||
      fromComponentX === undefined ||
      fromComponentY === undefined ||
      !fromPosition
    ) {
      return null;
    }

    // Calculate connection point
    const fromComponent: DesignComponent = {
      id: 'temp-from',
      type: 'server',
      x: fromComponentX,
      y: fromComponentY,
      label: 'temp',
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
      <svg
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <path
          d={pathData}
          stroke='hsl(var(--primary))'
          strokeWidth='2'
          strokeDasharray='5,5'
          fill='none'
        />
      </svg>
    );
  });

  // Helper function to get canvas extents
  const getCanvasExtents = useCallback(() => {
    if (components.length === 0) return { width: 1000, height: 800 };
    const minX = Math.min(...components.map(c => c.x));
    const maxX = Math.max(...components.map(c => c.x + COMPONENT_WIDTH));
    const minY = Math.min(...components.map(c => c.y));
    const maxY = Math.max(...components.map(c => c.y + COMPONENT_HEIGHT));
    return {
      width: Math.max(1000, maxX - minX + 200),
      height: Math.max(800, maxY - minY + 200),
    };
  }, [components]);

  // Connection refs for imperative access
  React.useImperativeHandle(ref, () => ({
    ...canvasRef.current!,
    scrollTo: (x: number, y: number) => {
      if (canvasRef.current) {
        // Update viewport bounds
        const rect = canvasRef.current.getBoundingClientRect();
        setViewportBounds(prev => ({
          ...prev,
          x,
          y,
          width: rect.width / zoomLevel,
          height: rect.height / zoomLevel,
        }));
        // Trigger viewport change callback
        if (onViewportChange) {
          const rect = canvasRef.current.getBoundingClientRect();
          onViewportChange({
            x,
            y,
            width: rect.width / zoomLevel,
            height: rect.height / zoomLevel,
            zoom: zoomLevel,
            worldWidth: getCanvasExtents().width,
            worldHeight: getCanvasExtents().height,
          });
        }
      }
    },
    setZoom: (zoom: number, centerX?: number, centerY?: number) => {
      const newZoom = Math.max(0.1, Math.min(3, zoom));
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        let x = viewportBounds.x;
        let y = viewportBounds.y;
        if (centerX !== undefined && centerY !== undefined) {
          const newWidthWorld = rect.width / newZoom;
          const newHeightWorld = rect.height / newZoom;
          x = Math.max(0, centerX - newWidthWorld / 2);
          y = Math.max(0, centerY - newHeightWorld / 2);
          setViewportBounds({ x, y, width: newWidthWorld, height: newHeightWorld });
        } else {
          setViewportBounds(prev => ({
            ...prev,
            width: rect.width / newZoom,
            height: rect.height / newZoom,
          }));
        }
      }
      setZoomLevel(newZoom);
      // Trigger viewport change callback
      if (onViewportChange) {
        const extents = getCanvasExtents();
        const rect = canvasRef.current?.getBoundingClientRect();
        onViewportChange({
          x: viewportBounds.x,
          y: viewportBounds.y,
          width: rect ? rect.width / newZoom : viewportBounds.width,
          height: rect ? rect.height / newZoom : viewportBounds.height,
          zoom: newZoom,
          worldWidth: extents.width,
          worldHeight: extents.height,
        });
      }
    },
    getCanvasExtents: () => {
      if (components.length === 0) return { width: 1000, height: 800 };
      const minX = Math.min(...components.map(c => c.x));
      const maxX = Math.max(...components.map(c => c.x + COMPONENT_WIDTH));
      const minY = Math.min(...components.map(c => c.y));
      const maxY = Math.max(...components.map(c => c.y + COMPONENT_HEIGHT));
      return {
        width: Math.max(1000, maxX - minX + 200),
        height: Math.max(800, maxY - minY + 200),
      };
    },
    getCurrentCursorPosition: () => currentCursorPosition,
  }));

  // Viewport change tracking for minimap
  useEffect(() => {
    if (onViewportChange && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const extents = getCanvasExtents();
      onViewportChange({
        x: viewportBounds.x,
        y: viewportBounds.y,
        width: rect.width / zoomLevel,
        height: rect.height / zoomLevel,
        zoom: zoomLevel,
        worldWidth: extents.width,
        worldHeight: extents.height,
      });
    }
  }, [viewportBounds, zoomLevel, onViewportChange, getCanvasExtents]);

  // Canvas node ref callback
  const canvasRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      canvasRef.current = node;
      setCanvasNode(node);
      if (node && drop) {
        drop(node);
      }
    },
    [drop]
  );

  // Register with performance manager when canvas node is ready
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Find SVG element within the canvas container or use the main canvas div
    const svgElement = canvasRef.current.querySelector('svg') || canvasRef.current;
    
    try {
      registerCanvas('main-canvas', svgElement as unknown as HTMLCanvasElement, 'svg');
    } catch (e) {
      console.warn('Performance registration failed', e);
    }
    
    return () => {
      try {
        unregisterCanvas('main-canvas');
      } catch {}
    };
  }, [canvasRef.current, registerCanvas, unregisterCanvas]);

  // Helper functions for enhanced interactions
  const updateSmartSnapGuides = useCallback((position: { x: number; y: number }) => {
    try {
      if (!stableComponents || !Array.isArray(stableComponents)) return;
      
      const guides: SmartGuide[] = [];
      const snapDistance = SNAP_THRESHOLD / zoomLevel;
      
      // Find nearby components for alignment guides
      stableComponents.forEach(comp => {
        if (!comp || typeof comp.x !== 'number' || typeof comp.y !== 'number') return;
      const compCenterX = comp.x + COMPONENT_WIDTH / 2;
      const compCenterY = comp.y + COMPONENT_HEIGHT / 2;
      
      // Vertical alignment
      if (Math.abs(compCenterX - position.x) < snapDistance) {
        guides.push({
          type: 'vertical',
          x: compCenterX,
          y: Math.min(comp.y, position.y) - 20,
          height: Math.abs(comp.y - position.y) + COMPONENT_HEIGHT + 40,
          width: 1,
          label: 'Center align'
        });
      }
      
      // Horizontal alignment  
      if (Math.abs(compCenterY - position.y) < snapDistance) {
        guides.push({
          type: 'horizontal',
          x: Math.min(comp.x, position.x) - 20,
          y: compCenterY,
          width: Math.abs(comp.x - position.x) + COMPONENT_WIDTH + 40,
          height: 1,
          label: 'Center align'
        });
      }
    });
    
      setSmartSnapGuides(guides);
    } catch (error) {
      console.warn('Error in updateSmartSnapGuides:', error);
      setSmartSnapGuides([]);
    }
  }, [stableComponents, zoomLevel]);
  
  const updateContextualUI = useCallback((position: { x: number; y: number }) => {
    try {
      if (!stableComponents || !Array.isArray(stableComponents)) return;
      
      // Show contextual hints based on cursor position and selected tool
      const hints: ContextualHint[] = [];
      
      if (activeTool === 'select' && selectedComponents.length === 0) {
        const nearbyComponents = stableComponents.filter(comp => 
          comp && typeof comp.x === 'number' && typeof comp.y === 'number' &&
          Math.hypot(comp.x - position.x, comp.y - position.y) < 100
        );
      
      if (nearbyComponents.length > 0) {
        hints.push({
          x: position.x + 10,
          y: position.y - 10,
          message: 'Click to select, drag to move'
        });
      }
    }
    
      if (hints.length > 0) {
        setContextualUI({ mode: 'hints', hints });
      } else {
        setContextualUI(null);
      }
    } catch (error) {
      console.warn('Error in updateContextualUI:', error);
      setContextualUI(null);
    }
  }, [activeTool, selectedComponents, stableComponents]);
  
  const calculateContentBounds = useCallback(() => {
    if (stableComponents.length === 0) {
      return { x: 0, y: 0, width: 1000, height: 800 };
    }
    
    const minX = Math.min(...stableComponents.map(c => c.x)) - 50;
    const maxX = Math.max(...stableComponents.map(c => c.x + COMPONENT_WIDTH)) + 50;
    const minY = Math.min(...stableComponents.map(c => c.y)) - 50;
    const maxY = Math.max(...stableComponents.map(c => c.y + COMPONENT_HEIGHT)) + 50;
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }, [stableComponents]);
  
  const calculateSmartAlignment = useCallback((componentIds: string[]) => {
    const components = stableComponents.filter(c => componentIds.includes(c.id));
    if (components.length < 2) return null;
    
    // Analyze component types for architectural alignment suggestions
    const hasLoadBalancer = components.some(c => c.type === 'load-balancer');
    const hasServers = components.some(c => c.type === 'server' || c.type === 'microservice');
    const hasDatabases = components.some(c => c.type.includes('database'));
    
    if (hasLoadBalancer && hasServers) {
      return { type: 'architectural', pattern: 'load-balancer-to-services' };
    }
    
    if (hasServers && hasDatabases) {
      return { type: 'architectural', pattern: 'services-to-data' };
    }
    
    return { type: 'geometric', pattern: 'center-align' };
  }, [stableComponents]);
  
  const applyAlignment = useCallback((alignment: any) => {
    // Implementation would apply the suggested alignment
    setVisualFeedback({
      type: 'success',
      message: 'Components aligned',
      duration: 1500
    });
  }, []);
  
  // Handle tool change function
  const handleToolChange = useCallback((tool: ToolType) => {
    // onToolChange?.(tool); // This will be handled by parent component
    setVisualFeedback({
      type: 'tool',
      message: `Switched to ${tool} tool`,
      duration: 1000
    });
  }, []);
  
  // Clear visual feedback after duration
  useEffect(() => {
    if (visualFeedback?.duration) {
      const timer = setTimeout(() => {
        setVisualFeedback(null);
      }, visualFeedback.duration);
      return () => clearTimeout(timer);
    }
  }, [visualFeedback]);
  
  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-background canvas-mobile lg:canvas-desktop mobile-scroll ${getCursorStyle(activeTool)} ${isFocused ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      role='application'
      aria-roledescription='System design canvas'
      aria-keyshortcuts='Delete,Backspace,Control+A,Control+C,Control+V,H,V,Z,A,Space,Tab,Shift+Tab'
      aria-live='polite'
      aria-label={`Canvas with ${stableComponents.length} components${selectedComponents.length > 0 ? `, ${selectedComponents.length} selected` : ''}`}
      tabIndex={0}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={canvasRefCallback}
            className={`relative w-full h-full transition-all duration-200 marquee-selectable ${
              isOver ? 'bg-primary/5' : ''
            } ${getCursorStyle(activeTool)}`}
            style={{
              transform: `scale(${zoomLevel}) translate(${-viewportBounds.x}px, ${-viewportBounds.y}px)`,
              transformOrigin: '0 0',
              minWidth: '2400px',
              minHeight: '1800px',
            }}
            onMouseDown={e => {
              markInteraction();
              handleMouseDown(e);
              // Focus canvas on interaction
              if (canvasRef.current) {
                canvasRef.current.focus();
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              // Handle canvas-specific keyboard navigation
              if (selectedComponents.length > 0) {
                const step = e.shiftKey ? 1 : 10;
                let deltaX = 0, deltaY = 0;
                
                switch (e.key) {
                  case 'ArrowUp':
                    deltaY = -step;
                    e.preventDefault();
                    break;
                  case 'ArrowDown':
                    deltaY = step;
                    e.preventDefault();
                    break;
                  case 'ArrowLeft':
                    deltaX = -step;
                    e.preventDefault();
                    break;
                  case 'ArrowRight':
                    deltaX = step;
                    e.preventDefault();
                    break;
                }
                
                if (deltaX !== 0 || deltaY !== 0) {
                  onGroupMove?.(selectedComponents, deltaX, deltaY);
                }
              }
              
              // Handle Tab for component navigation
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const nextIndex = selectedComponent ? 
                  stableComponents.findIndex(c => c.id === selectedComponent) + 1 : 0;
                const nextComponent = stableComponents[nextIndex % stableComponents.length];
                if (nextComponent) {
                  onComponentSelect(nextComponent.id);
                  // Show focus ring for the selected component
                  setFocusRing({
                    x: nextComponent.x - 2,
                    y: nextComponent.y - 2,
                    width: COMPONENT_WIDTH + 4,
                    height: COMPONENT_HEIGHT + 4
                  });
                  setTimeout(() => setFocusRing(null), 2000);
                }
              } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const prevIndex = selectedComponent ? 
                  stableComponents.findIndex(c => c.id === selectedComponent) - 1 : stableComponents.length - 1;
                const prevComponent = stableComponents[prevIndex < 0 ? stableComponents.length - 1 : prevIndex];
                if (prevComponent) {
                  onComponentSelect(prevComponent.id);
                  // Show focus ring for the selected component
                  setFocusRing({
                    x: prevComponent.x - 2,
                    y: prevComponent.y - 2,
                    width: COMPONENT_WIDTH + 4,
                    height: COMPONENT_HEIGHT + 4
                  });
                  setTimeout(() => setFocusRing(null), 2000);
                }
              }
            }}
          >
            {/* Progressive component rendering with enhanced visual feedback */}
            {!isFullyInitialized && !hasInteracted && <CanvasInitializingState />}
            
            {/* Smart snap guides for precision placement */}
            {smartSnapGuides.map((guide, index) => (
              <div
                key={index}
                className="absolute pointer-events-none"
                style={{
                  left: guide.x,
                  top: guide.y,
                  width: guide.type === 'vertical' ? '1px' : guide.width,
                  height: guide.type === 'horizontal' ? '1px' : guide.height,
                  backgroundColor: 'hsl(var(--primary))',
                  opacity: 0.6,
                  zIndex: 999
                }}
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs bg-primary text-primary-foreground px-1 rounded">
                  {guide.label}
                </div>
              </div>
            ))}
            
            {/* Focus ring for precision feedback */}
            {focusRing && (
              <div
                className="absolute pointer-events-none border-2 border-primary border-dashed rounded animate-pulse"
                style={{
                  left: focusRing.x,
                  top: focusRing.y,
                  width: focusRing.width,
                  height: focusRing.height,
                  zIndex: 1001
                }}
              />
            )}

            {/* Conditional virtualized component rendering for performance */}
            {shouldUseVirtualization && isFullyInitialized
              ? virtualizedComponents.visibleItems.map((component, index) => {
                  const zIndex = calculateZIndex(component);
                  const layer = layers.find(l => l.id === component.layerId);
                  return (
                    <CanvasComponent
                      key={component.id}
                      component={component}
                      isSelected={selectedComponent === component.id}
                      isMultiSelected={selectedComponents.includes(component.id)}
                      isConnectionStart={connectionStart === component.id}
                      layerZIndex={zIndex}
                      isVisible={layer?.visible ?? true}
                      snapToGrid={gridConfig?.snapToGrid}
                      gridSpacing={gridConfig?.spacing}
                      activeTool={activeTool}
                      connectionCount={componentConnectionCounts?.[component.id] ?? 0}
                      healthStatus={componentHealth?.[component.id]}
                      onMove={onComponentMove}
                      onSelect={onComponentSelect}
                      onStartConnection={onStartConnection}
                      onCompleteConnection={onCompleteConnection}
                      onDuplicate={id => {
                        /* TODO: Implement duplicate */
                      }}
                      onBringToFront={id => {
                        /* TODO: Implement bring to front */
                      }}
                      onSendToBack={id => {
                        /* TODO: Implement send to back */
                      }}
                      onCopy={id => {
                        /* TODO: Implement copy */
                      }}
                      onShowProperties={id => {
                        /* TODO: Implement show properties */
                      }}
                      onDelete={id => {
                        /* TODO: Implement delete from context menu */
                      }}
                      data-component-id={component.id}
                    />
                  );
                })
              : componentsForRender.map(component => {
                  const zIndex = calculateZIndex(component);
                  const layer = layers.find(l => l.id === component.layerId);
                  return (
                    <CanvasComponent
                      key={component.id}
                      component={component}
                      isSelected={selectedComponent === component.id}
                      isMultiSelected={selectedComponents.includes(component.id)}
                      isConnectionStart={connectionStart === component.id}
                      layerZIndex={zIndex}
                      isVisible={layer?.visible ?? true}
                      snapToGrid={gridConfig?.snapToGrid}
                      gridSpacing={gridConfig?.spacing}
                      activeTool={activeTool}
                      connectionCount={componentConnectionCounts?.[component.id] ?? 0}
                      healthStatus={componentHealth?.[component.id]}
                      onMove={onComponentMove}
                      onSelect={onComponentSelect}
                      onStartConnection={onStartConnection}
                      onCompleteConnection={onCompleteConnection}
                      onDuplicate={id => {
                        /* TODO: Implement duplicate */
                      }}
                      onBringToFront={id => {
                        /* TODO: Implement bring to front */
                      }}
                      onSendToBack={id => {
                        /* TODO: Implement send to back */
                      }}
                      onCopy={id => {
                        /* TODO: Implement copy */
                      }}
                      onShowProperties={id => {
                        /* TODO: Implement show properties */
                      }}
                      onDelete={id => {
                        /* TODO: Implement delete from context menu */
                      }}
                      data-component-id={component.id}
                    />
                  );
                })}

            {/* Connection rendering layer */}
            {!shouldUseCanvasConnections && (
            <svg
              className='absolute inset-0 pointer-events-none'
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                {/* Arrow markers for different connection types */}
                <marker
                  id='arrowhead-data'
                  markerWidth='10'
                  markerHeight='7'
                  refX='9'
                  refY='3.5'
                  orient='auto'
                >
                  <polygon points='0 0, 10 3.5, 0 7' fill='hsl(var(--blue-500, 210 100% 50%))' />
                </marker>
                <marker
                  id='arrowhead-control'
                  markerWidth='10'
                  markerHeight='7'
                  refX='9'
                  refY='3.5'
                  orient='auto'
                >
                  <polygon points='0 0, 10 3.5, 0 7' fill='hsl(var(--purple-500, 262 100% 50%))' />
                </marker>
                <marker
                  id='arrowhead-sync'
                  markerWidth='10'
                  markerHeight='7'
                  refX='9'
                  refY='3.5'
                  orient='auto'
                >
                  <polygon points='0 0, 10 3.5, 0 7' fill='hsl(var(--green-500, 120 100% 40%))' />
                </marker>
                <marker
                  id='arrowhead-async'
                  markerWidth='10'
                  markerHeight='7'
                  refX='9'
                  refY='3.5'
                  orient='auto'
                >
                  <polygon points='0 0, 10 3.5, 0 7' fill='hsl(var(--orange-500, 25 100% 50%))' />
                </marker>
              </defs>

              {/* Grid overlay - render first so it appears behind everything */}
              {gridConfig && (
                <GridOverlay
                  config={gridConfig}
                  width={canvasRef.current?.clientWidth || 2000}
                  height={canvasRef.current?.clientHeight || 2000}
                />
              )}

              <g className='pointer-events-auto'>{renderConnections}</g>
            </svg>
            )}

            {shouldUseCanvasConnections && (
              <CanvasConnectionLayer
                width={canvasSize.width}
                height={canvasSize.height}
                zoom={zoomLevel}
                viewport={viewportBounds}
                connections={stableConnections}
                components={stableComponents}
                connectionStyle={connectionStyle}
                getConnectionColor={getConnectionColor}
                onSelectConnection={id => setSelectedConnection(id)}
                className='pointer-events-auto'
                style={{ zIndex: 5 }}
              />
            )}

            {/* Annotation Overlay - Lazy loaded when needed */}
            {isCommentModeActive && (
              <Suspense fallback={<div className='absolute inset-0 bg-transparent' />}>
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

            {/* Enhanced marquee selection rectangle */}
            {isMarqueeSelecting && marqueeRect && (
              <div
                style={{
                  position: 'absolute',
                  left: marqueeRect.x,
                  top: marqueeRect.y,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                  border: '2px dashed hsl(var(--primary))',
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  borderRadius: '4px',
                  boxShadow: '0 0 0 1px hsl(var(--background)), 0 4px 12px rgba(0,0,0,0.15)'
                }}
                className='marquee-selection animate-pulse'
              >
                <div className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                  {calculateComponentsInMarquee(marqueeRect).length} selected
                </div>
              </div>
            )}
            
            {/* Visual feedback overlay */}
            {visualFeedback && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg z-50 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{visualFeedback.message}</div>
                  {visualFeedback.action && (
                    <button 
                      onClick={visualFeedback.action}
                      className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Contextual UI hints */}
            {contextualUI && (
              <div className="absolute inset-0 pointer-events-none">
                {contextualUI.mode === 'focus' && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                )}
                {contextualUI.hints?.map((hint, index) => (
                  <div
                    key={index}
                    className="absolute pointer-events-auto"
                    style={{ left: hint.x, top: hint.y }}
                  >
                    <div className="bg-background/95 backdrop-blur border border-border rounded-lg px-3 py-2 shadow-lg text-sm max-w-xs">
                      {hint.message}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dragging connection preview */}
            <DraggingConnectionPreview />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className='w-56'>
          <ContextMenuItem
            onClick={() => {
              if (onPaste) {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = rect.width / 2 / zoomLevel;
                  const y = rect.height / 2 / zoomLevel;
                  onPaste(x, y);
                }
              }
            }}
          >
            Paste
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              const componentIds = components.map(c => c.id);
              onSelectAll?.(componentIds);
            }}
          >
            Select All
            <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onClearSelection?.()}>
            Clear Selection
            <ContextMenuShortcut>Esc</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              if (onAddComponent) {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = rect.width / 2 / zoomLevel;
                  const y = rect.height / 2 / zoomLevel;
                  onAddComponent(x, y);
                }
              }
            }}
          >
            Add Component
            <ContextMenuShortcut>Alt+C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              if (onAddAnnotation) {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = rect.width / 2 / zoomLevel;
                  const y = rect.height / 2 / zoomLevel;
                  onAddAnnotation(x, y);
                }
              }
            }}
          >
            Add Annotation
            <ContextMenuShortcut>C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onZoomToFit?.()}>Zoom to Fit</ContextMenuItem>
          <ContextMenuItem onClick={() => onResetZoom?.()}>
            Reset Zoom
            <ContextMenuShortcut>Ctrl+0</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Connection style selector */}
      {selectedConnection && (
        <div className='absolute top-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg'>
          <Select
            value={connectionStyle}
            onValueChange={value => setConnectionStyle(value as typeof connectionStyle)}
          >
            <SelectTrigger className='w-32 h-8 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='straight'>Straight</SelectItem>
              <SelectItem value='curved'>Curved</SelectItem>
              <SelectItem value='stepped'>Stepped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Enhanced status indicators */}
      <div className='absolute bottom-4 left-4 flex flex-col gap-2'>
        <div className='bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1 text-xs flex items-center gap-2'>
          <span>{Math.round(zoomLevel * 100)}%</span>
          {isZooming && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
        </div>
        
        {selectedComponents.length > 0 && (
          <div className='bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1 text-xs'>
            {selectedComponents.length} selected
          </div>
        )}
        
        {activeTool && activeTool !== 'select' && (
          <div className='bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-lg px-3 py-1 text-xs text-primary font-medium'>
            {activeTool.toUpperCase()} mode
          </div>
        )}
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
