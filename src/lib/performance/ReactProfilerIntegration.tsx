/**
 * React Profiler Integration for systematic performance measurement
 * Connects with existing ComponentOptimizer and performance monitoring infrastructure
 */

import { ComponentOptimizer, RenderSample, RenderCommitType } from './ComponentOptimizer';
import { performanceMonitor } from '@/shared/utils/performanceMonitor';
import type { ProfilerOnRenderCallback } from 'react';

export interface ProfilerMetrics {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

export interface ComponentProfileConfig {
  id: string;
  onRender?: (metrics: ProfilerMetrics) => void;
  trackingEnabled?: boolean;
  slowRenderThreshold?: number;
  logSlowRenders?: boolean;
}

class ReactProfilerIntegration {
  private static instance: ReactProfilerIntegration | null = null;
  private componentOptimizer = ComponentOptimizer.getInstance();
  private activeProfilers = new Map<string, ComponentProfileConfig>();
  private measurementHistory = new Map<string, ProfilerMetrics[]>();
  private readonly maxHistorySize = 100;
  private previousProps = new Map<string, Record<string, unknown>>();
  private pendingPropChanges = new Map<string, string[]>();

  static getInstance(): ReactProfilerIntegration {
    if (!ReactProfilerIntegration.instance) {
      ReactProfilerIntegration.instance = new ReactProfilerIntegration();
    }
    return ReactProfilerIntegration.instance;
  }

  /**
   * Creates a React Profiler onRender callback for a component
   */
  createProfilerCallback(config: ComponentProfileConfig): ProfilerOnRenderCallback {
    this.activeProfilers.set(config.id, config);

    // React 18+ ProfilerOnRenderCallback has 6 parameters (no interactions)
    return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      if (!config.trackingEnabled && !import.meta.env.DEV) {
        return;
      }

      const metrics: ProfilerMetrics = {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions: new Set(),
      };

      // Record in measurement history
      this.recordMeasurement(id, metrics);

      // Convert to ComponentOptimizer format
      const sample: RenderSample = {
        componentId: id,
        duration: actualDuration,
        timestamp: commitTime,
        commitType: phase as RenderCommitType,
        propsChanged: import.meta.env.DEV ? this.consumePropChanges(id) : [],
      };

      // Record with ComponentOptimizer
      this.componentOptimizer.recordSample(sample);

      // Record with performance monitor
      performanceMonitor.recordComponentRender(id, actualDuration);

      if (phase === 'unmount') {
        this.previousProps.delete(id);
        this.pendingPropChanges.delete(id);
      }

      // Handle slow renders
      const threshold = config.slowRenderThreshold || 16;
      if (actualDuration > threshold) {
        this.handleSlowRender(id, metrics, config);
      }

      // Call custom onRender callback if provided
      if (config.onRender) {
        config.onRender(metrics);
      }
    };
  }

  private consumePropChanges(componentId: string): string[] {
    if (!import.meta.env.DEV) {
      return [];
    }
    const changes = this.pendingPropChanges.get(componentId) ?? [];
    this.pendingPropChanges.delete(componentId);
    return changes;
  }

  private recordPropsSnapshot(componentId: string, props: Record<string, unknown>): void {
    if (!import.meta.env.DEV) {
      return;
    }

    const previous = this.previousProps.get(componentId);
    const next = props;
    const changedKeys: string[] = [];
    const keys = new Set([
      ...(previous ? Object.keys(previous) : []),
      ...Object.keys(next),
    ]);

    keys.forEach(key => {
      if ((previous ?? {})[key] !== next[key]) {
        changedKeys.push(key);
      }
    });

    this.previousProps.set(componentId, next);
    this.pendingPropChanges.set(componentId, changedKeys);
  }

  /**
   * Wraps a component with performance tracking
   */
  wrapWithProfiler<T extends React.ComponentType<any>>(
    Component: T,
    config: Omit<ComponentProfileConfig, 'id'> & { id?: string }
  ): React.ComponentType<React.ComponentProps<T>> {
    const componentId = config.id || Component.displayName || Component.name || 'UnknownComponent';
    const profilerConfig: ComponentProfileConfig = {
      ...config,
      id: componentId,
      trackingEnabled: config.trackingEnabled ?? import.meta.env.DEV,
    };

    const onRender = this.createProfilerCallback(profilerConfig);
    const integration = this;

    const Wrapped = React.memo(
      React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
        if (import.meta.env.DEV) {
          integration.recordPropsSnapshot(componentId, props as Record<string, unknown>);
        }

        return (
          <React.Profiler id={componentId} onRender={onRender}>
            {React.createElement(Component as React.ComponentType<any>, { ...(props as any), ref })}
          </React.Profiler>
        );
      })
    );

    return Wrapped as unknown as React.ComponentType<React.ComponentProps<T>>;
  }

  /**
   * Higher-order component for adding profiling to hot leaf components
   */
  withHotLeafProfiling<T extends React.ComponentType<any>>(
    Component: T,
    componentName?: string
  ): React.ComponentType<React.ComponentProps<T>> {
    return this.wrapWithProfiler(Component, {
      id: componentName || Component.displayName || Component.name || 'HotLeafComponent',
      trackingEnabled: true,
      slowRenderThreshold: 8, // Lower threshold for leaf components
      logSlowRenders: true,
    });
  }

  /**
   * Higher-order component for canvas components with specific optimizations
   */
  withCanvasProfiling<T extends React.ComponentType<any>>(
    Component: T,
    componentName?: string
  ): React.ComponentType<React.ComponentProps<T>> {
    return this.wrapWithProfiler(Component, {
      id: componentName || Component.displayName || Component.name || 'CanvasComponent',
      trackingEnabled: true,
      slowRenderThreshold: 16,
      logSlowRenders: true,
      onRender: (metrics) => {
        // Canvas-specific performance tracking
        if (metrics.actualDuration > 32) {
          console.warn(`🐌 Slow canvas render detected: ${metrics.id} took ${metrics.actualDuration.toFixed(2)}ms`);
        }
      },
    });
  }

  /**
   * Gets performance metrics for a specific component
   */
  getComponentMetrics(componentId: string): ProfilerMetrics[] {
    return this.measurementHistory.get(componentId) || [];
  }

  /**
   * Gets aggregated metrics for all tracked components
   */
  getAllMetrics(): Record<string, ProfilerMetrics[]> {
    const result: Record<string, ProfilerMetrics[]> = {};
    this.measurementHistory.forEach((metrics, componentId) => {
      result[componentId] = metrics.slice(-10); // Last 10 measurements
    });
    return result;
  }

  /**
   * Gets performance summary for dashboard
   */
  getPerformanceSummary(): {
    totalComponents: number;
    slowComponents: string[];
    averageRenderTime: number;
    recommendations: string[];
  } {
    const allMetrics = this.getAllMetrics();
    const componentIds = Object.keys(allMetrics);
    const slowComponents: string[] = [];
    let totalRenderTime = 0;
    let totalRenders = 0;

    componentIds.forEach(componentId => {
      const metrics = allMetrics[componentId];
      const recentMetrics = metrics.slice(-5);
      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.actualDuration, 0) / recentMetrics.length;

      totalRenderTime += recentMetrics.reduce((sum, m) => sum + m.actualDuration, 0);
      totalRenders += recentMetrics.length;

      if (avgDuration > 16) {
        slowComponents.push(componentId);
      }
    });

    const averageRenderTime = totalRenders > 0 ? totalRenderTime / totalRenders : 0;
    const recommendations = this.generateRecommendations(allMetrics, slowComponents);

    return {
      totalComponents: componentIds.length,
      slowComponents,
      averageRenderTime,
      recommendations,
    };
  }

  /**
   * Enables/disables tracking for specific component
   */
  setComponentTracking(componentId: string, enabled: boolean): void {
    const config = this.activeProfilers.get(componentId);
    if (config) {
      config.trackingEnabled = enabled;
    }
  }

  /**
   * Enables batch measurement mode for performance testing
   */
  startBatchMeasurement(): () => Promise<Record<string, ProfilerMetrics[]>> {
    // Clear existing measurements
    this.measurementHistory.clear();

    // Enable tracking for all registered components
    this.activeProfilers.forEach(config => {
      config.trackingEnabled = true;
    });

    return async () => {
      // Wait for any pending renders
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Return collected measurements
      const results = this.getAllMetrics();

      // Reset tracking state
      this.activeProfilers.forEach(config => {
        config.trackingEnabled = import.meta.env.DEV;
      });

      return results;
    };
  }

  /**
   * Exports performance data for analysis
   */
  exportPerformanceData(): string {
    const summary = this.getPerformanceSummary();
    const allMetrics = this.getAllMetrics();

    const exportData = {
      timestamp: new Date().toISOString(),
      summary,
      componentMetrics: allMetrics,
      systemInfo: {
        userAgent: navigator.userAgent,
        memory: (performance as any).memory,
        timing: performance.timing,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  private recordMeasurement(componentId: string, metrics: ProfilerMetrics): void {
    if (!this.measurementHistory.has(componentId)) {
      this.measurementHistory.set(componentId, []);
    }

    const history = this.measurementHistory.get(componentId)!;
    history.push(metrics);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private handleSlowRender(componentId: string, metrics: ProfilerMetrics, config: ComponentProfileConfig): void {
    if (config.logSlowRenders) {
      console.warn(`🐌 Slow render detected in ${componentId}: ${metrics.actualDuration.toFixed(2)}ms (${metrics.phase})`);
    }

    // Integrate with existing performance monitoring
    const insights = this.componentOptimizer.getInsights(componentId);
    if (insights.length > 0) {
      console.groupCollapsed(`💡 Performance insights for ${componentId}`);
      insights.forEach(insight => {
        console.log(`${insight.severity.toUpperCase()}: ${insight.message}`, insight.details);
      });
      console.groupEnd();
    }
  }

  private generateRecommendations(
    allMetrics: Record<string, ProfilerMetrics[]>,
    slowComponents: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (slowComponents.length > 0) {
      recommendations.push(`Optimize ${slowComponents.length} slow components: ${slowComponents.slice(0, 3).join(', ')}`);
    }

    const componentsWithFrequentUpdates = Object.entries(allMetrics)
      .filter(([, metrics]) => {
        const updateCount = metrics.filter(m => m.phase === 'update').length;
        const mountCount = metrics.filter(m => m.phase === 'mount').length;
        return updateCount > mountCount * 3 && metrics.length > 10;
      })
      .map(([componentId]) => componentId);

    if (componentsWithFrequentUpdates.length > 0) {
      recommendations.push(`Check prop stability for frequently updating components: ${componentsWithFrequentUpdates.slice(0, 3).join(', ')}`);
    }

    const memoryUsage = (performance as any).memory;
    if (memoryUsage && memoryUsage.usedJSHeapSize > memoryUsage.jsHeapSizeLimit * 0.8) {
      recommendations.push('High memory usage detected - consider implementing virtualization');
    }

    return recommendations;
  }

  /**
   * Clears all measurement data
   */
  reset(): void {
    this.measurementHistory.clear();
    this.componentOptimizer.reset();
  }
}

// Convenience exports for common patterns
export const reactProfilerIntegration = ReactProfilerIntegration.getInstance();

// React import for JSX
import React from 'react';

// Development tools integration
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__REACT_PROFILER_INTEGRATION__ = {
    getInstance: () => ReactProfilerIntegration.getInstance(),
    getSummary: () => ReactProfilerIntegration.getInstance().getPerformanceSummary(),
    exportData: () => ReactProfilerIntegration.getInstance().exportPerformanceData(),
    startBatch: () => ReactProfilerIntegration.getInstance().startBatchMeasurement(),
    reset: () => ReactProfilerIntegration.getInstance().reset(),
  };
}

export default ReactProfilerIntegration;
