// src/lib/performance/RenderGuard.ts
// Reusable render guard utility to prevent infinite render loops
// Provides configurable thresholds and circuit breaker functionality
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/hooks/usePerformanceMonitor.ts

import { useRef } from 'react';

interface RenderGuardConfig {
  // Maximum renders allowed within the time window
  maxRenders: number;
  // Time window in milliseconds to track renders
  windowMs: number;
  // Component name for logging
  componentName: string;
  // Warning threshold (percentage of maxRenders)
  warningThreshold: number;
  // Whether to throw error on limit exceeded
  throwOnLimit: boolean;
  // Additional context for logging
  context?: Record<string, any>;
}

interface RenderGuardState {
  count: number;
  windowStart: number;
  lastWarning: number;
  isCircuitOpen: boolean;
  warningCount: number;
}

interface RenderGuardReturn {
  // Check if render should proceed (false = circuit breaker active)
  canRender: boolean;
  // Current render count in window
  renderCount: number;
  // Whether circuit breaker is active
  isCircuitOpen: boolean;
  // Reset the guard state
  reset: () => void;
  // Force close the circuit breaker
  closeCircuit: () => void;
}

const DEFAULT_CONFIG: RenderGuardConfig = {
  maxRenders: 50,
  windowMs: 2000,
  componentName: 'Component',
  warningThreshold: 0.5, // 50% of maxRenders
  throwOnLimit: true,
};

/**
 * Hook to guard against infinite render loops with configurable circuit breaker
 */
export function useRenderGuard(config: Partial<RenderGuardConfig> = {}): RenderGuardReturn {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    maxRenders,
    windowMs,
    componentName,
    warningThreshold,
    throwOnLimit,
    context = {},
  } = fullConfig;

  const stateRef = useRef<RenderGuardState>({
    count: 0,
    windowStart: Date.now(),
    lastWarning: 0,
    isCircuitOpen: false,
    warningCount: 0,
  });

  // Only run checks in development
  if (process.env.NODE_ENV === 'production') {
    return {
      canRender: true,
      renderCount: 0,
      isCircuitOpen: false,
      reset: () => {},
      closeCircuit: () => {},
    };
  }

  const state = stateRef.current;
  const now = Date.now();

  // Reset window if time elapsed
  if (now - state.windowStart > windowMs) {
    state.windowStart = now;
    state.count = 0;
    state.lastWarning = 0;
    state.warningCount = 0;
    // Keep circuit open if it was opened due to excessive renders
  }

  // Increment render count
  state.count += 1;

  const warningThresholdCount = Math.floor(maxRenders * warningThreshold);

  // Warning at threshold
  if (state.count >= warningThresholdCount && now - state.lastWarning > 1000) {
    state.lastWarning = now;
    state.warningCount += 1;

    console.warn(`[RenderGuard:${componentName}] High render count detected:`, {
      count: state.count,
      maxRenders,
      windowMs,
      warningThreshold: `${warningThreshold * 100}%`,
      warningCount: state.warningCount,
      ...context,
    });

    // Open circuit if too many warnings
    if (state.warningCount >= 3) {
      state.isCircuitOpen = true;
      console.error(`[RenderGuard:${componentName}] Circuit breaker activated due to repeated warnings`);
    }
  }

  // Circuit breaker activation
  if (state.count >= maxRenders) {
    state.isCircuitOpen = true;

    const errorMessage = `[RenderGuard:${componentName}] Infinite render loop detected! Rendered ${state.count} times within ${windowMs}ms.`;
    const errorDetails = {
      renderCount: state.count,
      maxRenders,
      windowMs,
      componentName,
      warningCount: state.warningCount,
      stackTrace: new Error().stack,
      ...context,
    };

    console.error(errorMessage, errorDetails);

    if (throwOnLimit) {
      throw new Error(`${componentName}: Maximum render limit exceeded - possible infinite loop`);
    }
  }

  const reset = () => {
    state.count = 0;
    state.windowStart = Date.now();
    state.lastWarning = 0;
    state.warningCount = 0;
    state.isCircuitOpen = false;
  };

  const closeCircuit = () => {
    state.isCircuitOpen = false;
    state.warningCount = 0;
  };

  return {
    canRender: !state.isCircuitOpen,
    renderCount: state.count,
    isCircuitOpen: state.isCircuitOpen,
    reset,
    closeCircuit,
  };
}

/**
 * Analytics collector for render performance
 */
export class RenderAnalytics {
  private static instance: RenderAnalytics;
  private metrics: Map<string, {
    totalRenders: number;
    infiniteLoops: number;
    warningsIssued: number;
    lastIncident: number;
  }> = new Map();

  static getInstance(): RenderAnalytics {
    if (!RenderAnalytics.instance) {
      RenderAnalytics.instance = new RenderAnalytics();
    }
    return RenderAnalytics.instance;
  }

  recordRender(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return;

    const existing = this.metrics.get(componentName) || {
      totalRenders: 0,
      infiniteLoops: 0,
      warningsIssued: 0,
      lastIncident: 0,
    };

    existing.totalRenders += 1;
    this.metrics.set(componentName, existing);
  }

  recordInfiniteLoop(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return;

    const existing = this.metrics.get(componentName) || {
      totalRenders: 0,
      infiniteLoops: 0,
      warningsIssued: 0,
      lastIncident: 0,
    };

    existing.infiniteLoops += 1;
    existing.lastIncident = Date.now();
    this.metrics.set(componentName, existing);
  }

  recordWarning(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return;

    const existing = this.metrics.get(componentName) || {
      totalRenders: 0,
      infiniteLoops: 0,
      warningsIssued: 0,
      lastIncident: 0,
    };

    existing.warningsIssued += 1;
    this.metrics.set(componentName, existing);
  }

  getMetrics(componentName?: string) {
    if (componentName) {
      return this.metrics.get(componentName) || null;
    }
    return Object.fromEntries(this.metrics);
  }

  reset(componentName?: string): void {
    if (componentName) {
      this.metrics.delete(componentName);
    } else {
      this.metrics.clear();
    }
  }
}

/**
 * Pre-configured render guards for common scenarios
 */
export const RenderGuardPresets = {
  // For main UI components that should be stable
  strict: {
    maxRenders: 25,
    windowMs: 1500,
    warningThreshold: 0.4,
    throwOnLimit: true,
  },

  // For data synchronization components
  sync: {
    maxRenders: 10,
    windowMs: 1000,
    warningThreshold: 0.3,
    throwOnLimit: true,
  },

  // For high-frequency update components
  lenient: {
    maxRenders: 100,
    windowMs: 3000,
    warningThreshold: 0.6,
    throwOnLimit: false,
  },

  // For development debugging
  debug: {
    maxRenders: 5,
    windowMs: 500,
    warningThreshold: 0.2,
    throwOnLimit: true,
  },
} as const;