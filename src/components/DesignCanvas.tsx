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

  // Keyboard shortcuts integration with performance monitoring
  useEffect(() => {
    const handleSaveProject = () => {
      performanceMonitor.current.measure('keyboard-save', () => {
        trackKeyboardShortcut('Ctrl+S', 'save-project', true);
        handleSave();
      });
    };

    const handleDeleteSelected = () => {
      performanceMonitor.current.measure('keyboard-delete', () => {
        if (selectedComponent) {
          trackKeyboardShortcut('Delete', 'delete-component', true);
          handleDeleteComponent(selectedComponent);
        } else {
          trackKeyboardShortcut('Delete', 'delete-component', false);
        }
      });
    };

    const handleAddComponent = () => {
      // Focus on component palette or show component picker
      trackKeyboardShortcut('Ctrl+N', 'add-component', true);
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
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h2>{challenge.title}</h2>
                <p className="text-sm text-muted-foreground">{challenge.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const newPerformanceMode = !performanceMode;
                  setPerformanceMode(newPerformanceMode);
                  trackCanvasAction('toggle-performance-mode', {
                    performanceMode: newPerformanceMode,
                    designComplexity: designMetrics.complexity
                  }, true);
                }}
                className={performanceMode ? 
                  "bg-green-50 hover:bg-green-100 border-green-200 text-green-700" :
                  "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                }
              >
                <Zap className="w-4 h-4 mr-2" />
                {performanceMode ? 'Performance On' : 'Performance Mode'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const newHintsState = !showHints;
                  trackCanvasAction('toggle-hints', {
                    showHints: newHintsState,
                    componentCount: components.length,
                    designComplexity: designMetrics.complexity
                  }, true);
                  setShowHints(newHintsState);
                }}
                className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {showHints ? 'Hide Hints' : 'Show Hints'}
              </Button>
              <SmartTooltip content="Save Design" shortcut="Ctrl+S">
                <Button variant="outline" size="icon" onClick={handleSave}>
                  <Save className="w-4 h-4" />
                  <span className="sr-only">Save Design</span>
                </Button>
              </SmartTooltip>
              <SmartTooltip content="Export Design" shortcut="Ctrl+E">
                <Button variant="outline" size="icon" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  <span className="sr-only">Export Design</span>
                </Button>
              </SmartTooltip>
              <SmartTooltip content="Export as PNG" shortcut="Ctrl+Shift+E">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleExportImage}
                  disabled={isExporting}
                >
                  <Image className="w-4 h-4" />
                  <span className="sr-only">Export as PNG</span>
                </Button>
              </SmartTooltip>
              <Button 
                onClick={handleContinue} 
                disabled={components.length === 0 || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Continue to Recording'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1">
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
            />
          </div>
          
          {showHints && (
            <div className="w-80 border-l bg-card/30 backdrop-blur-sm">
              <SolutionHints 
                challenge={extendedChallenge}
                currentComponents={components}
                onClose={() => setShowHints(false)}
              />
            </div>
          )}
        </div>

      </div>
    </DndProvider>
  );
}
