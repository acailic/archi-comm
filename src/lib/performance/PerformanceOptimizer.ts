/**
 * ArchiComm Ultra-Performance Optimization System
 * Designed to achieve top 0.01% performance benchmarks
 */

import { useCallback, useRef, useMemo, useEffect, startTransition } from 'react';

// Performance monitoring and metrics
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private observer: PerformanceObserver | null = null;
  private frameCounter = 0;
  private lastFrameTime = 0;
  private fps = 60;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializePerformanceObserver();
    this.startFrameRateMonitoring();
  }

  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, {
            timestamp: entry.startTime,
            duration: entry.duration,
            type: entry.entryType,
            value: entry.duration
          });
        }
      });

      this.observer.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint', 'largest-contentful-paint'] 
      });
    }
  }

  private startFrameRateMonitoring() {
    const measureFrame = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime;
        this.fps = Math.round(1000 / delta);
        
        if (this.fps < 50) {
          console.warn(`Low FPS detected: ${this.fps}`);
          this.recordMetric('fps-drop', {
            timestamp,
            duration: 0,
            type: 'fps',
            value: this.fps
          });
        }
      }
      
      this.lastFrameTime = timestamp;
      this.frameCounter++;
      
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  recordMetric(name: string, metric: PerformanceMetric) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metrics = this.metrics.get(name)!;
    metrics.push(metric);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }

  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  getCurrentFPS(): number {
    return this.fps;
  }

  getAverageMetric(name: string): number {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  // Measure custom operations
  measure<T>(name: string, operation: () => T): T {
    const start = performance.now();
    performance.mark(`${name}-start`);
    
    const result = operation();
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const end = performance.now();
    this.recordMetric(name, {
      timestamp: start,
      duration: end - start,
      type: 'custom',
      value: end - start
    });
    
    return result;
  }

  // Async operation measurement
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    performance.mark(`${name}-start`);
    
    const result = await operation();
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const end = performance.now();
    this.recordMetric(name, {
      timestamp: start,
      duration: end - start,
      type: 'async',
      value: end - start
    });
    
    return result;
  }
}

interface PerformanceMetric {
  timestamp: number;
  duration: number;
  type: string;
  value: number;
}

// Ultra-optimized canvas rendering system
export class CanvasOptimizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private worker: Worker | null = null;
  private framePool: ImageData[] = [];
  private dirtyRegions: DirtyRegion[] = [];
  private lastRenderTime = 0;
  private renderQueue: RenderCommand[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    this.initializeOffscreenRendering();
    this.optimizeCanvasSettings();
  }

  private initializeOffscreenRendering() {
    if ('OffscreenCanvas' in window) {
      this.offscreenCanvas = new OffscreenCanvas(
        this.canvas!.width,
        this.canvas!.height
      );
      
      // Use Web Worker for heavy rendering operations
      this.worker = new Worker('/workers/canvas-renderer.js');
      this.worker.postMessage({
        type: 'init',
        canvas: this.offscreenCanvas
      });
    }
  }

  private optimizeCanvasSettings() {
    if (!this.ctx) return;
    
    // Optimize rendering settings
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Pre-allocate frame buffers
    for (let i = 0; i < 3; i++) {
      this.framePool.push(
        this.ctx.createImageData(this.canvas!.width, this.canvas!.height)
      );
    }
  }

  // Batch rendering operations for maximum performance
  queueRenderCommand(command: RenderCommand) {
    this.renderQueue.push(command);
  }

  // Process render queue with intelligent batching
  flushRenderQueue() {
    if (this.renderQueue.length === 0) return;
    
    const monitor = PerformanceMonitor.getInstance();
    
    monitor.measure('canvas-render', () => {
      // Group commands by type for batching
      const commandsByType = new Map<string, RenderCommand[]>();
      
      this.renderQueue.forEach(cmd => {
        if (!commandsByType.has(cmd.type)) {
          commandsByType.set(cmd.type, []);
        }
        commandsByType.get(cmd.type)!.push(cmd);
      });

      // Execute batched commands
      commandsByType.forEach((commands, type) => {
        switch (type) {
          case 'draw-components':
            this.batchDrawComponents(commands);
            break;
          case 'draw-connections':
            this.batchDrawConnections(commands);
            break;
          case 'clear-region':
            this.batchClearRegions(commands);
            break;
        }
      });

      this.renderQueue = [];
    });
  }

  private batchDrawComponents(commands: RenderCommand[]) {
    if (!this.ctx) return;
    
    // Use single path for all similar components
    this.ctx.beginPath();
    
    commands.forEach(cmd => {
      if (cmd.data.shape === 'rectangle') {
        this.ctx.rect(cmd.data.x, cmd.data.y, cmd.data.width, cmd.data.height);
      }
    });
    
    this.ctx.fill();
    this.ctx.stroke();
  }

  private batchDrawConnections(commands: RenderCommand[]) {
    if (!this.ctx) return;
    
    this.ctx.beginPath();
    
    commands.forEach(cmd => {
      this.ctx.moveTo(cmd.data.x1, cmd.data.y1);
      this.ctx.lineTo(cmd.data.x2, cmd.data.y2);
    });
    
    this.ctx.stroke();
  }

  private batchClearRegions(commands: RenderCommand[]) {
    if (!this.ctx) return;
    
    commands.forEach(cmd => {
      this.ctx.clearRect(cmd.data.x, cmd.data.y, cmd.data.width, cmd.data.height);
    });
  }

  // Intelligent dirty region tracking
  markDirty(region: DirtyRegion) {
    // Merge overlapping regions
    const merged = this.mergeOverlappingRegions([...this.dirtyRegions, region]);
    this.dirtyRegions = merged;
  }

  private mergeOverlappingRegions(regions: DirtyRegion[]): DirtyRegion[] {
    if (regions.length <= 1) return regions;
    
    const merged: DirtyRegion[] = [];
    const sorted = regions.sort((a, b) => a.x - b.x);
    
    let current = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      if (this.regionsOverlap(current, next)) {
        current = this.mergeRegions(current, next);
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }

  private regionsOverlap(a: DirtyRegion, b: DirtyRegion): boolean {
    return !(a.x + a.width < b.x || b.x + b.width < a.x ||
             a.y + a.height < b.y || b.y + b.height < a.y);
  }

  private mergeRegions(a: DirtyRegion, b: DirtyRegion): DirtyRegion {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.max(a.x + a.width, b.x + b.width) - x;
    const height = Math.max(a.y + a.height, b.y + b.height) - y;
    
    return { x, y, width, height };
  }
}

// Ultra-fast React component optimization hooks
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const memoizedCallback = useCallback(callback, deps);
  
  // Wrap with performance monitoring
  return useCallback((...args: Parameters<T>) => {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.measure('callback-execution', () => {
      return memoizedCallback(...args);
    });
  }, [memoizedCallback]) as T;
};

export const useStableReference = <T>(value: T): T => {
  const ref = useRef<T>(value);
  
  // Only update if deep equality check fails
  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
};

// Optimized component memoization
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(() => {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.measure('memo-computation', factory);
  }, deps);
};

// Virtual scrolling for large lists
export const useVirtualizedList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  return useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItemCount + 1, items.length);
    
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    
    return {
      visibleItems,
      startIndex,
      endIndex,
      offsetY,
      totalHeight: items.length * itemHeight,
      setScrollTop
    };
  }, [items, itemHeight, containerHeight, scrollTop]);
};

// Memory management utilities
export class MemoryOptimizer {
  private static weakMap = new WeakMap();
  private static objectPool = new Map<string, any[]>();
  
  static poolObject<T>(type: string, factory: () => T): T {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    const pool = this.objectPool.get(type)!;
    return pool.length > 0 ? pool.pop() : factory();
  }
  
  static releaseObject(type: string, object: any) {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    const pool = this.objectPool.get(type)!;
    if (pool.length < 10) { // Limit pool size
      pool.push(object);
    }
  }
  
  static memoizeWeak<T extends object, R>(
    fn: (arg: T) => R,
    keyFn?: (arg: T) => any
  ): (arg: T) => R {
    return (arg: T) => {
      const key = keyFn ? keyFn(arg) : arg;
      
      if (this.weakMap.has(key)) {
        return this.weakMap.get(key);
      }
      
      const result = fn(arg);
      this.weakMap.set(key, result);
      return result;
    };
  }
}

// Fast deep equality check
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    
    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

// Performance-optimized event system
export class OptimizedEventSystem {
  private listeners = new Map<string, Set<EventListener>>();
  private throttledEvents = new Set(['scroll', 'resize', 'mousemove']);
  private debouncedEvents = new Set(['input', 'search']);
  
  addEventListener(
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) {
    let optimizedListener = listener;
    
    if (this.throttledEvents.has(event)) {
      optimizedListener = this.throttle(listener, 16); // 60fps
    } else if (this.debouncedEvents.has(event)) {
      optimizedListener = this.debounce(listener, 300);
    }
    
    element.addEventListener(event, optimizedListener, options);
    
    // Track for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(optimizedListener);
    
    return () => {
      element.removeEventListener(event, optimizedListener, options);
      this.listeners.get(event)?.delete(optimizedListener);
    };
  }

  private throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  private debounce(func: Function, delay: number) {
    let timeoutId: NodeJS.Timeout;
    return function(this: any, ...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}

// Types
interface RenderCommand {
  type: string;
  priority: number;
  data: any;
}

interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Export performance utilities
export const performanceUtils = {
  monitor: PerformanceMonitor.getInstance(),
  CanvasOptimizer,
  MemoryOptimizer,
  OptimizedEventSystem
};