import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toPng } from 'html-to-image';
import { useKeyboardShortcuts } from '../lib/shortcuts/KeyboardShortcuts';
import { Button } from './ui/button';
import { Challenge, DesignComponent, Connection, DesignData } from '../App';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import { ArrowLeft, Save, Download, Image, Lightbulb, Zap, Component } from 'lucide-react';
import { SmartTooltip } from './ui/SmartTooltip';
import { useUXTracker } from '../hooks/useUXTracker';
import { useOnboarding } from '../lib/onboarding/OnboardingManager';
import { WorkflowOptimizer } from '../lib/user-experience/WorkflowOptimizer';
import { ShortcutLearningSystem } from '../lib/shortcuts/ShortcutLearningSystem';
import { 
  useOptimizedCallback, 
  useStableReference, 
  useOptimizedMemo 
} from '../lib/performance/PerformanceOptimizer';

// Eagerly load core canvas to avoid Suspense fallback hanging
import { CanvasArea } from './CanvasArea';
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
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack }: DesignCanvasProps) {
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
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [commentMode, setCommentMode] = useState<string | null>(null);
  const [performanceModeEnabled, setPerformanceModeEnabled] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState<'off' | 'basic' | 'full'>('off');
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const performanceMonitorRef = useRef<any | null>(null);
  // LRU cache implementation for export caching
  const exportCacheRef = useRef<{
    cache: Map<string, { value: string; lastUsed: number }>;
    maxSize: number;
  }>({
    cache: new Map(),
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
  const useProgressivePerformance = useCallback(() => {
    const interactionPatterns = useRef({ componentAdds: 0, moves: 0, connections: 0 });
    
    const trackInteractionPattern = useCallback((type: 'add' | 'move' | 'connect') => {
      interactionPatterns.current[type === 'add' ? 'componentAdds' : type === 'move' ? 'moves' : 'connections']++;
      
      const totalInteractions = Object.values(interactionPatterns.current).reduce((sum, count) => sum + count, 0);
      
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
    }, []);
    
    return { trackInteractionPattern };
  }, [components.length, connections.length, performanceLevel, trackPerformance]);
  
  const { trackInteractionPattern } = useProgressivePerformance();
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
    const measureFn = performanceMonitorRef.current?.measure || ((name: string, fn: () => any) => fn());
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

  const handleComponentMove = useOptimizedCallback((id: string, x: number, y: number) => {
    trackInteractionPattern('move');
    const measureFn = performanceMonitorRef.current?.measure || ((name: string, fn: () => any) => fn());
    return measureFn('component-move', () => {
      const component = components.find(c => c.id === id);
      if (component) {
        const distance = Math.sqrt(Math.pow(x - component.x, 2) + Math.pow(y - component.y, 2));
        
        setComponents(prev => prev.map(comp => 
          comp.id === id ? { ...comp, x, y } : comp
        ));
        
        // Track component movement with performance context
        trackCanvasAction('component-move', {
          componentId: id,
          componentType: component.type,
          distance: Math.round(distance),
          newPosition: { x, y },
          designComplexity: designMetrics.complexity,
          isLargeDesign: designMetrics.isLargeDesign
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
  }, [components, trackCanvasAction, trackPerformance, designMetrics]);

  const handleComponentSelect = useCallback((id: string) => {
    const component = components.find(c => c.id === id);
    setSelectedComponent(id);
    
    // Track component selection
    trackCanvasAction('component-select', {
      componentId: id,
      componentType: component?.type || 'unknown'
    }, true);
  }, [components, trackCanvasAction]);

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
    
    const measureFn = performanceMonitorRef.current?.measure || ((name: string, fn: () => any) => fn());
    return measureFn('connection-create', () => {
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

  const handleDeleteComponent = useOptimizedCallback((id: string) => {
    const measureFn = performanceMonitorRef.current?.measure || ((name: string, fn: () => any) => fn());
    return measureFn('component-delete', () => {
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
  }, [components, connections, trackCanvasAction, trackPerformance, designMetrics]);

  const handleSave = useOptimizedCallback(() => {
    const measureFn = performanceMonitorRef.current?.measureAsync || ((name: string, fn: () => any) => fn());
    return measureFn('save-design', async () => {
      try {
        const designData = { 
          components, 
          connections,
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
          performanceMetrics: designData.metadata.performanceMetrics
        }, true);

        trackPerformance('save-design', {
          dataSize: JSON.stringify(designData).length,
          componentCount: components.length,
          connectionCount: connections.length
        });

      } catch (error) {
        trackCanvasAction('save', {
          componentCount: components.length,
          connectionCount: connections.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, false);
        trackError(error instanceof Error ? error : new Error('Save failed'));
      }
    });
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
    
    const measureFn = performanceMonitorRef.current?.measureAsync || ((name: string, fn: () => any) => fn());
    return measureFn('export-image', async () => {
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
            challengeId: challenge.id
          }, true);
          return;
        }

        // Temporarily hide UI overlays for clean export
        if (canvasRef.current) {
          canvasRef.current.classList.add('export-mode');
        }
        
        // Progressive rendering for large designs
        const exportOptions = designMetrics.isLargeDesign ? {
          quality: 0.8,
          pixelRatio: 1.5,
          backgroundColor: '#ffffff'
        } : {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        };
        
        // Capture the canvas as PNG with optimized settings
        const dataUrl = await toPng(canvasRef.current, exportOptions);
        
        // Cache the result with LRU eviction strategy
        const cache = exportCacheRef.current.cache;
        const maxSize = exportCacheRef.current.maxSize;
        
        // If cache is at capacity, remove least recently used entry
        if (cache.size >= maxSize) {
          let lruKey: string | undefined;
          let oldestTime = Date.now();
          
          for (const [key, entry] of cache.entries()) {
            if (entry.lastUsed < oldestTime) {
              oldestTime = entry.lastUsed;
              lruKey = key;
            }
          }
          
          if (lruKey) {
            cache.delete(lruKey);
          }
        }
        
        // Add new entry with current timestamp
        cache.set(cacheKey, { value: dataUrl, lastUsed: Date.now() });
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${challenge.id}-design.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Track successful image export with performance metrics
        trackCanvasAction('export-image', {
          format: 'png',
          componentCount: components.length,
          connectionCount: connections.length,
          exportTime: Date.now() - startTime,
          challengeId: challenge.id,
          designComplexity: designMetrics.complexity,
          isLargeDesign: designMetrics.isLargeDesign,
          quality: exportOptions.quality,
          pixelRatio: exportOptions.pixelRatio
        }, true);

        trackPerformance('export-image', {
          exportTime: Date.now() - startTime,
          componentCount: components.length,
          connectionCount: connections.length,
          imageSize: dataUrl.length,
          quality: exportOptions.quality
        });
        
      } catch (error) {
        console.error('Failed to export image:', error);
        trackCanvasAction('export-image', {
          format: 'png',
          error: error instanceof Error ? error.message : 'Unknown error',
          exportTime: Date.now() - startTime
        }, false);
        trackError(error instanceof Error ? error : new Error('Image export failed'));
      } finally {
        // Restore UI overlays
        if (canvasRef.current) {
          canvasRef.current.classList.remove('export-mode');
        }
        setIsExporting(false);
      }
    });
  }, [challenge.id, components.length, connections.length, trackCanvasAction, trackPerformance, trackError, designMetrics]);

  const handleContinue = useOptimizedCallback(() => {
    const measureFn = performanceMonitorRef.current?.measure || ((name: string, fn: () => any) => fn());
    return measureFn('design-complete', () => {
      const designData: DesignData = {
        components,
        connections,
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

      // Track design completion with comprehensive metrics
      trackCanvasAction('design-complete', {
        componentCount: components.length,
        connectionCount: connections.length,
        designComplexity: designMetrics.complexity,
        challengeId: challenge.id,
        performanceMetrics: designData.metadata.performanceMetrics
      }, true);

      trackPerformance('design-complete', designData.metadata.performanceMetrics);
      
      onComplete(designData);
    });
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
  useKeyboardShortcuts([]);

  return (
    <DndProvider backend={dndBackendFactory}>
      <div className="h-screen flex flex-col">
        {/* Main Toolbar */}
        <div className="border-b bg-card p-4" data-testid="canvas-toolbar">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SmartTooltip 
                content="Return to challenge selection"
                contextualHelp="Choose a different challenge or modify challenge requirements"
                shortcut="Alt+1"
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onBack}
                  aria-label="Return to challenge selection"
                  data-help-target="design-canvas-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </SmartTooltip>
              <div>
                <h2 id="challenge-title" className="text-lg font-semibold">{challenge.title}</h2>
                <p className="text-sm text-muted-foreground" id="challenge-description">
                  {challenge.description}
                </p>
                <div className="text-xs text-muted-foreground mt-1" aria-live="polite">
                  Components: {components.length} • Connections: {connections.length}
                  {designMetrics.isLargeDesign && (
                    <span className="ml-2 text-amber-600">
                      • Large design (consider performance mode)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2" role="toolbar" aria-label="Canvas tools">
              <SmartTooltip 
                content={performanceModeEnabled ? 'Disable performance optimizations' : 'Enable performance mode for large designs'}
                contextualHelp="Performance mode optimizes rendering for designs with 50+ components by reducing animation quality and enabling object pooling"
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPerformanceModeEnabled(!performanceModeEnabled)}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {performanceModeEnabled ? 'Performance Mode: ON' : 'Performance Mode: OFF'}
                </Button>
              </SmartTooltip>
              <div id="performance-mode-desc" className="sr-only">
                {performanceModeEnabled 
                  ? 'Performance optimizations are currently enabled' 
                  : 'Performance optimizations are disabled'
                }
              </div>
              <SmartTooltip 
                content={showHints ? 'Hide solution hints and guidance' : 'Show architectural guidance and best practices'}
                contextualHelp="Solution hints provide context-aware suggestions for system architecture patterns, component placement, and design best practices based on your current challenge"
                shortcut="?"
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
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
                  className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                  data-help-target="design-canvas-hints"
                  aria-pressed={showHints}
                  aria-describedby="hints-desc"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showHints ? 'Hide Hints' : 'Show Hints'}
                </Button>
              </SmartTooltip>
              <div id="hints-desc" className="sr-only">
                {showHints 
                  ? 'Solution hints panel is currently visible' 
                  : 'Solution hints panel is hidden'
                }
              </div>
              <SmartTooltip 
                content="Save current design progress" 
                contextualHelp="Saves your design locally. Auto-saves occur every few seconds when you make changes. Use Ctrl+S to manually save anytime."
                shortcut="Ctrl+S"
              >
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    handleSave();
                    workflowTracker.trackAction('manual_save', 300, true, 'design-canvas');
                  }}
                  data-help-target="design-canvas-save"
                  aria-label="Save design progress"
                >
                  <Save className="w-4 h-4" />
                  <span className="sr-only">Save Design</span>
                </Button>
              </SmartTooltip>
              <SmartTooltip 
                content="Export design as JSON file" 
                contextualHelp="Downloads your complete design as a JSON file that can be imported later or shared with others. Includes all components, connections, and metadata."
                shortcut="Ctrl+E"
              >
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    handleExport();
                    workflowTracker.trackAction('export_json', 500, true, 'design-canvas');
                  }}
                  data-help-target="design-canvas-export"
                  aria-label="Export design as JSON"
                >
                  <Download className="w-4 h-4" />
                  <span className="sr-only">Export Design as JSON</span>
                </Button>
              </SmartTooltip>
              <SmartTooltip 
                content="Export design as PNG image" 
                contextualHelp="Creates a high-quality PNG image of your design perfect for presentations, documentation, or sharing. Large designs are automatically optimized for best quality."
                shortcut="Ctrl+Shift+E"
              >
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    handleExportImage();
                    workflowTracker.trackAction('export_png', 2000, true, 'design-canvas');
                  }}
                  disabled={isExporting}
                  data-help-target="design-canvas-export"
                  aria-label={isExporting ? 'Exporting PNG...' : 'Export design as PNG'}
                  aria-describedby={isExporting ? 'export-status' : undefined}
                >
                  <Image className="w-4 h-4" />
                  <span className="sr-only">{isExporting ? 'Exporting PNG...' : 'Export as PNG'}</span>
                </Button>
              </SmartTooltip>
              {isExporting && (
                <div id="export-status" className="sr-only" aria-live="polite">
                  Exporting design as PNG image, please wait...
                </div>
              )}
              <SmartTooltip 
                content={components.length === 0 ? 'Add components to continue' : 'Proceed to record your explanation'}
                contextualHelp="Once you're satisfied with your system design, continue to the recording phase where you'll explain your architectural decisions and thought process."
              >
                <Button 
                  onClick={() => {
                    handleContinue();
                    workflowTracker.trackAction('continue_to_recording', 1000, true, 'design-canvas', {
                      componentCount: components.length,
                      connectionCount: connections.length,
                      designComplexity: designMetrics.complexity
                    });
                  }}
                  disabled={components.length === 0 || isExporting}
                  aria-describedby="continue-help"
                >
                  {isExporting ? 'Exporting...' : 'Continue to Recording'}
                </Button>
              </SmartTooltip>
              <div id="continue-help" className="sr-only">
                {components.length === 0 
                  ? 'You must add at least one component before continuing' 
                  : 'Continue to the audio recording phase'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex" role="main" aria-labelledby="challenge-title">
          <div className="flex-1" role="region" aria-label="Design canvas">
            <CanvasArea
              ref={canvasRef}
              components={components}
              connections={connections}
              selectedComponent={selectedComponent}
              connectionStart={connectionStart}
              commentMode={commentMode}
              isCommentModeActive={!!commentMode}
              onComponentDrop={handleComponentDrop}
              onComponentMove={handleComponentMove}
              onComponentSelect={handleComponentSelect}
              onConnectionLabelChange={handleConnectionLabelChange}
              onConnectionDelete={handleConnectionDelete}
              onConnectionTypeChange={handleConnectionTypeChange}
              onConnectionDirectionChange={handleConnectionDirectionChange}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              data-testid="design-canvas"
              aria-describedby="challenge-description"
            />
          </div>
          
          {/* Solution Hints Panel */}
          {showHints && (
            <div className="w-80 shrink-0">
              <Suspense fallback={<HintsLoadingState />}>
                <LazySolutionHints
                  challenge={extendedChallenge}
                  currentComponents={components}
                  onHintViewed={(hintId) => {
                    trackCanvasAction('hint-viewed', { hintId }, true);
                  }}
                  onClose={() => setShowHints(false)}
                />
              </Suspense>
            </div>
          )}
        </div>

      </div>
    </DndProvider>
  );
}
