import { describe, it, expect } from 'vitest';
import { createLRUCache, PerformanceMonitor } from '@/lib/performance/PerformanceOptimizer';
import { CanvasPerformanceManager } from '@/lib/performance/CanvasPerformanceManager';

describe('Canvas performance validations', () => {
  it('LRU cache hit rate is reasonable', () => {
    const lru = createLRUCache<string, number>(100);
    for (let i = 0; i < 100; i++) lru.set(String(i), i);
    let hits = 0;
    for (let i = 0; i < 100; i++) if (lru.get(String(i)) !== undefined) hits++;
    expect(hits).toBeGreaterThan(80);
  });

  it('worker capacity respects hardware concurrency', () => {
    const mgr = CanvasPerformanceManager.getInstance();
    const cap = mgr.getWorkerCapacity();
    expect(cap).toBeGreaterThan(0);
  });

  it('performance monitor measures durations', async () => {
    const mon = PerformanceMonitor.getInstance('basic');
    const res = mon.measure('unit-op', () => 42);
    expect(res).toBe(42);
    const asyncRes = await mon.measureAsync('unit-async', async () => 7);
    expect(asyncRes).toBe(7);
    expect(mon.getMetrics('unit-op').length).toBeGreaterThan(0);
  });
});

