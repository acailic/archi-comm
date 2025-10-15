import { getCanvasPerformanceManager } from '@/lib/performance/CanvasPerformanceManager';
import { getRoutingPerformanceStats, type SmartRouteResult } from '@/packages/canvas/utils/smart-routing';

const STORAGE_KEY = 'archicomm_canvas_analytics';

export interface CanvasAnalyticsCounters {
  framesCreated: number;
  searchUsed: number;
  aiSuggestionsApplied: number;
  presentationsStarted: number;
}

interface RollingMetricState {
  total: number;
  samples: number;
  lastSample?: number;
}

interface CanvasAnalyticsPerformanceState {
  fps: RollingMetricState;
  routing: RollingMetricState;
}

interface CanvasAnalyticsState {
  counters: CanvasAnalyticsCounters;
  performance: CanvasAnalyticsPerformanceState;
  lastUpdated: number;
}

export interface CanvasPerformanceSummary {
  averageFPS: number;
  fpsSamples: number;
  lastFPS?: number;
  averageRoutingTimeMs: number;
  routingSamples: number;
  lastRoutingTimeMs?: number;
}

export interface CanvasAnalyticsSnapshot {
  counters: CanvasAnalyticsCounters;
  performance: CanvasPerformanceSummary;
  lastUpdated: number;
}

export interface CanvasPerformanceSample {
  fps?: number;
  routingTimeMs?: number;
}

const createInitialState = (): CanvasAnalyticsState => ({
  counters: {
    framesCreated: 0,
    searchUsed: 0,
    aiSuggestionsApplied: 0,
    presentationsStarted: 0,
  },
  performance: {
    fps: { total: 0, samples: 0 },
    routing: { total: 0, samples: 0 },
  },
  lastUpdated: Date.now(),
});

const sanitizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value !== 'number') return fallback;
  if (!Number.isFinite(value)) return fallback;
  return value;
};

const sanitizeRollingMetric = (value: any): RollingMetricState => ({
  total: Math.max(0, sanitizeNumber(value?.total)),
  samples: Math.max(0, Math.floor(sanitizeNumber(value?.samples))),
  lastSample:
    typeof value?.lastSample === 'number' && Number.isFinite(value.lastSample)
      ? value.lastSample
      : undefined,
});

const sanitizeState = (value: any): CanvasAnalyticsState => {
  if (!value || typeof value !== 'object') {
    return createInitialState();
  }

  const counters = value.counters ?? {};
  const performance = value.performance ?? {};

  return {
    counters: {
      framesCreated: Math.max(0, Math.floor(sanitizeNumber(counters.framesCreated))),
      searchUsed: Math.max(0, Math.floor(sanitizeNumber(counters.searchUsed))),
      aiSuggestionsApplied: Math.max(0, Math.floor(sanitizeNumber(counters.aiSuggestionsApplied))),
      presentationsStarted: Math.max(0, Math.floor(sanitizeNumber(counters.presentationsStarted))),
    },
    performance: {
      fps: sanitizeRollingMetric(performance.fps),
      routing: sanitizeRollingMetric(performance.routing),
    },
    lastUpdated: sanitizeNumber(value.lastUpdated, Date.now()),
  };
};

class CanvasAnalytics {
  private static instance: CanvasAnalytics;

  private state: CanvasAnalyticsState = this.loadState();

  private readonly listeners = new Set<(snapshot: CanvasAnalyticsSnapshot) => void>();

  static getInstance(): CanvasAnalytics {
    if (!CanvasAnalytics.instance) {
      CanvasAnalytics.instance = new CanvasAnalytics();
    }
    return CanvasAnalytics.instance;
  }

  recordFrameCreated(count = 1): void {
    const increment = Math.max(0, Math.floor(count));
    if (!increment) return;
    this.updateState((state) => ({
      ...state,
      counters: {
        ...state.counters,
        framesCreated: state.counters.framesCreated + increment,
      },
    }));
  }

  recordSearchUsed(): void {
    this.updateState((state) => ({
      ...state,
      counters: {
        ...state.counters,
        searchUsed: state.counters.searchUsed + 1,
      },
    }));
  }

  recordAiSuggestionApplied(): void {
    this.updateState((state) => ({
      ...state,
      counters: {
        ...state.counters,
        aiSuggestionsApplied: state.counters.aiSuggestionsApplied + 1,
      },
    }));
  }

  recordPresentationStarted(): void {
    this.updateState((state) => ({
      ...state,
      counters: {
        ...state.counters,
        presentationsStarted: state.counters.presentationsStarted + 1,
      },
    }));
  }

  recordPerformanceSample(sample: CanvasPerformanceSample): void {
    const { fps, routingTimeMs } = sample;
    let didUpdate = false;

    const nextState: CanvasAnalyticsState = {
      ...this.state,
      performance: { ...this.state.performance },
      counters: { ...this.state.counters },
      lastUpdated: this.state.lastUpdated,
    };

    if (typeof fps === 'number' && Number.isFinite(fps) && fps >= 0) {
      const sanitized = fps;
      const nextFps: RollingMetricState = {
        ...nextState.performance.fps,
        total: nextState.performance.fps.total + sanitized,
        samples: nextState.performance.fps.samples + 1,
        lastSample: sanitized,
      };
      nextState.performance = { ...nextState.performance, fps: nextFps };
      didUpdate = true;
    }

    if (typeof routingTimeMs === 'number' && Number.isFinite(routingTimeMs) && routingTimeMs >= 0) {
      const sanitized = routingTimeMs;
      const nextRouting: RollingMetricState = {
        ...nextState.performance.routing,
        total: nextState.performance.routing.total + sanitized,
        samples: nextState.performance.routing.samples + 1,
        lastSample: sanitized,
      };
      nextState.performance = { ...nextState.performance, routing: nextRouting };
      didUpdate = true;
    }

    if (!didUpdate) return;

    nextState.lastUpdated = Date.now();
    this.state = nextState;
    this.persistState();
    this.notify();
  }

  recordRoutingBatch(results: Map<string, SmartRouteResult>): void {
    if (!results || results.size === 0) return;
    const stats = getRoutingPerformanceStats(results);
    if (!Number.isFinite(stats.avgComputationTime) || stats.avgComputationTime < 0) {
      return;
    }
    this.recordPerformanceSample({ routingTimeMs: stats.avgComputationTime });
  }

  refreshFromPerformanceManager(): void {
    try {
      const manager = getCanvasPerformanceManager();
      const aggregated = manager.getAggregatedMetrics();
      if (aggregated && Number.isFinite(aggregated.averageFPS)) {
        this.recordPerformanceSample({ fps: aggregated.averageFPS });
      }
    } catch (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.debug('[canvas-analytics] performance manager unavailable', error);
      }
    }
  }

  reset(): void {
    this.state = createInitialState();
    this.persistState();
    this.notify();
  }

  getSnapshot(): CanvasAnalyticsSnapshot {
    const { counters, performance, lastUpdated } = this.state;
    const averageFPS = performance.fps.samples
      ? performance.fps.total / performance.fps.samples
      : 0;
    const averageRoutingTimeMs = performance.routing.samples
      ? performance.routing.total / performance.routing.samples
      : 0;

    return {
      counters: { ...counters },
      performance: {
        averageFPS,
        fpsSamples: performance.fps.samples,
        lastFPS: performance.fps.lastSample,
        averageRoutingTimeMs,
        routingSamples: performance.routing.samples,
        lastRoutingTimeMs: performance.routing.lastSample,
      },
      lastUpdated,
    };
  }

  subscribe(listener: (snapshot: CanvasAnalyticsSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(updater: (state: CanvasAnalyticsState) => CanvasAnalyticsState): void {
    this.state = {
      ...updater(this.state),
      lastUpdated: Date.now(),
    };
    this.persistState();
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[canvas-analytics] listener error', error);
      }
    });
  }

  private loadState(): CanvasAnalyticsState {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createInitialState();
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createInitialState();
      }
      return sanitizeState(JSON.parse(raw));
    } catch (error) {
      console.warn('[canvas-analytics] failed to load state', error);
      return createInitialState();
    }
  }

  private persistState(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[canvas-analytics] failed to persist state', error);
    }
  }
}

export const canvasAnalytics = CanvasAnalytics.getInstance();
