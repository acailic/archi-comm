import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { CanvasAnnotationManager, Annotation, AnnotationType, AnnotationStyle } from '@/lib/canvas/CanvasAnnotations';
import { CanvasOptimizer, PerformanceMonitor } from '@/lib/performance/PerformanceOptimizer';
import { Textarea } from '@/components/ui/textarea';

export interface CanvasAnnotationOverlayProps {
  width: number;
  height: number;
  selectedTool?: string;
  isActive: boolean;
  onAnnotationCreate?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
}

export interface CanvasAnnotationOverlayRef {
  addAnnotation: (x: number, y: number, type: AnnotationType, content: string) => void;
  getAnnotations: () => Annotation[];
  clearAnnotations: () => void;
  exportAnnotations: () => string;
  importAnnotations: (data: string) => void;
  selectAnnotation: (id: string) => void;
  deleteSelectedAnnotation: () => void;
}

export const CanvasAnnotationOverlay = forwardRef<CanvasAnnotationOverlayRef, CanvasAnnotationOverlayProps>(({
  width,
  height,
  selectedTool,
  isActive,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationSelect
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationManager = useRef<CanvasAnnotationManager | null>(null);
  const optimizerRef = useRef<CanvasOptimizer | null>(null);
  const performanceMonitor = useRef<PerformanceMonitor>(PerformanceMonitor.getInstance());
  const animationFrameRef = useRef<number | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editInputPosition, setEditInputPosition] = useState<{x: number, y: number} | null>(null);
  const [optimizationEnabled, setOptimizationEnabled] = useState(false);

  // Initialize optimizer and annotation manager
  useEffect(() => {
    if (canvasRef.current && !annotationManager.current) {
      const canvas = canvasRef.current;
      
      // Initialize CanvasOptimizer with feature detection and error handling
      try {
        // Feature detection for OffscreenCanvas and Worker support
        const hasOffscreenCanvas = 'OffscreenCanvas' in window;
        const hasWorkerSupport = typeof Worker !== 'undefined';
        
        if (hasOffscreenCanvas && hasWorkerSupport) {
          optimizerRef.current = new CanvasOptimizer(canvas);
          setOptimizationEnabled(true);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Canvas optimization enabled with OffscreenCanvas and Worker support');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Canvas optimization disabled: missing OffscreenCanvas or Worker support');
          }
        }
      } catch (error) {
        console.error('Failed to initialize CanvasOptimizer:', error);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Falling back to direct canvas rendering');
        }
        optimizerRef.current = null;
        setOptimizationEnabled(false);
      }
      
      // Initialize CanvasAnnotationManager with optimizer
      annotationManager.current = new CanvasAnnotationManager(
        canvas, 
        optimizerRef.current || undefined
      );
      
      // Set up event listeners
      
      const handleAnnotationAdded = (event: CustomEvent) => {
        const annotation = event.detail;
        performanceMonitor.current.measure('annotation-create-callback', () => {
          onAnnotationCreate?.(annotation);
        });
      };

      const handleAnnotationUpdated = (event: CustomEvent) => {
        const annotation = event.detail;
        performanceMonitor.current.measure('annotation-update-callback', () => {
          onAnnotationUpdate?.(annotation);
        });
      };

      const handleAnnotationDeleted = (event: CustomEvent) => {
        const annotationId = event.detail;
        performanceMonitor.current.measure('annotation-delete-callback', () => {
          onAnnotationDelete?.(annotationId);
        });
      };

      const handleAnnotationSelected = (event: CustomEvent) => {
        const annotation = event.detail;
        performanceMonitor.current.measure('annotation-select-callback', () => {
          setSelectedAnnotation(annotation);
          onAnnotationSelect?.(annotation);
        });
      };

      const handleAnnotationEditStart = (event: CustomEvent) => {
        const annotation = event.detail;
        performanceMonitor.current.measure('annotation-edit-start', () => {
          setEditingAnnotation(annotation);
          setEditContent(annotation.content || '');
          
          // Calculate input position relative to canvas
          setEditInputPosition({
            x: annotation.x,
            y: annotation.y
          });
        });
      };

      const handleAnnotationEditEnd = (event: CustomEvent) => {
        performanceMonitor.current.measure('annotation-edit-end', () => {
          setEditingAnnotation(null);
          setEditContent('');
          setEditInputPosition(null);
        });
      };

      canvas.addEventListener('annotationAdded', handleAnnotationAdded as EventListener);
      canvas.addEventListener('annotationUpdated', handleAnnotationUpdated as EventListener);
      canvas.addEventListener('annotationDeleted', handleAnnotationDeleted as EventListener);
      canvas.addEventListener('annotationSelected', handleAnnotationSelected as EventListener);
      canvas.addEventListener('annotationEditStart', handleAnnotationEditStart as EventListener);
      canvas.addEventListener('annotationEditEnd', handleAnnotationEditEnd as EventListener);

      return () => {
        // Cleanup event listeners
        canvas.removeEventListener('annotationAdded', handleAnnotationAdded as EventListener);
        canvas.removeEventListener('annotationUpdated', handleAnnotationUpdated as EventListener);
        canvas.removeEventListener('annotationDeleted', handleAnnotationDeleted as EventListener);
        canvas.removeEventListener('annotationSelected', handleAnnotationSelected as EventListener);
        canvas.removeEventListener('annotationEditStart', handleAnnotationEditStart as EventListener);
        canvas.removeEventListener('annotationEditEnd', handleAnnotationEditEnd as EventListener);
        
        // Cleanup optimizer resources
        if (optimizerRef.current) {
          try {
            // Cancel any pending animation frames
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            
            // Note: CanvasOptimizer cleanup would be implemented in the optimizer class
            // For now, we just clear the reference
            optimizerRef.current = null;
          } catch (error) {
            console.error('Error during optimizer cleanup:', error);
          }
        }
      };
    }
  }, [onAnnotationCreate, onAnnotationUpdate, onAnnotationDelete, onAnnotationSelect]);

  // Animation loop for render queue flushing
  useEffect(() => {
    if (!optimizerRef.current || !optimizationEnabled) return;

    const renderLoop = () => {
      try {
        // Flush render queue on each animation frame
        optimizerRef.current?.flushRenderQueue();
        
        // Continue the loop
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      } catch (error) {
        console.error('Error in render loop:', error);
        // Stop the animation loop on error to prevent infinite error loops
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    };

    // Start the render loop
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [optimizationEnabled]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      
      performanceMonitor.current.measure('canvas-resize', () => {
        const context = canvas.getContext('2d');
        if (context) {
          // Handle canvas context loss and recovery
          try {
            // Clear canvas and redraw annotations
            context.clearRect(0, 0, canvas.width, canvas.height);
            annotationManager.current?.render();
            
            // Update optimizer canvas size if available
            if (optimizerRef.current && optimizationEnabled) {
              // Mark entire canvas as dirty for re-optimization
              optimizerRef.current.markDirty({
                x: 0, y: 0, width: canvas.width, height: canvas.height
              });
            }
          } catch (error) {
            console.error('Canvas context error during resize:', error);
            
            // Attempt to recover from context loss
            if (context.isContextLost && context.isContextLost()) {
              console.warn('Canvas context lost, attempting recovery...');
              // Context recovery would be handled by the browser automatically
              // We just need to be prepared to reinitialize when it's restored
            }
          }
        }
      });
    }
  }, [width, height, optimizationEnabled]);

  // Handle canvas click for creating annotations
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive || !selectedTool || !annotationManager.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    performanceMonitor.current.measure('annotation-interaction', () => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Convert screen coordinates to canvas coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = x * scaleX;
      const canvasY = y * scaleY;

      // Create annotation based on selected tool
      let type: AnnotationType;
      let content = '';
      let style: Partial<AnnotationStyle> = {};

      switch (selectedTool) {
        case 'comment':
          type = 'comment';
          content = 'New comment';
          style = { backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
          break;
        case 'note':
          type = 'note';
          content = 'New note';
          style = { backgroundColor: '#dbeafe', borderColor: '#3b82f6' };
          break;
        case 'label':
          type = 'label';
          content = 'New label';
          style = { backgroundColor: '#dcfce7', borderColor: '#22c55e' };
          break;
        case 'arrow':
          type = 'arrow';
          content = '';
          style = { strokeColor: '#ef4444', strokeWidth: 2 };
          break;
        case 'highlight':
          type = 'highlight';
          content = '';
          style = { backgroundColor: '#fef08a', opacity: 0.6 };
          break;
        default:
          return;
      }

      try {
        const annotation = annotationManager.current!.addAnnotation(canvasX, canvasY, type, content, style);
        setIsCreating(true);
        
        // Auto-select the new annotation for immediate editing
        setTimeout(() => {
          setSelectedAnnotation(annotation);
          setIsCreating(false);
        }, 100);
      } catch (error) {
        console.error('Error creating annotation:', error);
        setIsCreating(false);
      }
    });
  }, [isActive, selectedTool]);


  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    addAnnotation: (x: number, y: number, type: AnnotationType, content: string) => {
      if (annotationManager.current) {
        return annotationManager.current.addAnnotation(x, y, type, content);
      }
    },
    getAnnotations: () => {
      return annotationManager.current?.getAnnotations() || [];
    },
    clearAnnotations: () => {
      annotationManager.current?.clearAnnotations();
    },
    exportAnnotations: () => {
      return annotationManager.current?.exportAnnotations() || '';
    },
    importAnnotations: (data: string) => {
      annotationManager.current?.importAnnotations(data);
    },
    selectAnnotation: (id: string) => {
      const annotation = annotationManager.current?.getAnnotationById(id);
      if (annotation) {
        setSelectedAnnotation(annotation);
      }
    },
    deleteSelectedAnnotation: () => {
      if (selectedAnnotation && annotationManager.current) {
        annotationManager.current.removeAnnotation(selectedAnnotation.id);
        setSelectedAnnotation(null);
      }
    }
  }), [selectedAnnotation]);

  // Handle inline editing with performance monitoring
  const handleEditContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    performanceMonitor.current.measure('inline-edit-change', () => {
      setEditContent(e.target.value);
      annotationManager.current?.updateEditingContent(e.target.value);
    });
  }, []);

  const handleEditSave = useCallback(() => {
    performanceMonitor.current.measure('inline-edit-save', () => {
      annotationManager.current?.saveInlineEdit();
    });
  }, []);

  const handleEditCancel = useCallback(() => {
    performanceMonitor.current.measure('inline-edit-cancel', () => {
      annotationManager.current?.cancelInlineEdit();
    });
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  // Update cursor based on mode and tool
  const getCursor = () => {
    if (!isActive) return 'default';
    if (isCreating) return 'wait';
    if (selectedTool === 'arrow') return 'crosshair';
    if (selectedTool) return 'copy';
    return 'default';
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 pointer-events-auto"
        style={{
          cursor: getCursor(),
          zIndex: isActive ? 10 : 5
        }}
        onClick={handleCanvasClick}
      />
      
      {editingAnnotation && editInputPosition && (
        <Textarea
          autoFocus
          value={editContent}
          onChange={handleEditContentChange}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditSave}
          className="absolute bg-white/90 border-2 border-blue-400 shadow-lg resize-none"
          style={{
            left: editInputPosition.x,
            top: editInputPosition.y,
            width: Math.max(200, editContent.length * 8),
            height: Math.max(60, Math.ceil(editContent.length / 25) * 20 + 40),
            zIndex: 25,
            fontSize: '14px',
            lineHeight: '1.4',
            padding: '8px'
          }}
        />
      )}
      
      {/* Development mode performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
          {optimizationEnabled ? '🚀 Optimized' : '⚠️ Fallback'}
        </div>
      )}
    </div>
  );
});
