// src/lib/performance/PerformanceMonitor.ts
// Core performance monitoring system with metric collection and FPS tracking
// Provides base monitoring infrastructure for the ArchiComm performance system
// RELEVANT FILES: src/lib/config/performance-config.ts, src/lib/performance/PerformanceOptimizer.ts, src/packages/ui/components/diagnostics/tabs/PerformanceTab.tsx, src/shared/utils/performanceMonitor.ts

import { getDebugFlags } from '@/lib/config/performance-config';

const timestamp = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

interface MetricRecord {
  duration: number;
  timestamp: number;
}

type MetricStore = Map<string, MetricRecord[]>;

const DEFAULT_BUCKET_SIZE = 50;

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;

  private metrics: MetricStore = new Map();
  private fps = 60;
  private lastFrame = 0;
  private rafId: number | null = null;
  private frameSamplingEnabled = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  static isReady(): boolean {
    return PerformanceMonitor.instance !== null;
  }

  private constructor() {
    if (typeof window !== 'undefined' && getDebugFlags().enableRenderLogging) {
      this.startFrameSampling();
    }
  }

  private startFrameSampling(): void {
    if (this.frameSamplingEnabled || typeof window === 'undefined') {
      return;
    }

    this.frameSamplingEnabled = true;
    const sample = (frameTime: number) => {
      if (this.lastFrame > 0) {
        const delta = frameTime - this.lastFrame;
        if (delta > 0) {
          this.fps = Math.round(1000 / delta);
        }
      }
      this.lastFrame = frameTime;
      this.rafId = window.requestAnimationFrame(sample);
    };

    this.rafId = window.requestAnimationFrame(sample);
  }

  stopFrameSampling(): void {
    if (typeof window !== 'undefined' && this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.frameSamplingEnabled = false;
  }

  recordMetric(name: string, duration: number): void {
    const existing = this.metrics.get(name) ?? [];
    existing.push({ duration, timestamp: timestamp() });
    if (existing.length > DEFAULT_BUCKET_SIZE) {
      existing.splice(0, existing.length - DEFAULT_BUCKET_SIZE);
    }
    this.metrics.set(name, existing);
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
    return this.metrics.get(name) ?? [];
  }

  getAverageMetric(name: string): number {
    const data = this.metrics.get(name) ?? [];
    if (data.length === 0) {
      return 0;
    }
    const total = data.reduce((sum, metric) => sum + metric.duration, 0);
    return total / data.length;
  }

  getCurrentFPS(): number {
    return this.fps;
  }
}