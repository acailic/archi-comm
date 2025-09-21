// src/shared/hooks/performance/usePerformanceMonitor.ts
// Performance monitoring hook to track re-renders and measure optimization impact
// Helps debug performance issues and measure improvement from optimizations
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/stores/canvasStore.ts

import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

const performanceMap = new Map<string, PerformanceMetrics>();

export function usePerformanceMonitor(componentName: string, enabled = import.meta.env.DEV) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    // Mark render start
    startTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      // Calculate render time
      if (startTime.current) {
        const renderTime = performance.now() - startTime.current;
        renderTimes.current.push(renderTime);

        // Keep only last 10 renders for average calculation
        if (renderTimes.current.length > 10) {
          renderTimes.current.shift();
        }

        // Update performance metrics
        const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

        performanceMap.set(componentName, {
          componentName,
          renderCount: renderCount.current,
          lastRenderTime: renderTime,
          averageRenderTime: avgRenderTime,
        });

        // Log excessive re-renders
        if (renderCount.current % 10 === 0) {
          console.warn(`🚨 ${componentName} has rendered ${renderCount.current} times. Avg: ${avgRenderTime.toFixed(2)}ms`);
        }
      }
    };
  });

  return {
    renderCount: renderCount.current,
    getMetrics: () => performanceMap.get(componentName),
    getAllMetrics: () => Array.from(performanceMap.values()),
  };
}

// Global function to log all performance metrics
export function logPerformanceMetrics() {
  const metrics = Array.from(performanceMap.values())
    .sort((a, b) => b.renderCount - a.renderCount);

  console.group('🔍 Performance Metrics');
  metrics.forEach(metric => {
    console.log(`${metric.componentName}: ${metric.renderCount} renders, avg ${metric.averageRenderTime.toFixed(2)}ms`);
  });
  console.groupEnd();
}

// Add global function to window for debugging
if (typeof window !== 'undefined') {
  (window as any).logPerformanceMetrics = logPerformanceMetrics;
}
