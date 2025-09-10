interface InitMessage {
  type: 'init';
  canvas?: OffscreenCanvas | null;
}

interface RenderMessage {
  type: 'render';
  data: RenderData;
}

interface TerminateMessage {
  type: 'terminate';
}

type WorkerMessage = InitMessage | RenderMessage | TerminateMessage;

interface RenderData {
  components: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    color?: string;
    selected?: boolean;
  }>;
  connections: Array<{
    id: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    type: string;
    color?: string;
    selected?: boolean;
  }>;
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
  qualityLevel: number;
}

interface RenderCompleteResponse {
  type: 'renderComplete';
  duration: number;
  renderCount?: number;
  memoryUsage?: number;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  duration?: number;
}

interface InitializedResponse {
  type: 'initialized';
  success: boolean;
  message: string;
}

class CanvasRenderer {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private initialized = false;
  private renderCount = 0;
  private lastRenderTime = 0;
  private fallbackMode = false;

  async initialize(canvas?: OffscreenCanvas | null): Promise<void> {
    try {
      if (!canvas) {
        // Fallback mode without OffscreenCanvas
        this.fallbackMode = true;
        this.initialized = true;
        
        postMessage({
          type: 'initialized',
          success: true,
          message: 'Canvas renderer initialized in fallback mode (no OffscreenCanvas)'
        } as InitializedResponse);
        return;
      }

      this.canvas = canvas;
      const context = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
      });
      
      if (!context) {
        throw new Error('Failed to get 2D context from OffscreenCanvas');
      }
      
      this.ctx = context;
      
      // Set up high-quality rendering defaults
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'center';
      this.ctx.lineJoin = 'round';
      this.ctx.lineCap = 'round';
      
      this.initialized = true;
      
      postMessage({
        type: 'initialized',
        success: true,
        message: 'Canvas renderer initialized successfully with OffscreenCanvas'
      } as InitializedResponse);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing canvas';
      postMessage({
        type: 'error',
        message: `Canvas initialization failed: ${errorMessage}`
      } as ErrorResponse);
      throw error;
    }
  }

  async render(data: RenderData): Promise<void> {
    if (!this.initialized) {
      throw new Error('Canvas renderer not initialized');
    }

    if (this.fallbackMode) {
      // In fallback mode, just report success without rendering
      postMessage({
        type: 'renderComplete',
        duration: 0,
        renderCount: this.renderCount++,
        memoryUsage: 0
      } as RenderCompleteResponse);
      return;
    }

    if (!this.ctx || !this.canvas) {
      throw new Error('Canvas context not available');
    }

    const startTime = performance.now();

    try {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Apply quality level adjustments
      this.applyQualitySettings(data.qualityLevel);
      
      // Set up viewport transformation
      this.ctx.save();
      this.setupViewportTransform(data.viewport);
      
      // Render components
      await this.renderComponents(data.components, data.qualityLevel);
      
      // Render connections
      await this.renderConnections(data.connections, data.qualityLevel);
      
      this.ctx.restore();
      
      const renderTime = performance.now() - startTime;
      this.lastRenderTime = renderTime;
      this.renderCount++;
      
      // Send render complete message with performance metrics
      postMessage({
        type: 'renderComplete',
        duration: renderTime,
        renderCount: this.renderCount,
        memoryUsage: this.getMemoryUsage()
      } as RenderCompleteResponse);
      
    } catch (error) {
      const renderTime = performance.now() - startTime;
      
      postMessage({
        type: 'error',
        message: `Render failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: renderTime
      } as ErrorResponse);
    }
  }

  private applyQualitySettings(qualityLevel: number): void {
    if (!this.ctx) return;

    // Adjust rendering quality based on performance level
    if (qualityLevel < 0.5) {
      // Low quality - disable antialiasing and reduce detail
      this.ctx.imageSmoothingEnabled = false;
    } else if (qualityLevel < 0.8) {
      // Medium quality - basic antialiasing
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'medium';
    } else {
      // High quality - full antialiasing and detail
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  private setupViewportTransform(viewport: RenderData['viewport']): void {
    if (!this.ctx) return;

    // Apply zoom and pan transformations
    this.ctx.scale(viewport.zoom, viewport.zoom);
    this.ctx.translate(-viewport.x, -viewport.y);
  }

  private async renderComponents(components: RenderData['components'], qualityLevel: number): Promise<void> {
    if (!this.ctx) return;

    for (const component of components) {
      await this.renderComponent(component, qualityLevel);
    }
  }

  private async renderComponent(component: RenderData['components'][0], qualityLevel: number): Promise<void> {
    if (!this.ctx) return;

    const { x, y, width, height, label, color = '#3b82f6', selected } = component;

    this.ctx.save();

    // Component background
    if (qualityLevel > 0.5) {
      // Add gradient for higher quality
      const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, this.darkenColor(color, 0.2));
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = color;
    }

    // Draw component rectangle with rounded corners for higher quality
    if (qualityLevel > 0.7) {
      this.roundedRect(x, y, width, height, 8);
      this.ctx.fill();
    } else {
      this.ctx.fillRect(x, y, width, height);
    }

    // Component border
    this.ctx.strokeStyle = selected ? '#fbbf24' : '#e5e7eb';
    this.ctx.lineWidth = selected ? 3 : 1;
    
    if (qualityLevel > 0.7) {
      this.roundedRect(x, y, width, height, 8);
      this.ctx.stroke();
    } else {
      this.ctx.strokeRect(x, y, width, height);
    }

    // Component label (only render at higher quality levels)
    if (qualityLevel > 0.3) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `${Math.max(10, 12 * qualityLevel)}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
      
      // Ensure text fits within component bounds
      const maxWidth = width - 16;
      const truncatedLabel = this.truncateText(label, maxWidth);
      
      this.ctx.fillText(
        truncatedLabel,
        x + width / 2,
        y + height / 2
      );
    }

    // Selection indicator
    if (selected && qualityLevel > 0.5) {
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      
      if (qualityLevel > 0.7) {
        this.roundedRect(x - 2, y - 2, width + 4, height + 4, 10);
        this.ctx.stroke();
      } else {
        this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
      }
      
      this.ctx.setLineDash([]);
    }

    this.ctx.restore();
  }

  private async renderConnections(connections: RenderData['connections'], qualityLevel: number): Promise<void> {
    if (!this.ctx) return;

    for (const connection of connections) {
      await this.renderConnection(connection, qualityLevel);
    }
  }

  private async renderConnection(connection: RenderData['connections'][0], qualityLevel: number): Promise<void> {
    if (!this.ctx) return;

    const { fromX, fromY, toX, toY, type, color = '#6b7280', selected } = connection;

    this.ctx.save();

    // Connection line
    this.ctx.strokeStyle = selected ? '#fbbf24' : color;
    this.ctx.lineWidth = Math.max(1, (selected ? 3 : 2) * qualityLevel);

    // Different line styles based on connection type and quality
    if (qualityLevel > 0.5) {
      switch (type) {
        case 'async':
          this.ctx.setLineDash([5, 5]);
          break;
        case 'control':
          this.ctx.setLineDash([10, 5, 2, 5]);
          break;
        case 'sync':
          this.ctx.setLineDash([]);
          break;
        default:
          this.ctx.setLineDash([]);
      }
    }

    this.ctx.beginPath();
    
    if (qualityLevel > 0.7) {
      // Curved connections for high quality
      const dx = toX - fromX;
      const dy = toY - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const curvature = Math.min(distance * 0.3, 100);
      
      const midX1 = fromX + (dx > 0 ? curvature : -curvature);
      const midX2 = toX + (dx > 0 ? -curvature : curvature);
      
      this.ctx.moveTo(fromX, fromY);
      this.ctx.bezierCurveTo(midX1, fromY, midX2, toY, toX, toY);
    } else {
      // Straight lines for lower quality
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
    }
    
    this.ctx.stroke();

    // Arrow head (only at higher quality levels)
    if (qualityLevel > 0.5) {
      this.drawArrowHead(toX, toY, fromX, fromY, selected ? '#fbbf24' : color);
    }

    this.ctx.restore();
  }

  private drawArrowHead(toX: number, toY: number, fromX: number, fromY: number, color: string): void {
    if (!this.ctx) return;

    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - arrowLength * Math.cos(angle - arrowAngle),
      toY - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.lineTo(
      toX - arrowLength * Math.cos(angle + arrowAngle),
      toY - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  private roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    if (!this.ctx) return;

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

  private truncateText(text: string, maxWidth: number): string {
    if (!this.ctx) return text;

    const metrics = this.ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return text;
    }

    // Binary search for optimal truncation
    let start = 0;
    let end = text.length;
    let result = text;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const truncated = text.substring(0, mid) + '...';
      const metrics = this.ctx.measureText(truncated);

      if (metrics.width <= maxWidth) {
        result = truncated;
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }

    return result;
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening - convert hex to RGB and reduce brightness
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const newR = Math.floor(r * (1 - factor));
      const newG = Math.floor(g * (1 - factor));
      const newB = Math.floor(b * (1 - factor));

      return `rgb(${newR}, ${newG}, ${newB})`;
    }
    return color;
  }

  private getMemoryUsage(): number {
    // Estimate memory usage based on render operations
    return this.renderCount * 0.1; // Rough estimate in MB
  }

  terminate(): void {
    try {
      this.initialized = false;
      this.canvas = null;
      this.ctx = null;
      
      postMessage({
        type: 'terminate',
        message: 'Canvas renderer terminated successfully'
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during termination';
      postMessage({
        type: 'error',
        message: `Termination failed: ${errorMessage}`
      } as ErrorResponse);
    }
  }
}

// Worker instance
const renderer = new CanvasRenderer();

// Message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  try {
    switch (type) {
      case 'init':
        await renderer.initialize(event.data.canvas);
        break;

      case 'render':
        await renderer.render(event.data.data);
        break;

      case 'terminate':
        renderer.terminate();
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown worker error'
    } as ErrorResponse);
  }
});

// Handle uncaught errors
self.addEventListener('error', (event) => {
  postMessage({
    type: 'error',
    message: `Worker error: ${event.message}`,
    filename: event.filename,
    lineno: event.lineno
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  postMessage({
    type: 'error',
    message: `Unhandled promise rejection: ${event.reason}`
  });
});

export {}; // Make this a module