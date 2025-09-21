import { useRef, useCallback } from 'react';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import { renderDebugLogger, RenderLogEntry } from '@/lib/debug/RenderDebugLogger';
import type { StoreCircuitBreakerSnapshot } from './StoreCircuitBreaker';

// Enhanced render cause analysis
interface RenderCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  propChanges: PropChangeAnalysis[];
  stateChanges: StateChangeAnalysis[];
  contextChanges: ContextChangeAnalysis[];
  hookDependencyChanges: HookDependencyChangeAnalysis[];
  performanceImpact: PerformanceImpact;
  renderOptimizationMisses: OptimizationMiss[];
}

interface PropChangeAnalysis {
  propName: string;
  changeType: 'primitive' | 'object' | 'array' | 'function';
  isSignificant: boolean;
  previousValue: any;
  currentValue: any;
  changeSize: number;
  stabilityScore: number;
}

interface StateChangeAnalysis {
  stateKey: string;
  actionType: string;
  changeSource: string;
  impactLevel: 'low' | 'medium' | 'high';
  cascadeEffect: boolean;
}

interface ContextChangeAnalysis {
  contextName: string;
  providerComponent: string;
  changeImpact: 'local' | 'subtree' | 'global';
  consumers: number;
}

interface HookDependencyChangeAnalysis {
  hookType: string;
  dependencyIndex: number;
  dependencyName: string;
  isStale: boolean;
  changeFrequency: number;
}

interface PerformanceImpact {
  expectedRenderTime: number;
  actualRenderTime: number;
  memoryUsage: number;
  affectedComponents: number;
  renderEfficiency: number;
}

interface OptimizationMiss {
  type: 'memo' | 'useMemo' | 'useCallback' | 'shallow-equal';
  reason: string;
  potentialSavings: number;
  recommendation: string;
}

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
  /**
   * Optional linked store circuit breaker. When provided, the snapshot is merged into diagnostics
   * and can be used to pause rendering when store churn is excessive.
   */
  linkedStoreBreaker?: {
    getSnapshot: () => StoreCircuitBreakerSnapshot;
    label?: string;
  };
  /** Pause rendering when the linked store circuit breaker is open. Defaults to true. */
  pauseWhenStoreBreakerActive?: boolean;
  /** Pause rendering when this render guard's circuit breaker is active. Defaults to true. */
  pauseWhenCircuitBreakerActive?: boolean;
  /** Apply adaptive threshold scaling when store churn is high. Defaults to true. */
  adaptiveThresholdScale?: boolean;
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
  /** Whether consumers should pause heavy work to allow the system to recover. */
  shouldPause: boolean;
  /** Snapshot of the linked store circuit breaker, if configured. */
  storeBreakerSnapshot?: StoreCircuitBreakerSnapshot;
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
  renderCauseHistory: RenderCauseAnalysis[];
  propStabilityTracker: Map<string, { stable: number; unstable: number; lastValue: any }>;
  contextStabilityTracker: Map<string, { changes: number; lastValue: any }>;
  hookDependencyTracker: Map<string, { changes: number; lastValues: any[] }>;
  renderTriggerPatterns: Map<string, number>;
  optimizationMissCount: number;
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
  shouldPause: false,
  storeBreakerSnapshot: undefined,
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

const analyzeRenderCause = (
  componentName: string,
  propsSnapshot?: Record<string, unknown>,
  stateSnapshot?: Record<string, unknown>,
  previousPropsSnapshot?: Record<string, unknown>,
  previousStateSnapshot?: Record<string, unknown>,
  contextSnapshot?: Record<string, unknown>,
  previousContextSnapshot?: Record<string, unknown>
): RenderCauseAnalysis => {
  const propChanges: PropChangeAnalysis[] = [];
  const stateChanges: StateChangeAnalysis[] = [];
  const contextChanges: ContextChangeAnalysis[] = [];
  const contributingFactors: string[] = [];
  let primaryCause = 'unknown';

  // Analyze prop changes
  if (propsSnapshot && previousPropsSnapshot) {
    Object.keys(propsSnapshot).forEach(propName => {
      const currentValue = propsSnapshot[propName];
      const previousValue = previousPropsSnapshot[propName];

      if (currentValue !== previousValue) {
        const changeType = determineChangeType(currentValue);
        const changeSize = calculateChangeSize(previousValue, currentValue);
        const isSignificant = isSignificantChange(previousValue, currentValue, changeType);

        propChanges.push({
          propName,
          changeType,
          isSignificant,
          previousValue,
          currentValue,
          changeSize,
          stabilityScore: calculateStabilityScore(propName, previousValue, currentValue),
        });

        if (isSignificant) {
          contributingFactors.push(`prop.${propName}`);
          if (primaryCause === 'unknown') {
            primaryCause = `prop-change:${propName}`;
          }
        }
      }
    });
  }

  // Analyze state changes
  if (stateSnapshot && previousStateSnapshot) {
    Object.keys(stateSnapshot).forEach(stateKey => {
      const currentValue = stateSnapshot[stateKey];
      const previousValue = previousStateSnapshot[stateKey];

      if (currentValue !== previousValue) {
        stateChanges.push({
          stateKey,
          actionType: inferActionType(stateKey, previousValue, currentValue),
          changeSource: 'internal',
          impactLevel: calculateImpactLevel(previousValue, currentValue),
          cascadeEffect: mayTriggerCascade(stateKey, currentValue),
        });

        contributingFactors.push(`state.${stateKey}`);
        if (primaryCause === 'unknown') {
          primaryCause = `state-change:${stateKey}`;
        }
      }
    });
  }

  // Analyze context changes
  if (contextSnapshot && previousContextSnapshot) {
    Object.keys(contextSnapshot).forEach(contextKey => {
      const currentValue = contextSnapshot[contextKey];
      const previousValue = previousContextSnapshot[contextKey];

      if (currentValue !== previousValue) {
        contextChanges.push({
          contextName: contextKey,
          providerComponent: 'unknown',
          changeImpact: 'subtree',
          consumers: 1,
        });

        contributingFactors.push(`context.${contextKey}`);
        if (primaryCause === 'unknown') {
          primaryCause = `context-change:${contextKey}`;
        }
      }
    });
  }

  // If no specific changes detected, try to infer from patterns
  if (primaryCause === 'unknown') {
    if (propChanges.length > 0) {
      primaryCause = 'props-updated';
    } else if (stateChanges.length > 0) {
      primaryCause = 'state-updated';
    } else if (contextChanges.length > 0) {
      primaryCause = 'context-updated';
    } else {
      primaryCause = 'forced-update';
    }
  }

  return {
    primaryCause,
    contributingFactors,
    propChanges,
    stateChanges,
    contextChanges,
    hookDependencyChanges: [], // TODO: Implement hook dependency tracking
    performanceImpact: {
      expectedRenderTime: 0,
      actualRenderTime: 0,
      memoryUsage: 0,
      affectedComponents: 1,
      renderEfficiency: 100,
    },
    renderOptimizationMisses: detectOptimizationMisses(propChanges, stateChanges),
  };
};

const determineChangeType = (value: any): 'primitive' | 'object' | 'array' | 'function' => {
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'primitive';
};

const calculateChangeSize = (oldValue: any, newValue: any): number => {
  if (typeof oldValue === 'string' && typeof newValue === 'string') {
    return Math.abs(newValue.length - oldValue.length);
  }
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    return Math.abs(newValue.length - oldValue.length);
  }
  if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue && newValue) {
    const oldKeys = Object.keys(oldValue).length;
    const newKeys = Object.keys(newValue).length;
    return Math.abs(newKeys - oldKeys);
  }
  return 1;
};

const isSignificantChange = (oldValue: any, newValue: any, changeType: string): boolean => {
  if (changeType === 'primitive') {
    return oldValue !== newValue;
  }
  if (changeType === 'function') {
    return oldValue !== newValue; // Function reference change is always significant
  }
  if (changeType === 'array') {
    return !Array.isArray(oldValue) || !Array.isArray(newValue) ||
           oldValue.length !== newValue.length ||
           !oldValue.every((item, index) => item === newValue[index]);
  }
  if (changeType === 'object') {
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }
  return true;
};

const calculateStabilityScore = (propName: string, oldValue: any, newValue: any): number => {
  // Higher score means more stable (0-100)
  if (oldValue === newValue) return 100;
  if (typeof oldValue !== typeof newValue) return 0;

  if (typeof oldValue === 'function') {
    return oldValue === newValue ? 100 : 0;
  }

  if (typeof oldValue === 'object' && oldValue && newValue) {
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);
    if (oldKeys.length !== newKeys.length) return 25;

    const sameKeys = oldKeys.every(key => newKeys.includes(key));
    if (!sameKeys) return 25;

    const sameValues = oldKeys.every(key => oldValue[key] === newValue[key]);
    return sameValues ? 100 : 50;
  }

  return 75; // Primitive value change
};

const inferActionType = (stateKey: string, oldValue: any, newValue: any): string => {
  if (oldValue === undefined && newValue !== undefined) return 'set';
  if (oldValue !== undefined && newValue === undefined) return 'unset';
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (newValue.length > oldValue.length) return 'add';
    if (newValue.length < oldValue.length) return 'remove';
    return 'update';
  }
  return 'update';
};

const calculateImpactLevel = (oldValue: any, newValue: any): 'low' | 'medium' | 'high' => {
  const changeSize = calculateChangeSize(oldValue, newValue);
  if (changeSize === 0) return 'low';
  if (changeSize < 5) return 'low';
  if (changeSize < 20) return 'medium';
  return 'high';
};

const mayTriggerCascade = (stateKey: string, newValue: any): boolean => {
  // Heuristics to detect if a state change might trigger cascade updates
  if (stateKey.includes('selected') || stateKey.includes('active')) return true;
  if (stateKey.includes('components') || stateKey.includes('connections')) return true;
  if (Array.isArray(newValue) && newValue.length > 10) return true;
  return false;
};

const detectOptimizationMisses = (
  propChanges: PropChangeAnalysis[],
  stateChanges: StateChangeAnalysis[]
): OptimizationMiss[] => {
  const misses: OptimizationMiss[] = [];

  // Detect unstable function props
  const unstableFunctions = propChanges.filter(change =>
    change.changeType === 'function' && change.stabilityScore < 50
  );

  if (unstableFunctions.length > 0) {
    misses.push({
      type: 'useCallback',
      reason: `Unstable function props: ${unstableFunctions.map(f => f.propName).join(', ')}`,
      potentialSavings: unstableFunctions.length * 5, // Estimated ms saved
      recommendation: 'Wrap function props with useCallback to maintain reference stability',
    });
  }

  // Detect unstable object props
  const unstableObjects = propChanges.filter(change =>
    change.changeType === 'object' && change.stabilityScore < 75
  );

  if (unstableObjects.length > 0) {
    misses.push({
      type: 'useMemo',
      reason: `Unstable object props: ${unstableObjects.map(o => o.propName).join(', ')}`,
      potentialSavings: unstableObjects.length * 3,
      recommendation: 'Memoize object props with useMemo or move them outside the component',
    });
  }

  // Detect potential memo optimization
  if (propChanges.length > 5) {
    misses.push({
      type: 'memo',
      reason: `Component receives many props (${propChanges.length})`,
      potentialSavings: 10,
      recommendation: 'Consider wrapping component with React.memo',
    });
  }

  return misses;
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
    renderCauseHistory: [],
    propStabilityTracker: new Map(),
    contextStabilityTracker: new Map(),
    hookDependencyTracker: new Map(),
    renderTriggerPatterns: new Map(),
    optimizationMissCount: 0,
  });

  const previousSnapshotsRef = useRef<{
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }>({});

  const resolvedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } satisfies typeof DEFAULT_OPTIONS & RenderGuardOptions;

  if (import.meta.env.PROD) {
    return PROD_HANDLE;
  }

  const pauseWhenCircuitBreakerActive = options.pauseWhenCircuitBreakerActive ?? true;
  const pauseWhenStoreBreakerActive = options.pauseWhenStoreBreakerActive ?? true;
  const adaptiveThresholdScale = options.adaptiveThresholdScale ?? true;

  const timestamp = now();
  const state = stateRef.current;

  const storeBreakerSnapshot = options.linkedStoreBreaker?.getSnapshot();

  const timeSincePreviousRender = state.previousRenderAt
    ? timestamp - state.previousRenderAt
    : 0;

  state.renderCount += 1;
  state.previousRenderAt = timestamp;

  const sinceFirstRenderMs = timestamp - state.firstRenderAt;

  const thresholdScale =
    adaptiveThresholdScale && storeBreakerSnapshot
      ? storeBreakerSnapshot.open
        ? 0.5
        : storeBreakerSnapshot.updatesInWindow > 12
        ? 0.75
        : 1
      : 1;

  const warningThreshold = Math.max(3, Math.floor(resolvedOptions.warningThreshold * thresholdScale));
  const errorThreshold = Math.max(warningThreshold + 2, Math.floor(resolvedOptions.errorThreshold * thresholdScale));

  if (resolvedOptions.trackInAnalytics) {
    RenderAnalytics.getInstance().recordRender(componentName);
  }

  const contextPayload = resolveContext(options.context);
  const propsSnapshot = safeSnapshot(options.propsSnapshot);
  const stateSnapshot = safeSnapshot(options.stateSnapshot);
  const combinedSnapshot = propsSnapshot || stateSnapshot ? { propsSnapshot, stateSnapshot } : undefined;
  const snapshotHash = hashSnapshot(combinedSnapshot ?? contextPayload);

  // Enhanced render cause analysis
  const renderCauseAnalysis = analyzeRenderCause(
    componentName,
    propsSnapshot,
    stateSnapshot,
    previousSnapshotsRef.current.props,
    previousSnapshotsRef.current.state,
    contextPayload,
    previousSnapshotsRef.current.context
  );

  // Update render trigger patterns
  state.renderTriggerPatterns.set(
    renderCauseAnalysis.primaryCause,
    (state.renderTriggerPatterns.get(renderCauseAnalysis.primaryCause) || 0) + 1
  );

  // Track prop stability
  renderCauseAnalysis.propChanges.forEach(propChange => {
    const tracker = state.propStabilityTracker.get(propChange.propName) || { stable: 0, unstable: 0, lastValue: undefined };
    if (propChange.isSignificant) {
      tracker.unstable += 1;
    } else {
      tracker.stable += 1;
    }
    tracker.lastValue = propChange.currentValue;
    state.propStabilityTracker.set(propChange.propName, tracker);
  });

  // Track optimization misses
  state.optimizationMissCount += renderCauseAnalysis.renderOptimizationMisses.length;

  // Add to render cause history
  state.renderCauseHistory.push(renderCauseAnalysis);
  if (state.renderCauseHistory.length > 20) {
    state.renderCauseHistory.shift();
  }

  // Update previous snapshots for next comparison
  previousSnapshotsRef.current = {
    props: propsSnapshot,
    state: stateSnapshot,
    context: contextPayload,
  };

  const memorySample = sampleMemory(state, timestamp, resolvedOptions.memorySampleIntervalMs);

  const enrichedContext = storeBreakerSnapshot
    ? {
        ...(contextPayload ?? {}),
        storeBreaker: {
          open: storeBreakerSnapshot.open,
          updatesInWindow: storeBreakerSnapshot.updatesInWindow,
          totalUpdates: storeBreakerSnapshot.totalUpdates,
          reason: storeBreakerSnapshot.reason,
        },
        renderCauseAnalysis: {
          primaryCause: renderCauseAnalysis.primaryCause,
          contributingFactors: renderCauseAnalysis.contributingFactors,
          propChangesCount: renderCauseAnalysis.propChanges.length,
          stateChangesCount: renderCauseAnalysis.stateChanges.length,
          optimizationMissesCount: renderCauseAnalysis.renderOptimizationMisses.length,
        },
        propStability: Object.fromEntries(
          Array.from(state.propStabilityTracker.entries()).map(([prop, tracker]) => [
            prop,
            {
              stabilityRate: (tracker.stable / (tracker.stable + tracker.unstable)) * 100,
              totalChanges: tracker.stable + tracker.unstable,
            }
          ])
        ),
        renderTriggerPatterns: Object.fromEntries(state.renderTriggerPatterns),
      }
    : {
        ...(contextPayload ?? {}),
        renderCauseAnalysis: {
          primaryCause: renderCauseAnalysis.primaryCause,
          contributingFactors: renderCauseAnalysis.contributingFactors,
          propChangesCount: renderCauseAnalysis.propChanges.length,
          stateChangesCount: renderCauseAnalysis.stateChanges.length,
          optimizationMissesCount: renderCauseAnalysis.renderOptimizationMisses.length,
        },
        propStability: Object.fromEntries(
          Array.from(state.propStabilityTracker.entries()).map(([prop, tracker]) => [
            prop,
            {
              stabilityRate: (tracker.stable / (tracker.stable + tracker.unstable)) * 100,
              totalChanges: tracker.stable + tracker.unstable,
            }
          ])
        ),
        renderTriggerPatterns: Object.fromEntries(state.renderTriggerPatterns),
      };

  const logPayload = () => ({
    component: componentName,
    componentId: resolvedOptions.componentId,
    renderCount: state.renderCount,
    warningThreshold,
    errorThreshold,
    sinceFirstRenderMs,
    sincePreviousRenderMs: timeSincePreviousRender,
    context: enrichedContext,
    propsSnapshot,
    stateSnapshot,
    snapshotHash,
    memorySample,
    storeBreaker: storeBreakerSnapshot
      ? {
          name: storeBreakerSnapshot.name,
          open: storeBreakerSnapshot.open,
          updatesInWindow: storeBreakerSnapshot.updatesInWindow,
          totalUpdates: storeBreakerSnapshot.totalUpdates,
          reason: storeBreakerSnapshot.reason,
          openUntil: storeBreakerSnapshot.openUntil,
        }
      : undefined,
    stack: resolvedOptions.includeStackTrace ? new Error().stack : undefined,
    renderCauseAnalysis,
    propStability: Object.fromEntries(
      Array.from(state.propStabilityTracker.entries()).map(([prop, tracker]) => [
        prop,
        {
          stabilityRate: (tracker.stable / (tracker.stable + tracker.unstable)) * 100,
          totalChanges: tracker.stable + tracker.unstable,
          isProblematic: tracker.unstable > tracker.stable,
        }
      ])
    ),
    renderOptimizations: {
      missCount: state.optimizationMissCount,
      suggestions: renderCauseAnalysis.renderOptimizationMisses,
      triggerPatterns: Object.fromEntries(state.renderTriggerPatterns),
    },
  });

  // Log detailed render cause analysis
  if (import.meta.env.DEV && (renderCauseAnalysis.propChanges.length > 0 || renderCauseAnalysis.stateChanges.length > 0)) {
    console.debug(`[RenderGuard:${componentName}] Render cause analysis:`, {
      renderCount: state.renderCount,
      primaryCause: renderCauseAnalysis.primaryCause,
      contributingFactors: renderCauseAnalysis.contributingFactors,
      propChanges: renderCauseAnalysis.propChanges.map(pc => ({
        prop: pc.propName,
        type: pc.changeType,
        significant: pc.isSignificant,
        stability: pc.stabilityScore,
      })),
      stateChanges: renderCauseAnalysis.stateChanges.map(sc => ({
        state: sc.stateKey,
        action: sc.actionType,
        impact: sc.impactLevel,
      })),
      optimizationMisses: renderCauseAnalysis.renderOptimizationMisses.map(om => ({
        type: om.type,
        reason: om.reason,
        savings: `${om.potentialSavings}ms`,
      })),
      propStabilityReport: Object.fromEntries(
        Array.from(state.propStabilityTracker.entries())
          .filter(([, tracker]) => tracker.unstable > 2)
          .map(([prop, tracker]) => [
            prop,
            `${((tracker.stable / (tracker.stable + tracker.unstable)) * 100).toFixed(1)}% stable`,
          ])
      ),
    });
  }

  // Integrate with RenderDebugLogger
  if (state.renderCount % 5 === 0 || renderCauseAnalysis.renderOptimizationMisses.length > 0) {
    const renderLogEntry: Partial<RenderLogEntry> = {
      componentName,
      renderCount: state.renderCount,
      renderDuration: timeSincePreviousRender,
      triggerReason: renderCauseAnalysis.primaryCause,
      propChanges: renderCauseAnalysis.propChanges.map(pc => ({
        propName: pc.propName,
        oldValue: pc.previousValue,
        newValue: pc.currentValue,
        changeType: pc.changeType as any,
        isDeepChange: pc.changeType !== 'primitive',
        changeSize: pc.changeSize,
      })),
      stateChanges: renderCauseAnalysis.stateChanges.map(sc => ({
        stateName: sc.stateKey,
        oldValue: undefined,
        newValue: undefined,
        changeSource: sc.changeSource,
        actionType: sc.actionType,
      })),
      performanceMetrics: {
        renderDuration: timeSincePreviousRender,
        componentUpdateTime: timeSincePreviousRender,
        diffTime: 0,
        reconciliationTime: 0,
        memoryUsage: memorySample?.usedJSHeapSize,
        memoryDelta: memorySample?.deltaSinceBaseline,
      },
      renderOptimizations: renderCauseAnalysis.renderOptimizationMisses.map(om => ({
        type: om.type as any,
        status: 'miss' as const,
        reason: om.reason,
        costSaved: om.potentialSavings,
      })),
    };

    renderDebugLogger.logRender(renderLogEntry);
  }

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
    context: enrichedContext,
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
      state.renderCount >= warningThreshold &&
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
    (state.renderCount >= errorThreshold || detectionResult.shouldThrowSyntheticError) &&
    state.lastSyntheticErrorAt !== state.renderCount;

  if (state.renderCount >= errorThreshold && state.renderCount !== state.lastErrorCount) {
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
      context: enrichedContext,
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

  const reset = useCallback(() => {
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
    state.renderCauseHistory = [];
    state.propStabilityTracker.clear();
    state.contextStabilityTracker.clear();
    state.hookDependencyTracker.clear();
    state.renderTriggerPatterns.clear();
    state.optimizationMissCount = 0;
    detector.markComponentReset(componentName);
    renderDebugLogger.reset(componentName);
  }, [componentName]);

  const shouldPauseDueToCircuit = pauseWhenCircuitBreakerActive && circuitBreakerActive;
  const shouldPauseDueToStore =
    pauseWhenStoreBreakerActive && !!storeBreakerSnapshot && storeBreakerSnapshot.open;
  const shouldPause = shouldPauseDueToCircuit || shouldPauseDueToStore;

  return {
    renderCount: state.renderCount,
    sinceFirstRenderMs,
    sincePreviousRenderMs: timeSincePreviousRender,
    circuitBreakerActive,
    circuitBreakerResetAt: circuitBreakerActive ? state.circuitBreakerOpenUntil : null,
    shouldPause,
    storeBreakerSnapshot,
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
    if (import.meta.env.PROD) return;
    const entry = this.ensureEntry(componentName);
    entry.totalRenders += 1;
  }

  recordWarning(componentName: string): void {
    if (import.meta.env.PROD) return;
    const entry = this.ensureEntry(componentName);
    entry.warnings += 1;
    entry.lastWarningAt = now();
  }

  recordInfiniteLoop(componentName: string): void {
    if (import.meta.env.PROD) return;
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
  store: {
    default: {
      warningThreshold: 12,
      errorThreshold: 18,
    },
    aggressive: {
      warningThreshold: 8,
      errorThreshold: 12,
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
