// src/stores/canvasStore.ts
// Zustand store for canvas state management with middleware
// Centralizes components, connections, infoCards, and UI state to reduce re-renders
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/shared/hooks/canvas/useUndoRedo.ts, src/features/canvas/types.ts, src/types/canvas.ts

import { temporal } from 'zundo';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { immer } from 'zustand/middleware/immer';
import type { Connection, DesignComponent, InfoCard } from '@shared/contracts';

import { StoreCircuitBreaker } from '@/lib/performance/StoreCircuitBreaker';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';

type EqualityDifference = { path: string; reason: string };

interface DeepEqualContext {
  path: string;
  differences: EqualityDifference[];
  visitedPairs: WeakMap<object, WeakSet<object>>;
  depth: number;
}

const equalityDiagnostics: EqualityDifference[] = [];
const objectHashCache = new WeakMap<object, string>();

const MAX_DIAGNOSTIC_ENTRIES = 25;

const recordDifference = (context: DeepEqualContext, reason: string) => {
  if (context.differences.length >= MAX_DIAGNOSTIC_ENTRIES) return;
  context.differences.push({ path: context.path, reason });
};

const createChildContext = (context: DeepEqualContext, segment: string): DeepEqualContext => ({
  path: `${context.path}${segment}`,
  differences: context.differences,
  visitedPairs: context.visitedPairs,
  depth: context.depth + 1,
});

const markVisited = (context: DeepEqualContext, a: object, b: object) => {
  let visitedForA = context.visitedPairs.get(a);
  if (!visitedForA) {
    visitedForA = new WeakSet<object>();
    context.visitedPairs.set(a, visitedForA);
  }
  if (visitedForA.has(b)) {
    return true;
  }
  visitedForA.add(b);
  return false;
};

const stableHash = (value: unknown, visited = new WeakSet<object>()): string => {
  const valueType = typeof value;
  if (value == null) return `${value}`;
  if (valueType === 'number' || valueType === 'boolean' || valueType === 'bigint') {
    return `${valueType}:${value}`;
  }
  if (valueType === 'string') {
    return `string:${value}`;
  }
  if (valueType === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return `function:${fn.name || 'anonymous'}`;
  }
  if (value instanceof Date) {
    return `date:${value.getTime()}`;
  }
  if (value instanceof RegExp) {
    return `regexp:${value.source}/${value.flags}`;
  }
  if (Array.isArray(value)) {
    return `array:[${value.map(item => stableHash(item, visited)).join('|')}]`;
  }
  if (value instanceof Map) {
    const entries = Array.from(value.entries()).sort(([a], [b]) => String(a).localeCompare(String(b)));
    return `map:{${entries
      .map(([key, val]) => `${stableHash(key, visited)}=>${stableHash(val, visited)}`)
      .join('|')}}`;
  }
  if (value instanceof Set) {
    const entries = Array.from(value.values())
      .map(item => stableHash(item, visited))
      .sort();
    return `set:{${entries.join('|')}}`;
  }
  if (valueType === 'object') {
    const objectValue = value as Record<string, unknown>;
    if (visited.has(objectValue)) {
      return 'circular';
    }
    visited.add(objectValue);
    const cached = objectHashCache.get(objectValue);
    if (cached) {
      visited.delete(objectValue);
      return cached;
    }
    const keys = Object.keys(objectValue).sort();
    const hashed = `object:{${keys
      .map(key => `${key}:${stableHash(objectValue[key], visited)}`)
      .join('|')}}`;
    objectHashCache.set(objectValue, hashed);
    visited.delete(objectValue);
    return hashed;
  }
  return `${valueType}:unknown`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepCompare = (a: any, b: any, context: DeepEqualContext): boolean => {
  if (Object.is(a, b)) {
    return true;
  }

  if (a == null || b == null) {
    recordDifference(context, 'One value is null/undefined while the other is not');
    return false;
  }

  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) {
    recordDifference(context, `Type mismatch (${typeA} vs ${typeB})`);
    return false;
  }

  if (typeA !== 'object') {
    recordDifference(context, `Primitive inequality (${String(a)} vs ${String(b)})`);
    return false;
  }

  if (a instanceof Date && b instanceof Date) {
    const equal = a.getTime() === b.getTime();
    if (!equal) {
      recordDifference(context, `Date mismatch (${a.toISOString()} vs ${b.toISOString()})`);
    }
    return equal;
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    const equal = a.source === b.source && a.flags === b.flags;
    if (!equal) {
      recordDifference(context, `RegExp mismatch (${a.toString()} vs ${b.toString()})`);
    }
    return equal;
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      recordDifference(context, 'Left value is an array while right value is not');
      return false;
    }

    if (a.length !== b.length) {
      recordDifference(context, `Array length mismatch (${a.length} vs ${b.length})`);
      return false;
    }

    const largeArray = a.length > 50;
    if (largeArray) {
      const hashA = stableHash(a);
      const hashB = stableHash(b);
      if (hashA !== hashB) {
        recordDifference(context, `Array hash mismatch (${hashA} vs ${hashB})`);
        return false;
      }
    }

    const checkpoints = new Set([0, a.length - 1, Math.floor(a.length / 2)]);
    for (const checkpoint of checkpoints) {
      if (checkpoint >= 0 && checkpoint < a.length) {
        const childContext = createChildContext(context, `[${checkpoint}]`);
        if (!deepCompare(a[checkpoint], b[checkpoint], childContext)) {
          return false;
        }
      }
    }

    for (let index = 0; index < a.length; index += 1) {
      const childContext = createChildContext(context, `[${index}]`);
      if (!deepCompare(a[index], b[index], childContext)) {
        return false;
      }
    }
    return true;
  }

  if (markVisited(context, a, b)) {
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) {
    recordDifference(context, `Object key length mismatch (${keysA.length} vs ${keysB.length})`);
    return false;
  }

  keysA.sort();
  keysB.sort();

  for (let index = 0; index < keysA.length; index += 1) {
    if (keysA[index] !== keysB[index]) {
      recordDifference(context, `Object keys differ at index ${index} (${keysA[index]} vs ${keysB[index]})`);
      return false;
    }
  }

  if (keysA.length > 25) {
    const hashA = stableHash(a);
    const hashB = stableHash(b);
    if (hashA !== hashB) {
      recordDifference(context, `Object hash mismatch (${hashA} vs ${hashB})`);
      return false;
    }
  }

  for (const key of keysA) {
    const childContext = createChildContext(context, `.${key}`);
    if (!deepCompare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], childContext)) {
      return false;
    }
  }

  return true;
};

// Enhanced deep equality comparison with performance optimizations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepEqual(a: any, b: any): boolean {
  equalityDiagnostics.length = 0;
  const context: DeepEqualContext = {
    path: '$',
    differences: [],
    visitedPairs: new WeakMap<object, WeakSet<object>>(),
    depth: 0,
  };

  const equal = deepCompare(a, b, context);

  if (!equal && context.differences.length > 0) {
    equalityDiagnostics.push(...context.differences.slice(0, MAX_DIAGNOSTIC_ENTRIES));
  }

  return equal;
}

const getLastEqualityDiagnostics = () => equalityDiagnostics.slice(0, MAX_DIAGNOSTIC_ENTRIES);

const ensureSerializable = (value: unknown, label: string) => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const stack: Array<{ value: unknown; path: string }> = [{ value, path: label }];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const currentValue = current.value;
    if (!currentValue || typeof currentValue !== 'object') {
      continue;
    }

    const objectValue = currentValue as Record<string, unknown>;
    if (seen.has(objectValue)) {
      console.warn('[CanvasStore] Circular reference detected in', current.path);
      return;
    }
    seen.add(objectValue);

    for (const key of Object.keys(objectValue)) {
      stack.push({ value: objectValue[key], path: `${current.path}.${key}` });
    }
  }

  try {
    JSON.stringify(value);
  } catch (error) {
    console.warn('[CanvasStore] Non-serializable value detected in', label, error);
  }
};

// Action tracking for detailed debugging
interface ActionTrace {
  action: string;
  timestamp: number;
  source: string;
  callStack: string;
  payloadHash: string;
  frequency: number;
  isRapidFire: boolean;
  causedByAction?: string;
  renderImpact: {
    componentsAffected: number;
    connectionsAffected: number;
    infoCardsAffected: number;
  };
}

interface ActionFrequencyTracker {
  count: number;
  lastTimestamp: number;
  rapidFireThreshold: number;
}

const actionHistory: ActionTrace[] = [];
const actionFrequency = new Map<string, ActionFrequencyTracker>();
const MAX_ACTION_HISTORY = 100;
const RAPID_FIRE_WINDOW_MS = 100;
const RAPID_FIRE_COUNT_THRESHOLD = 3;

// Enhanced debug logging with performance tracking and stack traces
const debugMetrics = {
  updateCount: 0,
  lastUpdateTime: 0,
  avgEqualityCheckTime: 0,
  actionTraceCount: 0,
  lastActionTrace: null as ActionTrace | null,
  renderCauseAnalysis: {
    frequentActions: new Map<string, number>(),
    renderLoopPatterns: [] as string[],
    suspiciousActionChains: [] as string[][],
  },
};

interface DebugLogOptions {
  skipEqualityCheck?: boolean;
  actionTrace?: ActionTrace;
}

const generateCallStack = (): string => {
  const stack = new Error().stack || '';
  return stack
    .split('\n')
    .slice(3, 8)
    .map(line => line.trim())
    .filter(line => !line.includes('node_modules'))
    .join(' → ');
};

const calculateRenderImpact = (action: string, newValue: any): ActionTrace['renderImpact'] => {
  let componentsAffected = 0;
  let connectionsAffected = 0;
  let infoCardsAffected = 0;

  if (action.includes('Component') || action.includes('component')) {
    componentsAffected = Array.isArray(newValue) ? newValue.length : 1;
  }
  if (action.includes('Connection') || action.includes('connection')) {
    connectionsAffected = Array.isArray(newValue) ? newValue.length : 1;
  }
  if (action.includes('InfoCard') || action.includes('infoCard')) {
    infoCardsAffected = Array.isArray(newValue) ? newValue.length : 1;
  }

  return { componentsAffected, connectionsAffected, infoCardsAffected };
};

const trackActionFrequency = (action: string): { frequency: number; isRapidFire: boolean } => {
  const now = Date.now();
  const tracker = actionFrequency.get(action) || {
    count: 0,
    lastTimestamp: 0,
    rapidFireThreshold: RAPID_FIRE_COUNT_THRESHOLD,
  };

  if (now - tracker.lastTimestamp < RAPID_FIRE_WINDOW_MS) {
    tracker.count += 1;
  } else {
    tracker.count = 1;
  }

  tracker.lastTimestamp = now;
  actionFrequency.set(action, tracker);

  const isRapidFire = tracker.count >= tracker.rapidFireThreshold;
  return { frequency: tracker.count, isRapidFire };
};

const createActionTrace = (action: string, newValue: any, source?: string): ActionTrace => {
  const timestamp = Date.now();
  const callStack = generateCallStack();
  const payloadHash = stableHash(newValue);
  const { frequency, isRapidFire } = trackActionFrequency(action);
  const renderImpact = calculateRenderImpact(action, newValue);

  const trace: ActionTrace = {
    action,
    timestamp,
    source: source || 'unknown',
    callStack,
    payloadHash,
    frequency,
    isRapidFire,
    renderImpact,
  };

  // Detect action chains that might cause render loops
  const lastTrace = debugMetrics.lastActionTrace;
  if (lastTrace && timestamp - lastTrace.timestamp < 50) {
    trace.causedByAction = lastTrace.action;

    // Detect suspicious action chains
    if (lastTrace.causedByAction === action) {
      const chainPattern = [lastTrace.causedByAction, lastTrace.action, action];
      debugMetrics.renderCauseAnalysis.suspiciousActionChains.push(chainPattern);

      if (process.env.NODE_ENV === 'development') {
        console.warn('[CanvasStore] Suspicious action chain detected:', chainPattern.join(' → '));
      }
    }
  }

  // Track render loop patterns
  if (isRapidFire) {
    const pattern = `${action}-rapid-${frequency}`;
    if (!debugMetrics.renderCauseAnalysis.renderLoopPatterns.includes(pattern)) {
      debugMetrics.renderCauseAnalysis.renderLoopPatterns.push(pattern);
    }
  }

  debugMetrics.renderCauseAnalysis.frequentActions.set(
    action,
    (debugMetrics.renderCauseAnalysis.frequentActions.get(action) || 0) + 1
  );

  actionHistory.push(trace);
  if (actionHistory.length > MAX_ACTION_HISTORY) {
    actionHistory.shift();
  }

  debugMetrics.actionTraceCount += 1;
  debugMetrics.lastActionTrace = trace;

  return trace;
};

const analyzeRenderCause = (action: string, trace: ActionTrace): string[] => {
  const causes: string[] = [];

  if (trace.isRapidFire) {
    causes.push(`Rapid-fire action (${trace.frequency} times in ${RAPID_FIRE_WINDOW_MS}ms)`);
  }

  if (trace.causedByAction) {
    causes.push(`Triggered by previous action: ${trace.causedByAction}`);
  }

  const recentSimilarActions = actionHistory
    .slice(-10)
    .filter(t => t.action === action && t.timestamp !== trace.timestamp).length;

  if (recentSimilarActions >= 3) {
    causes.push(`Repeated action (${recentSimilarActions} similar actions in recent history)`);
  }

  if (trace.renderImpact.componentsAffected + trace.renderImpact.connectionsAffected + trace.renderImpact.infoCardsAffected > 50) {
    causes.push('Large payload affecting many entities');
  }

  return causes;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debugLog(action: string, oldValue: any, newValue: any, source?: string, options?: DebugLogOptions) {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    const equal = options?.skipEqualityCheck ? false : deepEqual(oldValue, newValue);
    const endTime = performance.now();
    const equalityCheckTime = options?.skipEqualityCheck ? 0 : endTime - startTime;

    debugMetrics.updateCount++;
    debugMetrics.lastUpdateTime = Date.now();
    debugMetrics.avgEqualityCheckTime =
      (debugMetrics.avgEqualityCheckTime * (debugMetrics.updateCount - 1) + equalityCheckTime) /
      debugMetrics.updateCount;

    // Create action trace for detailed analysis
    const actionTrace = options?.actionTrace || createActionTrace(action, newValue, source);
    const renderCauses = analyzeRenderCause(action, actionTrace);

    if (!equal) {
      const diagnostics = getLastEqualityDiagnostics();
      ensureSerializable(newValue, `${action}.newValue`);
      ensureSerializable(oldValue, `${action}.previousValue`);

      // Enhanced logging with action trace and render cause analysis
      const logPayload = {
        changed: true,
        oldLength: Array.isArray(oldValue) ? oldValue.length : 'N/A',
        newLength: Array.isArray(newValue) ? newValue.length : 'N/A',
        equalityCheckTime: `${equalityCheckTime.toFixed(2)}ms`,
        source: source ?? 'unknown',
        stackTrace: new Error().stack?.split('\n').slice(2, 5).join(' → '),
        diagnostics,
        actionTrace: {
          frequency: actionTrace.frequency,
          isRapidFire: actionTrace.isRapidFire,
          causedByAction: actionTrace.causedByAction,
          renderImpact: actionTrace.renderImpact,
          payloadHash: actionTrace.payloadHash,
        },
        renderCauses,
        debugMetrics: {
          totalActions: debugMetrics.actionTraceCount,
          frequentActions: Array.from(debugMetrics.renderCauseAnalysis.frequentActions.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5),
          renderLoopPatterns: debugMetrics.renderCauseAnalysis.renderLoopPatterns.slice(-5),
          suspiciousChains: debugMetrics.renderCauseAnalysis.suspiciousActionChains.slice(-3),
        },
      };

      // eslint-disable-next-line no-console
      console.debug(`[CanvasStore] ${action}:`, logPayload);

      // Log to diagnostics system
      RenderLoopDiagnostics.getInstance().record('store-action', {
        action,
        actionTrace,
        renderCauses,
        equalityDiagnostics: diagnostics,
        performance: {
          equalityCheckTime,
          avgEqualityCheckTime: debugMetrics.avgEqualityCheckTime,
        },
      });
    }

    // Warn about rapid-fire actions that might cause render loops
    if (actionTrace.isRapidFire) {
      console.warn(
        `[CanvasStore] Rapid-fire action detected: ${action} (${actionTrace.frequency} times)`,
        {
          actionTrace,
          renderCauses,
          suggestion: 'Consider debouncing this action or checking for dependency loops',
        }
      );
    }

    if (!options?.skipEqualityCheck && equalityCheckTime > 5) {
      console.warn(
        `[CanvasStore] Slow equality check for ${action}: ${equalityCheckTime.toFixed(2)}ms`,
        {
          actionTrace,
          suggestion: 'Consider optimizing the payload structure or implementing custom equality checks',
        }
      );
    }
  }
}

function validateCanvasData(data: {
  components?: DesignComponent[];
  connections?: Connection[];
  infoCards?: InfoCard[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.components) {
    const componentIds = new Set<string>();
    for (const component of data.components) {
      if (!component.id || typeof component.id !== 'string') {
        errors.push(`Invalid component ID: ${component.id}`);
      }
      if (componentIds.has(component.id)) {
        errors.push(`Duplicate component ID: ${component.id}`);
      }
      componentIds.add(component.id);

      if (typeof component.x !== 'number' || typeof component.y !== 'number') {
        errors.push(`Invalid position for component ${component.id}`);
      }
    }
  }

  if (data.connections && data.components) {
    const componentIds = new Set(data.components.map(c => c.id));
    for (const connection of data.connections) {
      if (!componentIds.has(connection.from)) {
        errors.push(`Connection references non-existent component: ${connection.from}`);
      }
      if (!componentIds.has(connection.to)) {
        errors.push(`Connection references non-existent component: ${connection.to}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

interface CanvasStoreState {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
  selectedComponent: string | null;
  connectionStart: string | null;
  visualTheme: 'serious' | 'playful';
  _lastUpdateTime: number;
  _updateCount: number;
  _bootstrapped: boolean;
}

export type CanvasState = CanvasStoreState;

interface ActionOptions {
  source?: string;
  context?: Record<string, unknown>;
}

interface ConditionalSetOptions extends ActionOptions {
  onlyIfCurrentIs?: string | null;
  preventWhenCurrentIs?: string | null;
  silent?: boolean;
  markMetrics?: boolean;
}

interface ArrayActionOptions extends ActionOptions {
  silent?: boolean;
  markMetrics?: boolean;
}

interface CommitOptions extends ActionOptions {
  silent?: boolean;
  markMetrics?: boolean;
  payloadSize?: number;
  payloadHash?: string;
  timestamp?: number;
}

interface UpdateCanvasDataOptions extends ActionOptions {
  immediate?: boolean;
  validate?: boolean;
  silent?: boolean;
}

interface PendingCanvasUpdate {
  data: Partial<Pick<CanvasStoreState, 'components' | 'connections' | 'infoCards'>>;
  options: UpdateCanvasDataOptions;
}

let batchUpdateTimeout: NodeJS.Timeout | null = null;
const pendingUpdates: PendingCanvasUpdate[] = [];
let circuitBreakerRetryTimeout: NodeJS.Timeout | null = null;

interface CanvasActions {
  setComponents: (components: DesignComponent[], options?: ArrayActionOptions) => void;
  setConnections: (connections: Connection[], options?: ArrayActionOptions) => void;
  setInfoCards: (infoCards: InfoCard[], options?: ArrayActionOptions) => void;
  setSelectedComponent: (id: string | null, options?: ConditionalSetOptions) => void;
  setConnectionStart: (id: string | null, options?: ConditionalSetOptions) => void;
  setVisualTheme: (theme: 'serious' | 'playful', options?: ConditionalSetOptions) => void;
  updateComponents: (
    updater: (components: DesignComponent[]) => DesignComponent[],
    options?: ArrayActionOptions
  ) => void;
  updateConnections: (
    updater: (connections: Connection[]) => Connection[],
    options?: ArrayActionOptions
  ) => void;
  updateInfoCards: (
    updater: (infoCards: InfoCard[]) => InfoCard[],
    options?: ArrayActionOptions
  ) => void;
  updateCanvasData: (
    data: Partial<Pick<CanvasStoreState, 'components' | 'connections' | 'infoCards'>>,
    options?: UpdateCanvasDataOptions
  ) => void;
  resetCanvas: (reason?: string) => void;
  getDebugInfo: () => typeof debugMetrics;
}

const initialState: CanvasStoreState = {
  components: [],
  connections: [],
  infoCards: [],
  selectedComponent: null,
  connectionStart: null,
  visualTheme: 'serious',
  _lastUpdateTime: 0,
  _updateCount: 0,
  _bootstrapped: false,
};

export const useCanvasStore = create<CanvasStoreState>()(
  subscribeWithSelector(
    persist(
      temporal(
        immer(() => initialState),
        {
          limit: 50,
          partialize: state => ({
            components: state.components,
            connections: state.connections,
            infoCards: state.infoCards,
          }),
        }
      ),
      {
        name: 'canvas-storage',
        partialize: state => ({
          visualTheme: state.visualTheme,
        }),
      }
    )
  )
);

export const canvasStoreCircuitBreaker = new StoreCircuitBreaker({
  name: 'CanvasStore',
  componentId: 'zustand.canvas',
  windowMs: 180,
  warningThreshold: 12,
  errorThreshold: 18,
  cooldownMs: 3000,
  warningIntervalMs: 600,
});

const buildCommitContext = (options?: CommitOptions): Record<string, unknown> | undefined => {
  if (!options) return undefined;
  const context: Record<string, unknown> = {};
  if (options.source) {
    context.source = options.source;
  }
  if (options.context) {
    Object.assign(context, options.context);
  }
  if (options.silent) {
    context.silent = true;
  }
  if (options.markMetrics === false) {
    context.metricsSuppressed = true;
  }
  return Object.keys(context).length ? context : undefined;
};

const recordNoChange = (action: string, options?: CommitOptions) => {
  canvasStoreCircuitBreaker.record({
    action,
    changed: false,
    context: buildCommitContext(options),
  });
};

const commitStateMutation = (
  action: string,
  mutator: (draft: CanvasStoreState) => void,
  options?: CommitOptions
) => {
  if (!canvasStoreCircuitBreaker.shouldAllow(action)) {
    return;
  }
  const timestamp = options?.timestamp ?? Date.now();

  useCanvasStore.setState(state => {
    mutator(state);
    if (options?.markMetrics !== false) {
      state._lastUpdateTime = timestamp;
      state._updateCount += 1;
    }
    if (options?.silent && !state._bootstrapped) {
      state._bootstrapped = true;
    }
  }, false);

  canvasStoreCircuitBreaker.record({
    action,
    changed: true,
    timestamp,
    payloadSize: options?.payloadSize,
    payloadHash: options?.payloadHash,
    context: buildCommitContext(options),
  });
};

const replaceArrayState = <T>(
  action: string,
  current: T[],
  next: T[],
  apply: (draft: CanvasStoreState) => void,
  options?: ArrayActionOptions
) => {
  if (next === current || deepEqual(current, next)) {
    recordNoChange(action, options);
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    const actionTrace = createActionTrace(action, next, options?.source);
    debugLog(action, current, next, options?.source, { skipEqualityCheck: true, actionTrace });
    ensureSerializable(next, `${action}.payload`);

    // Log detailed array state changes
    console.debug(`[CanvasStore] Array state change for ${action}:`, {
      currentLength: current.length,
      nextLength: next.length,
      lengthDelta: next.length - current.length,
      actionTrace: {
        frequency: actionTrace.frequency,
        isRapidFire: actionTrace.isRapidFire,
        renderImpact: actionTrace.renderImpact,
      },
    });
  }

  commitStateMutation(action, apply, {
    source: options?.source,
    context: options?.context,
    silent: options?.silent,
    markMetrics: options?.markMetrics,
    payloadSize: Array.isArray(next) ? next.length : undefined,
    payloadHash: stableHash(next),
  });
};

const conditionalSet = <K extends keyof CanvasStoreState>(
  key: K,
  value: CanvasStoreState[K],
  action: string,
  options?: ConditionalSetOptions
) => {
  const current = useCanvasStore.getState()[key];

  if (options?.onlyIfCurrentIs !== undefined && current !== options.onlyIfCurrentIs) {
    recordNoChange(action, {
      source: options?.source,
      context: { ...(options?.context ?? {}), reason: 'only-if-mismatch' },
    });
    return;
  }

  if (options?.preventWhenCurrentIs !== undefined && current === options.preventWhenCurrentIs) {
    recordNoChange(action, {
      source: options?.source,
      context: { ...(options?.context ?? {}), reason: 'prevent-guard' },
    });
    return;
  }

  if (Object.is(current, value)) {
    recordNoChange(action, options);
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    const actionTrace = createActionTrace(action, value, options?.source);
    debugLog(action, current, value, options?.source, { skipEqualityCheck: true, actionTrace });
    ensureSerializable(value, `${action}.value`);

    // Log detailed conditional set changes
    console.debug(`[CanvasStore] Conditional set for ${action}:`, {
      key,
      currentValue: current,
      newValue: value,
      conditions: {
        onlyIfCurrentIs: options?.onlyIfCurrentIs,
        preventWhenCurrentIs: options?.preventWhenCurrentIs,
      },
      actionTrace: {
        frequency: actionTrace.frequency,
        isRapidFire: actionTrace.isRapidFire,
        renderImpact: actionTrace.renderImpact,
      },
    });
  }

  commitStateMutation(
    action,
    draft => {
      (draft as CanvasStoreState)[key] = value;
    },
    {
      source: options?.source,
      context: options?.context,
      silent: options?.silent,
      markMetrics: options?.markMetrics,
    }
  );
};

const applyCanvasData = (
  data: Partial<Pick<CanvasStoreState, 'components' | 'connections' | 'infoCards'>>,
  options: Required<UpdateCanvasDataOptions> & { source: string }
) => {
  if (!canvasStoreCircuitBreaker.shouldAllow('updateCanvasData')) {
    pendingUpdates.push({
      data,
      options: {
        ...options,
        immediate: false,
      },
    });
    scheduleCircuitBreakerRetry();
    return;
  }
  const state = useCanvasStore.getState();

  const changes: Array<{
    action: string;
    apply: (draft: CanvasStoreState) => void;
    oldValue: unknown;
    newValue: unknown;
    ensureLabel: string;
    payloadSize?: number;
    payloadHash?: string;
  }> = [];

  if (data.components !== undefined && !deepEqual(state.components, data.components)) {
    changes.push({
      action: 'updateCanvasData.components',
      apply: draft => {
        draft.components = data.components ?? draft.components;
      },
      oldValue: state.components,
      newValue: data.components,
      ensureLabel: 'updateCanvasData.components',
      payloadSize: data.components?.length,
      payloadHash: data.components ? stableHash(data.components) : undefined,
    });
  }

  if (data.connections !== undefined && !deepEqual(state.connections, data.connections)) {
    changes.push({
      action: 'updateCanvasData.connections',
      apply: draft => {
        draft.connections = data.connections ?? draft.connections;
      },
      oldValue: state.connections,
      newValue: data.connections,
      ensureLabel: 'updateCanvasData.connections',
      payloadSize: data.connections?.length,
      payloadHash: data.connections ? stableHash(data.connections) : undefined,
    });
  }

  if (data.infoCards !== undefined && !deepEqual(state.infoCards, data.infoCards)) {
    changes.push({
      action: 'updateCanvasData.infoCards',
      apply: draft => {
        draft.infoCards = data.infoCards ?? draft.infoCards;
      },
      oldValue: state.infoCards,
      newValue: data.infoCards,
      ensureLabel: 'updateCanvasData.infoCards',
      payloadSize: data.infoCards?.length,
      payloadHash: data.infoCards ? stableHash(data.infoCards) : undefined,
    });
  }

  if (changes.length === 0) {
    recordNoChange('updateCanvasData', {
      source: options.source,
      context: {
        immediate: options.immediate,
        silent: options.silent,
        validate: options.validate,
        ...(options.context ?? {}),
      },
    });
    if (process.env.NODE_ENV === 'development' && !options.silent) {
      console.debug('[CanvasStore] updateCanvasData called but no changes detected');
    }
    return;
  }

  if (options.validate) {
    const validation = validateCanvasData({
      components: data.components ?? state.components,
      connections: data.connections ?? state.connections,
      infoCards: data.infoCards ?? state.infoCards,
    });

    if (!validation.isValid) {
      console.warn('[CanvasStore] updateCanvasData validation failed', validation.errors);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    for (const change of changes) {
      const actionTrace = createActionTrace(change.action, change.newValue, options.source);
      debugLog(change.action, change.oldValue, change.newValue, options.source, { skipEqualityCheck: true, actionTrace });
      ensureSerializable(change.newValue, `${change.ensureLabel}.newValue`);
    }

    // Log detailed canvas data update analysis
    console.debug('[CanvasStore] Canvas data update analysis:', {
      changesCount: changes.length,
      changeTypes: changes.map(c => c.action),
      aggregatedRenderImpact: changes.reduce((total, change) => {
        const impact = calculateRenderImpact(change.action, change.newValue);
        return {
          componentsAffected: total.componentsAffected + impact.componentsAffected,
          connectionsAffected: total.connectionsAffected + impact.connectionsAffected,
          infoCardsAffected: total.infoCardsAffected + impact.infoCardsAffected,
        };
      }, { componentsAffected: 0, connectionsAffected: 0, infoCardsAffected: 0 }),
      validate: options.validate,
      immediate: options.immediate,
    });
  }

  const timestamp = Date.now();

  useCanvasStore.setState(draft => {
    for (const change of changes) {
      change.apply(draft);
    }

    if (!options.silent) {
      draft._lastUpdateTime = timestamp;
      draft._updateCount += 1;
    } else if (!draft._bootstrapped) {
      draft._bootstrapped = true;
    }
  }, false);

  const payloadSize = changes.reduce((total, change) => total + (change.payloadSize ?? 0), 0);

  canvasStoreCircuitBreaker.record({
    action: 'updateCanvasData',
    changed: true,
    timestamp,
    payloadSize,
    payloadHash: stableHash({
      components: data.components ?? state.components,
      connections: data.connections ?? state.connections,
      infoCards: data.infoCards ?? state.infoCards,
    }),
    context: {
      source: options.source,
      immediate: options.immediate,
      silent: options.silent,
      validate: options.validate,
      ...(options.context ?? {}),
    },
  });
};

const flushPendingUpdates = (reason: string) => {
  if (pendingUpdates.length === 0) {
    return;
  }

  const aggregated: PendingCanvasUpdate['data'] = {};
  let silent = true;
  let validate = false;

  for (const entry of pendingUpdates) {
    if (entry.data.components !== undefined) {
      aggregated.components = entry.data.components;
    }
    if (entry.data.connections !== undefined) {
      aggregated.connections = entry.data.connections;
    }
    if (entry.data.infoCards !== undefined) {
      aggregated.infoCards = entry.data.infoCards;
    }
    silent = silent && entry.options.silent === true;
    validate = validate || entry.options.validate !== false;
  }

  pendingUpdates.length = 0;
  batchUpdateTimeout = null;

  applyCanvasData(aggregated, {
    source: reason,
    immediate: false,
    silent,
    validate,
    context: { batched: true },
  });
};

const scheduleBatchedUpdate = () => {
  if (batchUpdateTimeout) {
    return;
  }
  batchUpdateTimeout = setTimeout(() => {
    flushPendingUpdates('batched');
  }, 16);
};

const scheduleCircuitBreakerRetry = () => {
  if (circuitBreakerRetryTimeout) {
    return;
  }
  const snapshot = canvasStoreCircuitBreaker.getSnapshot();
  const delay = snapshot.openUntil ? Math.max(snapshot.openUntil - Date.now(), 50) : 150;
  circuitBreakerRetryTimeout = setTimeout(() => {
    circuitBreakerRetryTimeout = null;
    flushPendingUpdates('circuit-breaker-retry');
  }, delay);
};

const mutableCanvasActions: CanvasActions = {
  setComponents(components: DesignComponent[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().components;
    replaceArrayState('setComponents', current, components, draft => {
      draft.components = components;
    }, options);
  },
  setConnections(connections: Connection[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().connections;
    replaceArrayState('setConnections', current, connections, draft => {
      draft.connections = connections;
    }, options);
  },
  setInfoCards(infoCards: InfoCard[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().infoCards;
    replaceArrayState('setInfoCards', current, infoCards, draft => {
      draft.infoCards = infoCards;
    }, options);
  },
  setSelectedComponent(id: string | null, options?: ConditionalSetOptions) {
    conditionalSet('selectedComponent', id, 'setSelectedComponent', options);
  },
  setConnectionStart(id: string | null, options?: ConditionalSetOptions) {
    conditionalSet('connectionStart', id, 'setConnectionStart', options);
  },
  setVisualTheme(theme: 'serious' | 'playful', options?: ConditionalSetOptions) {
    conditionalSet('visualTheme', theme, 'setVisualTheme', options);
  },
  updateComponents(
    updater: (components: DesignComponent[]) => DesignComponent[],
    options?: ArrayActionOptions
  ) {
    const current = useCanvasStore.getState().components;
    const next = updater(current);
    replaceArrayState('updateComponents', current, next, draft => {
      draft.components = next;
    }, options);
  },
  updateConnections(
    updater: (connections: Connection[]) => Connection[],
    options?: ArrayActionOptions
  ) {
    const current = useCanvasStore.getState().connections;
    const next = updater(current);
    replaceArrayState('updateConnections', current, next, draft => {
      draft.connections = next;
    }, options);
  },
  updateInfoCards(
    updater: (infoCards: InfoCard[]) => InfoCard[],
    options?: ArrayActionOptions
  ) {
    const current = useCanvasStore.getState().infoCards;
    const next = updater(current);
    replaceArrayState('updateInfoCards', current, next, draft => {
      draft.infoCards = next;
    }, options);
  },
  updateCanvasData(
    data: Partial<Pick<CanvasStoreState, 'components' | 'connections' | 'infoCards'>>,
    options: UpdateCanvasDataOptions = {}
  ) {
    const merged = {
      source: options.source ?? (options.immediate === false ? 'batched' : 'direct'),
      immediate: options.immediate ?? true,
      validate: options.validate ?? true,
      silent: options.silent ?? false,
      context: options.context,
    } satisfies Required<UpdateCanvasDataOptions> & { source: string };

    if (!merged.immediate) {
      pendingUpdates.push({ data, options: merged });
      scheduleBatchedUpdate();
      return;
    }

    applyCanvasData(data, merged);
  },
  resetCanvas(reason = 'manual-reset') {
    commitStateMutation(
      'resetCanvas',
      draft => {
        Object.assign(draft, initialState);
      },
      {
        source: reason,
        context: { reason },
      }
    );
    pendingUpdates.length = 0;
    if (batchUpdateTimeout) {
      clearTimeout(batchUpdateTimeout);
      batchUpdateTimeout = null;
    }
    if (circuitBreakerRetryTimeout) {
      clearTimeout(circuitBreakerRetryTimeout);
      circuitBreakerRetryTimeout = null;
    }
    canvasStoreCircuitBreaker.reset(reason);
  },
  getDebugInfo() {
    return {
      ...debugMetrics,
      actionHistory: actionHistory.slice(-20), // Last 20 actions
      actionFrequency: Object.fromEntries(actionFrequency),
      renderCauseAnalysis: {
        ...debugMetrics.renderCauseAnalysis,
        frequentActions: Object.fromEntries(debugMetrics.renderCauseAnalysis.frequentActions),
      },
    };
  },
  getActionTrace(action?: string) {
    if (action) {
      return actionHistory.filter(trace => trace.action.includes(action));
    }
    return actionHistory.slice();
  },
  getRenderCauseAnalysis() {
    return {
      frequentActions: Array.from(debugMetrics.renderCauseAnalysis.frequentActions.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      renderLoopPatterns: debugMetrics.renderCauseAnalysis.renderLoopPatterns,
      suspiciousActionChains: debugMetrics.renderCauseAnalysis.suspiciousActionChains,
      recentActions: actionHistory.slice(-10),
    };
  },
  analyzeRenderLoop(action: string) {
    const actionTraces = actionHistory.filter(trace => trace.action === action);
    const rapidFireCount = actionTraces.filter(trace => trace.isRapidFire).length;
    const avgFrequency = actionTraces.reduce((sum, trace) => sum + trace.frequency, 0) / actionTraces.length;
    const causedByActions = [...new Set(actionTraces.map(trace => trace.causedByAction).filter(Boolean))];

    return {
      action,
      totalOccurrences: actionTraces.length,
      rapidFireCount,
      rapidFirePercentage: (rapidFireCount / actionTraces.length) * 100,
      averageFrequency: avgFrequency,
      triggeredByActions: causedByActions,
      recommendations: generateOptimizationRecommendations(action, actionTraces),
    };
  },
};

Object.freeze(mutableCanvasActions);

export const useCanvasComponents = () => useCanvasStore(state => state.components, shallow);
export const useCanvasConnections = () => useCanvasStore(state => state.connections, shallow);
export const useCanvasInfoCards = () => useCanvasStore(state => state.infoCards, shallow);
export const useCanvasSelectedComponent = () => useCanvasStore(state => state.selectedComponent ?? null);
export const useCanvasConnectionStart = () => useCanvasStore(state => state.connectionStart);
export const useCanvasVisualTheme = () => useCanvasStore(state => state.visualTheme);

export const useCanvasActions = () => mutableCanvasActions;

export const useCanvasUndo = () => useCanvasStore.temporal.getState().undo;
export const useCanvasRedo = () => useCanvasStore.temporal.getState().redo;
export const useCanvasCanUndo = () => useCanvasStore.temporal.getState().pastStates.length > 0;
export const useCanvasCanRedo = () => useCanvasStore.temporal.getState().futureStates.length > 0;

export const getCanvasState = () => useCanvasStore.getState();

export const subscribeToCanvasCircuitBreaker = canvasStoreCircuitBreaker.subscribe.bind(
  canvasStoreCircuitBreaker
);
const generateOptimizationRecommendations = (action: string, traces: ActionTrace[]): string[] => {
  const recommendations: string[] = [];

  if (traces.some(trace => trace.isRapidFire)) {
    recommendations.push('Consider debouncing this action to reduce rapid-fire updates');
  }

  if (traces.some(trace => trace.causedByAction)) {
    recommendations.push('Investigate action chains that might create dependency cycles');
  }

  const avgRenderImpact = traces.reduce((sum, trace) => {
    return sum + trace.renderImpact.componentsAffected + trace.renderImpact.connectionsAffected + trace.renderImpact.infoCardsAffected;
  }, 0) / traces.length;

  if (avgRenderImpact > 20) {
    recommendations.push('Consider batching updates or using more granular state updates');
  }

  if (traces.length > 50) {
    recommendations.push('This action is very frequent - consider memoization or state optimization');
  }

  return recommendations;
};

export const getCanvasCircuitBreakerSnapshot = () => canvasStoreCircuitBreaker.getSnapshot();
