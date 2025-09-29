import {
  getDebugFlags,
  getPerformanceBudgets,
} from "@/lib/config/performance-config";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";

const timestamp = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

/*
 * Simplification summary:
 * - Consolidated monitoring into a lightweight PerformanceOptimizer with batched idle flushing.
 * - Introduced circular buffers with sampling, memory pressure detection, and an automatic circuit breaker.
 * - Replaced legacy canvas/memory utilities with deprecated, low-overhead compatibility shims.
 */

const isBrowser = typeof window !== "undefined";
const isDevBuild =
  typeof import.meta !== "undefined" &&
  Boolean(
    (import.meta as unknown as { env?: Record<string, unknown> }).env?.DEV
  );

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining(): number;
};

type IdleCallback = (deadline: IdleDeadline) => void;
type IdleCallbackHandle = number;

const DEFAULT_IDLE_TIMEOUT = 50;

const idleScheduler = (() => {
  if (!isBrowser) {
    return {
      schedule: (cb: IdleCallback): IdleCallbackHandle =>
        setTimeout(
          () => cb({ didTimeout: false, timeRemaining: () => 0 }),
          DEFAULT_IDLE_TIMEOUT
        ) as unknown as IdleCallbackHandle,
      cancel: (handle: IdleCallbackHandle | null | undefined) => {
        if (handle != null) {
          clearTimeout(handle);
        }
      },
    };
  }

  const win = window as Window & {
    requestIdleCallback?: (
      cb: IdleCallback,
      options?: { timeout: number }
    ) => IdleCallbackHandle;
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
  };

  if (typeof win.requestIdleCallback === "function") {
    return {
      schedule: (cb: IdleCallback): IdleCallbackHandle =>
        win.requestIdleCallback(cb, { timeout: DEFAULT_IDLE_TIMEOUT }),
      cancel: (handle: IdleCallbackHandle | null | undefined) => {
        if (handle != null) {
          win.cancelIdleCallback?.(handle);
        }
      },
    };
  }

  return {
    schedule: (cb: IdleCallback): IdleCallbackHandle =>
      window.setTimeout(
        () => cb({ didTimeout: false, timeRemaining: () => 0 }),
        DEFAULT_IDLE_TIMEOUT
      ) as unknown as IdleCallbackHandle,
    cancel: (handle: IdleCallbackHandle | null | undefined) => {
      if (handle != null) {
        window.clearTimeout(handle);
      }
    },
  };
})();

const scheduleIdle = (cb: IdleCallback): IdleCallbackHandle =>
  idleScheduler.schedule(cb);
const cancelIdle = (handle: IdleCallbackHandle | null | undefined): void => {
  if (handle != null) {
    idleScheduler.cancel(handle);
  }
};

const MAX_HISTORY = 100;
const SAMPLE_INTERVAL_PROD = 4;
const MAX_OVERHEAD_MS = 1;
const MAX_OVERHEAD_VIOLATIONS = 5;
const MAX_METRIC_AGE_MS = 5 * 60_000;
const TRIM_INTERVAL_MS = 60_000;
const MEMORY_PRESSURE_THRESHOLD = 0.85;
const DEV_RENDER_THRESHOLD_MS = 16;
const CRITICAL_RENDER_THRESHOLD_MS = 48;

const warnedFeatures = new Set<string>();
const warnOnce = (feature: string, message: string): void => {
  if (!isDevBuild || warnedFeatures.has(feature)) {
    return;
  }
  console.warn(message);
  warnedFeatures.add(feature);
};

interface MetricRecord {
  duration: number;
  timestamp: number;
}

interface PendingMetric {
  name: string;
  record: MetricRecord;
}

type MetricStore = Map<string, CircularBuffer<MetricRecord>>;

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

class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private capacity: number;
  private lengthValue = 0;
  private start = 0;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array(this.capacity);
  }

  push(value: T): void {
    if (this.lengthValue < this.capacity) {
      const end = (this.start + this.lengthValue) % this.capacity;
      this.buffer[end] = value;
      this.lengthValue += 1;
      return;
    }

    this.buffer[this.start] = value;
    this.start = (this.start + 1) % this.capacity;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let index = 0; index < this.lengthValue; index += 1) {
      const pointer = (this.start + index) % this.capacity;
      const value = this.buffer[pointer];
      if (value !== undefined) {
        result.push(value);
      }
    }
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.lengthValue = 0;
    this.start = 0;
  }

  shrinkTo(newCapacity: number): void {
    const normalized = Math.max(1, Math.min(newCapacity, this.capacity));
    if (normalized === this.capacity) {
      return;
    }

    const data = this.toArray();
    const trimmed = data.slice(-normalized);
    this.capacity = normalized;
    this.buffer = new Array(this.capacity);
    this.lengthValue = 0;
    this.start = 0;
    trimmed.forEach((item) => this.push(item));
  }

  get length(): number {
    return this.lengthValue;
  }

  get maxLength(): number {
    return this.capacity;
  }
}

export interface PerformanceIssue {
  type:
    | "low-fps"
    | "slow-operation"
    | "monitoring-disabled"
    | "memory-pressure";
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: number;
  data?: Record<string, unknown>;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer | null = null;

  private readonly metrics: MetricStore = new Map();
  private readonly renderCounts = new Map<string, number>();
  private readonly sampleCounters = new Map<string, number>();
  private readonly pending: PendingMetric[] = [];
  private flushHandle: IdleCallbackHandle | null = null;
  private enabled = true;
  private overheadViolations = 0;
  private lastTrimCheck = 0;

  private fps = 60;
  private lastFrame = 0;
  private frameSampleCount = 0;
  private rafId: number | null = null;

  private readonly frameSampleWindow = isDevBuild ? 1 : 6;
  private readonly budgets = getPerformanceBudgets();
  private readonly debugFlags = getDebugFlags();

  private readonly issueHandlers = new Set<(issue: PerformanceIssue) => void>();
  private lastFpsWarningAt = 0;
  private readonly lastSlowMetricAt = new Map<string, number>();

  private constructor() {
    if (isBrowser && typeof window.requestAnimationFrame === "function") {
      this.startFrameSampling();
    }
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  recordMetric(name: string, duration: number): void {
    if (!this.enabled) {
      return;
    }

    this.incrementRenderCount(name);

    const counter = (this.sampleCounters.get(name) ?? 0) + 1;
    this.sampleCounters.set(name, counter);

    const sampleInterval = isDevBuild ? 1 : SAMPLE_INTERVAL_PROD;
    if (counter % sampleInterval !== 0) {
      return;
    }

    const record: MetricRecord = { duration, timestamp: timestamp() };
    this.pending.push({ name, record });
    this.scheduleFlush();
  }

  measure<T>(name: string, operation: () => T): T {
    const start = timestamp();
    try {
      return operation();
    } finally {
      this.recordMetric(name, Math.max(0, timestamp() - start));
    }
  }

  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = timestamp();
    try {
      return await operation();
    } finally {
      this.recordMetric(name, Math.max(0, timestamp() - start));
    }
  }

  getMetrics(name: string): MetricRecord[] {
    return this.metrics.get(name)?.toArray() ?? [];
  }

  getAverageDuration(name: string): number {
    const records = this.metrics.get(name);
    if (!records || records.length === 0) {
      return 0;
    }

    const entries = records.toArray();
    const total = entries.reduce((sum, record) => sum + record.duration, 0);
    return total / entries.length;
  }

  getRenderCount(name: string): number {
    return this.renderCounts.get(name) ?? 0;
  }

  getCurrentFPS(): number {
    return this.fps;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      this.renderCounts.delete(name);
      this.sampleCounters.delete(name);
      this.lastSlowMetricAt.delete(name);
      return;
    }

    if (this.flushHandle !== null) {
      cancelIdle(this.flushHandle);
      this.flushHandle = null;
    }

    this.metrics.clear();
    this.renderCounts.clear();
    this.sampleCounters.clear();
    this.lastSlowMetricAt.clear();
    this.pending.length = 0;
    this.enabled = true;
  }

  onPerformanceIssue(handler: (issue: PerformanceIssue) => void): () => void {
    this.issueHandlers.add(handler);
    return () => {
      this.issueHandlers.delete(handler);
    };
  }

  private scheduleFlush(): void {
    if (this.flushHandle !== null) {
      return;
    }

    this.flushHandle = scheduleIdle((deadline) => {
      this.flushHandle = null;

      if (!this.enabled) {
        this.pending.length = 0;
        return;
      }

      const start = timestamp();
      const queue = this.pending.splice(0, this.pending.length);

      for (const entry of queue) {
        this.commitMetric(entry.name, entry.record);
      }

      const overhead = timestamp() - start;

      if (overhead > MAX_OVERHEAD_MS) {
        this.overheadViolations += 1;
        if (this.overheadViolations >= MAX_OVERHEAD_VIOLATIONS) {
          this.enabled = false;
          this.notifyIssue({
            type: "monitoring-disabled",
            severity: "warning",
            message:
              "Performance monitoring disabled due to instrumentation overhead",
            timestamp: Date.now(),
            data: { overhead },
          });
        }
      } else {
        this.overheadViolations = 0;
      }

      this.maybeDetectMemoryPressure();
      this.maybeTrimMetrics();

      if (
        !deadline.didTimeout &&
        deadline.timeRemaining() > 4 &&
        this.pending.length > 0
      ) {
        this.scheduleFlush();
      }
    });
  }

  private commitMetric(name: string, record: MetricRecord): void {
    let buffer = this.metrics.get(name);
    if (!buffer) {
      buffer = new CircularBuffer<MetricRecord>(MAX_HISTORY);
      this.metrics.set(name, buffer);
    }

    buffer.push(record);
    this.evaluateMetric(name, record.duration, record.timestamp);
  }

  private evaluateMetric(
    name: string,
    duration: number,
    recordedAt: number
  ): void {
    if (duration <= DEV_RENDER_THRESHOLD_MS) {
      return;
    }

    const burstModulo = Math.max(1, this.budgets.maxRapidRenderBursts);
    const renderCount = this.getRenderCount(name);
    if (
      renderCount % burstModulo !== 0 &&
      duration < CRITICAL_RENDER_THRESHOLD_MS
    ) {
      return;
    }

    const lastAlert = this.lastSlowMetricAt.get(name) ?? 0;
    if (recordedAt - lastAlert < 3000) {
      return;
    }

    this.lastSlowMetricAt.set(name, recordedAt);
    this.notifyIssue({
      type: "slow-operation",
      severity: duration >= CRITICAL_RENDER_THRESHOLD_MS ? "error" : "warning",
      message: `${name} exceeded ${DEV_RENDER_THRESHOLD_MS}ms (${duration.toFixed(1)}ms)`,
      timestamp: recordedAt,
      data: { duration, metric: name },
    });
  }

  private startFrameSampling(): void {
    if (!isBrowser || this.rafId !== null) {
      return;
    }

    const loop = (frameTime: number) => {
      if (this.lastFrame) {
        const delta = frameTime - this.lastFrame;
        if (delta > 0) {
          this.frameSampleCount += 1;
          if (this.frameSampleCount % this.frameSampleWindow === 0) {
            this.fps = Math.round(1000 / delta);
            this.evaluateFpsBudget();
          }
        }
      }

      this.lastFrame = frameTime;
      this.rafId = window.requestAnimationFrame(loop);
    };

    this.rafId = window.requestAnimationFrame(loop);
  }

  private evaluateFpsBudget(): void {
    if (this.fps >= 45) {
      return;
    }

    const now = Date.now();
    if (now - this.lastFpsWarningAt < 5000) {
      return;
    }

    this.lastFpsWarningAt = now;
    this.notifyIssue({
      type: "low-fps",
      severity: this.fps < 30 ? "error" : "warning",
      message: `Frame rate dropped to ${this.fps} FPS`,
      timestamp: now,
      data: { fps: this.fps },
    });
  }

  private maybeDetectMemoryPressure(): void {
    if (!isBrowser) {
      return;
    }

    const perf = performance as Performance & {
      memory?: {
        jsHeapSizeLimit?: number;
        totalJSHeapSize?: number;
        usedJSHeapSize?: number;
      };
    };

    const memory = perf.memory;
    if (!memory || memory.usedJSHeapSize == null) {
      return;
    }

    const limit = memory.jsHeapSizeLimit ?? memory.totalJSHeapSize;
    if (!limit) {
      return;
    }

    const utilization = memory.usedJSHeapSize / limit;
    if (utilization < MEMORY_PRESSURE_THRESHOLD) {
      return;
    }

    this.metrics.forEach((buffer) => {
      buffer.shrinkTo(Math.max(10, Math.floor(buffer.maxLength / 2)));
    });

    this.notifyIssue({
      type: "memory-pressure",
      severity: "warning",
      message: "Performance metrics history trimmed due to memory pressure",
      timestamp: Date.now(),
      data: { utilization },
    });
  }

  private maybeTrimMetrics(): void {
    const now = Date.now();
    if (now - this.lastTrimCheck < TRIM_INTERVAL_MS) {
      return;
    }

    this.lastTrimCheck = now;

    this.metrics.forEach((buffer, name) => {
      if (buffer.length === 0) {
        return;
      }

      const filtered = buffer
        .toArray()
        .filter((record) => now - record.timestamp <= MAX_METRIC_AGE_MS);
      if (filtered.length === buffer.length) {
        return;
      }

      buffer.clear();
      filtered.forEach((record) => buffer.push(record));
      if (filtered.length === 0) {
        this.metrics.delete(name);
      }
    });
  }

  private incrementRenderCount(name: string): void {
    this.renderCounts.set(name, (this.renderCounts.get(name) ?? 0) + 1);
  }

  private notifyIssue(issue: PerformanceIssue): void {
    if (this.debugFlags.enableRenderLogging) {
      console.warn("[PerformanceOptimizer]", issue.message, issue);
    }

    this.issueHandlers.forEach((handler) => {
      try {
        handler(issue);
      } catch (error) {
        if (this.debugFlags.enableRenderLogging) {
          console.warn("[PerformanceOptimizer] issue handler failed", error);
        }
      }
    });
  }
}

/** @deprecated Canvas rendering is now handled directly by React Flow. */
export class CanvasOptimizer {
  constructor() {
    warnOnce(
      "CanvasOptimizer",
      "[CanvasOptimizer] has been deprecated and is now a no-op shim."
    );
  }

  markDirty(_region: DirtyRegion): void {
    // no-op
  }

  queueRenderCommand(_command: RenderCommand): void {
    // no-op
  }

  flushRenderQueue(): void {
    // no-op
  }

  dispose(): void {
    // no-op
  }
}

/** @deprecated Event system shims remain for compatibility and will be removed in a future release. */
export class OptimizedEventSystem {
  private static instance: OptimizedEventSystem | null = null;
  private readonly listeners = new Map<
    string,
    Set<(payload?: unknown) => void>
  >();

  private constructor() {
    warnOnce(
      "OptimizedEventSystem",
      "[OptimizedEventSystem] is deprecated. Prefer native event emitters."
    );
  }

  static getInstance(): OptimizedEventSystem {
    if (!OptimizedEventSystem.instance) {
      OptimizedEventSystem.instance = new OptimizedEventSystem();
    }
    return OptimizedEventSystem.instance;
  }

  on(event: string, handler: (payload?: unknown) => void): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: (payload?: unknown) => void): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }
    bucket.delete(handler);
    if (bucket.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event: string, payload?: unknown): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }

    bucket.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        if (getDebugFlags().enableRenderLogging) {
          console.warn(
            `[OptimizedEventSystem] listener for "${event}" failed`,
            error
          );
        }
      }
    });
  }

  reset(): void {
    this.listeners.clear();
  }
}

/** @deprecated Memory pooling is limited and will be removed in a future release. */
export class MemoryOptimizer {
  private static readonly defaultLimit = 16;
  private static pools = new Map<string, unknown[]>();
  private static limits = new Map<string, number>();
  private static hits = 0;
  private static misses = 0;

  static initialize(): void {
    warnOnce(
      "MemoryOptimizer",
      "[MemoryOptimizer] pooling is deprecated and limited to small buffers."
    );
  }

  private static getPool(type: string): unknown[] {
    const existing = this.pools.get(type);
    if (existing) {
      return existing;
    }
    const pool: unknown[] = [];
    this.pools.set(type, pool);
    return pool;
  }

  static poolObject<T>(type: string, factory: () => T): T {
    const pool = this.getPool(type);
    const item = pool.pop();
    if (item !== undefined) {
      this.hits += 1;
      return item as T;
    }

    this.misses += 1;
    return factory();
  }

  static releaseObject(type: string, value: unknown): void {
    const pool = this.getPool(type);
    const limit = this.limits.get(type) ?? this.defaultLimit;
    if (pool.length >= limit) {
      return;
    }
    pool.push(value);
  }

  static setPoolLimit(type: string, limit: number): void {
    this.limits.set(type, Math.max(0, limit));
  }

  static getPoolStats(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }
}

type InitializationLevel = "none" | "basic" | "full";

export function usePerformanceMonitor(level: InitializationLevel = "basic") {
  const [monitor, setMonitor] = useState<PerformanceOptimizer | null>(
    level === "none" ? PerformanceOptimizer.getInstance() : null
  );

  useEffect(() => {
    if (level === "none") {
      return;
    }
    const instance = PerformanceOptimizer.getInstance();
    setMonitor(instance);
  }, [level]);

  return {
    isReady: level === "none" || monitor !== null,
    monitor: monitor ?? PerformanceOptimizer.getInstance(),
  };
}

export function usePerformanceUtils(enabled: boolean = true) {
  const [utils, setUtils] = useState<{
    monitor: PerformanceOptimizer;
    MemoryOptimizer: typeof MemoryOptimizer;
    CanvasOptimizer: typeof CanvasOptimizer;
    OptimizedEventSystem: OptimizedEventSystem;
  } | null>(
    enabled
      ? {
          monitor: PerformanceOptimizer.getInstance(),
          MemoryOptimizer,
          CanvasOptimizer,
          OptimizedEventSystem: OptimizedEventSystem.getInstance(),
        }
      : null
  );

  useEffect(() => {
    if (!enabled) {
      setUtils(null);
      return;
    }

    setUtils({
      monitor: PerformanceOptimizer.getInstance(),
      MemoryOptimizer,
      CanvasOptimizer,
      OptimizedEventSystem: OptimizedEventSystem.getInstance(),
    });
  }, [enabled]);

  return { utils, loading: false };
}

export async function createPerformanceUtils(
  level: InitializationLevel = "basic"
) {
  if (level === "none") {
    return {
      monitor: PerformanceOptimizer.getInstance(),
      MemoryOptimizer,
      OptimizedEventSystem: OptimizedEventSystem.getInstance(),
      CanvasOptimizer,
    };
  }

  return {
    monitor: PerformanceOptimizer.getInstance(),
    MemoryOptimizer,
    OptimizedEventSystem: OptimizedEventSystem.getInstance(),
    CanvasOptimizer,
  };
}

export const performanceUtils = {
  get monitor() {
    return PerformanceOptimizer.getInstance();
  },
  CanvasOptimizer,
  MemoryOptimizer,
  OptimizedEventSystem: OptimizedEventSystem.getInstance(),
  createPerformanceUtils,
  usePerformanceMonitor,
  usePerformanceUtils,
};

export const useOptimizedCallback = <TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn,
  deps: DependencyList
): ((...args: TArgs) => TReturn) => {
  const monitorRef = useRef(PerformanceOptimizer.getInstance());
  const shouldMeasure = getDebugFlags().enableRenderLogging;
  const memoized = useCallback(callback, deps);

  return useCallback(
    (...args: TArgs) => {
      if (!shouldMeasure) {
        return memoized(...args);
      }
      return monitorRef.current.measure("callback", () => memoized(...args));
    },
    [memoized, shouldMeasure]
  );
};

export const useStableReference = <T>(value: T): T => {
  const ref = useRef(value);
  if (!Object.is(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
};

export function createLRUCache<K, V>(maxSize: number = 100) {
  const map = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      if (!map.has(key)) return undefined;
      const value = map.get(key)!;
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key: K, value: V): void {
      if (map.has(key)) {
        map.delete(key);
      }
      map.set(key, value);
      if (map.size > maxSize) {
        const firstKey = map.keys().next().value as K;
        map.delete(firstKey);
      }
    },
    delete(key: K): void {
      map.delete(key);
    },
    clear(): void {
      map.clear();
    },
    get size(): number {
      return map.size;
    },
    get maxSize(): number {
      return maxSize;
    },
  };
}

export { PerformanceMonitor } from "./PerformanceMonitor";
