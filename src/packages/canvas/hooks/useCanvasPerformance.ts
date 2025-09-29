import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getCanvasPerformanceManager,
  type CanvasSystemMetrics,
  type PerformanceEventListener,
  type PerformanceExport,
  type PerformanceRecommendation,
} from '@/lib/performance/CanvasPerformanceManager';
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor';
import {
  ComponentOptimizer,
  type ComponentRenderMetrics,
} from '@/lib/performance/ComponentOptimizer';
import {
  profilerOrchestrator,
  type OptimizationRecommendation,
} from '@/lib/performance/ProfilerOrchestrator';

type QualityMode = 'quality' | 'balanced' | 'performance';

type InteractionType = 'click' | 'drag' | 'zoom' | 'pan' | 'selection' | 'contextmenu';

interface InternalInteractionMetric {
  count: number;
  totalDuration: number;
  lastDuration: number;
}

interface InteractionMetrics {
  count: number;
  totalDuration: number;
  lastDuration: number;
  averageDuration: number;
}

interface InteractionSnapshot {
  [key: string]: InteractionMetrics;
}

interface CanvasPerformanceBudgets {
  render: number;
  interaction: number;
  frameRate: number;
  viewport: number;
  memory: number;
}

type WarningType = 'render' | 'interaction' | 'frameRate' | 'viewport' | 'memory';
type WarningSeverity = 'warning' | 'critical';

interface PerformanceWarning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  metric: number;
  budget: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}

interface CanvasPerformanceMetrics {
  renderCount: number;
  averageRenderDuration: number;
  lastRenderDuration: number;
  fps: number;
  nodeUpdateCount: number;
  edgeUpdateCount: number;
  averageInteractionLatency: number;
  lastInteractionLatency: number;
  viewportChangeFrequency: number;
  memoryUsage: number;
  qualityMode: QualityMode;
  qualityLevel: number;
  timestamp: number;
}

interface ComponentBottleneck {
  componentId: string;
  metric: ComponentRenderMetrics;
  severity: WarningSeverity | 'info';
  message: string;
  hotspotProps: string[];
}

interface PerformanceOffenders {
  critical: string[];
  slow: string[];
  frequentUpdaters: string[];
  memoryHeavy: string[];
}

interface CanvasPerformanceSummary {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  fps: number;
  averageRenderDuration: number;
  averageInteractionLatency: number;
  qualityMode: QualityMode;
  qualityLevel: number;
}

interface CanvasPerformanceSnapshot {
  timestamp: number;
  metrics: CanvasPerformanceMetrics;
  interactions: Record<InteractionType, InteractionMetrics>;
  systemMetrics?: CanvasSystemMetrics;
  bottlenecks: ComponentBottleneck[];
  offenders: PerformanceOffenders;
  summary: CanvasPerformanceSummary;
}

interface CanvasPerformanceReport {
  snapshot: CanvasPerformanceSnapshot;
  managerReport: PerformanceExport;
}

interface CanvasPerformanceRecommendation extends PerformanceRecommendation {
  id: string;
  source: 'hook' | 'manager' | 'profiler' | 'optimizer';
}

interface UseCanvasPerformanceOptions {
  canvasId: string;
  monitoringEnabled?: boolean;
  budgets?: Partial<CanvasPerformanceBudgets>;
  sampleRate?: number;
  trackedComponents?: string[];
  adaptiveQuality?: boolean;
  onWarning?: (warning: PerformanceWarning) => void;
  onMetrics?: (snapshot: CanvasPerformanceSnapshot) => void;
  onRecommendation?: (recommendation: CanvasPerformanceRecommendation) => void;
  devMode?: boolean;
}

interface UseCanvasPerformanceResult {
  metrics: CanvasPerformanceMetrics;
  interactions: Record<InteractionType, InteractionMetrics>;
  warnings: PerformanceWarning[];
  recommendations: CanvasPerformanceRecommendation[];
  summary: CanvasPerformanceSummary;
  bottlenecks: ComponentBottleneck[];
  offenders: PerformanceOffenders;
  qualityMode: QualityMode;
  recordRender: (duration: number) => void;
  recordInteraction: (type: InteractionType, duration: number) => void;
  recordNodeUpdate: (count?: number) => void;
  recordEdgeUpdate: (count?: number) => void;
  recordViewportChange: () => void;
  exportPerformanceReport: () => CanvasPerformanceReport | null;
  reset: () => void;
}

const DEFAULT_BUDGETS: CanvasPerformanceBudgets = Object.freeze({
  render: 16,
  interaction: 100,
  frameRate: 58,
  viewport: 24,
  memory: 256,
});

const INTERACTION_TYPES: InteractionType[] = [
  'click',
  'drag',
  'zoom',
  'pan',
  'selection',
  'contextmenu',
];

const createInternalInteractions = (): Record<InteractionType, InternalInteractionMetric> =>
  INTERACTION_TYPES.reduce(
    (acc, type) => {
      acc[type] = { count: 0, totalDuration: 0, lastDuration: 0 };
      return acc;
    },
    {} as Record<InteractionType, InternalInteractionMetric>,
  );

const toPublicInteractions = (
  internal: Record<InteractionType, InternalInteractionMetric>,
): Record<InteractionType, InteractionMetrics> =>
  INTERACTION_TYPES.reduce(
    (acc, type) => {
      const data = internal[type];
      const average = data.count > 0 ? data.totalDuration / data.count : 0;
      acc[type] = {
        count: data.count,
        totalDuration: data.totalDuration,
        lastDuration: data.lastDuration,
        averageDuration: average,
      };
      return acc;
    },
    {} as Record<InteractionType, InteractionMetrics>,
  );

const createInitialSnapshot = (qualityMode: QualityMode, qualityLevel: number): CanvasPerformanceSnapshot => {
  const interactions = toPublicInteractions(createInternalInteractions());
  return {
    timestamp: Date.now(),
    metrics: {
      renderCount: 0,
      averageRenderDuration: 0,
      lastRenderDuration: 0,
      fps: 60,
      nodeUpdateCount: 0,
      edgeUpdateCount: 0,
      averageInteractionLatency: 0,
      lastInteractionLatency: 0,
      viewportChangeFrequency: 0,
      memoryUsage: 0,
      qualityMode,
      qualityLevel,
      timestamp: Date.now(),
    },
    interactions,
    systemMetrics: undefined,
    bottlenecks: [],
    offenders: { critical: [], slow: [], frequentUpdaters: [], memoryHeavy: [] },
    summary: {
      status: 'healthy',
      issues: [],
      recommendations: [],
      fps: 60,
      averageRenderDuration: 0,
      averageInteractionLatency: 0,
      qualityMode,
      qualityLevel,
    },
  };
};

interface InternalMetrics {
  renderCount: number;
  renderDurationTotal: number;
  lastRenderDuration: number;
  interactionCount: number;
  interactionDurationTotal: number;
  lastInteractionDuration: number;
  nodeUpdates: number;
  edgeUpdates: number;
  viewportChanges: number;
  startTimestamp: number;
  interactions: Record<InteractionType, InternalInteractionMetric>;
}

const createInternalMetrics = (): InternalMetrics => ({
  renderCount: 0,
  renderDurationTotal: 0,
  lastRenderDuration: 0,
  interactionCount: 0,
  interactionDurationTotal: 0,
  lastInteractionDuration: 0,
  nodeUpdates: 0,
  edgeUpdates: 0,
  viewportChanges: 0,
  startTimestamp: Date.now(),
  interactions: createInternalInteractions(),
});

const dedupeRecommendations = (
  recommendations: CanvasPerformanceRecommendation[],
): CanvasPerformanceRecommendation[] => {
  const seen = new Set<string>();
  const result: CanvasPerformanceRecommendation[] = [];
  for (const recommendation of recommendations) {
    const key = `${recommendation.source}|${recommendation.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(recommendation);
  }
  return result;
};

export const useCanvasPerformance = ({
  canvasId,
  monitoringEnabled,
  budgets: customBudgets,
  sampleRate: rawSampleRate,
  trackedComponents,
  adaptiveQuality = true,
  onWarning,
  onMetrics,
  onRecommendation,
  devMode,
}: UseCanvasPerformanceOptions): UseCanvasPerformanceResult => {
  const isBrowser = typeof window !== 'undefined';
  const resolvedDevMode = devMode ?? (typeof import.meta !== 'undefined' ? Boolean(import.meta.env?.DEV) : false);
  const resolvedMonitoring = Boolean(
    isBrowser && (monitoringEnabled ?? resolvedDevMode ?? false),
  );
  const manager = useMemo(
    () => (resolvedMonitoring ? getCanvasPerformanceManager() : undefined),
    [resolvedMonitoring],
  );
  const performanceMonitor = useMemo(
    () => (resolvedMonitoring ? PerformanceMonitor.getInstance() : undefined),
    [resolvedMonitoring],
  );
  const componentOptimizer = useMemo(
    () => (resolvedMonitoring ? ComponentOptimizer.getInstance() : undefined),
    [resolvedMonitoring],
  );

  const budgets = useMemo(
    () => ({
      ...DEFAULT_BUDGETS,
      ...(customBudgets ?? {}),
    }),
    [customBudgets],
  );

  const sampleRate = useMemo(() => Math.max(200, rawSampleRate ?? 1000), [rawSampleRate]);

  const qualityModeRef = useRef<QualityMode>('balanced');
  const [qualityModeState, setQualityModeState] = useState<QualityMode>('balanced');
  const [snapshot, setSnapshot] = useState<CanvasPerformanceSnapshot>(() =>
    createInitialSnapshot(qualityModeRef.current, manager?.getCurrentQualityLevel?.() ?? 1),
  );
  const snapshotRef = useRef<CanvasPerformanceSnapshot>(snapshot);
  const [warnings, setWarnings] = useState<PerformanceWarning[]>([]);
  const warningsRef = useRef<PerformanceWarning[]>([]);
  const [recommendations, setRecommendations] = useState<CanvasPerformanceRecommendation[]>([]);
  const recommendationsRef = useRef<CanvasPerformanceRecommendation[]>([]);
  const metricsRef = useRef<InternalMetrics>(createInternalMetrics());
  const monitoringEnabledRef = useRef<boolean>(resolvedMonitoring);
  const budgetsRef = useRef<CanvasPerformanceBudgets>(budgets);
  const sampleRateRef = useRef<number>(sampleRate);
  const degradeCounterRef = useRef<number>(0);
  const improveCounterRef = useRef<number>(0);
  const flushTimeoutRef = useRef<number | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const lastDevLogRef = useRef<number>(0);

  monitoringEnabledRef.current = resolvedMonitoring;
  budgetsRef.current = budgets;
  sampleRateRef.current = sampleRate;

  const pushWarning = useCallback(
    (warning: PerformanceWarning) => {
      if (!monitoringEnabledRef.current) {
        return;
      }
      const next = [...warningsRef.current];
      const existingIndex = next.findIndex(entry => entry.type === warning.type);
      if (existingIndex >= 0) {
        next[existingIndex] = warning;
      } else {
        next.push(warning);
      }
      if (next.length > 12) {
        next.shift();
      }
      warningsRef.current = next;
      setWarnings(next);
      onWarning?.(warning);
    },
    [onWarning],
  );

  const checkRenderBudget = useCallback(
    (duration: number) => {
      const limit = budgetsRef.current.render;
      if (!limit || duration <= limit) {
        return;
      }
      const severity: WarningSeverity = duration > limit * 1.5 ? 'critical' : 'warning';
      pushWarning({
        id: `render-${Date.now()}`,
        type: 'render',
        severity,
        message: `Render duration ${duration.toFixed(2)}ms exceeded budget ${limit}ms`,
        metric: Number(duration.toFixed(2)),
        budget: limit,
        timestamp: Date.now(),
        meta: { duration },
      });
    },
    [pushWarning],
  );

  const checkInteractionBudget = useCallback(
    (duration: number, type: InteractionType) => {
      const limit = budgetsRef.current.interaction;
      if (!limit || duration <= limit) {
        return;
      }
      const severity: WarningSeverity = duration > limit * 1.5 ? 'critical' : 'warning';
      pushWarning({
        id: `interaction-${type}-${Date.now()}`,
        type: 'interaction',
        severity,
        message: `${type} interaction latency ${duration.toFixed(1)}ms exceeded budget ${limit}ms`,
        metric: Number(duration.toFixed(2)),
        budget: limit,
        timestamp: Date.now(),
        meta: { interactionType: type },
      });
    },
    [pushWarning],
  );

  const checkFrameRateBudget = useCallback(
    (fps: number) => {
      const limit = budgetsRef.current.frameRate;
      if (!limit || fps >= limit) {
        return;
      }
      const severity: WarningSeverity = fps < limit * 0.75 ? 'critical' : 'warning';
      pushWarning({
        id: `fps-${Date.now()}`,
        type: 'frameRate',
        severity,
        message: `Frame rate ${fps.toFixed(1)}fps below threshold ${limit}fps`,
        metric: Number(fps.toFixed(2)),
        budget: limit,
        timestamp: Date.now(),
        meta: { fps },
      });
    },
    [pushWarning],
  );

  const checkViewportBudget = useCallback(
    (frequency: number) => {
      const limit = budgetsRef.current.viewport;
      if (!limit || frequency <= limit) {
        return;
      }
      const severity: WarningSeverity = frequency > limit * 1.5 ? 'critical' : 'warning';
      pushWarning({
        id: `viewport-${Date.now()}`,
        type: 'viewport',
        severity,
        message: `Viewport updates firing at ${frequency.toFixed(1)}Hz (budget ${limit}Hz)`,
        metric: Number(frequency.toFixed(2)),
        budget: limit,
        timestamp: Date.now(),
        meta: { frequency },
      });
    },
    [pushWarning],
  );

  const checkMemoryBudget = useCallback(
    (memoryUsage: number) => {
      const limit = budgetsRef.current.memory;
      if (!limit || memoryUsage <= limit) {
        return;
      }
      const severity: WarningSeverity = memoryUsage > limit * 1.2 ? 'critical' : 'warning';
      pushWarning({
        id: `memory-${Date.now()}`,
        type: 'memory',
        severity,
        message: `Memory usage ${memoryUsage.toFixed(1)}MB exceeds budget ${limit}MB`,
        metric: Number(memoryUsage.toFixed(2)),
        budget: limit,
        timestamp: Date.now(),
        meta: { memoryUsage },
      });
    },
    [pushWarning],
  );

  const clearScheduledPublish = useCallback(() => {
    if (!isBrowser) {
      return;
    }
    if (idleCallbackRef.current !== null && 'cancelIdleCallback' in window) {
      (window as unknown as { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(
        idleCallbackRef.current,
      );
      idleCallbackRef.current = null;
    }
    if (flushTimeoutRef.current !== null) {
      window.clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, [isBrowser]);

  const schedulePublish = useCallback(
    (delay = 0) => {
      if (!isBrowser || !monitoringEnabledRef.current) {
        return;
      }
      if (idleCallbackRef.current !== null || flushTimeoutRef.current !== null) {
        return;
      }
      const publish = () => {
        idleCallbackRef.current = null;
        flushTimeoutRef.current = null;
        publishMetrics();
      };
      const idleScheduler = (globalThis as unknown as {
        requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      }).requestIdleCallback;
      if (idleScheduler && delay === 0) {
        idleCallbackRef.current = idleScheduler(publish, { timeout: sampleRateRef.current });
        return;
      }
      flushTimeoutRef.current = window.setTimeout(publish, delay || Math.min(200, sampleRateRef.current));
    },
    [isBrowser],
  );

  const analyzeComponents = useCallback(
    (metrics: CanvasPerformanceMetrics): ComponentBottleneck[] => {
      if (!componentOptimizer || !trackedComponents || trackedComponents.length === 0) {
        return [];
      }
      const results: ComponentBottleneck[] = [];
      for (const componentId of trackedComponents) {
        try {
          const componentMetrics = componentOptimizer.getMetrics(componentId);
          if (componentMetrics.renderCount === 0) {
            continue;
          }
          const average = componentMetrics.averageDuration;
          const severity =
            average > budgets.render * 1.3
              ? 'critical'
              : average > budgets.render
              ? 'warning'
              : 'info';
          if (severity === 'info' && componentMetrics.slowRenderCount === 0) {
            continue;
          }
          const issues: string[] = [];
          if (average > budgets.render) {
            issues.push(`average render ${average.toFixed(2)}ms`);
          }
          if (componentMetrics.slowRenderCount > 0) {
            issues.push(`${componentMetrics.slowRenderCount} slow renders`);
          }
          if (componentMetrics.updateCount > componentMetrics.mountCount * 5) {
            issues.push('frequent updates');
          }
          const hotspotProps = Object.entries(componentMetrics.changeHotspots)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([prop]) => prop);
          results.push({
            componentId,
            metric: componentMetrics,
            severity,
            message: `${componentId}: ${issues.join(', ')}`,
            hotspotProps,
          });
        } catch (error) {
          if (resolvedDevMode) {
            console.warn(`Component performance metrics unavailable for ${componentId}`, error);
          }
        }
      }
      return results;
    },
    [budgets.render, componentOptimizer, trackedComponents, resolvedDevMode],
  );

  const generateHookRecommendations = useCallback(
    (
      metrics: CanvasPerformanceMetrics,
      bottlenecks: ComponentBottleneck[],
      offenders: PerformanceOffenders,
      managerRecommendations: PerformanceRecommendation[],
      profilerRecommendations: OptimizationRecommendation[],
    ): CanvasPerformanceRecommendation[] => {
      const recs: CanvasPerformanceRecommendation[] = [];
      for (const recommendation of managerRecommendations) {
        recs.push({
          ...recommendation,
          id: `manager-${recommendation.message}-${recommendation.type}`,
          source: 'manager',
        });
      }
      if (metrics.fps < budgets.frameRate) {
        recs.push({
          id: `hook-fps-${Date.now()}`,
          type: 'warning',
          message: 'Frame rate is below target. Enable virtualization or reduce visual effects.',
          action: 'Enable virtualization and reduce node detail',
          impact: 'medium',
          source: 'hook',
        });
      }
      if (metrics.averageRenderDuration > budgets.render) {
        recs.push({
          id: `hook-render-${Date.now()}`,
          type: 'suggestion',
          message: 'Render duration exceeds budget. Memoize heavy nodes and batch updates.',
          action: 'Memoize node components and batch state updates',
          impact: 'medium',
          source: 'hook',
        });
      }
      if (metrics.averageInteractionLatency > budgets.interaction) {
        recs.push({
          id: `hook-interaction-${Date.now()}`,
          type: 'suggestion',
          message: 'Interaction latency is high. Consider throttling drag or zoom handlers.',
          action: 'Throttle interaction handlers and reduce expensive callbacks',
          impact: 'low',
          source: 'hook',
        });
      }
      if (metrics.memoryUsage > budgets.memory * 0.9) {
        recs.push({
          id: `hook-memory-${Date.now()}`,
          type: 'critical',
          message: 'Memory usage near limit. Enable virtualization and clear caches.',
          action: 'Enable virtualization and clear transient caches',
          impact: 'high',
          source: 'hook',
        });
      }
      for (const bottleneck of bottlenecks) {
        if (bottleneck.severity === 'info') {
          continue;
        }
        recs.push({
          id: `optimizer-${bottleneck.componentId}-${Date.now()}`,
          type: bottleneck.severity === 'critical' ? 'critical' : 'warning',
          message: `Component ${bottleneck.componentId} is a bottleneck (${bottleneck.message})`,
          action: 'Review component props and apply memoization',
          impact: bottleneck.severity === 'critical' ? 'high' : 'medium',
          source: 'optimizer',
        });
      }
      if (offenders.critical.length > 0) {
        recs.push({
          id: `profiler-critical-${Date.now()}`,
          type: 'critical',
          message: `Critical offenders detected: ${offenders.critical.join(', ')}`,
          action: 'Profile components and split heavy contexts',
          impact: 'high',
          source: 'profiler',
        });
      }
      for (const recommendation of profilerRecommendations) {
        recs.push({
          id: `profiler-${recommendation.type}-${Date.now()}`,
          type:
            recommendation.priority === 'critical'
              ? 'critical'
              : recommendation.priority === 'high'
              ? 'warning'
              : 'suggestion',
          message: recommendation.message,
          action: recommendation.type,
          impact: recommendation.estimatedImpact,
          source: 'profiler',
        });
      }
      return dedupeRecommendations(recs);
    },
    [budgets.frameRate, budgets.interaction, budgets.memory, budgets.render],
  );

  const evaluateQuality = useCallback(
    (fps: number, renderDuration: number, memoryUsage: number) => {
      if (!adaptiveQuality || !manager) {
        return;
      }
      const renderLimit = budgets.render;
      const fpsLimit = budgets.frameRate;
      const memoryLimit = budgets.memory;
      const degrade =
        fps < fpsLimit * 0.85 ||
        renderDuration > renderLimit * 1.3 ||
        memoryUsage > memoryLimit * 0.95;
      const improve =
        fps > fpsLimit * 1.05 &&
        renderDuration < renderLimit * 0.9 &&
        memoryUsage < memoryLimit * 0.7;
      if (degrade) {
        degradeCounterRef.current += 1;
        improveCounterRef.current = 0;
      } else if (improve) {
        improveCounterRef.current += 1;
        degradeCounterRef.current = 0;
      } else {
        degradeCounterRef.current = 0;
        improveCounterRef.current = 0;
        return;
      }
      const applyQualityMode = (mode: QualityMode) => {
        if (qualityModeRef.current === mode) {
          return;
        }
        qualityModeRef.current = mode;
        setQualityModeState(mode);
        manager.updateConfig({ mode });
      };
      if (degrade && degradeCounterRef.current >= 3) {
        degradeCounterRef.current = 0;
        if (qualityModeRef.current === 'quality') {
          applyQualityMode('balanced');
        } else {
          applyQualityMode('performance');
        }
      }
      if (improve && improveCounterRef.current >= 4) {
        improveCounterRef.current = 0;
        if (qualityModeRef.current === 'performance') {
          applyQualityMode('balanced');
        } else {
          applyQualityMode('quality');
        }
      }
    },
    [adaptiveQuality, budgets.frameRate, budgets.memory, budgets.render, manager],
  );

  const buildSummary = useCallback(
    (
      metrics: CanvasPerformanceMetrics,
      bottlenecks: ComponentBottleneck[],
      warningsList: PerformanceWarning[],
      recommendationsList: CanvasPerformanceRecommendation[],
    ): CanvasPerformanceSummary => {
      const issues = warningsList.map(warn => warn.message);
      for (const bottleneck of bottlenecks) {
        if (bottleneck.severity === 'info') {
          continue;
        }
        issues.push(bottleneck.message);
      }
      const hasCritical =
        warningsList.some(warn => warn.severity === 'critical') ||
        bottlenecks.some(bottleneck => bottleneck.severity === 'critical');
      const status: CanvasPerformanceSummary['status'] =
        issues.length === 0 ? 'healthy' : hasCritical ? 'critical' : 'warning';
      return {
        status,
        issues,
        recommendations: recommendationsList.slice(0, 4).map(entry => entry.message),
        fps: metrics.fps,
        averageRenderDuration: metrics.averageRenderDuration,
        averageInteractionLatency: metrics.averageInteractionLatency,
        qualityMode: metrics.qualityMode,
        qualityLevel: metrics.qualityLevel,
      };
    },
    [],
  );

  const publishMetrics = useCallback(() => {
    if (!monitoringEnabledRef.current) {
      return;
    }
    const now = Date.now();
    const internal = metricsRef.current;
    const elapsedSeconds = Math.max(1, (now - internal.startTimestamp) / 1000);
    const systemMetrics = manager?.getPerformanceMetrics().get(canvasId);
    const fps = systemMetrics?.fps ?? performanceMonitor?.getCurrentFPS?.() ?? 60;
    const memoryUsage = systemMetrics?.memoryUsage ?? 0;
    const qualityLevel = manager?.getCurrentQualityLevel?.() ?? snapshotRef.current.metrics.qualityLevel;
    const interactionsSnapshot = toPublicInteractions(internal.interactions);
    const metrics: CanvasPerformanceMetrics = {
      renderCount: internal.renderCount,
      averageRenderDuration:
        internal.renderCount > 0 ? internal.renderDurationTotal / internal.renderCount : 0,
      lastRenderDuration: internal.lastRenderDuration,
      fps,
      nodeUpdateCount: internal.nodeUpdates,
      edgeUpdateCount: internal.edgeUpdates,
      averageInteractionLatency:
        internal.interactionCount > 0
          ? internal.interactionDurationTotal / internal.interactionCount
          : 0,
      lastInteractionLatency: internal.lastInteractionDuration,
      viewportChangeFrequency: internal.viewportChanges / elapsedSeconds,
      memoryUsage,
      qualityMode: qualityModeRef.current,
      qualityLevel,
      timestamp: now,
    };
    const bottlenecks = analyzeComponents(metrics);
    const offenders = profilerOrchestrator.getPerformanceOffenders();
    const insights = profilerOrchestrator.getLatestInsights();
    const managerRecommendations = manager?.getRecommendations() ?? [];
    const profilerRecommendations = insights.overallRecommendations ?? [];
    const nextRecommendations = generateHookRecommendations(
      metrics,
      bottlenecks,
      offenders,
      managerRecommendations,
      profilerRecommendations,
    );
    const previousMessages = new Set(recommendationsRef.current.map(entry => entry.message));
    const newlyAdded = nextRecommendations.filter(entry => !previousMessages.has(entry.message));
    if (newlyAdded.length > 0) {
      newlyAdded.forEach(entry => onRecommendation?.(entry));
    }
    recommendationsRef.current = nextRecommendations;
    setRecommendations(nextRecommendations);
    checkFrameRateBudget(metrics.fps);
    checkViewportBudget(metrics.viewportChangeFrequency);
    checkMemoryBudget(memoryUsage);
    evaluateQuality(metrics.fps, metrics.averageRenderDuration, memoryUsage);
    const summary = buildSummary(metrics, bottlenecks, warningsRef.current, nextRecommendations);
    const nextSnapshot: CanvasPerformanceSnapshot = {
      timestamp: now,
      metrics,
      interactions: interactionsSnapshot,
      systemMetrics,
      bottlenecks,
      offenders,
      summary,
    };
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    onMetrics?.(nextSnapshot);
    if (resolvedDevMode) {
      const lastLog = lastDevLogRef.current;
      if (now - lastLog >= sampleRateRef.current * 2) {
        console.debug(`[CanvasPerformance:${canvasId}]`, {
          fps: metrics.fps.toFixed(1),
          render: metrics.averageRenderDuration.toFixed(2),
          interaction: metrics.averageInteractionLatency.toFixed(1),
          viewportHz: metrics.viewportChangeFrequency.toFixed(1),
          memory: metrics.memoryUsage.toFixed(1),
          mode: metrics.qualityMode,
          warnings: warningsRef.current.length,
        });
        lastDevLogRef.current = now;
      }
    }
  }, [
    analyzeComponents,
    canvasId,
    checkFrameRateBudget,
    checkMemoryBudget,
    checkViewportBudget,
    evaluateQuality,
    generateHookRecommendations,
    manager,
    onMetrics,
    onRecommendation,
    performanceMonitor,
    resolvedDevMode,
  ]);

  const recordRender = useCallback(
    (duration: number) => {
      if (!monitoringEnabledRef.current) {
        return;
      }
      const sanitized = Math.max(0, duration);
      const internal = metricsRef.current;
      internal.renderCount += 1;
      internal.renderDurationTotal += sanitized;
      internal.lastRenderDuration = sanitized;
      performanceMonitor?.recordMetric(`${canvasId}-render`, sanitized);
      checkRenderBudget(sanitized);
      schedulePublish(0);
    },
    [canvasId, checkRenderBudget, performanceMonitor, schedulePublish],
  );

  const recordInteraction = useCallback(
    (type: InteractionType, duration: number) => {
      if (!monitoringEnabledRef.current) {
        return;
      }
      const sanitized = Math.max(0, duration);
      const internal = metricsRef.current;
      const interactionMetrics = internal.interactions[type] ?? {
        count: 0,
        totalDuration: 0,
        lastDuration: 0,
      };
      interactionMetrics.count += 1;
      interactionMetrics.totalDuration += sanitized;
      interactionMetrics.lastDuration = sanitized;
      internal.interactions[type] = interactionMetrics;
      internal.interactionCount += 1;
      internal.interactionDurationTotal += sanitized;
      internal.lastInteractionDuration = sanitized;
      performanceMonitor?.recordMetric(`${canvasId}-interaction-${type}`, sanitized);
      checkInteractionBudget(sanitized, type);
      schedulePublish(80);
    },
    [canvasId, checkInteractionBudget, performanceMonitor, schedulePublish],
  );

  const recordNodeUpdate = useCallback(
    (count = 1) => {
      if (!monitoringEnabledRef.current) {
        return;
      }
      metricsRef.current.nodeUpdates += count;
      schedulePublish(120);
    },
    [schedulePublish],
  );

  const recordEdgeUpdate = useCallback(
    (count = 1) => {
      if (!monitoringEnabledRef.current) {
        return;
      }
      metricsRef.current.edgeUpdates += count;
      schedulePublish(120);
    },
    [schedulePublish],
  );

  const recordViewportChange = useCallback(() => {
    if (!monitoringEnabledRef.current) {
      return;
    }
    metricsRef.current.viewportChanges += 1;
    performanceMonitor?.recordMetric(`${canvasId}-viewport-change`, 0);
    schedulePublish(150);
  }, [canvasId, performanceMonitor, schedulePublish]);

  const exportPerformanceReport = useCallback((): CanvasPerformanceReport | null => {
    if (!manager || !monitoringEnabledRef.current) {
      return null;
    }
    return {
      snapshot: snapshotRef.current,
      managerReport: manager.exportPerformanceData(),
    };
  }, [manager]);

  const reset = useCallback(() => {
    metricsRef.current = createInternalMetrics();
    warningsRef.current = [];
    recommendationsRef.current = [];
    setWarnings([]);
    setRecommendations([]);
    const initialSnapshot = createInitialSnapshot(qualityModeRef.current, manager?.getCurrentQualityLevel?.() ?? 1);
    snapshotRef.current = initialSnapshot;
    setSnapshot(initialSnapshot);
    lastDevLogRef.current = 0;
  }, [manager]);

  useEffect(() => {
    if (!resolvedMonitoring || !manager) {
      return;
    }
    manager.setAdaptiveQuality(adaptiveQuality);
  }, [adaptiveQuality, manager, resolvedMonitoring]);

  useEffect(() => {
    if (!resolvedMonitoring || !manager) {
      return;
    }
    manager.setPerformanceBudget(canvasId, {
      renderTime: budgets.render,
      fpsThreshold: budgets.frameRate,
      memoryUsage: budgets.memory,
      complexityThreshold: budgets.viewport * 50,
    });
  }, [budgets.frameRate, budgets.memory, budgets.render, budgets.viewport, canvasId, manager, resolvedMonitoring]);

  useEffect(() => {
    if (!resolvedMonitoring || !manager) {
      return;
    }
    const listener: PerformanceEventListener = (event, data) => {
      if (event === 'modeChanged' && data?.mode) {
        const mode = data.mode as QualityMode;
        qualityModeRef.current = mode;
        setQualityModeState(mode);
      }
      if (event === 'qualityAdjusted' && data?.level) {
        const nextSnapshot = snapshotRef.current;
        const updatedMetrics: CanvasPerformanceMetrics = {
          ...nextSnapshot.metrics,
          qualityLevel: data.level,
        };
        const updatedSnapshot: CanvasPerformanceSnapshot = {
          ...nextSnapshot,
          metrics: updatedMetrics,
        };
        snapshotRef.current = updatedSnapshot;
        setSnapshot(updatedSnapshot);
      }
    };
    manager.addEventListener(listener);
    return () => {
      manager.removeEventListener(listener);
    };
  }, [manager, resolvedMonitoring]);

  useEffect(() => {
    if (!resolvedMonitoring || !isBrowser) {
      return;
    }
    publishMetrics();
    const interval = window.setInterval(() => {
      publishMetrics();
    }, sampleRate);
    return () => {
      window.clearInterval(interval);
    };
  }, [isBrowser, publishMetrics, resolvedMonitoring, sampleRate]);

  useEffect(() => {
    metricsRef.current = createInternalMetrics();
    const initialSnapshot = createInitialSnapshot(qualityModeRef.current, manager?.getCurrentQualityLevel?.() ?? 1);
    snapshotRef.current = initialSnapshot;
    setSnapshot(initialSnapshot);
    warningsRef.current = [];
    recommendationsRef.current = [];
    setWarnings([]);
    setRecommendations([]);
  }, [canvasId, manager]);

  useEffect(
    () => () => {
      clearScheduledPublish();
    },
    [clearScheduledPublish],
  );

  return {
    metrics: snapshot.metrics,
    interactions: snapshot.interactions,
    warnings,
    recommendations,
    summary: snapshot.summary,
    bottlenecks: snapshot.bottlenecks,
    offenders: snapshot.offenders,
    qualityMode: qualityModeState,
    recordRender,
    recordInteraction,
    recordNodeUpdate,
    recordEdgeUpdate,
    recordViewportChange,
    exportPerformanceReport,
    reset,
  };
};

export type { CanvasPerformanceReport, CanvasPerformanceRecommendation, CanvasPerformanceSnapshot, CanvasPerformanceSummary, PerformanceWarning };