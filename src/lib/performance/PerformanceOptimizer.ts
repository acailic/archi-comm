/**
 * ArchiComm Ultra-Performance Optimization System
 * Designed to achieve top 0.01% performance benchmarks
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Simple WorkerManager to cap concurrent worker creation based on hardware concurrency
export class WorkerManager {
  private static instance: WorkerManager;
  private activeWorkers = new Set<Worker>();
  private capacity: number;

  private constructor() {
    const hc = (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined) ?? 4;
    this.capacity = Math.max(1, hc - 1);
  }

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) WorkerManager.instance = new WorkerManager();
    return WorkerManager.instance;
  }

  getCapacity(): number {
    return this.capacity;
  }

  canCreateWorker(): boolean {
    return this.activeWorkers.size < this.capacity;
  }

  registerWorker(w: Worker) {
    this.activeWorkers.add(w);
  }

  unregisterWorker(w: Worker) {
    this.activeWorkers.delete(w);
  }
}

// Performance monitoring and metrics
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private observer: PerformanceObserver | null = null;
  private frameCounter = 0;
  private lastFrameTime = 0;
  private fps = 60;
  private lowFpsStreak = 0;
  private lastWarnTs = 0;
  private static readonly WARNING_COOLDOWN_MS = 5000;
  private static readonly LOW_FPS_THRESHOLD = 30;
  private static readonly LOW_FPS_STREAK_THRESHOLD = 10;
  private static readonly isDevelopment = process.env.NODE_ENV !== 'production';

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
  static async deferredInitialize(
    level: InitializationLevel = 'full'
  ): Promise<PerformanceMonitor> {
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

    return new Promise<void>(resolve => {
      // Defer heavy initialization
      (window.requestIdleCallback || window.setTimeout)(
        () => {
          this.initializePerformanceObserver();
          this.isFullyInitialized = true;
          resolve();
        },
        { timeout: 2000 }
      );
    });
  }

  // 3. Modify MemoryOptimizer to lazy initialize pools:
  private static objectPools = new Map<string, Array<unknown>>();

  static getPool<T>(type: string): Array<T> {
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
      this.observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, {
            timestamp: entry.startTime,
            duration: entry.duration,
            type: entry.entryType,
            value: entry.duration,
          });
        }
      });

      this.observer.observe({
        entryTypes: ['measure', 'navigation', 'resource', 'paint', 'largest-contentful-paint'],
      });
    }
  }

  private startFrameRateMonitoring() {
    const measureFrame = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime;
        this.fps = Math.round(1000 / delta);

        // Update low FPS streak
        if (this.fps < PerformanceMonitor.LOW_FPS_THRESHOLD) {
          this.lowFpsStreak++;

          // Only warn in development and when streak threshold is met
          const now = Date.now();
          if (
            PerformanceMonitor.isDevelopment &&
            this.lowFpsStreak >= PerformanceMonitor.LOW_FPS_STREAK_THRESHOLD &&
            now - this.lastWarnTs > PerformanceMonitor.WARNING_COOLDOWN_MS
          ) {
            // eslint-disable-next-line no-console
            console.warn(
              `[Performance] Sustained low FPS detected: ${this.fps} FPS ` +
              `(${this.lowFpsStreak} consecutive frames below ${PerformanceMonitor.LOW_FPS_THRESHOLD} FPS)`
            );
            this.lastWarnTs = now;
          }

          // Record metrics silently (without console spam)
          this.recordMetric('fps-drop', {
            timestamp,
            duration: 0,
            type: 'fps',
            value: this.fps,
          });
        } else {
          // Reset streak when FPS recovers
          this.lowFpsStreak = 0;
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
    return this.metrics.get(name) ?? [];
  }

  getCurrentFPS(): number {
    return this.fps;
  }

  getAverageMetric(name: string): number {
    const metrics = this.metrics.get(name) ?? [];
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
      value: end - start,
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
      value: end - start,
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
  private isCanvasElement: boolean = false;
  private compatibilityMode: boolean = false;

  constructor(element: HTMLElement, config?: { compatibilityMode?: boolean }) {
    // Handle both canvas and non-canvas elements
    this.isCanvasElement = element instanceof HTMLCanvasElement;
    this.compatibilityMode = config?.compatibilityMode ?? !this.isCanvasElement;

    if (this.isCanvasElement) {
      this.canvas = element as HTMLCanvasElement;
      this.ctx = this.canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
      });
    } else {
      // For non-canvas elements, we operate in compatibility mode
      console.log(`Operating in compatibility mode for ${element.tagName} element`);
    }

    // Only initialize canvas-specific features when appropriate
    if (this.isCanvasElement && !this.compatibilityMode) {
      this.initializeOffscreenRendering();
      this.optimizeCanvasSettings();
    }
  }

  private initializeOffscreenRendering() {
    // Check for Web Worker support first
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported. Falling back to main thread rendering.');
      return;
    }

    // Check worker capacity before attempting creation
    const workerManager = WorkerManager.getInstance();
    const capacity = workerManager.getCapacity();
    const canUseWorker = workerManager.canCreateWorker();

    if (!canUseWorker) {
      console.warn(`Worker capacity reached (${capacity}). Falling back to main thread rendering.`);
      return;
    }

    try {
      // Check for OffscreenCanvas support
      if (!('OffscreenCanvas' in window) || typeof OffscreenCanvas === 'undefined') {
        console.warn('OffscreenCanvas not supported. Falling back to main thread rendering.');
        return;
      }

      // Create OffscreenCanvas with error handling
      try {
        this.offscreenCanvas = new OffscreenCanvas(this.canvas!.width, this.canvas!.height);
      } catch (canvasError) {
        console.warn('Failed to create OffscreenCanvas:', canvasError);
        return;
      }

      // Create Web Worker with comprehensive error handling
      try {
        const worker = new Worker(new URL('./canvas-renderer.ts', import.meta.url), { type: 'module' });
        this.worker = worker;
        workerManager.registerWorker(worker);

        // Set up worker error handling
        this.worker.addEventListener('error', (error) => {
          console.error('Worker error:', error);
          this.handleWorkerFailure(worker);
        });

        this.worker.addEventListener('messageerror', (error) => {
          console.error('Worker message error:', error);
          this.handleWorkerFailure(worker);
        });

        this.worker.addEventListener('message', (ev: MessageEvent) => {
          const message = ev.data as WorkerMessage;
          if (message.type === 'error') {
            // eslint-disable-next-line no-console
            console.error('Worker reported error:', message.message);
            this.handleWorkerFailure(worker);
          } else if (message.type === 'terminate') {
            workerManager.unregisterWorker(worker);
          }
        });

        // Initialize worker with timeout
        const initTimeout = setTimeout(() => {
          console.warn('Worker initialization timeout. Falling back to main thread rendering.');
          this.handleWorkerFailure(worker);
        }, 5000);

        // Send initialization message
        this.worker.postMessage({
          type: 'init',
          canvas: this.offscreenCanvas,
        }, [this.offscreenCanvas]);

        // Clear timeout on successful message
        this.worker.addEventListener('message', (ev) => {
          const data = ev.data as WorkerMessage;
          if (data?.type === 'renderComplete') {
            clearTimeout(initTimeout);
          }
        }, { once: true });

      } catch (workerError) {
        console.warn('Failed to create Web Worker:', workerError);
        return;
      }

    } catch (error) {
      console.warn('OffscreenCanvas initialization failed:', error);
      this.fallbackToMainThread();
    }
  }

  private handleWorkerFailure(worker: Worker) {
    try {
      WorkerManager.getInstance().unregisterWorker(worker);
      worker.terminate();
    } catch (error) {
      console.warn('Error cleaning up failed worker:', error);
    }

    this.worker = null;
    this.offscreenCanvas = null;
    this.fallbackToMainThread();
  }

  private fallbackToMainThread() {
    console.log('Canvas rendering will continue on main thread.');
    // Ensure main thread rendering is still functional
    if (!this.ctx && this.canvas) {
      this.ctx = this.canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
      });
      this.optimizeCanvasSettings();
    }
  }

  private optimizeCanvasSettings() {
    if (!this.ctx) return;

    // Optimize rendering settings
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingQuality = 'high';

    // Pre-allocate frame buffers
    for (let i = 0; i < 3; i++) {
      this.framePool.push(this.ctx.createImageData(this.canvas!.width, this.canvas!.height));
    }
  }

  // Batch rendering operations for maximum performance
  queueRenderCommand(command: RenderCommand) {
    if (!this.compatibilityMode) {
      this.renderQueue.push(command);
    }
  }

  // Process render queue with intelligent batching
  flushRenderQueue() {
    if (this.renderQueue.length === 0 || this.compatibilityMode) return;

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
    this.ctx?.beginPath();

    commands.forEach(cmd => {
      const data = cmd.data as RenderCommandShape;
      if (data.shape === 'rectangle') {
        this.ctx?.rect(data.x, data.y, data.width, data.height);
      }
    });

    this.ctx?.fill();
    this.ctx?.stroke();
  }

  private batchDrawConnections(commands: RenderCommand[]) {
    if (!this.ctx) return;

    this.ctx?.beginPath();

    commands.forEach(cmd => {
      const connData = cmd.data as RenderCommandConnection;
      this.ctx?.moveTo(connData.x1, connData.y1);
      this.ctx?.lineTo(connData.x2, connData.y2);
    });

    this.ctx?.stroke();
  }

  private batchClearRegions(commands: RenderCommand[]) {
    if (!this.ctx) return;

    commands.forEach(cmd => {
      const clearData = cmd.data as RenderCommandClear;
      this.ctx?.clearRect(clearData.x, clearData.y, clearData.width, clearData.height);
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
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
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
export const useOptimizedCallback = <TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn,
  deps: React.DependencyList
): (...args: TArgs) => TReturn => {
  const memoizedCallback = useCallback(callback, deps);

  // Wrap with performance monitoring (with fallback)
  return useCallback(
    (...args: TArgs) => {
      try {
        const monitor = PerformanceMonitor.isReady() ? PerformanceMonitor.getInstance() : null;
        if (monitor?.measure) {
          return monitor.measure('callback-execution', () => {
            return memoizedCallback(...args);
          });
        }
      } catch (error) {
        // Fallback to direct execution if monitoring fails
      }
      return memoizedCallback(...args);
    },
    [memoizedCallback]
  ) as (...args: TArgs) => TReturn;
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
export const useOptimizedMemo = <T>(factory: () => T, deps: React.DependencyList): T => {
  return useMemo(() => {
    try {
      const monitor = PerformanceMonitor.isReady() ? PerformanceMonitor.getInstance() : null;
      if (monitor?.measure) {
        return monitor.measure('memo-computation', factory);
      }
    } catch (error) {
      // Fallback to direct execution if monitoring fails
    }
    return factory();
  }, deps);
};

// Virtual scrolling for large lists
export const useVirtualizedList = <T>(items: T[], itemHeight: number, containerHeight: number) => {
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
      setScrollTop,
    };
  }, [items, itemHeight, containerHeight, scrollTop]);
};

// Lightweight LRU cache utility for primitives
export function createLRUCache<K, V>(maxSize: number = 100) {
  const map = new Map<K, V>();
  return {
    get(key: K): V | undefined {
      if (!map.has(key)) return undefined;
      const val = map.get(key)!;
      // mark as recently used
      map.delete(key);
      map.set(key, val);
      return val;
    },
    set(key: K, value: V) {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      if (map.size > maxSize) {
        const firstKey = map.keys().next().value as K;
        map.delete(firstKey);
      }
    },
    delete(key: K) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    get size() {
      return map.size;
    },
    get maxSize() {
      return maxSize;
    },
  };
}

// Memory management utilities
// Modify MemoryOptimizer to support deferred initialization
export class MemoryOptimizer {
  private static pools = new Map<string, Array<unknown>>();
  private static isInitialized = false;
  private static poolLimits = new Map<string, number>();
  private static defaultLimit = 1000;

  static initialize() {
    if (this.isInitialized) return;

    // Initialize with smaller default pool sizes
    this.pools.set('svg-path', []);
    this.pools.set('component-data', []);
    this.pools.set('connection-data', []);

    this.isInitialized = true;
  }

  static getPool<T>(type: string): Array<T> {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.pools.has(type)) {
      this.pools.set(type, []);
    }
    return this.pools.get(type)! as Array<T>;
  }

  static poolObject<T>(type: string, factory: () => T): T {
    const pool = this.getPool(type);
    const limit = this.poolLimits.get(type) ?? this.defaultLimit;
    while (pool.length > limit) pool.shift();
    return pool.length > 0 ? (pool.pop() as T) : factory();
  }

  static releaseObject(type: string, obj: unknown) {
    const pool = this.getPool(type);
    pool.push(obj);
    const limit = this.poolLimits.get(type) ?? this.defaultLimit;
    while (pool.length > limit) pool.shift();
  }

  static setPoolLimit(type: string, maxSize: number) {
    this.poolLimits.set(type, Math.max(0, maxSize));
  }

  static memoizeWeak<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn, keyFn?: (...args: TArgs) => unknown, maxSize: number = 100): (...args: TArgs) => TReturn {
    const weak = new WeakMap<object, TReturn>();
    const lru = createLRUCache<unknown, TReturn>(maxSize);
    return ((...args: TArgs): TReturn => {
      const rawKey = keyFn ? keyFn(...args) : (args.length ? (args[0] as unknown) : '__noargs__');
      if (rawKey && typeof rawKey === 'object') {
        const obj = rawKey as object;
        const weakValue = weak.get(obj);
        if (weakValue !== undefined) return weakValue;
        const val = fn(...args);
        weak.set(obj, val);
        return val;
      }
      const primitiveKey = (typeof rawKey === 'string' || typeof rawKey === 'number' || typeof rawKey === 'symbol')
        ? rawKey
        : JSON.stringify(args);
      const hit = lru.get(primitiveKey);
      if (hit !== undefined) return hit;
      const val = fn(...args);
      lru.set(primitiveKey, val);
      return val;
    });
  }
}

// Fast deep equality check with safety guards
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // Handle null/undefined cases
  if (a == null || b == null) return a === b;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    try {
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;

      const aObj = a as { [key: string]: unknown };
      const bObj = b as { [key: string]: unknown };

      const keys = Object.keys(aObj);
      if (keys.length !== Object.keys(bObj).length) return false;

      for (const key of keys) {
        if (!(key in bObj) || !deepEqual(aObj[key], bObj[key])) return false;
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

  private throttle<E extends Event>(func: (evt: E) => void, limit: number) {
    let inThrottle: boolean;
    return function (this: unknown, evt: E) {
      if (!inThrottle) {
        func.call(this, evt);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  private debounce<E extends Event>(func: (evt: E) => void, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: unknown, evt: E) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.call(this, evt), delay);
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
interface RenderCommandShape {
  shape: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderCommandConnection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RenderCommandClear {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderCommand {
  type: 'draw-components' | 'draw-connections' | 'clear-region';
  priority: number;
  data: RenderCommandShape | RenderCommandConnection | RenderCommandClear;
}

interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Types for worker messages
interface WorkerMessage {
  type: 'init' | 'error' | 'terminate' | 'renderComplete';
  message?: string;
  canvas?: OffscreenCanvas;
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

    void init();
  }, [level]);

  return { isReady, monitor };
}

// Hook for conditional performance utilities loading
export function usePerformanceUtils(enabled: boolean = true) {
  interface PerformanceUtils {
    monitor: PerformanceMonitor;
    MemoryOptimizer: typeof MemoryOptimizer;
    OptimizedEventSystem: OptimizedEventSystem;
    CanvasOptimizer: typeof CanvasOptimizer;
  }

  const [utils, setUtils] = useState<PerformanceUtils | null>(null);
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
          CanvasOptimizer,
        });
      } catch (error) {
        console.warn('Failed to load performance utils:', error);
        // Keep as null on failure
        setUtils(null);
      } finally {
        setLoading(false);
      }
    };

    // Defer loading to next frame
    requestAnimationFrame(() => void loadUtils());
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
    CanvasOptimizer,
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
  usePerformanceUtils,
};
