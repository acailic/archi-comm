const isDevBuild = import.meta.env.DEV;

export type RenderCommitType = 'mount' | 'update';

export interface RenderSample {
  componentId: string;
  duration: number;
  timestamp: number;
  commitType: RenderCommitType;
  propsChanged: string[];
}

export interface ComponentRenderMetrics {
  renderCount: number;
  mountCount: number;
  updateCount: number;
  averageDuration: number;
  longestDuration: number;
  lastDuration: number;
  lastRenderAt: number;
  slowRenderCount: number;
  changeHotspots: Record<string, number>;
  recentSamples: RenderSample[];
}

export interface OptimizationInsight {
  severity: 'info' | 'warn' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

function createInitialMetrics(): ComponentRenderMetrics {
  return {
    renderCount: 0,
    mountCount: 0,
    updateCount: 0,
    averageDuration: 0,
    longestDuration: 0,
    lastDuration: 0,
    lastRenderAt: 0,
    slowRenderCount: 0,
    changeHotspots: {},
    recentSamples: [],
  };
}

export class ComponentOptimizer {
  private static instance: ComponentOptimizer | null = null;
  private readonly metrics = new Map<string, ComponentRenderMetrics>();
  private readonly sampleLimit = 50;
  private readonly slowRenderThreshold = 18; // milliseconds (approx one frame at 55fps)

  static getInstance(): ComponentOptimizer {
    if (!ComponentOptimizer.instance) {
      ComponentOptimizer.instance = new ComponentOptimizer();
    }
    return ComponentOptimizer.instance;
  }

  recordSample(sample: RenderSample): void {
    if (!isDevBuild) {
      return;
    }

    const metrics = this.ensureMetrics(sample.componentId);
    metrics.renderCount += 1;
    metrics.lastDuration = sample.duration;
    metrics.lastRenderAt = sample.timestamp;
    metrics.longestDuration = Math.max(metrics.longestDuration, sample.duration);

    if (metrics.renderCount === 1) {
      metrics.averageDuration = sample.duration;
    } else {
      metrics.averageDuration =
        (metrics.averageDuration * (metrics.renderCount - 1) + sample.duration) / metrics.renderCount;
    }

    if (sample.commitType === 'mount') {
      metrics.mountCount += 1;
    } else {
      metrics.updateCount += 1;
    }

    if (sample.duration > this.slowRenderThreshold) {
      metrics.slowRenderCount += 1;
    }

    for (const prop of sample.propsChanged) {
      metrics.changeHotspots[prop] = (metrics.changeHotspots[prop] ?? 0) + 1;
    }

    metrics.recentSamples.unshift(sample);
    if (metrics.recentSamples.length > this.sampleLimit) {
      metrics.recentSamples.pop();
    }
  }

  getMetrics(componentId: string): ComponentRenderMetrics {
    const metrics = this.ensureMetrics(componentId);
    return {
      ...metrics,
      changeHotspots: { ...metrics.changeHotspots },
      recentSamples: metrics.recentSamples.slice(0, 10),
    };
  }

  getInsights(componentId: string): OptimizationInsight[] {
    if (!isDevBuild) {
      return [];
    }

    const metrics = this.ensureMetrics(componentId);
    if (metrics.renderCount === 0) {
      return [];
    }

    const insights: OptimizationInsight[] = [];

    if (metrics.averageDuration > this.slowRenderThreshold * 1.5) {
      insights.push({
        severity: 'critical',
        message: 'Rendering is consistently slow',
        details: {
          averageDuration: Number(metrics.averageDuration.toFixed(2)),
          longestDuration: Number(metrics.longestDuration.toFixed(2)),
        },
      });
    } else if (metrics.longestDuration > this.slowRenderThreshold * 2) {
      insights.push({
        severity: 'warn',
        message: 'Detected spikes in render duration',
        details: {
          longestDuration: Number(metrics.longestDuration.toFixed(2)),
          averageDuration: Number(metrics.averageDuration.toFixed(2)),
        },
      });
    }

    if (metrics.updateCount > metrics.mountCount * 5 && metrics.renderCount > 15) {
      insights.push({
        severity: 'warn',
        message: 'Component updates frequently after mount',
        details: {
          updateCount: metrics.updateCount,
          renderCount: metrics.renderCount,
        },
      });
    }

    if (metrics.slowRenderCount > Math.max(5, metrics.renderCount * 0.2)) {
      insights.push({
        severity: 'warn',
        message: 'Frequent slow renders detected',
        details: {
          slowRenderCount: metrics.slowRenderCount,
          renderCount: metrics.renderCount,
        },
      });
    }

    const hotspotEntries = Object.entries(metrics.changeHotspots)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (hotspotEntries.length > 0) {
      insights.push({
        severity: 'info',
        message: 'Frequently changing inputs identified',
        details: Object.fromEntries(hotspotEntries),
      });
    }

    return insights;
  }

  reset(componentId?: string): void {
    if (componentId) {
      this.metrics.delete(componentId);
      return;
    }
    this.metrics.clear();
  }

  private ensureMetrics(componentId: string): ComponentRenderMetrics {
    let metrics = this.metrics.get(componentId);
    if (!metrics) {
      metrics = createInitialMetrics();
      this.metrics.set(componentId, metrics);
    }
    return metrics;
  }
}

export const componentOptimizer = ComponentOptimizer.getInstance();
