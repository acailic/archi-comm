// src/lib/performance/OptimizedEventSystem.ts
// High-performance event system with automatic cleanup and error handling
// Provides optimized event handling for the ArchiComm application with built-in safety mechanisms
// RELEVANT FILES: src/lib/config/performance-config.ts, src/lib/logging/logger.ts, src/packages/ui/components/DesignCanvas/hooks/useDesignCanvasCallbacks.ts, src/shared/hooks/common/useStableCallbacks.ts

import { getDebugFlags } from '@/lib/config/performance-config';

export class OptimizedEventSystem {
  private static instance: OptimizedEventSystem | null = null;

  private listeners = new Map<string, Set<(payload?: unknown) => void>>();

  static getInstance(): OptimizedEventSystem {
    if (!OptimizedEventSystem.instance) {
      OptimizedEventSystem.instance = new OptimizedEventSystem();
    }
    return OptimizedEventSystem.instance;
  }

  on(event: string, handler: (payload?: unknown) => void): () => void {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(handler);
    this.listeners.set(event, bucket);
    return () => this.off(event, handler);
  }

  off(event: string, handler: (payload?: unknown) => void): void {
    const bucket = this.listeners.get(event);
    bucket?.delete(handler);
    if (bucket && bucket.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event: string, payload?: unknown): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }
    bucket.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        if (getDebugFlags().enableRenderLogging) {
          console.warn(`[OptimizedEventSystem] listener for "${event}" failed`, error);
        }
      }
    });
  }

  reset(): void {
    this.listeners.clear();
  }
}