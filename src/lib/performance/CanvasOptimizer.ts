// src/lib/performance/CanvasOptimizer.ts
// Canvas rendering optimization with dirty region tracking and command queuing
// Provides efficient canvas operations through render command batching and dirty region management
// RELEVANT FILES: src/packages/canvas/contexts/CanvasInteractionContext.tsx, src/lib/performance/PerformanceMonitor.ts, src/packages/canvas/components/VirtualCanvas.tsx, src/lib/performance/canvas-renderer.ts

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderCommand {
  type: string;
  priority?: number;
  data?: Record<string, unknown>;
}

const DEFAULT_DIRTY_REGION: DirtyRegion = { x: 0, y: 0, width: 0, height: 0 } as const;

export class CanvasOptimizer {
  private ctx: CanvasRenderingContext2D | null;
  private dirtyRegions: DirtyRegion[] = [];
  private queuedCommands: RenderCommand[] = [];

  constructor(element: HTMLElement) {
    if (element instanceof HTMLCanvasElement) {
      this.ctx = element.getContext('2d');
    } else {
      this.ctx = null;
    }
  }

  markDirty(region: DirtyRegion): void {
    const nextRegion = {
      x: region.x ?? DEFAULT_DIRTY_REGION.x,
      y: region.y ?? DEFAULT_DIRTY_REGION.y,
      width: region.width ?? DEFAULT_DIRTY_REGION.width,
      height: region.height ?? DEFAULT_DIRTY_REGION.height,
    } satisfies DirtyRegion;

    this.dirtyRegions.push(nextRegion);
  }

  queueRenderCommand(command: RenderCommand): void {
    this.queuedCommands.push(command);
  }

  hasPendingWork(): boolean {
    return this.queuedCommands.length > 0 || this.dirtyRegions.length > 0;
  }

  flushRenderQueue(): void {
    if (!this.ctx) {
      this.queuedCommands = [];
      this.dirtyRegions = [];
      return;
    }

    const commands = [...this.queuedCommands];
    this.queuedCommands = [];
    commands.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    commands.forEach(command => {
      this.executeCommand(this.ctx!, command);
    });

    this.dirtyRegions = [];
  }

  dispose(): void {
    this.queuedCommands = [];
    this.dirtyRegions = [];
    this.ctx = null;
  }

  private executeCommand(ctx: CanvasRenderingContext2D, command: RenderCommand): void {
    const payload = command.data ?? {};

    switch (command.type) {
      case 'draw-components': {
        const shape = payload.shape as string | undefined;
        if (shape === 'rounded-rectangle') {
          this.drawRoundedRect(ctx, payload);
        } else {
          this.drawRect(ctx, payload);
        }
        break;
      }
      case 'draw-text': {
        this.drawText(ctx, payload);
        break;
      }
      case 'draw-path': {
        this.drawPath(ctx, payload);
        break;
      }
      case 'clear-region': {
        this.clearRegion(ctx, payload);
        break;
      }
      default:
        // Intentionally left blank – unsupported commands are ignored.
        break;
    }
  }

  private drawRect(ctx: CanvasRenderingContext2D, payload: Record<string, unknown>): void {
    const x = Number(payload.x ?? 0);
    const y = Number(payload.y ?? 0);
    const width = Number(payload.width ?? 0);
    const height = Number(payload.height ?? 0);
    const fillStyle = payload.fillStyle as string | undefined;
    const strokeStyle = payload.strokeStyle as string | undefined;
    const lineWidth = Number(payload.lineWidth ?? 1);

    ctx.save();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.globalAlpha = Number(payload.globalAlpha ?? 1);
      ctx.fillRect(x, y, width, height);
    }

    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, width, height);
    }
    ctx.restore();
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, payload: Record<string, unknown>): void {
    const radius = Number(payload.borderRadius ?? 4);
    const x = Number(payload.x ?? 0);
    const y = Number(payload.y ?? 0);
    const width = Number(payload.width ?? 0);
    const height = Number(payload.height ?? 0);
    const fillStyle = payload.fillStyle as string | undefined;
    const strokeStyle = payload.strokeStyle as string | undefined;
    const lineWidth = Number(payload.lineWidth ?? 1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.globalAlpha = Number(payload.globalAlpha ?? 1);
      ctx.fill();
    }

    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawText(ctx: CanvasRenderingContext2D, payload: Record<string, unknown>): void {
    const text = String(payload.text ?? '');
    const x = Number(payload.x ?? 0);
    const y = Number(payload.y ?? 0);
    const fillStyle = payload.fillStyle as string | undefined;
    const font = payload.font as string | undefined;

    ctx.save();
    if (font) {
      ctx.font = font;
    }
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
    }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private drawPath(ctx: CanvasRenderingContext2D, payload: Record<string, unknown>): void {
    const path = Array.isArray(payload.path) ? (payload.path as Array<Record<string, number | string>>) : [];
    const fillStyle = payload.fillStyle as string | undefined;
    const strokeStyle = payload.strokeStyle as string | undefined;

    ctx.save();
    ctx.beginPath();
    path.forEach(segment => {
      const type = segment.type as string;
      const x = Number(segment.x ?? 0);
      const y = Number(segment.y ?? 0);
      const x1 = Number(segment.x1 ?? 0);
      const y1 = Number(segment.y1 ?? 0);

      switch (type) {
        case 'moveTo':
          ctx.moveTo(x, y);
          break;
        case 'lineTo':
          ctx.lineTo(x, y);
          break;
        case 'quadraticCurveTo':
          ctx.quadraticCurveTo(x1, y1, x, y);
          break;
        default:
          break;
      }
    });

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
    }
    ctx.restore();
  }

  private clearRegion(ctx: CanvasRenderingContext2D, payload: Record<string, unknown>): void {
    const x = Number(payload.x ?? 0);
    const y = Number(payload.y ?? 0);
    const width = Number(payload.width ?? 0);
    const height = Number(payload.height ?? 0);
    ctx.clearRect(x, y, width, height);
  }
}
