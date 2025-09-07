/**
 * ArchiComm Canvas Annotations System
 * Ultra-optimized comment and annotation system for canvas
 */

export interface CanvasAnnotation {
  id: string;
  type: 'comment' | 'note' | 'label' | 'arrow' | 'highlight';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  author: string;
  timestamp: number;
  color: string;
  resolved: boolean;
  replies: AnnotationReply[];
  style: AnnotationStyle;
}

export interface AnnotationReply {
  id: string;
  content: string;
  author: string;
  timestamp: number;
}

export interface AnnotationStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  opacity: number;
  borderRadius: number;
  borderWidth: number;
}

export class CanvasAnnotationManager {
  private annotations: Map<string, CanvasAnnotation> = new Map();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private listeners: Set<AnnotationEventListener> = new Set();
  private selectedAnnotation: string | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private editingAnnotation: string | null = null;
  private originalEditContent: string | null = null;
  
  // Cache for stripped text content to avoid repeated HTML parsing
  private textContentCache: Map<string, string> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupEventListeners();
  }

  /**
   * Add a new annotation (overloaded methods for convenience)
   */
  addAnnotation(annotation: Omit<CanvasAnnotation, 'id' | 'timestamp' | 'resolved' | 'replies'>): string;
  addAnnotation(x: number, y: number, type: CanvasAnnotation['type'], content: string, style?: Partial<AnnotationStyle>): CanvasAnnotation;
  addAnnotation(
    annotationOrX: Omit<CanvasAnnotation, 'id' | 'timestamp' | 'resolved' | 'replies'> | number,
    y?: number,
    type?: CanvasAnnotation['type'],
    content?: string,
    style?: Partial<AnnotationStyle>
  ): string | CanvasAnnotation {
    let annotation: Omit<CanvasAnnotation, 'id' | 'timestamp' | 'resolved' | 'replies'>;
    
    if (typeof annotationOrX === 'number' && y !== undefined && type && content !== undefined) {
      // Called with parameters: addAnnotation(x, y, type, content, style?)
      annotation = {
        type,
        x: annotationOrX,
        y,
        content,
        author: 'Current User',
        color: '#3b82f6',
        style: this.getDefaultStyle(type, style)
      };
    } else if (typeof annotationOrX === 'object') {
      // Called with full annotation object
      annotation = annotationOrX;
    } else {
      throw new Error('Invalid arguments for addAnnotation');
    }
    const id = `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullAnnotation: CanvasAnnotation = {
      ...annotation,
      id,
      timestamp: Date.now(),
      resolved: false,
      replies: []
    };

    this.annotations.set(id, fullAnnotation);
    this.notifyListeners('annotationAdded', fullAnnotation);
    this.render();
    
    // Return the full annotation if called with coordinates, otherwise return id
    return typeof annotationOrX === 'number' ? fullAnnotation : id;
  }

  /**
   * Update an existing annotation
   */
  updateAnnotation(id: string, updates: Partial<CanvasAnnotation>): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      const updated = { ...annotation, ...updates };
      
      // Clear text cache for this annotation if content changed
      if (updates.content && updates.content !== annotation.content) {
        this.textContentCache.delete(id);
      }
      
      this.annotations.set(id, updated);
      this.notifyListeners('annotationUpdated', updated);
      this.render();
    }
  }

  /**
   * Remove an annotation
   */
  removeAnnotation(id: string): void {
    const annotation = this.annotations.get(id);
    if (annotation) {
      this.annotations.delete(id);
      this.textContentCache.delete(id); // Clean up cache
      this.notifyListeners('annotationRemoved', annotation);
      this.render();
    }
  }

  /**
   * Add a reply to an annotation
   */
  addReply(annotationId: string, reply: Omit<AnnotationReply, 'id' | 'timestamp'>): string {
    const annotation = this.annotations.get(annotationId);
    if (annotation) {
      const replyId = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fullReply: AnnotationReply = {
        ...reply,
        id: replyId,
        timestamp: Date.now()
      };

      annotation.replies.push(fullReply);
      this.annotations.set(annotationId, annotation);
      this.notifyListeners('replyAdded', { annotation, reply: fullReply });
      this.render();
      return replyId;
    }
    return '';
  }

  /**
   * Get all annotations
   */
  getAllAnnotations(): CanvasAnnotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Get annotation by ID
   */
  getAnnotation(id: string): CanvasAnnotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * Get annotation by ID (alias for compatibility)
   */
  getAnnotationById(id: string): CanvasAnnotation | undefined {
    return this.getAnnotation(id);
  }

  /**
   * Get annotation at specific coordinates
   */
  getAnnotationAt(x: number, y: number): CanvasAnnotation | null {
    const annotations = Array.from(this.annotations.values());
    
    // Check in reverse order (top to bottom)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];
      if (this.isPointInAnnotation(x, y, annotation)) {
        return annotation;
      }
    }
    
    return null;
  }

  /**
   * Get all annotations (alias for compatibility)
   */
  getAnnotations(): CanvasAnnotation[] {
    return this.getAllAnnotations();
  }

  /**
   * Get annotations in a specific area
   */
  getAnnotationsInArea(x: number, y: number, width: number, height: number): CanvasAnnotation[] {
    return Array.from(this.annotations.values()).filter(annotation => {
      return annotation.x >= x && annotation.x <= x + width &&
             annotation.y >= y && annotation.y <= y + height;
    });
  }

  /**
   * Render all annotations on the canvas
   */
  render(): void {
    // Clear the canvas completely before redrawing
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const annotations = Array.from(this.annotations.values());
    annotations.forEach(annotation => {
      this.renderAnnotation(annotation);
    });
  }

  private renderAnnotation(annotation: CanvasAnnotation): void {
    this.ctx.save();

    switch (annotation.type) {
      case 'comment':
        this.renderComment(annotation);
        break;
      case 'note':
        this.renderNote(annotation);
        break;
      case 'label':
        this.renderLabel(annotation);
        break;
      case 'arrow':
        this.renderArrow(annotation);
        break;
      case 'highlight':
        this.renderHighlight(annotation);
        break;
    }

    // Render selection indicator if selected
    if (this.selectedAnnotation === annotation.id) {
      this.renderSelectionIndicator(annotation);
    }

    // Render editing indicator if being edited
    if (this.editingAnnotation === annotation.id) {
      this.renderEditingIndicator(annotation);
    }

    this.ctx.restore();
  }

  private renderComment(annotation: CanvasAnnotation): void {
    const { x, y, style, content } = annotation;
    const padding = 12;
    const maxWidth = 200;
    
    // Strip HTML tags from rich text content for canvas rendering
    const plainTextContent = this.stripHtmlTags(content);
    
    // Measure text
    this.ctx.font = `${style.fontWeight} ${style.fontSize}px system-ui, -apple-system, sans-serif`;
    const lines = this.wrapText(plainTextContent, maxWidth - padding * 2);
    const lineHeight = style.fontSize * 1.4;
    const height = lines.length * lineHeight + padding * 2;

    // Draw background
    this.ctx.globalAlpha = style.opacity;
    this.ctx.fillStyle = style.backgroundColor;
    this.ctx.strokeStyle = style.borderColor;
    this.ctx.lineWidth = style.borderWidth;
    
    // Rounded rectangle background
    this.roundedRect(x, y, maxWidth, height, style.borderRadius);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw text
    this.ctx.fillStyle = style.textColor;
    this.ctx.globalAlpha = 1;
    
    lines.forEach((line, index) => {
      this.ctx.fillText(
        line,
        x + padding,
        y + padding + (index + 1) * lineHeight
      );
    });

    // Draw comment indicator (speech bubble tail)
    this.ctx.fillStyle = style.backgroundColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 20, y + height);
    this.ctx.lineTo(x + 30, y + height + 10);
    this.ctx.lineTo(x + 40, y + height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private renderNote(annotation: CanvasAnnotation): void {
    const { x, y, style, content } = annotation;
    const size = 24;
    
    // Draw note icon background
    this.ctx.fillStyle = style.backgroundColor;
    this.ctx.globalAlpha = style.opacity;
    this.roundedRect(x, y, size, size, 4);
    this.ctx.fill();

    // Draw note icon
    this.ctx.fillStyle = style.textColor;
    this.ctx.globalAlpha = 1;
    this.ctx.font = `${size - 8}px system-ui`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('📝', x + size / 2, y + size / 2);
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  private renderLabel(annotation: CanvasAnnotation): void {
    const { x, y, style, content } = annotation;
    const padding = 8;
    
    this.ctx.font = `${style.fontWeight} ${style.fontSize}px system-ui, -apple-system, sans-serif`;
    const textWidth = this.ctx.measureText(content).width;
    const width = textWidth + padding * 2;
    const height = style.fontSize + padding * 2;

    // Draw label background
    this.ctx.globalAlpha = style.opacity;
    this.ctx.fillStyle = style.backgroundColor;
    this.ctx.strokeStyle = style.borderColor;
    this.ctx.lineWidth = style.borderWidth;
    
    this.roundedRect(x, y, width, height, style.borderRadius);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw text
    this.ctx.fillStyle = style.textColor;
    this.ctx.globalAlpha = 1;
    this.ctx.fillText(content, x + padding, y + padding + style.fontSize);
  }

  private renderArrow(annotation: CanvasAnnotation): void {
    const { x, y, width = 100, height = 0, style } = annotation;
    const endX = x + width;
    const endY = y + height;

    this.ctx.strokeStyle = style.borderColor;
    this.ctx.lineWidth = style.borderWidth;
    this.ctx.globalAlpha = style.opacity;

    // Draw arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(endY - y, endX - x);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;

    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLength * Math.cos(angle - arrowAngle),
      endY - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLength * Math.cos(angle + arrowAngle),
      endY - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
  }

  private renderHighlight(annotation: CanvasAnnotation): void {
    const { x, y, width = 100, height = 20, style } = annotation;

    this.ctx.fillStyle = style.backgroundColor;
    this.ctx.globalAlpha = style.opacity;
    this.roundedRect(x, y, width, height, style.borderRadius);
    this.ctx.fill();
  }

  private renderSelectionIndicator(annotation: CanvasAnnotation): void {
    const { x, y, width = 200, height = 100 } = annotation;
    const margin = 4;

    // Render selection border
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 1;
    this.ctx.setLineDash([4, 4]);
    
    this.ctx.strokeRect(
      x - margin,
      y - margin,
      width + margin * 2,
      height + margin * 2
    );
    
    this.ctx.setLineDash([]);

    // Render edit button
    this.renderEditButton(annotation);
  }

  private renderEditButton(annotation: CanvasAnnotation): void {
    const { x, y, width = 200 } = annotation;
    const buttonX = x + width - 25;
    const buttonY = y + 5;
    const buttonSize = 20;

    // Draw button background
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.globalAlpha = 0.9;
    this.roundedRect(buttonX, buttonY, buttonSize, buttonSize, 4);
    this.ctx.fill();

    // Draw button border
    this.ctx.strokeStyle = '#1d4ed8';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 1;
    this.ctx.stroke();

    // Draw edit icon (pen)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.globalAlpha = 1;
    this.ctx.font = '12px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('✏️', buttonX + buttonSize/2, buttonY + buttonSize/2);
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  private renderEditingIndicator(annotation: CanvasAnnotation): void {
    const { x, y, width = 200, height = 100 } = annotation;
    const margin = 2;

    // Render a different colored border for editing state
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth = 3;
    this.ctx.globalAlpha = 0.8;
    this.ctx.setLineDash([6, 3]);
    
    this.ctx.strokeRect(
      x - margin,
      y - margin,
      width + margin * 2,
      height + margin * 2
    );
    
    this.ctx.setLineDash([]);

    // Add editing icon
    this.ctx.fillStyle = '#10b981';
    this.ctx.globalAlpha = 1;
    this.ctx.font = '14px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('✏️', x + width - 15, y + 15);
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  private roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    // Ensure we're working with plain text for proper wrapping
    const plainText = this.stripHtmlTags(text);
    const words = plainText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const annotation = this.getAnnotationAt(x, y);
    if (annotation) {
      this.selectedAnnotation = annotation.id;
      this.isDragging = true;
      this.dragOffset = { x: x - annotation.x, y: y - annotation.y };
      this.render();
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.selectedAnnotation) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const annotation = this.annotations.get(this.selectedAnnotation);
      if (annotation) {
        const updated = { 
          ...annotation, 
          x: x - this.dragOffset.x,
          y: y - this.dragOffset.y 
        };
        this.annotations.set(this.selectedAnnotation, updated);
        this.render();
      }
    } else {
      // Handle cursor changes for edit button hover
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const annotation = this.getAnnotationAt(x, y);
      if (annotation && this.selectedAnnotation === annotation.id && this.isClickOnEditButton(x, y, annotation)) {
        this.canvas.style.cursor = 'pointer';
      } else if (annotation) {
        this.canvas.style.cursor = 'move';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }
  }

  private handleMouseUp(): void {
    if (this.isDragging && this.selectedAnnotation) {
      const annotation = this.annotations.get(this.selectedAnnotation);
      if (annotation) {
        this.notifyListeners('annotationUpdated', annotation);
      }
    }
    this.isDragging = false;
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const annotation = this.getAnnotationAt(x, y);
    
    if (annotation) {
      // Check if click is on edit button area for selected annotation
      if (this.selectedAnnotation === annotation.id && this.isClickOnEditButton(x, y, annotation)) {
        this.startInlineEdit(annotation.id);
        return;
      }
      
      this.selectedAnnotation = annotation.id;
    } else {
      this.selectedAnnotation = null;
    }
    
    this.render();
  }

  private handleDoubleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const annotation = this.getAnnotationAt(x, y);
    
    if (annotation) {
      // Edit existing annotation
      this.startInlineEdit(annotation.id);
    } else {
      // Create new comment annotation on double-click
      const newAnnotation = this.addAnnotation({
        type: 'comment',
        x,
        y,
        content: 'New comment',
        author: 'Current User',
        color: '#3b82f6',
        style: this.getDefaultStyle('comment')
      });
      
      // Start editing the new annotation immediately
      if (typeof newAnnotation !== 'string') {
        setTimeout(() => this.startInlineEdit(newAnnotation.id), 100);
      }
    }
  }


  private isPointInAnnotation(x: number, y: number, annotation: CanvasAnnotation): boolean {
    const { x: ax, y: ay, width = 200, height = 100 } = annotation;
    return x >= ax && x <= ax + width && y >= ay && y <= ay + height;
  }

  private isClickOnEditButton(x: number, y: number, annotation: CanvasAnnotation): boolean {
    const { x: ax, y: ay, width = 200 } = annotation;
    // Edit button is positioned at x + width - 15, y + 15 with roughly 20x20 clickable area
    const editButtonX = ax + width - 25; // Slightly larger clickable area
    const editButtonY = ay + 5;
    const buttonSize = 30; // 30x30 clickable area
    
    return x >= editButtonX && x <= editButtonX + buttonSize && 
           y >= editButtonY && y <= editButtonY + buttonSize;
  }

  private getDefaultStyle(type: CanvasAnnotation['type'], overrides?: Partial<AnnotationStyle>): AnnotationStyle {
    const baseStyle: AnnotationStyle = {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      textColor: '#374151',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.95,
      borderRadius: 8,
      borderWidth: 1
    };

    let typeStyle: AnnotationStyle;
    switch (type) {
      case 'comment':
        typeStyle = { ...baseStyle, backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
        break;
      case 'note':
        typeStyle = { ...baseStyle, backgroundColor: '#dbeafe', borderColor: '#3b82f6' };
        break;
      case 'label':
        typeStyle = { ...baseStyle, backgroundColor: '#f3f4f6', borderColor: '#6b7280' };
        break;
      case 'arrow':
        typeStyle = { ...baseStyle, borderColor: '#ef4444', borderWidth: 2 };
        break;
      case 'highlight':
        typeStyle = { ...baseStyle, backgroundColor: '#fef08a', opacity: 0.5 };
        break;
      default:
        typeStyle = baseStyle;
    }
    
    return overrides ? { ...typeStyle, ...overrides } : typeStyle;
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => listener(event, data));
  }

  addEventListener(listener: AnnotationEventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(listener: AnnotationEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Export annotations to JSON
   */
  exportAnnotations(): string {
    return JSON.stringify(Array.from(this.annotations.values()), null, 2);
  }

  /**
   * Import annotations from JSON
   */
  importAnnotations(json: string): void {
    try {
      const annotations = JSON.parse(json) as CanvasAnnotation[];
      this.annotations.clear();
      
      annotations.forEach(annotation => {
        this.annotations.set(annotation.id, annotation);
      });
      
      this.render();
    } catch (error) {
      console.error('Failed to import annotations:', error);
    }
  }

  /**
   * Start inline editing for an annotation
   */
  startInlineEdit(annotationId: string): void {
    const annotation = this.annotations.get(annotationId);
    if (annotation) {
      this.editingAnnotation = annotationId;
      this.originalEditContent = annotation.content;
      this.selectedAnnotation = annotationId;
      this.notifyListeners('annotationEditStart', annotation);
      this.render();
    }
  }

  /**
   * End inline editing
   */
  endInlineEdit(): void {
    if (this.editingAnnotation) {
      const annotation = this.annotations.get(this.editingAnnotation);
      if (annotation) {
        this.notifyListeners('annotationEditEnd', annotation);
      }
      this.editingAnnotation = null;
      this.originalEditContent = null;
      this.render();
    }
  }

  /**
   * Update annotation content during inline editing
   */
  updateEditingContent(content: string): void {
    if (this.editingAnnotation) {
      const annotation = this.annotations.get(this.editingAnnotation);
      if (annotation) {
        const updated = { ...annotation, content };
        this.annotations.set(this.editingAnnotation, updated);
        this.notifyListeners('annotationUpdated', updated);
        this.render();
      }
    }
  }

  /**
   * Save inline edit changes
   */
  saveInlineEdit(): void {
    if (this.editingAnnotation) {
      const annotation = this.annotations.get(this.editingAnnotation);
      if (annotation) {
        this.notifyListeners('annotationUpdated', annotation);
      }
      this.endInlineEdit();
    }
  }

  /**
   * Cancel inline edit changes
   */
  cancelInlineEdit(): void {
    if (this.editingAnnotation && this.originalEditContent !== null) {
      const annotation = this.annotations.get(this.editingAnnotation);
      if (annotation) {
        const reverted = { ...annotation, content: this.originalEditContent };
        this.annotations.set(this.editingAnnotation, reverted);
        this.render();
      }
    }
    this.originalEditContent = null;
    this.endInlineEdit();
  }

  /**
   * Check if annotation is being edited
   */
  isEditing(annotationId: string): boolean {
    return this.editingAnnotation === annotationId;
  }

  /**
   * Get currently editing annotation ID
   */
  getEditingAnnotationId(): string | null {
    return this.editingAnnotation;
  }

  /**
   * Clear all annotations
   */
  clearAnnotations(): void {
    this.annotations.clear();
    this.textContentCache.clear(); // Clear cache
    this.selectedAnnotation = null;
    this.editingAnnotation = null;
    this.render();
  }
  
  /**
   * Strip HTML tags from content with caching for performance
   */
  private stripHtmlTags(content: string): string {
    if (!content) return '';
    
    // Use the exported utility function
    return stripHtmlTags(content);
  }
  
  /**
   * Get cached plain text content for an annotation
   */
  private getCachedTextContent(annotationId: string, htmlContent: string): string {
    const cached = this.textContentCache.get(annotationId);
    if (cached !== undefined) {
      return cached;
    }
    
    const plainText = this.stripHtmlTags(htmlContent);
    this.textContentCache.set(annotationId, plainText);
    return plainText;
  }
}

export type AnnotationEventListener = (event: string, data: any) => void;

// Export alias for compatibility
export type Annotation = CanvasAnnotation;
export type AnnotationType = CanvasAnnotation['type'];

// Utility functions
export const createAnnotationStyle = (overrides: Partial<AnnotationStyle> = {}): AnnotationStyle => {
  return {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    textColor: '#374151',
    fontSize: 14,
    fontWeight: 'normal',
    opacity: 0.95,
    borderRadius: 8,
    borderWidth: 1,
    ...overrides
  };
};

/**
 * Utility function to strip HTML tags from rich text content
 * Used when rendering annotations on canvas where only plain text is supported
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Remove HTML tags but preserve content
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with regular spaces
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Basic HTML sanitization for user input
 * Removes potentially harmful tags while preserving basic formatting
 */
export const sanitizeHtmlContent = (html: string): string => {
  if (!html) return '';
  
  // Allow only safe HTML tags for rich text formatting
  const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li'];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  
  return html.replace(tagRegex, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return match;
    }
    return ''; // Remove disallowed tags
  });
};

export const predefinedStyles = {
  comment: createAnnotationStyle({
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    textColor: '#92400e'
  }),
  warning: createAnnotationStyle({
    backgroundColor: '#fecaca',
    borderColor: '#ef4444',
    textColor: '#b91c1c'
  }),
  info: createAnnotationStyle({
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    textColor: '#1d4ed8'
  }),
  success: createAnnotationStyle({
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    textColor: '#047857'
  })
};