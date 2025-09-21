/**
 * Comprehensive performance monitoring dashboard for React rendering optimization
 * Provides real-time insights into component performance and re-rendering patterns
 */

import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { getCallbackStabilityMetrics } from '@/shared/hooks/common/useStableCallbacks';

export interface RenderPerformanceMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  longestRenderTime: number;
  recentRenderTimes: number[];
  stabilityScore: number;
  optimizationSuggestions: string[];
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    jsHeapSizeLimit: number;
  };
}

export interface SystemPerformanceMetrics {
  totalComponents: number;
  activeComponents: number;
  slowComponents: number;
  unstableCallbacks: number;
  memoryPressure: 'low' | 'medium' | 'high';
  overallScore: number;
  recommendations: string[];
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private componentMetrics = new Map<string, RenderPerformanceMetrics>();
  private systemStartTime = performance.now();
  private observers: Array<(metrics: SystemPerformanceMetrics) => void> = [];
  private notifyHandle: number | null = null;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordComponentRender(componentName: string, renderTime: number): void {
    if (!import.meta.env.DEV) return;

    let metrics = this.componentMetrics.get(componentName);

    if (!metrics) {
      metrics = {
        componentName,
        renderCount: 0,
        averageRenderTime: 0,
        longestRenderTime: 0,
        recentRenderTimes: [],
        stabilityScore: 100,
        optimizationSuggestions: [],
        memoryUsage: this.getMemoryUsage()
      };
      this.componentMetrics.set(componentName, metrics);
    }

    // Update metrics
    metrics.renderCount++;
    metrics.recentRenderTimes.unshift(renderTime);
    if (metrics.recentRenderTimes.length > 10) {
      metrics.recentRenderTimes.pop();
    }

    metrics.averageRenderTime = metrics.recentRenderTimes.reduce((sum, time) => sum + time, 0) / metrics.recentRenderTimes.length;
    metrics.longestRenderTime = Math.max(metrics.longestRenderTime, renderTime);
    metrics.memoryUsage = this.getMemoryUsage();

    // Calculate stability score
    const componentOptimizerMetrics = componentOptimizer.getMetrics(componentName);
    if (componentOptimizerMetrics.renderCount > 0) {
      const slowRenderRatio = componentOptimizerMetrics.slowRenderCount / componentOptimizerMetrics.renderCount;
      metrics.stabilityScore = Math.max(0, 100 - (slowRenderRatio * 100));
    }

    // Generate suggestions
    metrics.optimizationSuggestions = this.generateSuggestions(metrics);

    // Notify observers (throttled to next animation frame to avoid nested updates)
    this.scheduleNotify();
  }

  private generateSuggestions(metrics: RenderPerformanceMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.averageRenderTime > 16) {
      suggestions.push('Consider memoizing this component with React.memo');
    }

    if (metrics.longestRenderTime > 50) {
      suggestions.push('Break down this component into smaller sub-components');
    }

    if (metrics.renderCount > 50 && metrics.stabilityScore < 70) {
      suggestions.push('Check for unstable props or callback dependencies');
    }

    if (metrics.recentRenderTimes.some(time => time > 100)) {
      suggestions.push('Consider virtualizing content or lazy loading');
    }

    return suggestions;
  }

  private getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return { heapUsed: 0, heapTotal: 0, jsHeapSizeLimit: 0 };
  }

  getComponentMetrics(componentName: string): RenderPerformanceMetrics | null {
    return this.componentMetrics.get(componentName) || null;
  }

  getAllComponentMetrics(): RenderPerformanceMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  getSystemMetrics(): SystemPerformanceMetrics {
    const allMetrics = this.getAllComponentMetrics();
    const callbackMetrics = getCallbackStabilityMetrics();

    const totalComponents = allMetrics.length;
    const activeComponents = allMetrics.filter(m => m.renderCount > 0).length;
    const slowComponents = allMetrics.filter(m => m.averageRenderTime > 16).length;
    const unstableCallbacks = callbackMetrics.filter(m => m.stabilityScore < 70).length;

    const memoryUsage = this.getMemoryUsage();
    const memoryPressure = this.calculateMemoryPressure(memoryUsage);

    const overallScore = this.calculateOverallScore(allMetrics, callbackMetrics);
    const recommendations = this.generateSystemRecommendations(allMetrics, callbackMetrics);

    return {
      totalComponents,
      activeComponents,
      slowComponents,
      unstableCallbacks,
      memoryPressure,
      overallScore,
      recommendations
    };
  }

  private calculateMemoryPressure(memoryUsage: RenderPerformanceMetrics['memoryUsage']): 'low' | 'medium' | 'high' {
    if (memoryUsage.jsHeapSizeLimit === 0) return 'low';

    const usageRatio = memoryUsage.heapUsed / memoryUsage.jsHeapSizeLimit;

    if (usageRatio > 0.8) return 'high';
    if (usageRatio > 0.6) return 'medium';
    return 'low';
  }

  private calculateOverallScore(
    componentMetrics: RenderPerformanceMetrics[],
    callbackMetrics: ReturnType<typeof getCallbackStabilityMetrics>
  ): number {
    if (componentMetrics.length === 0) return 100;

    const avgComponentScore = componentMetrics.reduce((sum, m) => sum + m.stabilityScore, 0) / componentMetrics.length;
    const avgCallbackScore = callbackMetrics.length > 0
      ? callbackMetrics.reduce((sum, m) => sum + m.stabilityScore, 0) / callbackMetrics.length
      : 100;

    return Math.round((avgComponentScore + avgCallbackScore) / 2);
  }

  private generateSystemRecommendations(
    componentMetrics: RenderPerformanceMetrics[],
    callbackMetrics: ReturnType<typeof getCallbackStabilityMetrics>
  ): string[] {
    const recommendations: string[] = [];

    const slowComponents = componentMetrics.filter(m => m.averageRenderTime > 16);
    if (slowComponents.length > 0) {
      recommendations.push(`Optimize ${slowComponents.length} slow components: ${slowComponents.slice(0, 3).map(c => c.componentName).join(', ')}`);
    }

    const unstableCallbacks = callbackMetrics.filter(m => m.stabilityScore < 70);
    if (unstableCallbacks.length > 0) {
      recommendations.push(`Stabilize ${unstableCallbacks.length} unstable callbacks`);
    }

    const memoryUsage = this.getMemoryUsage();
    const memoryPressure = this.calculateMemoryPressure(memoryUsage);
    if (memoryPressure === 'high') {
      recommendations.push('High memory usage detected - consider implementing virtualization');
    }

    if (componentMetrics.some(m => m.renderCount > 100)) {
      recommendations.push('Some components are re-rendering frequently - check for prop stability');
    }

    return recommendations;
  }

  subscribe(observer: (metrics: SystemPerformanceMetrics) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(): void {
    const systemMetrics = this.getSystemMetrics();
    this.observers.forEach(observer => observer(systemMetrics));
  }

  private scheduleNotify(): void {
    if (this.notifyHandle != null) return;
    this.notifyHandle = requestAnimationFrame(() => {
      this.notifyHandle = null;
      this.notifyObservers();
    });
  }

  generatePerformanceReport(): string {
    const systemMetrics = this.getSystemMetrics();
    const componentMetrics = this.getAllComponentMetrics();
    const callbackMetrics = getCallbackStabilityMetrics();

    return `
=== React Performance Report ===

System Overview:
- Overall Score: ${systemMetrics.overallScore}/100
- Total Components: ${systemMetrics.totalComponents}
- Active Components: ${systemMetrics.activeComponents}
- Slow Components: ${systemMetrics.slowComponents}
- Unstable Callbacks: ${systemMetrics.unstableCallbacks}
- Memory Pressure: ${systemMetrics.memoryPressure}

Top Performance Issues:
${componentMetrics
  .filter(m => m.averageRenderTime > 16)
  .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
  .slice(0, 5)
  .map(m => `- ${m.componentName}: ${m.averageRenderTime.toFixed(2)}ms avg, ${m.renderCount} renders`)
  .join('\n')}

Callback Stability Issues:
${callbackMetrics
  .filter(m => m.stabilityScore < 70)
  .sort((a, b) => a.stabilityScore - b.stabilityScore)
  .slice(0, 5)
  .map(m => `- ${m.callbackName}: ${m.stabilityScore.toFixed(1)}% stable, ${m.referenceChanges} changes`)
  .join('\n')}

Recommendations:
${systemMetrics.recommendations.map(r => `- ${r}`).join('\n')}

Memory Usage:
- Heap Used: ${(systemMetrics.memoryPressure === 'low' ? 'Normal' : 'High')}
- Components with High Memory: ${componentMetrics.filter(m => m.memoryUsage.heapUsed > 50000000).length}
`;
  }

  reset(): void {
    this.componentMetrics.clear();
    this.systemStartTime = performance.now();
    this.notifyObservers();
  }
}

// React hook for using performance monitoring
export function usePerformanceMonitor(componentName: string): {
  metrics: RenderPerformanceMetrics | null;
  systemMetrics: SystemPerformanceMetrics;
} {
  const monitor = PerformanceMonitor.getInstance();
  const [metrics, setMetrics] = React.useState<RenderPerformanceMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = React.useState<SystemPerformanceMetrics>(() => monitor.getSystemMetrics());

  React.useEffect(() => {
    // Only wire monitoring in development to avoid unnecessary updates
    if (!import.meta.env.DEV) return;

    // Record an initial measurement for this component
    const startTime = performance.now();
    const endTime = performance.now();
    monitor.recordComponentRender(componentName, endTime - startTime);

    // Prime local state once on mount
    setMetrics(monitor.getComponentMetrics(componentName));

    // Subscribe to system updates once; unsub on unmount
    const unsubscribe = monitor.subscribe((m) => setSystemMetrics(m));
    return unsubscribe;
  }, [componentName]);

  return { metrics, systemMetrics };
}

// Development tools integration
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__REACT_PERFORMANCE_MONITOR__ = {
    getInstance: () => PerformanceMonitor.getInstance(),
    getReport: () => PerformanceMonitor.getInstance().generatePerformanceReport(),
    getMetrics: () => PerformanceMonitor.getInstance().getSystemMetrics(),
    reset: () => PerformanceMonitor.getInstance().reset()
  };
}

export const performanceMonitor = PerformanceMonitor.getInstance();

import React from 'react';
export default performanceMonitor;
