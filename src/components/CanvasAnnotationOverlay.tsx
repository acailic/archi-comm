import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { CanvasAnnotationManager, Annotation, AnnotationType, AnnotationStyle } from '@/lib/canvas/CanvasAnnotations';

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
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize annotation manager
  useEffect(() => {
    if (canvasRef.current && !annotationManager.current) {
      annotationManager.current = new CanvasAnnotationManager(canvasRef.current);
      
      // Set up event listeners
      const canvas = canvasRef.current;
      
      const handleAnnotationAdded = (event: CustomEvent) => {
        const annotation = event.detail;
        onAnnotationCreate?.(annotation);
      };

      const handleAnnotationUpdated = (event: CustomEvent) => {
        const annotation = event.detail;
        onAnnotationUpdate?.(annotation);
      };

      const handleAnnotationDeleted = (event: CustomEvent) => {
        const annotationId = event.detail;
        onAnnotationDelete?.(annotationId);
      };

      const handleAnnotationSelected = (event: CustomEvent) => {
        const annotation = event.detail;
        setSelectedAnnotation(annotation);
        onAnnotationSelect?.(annotation);
      };

      canvas.addEventListener('annotationAdded', handleAnnotationAdded as EventListener);
      canvas.addEventListener('annotationUpdated', handleAnnotationUpdated as EventListener);
      canvas.addEventListener('annotationDeleted', handleAnnotationDeleted as EventListener);
      canvas.addEventListener('annotationSelected', handleAnnotationSelected as EventListener);

      return () => {
        canvas.removeEventListener('annotationAdded', handleAnnotationAdded as EventListener);
        canvas.removeEventListener('annotationUpdated', handleAnnotationUpdated as EventListener);
        canvas.removeEventListener('annotationDeleted', handleAnnotationDeleted as EventListener);
        canvas.removeEventListener('annotationSelected', handleAnnotationSelected as EventListener);
      };
    }
  }, [onAnnotationCreate, onAnnotationUpdate, onAnnotationDelete, onAnnotationSelect]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        // Clear canvas and redraw annotations
        context.clearRect(0, 0, canvas.width, canvas.height);
        annotationManager.current?.render();
      }
    }
  }, [width, height]);

  // Handle canvas click for creating annotations
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive || !selectedTool || !annotationManager.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

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

    const annotation = annotationManager.current.addAnnotation(canvasX, canvasY, type, content, style);
    setIsCreating(true);
    
    // Auto-select the new annotation for immediate editing
    setTimeout(() => {
      setSelectedAnnotation(annotation);
      setIsCreating(false);
    }, 100);
  }, [isActive, selectedTool]);

  // Handle double-click for editing annotations
  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationManager.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const annotation = annotationManager.current.getAnnotationAt(canvasX, canvasY);
    if (annotation) {
      setSelectedAnnotation(annotation);
      // Trigger edit mode
      const editEvent = new CustomEvent('editAnnotation', { detail: annotation });
      canvas.dispatchEvent(editEvent);
    }
  }, []);

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

  // Update cursor based on mode and tool
  const getCursor = () => {
    if (!isActive) return 'default';
    if (isCreating) return 'wait';
    if (selectedTool === 'arrow') return 'crosshair';
    if (selectedTool) return 'copy';
    return 'default';
  };

  return (
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
      onDoubleClick={handleCanvasDoubleClick}
    />
  );
});