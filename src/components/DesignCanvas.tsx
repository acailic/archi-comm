import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toPng } from 'html-to-image';
import { useKeyboardShortcuts } from '../lib/shortcuts/KeyboardShortcuts';
import { Button } from './ui/button';
import { CanvasArea } from './CanvasArea';
import { SolutionHints } from './SolutionHints';
import { Challenge, DesignComponent, Connection, DesignData } from '../App';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import { ArrowLeft, Save, Download, Image, Lightbulb, Zap } from 'lucide-react';
import { SmartTooltip } from './ui/SmartTooltip';
import { useUXTracker } from '../hooks/useUXTracker';
import { useOnboarding } from '../lib/onboarding/OnboardingManager';
import { WorkflowOptimizer } from '../lib/user-experience/WorkflowOptimizer';
import { ShortcutLearningSystem } from '../lib/shortcuts/ShortcutLearningSystem';
import { 
  PerformanceMonitor, 
  MemoryOptimizer, 
  useOptimizedCallback, 
  useStableReference, 
  useOptimizedMemo 
} from '../lib/performance/PerformanceOptimizer';

interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack }: DesignCanvasProps) {
  // Memoized optimized components for performance mode
    const optimizedComponents = useMemo(() => {
      return performanceMode ? 
        components.filter(c => isInViewport(c)) : 
        components;
    }, [components, performanceMode]);
  const [components, setComponents] = useState<DesignComponent[]>(initialData.components);
  const [connections, setConnections] = useState<Connection[]>(initialData.connections);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [commentMode, setCommentMode] = useState<string | null>(null);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const performanceMonitor = useRef(PerformanceMonitor.getInstance());
  const exportCacheRef = useRef<Map<string, string>>(new Map());
  
  // UX Tracking integration
  const { trackCanvasAction, trackKeyboardShortcut, trackPerformance, trackError } = useUXTracker();
  
  // UX Enhancement Systems
  const workflowOptimizer = WorkflowOptimizer.getInstance();
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
    const canvasSize = canvasRef.current ? 
      canvasRef.current.offsetWidth * canvasRef.current.offsetHeight : 0;
    
    return {
      componentCount,
      connectionCount,
      canvasSize,
      complexity: componentCount + connectionCount * 2, // Connections are more complex
      isLargeDesign: componentCount > 50 || connectionCount > 100
    };
  }, [components.length, connections.length]);

  const handleComponentDrop = useOptimizedCallback((componentType: DesignComponent['type'], x: number, y: number) => {
    return performanceMonitor.current.measure('component-drop', () => {
      try {
        // Use object pooling for component creation
        const newComponent: DesignComponent = MemoryOptimizer.poolObject('component', () => ({
          id: `${componentType}-${Date.now()}`,
          type: componentType,
          x,
          y,
          label: componentType.charAt(0).toUpperCase() + componentType.slice(1).replace('-', ' ')
        }));

        setComponents(prev => [...prev, newComponent]);
        
              // Track successful component drop with performance metrics
        trackCanvasAction('component-drop', {
          componentType,
          position: { x, y },
          totalComponents: components.length + 1,
          designComplexity: designMetrics.complexity
        }, true);
        
        // Track with workflow optimizer
        workflowOptimizer.trackAction('component_added', 500, true, 'design-canvas', {
          componentType,
          totalComponents: components.length + 1,
          position: { x, y }
        });

        // Track performance metrics
        trackPerformance('component-drop', {
          componentCount: components.length + 1,
          renderTime: performanceMonitor.current.getAverageMetric('component-drop')
        });

      } catch (error) {
        trackCanvasAction('component-drop', {
          componentType,
          position: { x, y },
          error: error instanceof Error ? error.message : 'Unknown error'
        }, false);
        
        // Track failure with workflow optimizer
        workflowOptimizer.trackAction('component_add_failed', 200, false, 'design-canvas', {
          componentType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        trackError(error instanceof Error ? error : new Error('Component drop failed'));
      }
    });
  }, [components.length, trackCanvasAction, trackPerformance, trackError, designMetrics.complexity]);

  const handleComponentMove = useOptimizedCallback((id: string, x: number, y: number) => {
    return performanceMonitor.current.measure('component-move', () => {
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
            renderTime: performanceMonitor.current.getAverageMetric('component-move')
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
    
    return performanceMonitor.current.measure('connection-create', () => {
      try {
        const fromComponent = components.find(c => c.id === fromId);
        const toComponent = components.find(c => c.id === toId);
        
        // Use object pooling for connection creation
        const newConnection: Connection = MemoryOptimizer.poolObject('connection', () => ({
          id: `connection-${Date.now()}`,
          from: fromId,
          to: toId,
          label: 'Connection',
          type: 'data',
          direction: 'end'
        }));

        setConnections(prev => [...prev, newConnection]);
        setConnectionStart(null);
        
        // Track successful connection creation with performance metrics
        trackCanvasAction('connection-create', {
          fromType: fromComponent?.type || 'unknown',
          toType: toComponent?.type || 'unknown',
          connectionType: 'data',
          totalConnections: connections.length + 1,
          designComplexity: designMetrics.complexity
        }, true);

        // Track performance for connection operations
        trackPerformance('connection-create', {
          connectionCount: connections.length + 1,
          renderTime: performanceMonitor.current.getAverageMetric('connection-create')
        });

      } catch (error) {
        trackCanvasAction('connection-create', {
          fromId,
          toId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, false);
        trackError(error instanceof Error ? error : new Error('Connection creation failed'));
      }
    });
  }, [components, connections.length, trackCanvasAction, trackPerformance, trackError, designMetrics]);

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
    return performanceMonitor.current.measure('component-delete', () => {
      const component = components.find(c => c.id === id);
      const affectedConnections = connections.filter(conn => conn.from === id || conn.to === id);
      
      // Release pooled objects for memory management
      if (component) {
        MemoryOptimizer.releaseObject('component', component);
      }
      affectedConnections.forEach(conn => {
        MemoryOptimizer.releaseObject('connection', conn);
      });

      setComponents(prev => prev.filter(comp => comp.id !== id));
      setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
      setSelectedComponent(null);
      
      // Track component deletion with performance context
      trackCanvasAction('component-delete', {
        componentId: id,
        componentType: component?.type || 'unknown',
        affectedConnections: affectedConnections.length,
        remainingComponents: components.length - 1,
        designComplexity: designMetrics.complexity
      }, true);

      // Track performance for deletion operations
      trackPerformance('component-delete', {
        deletedConnections: affectedConnections.length,
        remainingComponents: components.length - 1,
        renderTime: performanceMonitor.current.getAverageMetric('component-delete')
      });
    });
  }, [components, connections, trackCanvasAction, trackPerformance, designMetrics.complexity]);

  const handleSave = useOptimizedCallback(() => {
    return performanceMonitor.current.measureAsync('save-design', async () => {
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
              avgRenderTime: performanceMonitor.current.getAverageMetric('component-move'),
              fps: performanceMonitor.current.getCurrentFPS()
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
      link.click();
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
    
    return performanceMonitor.current.measureAsync('export-image', async () => {
      const startTime = Date.now();
      setIsExporting(true);
      
      try {
        // Check cache for repeated exports
        const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
        if (exportCacheRef.current.has(cacheKey)) {
          const cachedDataUrl = exportCacheRef.current.get(cacheKey)!;
          const link = document.createElement('a');
          link.href = cachedDataUrl;
          link.download = `${challenge.id}-design.png`;
          link.click();
          
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
        canvasRef.current.classList.add('export-mode');
        
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
        
        // Cache the result for repeated exports
        exportCacheRef.current.set(cacheKey, dataUrl);
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${challenge.id}-design.png`;
        link.click();
        
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
    return performanceMonitor.current.measure('design-complete', () => {
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
            avgRenderTime: performanceMonitor.current.getAverageMetric('component-move'),
            fps: performanceMonitor.current.getCurrentFPS(),
            totalInteractions: performanceMonitor.current.getMetrics('component-drop').length +
                             performanceMonitor.current.getMetrics('component-move').length +
                             performanceMonitor.current.getMetrics('connection-create').length
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
    // Monitor design complexity and provide warnings
    if (designMetrics.isLargeDesign && !performanceMode) {
      console.warn('Large design detected. Consider enabling performance mode for better experience.');
      trackPerformance('large-design-warning', {
        componentCount: designMetrics.componentCount,
        connectionCount: designMetrics.connectionCount,
        complexity: designMetrics.complexity
      });
    }

    // Cleanup export cache when design changes significantly
    const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
    const currentCacheKeys = Array.from(exportCacheRef.current.keys());
    currentCacheKeys.forEach(key => {
      if (key !== cacheKey) {
        exportCacheRef.current.delete(key);
      }
    });

    return () => {
      // Cleanup performance monitoring on unmount
      if (exportCacheRef.current.size > 10) {
        exportCacheRef.current.clear();
      }
    };
  }, [designMetrics, performanceMode, challenge.id, components.length, connections.length, trackPerformance]);

  // Register contextual help content
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).contextualHelpSystem) {
      const helpSystem = (window as any).contextualHelpSystem;
      
      // Register help content for key UI elements
      helpSystem.registerHelpContent('design-canvas-back', {
        id: 'canvas-back-help',
        content: 'Return to challenge selection to pick a different challenge',
        type: 'tooltip',
        priority: 1,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-save', {
        id: 'canvas-save-help',
        content: 'Save your current design progress. Auto-saves every few seconds.',
        type: 'tooltip',
        priority: 2,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-hints', {
        id: 'canvas-hints-help',
        content: 'Toggle solution hints to get guidance on architectural patterns and best practices',
        type: 'tooltip',
        priority: 3,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-performance', {
        id: 'canvas-performance-help',
        content: 'Enable performance mode for better experience with large designs (50+ components)',
        type: 'tooltip',
        priority: 2,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-export', {
        id: 'canvas-export-help',
        content: 'Export your design as JSON or PNG. Perfect for sharing or documentation.',
        type: 'panel',
        priority: 2,
        placement: 'bottom'
      });
    }
    
    // Register onboarding targets
    if (typeof window !== 'undefined') {
      // Add data attributes for onboarding system
      const canvasElement = document.querySelector('[data-testid="design-canvas"]');
      if (canvasElement) {
        canvasElement.setAttribute('data-onboarding-target', 'canvas-overview');
      }
      
      const toolbarElement = document.querySelector('[data-testid="canvas-toolbar"]');
      if (toolbarElement) {
        toolbarElement.setAttribute('data-onboarding-target', 'toolbar-features');
      }
    }
  }, []);
  
  // Keyboard shortcuts integration with performance monitoring
  useEffect(() => {
    const handleSaveProject = () => {
      performanceMonitor.current.measure('keyboard-save', () => {
        trackKeyboardShortcut('Ctrl+S', 'save-project', true);
        shortcutLearning.trackShortcutUsage('save-project', true, 300, 'design-canvas');
        handleSave();
      });
    };

    const handleDeleteSelected = () => {
      performanceMonitor.current.measure('keyboard-delete', () => {
        if (selectedComponent) {
          trackKeyboardShortcut('Delete', 'delete-component', true);
          shortcutLearning.trackShortcutUsage('delete-component', true, 200, 'design-canvas');
          handleDeleteComponent(selectedComponent);
        } else {
          trackKeyboardShortcut('Delete', 'delete-component', false);
          shortcutLearning.trackManualAction('delete_attempt_no_selection', 100, 'design-canvas');
        }
      });
    };

    const handleAddComponent = () => {
      // Focus on component palette or show component picker
      trackKeyboardShortcut('Ctrl+N', 'add-component', true);
      shortcutLearning.trackShortcutUsage('add-component', true, 150, 'design-canvas');
      workflowOptimizer.trackAction('add_component_shortcut', 150, true, 'design-canvas');
      console.log('Add component shortcut triggered');
    };

    const handleUndo = () => {
      // Placeholder for undo functionality
      trackKeyboardShortcut('Ctrl+Z', 'undo', false);
      console.log('Undo shortcut triggered - not yet implemented');
    };

    const handleRedo = () => {
      // Placeholder for redo functionality
      trackKeyboardShortcut('Ctrl+Y', 'redo', false);
      console.log('Redo shortcut triggered - not yet implemented');
    };

    const handleNewProject = () => {
      performanceMonitor.current.measure('keyboard-new-project', () => {
        // Release all pooled objects before clearing
        components.forEach(comp => MemoryOptimizer.releaseObject('component', comp));
        connections.forEach(conn => MemoryOptimizer.releaseObject('connection', conn));
        
        // Reset canvas state
        trackKeyboardShortcut('Ctrl+Shift+N', 'new-project', true);
        setComponents([]);
        setConnections([]);
        setSelectedComponent(null);
        setConnectionStart(null);
        
        // Clear export cache
        exportCacheRef.current.clear();
        
        trackPerformance('new-project', {
          clearedComponents: components.length,
          clearedConnections: connections.length
        });
      });
    };

    // Comment-related event handlers
    const handleAddComment = () => {
      trackKeyboardShortcut('C', 'add-comment', true);
      setCommentMode('comment');
    };

    const handleAddNote = () => {
      trackKeyboardShortcut('N', 'add-note', true);
      setCommentMode('note');
    };

    const handleAddLabel = () => {
      trackKeyboardShortcut('L', 'add-label', true);
      setCommentMode('label');
    };

    const handleAddArrow = () => {
      trackKeyboardShortcut('A', 'add-arrow', true);
      setCommentMode('arrow');
    };

    const handleAddHighlight = () => {
      trackKeyboardShortcut('H', 'add-highlight', true);
      setCommentMode('highlight');
    };

    // Add event listeners for canvas-specific shortcuts
    window.addEventListener('shortcut:save-project', handleSaveProject);
    window.addEventListener('shortcut:delete-selected', handleDeleteSelected);
    window.addEventListener('shortcut:add-component', handleAddComponent);
    window.addEventListener('shortcut:undo', handleUndo);
    window.addEventListener('shortcut:redo', handleRedo);
    window.addEventListener('shortcut:new-project', handleNewProject);
    
    // Add event listeners for comment-related shortcuts
    window.addEventListener('shortcut:add-comment', handleAddComment);
    window.addEventListener('shortcut:add-note', handleAddNote);
    window.addEventListener('shortcut:add-label', handleAddLabel);
    window.addEventListener('shortcut:add-arrow', handleAddArrow);
    window.addEventListener('shortcut:add-highlight', handleAddHighlight);

    return () => {
      // Cleanup event listeners
      window.removeEventListener('shortcut:save-project', handleSaveProject);
      window.removeEventListener('shortcut:delete-selected', handleDeleteSelected);
      window.removeEventListener('shortcut:add-component', handleAddComponent);
      window.removeEventListener('shortcut:undo', handleUndo);
      window.removeEventListener('shortcut:redo', handleRedo);
      window.removeEventListener('shortcut:new-project', handleNewProject);
      
      // Cleanup comment-related event listeners
      window.removeEventListener('shortcut:add-comment', handleAddComment);
      window.removeEventListener('shortcut:add-note', handleAddNote);
      window.removeEventListener('shortcut:add-label', handleAddLabel);
      window.removeEventListener('shortcut:add-arrow', handleAddArrow);
      window.removeEventListener('shortcut:add-highlight', handleAddHighlight);
    };
  }, [selectedComponent, handleSave, handleDeleteComponent, setComponents, setConnections, setSelectedComponent, setConnectionStart, trackKeyboardShortcut]);

  // Initialize keyboard shortcuts hook
  useKeyboardShortcuts([]);

  return (
    <DndProvider backend={HTML5Backend}>
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
                content={performanceMode ? 'Disable performance optimizations' : 'Enable performance mode for large designs'}
                contextualHelp="Performance mode optimizes rendering for designs with 50+ components by reducing animation quality and enabling object pooling"
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPerformanceMode(!performanceMode)}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {performanceMode ? 'Performance Mode: ON' : 'Performance Mode: OFF'}
                </Button>
                
                </SmartTooltip>
                <div id="performance-mode-desc" className="sr-only">
                {performanceMode 
                  ? 'Performance optimizations are currently enabled' 
                  : 'Performance optimizations are disabled'
                }
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SmartTooltip 
                content="View available components"
                contextualHelp="Drag components from the palette to the canvas to build your design"
              >
                <Button variant="ghost" size="sm" onClick={() => setShowHints(!showHints)}>
                  <Component className="mr-2 h-4 w-4" />
                  Palette
                </Button>
              </SmartTooltip>
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex" role="main" aria-labelledby="challenge-title">
          <div className="flex-1" role="region" aria-label="Design canvas">
            <CanvasArea
              ref={canvasRef}
              components={optimizedComponents}
              connections={stableConnections}
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
          
          // Changes:
          // ...
          const objectPools = useRef<{
            components: Map<string, DesignComponent>;
            connections: Map<string, Connection>;
          } | null>(null);
          
          const getObjectPool = useCallback(() => {
            if (!objectPools.current) {
              objectPools.current = {
                components: new Map(),
                connections: new Map()
              };
            }
            return objectPools.current;
          }, []);
          
          // ...
        </div>

      </div>
    </DndProvider>
  );
}

const [performanceMode, setPerformanceMode] = useState(false);
const performanceMonitor = useRef<PerformanceMonitor | null>(null);

// Initialize only when needed
const initPerformanceMonitor = useCallback(() => {
  if (!performanceMonitor.current) {
    performanceMonitor.current = PerformanceMonitor.getInstance();
  }
}, []);

// Call this in interaction handlers
const handleComponentDrop = useOptimizedCallback((...) => {
  if (performanceMode) initPerformanceMonitor();
  return performanceMonitor.current.measureAsync('export-image', async () => {
    const startTime = Date.now();
    setIsExporting(true);
    
    try {
      // Check cache for repeated exports
      const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
      if (exportCacheRef.current.has(cacheKey)) {
        const cachedDataUrl = exportCacheRef.current.get(cacheKey)!;
        const link = document.createElement('a');
        link.href = cachedDataUrl;
        link.download = `${challenge.id}-design.png`;
        link.click();
        
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
      canvasRef.current.classList.add('export-mode');
  
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
  
      // Cache the result for repeated exports
      exportCacheRef.current.set(cacheKey, dataUrl);
  
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${challenge.id}-design.png`;
      link.click();
  
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
}, [performanceMode, initPerformanceMonitor]);
  
  const handleContinue = useOptimizedCallback(() => {
    return performanceMonitor.current.measure('design-complete', () => {
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
            avgRenderTime: performanceMonitor.current.getAverageMetric('component-move'),
            fps: performanceMonitor.current.getCurrentFPS(),
            totalInteractions: performanceMonitor.current.getMetrics('component-drop').length +
                             performanceMonitor.current.getMetrics('component-move').length +
                             performanceMonitor.current.getMetrics('connection-create').length
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
    // Monitor design complexity and provide warnings
    if (designMetrics.isLargeDesign && !performanceMode) {
      console.warn('Large design detected. Consider enabling performance mode for better experience.');
      trackPerformance('large-design-warning', {
        componentCount: designMetrics.componentCount,
        connectionCount: designMetrics.connectionCount,
        complexity: designMetrics.complexity
      });
    }

    // Cleanup export cache when design changes significantly
    const cacheKey = `${challenge.id}-${components.length}-${connections.length}`;
    const currentCacheKeys = Array.from(exportCacheRef.current.keys());
    currentCacheKeys.forEach(key => {
      if (key !== cacheKey) {
        exportCacheRef.current.delete(key);
      }
    });

    return () => {
      // Cleanup performance monitoring on unmount
      if (exportCacheRef.current.size > 10) {
        exportCacheRef.current.clear();
      }
    };
  }, [designMetrics, performanceMode, challenge.id, components.length, connections.length, trackPerformance]);

  // Register contextual help content
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).contextualHelpSystem) {
      const helpSystem = (window as any).contextualHelpSystem;
      
      // Register help content for key UI elements
      helpSystem.registerHelpContent('design-canvas-back', {
        id: 'canvas-back-help',
        content: 'Return to challenge selection to pick a different challenge',
        type: 'tooltip',
        priority: 1,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-save', {
        id: 'canvas-save-help',
        content: 'Save your current design progress. Auto-saves every few seconds.',
        type: 'tooltip',
        priority: 2,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-hints', {
        id: 'canvas-hints-help',
        content: 'Toggle solution hints to get guidance on architectural patterns and best practices',
        type: 'tooltip',
        priority: 3,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-performance', {
        id: 'canvas-performance-help',
        content: 'Enable performance mode for better experience with large designs (50+ components)',
        type: 'tooltip',
        priority: 2,
        placement: 'bottom'
      });
      
      helpSystem.registerHelpContent('design-canvas-export', {
        id: 'canvas-export-help',
        content: 'Export your design as JSON or PNG. Perfect for sharing or documentation.',
        type: 'panel',
        priority: 2,
        placement: 'bottom'
      });
    }
    
    // Register onboarding targets
    if (typeof window !== 'undefined') {
      // Add data attributes for onboarding system
      const canvasElement = document.querySelector('[data-testid="design-canvas"]');
      if (canvasElement) {
        canvasElement.setAttribute('data-onboarding-target', 'canvas-overview');
      }
      
      const toolbarElement = document.querySelector('[data-testid="canvas-toolbar"]');
      if (toolbarElement) {
        toolbarElement.setAttribute('data-onboarding-target', 'toolbar-features');
      }
    }
  }, []);
  
  // Keyboard shortcuts integration with performance monitoring
  useEffect(() => {
    const handleSaveProject = () => {
      performanceMonitor.current.measure('keyboard-save', () => {
        trackKeyboardShortcut('Ctrl+S', 'save-project', true);
        shortcutLearning.trackShortcutUsage('save-project', true, 300, 'design-canvas');
        handleSave();
      });
    };

    const handleDeleteSelected = () => {
      performanceMonitor.current.measure('keyboard-delete', () => {
        if (selectedComponent) {
          trackKeyboardShortcut('Delete', 'delete-component', true);
          shortcutLearning.trackShortcutUsage('delete-component', true, 200, 'design-canvas');
          handleDeleteComponent(selectedComponent);
        } else {
          trackKeyboardShortcut('Delete', 'delete-component', false);
          shortcutLearning.trackManualAction('delete_attempt_no_selection', 100, 'design-canvas');
        }
      });
    };

    const handleAddComponent = () => {
      // Focus on component palette or show component picker
      trackKeyboardShortcut('Ctrl+N', 'add-component', true);
      shortcutLearning.trackShortcutUsage('add-component', true, 150, 'design-canvas');
      workflowOptimizer.trackAction('add_component_shortcut', 150, true, 'design-canvas');
      console.log('Add component shortcut triggered');
    };

    const handleUndo = () => {
      // Placeholder for undo functionality
      trackKeyboardShortcut('Ctrl+Z', 'undo', false);
      console.log('Undo shortcut triggered - not yet implemented');
    };

    const handleRedo = () => {
      // Placeholder for redo functionality
      trackKeyboardShortcut('Ctrl+Y', 'redo', false);
      console.log('Redo shortcut triggered - not yet implemented');
    };

    const handleNewProject = () => {
      performanceMonitor.current.measure('keyboard-new-project', () => {
        // Release all pooled objects before clearing
        components.forEach(comp => MemoryOptimizer.releaseObject('component', comp));
        connections.forEach(conn => MemoryOptimizer.releaseObject('connection', conn));
        
        // Reset canvas state
        trackKeyboardShortcut('Ctrl+Shift+N', 'new-project', true);
        setComponents([]);
        setConnections([]);
        setSelectedComponent(null);
        setConnectionStart(null);
        
        // Clear export cache
        exportCacheRef.current.clear();
        
        trackPerformance('new-project', {
          clearedComponents: components.length,
          clearedConnections: connections.length
        });
      });
    };

    // Comment-related event handlers
    const handleAddComment = () => {
      trackKeyboardShortcut('C', 'add-comment', true);
      setCommentMode('comment');
    };

    const handleAddNote = () => {
      trackKeyboardShortcut('N', 'add-note', true);
      setCommentMode('note');
    };

    const handleAddLabel = () => {
      trackKeyboardShortcut('L', 'add-label', true);
      setCommentMode('label');
    };

    const handleAddArrow = () => {
      trackKeyboardShortcut('A', 'add-arrow', true);
      setCommentMode('arrow');
    };

    const handleAddHighlight = () => {
      trackKeyboardShortcut('H', 'add-highlight', true);
      setCommentMode('highlight');
    };

    // Add event listeners for canvas-specific shortcuts
    window.addEventListener('shortcut:save-project', handleSaveProject);
    window.addEventListener('shortcut:delete-selected', handleDeleteSelected);
    window.addEventListener('shortcut:add-component', handleAddComponent);
    window.addEventListener('shortcut:undo', handleUndo);
    window.addEventListener('shortcut:redo', handleRedo);
    window.addEventListener('shortcut:new-project', handleNewProject);
    
    // Add event listeners for comment-related shortcuts
    window.addEventListener('shortcut:add-comment', handleAddComment);
    window.addEventListener('shortcut:add-note', handleAddNote);
    window.addEventListener('shortcut:add-label', handleAddLabel);
    window.addEventListener('shortcut:add-arrow', handleAddArrow);
    window.addEventListener('shortcut:add-highlight', handleAddHighlight);

    return () => {
      // Cleanup event listeners
      window.removeEventListener('shortcut:save-project', handleSaveProject);
      window.removeEventListener('shortcut:delete-selected', handleDeleteSelected);
      window.removeEventListener('shortcut:add-component', handleAddComponent);
      window.removeEventListener('shortcut:undo', handleUndo);
      window.removeEventListener('shortcut:redo', handleRedo);
      window.removeEventListener('shortcut:new-project', handleNewProject);
      
      // Cleanup comment-related event listeners
      window.removeEventListener('shortcut:add-comment', handleAddComment);
      window.removeEventListener('shortcut:add-note', handleAddNote);
      window.removeEventListener('shortcut:add-label', handleAddLabel);
      window.removeEventListener('shortcut:add-arrow', handleAddArrow);
      window.removeEventListener('shortcut:add-highlight', handleAddHighlight);
    };
  }, [selectedComponent, handleSave, handleDeleteComponent, setComponents, setConnections, setSelectedComponent, setConnectionStart, trackKeyboardShortcut]);

  // Initialize keyboard shortcuts hook
  useKeyboardShortcuts([]);

  return (
    <DndProvider backend={HTML5Backend}>
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
                content={performanceMode ? 'Disable performance optimizations' : 'Enable performance mode for large designs'}
                contextualHelp="Performance mode optimizes rendering for designs with 50+ components by reducing animation quality and enabling object pooling"
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPerformanceMode(!performanceMode)}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {performanceMode ? 'Performance Mode: ON' : 'Performance Mode: OFF'}
                </Button>
                
                const optimizedComponents = useMemo(() => {
                  return performanceMode ? 
                    components.filter(c => isInViewport(c)) : 
                    components;
                }, [components, performanceMode]);
              </SmartTooltip>
              <div id="performance-mode-desc" className="sr-only">
                {performanceMode 
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
                    workflowOptimizer.trackAction('toggle_hints', 200, true, 'design-canvas', {
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
                    workflowOptimizer.trackAction('manual_save', 300, true, 'design-canvas');
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
                    workflowOptimizer.trackAction('export_json', 500, true, 'design-canvas');
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
                    workflowOptimizer.trackAction('export_png', 2000, true, 'design-canvas');
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
                    workflowOptimizer.trackAction('continue_to_recording', 1000, true, 'design-canvas', {
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
          
          // Changes:
          // ...
          const objectPools = useRef<{
            components: Map<string, DesignComponent>;
            connections: Map<string, Connection>;
          } | null>(null);
          
          const getObjectPool = useCallback(() => {
            if (!objectPools.current) {
              objectPools.current = {
                components: new Map(),
                connections: new Map()
              };
            }
            return objectPools.current;
          }, []);
          
          // ...
        </div>

      </div>
    </DndProvider>
  );
}