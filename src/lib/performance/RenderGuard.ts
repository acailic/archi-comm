import { useRef } from 'react';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';

type ContextProducer = Record<string, unknown> | (() => Record<string, unknown> | undefined);

interface SnapshotProducer {
  (): Record<string, unknown> | undefined;
}

export interface RenderGuardOptions {
  /** Render count that triggers a warning. Defaults to 20. */
  warningThreshold?: number;
  /** Render count that triggers an error log. Defaults to 50. */
  errorThreshold?: number;
  /** Cooldown (ms) between warning logs. Defaults to 750ms. */
  warningIntervalMs?: number;
  /** Include stack traces in warning/error payloads. */
  includeStackTrace?: boolean;
  /** Additional context to print when thresholds are hit. */
  context?: ContextProducer;
  /** Forward events to analytics collector. Defaults to true. */
  trackInAnalytics?: boolean;
  /**
   * Called to gather a snapshot of props when a render spike is detected.
   * Useful for diagnosing feedback loops caused by unstable references.
   */
  propsSnapshot?: SnapshotProducer;
  /** Called to gather a snapshot of internal state for diagnostics. */
  stateSnapshot?: SnapshotProducer;
  /** Optional identifier used by the detector for grouping sub-components. */
  componentId?: string;
  /**
   * When true, render guard records events but does not throw synthetic errors.
   * Useful for components that handle their own error isolation.
   */
  disableSyntheticError?: boolean;
  /**
   * How long (ms) the circuit breaker should remain open after it trips.
   * Defaults to 5000ms.
   */
  circuitBreakerCooldownMs?: number;
  /**
   * Time between memory samples (ms). Defaults to 1000ms.
   */
  memorySampleIntervalMs?: number;
  /** Custom message for synthetic errors. */
  customErrorMessage?: string;
  /**
   * Callback invoked when the circuit breaker opens. Useful for surfacing UI messages.
   */
  onCircuitBreakerOpen?: (details: CircuitBreakerDetails) => void;
  /** Callback invoked when the circuit breaker closes. */
  onCircuitBreakerClose?: () => void;
  /**
   * Callback invoked when the error threshold is exceeded and synthetic error is thrown.
   * Useful for integrating with future detectors.
   */
  onTrip?: (details: { componentName: string; renderCount: number; error: RenderLoopDetectedError }) => void;
}

export interface CircuitBreakerDetails {
  component: string;
  until: number;
  reason: string;
  renderCount: number;
}

export interface RenderGuardHandle {
  /** Total renders recorded since the last reset. */
  renderCount: number;
  /** Milliseconds since the first tracked render. */
  sinceFirstRenderMs: number;
  /** Milliseconds between the current render and the previous one. */
  sincePreviousRenderMs: number;
  /** Whether the circuit breaker is currently active. */
  circuitBreakerActive: boolean;
  /** Timestamp (ms) when the circuit breaker will automatically close. */
  circuitBreakerResetAt: number | null;
  /** Details about the last synthetic error thrown, if any. */
  lastSyntheticError?: {
    message: string;
    stackSnippet?: string;
    timestamp: number;
  };
  /** Latest memory usage sample captured during render tracking. */
  memorySample?: MemorySample | null;
  /** Reset counters and timers (useful after intentional state changes). */
  reset: () => void;
}

interface MemorySample {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  deltaSinceBaseline?: number;
}

interface RenderGuardState {
  renderCount: number;
  firstRenderAt: number;
  previousRenderAt: number;
  lastWarningAt: number;
  lastWarningCount: number;
  lastErrorCount: number;
  circuitBreakerOpenUntil: number;
  lastSyntheticErrorAt: number;
  memoryBaseline?: number;
  lastMemorySampleAt: number;
  lastSnapshotHash?: string;
}

const DEFAULT_OPTIONS: Required<
  Pick<
    RenderGuardOptions,
    | 'warningThreshold'
    | 'errorThreshold'
    | 'warningIntervalMs'
    | 'includeStackTrace'
    | 'trackInAnalytics'
    | 'disableSyntheticError'
    | 'circuitBreakerCooldownMs'
    | 'memorySampleIntervalMs'
  
  >
> = {
  warningThreshold: 20,
  errorThreshold: 50,
  warningIntervalMs: 750,
  includeStackTrace: true,
  trackInAnalytics: true,
  disableSyntheticError: false,
  circuitBreakerCooldownMs: 5000,
  memorySampleIntervalMs: 1000,
};

const PROD_HANDLE: RenderGuardHandle = {
  renderCount: 0,
  sinceFirstRenderMs: 0,
  sincePreviousRenderMs: 0,
  circuitBreakerActive: false,
  circuitBreakerResetAt: null,
  reset: () => {},
  memorySample: null,
};

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const resolveContext = (context?: ContextProducer) => {
  if (!context) return undefined;
  if (typeof context === 'function') {
    try {
      return context();
    } catch (error) {
      console.error('[RenderGuard] Failed to resolve context producer', error);
      return undefined;
    }
  }
  return context;
};

const safeSnapshot = (producer?: SnapshotProducer) => {
  if (!producer) return undefined;
  try {
    return producer();
  } catch (error) {
    console.warn('[RenderGuard] Snapshot producer threw', error);
    return { error: (error as Error)?.message ?? 'Unknown snapshot failure' };
  }
};

const analyzeStackTrace = (stack?: string) => {
  if (!stack) return undefined;
  const frames = stack.split('\n').map(line => line.trim());
  const relevant = frames.filter(frame => !frame.includes('at Object.useRenderGuard'));
  return relevant.slice(0, 5).join(' \u2192 ');
};

const sampleMemory = (
  state: RenderGuardState,
  timestamp: number,
  intervalMs: number
): MemorySample | null => {
  const perf: any = typeof performance !== 'undefined' ? (performance as any) : null;
  const memory = perf?.memory;
  if (!memory) return null;

  if (timestamp - state.lastMemorySampleAt < intervalMs) {
    return null;
  }

  state.lastMemorySampleAt = timestamp;
  if (state.memoryBaseline == null) {
    state.memoryBaseline = memory.usedJSHeapSize;
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    deltaSinceBaseline:
      state.memoryBaseline != null ? memory.usedJSHeapSize - state.memoryBaseline : undefined,
  };
};

const hashSnapshot = (snapshot?: Record<string, unknown>) => {
  if (!snapshot) return undefined;
  try {
    const json = JSON.stringify(snapshot, Object.keys(snapshot).sort());
    let hash = 0;
    for (let index = 0; index < json.length; index += 1) {
      const chr = json.charCodeAt(index);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return hash.toString(16);
  } catch (error) {
    console.warn('[RenderGuard] Failed to hash snapshot', error);
    return undefined;
  }
};

/**
 * Dev-only hook that helps highlight accidental render cascades.
 * Logs structured telemetry once warning/error thresholds are crossed and
 * coordinates with the global InfiniteLoopDetector to enforce circuit breaking.
 */
export const useRenderGuard = (
  componentName: string,
  options: RenderGuardOptions = {}
): RenderGuardHandle => {
  const stateRef = useRef<RenderGuardState>({
    renderCount: 0,
    firstRenderAt: now(),
    previousRenderAt: 0,
    lastWarningAt: 0,
    lastWarningCount: 0,
    lastErrorCount: 0,
    circuitBreakerOpenUntil: 0,
    lastSyntheticErrorAt: 0,
    lastMemorySampleAt: 0,
    lastSnapshotHash: undefined,
  });

  const resolvedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } satisfies typeof DEFAULT_OPTIONS & RenderGuardOptions;

  if (process.env.NODE_ENV === 'production') {
    return PROD_HANDLE;
  }

  const timestamp = now();
  const state = stateRef.current;

  const timeSincePreviousRender = state.previousRenderAt
    ? timestamp - state.previousRenderAt
    : 0;

  state.renderCount += 1;
  state.previousRenderAt = timestamp;

  const sinceFirstRenderMs = timestamp - state.firstRenderAt;

  if (resolvedOptions.trackInAnalytics) {
    RenderAnalytics.getInstance().recordRender(componentName);
  }

  const contextPayload = resolveContext(options.context);
  const propsSnapshot = safeSnapshot(options.propsSnapshot);
  const stateSnapshot = safeSnapshot(options.stateSnapshot);
  const combinedSnapshot = propsSnapshot || stateSnapshot ? { propsSnapshot, stateSnapshot } : undefined;
  const snapshotHash = hashSnapshot(combinedSnapshot ?? contextPayload);

  const memorySample = sampleMemory(state, timestamp, resolvedOptions.memorySampleIntervalMs);

  const logPayload = () => ({
    component: componentName,
    componentId: resolvedOptions.componentId,
    renderCount: state.renderCount,
    warningThreshold: resolvedOptions.warningThreshold,
    errorThreshold: resolvedOptions.errorThreshold,
    sinceFirstRenderMs,
    sincePreviousRenderMs: timeSincePreviousRender,
    context: contextPayload,
    propsSnapshot,
    stateSnapshot,
    snapshotHash,
    memorySample,
    stack: resolvedOptions.includeStackTrace ? new Error().stack : undefined,
  });

  const detector = InfiniteLoopDetector.getInstance();

  const stackForAnalysis = resolvedOptions.includeStackTrace ? new Error().stack : undefined;
  const stackSnippet = analyzeStackTrace(stackForAnalysis);

  const detectionResult = detector.recordRender({
    componentName,
    componentId: resolvedOptions.componentId,
    timestamp,
    renderCount: state.renderCount,
    sinceFirstRenderMs,
    sincePreviousRenderMs: timeSincePreviousRender,
    context: contextPayload,
    snapshotHash,
    stackSnippet,
    memorySample,
  });

  if (snapshotHash && state.lastSnapshotHash === snapshotHash && detectionResult.isOscillating) {
    RenderLoopDiagnostics.getInstance().recordOscillation(componentName, {
      renderCount: state.renderCount,
      snapshotHash,
      timing: timeSincePreviousRender,
    });
  }

  state.lastSnapshotHash = snapshotHash;

  const logAndMaybeWarn = () => {
    if (
      state.renderCount >= resolvedOptions.warningThreshold &&
      state.renderCount !== state.lastWarningCount &&
      timestamp - state.lastWarningAt >= resolvedOptions.warningIntervalMs
    ) {
      state.lastWarningAt = timestamp;
      state.lastWarningCount = state.renderCount;
      console.warn(`[RenderGuard:${componentName}] High render count detected`, logPayload());

      if (resolvedOptions.trackInAnalytics) {
        RenderAnalytics.getInstance().recordWarning(componentName);
      }
    }
  };

  logAndMaybeWarn();

  let circuitBreakerActive = state.circuitBreakerOpenUntil > timestamp;
  if (detectionResult.shouldOpenCircuitBreaker && !circuitBreakerActive) {
    state.circuitBreakerOpenUntil = timestamp + resolvedOptions.circuitBreakerCooldownMs;
    circuitBreakerActive = true;
    resolvedOptions.onCircuitBreakerOpen?.({
      component: componentName,
      until: state.circuitBreakerOpenUntil,
      reason: detectionResult.reason ?? 'render-threshold',
      renderCount: state.renderCount,
    });
    detector.markCircuitBreakerOpen(componentName, state.circuitBreakerOpenUntil, detectionResult.reason);
    RenderLoopDiagnostics.getInstance().recordCircuitBreaker(componentName, {
      resetAt: state.circuitBreakerOpenUntil,
      renderCount: state.renderCount,
      reason: detectionResult.reason,
    });
  } else if (!detectionResult.shouldOpenCircuitBreaker && circuitBreakerActive && state.circuitBreakerOpenUntil <= timestamp) {
    resolvedOptions.onCircuitBreakerClose?.();
    detector.markCircuitBreakerClosed(componentName);
  }

  const shouldThrowSyntheticError =
    !resolvedOptions.disableSyntheticError &&
    (state.renderCount >= resolvedOptions.errorThreshold || detectionResult.shouldThrowSyntheticError) &&
    state.lastSyntheticErrorAt !== state.renderCount;

  if (state.renderCount >= resolvedOptions.errorThreshold && state.renderCount !== state.lastErrorCount) {
    state.lastErrorCount = state.renderCount;
    console.error(`[RenderGuard:${componentName}] Excessive render frequency`, logPayload());

    if (resolvedOptions.trackInAnalytics) {
      RenderAnalytics.getInstance().recordInfiniteLoop(componentName);
    }
  }

  let lastSyntheticError: RenderGuardHandle['lastSyntheticError'];

  if (shouldThrowSyntheticError) {
    state.lastSyntheticErrorAt = state.renderCount;
    const errorMessage =
      resolvedOptions.customErrorMessage ??
      `Maximum render limit exceeded: ${componentName}`;
    const syntheticError = new RenderLoopDetectedError(errorMessage, {
      componentName,
      renderCount: state.renderCount,
      sinceFirstRenderMs,
      sincePreviousRenderMs: timeSincePreviousRender,
      context: contextPayload,
      propsSnapshot,
      stateSnapshot,
      memorySample,
      stackSnippet,
    });

    detector.noteSyntheticError(componentName, syntheticError);
    RenderLoopDiagnostics.getInstance().recordSyntheticError(componentName, syntheticError);

    // Call onTrip callback if provided
    resolvedOptions.onTrip?.({
      componentName,
      renderCount: state.renderCount,
      error: syntheticError,
    });

    lastSyntheticError = {
      message: syntheticError.message,
      stackSnippet,
      timestamp,
    };

    throw syntheticError;
  }

  const reset = () => {
    state.renderCount = 0;
    state.firstRenderAt = now();
    state.previousRenderAt = 0;
    state.lastWarningAt = 0;
    state.lastWarningCount = 0;
    state.lastErrorCount = 0;
    state.circuitBreakerOpenUntil = 0;
    state.lastSyntheticErrorAt = 0;
    state.lastSnapshotHash = undefined;
    state.memoryBaseline = undefined;
    state.lastMemorySampleAt = 0;
    detector.markComponentReset(componentName);
  };

  return {
    renderCount: state.renderCount,
    sinceFirstRenderMs,
    sincePreviousRenderMs: timeSincePreviousRender,
    circuitBreakerActive,
    circuitBreakerResetAt: circuitBreakerActive ? state.circuitBreakerOpenUntil : null,
    lastSyntheticError,
    memorySample,
    reset,
  };
};

/**
 * Lightweight analytics collector for render behaviour (dev-only).
 */
export class RenderAnalytics {
  private static instance: RenderAnalytics;

  private metrics: Map<
    string,
    {
      totalRenders: number;
      warnings: number;
      errors: number;
      lastWarningAt: number;
      lastErrorAt: number;
    }
  > = new Map();

  static getInstance(): RenderAnalytics {
    if (!RenderAnalytics.instance) {
      RenderAnalytics.instance = new RenderAnalytics();
    }
    return RenderAnalytics.instance;
  }

  recordRender(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return;
    const entry = this.ensureEntry(componentName);
    entry.totalRenders += 1;
  }

  recordWarning(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return;
    const entry = this.ensureEntry(componentName);
    entry.warnings += 1;
    entry.lastWarningAt = now();
  }

  recordInfiniteLoop(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return;
    const entry = this.ensureEntry(componentName);
    entry.errors += 1;
    entry.lastErrorAt = now();
  }

  getMetrics(componentName?: string) {
    if (componentName) {
      return this.metrics.get(componentName) ?? null;
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

  private ensureEntry(componentName: string) {
    const existing = this.metrics.get(componentName);
    if (existing) {
      return existing;
    }
    const fresh = {
      totalRenders: 0,
      warnings: 0,
      errors: 0,
      lastWarningAt: 0,
      lastErrorAt: 0,
    };
    this.metrics.set(componentName, fresh);
    return fresh;
  }
}

export const RenderGuardPresets = {
  strict: {
    warningThreshold: 15,
    errorThreshold: 30,
  },
  balanced: {
    warningThreshold: 25,
    errorThreshold: 45,
  },
  lenient: {
    warningThreshold: 40,
    errorThreshold: 80,
  },
  canvasLayers: {
    Controller: {
      warningThreshold: 15,
      errorThreshold: 30,
    },
    NodeLayer: {
      warningThreshold: 12,
      errorThreshold: 25,
    },
    EdgeLayer: {
      warningThreshold: 10,
      errorThreshold: 20,
    },
    LayoutEngine: {
      warningThreshold: 8,
      errorThreshold: 15,
    },
    VirtualizationLayer: {
      warningThreshold: 10,
      errorThreshold: 20,
    },
    InteractionLayer: {
      warningThreshold: 8,
      errorThreshold: 15,
    },
  },
} as const;

interface RenderLoopErrorMeta {
  componentName: string;
  renderCount: number;
  sinceFirstRenderMs: number;
  sincePreviousRenderMs: number;
  context?: Record<string, unknown> | undefined;
  propsSnapshot?: Record<string, unknown> | undefined;
  stateSnapshot?: Record<string, unknown> | undefined;
  memorySample?: MemorySample | null;
  stackSnippet?: string;
}

export class RenderLoopDetectedError extends Error {
  readonly meta: RenderLoopErrorMeta;

  constructor(message: string, meta: RenderLoopErrorMeta) {
    super(message);
    this.name = 'RenderLoopDetectedError';
    this.meta = meta;
  }
}
