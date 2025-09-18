// Component lifecycle tracking with telemetry for update depth monitoring
// Provides detailed insights into component render cycles and state changes
// RELEVANT FILES: UpdateDepthMonitor.ts, RenderLoopDiagnostics.ts, InfiniteLoopDetector.ts

import { useEffect, useRef, useCallback } from 'react';
import { UpdateDepthMonitor } from './UpdateDepthMonitor';
import { RenderLoopDiagnostics } from '../debug/RenderLoopDiagnostics';

interface LifecycleEvent {
  type: 'mount' | 'unmount' | 'update' | 'render' | 'effect' | 'state-change';
  componentName: string;
  timestamp: number;
  props?: any;
  state?: any;
  hookName?: string;
  stackTrace?: string;
  renderCount?: number;
}

interface ComponentMetrics {
  mountTime: number;
  renderCount: number;
  updateCount: number;
  effectCount: number;
  lastRender: number;
  averageRenderTime: number;
  maxRenderTime: number;
  stateChangeCount: number;
  propsChangeCount: number;
}

class ComponentLifecycleTracker {
  private static instance: ComponentLifecycleTracker | null = null;
  private events: LifecycleEvent[] = [];
  private metrics = new Map<string, ComponentMetrics>();
  private renderTimings = new Map<string, number>();
  private maxEventsToKeep = 1000;

  static getInstance(): ComponentLifecycleTracker {
    if (!ComponentLifecycleTracker.instance) {
      ComponentLifecycleTracker.instance = new ComponentLifecycleTracker();
    }
    return ComponentLifecycleTracker.instance;
  }

  recordEvent(event: LifecycleEvent) {
    this.events.push(event);
    this.updateMetrics(event);

    // Keep only recent events to prevent memory leaks
    if (this.events.length > this.maxEventsToKeep) {
      this.events = this.events.slice(-this.maxEventsToKeep / 2);
    }

    // Check for suspicious patterns
    this.analyzeEvent(event);
  }

  private updateMetrics(event: LifecycleEvent) {
    const existing = this.metrics.get(event.componentName);
    const now = event.timestamp;

    if (!existing) {
      this.metrics.set(event.componentName, {
        mountTime: event.type === 'mount' ? now : 0,
        renderCount: event.type === 'render' ? 1 : 0,
        updateCount: event.type === 'update' ? 1 : 0,
        effectCount: event.type === 'effect' ? 1 : 0,
        lastRender: event.type === 'render' ? now : 0,
        averageRenderTime: 0,
        maxRenderTime: 0,
        stateChangeCount: event.type === 'state-change' ? 1 : 0,
        propsChangeCount: 0,
      });
      return;
    }

    const updated = { ...existing };

    switch (event.type) {
      case 'mount':
        updated.mountTime = now;
        break;
      case 'render':
        updated.renderCount++;
        updated.lastRender = now;
        this.updateRenderTiming(event.componentName, now);
        break;
      case 'update':
        updated.updateCount++;
        break;
      case 'effect':
        updated.effectCount++;
        break;
      case 'state-change':
        updated.stateChangeCount++;
        break;
    }

    this.metrics.set(event.componentName, updated);
  }

  private updateRenderTiming(componentName: string, endTime: number) {
    const startTime = this.renderTimings.get(componentName);
    if (startTime) {
      const renderTime = endTime - startTime;
      const metrics = this.metrics.get(componentName);
      if (metrics) {
        const newAverage =
          (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;
        metrics.averageRenderTime = newAverage;
        metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
      }
    }
  }

  private analyzeEvent(event: LifecycleEvent) {
    const recentEvents = this.getRecentEvents(event.componentName, 1000); // Last 1 second
    const diagnostics = RenderLoopDiagnostics.getInstance();

    // Check for rapid render cycles
    const recentRenders = recentEvents.filter(e => e.type === 'render');
    if (recentRenders.length > 10) {
      UpdateDepthMonitor.getInstance().recordUpdate(
        `${event.componentName}:lifecycle`,
        `rapid-renders:${recentRenders.length}`
      );

      diagnostics.recordStabilityWarning(
        event.componentName,
        `Rapid render cycle detected: ${recentRenders.length} renders in 1 second`
      );
    }

    // Check for effect loops
    const recentEffects = recentEvents.filter(e => e.type === 'effect');
    if (recentEffects.length > 5) {
      diagnostics.recordStabilityWarning(
        event.componentName,
        `Potential effect loop: ${recentEffects.length} effects in 1 second`
      );
    }

    // Check for state change storms
    const recentStateChanges = recentEvents.filter(e => e.type === 'state-change');
    if (recentStateChanges.length > 20) {
      diagnostics.recordStabilityWarning(
        event.componentName,
        `State change storm detected: ${recentStateChanges.length} changes in 1 second`
      );
    }
  }

  getRecentEvents(componentName: string, timeWindowMs: number): LifecycleEvent[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.events.filter(
      event => event.componentName === componentName && event.timestamp > cutoff
    );
  }

  getComponentMetrics(componentName: string): ComponentMetrics | undefined {
    return this.metrics.get(componentName);
  }

  getAllMetrics(): Map<string, ComponentMetrics> {
    return new Map(this.metrics);
  }

  startRenderTiming(componentName: string) {
    this.renderTimings.set(componentName, Date.now());
  }

  endRenderTiming(componentName: string) {
    const now = Date.now();
    this.recordEvent({
      type: 'render',
      componentName,
      timestamp: now,
    });
  }

  reset() {
    this.events = [];
    this.metrics.clear();
    this.renderTimings.clear();
  }

  exportData() {
    return {
      events: this.events,
      metrics: Object.fromEntries(this.metrics),
      timestamp: Date.now(),
    };
  }
}

// React hook for automatic lifecycle tracking
export function useLifecycleTracking(componentName: string, props?: any) {
  const tracker = ComponentLifecycleTracker.getInstance();
  const mountedRef = useRef(false);
  const renderCountRef = useRef(0);
  const lastPropsRef = useRef(props);

  // Track mount/unmount
  useEffect(() => {
    if (!mountedRef.current) {
      tracker.recordEvent({
        type: 'mount',
        componentName,
        timestamp: Date.now(),
        props,
      });
      mountedRef.current = true;
    }

    return () => {
      tracker.recordEvent({
        type: 'unmount',
        componentName,
        timestamp: Date.now(),
      });
    };
  }, [componentName, tracker]);

  // Track renders
  useEffect(() => {
    renderCountRef.current++;
    tracker.endRenderTiming(componentName);

    // Track prop changes
    if (props && lastPropsRef.current !== props) {
      const propsChanged = JSON.stringify(lastPropsRef.current) !== JSON.stringify(props);
      if (propsChanged) {
        tracker.recordEvent({
          type: 'update',
          componentName,
          timestamp: Date.now(),
          props,
        });
      }
      lastPropsRef.current = props;
    }
  });

  // Start render timing on each render
  tracker.startRenderTiming(componentName);

  // Return tracking utilities
  return {
    recordStateChange: useCallback((stateName: string, newValue: any) => {
      tracker.recordEvent({
        type: 'state-change',
        componentName,
        timestamp: Date.now(),
        state: { [stateName]: newValue },
      });
    }, [componentName, tracker]),

    recordEffect: useCallback((hookName: string) => {
      tracker.recordEvent({
        type: 'effect',
        componentName,
        timestamp: Date.now(),
        hookName,
      });
    }, [componentName, tracker]),

    getMetrics: useCallback(() => {
      return tracker.getComponentMetrics(componentName);
    }, [componentName, tracker]),
  };
}

export { ComponentLifecycleTracker, type LifecycleEvent, type ComponentMetrics };