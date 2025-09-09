import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toPng } from 'html-to-image';
import { useKeyboardShortcuts } from '../lib/shortcuts/KeyboardShortcuts';
import { TopBar } from './TopBar';
import { CanvasToolbar } from './CanvasToolbar';
import { RightSidebar } from './RightSidebar';
import type { Challenge, DesignComponent, Connection, DesignData, Layer, GridConfig, ToolType } from '../App';
import { ViewportInfo } from './Minimap';
import { ExtendedChallenge, challengeManager, ArchitectureTemplate } from '../lib/challenge-config';
import { useUXTracker } from '../hooks/useUXTracker';
import { useOnboarding } from '../lib/onboarding/OnboardingManager';
import { WorkflowOptimizer } from '../lib/user-experience/WorkflowOptimizer';
import { ShortcutLearningSystem } from '../lib/shortcuts/ShortcutLearningSystem';
import { 
  useOptimizedCallback, 
  useStableReference, 
  useOptimizedMemo 
} from '../lib/performance/PerformanceOptimizer';
import { DiagramAPI, type DiagramElement as TauriElement, type Connection as TauriConnection } from '../services/tauri';
import { useAutoSave } from '../hooks/useAutoSave';
import { isTauriEnvironment, FEATURES } from '../lib/environment';

// Eagerly load core canvas to avoid Suspense fallback hanging
import { CanvasArea } from './CanvasArea';
import { VerticalSidebar } from './VerticalSidebar';
import { SidebarProvider } from './ui/sidebar';
// Keep hints lazy as an optional panel
const LazySolutionHints = React.lazy(() => import('./SolutionHints').then(module => ({ default: module.SolutionHints })));

// Loading components
const CanvasLoadingState = () => (
  <div className="w-full h-full flex items-center justify-center bg-muted/5">
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="grid grid-cols-3 gap-2 opacity-30">
        {[...Array(9)].map((_, i) => (
          <div key={i} className={`w-16 h-12 bg-gradient-to-br from-muted to-muted/60 rounded-lg animate-pulse`} style={{animationDelay: `${i * 100}ms`}} />
        ))}
      </div>
      <div className="text-sm text-muted-foreground animate-pulse">Preparing canvas...</div>
    </div>
  </div>
);

const HintsLoadingState = () => (
  <div className="h-full bg-card/50 backdrop-blur-sm border-l border-border/30 flex flex-col">
    <div className="p-4 border-b border-border/30">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-amber-200 to-orange-200 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
          <div className="w-32 h-3 bg-muted/60 rounded animate-pulse" />
        </div>
      </div>
    </div>
    <div className="p-4 space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 bg-muted/30 rounded-lg animate-pulse" style={{animationDelay: `${i * 150}ms`}}>
          <div className="w-3/4 h-4 bg-muted rounded mb-2" />
          <div className="w-1/2 h-3 bg-muted/60 rounded" />
        </div>
      ))}
    </div>
  </div>
);

interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
  onOpenCommandPalette: () => void;
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack, onOpenCommandPalette }: DesignCanvasProps) {
  // Guard for differing react-dnd backend expectations (class vs factory)
  const dndBackendFactory = useMemo(() => {
    try {
      // Some react-dnd versions expect a function factory, others accept the class directly.
      // This factory always constructs the backend with `new` to avoid "class constructor without new" errors.
      return ((manager: unknown, context: unknown) => new (HTML5Backend as unknown as any)(manager, context)) as unknown as any;
    } catch {
      return HTML5Backend as unknown as any;
    }
  }, []);
  const [components, setComponents] = useState<DesignComponent[]>(initialData.components);
  const [connections, setConnections] = useState<Connection[]>(initialData.connections);
  const [layers, setLayers] = useState<Layer[]>(initialData.layers?.length ? initialData.layers : [
    { id: 'default', name: 'Default Layer', visible: true, order: 0 }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(initialData.layers?.length ? initialData.layers[0].id : 'default');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [commentMode, setCommentMode] = useState<string | null>(null);
  const [performanceModeEnabled, setPerformanceModeEnabled] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState<'off' | 'basic' | 'full'>('off');
  const [showMinimap, setShowMinimap] = useState(false);
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo | null>(null);
  const [canvasExtents, setCanvasExtents] = useState({ width: 1000, height: 800 });
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasLoadedFromPersistence, setHasLoadedFromPersistence] = useState(false);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  
  // Tool selection state
  const [activeTool, setActiveTool] = useState<ToolType>(initialData.activeTool || 'select');
  
  // Grid configuration state
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    visible: false,
    spacing: 20,
    snapToGrid: false,
    color: 'hsl(var(--border))'
  });
  const canvasRef = useRef<HTMLDivElement>(null);
  const performanceMonitorRef = useRef<any | null>(null);
  // LRU cache implementation for export caching
  const exportCacheRef = useRef<{
    cache: Map<string, { value: string; lastUsed: number }>;
    maxSize: number;
  }>({
    cache: new globalThis.Map(),
    maxSize: 10
  });
  
  // Enhanced deferred performance monitor initialization
  const initializePerformanceMonitor = useCallback((level: 'basic' | 'full' = 'basic') => {
    if (!performanceModeEnabled && !userHasInteracted) return;
    
    if (!performanceMonitorRef.current) {
      import('../lib/performance/PerformanceOptimizer').then(({ createPerformanceUtils }) => {
        createPerformanceUtils(level).then((utils) => {
          performanceMonitorRef.current = utils.monitor;
        });
      });
    }
  }, [performanceModeEnabled, userHasInteracted]);
  
  // Progressive enhancement states
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  
  // UX Tracking integration (must be declared before using in deps below)
  const { trackCanvasAction, trackKeyboardShortcut, trackPerformance, trackError } = useUXTracker();

  // Progressive performance enhancement hook
  const interactionPatternsRef = useRef({ componentAdds: 0, moves: 0, connections: 0 });
  
  const trackInteractionPattern = useCallback((type: 'add' | 'move' | 'connect') => {
    interactionPatternsRef.current[type === 'add' ? 'componentAdds' : type === 'move' ? 'moves' : 'connections']++;
    
    const totalInteractions = Object.values(interactionPatternsRef.current).reduce((sum, count) => sum + count, 0);
    
    // Auto-suggest performance mode when design complexity increases
    if (totalInteractions > 15 && components.length > 20 && performanceLevel === 'off') {
      // Non-intrusive suggestion for performance mode
      console.log('Consider enabling performance mode for better experience with complex designs');
      trackPerformance('performance-suggestion-triggered', {
        totalInteractions,
        componentCount: components.length,
        connectionCount: connections.length
      });
    }
  }, [components.length, connections.length, performanceLevel, trackPerformance]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [hintsReady, setHintsReady] = useState(false);
  
  // UX Enhancement Systems
  // Memoize a safe workflow tracker with a no-op fallback to avoid runtime errors
  const workflowTracker = useMemo(() => {
    try {
      const instance = WorkflowOptimizer.getInstance();
      // Bind to preserve correct `this` and provide a stable reference
      return { trackAction: instance.trackAction.bind(instance) } as {
        trackAction: (type: string, duration?: number, success?: boolean, context?: string, metadata?: Record<string, any>) => void;
      };
    } catch (e) {
      // Fallback no-op to ensure safe calls even if instance retrieval fails
      return { trackAction: () => {} } as {
        trackAction: (type: string, duration?: number, success?: boolean, context?: string, metadata?: Record<string, any>) => void;
      };
    }
  }, []);
  const shortcutLearning = ShortcutLearningSystem.getInstance();
  const { addEventListener: onboardingAddEventListener } = useOnboarding();

  const extendedChallenge = challengeManager.getChallengeById(challenge.id) as ExtendedChallenge || challenge;

  // Stable references for complex objects to prevent unnecessary re-renders
  const stableComponents = useStableReference(components);
  const stableConnections = useStableReference(connections);

  // Memoized design complexity metrics
  const designMetrics = useOptimizedMemo(() => {
    const componentCount = components.length;
    const connectionCount = connections.length;
    const canvasElement = canvasRef.current;
    const canvasSize = canvasElement ? 
      canvasElement.offsetWidth * canvasElement.offsetHeight : 0;
    
    return {
      componentCount,
      connectionCount,
      canvasSize,
      complexity: componentCount + connectionCount * 2, // Connections are more complex
      isLargeDesign: componentCount > 50 || connectionCount > 100
    };
  }, [components.length, connections.length]);

  const handleComponentDrop = useOptimizedCallback((componentType: DesignComponent['type'], x: number, y: number) => {
    // Smart performance activation based on interaction patterns
    if (!userHasInteracted) {
      setUserHasInteracted(true);
    }
    
    trackInteractionPattern('add');
    
    // Auto-suggest performance mode when component count > 20
    if (components.length > 20 && performanceLevel === 'off') {
      console.log('💡 Tip: Enable performance mode for smoother experience with large designs');
    }
    
    if (performanceModeEnabled || performanceLevel !== 'off') {
      initializePerformanceMonitor(performanceLevel === 'full' ? 'full' : 'basic');
    }
    
    const measureFn = performanceMonitorRef.current
      ? performanceMonitorRef.current.measure.bind(performanceMonitorRef.current)
      : ((name: string, fn: () => any) => fn());
    const nextTotalComponents = components.length + 1;
    
    return measureFn('component-drop', () => {
      try {
        // Create new component (pooling will be added when MemoryOptimizer loads)
        const newComponent: DesignComponent = {
          id: `${componentType}-${Date.now()}`,
          type: componentType,
          x,
          y,
          label: componentType.charAt(0).toUpperCase() + componentType.slice(1).replace('-', ' ')
        };

        setComponents(prev => {
          const newComponents = [...prev, newComponent];
          const totalComponents = newComponents.length;
          
          // Track successful component drop with performance metrics
          trackCanvasAction('component-drop', {
            componentType,
            position: { x, y },
            totalComponents,
            designComplexity: designMetrics.complexity
          }, true);
          
          // Track with workflow optimizer (safe wrapper)
          workflowTracker.trackAction('component_added', 500, true, 'design-canvas', {
            componentType,
            totalComponents,
            position: { x, y }
          });

          // Track performance metrics
          trackPerformance('component-drop', {
            componentCount: totalComponents,
            renderTime: performanceMonitorRef.current?.getAverageMetric('component-drop') || 0
          });
          
          return newComponents;
        });
        
        // Mark canvas as active on first interaction
        if (!isCanvasActive) {
          setIsCanvasActive(true);
        }
        
        // Track interaction pattern for performance mode suggestions
        if (nextTotalComponents > 25 && performanceLevel === 'off') {
          trackPerformance('large-design-detected', {
            componentCount: nextTotalComponents,
            suggestionTriggered: true
          });
        }

      } catch (error) {
        trackCanvasAction('component-drop', {
          componentType,
          position: { x, y },
          error: error instanceof Error ? error.message : 'Unknown error'
        }, false);
        
        // Track failure with workflow optimizer (safe wrapper)
        workflowTracker.trackAction('component_add_failed', 200, false, 'design-canvas', {
          componentType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        trackError(error instanceof Error ? error : new Error('Component drop failed'));
      }
    });
  }, [performanceModeEnabled, performanceLevel, userHasInteracted, initializePerformanceMonitor, trackCanvasAction, trackPerformance, trackError, designMetrics.complexity, isCanvasActive, workflowTracker, trackInteractionPattern]);

  // Group operation handlers (declare before usage to avoid TDZ)
  const handleGroupMove = useOptimizedCallback((componentIds: string[], deltaX: number, deltaY: number) => {
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('group-move', () => {
        setComponents(prev => prev.map(comp => 
          componentIds.includes(comp.id) 
            ? { ...comp, x: comp.x + deltaX, y: comp.y + deltaY }
            : comp
        ));
        
        trackCanvasAction('group-move', {
          componentCount: componentIds.length,
          deltaX,
          deltaY,
          designComplexity: designMetrics.complexity
        }, true);
      });
    }
    // Fallback if monitor not ready
    setComponents(prev => prev.map(comp => 
      componentIds.includes(comp.id) 
        ? { ...comp, x: comp.x + deltaX, y: comp.y + deltaY }
        : comp
    ));
    trackCanvasAction('group-move', {
      componentCount: componentIds.length,
      deltaX,
      deltaY,
      designComplexity: designMetrics.complexity
    }, true);
    return;
  }, [trackCanvasAction, designMetrics]);

  const handleComponentMove = useOptimizedCallback((id: string, x: number, y: number) => {
    trackInteractionPattern('move');
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('component-move', () => {
        const component = components.find(c => c.id === id);
        if (component) {
          const distance = Math.sqrt(Math.pow(x - component.x, 2) + Math.pow(y - component.y, 2));
          
          // If component is part of multi-selection, move all selected components
          if (selectedComponents.length > 1 && selectedComponents.includes(id)) {
            const deltaX = x - component.x;
            const deltaY = y - component.y;
            handleGroupMove(selectedComponents, deltaX, deltaY);
          } else {
            setComponents(prev => prev.map(comp => 
              comp.id === id ? { ...comp, x, y } : comp
            ));
          }
          
          // Track component movement with performance context
          trackCanvasAction('component-move', {
            componentId: id,
            componentType: component.type,
            distance: Math.round(distance),
            newPosition: { x, y },
            designComplexity: designMetrics.complexity,
            isLargeDesign: designMetrics.isLargeDesign,
            isGroupMove: selectedComponents.length > 1 && selectedComponents.includes(id)
          }, true);

          // Track performance for large designs
          if (designMetrics.isLargeDesign) {
            trackPerformance('component-move-large', {
              componentCount: components.length,
              distance,
              renderTime: performanceMonitorRef.current?.getAverageMetric('component-move') || 0
            });
          }
        }
      });
    }
    // Fallback if monitor not ready
    {
      const component = components.find(c => c.id === id);
      if (component) {
        const distance = Math.sqrt(Math.pow(x - component.x, 2) + Math.pow(y - component.y, 2));
        
        if (selectedComponents.length > 1 && selectedComponents.includes(id)) {
          const deltaX = x - component.x;
          const deltaY = y - component.y;
          handleGroupMove(selectedComponents, deltaX, deltaY);
        } else {
          setComponents(prev => prev.map(comp => 
            comp.id === id ? { ...comp, x, y } : comp
          ));
        }
        trackCanvasAction('component-move', {
          componentId: id,
          componentType: component.type,
          distance: Math.round(distance),
          newPosition: { x, y },
          designComplexity: designMetrics.complexity,
          isLargeDesign: designMetrics.isLargeDesign,
          isGroupMove: selectedComponents.length > 1 && selectedComponents.includes(id)
        }, true);
        if (designMetrics.isLargeDesign) {
          trackPerformance('component-move-large', {
            componentCount: components.length,
            distance,
            renderTime: performanceMonitorRef.current?.getAverageMetric('component-move') || 0
          });
        }
      }
    }
    return;
  }, [components, selectedComponents, handleGroupMove, trackCanvasAction, trackPerformance, designMetrics]);

  

  const handleGroupDelete = useOptimizedCallback((componentIds: string[]) => {
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('group-delete', () => {
        // Remove components
        setComponents(prev => prev.filter(comp => !componentIds.includes(comp.id)));
        
        // Remove related connections
        setConnections(prev => prev.filter(conn => 
          !componentIds.includes(conn.from) && !componentIds.includes(conn.to)
        ));
        
        // Clear selection
        setSelectedComponents([]);
        setSelectedComponent(null);
        
        trackCanvasAction('group-delete', {
          componentCount: componentIds.length,
          designComplexity: designMetrics.complexity
        }, true);
      });
    }
    // Fallback if monitor not ready
    setComponents(prev => prev.filter(comp => !componentIds.includes(comp.id)));
    setConnections(prev => prev.filter(conn => 
      !componentIds.includes(conn.from) && !componentIds.includes(conn.to)
    ));
    setSelectedComponents([]);
    setSelectedComponent(null);
    trackCanvasAction('group-delete', {
      componentCount: componentIds.length,
      designComplexity: designMetrics.complexity
    }, true);
    return;
  }, [trackCanvasAction, designMetrics]);

  const handleGroupStyle = useOptimizedCallback((componentIds: string[], styleChanges: Partial<DesignComponent>) => {
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('group-style', () => {
        setComponents(prev => prev.map(comp => 
          componentIds.includes(comp.id) 
            ? { ...comp, ...styleChanges }
            : comp
        ));
        
        trackCanvasAction('group-style', {
          componentCount: componentIds.length,
          styleChanges,
          designComplexity: designMetrics.complexity
        }, true);
      });
    }
    // Fallback if monitor not ready
    setComponents(prev => prev.map(comp => 
      componentIds.includes(comp.id) 
        ? { ...comp, ...styleChanges }
        : comp
    ));
    trackCanvasAction('group-style', {
      componentCount: componentIds.length,
      styleChanges,
      designComplexity: designMetrics.complexity
    }, true);
    return;
  }, [trackCanvasAction, designMetrics]);

  const handleComponentSelect = useCallback((id: string) => {
    const component = components.find(c => c.id === id);
    setSelectedComponent(id);
    
    // Track component selection
    trackCanvasAction('component-select', {
      componentId: id,
      componentType: component?.type || 'unknown'
    }, true);
  }, [components, trackCanvasAction]);

  // Multi-component selection handlers
  const handleMultiComponentSelect = useCallback((componentIds: string[]) => {
    setSelectedComponents(componentIds);
    // Clear single selection when multi-selecting
    if (componentIds.length > 1) {
      setSelectedComponent(null);
    } else if (componentIds.length === 1) {
      setSelectedComponent(componentIds[0]);
    }
    
    trackCanvasAction('multi-component-select', {
      componentCount: componentIds.length,
      componentIds: componentIds
    }, true);
  }, [trackCanvasAction]);

  const handleClearSelection = useCallback(() => {
    setSelectedComponents([]);
    setSelectedComponent(null);
    
    trackCanvasAction('clear-selection', {}, true);
  }, [trackCanvasAction]);

  const handleSelectAll = useCallback((componentIds: string[]) => {
    setSelectedComponents(componentIds);
    setSelectedComponent(null); // Clear single selection
    
    trackCanvasAction('select-all', {
      componentCount: componentIds.length
    }, true);
  }, [trackCanvasAction]);

  const handleStartConnection = useCallback((id: string) => {
    setConnectionStart(id);
  }, []);

  const handleCompleteConnection = useOptimizedCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    
    trackInteractionPattern('connect');
    
    // Auto-suggest performance mode when connections > 30
    if (connections.length > 30 && performanceLevel === 'off') {
      console.log('💡 Tip: Performance mode recommended for designs with many connections');
    }
    
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('connection-create', () => {
        try {
          const fromComponent = components.find(c => c.id === fromId);
          const toComponent = components.find(c => c.id === toId);
          
          // Create new connection (pooling will be added when MemoryOptimizer loads)
          const newConnection: Connection = {
            id: `connection-${Date.now()}`,
            from: fromId,
            to: toId,
            label: 'Connection',
            type: 'data',
            direction: 'end'
          };

          setConnections(prev => {
            const newConnections = [...prev, newConnection];
            const totalConnections = newConnections.length;
            
            // Track successful connection creation with performance metrics
            trackCanvasAction('connection-create', {
              fromType: fromComponent?.type || 'unknown',
              toType: toComponent?.type || 'unknown',
              connectionType: 'data',
              totalConnections,
              designComplexity: designMetrics.complexity
            }, true);

            // Track performance for connection operations
            trackPerformance('connection-create', {
              connectionCount: totalConnections,
              renderTime: performanceMonitorRef.current?.getAverageMetric('connection-create') || 0
            });
            
            return newConnections;
          });
          setConnectionStart(null);

        } catch (error) {
          trackCanvasAction('connection-create', {
            fromId,
            toId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, false);
          trackError(error instanceof Error ? error : new Error('Connection creation failed'));
        }
      });
    }
    // Fallback if monitor not ready
    try {
      const fromComponent = components.find(c => c.id === fromId);
      const toComponent = components.find(c => c.id === toId);
      const newConnection: Connection = {
        id: `connection-${Date.now()}`,
        from: fromId,
        to: toId,
        label: 'Connection',
        type: 'data',
        direction: 'end'
      };
      setConnections(prev => {
        const newConnections = [...prev, newConnection];
        const totalConnections = newConnections.length;
        trackCanvasAction('connection-create', {
          fromType: fromComponent?.type || 'unknown',
          toType: toComponent?.type || 'unknown',
          connectionType: 'data',
          totalConnections,
          designComplexity: designMetrics.complexity
        }, true);
        trackPerformance('connection-create', {
          connectionCount: totalConnections,
          renderTime: performanceMonitorRef.current?.getAverageMetric('connection-create') || 0
        });
        return newConnections;
      });
      setConnectionStart(null);
    } catch (error) {
      trackCanvasAction('connection-create', { fromId, toId, error: error instanceof Error ? error.message : 'Unknown error' }, false);
      trackError(error instanceof Error ? error : new Error('Connection creation failed'));
    }
    return;
  }, [components, trackCanvasAction, trackPerformance, trackError, designMetrics, trackInteractionPattern, connections.length, performanceLevel]);

  const handleComponentLabelChange = useCallback((id: string, label: string) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, label } : comp
    ));
  }, []);

  const handleConnectionLabelChange = useCallback((id: string, label: string) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, label } : conn
    ));
  }, []);

  const handleConnectionDelete = useCallback((id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  }, []);

  const handleConnectionTypeChange = useCallback((id: string, type: Connection['type']) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, type } : conn
    ));
  }, []);

  const handleConnectionDirectionChange = useCallback((id: string, direction: Connection['direction']) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, direction } : conn
    ));
  }, []);

  // Grid management handlers
  const handleToggleGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, visible: !prev.visible }));
    trackCanvasAction('toggle-grid', { visible: !gridConfig.visible }, true);
  }, [gridConfig.visible, trackCanvasAction]);

  const handleToggleSnapToGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
    trackCanvasAction('toggle-snap-to-grid', { snapToGrid: !gridConfig.snapToGrid }, true);
  }, [gridConfig.snapToGrid, trackCanvasAction]);

  const handleGridSpacingChange = useCallback((spacing: string) => {
    const spacingValue = parseInt(spacing, 10);
    setGridConfig(prev => ({ ...prev, spacing: spacingValue }));
    trackCanvasAction('change-grid-spacing', { spacing: spacingValue }, true);
  }, [trackCanvasAction]);

  // Tool management handler
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    trackCanvasAction('tool-change', { tool }, true);
    
    // Update performance monitoring based on tool
    if (tool === 'zoom' || tool === 'pan') {
      initializePerformanceMonitor('full');
    }
  }, [trackCanvasAction, initializePerformanceMonitor]);

  // Layer management handlers
  const handleCreateLayer = useCallback((name: string) => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name,
      visible: true,
      order: layers.length
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);

  const handleRenameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, name } : layer
    ));
  }, []);

  const handleDeleteLayer = useCallback((id: string) => {
    if (id === 'default') return; // Cannot delete default layer
    
    // Move all components from deleted layer to default layer
    setComponents(prev => prev.map(comp =>
      comp.layerId === id ? { ...comp, layerId: 'default' } : comp
    ));
    
    setLayers(prev => prev.filter(layer => layer.id !== id));
    
    if (activeLayerId === id) {
      setActiveLayerId('default');
    }
  }, [activeLayerId]);

  const handleToggleLayerVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const handleReorderLayer = useCallback((id: string, newOrder: number) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, order: newOrder } : layer
    ));
  }, []);

  const handleActiveLayerChange = useCallback((id: string | null) => {
    setActiveLayerId(id);
  }, []);

  // Minimap handlers
  const handleToggleMinimap = useCallback(() => {
    setShowMinimap(prev => !prev);
  }, []);

  const handleMinimapPan = useCallback((x: number, y: number) => {
    if (canvasRef.current) {
      (canvasRef.current as any).scrollTo?.(x, y);
    }
  }, []);

  const handleMinimapZoom = useCallback((zoom: number, centerX?: number, centerY?: number) => {
    if (canvasRef.current) {
      (canvasRef.current as any).setZoom?.(zoom, centerX, centerY);
    }
  }, []);

  const handleViewportChange = useCallback((viewport: ViewportInfo) => {
    setViewportInfo(viewport);
    setCanvasExtents({ width: viewport.worldWidth, height: viewport.worldHeight });
    
    // Update cursor position from canvas
    if (canvasRef.current) {
      const currentPos = (canvasRef.current as any).getCurrentCursorPosition?.();
      setCursorPosition(currentPos);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'M' || event.key === 'm') {
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          handleToggleMinimap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleMinimap]);

  const handleDeleteComponent = useOptimizedCallback((id: string) => {
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('component-delete', () => {
        const component = components.find(c => c.id === id);
        const affectedConnections = connections.filter(conn => conn.from === id || conn.to === id);
        
        // Memory cleanup will be handled by lazy-loaded MemoryOptimizer when available

        setComponents(prev => {
          const newComponents = prev.filter(comp => comp.id !== id);
          const remainingComponents = newComponents.length;
          
          // Track component deletion with performance context
          trackCanvasAction('component-delete', {
            componentId: id,
            componentType: component?.type || 'unknown',
            affectedConnections: affectedConnections.length,
            remainingComponents,
            designComplexity: designMetrics.complexity
          }, true);

          // Track performance for deletion operations
          trackPerformance('component-delete', {
            deletedConnections: affectedConnections.length,
            remainingComponents,
            renderTime: performanceMonitorRef.current?.getAverageMetric('component-delete') || 0
          });
          
          return newComponents;
        });
        setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
        setSelectedComponent(null);
      });
    }
    // Fallback if monitor not ready
    {
      const component = components.find(c => c.id === id);
      const affectedConnections = connections.filter(conn => conn.from === id || conn.to === id);
      setComponents(prev => {
        const newComponents = prev.filter(comp => comp.id !== id);
        const remainingComponents = newComponents.length;
        trackCanvasAction('component-delete', {
          componentId: id,
          componentType: component?.type || 'unknown',
          affectedConnections: affectedConnections.length,
          remainingComponents,
          designComplexity: designMetrics.complexity
        }, true);
        trackPerformance('component-delete', {
          deletedConnections: affectedConnections.length,
          remainingComponents,
          renderTime: performanceMonitorRef.current?.getAverageMetric('component-delete') || 0
        });
        return newComponents;
      });
      setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
      setSelectedComponent(null);
    }
    return;
  }, [components, connections, trackCanvasAction, trackPerformance, designMetrics]);

  const handleSave = useOptimizedCallback(() => {
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measureAsync === 'function') {
      return perf.measureAsync('save-design', async () => {
        try {
          const designData = { 
            components, 
            connections,
            layers,
            gridConfig,
            metadata: {
              ...initialData.metadata,
              lastModified: new Date().toISOString(),
              performanceMetrics: {
                componentCount: components.length,
                connectionCount: connections.length,
                complexity: designMetrics.complexity,
                avgRenderTime: performanceMonitorRef.current?.getAverageMetric('component-move') || 0,
                fps: performanceMonitorRef.current?.getCurrentFPS() || 60
              }
            }
          };
          
          localStorage.setItem('archicomm-design', JSON.stringify(designData));
          
          // Track successful save with performance metrics
          trackCanvasAction('save', {
            componentCount: components.length,
            connectionCount: connections.length,
            challengeId: challenge.id,
            saveMethod: 'localStorage',
            designComplexity: designMetrics.complexity,
          }, true);
        } catch (error) {
          // Track save error
          trackCanvasAction('save', {
            componentCount: components.length,
            connectionCount: connections.length,
            challengeId: challenge.id,
            saveMethod: 'localStorage',
            format: 'json',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, false);
        }
      });
    }
    // Fallback if monitor not ready
    try {
      const designData = { 
        components, 
        connections,
        layers,
        gridConfig,
        metadata: {
          ...initialData.metadata,
          lastModified: new Date().toISOString(),
          performanceMetrics: {
            componentCount: components.length,
            connectionCount: connections.length,
            complexity: designMetrics.complexity,
            avgRenderTime: performanceMonitorRef.current?.getAverageMetric('component-move') || 0,
            fps: performanceMonitorRef.current?.getCurrentFPS() || 60
          }
        }
      };
      localStorage.setItem('archicomm-design', JSON.stringify(designData));
      trackCanvasAction('save', {
        componentCount: components.length,
        connectionCount: connections.length,
        challengeId: challenge.id,
        saveMethod: 'localStorage',
        designComplexity: designMetrics.complexity,
      }, true);
    } catch (error) {
      trackCanvasAction('save', {
        componentCount: components.length,
        connectionCount: connections.length,
        challengeId: challenge.id,
        saveMethod: 'localStorage',
        format: 'json',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false);
    }
    return;
  }, [components, connections, challenge.id, trackCanvasAction, trackPerformance, trackError, designMetrics, initialData.metadata]);

  const handleExport = useCallback(() => {
    try {
      const designData = { components, connections };
      const dataStr = JSON.stringify(designData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${challenge.id}-design.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Track successful export
      trackCanvasAction('export', {
        format: 'json',
        componentCount: components.length,
        connectionCount: connections.length,
        challengeId: challenge.id
      }, true);
    } catch (error) {
      trackCanvasAction('export', {
        format: 'json',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false);
    }
  }, [components, connections, challenge.id, trackCanvasAction]);

  const handleExportImage = useOptimizedCallback(async () => {
    if (!canvasRef.current) return;
    
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measureAsync === 'function') {
      return perf.measureAsync('export-image', async () => {
        const startTime = Date.now();
        setIsExporting(true);
        
        try {
          // Check cache for repeated exports with LRU access tracking
          const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
          const cacheEntry = exportCacheRef.current.cache.get(cacheKey);
          if (cacheEntry) {
            // Update last used timestamp for LRU
            cacheEntry.lastUsed = Date.now();
            exportCacheRef.current.cache.set(cacheKey, cacheEntry);
            
            const link = document.createElement('a');
            link.href = cacheEntry.value;
            link.download = `${challenge?.id || 'design'}-design.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            trackCanvasAction('export-image-cached', {
              format: 'png',
              componentCount: components.length,
              connectionCount: connections.length,
              exportTime: Date.now() - startTime,
            }, true);
            
            // Track performance including cache hits for visibility
            trackPerformance('export-image', {
              cached: true,
              duration: Date.now() - startTime,
              cacheSize: exportCacheRef.current.cache.size
            });
            
            setIsExporting(false);
            return;
          }

          // Generate image
          const dataUrl = await toPng(canvasRef.current!);
          
          // Update cache with LRU
          exportCacheRef.current.cache.set(cacheKey, {
            value: dataUrl,
            lastUsed: Date.now()
          });
          // Evict least recently used if over max size
          if (exportCacheRef.current.cache.size > exportCacheRef.current.maxSize) {
            let oldestKey: string | null = null;
            let oldestTime = Infinity;
            for (const [key, entry] of exportCacheRef.current.cache.entries()) {
              if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
              }
            }
            if (oldestKey) exportCacheRef.current.cache.delete(oldestKey);
          }
          
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${challenge?.id || 'design'}-design.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          trackCanvasAction('export-image', {
            format: 'png',
            componentCount: components.length,
            connectionCount: connections.length,
            exportTime: Date.now() - startTime,
          }, true);
          
          // Track performance metrics
          trackPerformance('export-image', {
            cached: false,
            duration: Date.now() - startTime,
            avgRenderTime: performanceMonitorRef.current?.getAverageMetric('export-image') || 0,
          });
        } catch (error) {
          console.error('Export failed:', error);
          trackCanvasAction('export-image', {
            format: 'png',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, false);
          
          trackError(error instanceof Error ? error : new Error('Export failed'));
        } finally {
          if (canvasRef.current) {
            canvasRef.current.classList.remove('export-mode');
          }
          setIsExporting(false);
        }
      });
    }
    // Fallback if monitor not ready
    {
      const startTime = Date.now();
      setIsExporting(true);
      try {
        const dataUrl = await toPng(canvasRef.current!);
        const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
        exportCacheRef.current.cache.set(cacheKey, { value: dataUrl, lastUsed: Date.now() });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${challenge?.id || 'design'}-design.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        trackCanvasAction('export-image', {
          format: 'png',
          componentCount: components.length,
          connectionCount: connections.length,
          exportTime: Date.now() - startTime,
        }, true);
      } catch (error) {
        console.error('Export failed:', error);
        trackCanvasAction('export-image', {
          format: 'png',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, false);
        trackError(error instanceof Error ? error : new Error('Export failed'));
      } finally {
        if (canvasRef.current) {
          canvasRef.current.classList.remove('export-mode');
        }
        setIsExporting(false);
      }
    }
    return;
  }, [challenge.id, components.length, connections.length, trackCanvasAction, trackPerformance, trackError, designMetrics]);

  const handleContinue = useOptimizedCallback(() => {
    const perf = performanceMonitorRef.current;
    if (perf && typeof perf.measure === 'function') {
      return perf.measure('design-complete', () => {
        const designData: DesignData = {
          components,
          connections,
          layers,
          gridConfig,
          activeTool,
          metadata: {
            created: initialData.metadata.created,
            lastModified: new Date().toISOString(),
            version: '1.0',
            performanceMetrics: {
              componentCount: components.length,
              connectionCount: connections.length,
              complexity: designMetrics.complexity,
              avgRenderTime: performanceMonitorRef.current?.getAverageMetric('component-move') || 0,
              fps: performanceMonitorRef.current?.getCurrentFPS() || 60,
              totalInteractions: (performanceMonitorRef.current?.getMetrics('component-drop')?.length || 0) +
                               (performanceMonitorRef.current?.getMetrics('component-move')?.length || 0) +
                               (performanceMonitorRef.current?.getMetrics('connection-create')?.length || 0)
            }
          }
        };
        
        try {
          localStorage.setItem('archicomm-design-complete', JSON.stringify(designData));
        } catch {}
        
        trackCanvasAction('design-complete', {
          componentCount: components.length,
          connectionCount: connections.length,
          challengeId: challenge.id,
          designComplexity: designMetrics.complexity
        }, true);
      });
    }
    // Fallback if monitor not ready
    {
      const designData: DesignData = {
        components,
        connections,
        layers,
        gridConfig,
        activeTool,
        metadata: {
          created: initialData.metadata.created,
          lastModified: new Date().toISOString(),
          version: '1.0',
          performanceMetrics: {
            componentCount: components.length,
            connectionCount: connections.length,
            complexity: designMetrics.complexity,
            avgRenderTime: performanceMonitorRef.current?.getAverageMetric('component-move') || 0,
            fps: performanceMonitorRef.current?.getCurrentFPS() || 60,
            totalInteractions: (performanceMonitorRef.current?.getMetrics('component-drop')?.length || 0) +
                             (performanceMonitorRef.current?.getMetrics('component-move')?.length || 0) +
                             (performanceMonitorRef.current?.getMetrics('connection-create')?.length || 0)
          }
        }
      };
      try { localStorage.setItem('archicomm-design-complete', JSON.stringify(designData)); } catch {}
      trackCanvasAction('design-complete', {
        componentCount: components.length,
        connectionCount: connections.length,
        challengeId: challenge.id,
        designComplexity: designMetrics.complexity
      }, true);
    }
    return;
  }, [components, connections, initialData.metadata.created, onComplete, designMetrics, challenge.id, trackCanvasAction, trackPerformance]);

  // Performance monitoring and cleanup
  useEffect(() => {
    // Performance budget warnings (only when performance mode is enabled)
    if (performanceModeEnabled && designMetrics.isLargeDesign) {
      trackPerformance('performance-budget-warning', {
        componentCount: designMetrics.componentCount,
        connectionCount: designMetrics.connectionCount,
        complexity: designMetrics.complexity,
        performanceLevel
      });
    }
    
    // Smart performance mode suggestions
    if (designMetrics.isLargeDesign && performanceLevel === 'off') {
      console.log('💡 Large design detected. Performance mode can improve responsiveness.');
    }

    // Lazy cleanup of export cache (only when performance mode is off)
    if (performanceLevel === 'off') {
      const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
      const currentCacheKeys = Array.from(exportCacheRef.current.cache.keys());
      currentCacheKeys.forEach(key => {
        if (key !== cacheKey) {
          exportCacheRef.current.cache.delete(key);
        }
      });
    }

    return () => {
      // Cleanup performance monitoring on unmount
      if (performanceMonitorRef.current && (performanceModeEnabled || performanceLevel !== 'off')) {
        performanceMonitorRef.current = null;
      }
      
      if (exportCacheRef.current.cache.size > exportCacheRef.current.maxSize) {
        exportCacheRef.current.cache.clear();
      }
    };
  }, [designMetrics, performanceModeEnabled, performanceLevel, challenge.id, components.length, connections.length, trackPerformance]);

  // Persistence mapping helpers
  const toTauriElements = useCallback((comps: DesignComponent[]): TauriElement[] => {
    return comps.map(c => ({
      id: c.id,
      element_type: c.type,
      position: { x: c.x, y: c.y },
      properties: {
        label: c.label || '',
        description: c.description || '',
        layerId: c.layerId || 'default',
        ...(c.properties || {}),
      },
    }));
  }, []);

  const fromTauriElements = useCallback((els: TauriElement[]): DesignComponent[] => {
    return els.map(e => ({
      id: e.id,
      type: e.element_type,
      x: e.position?.x ?? 0,
      y: e.position?.y ?? 0,
      label: (e.properties as any)?.label || e.element_type,
      description: (e.properties as any)?.description || undefined,
      layerId: (e.properties as any)?.layerId || 'default',
      properties: e.properties || {},
    }));
  }, []);

  const toTauriConnections = useCallback((conns: Connection[]): TauriConnection[] => {
    return conns.map(c => ({
      id: c.id,
      source_id: c.from,
      target_id: c.to,
      connection_type: c.type,
      properties: {
        label: c.label || '',
        protocol: c.protocol || '',
        direction: c.direction || 'none',
      },
    }));
  }, []);

  const fromTauriConnections = useCallback((conns: TauriConnection[]): Connection[] => {
    return conns.map(c => ({
      id: c.id,
      from: c.source_id,
      to: c.target_id,
      type: (c.connection_type as any) || 'data',
      label: (c.properties as any)?.label || '',
      protocol: (c.properties as any)?.protocol || undefined,
      direction: (c.properties as any)?.direction || 'none',
    }));
  }, []);

  // Load persisted diagram on mount (keyed by challenge.id)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isTauriEnvironment()) return;
        const [els, conns] = await Promise.all([
          DiagramAPI.loadDiagram(challenge.id),
          DiagramAPI.loadConnections(challenge.id),
        ]);
        if (cancelled) return;
        if ((els && els.length) || (conns && conns.length)) {
          setComponents(fromTauriElements(els || []));
          setConnections(fromTauriConnections(conns || []));
        }
      } catch (e) {
        console.warn('Failed to load persisted diagram:', e);
      } finally {
        if (!cancelled) setHasLoadedFromPersistence(true);
      }
    })();
    return () => { cancelled = true; };
  }, [challenge.id, fromTauriConnections, fromTauriElements]);

  // Start blank by default: do not auto-show template prompt
  // (Users can still load a template explicitly from Solution Hints when available.)
  useEffect(() => {
    // Intentionally left blank to keep default state as blank canvas
  }, []);

  // Auto-save to backend (debounced)
  const saveDesignToBackend = useCallback(async (payload: { components: DesignComponent[]; connections: Connection[]; layers: Layer[]; gridConfig?: GridConfig }) => {
    if (!isTauriEnvironment()) return;
    await DiagramAPI.saveDiagram(challenge.id, toTauriElements(payload.components));
    await DiagramAPI.saveConnections(challenge.id, toTauriConnections(payload.connections));
  }, [challenge.id, toTauriConnections, toTauriElements]);

  const { isSaving, forceSave } = useAutoSave(
    { components, connections, layers, gridConfig },
    saveDesignToBackend,
    { delay: 2000, enabled: FEATURES.AUTO_SAVE }
  );

  // Apply architecture template to the canvas
  const applyTemplate = useCallback((template: ArchitectureTemplate) => {
    try {
      const now = Date.now();
      // Map template components to design components
      const compMap = new globalThis.Map<string, string>(); // label -> id
      const newComponents: DesignComponent[] = template.components.map((c, idx) => {
        const id = `${c.type}-${now}-${idx}`;
        compMap.set(c.label, id);
        return {
          id,
          type: c.type as string,
          x: c.position?.x ?? 100 + idx * 40,
          y: c.position?.y ?? 100 + idx * 30,
          label: c.label,
          description: c.description,
          properties: c.properties || {},
          layerId: activeLayerId || 'default',
        };
      });

      const newConnections: Connection[] = template.connections.map((conn, idx) => {
        const fromId = compMap.get(conn.from) || '';
        const toId = compMap.get(conn.to) || '';
        return {
          id: `conn-${now}-${idx}`,
          from: fromId,
          to: toId,
          label: conn.label,
          type: (conn.type as any) || 'data',
          protocol: conn.protocol,
          direction: 'end',
        };
      }).filter(c => c.from && c.to);

      setComponents(prev => [...prev, ...newComponents]);
      setConnections(prev => [...prev, ...newConnections]);
      setShowTemplatePrompt(false);
      // Fire a manual save soon after applying template
      setTimeout(() => { try { forceSave(); } catch {} }, 100);
    } catch (e) {
      console.warn('Failed to apply template:', e);
    }
  }, [forceSave]);

  // Progressive canvas initialization
  useEffect(() => {
    if (isCanvasActive) {
      setCanvasReady(true);
    }
  }, [isCanvasActive]);
  
  // Initialize hints when requested
  useEffect(() => {
    if (showHints && !hintsReady) {
      setHintsReady(true);
    }
  }, [showHints, hintsReady]);

  // Initialize keyboard shortcuts hook
  useKeyboardShortcuts([
    {
      key: 'g',
      description: 'Toggle grid visibility',
      action: handleToggleGrid,
      category: 'Grid'
    },
    {
      key: 'shift+g',
      description: 'Toggle snap to grid',
      action: handleToggleSnapToGrid,
      category: 'Grid'
    },
    {
      key: 'v',
      description: 'Select tool',
      action: () => handleToolChange('select'),
      category: 'Tools'
    },
    {
      key: 'h',
      description: 'Pan tool',
      action: () => handleToolChange('pan'),
      category: 'Tools'
    },
    {
      key: 'z',
      description: 'Zoom tool',
      action: () => handleToolChange('zoom'),
      category: 'Tools'
    },
    {
      key: 'a',
      description: 'Annotate tool',
      action: () => handleToolChange('annotate'),
      category: 'Tools'
    }
  ]);

  return (
    <DndProvider backend={dndBackendFactory}>
      <SidebarProvider defaultOpen>
      <div className="min-h-svh flex flex-col">
        {/* Main Toolbar */}
        <TopBar
          onBack={onBack}
          challengeTitle={challenge.title}
          challengeDescription={challenge.description}
          componentCount={components.length}
          connectionCount={connections.length}
          designComplexity={designMetrics.complexity}
          isSaving={isSaving}
          performanceModeEnabled={performanceModeEnabled}
          onTogglePerformanceMode={() => setPerformanceModeEnabled(!performanceModeEnabled)}
          showHints={showHints}
          onToggleHints={() => {
            const newHintsState = !showHints;
            workflowTracker.trackAction('toggle_hints', 200, true, 'design-canvas', {
              enabled: newHintsState,
              componentCount: components.length
            });
            trackCanvasAction('toggle-hints', {
              showHints: newHintsState,
              componentCount: components.length,
              designComplexity: designMetrics.complexity
            }, true);
            setShowHints(newHintsState);
          }}
          onOpenCommandPalette={onOpenCommandPalette}
          onSave={() => { try { forceSave(); } catch {} handleSave(); workflowTracker.trackAction('manual_save', 300, true, 'design-canvas'); }}
          onExportJSON={() => { handleExport(); workflowTracker.trackAction('export_json', 500, true, 'design-canvas'); }}
          onExportPNG={() => { handleExportImage(); workflowTracker.trackAction('export_png', 2000, true, 'design-canvas'); }}
          isExporting={isExporting}
          onContinue={() => {
            handleContinue();
            workflowTracker.trackAction('continue_to_recording', 1000, true, 'design-canvas', {
              componentCount: components.length,
              connectionCount: connections.length,
              designComplexity: designMetrics.complexity
            });
          }}
          canContinue={!isExporting}
        />

        {/* Canvas Toolbar */}
        <CanvasToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          gridConfig={gridConfig}
          onToggleGrid={handleToggleGrid}
          onToggleSnapToGrid={handleToggleSnapToGrid}
          onGridSpacingChange={handleGridSpacingChange}
          showMinimap={showMinimap}
          onToggleMinimap={handleToggleMinimap}
          viewportInfo={viewportInfo}
          canvasExtents={canvasExtents}
          onMinimapPan={handleMinimapPan}
          onMinimapZoom={handleMinimapZoom}
          components={components}
          connections={connections}
          layers={layers}
        />
        {/* Template prompt removed: default start is blank. Template can still be loaded via Solution Hints when available. */}

        {/* Main Canvas Area */}
        <div className="flex-1 min-h-0 flex" role="main" aria-labelledby="challenge-title">
          {/* Left Sidebar - Component Library Only */}
          <div className="w-80 shrink-0 h-full border-r bg-card/50">
            <VerticalSidebar
              challenge={challenge}
            />
          </div>

          {/* Center - Canvas Area */}
          <div className="flex-1 min-w-0 min-h-0" role="region" aria-label="Design canvas">
            <CanvasArea
              ref={canvasRef}
              components={components}
              connections={connections}
              layers={layers}
              activeLayerId={activeLayerId}
              selectedComponent={selectedComponent}
              selectedComponents={selectedComponents}
              connectionStart={connectionStart}
              commentMode={commentMode}
              isCommentModeActive={!!commentMode}
              gridConfig={gridConfig}
              activeTool={activeTool}
              onComponentDrop={handleComponentDrop}
              onComponentMove={handleComponentMove}
              onComponentSelect={handleComponentSelect}
              onConnectionLabelChange={handleConnectionLabelChange}
              onConnectionDelete={handleConnectionDelete}
              onConnectionTypeChange={handleConnectionTypeChange}
              onConnectionDirectionChange={handleConnectionDirectionChange}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onMultiComponentSelect={handleMultiComponentSelect}
              onClearSelection={handleClearSelection}
              onSelectAll={handleSelectAll}
              onGroupMove={handleGroupMove}
              onGroupDelete={handleGroupDelete}
              onViewportChange={handleViewportChange}
              data-testid="design-canvas"
              aria-describedby="challenge-description"
            />
          </div>
          
          {/* Right Sidebar - Properties, Layers, Assignment */}
          <div className="w-80 shrink-0 h-full border-l bg-card/50">
            <RightSidebar
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={handleComponentLabelChange}
              onDelete={handleDeleteComponent}
              layers={layers}
              activeLayerId={activeLayerId}
              onCreateLayer={handleCreateLayer}
              onRenameLayer={handleRenameLayer}
              onDeleteLayer={handleDeleteLayer}
              onToggleLayerVisibility={handleToggleLayerVisibility}
              onReorderLayer={handleReorderLayer}
              onActiveLayerChange={handleActiveLayerChange}
              challenge={challenge}
            />
          </div>

          {/* Solution Hints Panel - Overlays on right when active */}
          {showHints && (
            <div className="absolute right-0 top-0 w-80 h-full bg-background border-l shadow-lg z-10">
              <Suspense fallback={<HintsLoadingState />}>
                <LazySolutionHints
                  challenge={extendedChallenge}
                  currentComponents={components}
                  onHintViewed={(hintId) => {
                    trackCanvasAction('hint-viewed', { hintId }, true);
                  }}
                  onTemplateRequest={() => {
                    const t = (extendedChallenge as any).architectureTemplate as ArchitectureTemplate | undefined;
                    if (t) applyTemplate(t);
                  }}
                  onClose={() => setShowHints(false)}
                />
              </Suspense>
            </div>
          )}
        </div>

      </div>
      </SidebarProvider>
    </DndProvider>
  );
}
