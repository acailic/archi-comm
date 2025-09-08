/**
 * ArchiComm Ultra-Performance Optimization System
 * Designed to achieve top 0.01% performance benchmarks
 */

import { useCallback, useRef, useMemo, useEffect, useState, startTransition } from 'react';

// Performance monitoring and metrics
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private observer: PerformanceObserver | null = null;
  private frameCounter = 0;
  private lastFrameTime = 0;
  private fps = 60;

  // Changes:
  // 1. Add lazy initialization flag to PerformanceMonitor:
  private static isInitialized = false;
  private initializationLevel: InitializationLevel = 'basic';
  private isFullyInitialized = false;
  
  static getInstance(level: InitializationLevel = 'basic'): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(level);
      PerformanceMonitor.isInitialized = true;
    }
    return PerformanceMonitor.instance;
  }
  
  // Deferred initialization for heavy features
  static async deferredInitialize(level: InitializationLevel = 'full'): Promise<PerformanceMonitor> {
    const instance = this.getInstance(level);
    
    if (level === 'full' && !instance.isFullyInitialized) {
      await instance.initializeFull();
    }
    
    return instance;
  }
  
  // Check initialization status
  static isReady(): boolean {
    return PerformanceMonitor.isInitialized;
  }
  
  private initializeBasic() {
    // Only essential monitoring
    this.startFrameRateMonitoring();
  }
  
  private async initializeFull() {
    if (this.isFullyInitialized) return;
    
    return new Promise<void>((resolve) => {
      // Defer heavy initialization
      requestIdleCallback(() => {
        this.initializePerformanceObserver();
        this.isFullyInitialized = true;
        resolve();
      }, { timeout: 2000 });
    });
  }
  
  // 3. Modify MemoryOptimizer to lazy initialize pools:
  private static objectPools = new Map<string, any[]>();
  
  static getPool(type: string): any[] {
    if (!this.objectPools.has(type)) {
      this.objectPools.set(type, []);
    }
    return this.objectPools.get(type)!;
  }
  
  static poolObject<T>(type: string, factory: () => T): T {
    const pool = this.getPool(type);
    return pool.length > 0 ? pool.pop() : factory();
  }
  
  constructor(level: InitializationLevel = 'basic') {
    this.initializationLevel = level;
    
    if (level !== 'none') {
      this.initializeBasic();
    }
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
  
  // Wrap with performance monitoring (with fallback)
  return useCallback((...args: Parameters<T>) => {
    try {
      const monitor = PerformanceMonitor.isReady() ? PerformanceMonitor.getInstance() : null;
      if (monitor && monitor.measure) {
        return monitor.measure('callback-execution', () => {
          return memoizedCallback(...args);
        });
      }
    } catch (error) {
      // Fallback to direct execution if monitoring fails
    }
    return memoizedCallback(...args);
  }, [memoizedCallback]) as T;
};

export const useStableReference = <T>(value: T): T => {
  const ref = useRef<T>(value);
  
  // Only update if deep equality check fails (with fallback)
  try {
    if (!deepEqual(ref.current, value)) {
      ref.current = value;
    }
  } catch (error) {
    // Fallback to reference equality if deep check fails
    if (ref.current !== value) {
      ref.current = value;
    }
  }
  
  return ref.current;
};

// Optimized component memoization
export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(() => {
    try {
      const monitor = PerformanceMonitor.isReady() ? PerformanceMonitor.getInstance() : null;
      if (monitor && monitor.measure) {
        return monitor.measure('memo-computation', factory);
      }
    } catch (error) {
      // Fallback to direct execution if monitoring fails
    }
    return factory();
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
// Modify MemoryOptimizer to support deferred initialization
class MemoryOptimizer {
  private static pools = new Map<string, any[]>();
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) return;
    
    // Initialize with smaller default pool sizes
    this.pools.set('svg-path', []);
    this.pools.set('component-data', []);
    this.pools.set('connection-data', []);
    
    this.isInitialized = true;
  }

  static getPool(type: string): any[] {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    if (!this.pools.has(type)) {
      this.pools.set(type, []);
    }
    return this.pools.get(type)!;
  }

  static poolObject<T>(type: string, factory: () => T): T {
    const pool = this.getPool(type);
    return pool.length > 0 ? pool.pop() : factory();
  }

  static releaseObject(type: string, obj: any) {
    const pool = this.getPool(type);
    pool.push(obj);
  }

  static memoizeWeak<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T {
    const cache = new WeakMap<object, any>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      
      if (!cache.has(key)) {
        cache.set(key, fn(...args));
      }
      
      return cache.get(key);
    }) as T;
  }
}

// Fast deep equality check with safety guards
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  // Handle null/undefined cases
  if (a == null || b == null) return a === b;
  
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    try {
      const keys = Object.keys(a);
      if (keys.length !== Object.keys(b).length) return false;
      
      for (const key of keys) {
        if (!(key in b) || !deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    } catch (error) {
      // Fallback to reference equality if deep check fails
      return false;
    }
  }
  
  return false;
}

// Performance-optimized event system with pooling and conditional loading
export class OptimizedEventSystem {
  private static instance: OptimizedEventSystem;
  private listeners = new Map<string, Set<EventListener>>();
  private throttledEvents = new Set(['scroll', 'resize', 'mousemove']);
  private debouncedEvents = new Set(['input', 'search']);
  private listenerPool: Function[] = [];
  private isInitialized = false;
  
  static getInstance(): OptimizedEventSystem {
    if (!OptimizedEventSystem.instance) {
      OptimizedEventSystem.instance = new OptimizedEventSystem();
    }
    return OptimizedEventSystem.instance;
  }
  
  // Defer initialization until first use
  private initialize() {
    if (this.isInitialized) return;
    
    // Pre-allocate listener function pool
    for (let i = 0; i < 20; i++) {
      this.listenerPool.push(() => {});
    }
    
    this.isInitialized = true;
  }
  
  addEventListener(
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) {
    this.initialize();
    
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
      
      // Return listener to pool if possible
      if (this.listenerPool.length < 50) {
        this.listenerPool.push(optimizedListener);
      }
    };
  }
  
  // Batch event registration for better performance
  addEventListeners(
    element: EventTarget,
    events: Array<{
      event: string;
      listener: EventListener;
      options?: AddEventListenerOptions;
    }>
  ): () => void {
    const cleanups = events.map(({ event, listener, options }) =>
      this.addEventListener(element, event, listener, options)
    );
    
    return () => {
      cleanups.forEach(cleanup => cleanup());
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
  
  // Cleanup all listeners for memory management
  cleanup() {
    this.listeners.clear();
    this.listenerPool = [];
    this.isInitialized = false;
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

// Types for initialization levels
type InitializationLevel = 'none' | 'basic' | 'full';

// Add lightweight performance monitoring for initialization phase
export function usePerformanceMonitor(level: InitializationLevel = 'basic') {
  const [isReady, setIsReady] = useState(false);
  const [monitor, setMonitor] = useState<PerformanceMonitor | null>(null);
  
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        if (level === 'none') {
          setIsReady(true);
          return;
        }
        
        const instance = PerformanceMonitor.getInstance(level);
        setMonitor(instance);
        
        if (level === 'full') {
          await PerformanceMonitor.deferredInitialize('full');
        }
        
        setIsReady(true);
      }
    };
    
    init();
  }, [level]);
  
  return { isReady, monitor };
}

// Hook for conditional performance utilities loading
export function usePerformanceUtils(enabled: boolean = true) {
  const [utils, setUtils] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!enabled || utils) return;
    
    setLoading(true);
    
    const loadUtils = async () => {
      try {
        // Initialize core components
        const monitor = PerformanceMonitor.getInstance('basic');
        MemoryOptimizer.initialize();
        
        setUtils({
          monitor,
          MemoryOptimizer,
          OptimizedEventSystem: OptimizedEventSystem.getInstance(),
          CanvasOptimizer
        });
      } catch (error) {
        console.warn('Failed to load performance utils:', error);
        setUtils({}); // Provide empty object as fallback
      } finally {
        setLoading(false);
      }
    };
    
    // Defer loading to next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(loadUtils);
    });
  }, [enabled, utils]);
  
  return { utils, loading };
}

// Factory function for lazy performance utilities initialization
export async function createPerformanceUtils(level: InitializationLevel = 'basic') {
  const monitor = PerformanceMonitor.getInstance(level);
  
  if (level === 'full') {
    await PerformanceMonitor.deferredInitialize('full');
  }
  
  MemoryOptimizer.initialize();
  
  return {
    monitor,
    MemoryOptimizer,
    OptimizedEventSystem: OptimizedEventSystem.getInstance(),
    CanvasOptimizer
  };
}

// Lightweight export for basic usage (no immediate initialization)
export const performanceUtils = {
  get monitor() {
    return PerformanceMonitor.getInstance('basic');
  },
  CanvasOptimizer,
  MemoryOptimizer,
  OptimizedEventSystem: OptimizedEventSystem.getInstance(),
  createPerformanceUtils,
  usePerformanceMonitor,
  usePerformanceUtils
};