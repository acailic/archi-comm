import { useEffect, useMemo, useRef } from 'react';

import {
  componentOptimizer,
  type ComponentRenderMetrics,
  type OptimizationInsight,
  type RenderCommitType,
} from '@lib/performance/ComponentOptimizer';

const isDevBuild = import.meta.env.DEV;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const EMPTY_METRICS: ComponentRenderMetrics = Object.freeze({
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
});

export interface ComponentRenderTrackingOptions {
  id?: string;
  trackProps?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ComponentRenderTrackingResult {
  metrics: ComponentRenderMetrics;
  insights: OptimizationInsight[];
}

function diffProps(prev: Record<string, unknown>, next: Record<string, unknown>): string[] {
  if (prev === next) {
    return [];
  }

  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changes: string[] = [];
  for (const key of keys) {
    if (!Object.is(prev[key], next[key])) {
      changes.push(key);
    }
  }
  return changes;
}

export function useComponentRenderTracking(
  componentName: string,
  options?: ComponentRenderTrackingOptions
): ComponentRenderTrackingResult {
  const enabled = (options?.enabled ?? true) && isDevBuild;
  const componentId = options?.id ?? componentName;

  const startTimeRef = useRef<number>(now());
  const hasMountedRef = useRef(false);
  const previousPropsRef = useRef<Record<string, unknown>>(options?.trackProps ?? {});

  if (enabled) {
    startTimeRef.current = now();
  }

  useEffect(() => {
    if (!enabled) {
      hasMountedRef.current = true;
      previousPropsRef.current = options?.trackProps ?? previousPropsRef.current;
      return;
    }

    const duration = now() - startTimeRef.current;
    const commitType: RenderCommitType = hasMountedRef.current ? 'update' : 'mount';

    const previousProps = previousPropsRef.current;
    const nextProps = options?.trackProps ?? {};
    const changedProps = diffProps(previousProps, nextProps);

    componentOptimizer.recordSample({
      componentId,
      duration,
      timestamp: Date.now(),
      commitType,
      propsChanged: changedProps,
    });

    previousPropsRef.current = nextProps;
    hasMountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const metrics = useMemo<ComponentRenderMetrics>(() => {
    if (!enabled) {
      return EMPTY_METRICS;
    }
    return componentOptimizer.getMetrics(componentId);
  }, [componentId, enabled]);

  const insights = useMemo<OptimizationInsight[]>(() => {
    if (!enabled) {
      return [];
    }
    return componentOptimizer.getInsights(componentId);
  }, [componentId, enabled, metrics.renderCount, metrics.lastDuration]);

  return { metrics, insights };
}
