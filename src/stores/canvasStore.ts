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

// Enhanced debug logging with performance tracking and stack traces
const debugMetrics = {
  updateCount: 0,
  lastUpdateTime: 0,
  avgEqualityCheckTime: 0,
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debugLog(action: string, oldValue: any, newValue: any, source?: string) {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    const equal = deepEqual(oldValue, newValue);
    const endTime = performance.now();
    const equalityCheckTime = endTime - startTime;

    debugMetrics.updateCount++;
    debugMetrics.lastUpdateTime = Date.now();
    debugMetrics.avgEqualityCheckTime =
      (debugMetrics.avgEqualityCheckTime * (debugMetrics.updateCount - 1) + equalityCheckTime) /
      debugMetrics.updateCount;

    if (!equal) {
      const diagnostics = getLastEqualityDiagnostics();
      ensureSerializable(newValue, `${action}.newValue`);
      ensureSerializable(oldValue, `${action}.previousValue`);
      // eslint-disable-next-line no-console
      console.debug(`[CanvasStore] ${action}:`, {
        changed: true,
        oldLength: Array.isArray(oldValue) ? oldValue.length : 'N/A',
        newLength: Array.isArray(newValue) ? newValue.length : 'N/A',
        equalityCheckTime: `${equalityCheckTime.toFixed(2)}ms`,
        source: source ?? 'unknown',
        stackTrace: new Error().stack?.split('\n').slice(2, 5).join('\n'),
        diagnostics,
      });
    }

    // Log performance warnings
    if (equalityCheckTime > 5) {
      console.warn(
        `[CanvasStore] Slow equality check for ${action}: ${equalityCheckTime.toFixed(2)}ms`
      );
    }
  }
}

// Batching mechanism for rapid updates when consumers opt into batching
let batchUpdateTimeout: NodeJS.Timeout | null = null;
const pendingUpdates: Array<{
  components?: DesignComponent[];
  connections?: Connection[];
  infoCards?: InfoCard[];
}> = [];

// State validation functions
function validateCanvasData(data: {
  components?: DesignComponent[];
  connections?: Connection[];
  infoCards?: InfoCard[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate components
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

  // Validate connections
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

interface CanvasState {
  // Core canvas data
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];

  // UI state
  selectedComponent: string | null;
  connectionStart: string | null;
  visualTheme: 'serious' | 'playful';

  // Performance tracking
  _lastUpdateTime: number;
  _updateCount: number;
  _bootstrapped: boolean;

  // Actions
  setComponents: (components: DesignComponent[]) => void;
  setConnections: (connections: Connection[]) => void;
  setInfoCards: (infoCards: InfoCard[]) => void;
  setSelectedComponent: (id: string | null) => void;
  setConnectionStart: (id: string | null) => void;
  setVisualTheme: (theme: 'serious' | 'playful') => void;

  // Updater functions
  updateComponents: (updater: (components: DesignComponent[]) => DesignComponent[]) => void;
  updateConnections: (updater: (connections: Connection[]) => Connection[]) => void;
  updateInfoCards: (updater: (infoCards: InfoCard[]) => InfoCard[]) => void;

  // Batch updates (immediate by default; opt into batching with immediate: false)
  updateCanvasData: (
    data: {
      components?: DesignComponent[];
      connections?: Connection[];
      infoCards?: InfoCard[];
    },
    options?: { immediate?: boolean; validate?: boolean; silent?: boolean }
  ) => void;

  // Reset
  resetCanvas: () => void;

  // Debug helpers
  getDebugInfo: () => typeof debugMetrics;
}

const initialState = {
  components: [],
  connections: [],
  infoCards: [],
  selectedComponent: null,
  connectionStart: null,
  visualTheme: 'serious' as const,
  _lastUpdateTime: 0,
  _updateCount: 0,
  _bootstrapped: false,
};

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector(
    persist(
      temporal(
        immer(set => ({
          ...initialState,

          setComponents: components =>
            set(state => {
              // Only update if components actually changed
              if (!deepEqual(state.components, components)) {
                debugLog('setComponents', state.components, components, 'setComponents');
                ensureSerializable(components, 'setComponents.components');
                state.components = components;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          setConnections: connections =>
            set(state => {
              // Only update if connections actually changed
              if (!deepEqual(state.connections, connections)) {
                debugLog('setConnections', state.connections, connections, 'setConnections');
                ensureSerializable(connections, 'setConnections.connections');
                state.connections = connections;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          setInfoCards: infoCards =>
            set(state => {
              // Only update if infoCards actually changed
              if (!deepEqual(state.infoCards, infoCards)) {
                debugLog('setInfoCards', state.infoCards, infoCards, 'setInfoCards');
                ensureSerializable(infoCards, 'setInfoCards.infoCards');
                state.infoCards = infoCards;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          setSelectedComponent: id =>
            set(state => {
              state.selectedComponent = id;
            }),

          setConnectionStart: id =>
            set(state => {
              state.connectionStart = id;
            }),

          setVisualTheme: theme =>
            set(state => {
              state.visualTheme = theme;
            }),

          updateComponents: updater =>
            set(state => {
              const newComponents = updater(state.components);
              if (!deepEqual(state.components, newComponents)) {
                debugLog('updateComponents', state.components, newComponents, 'updateComponents');
                ensureSerializable(newComponents, 'updateComponents.components');
                state.components = newComponents;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          updateConnections: updater =>
            set(state => {
              const newConnections = updater(state.connections);
              if (!deepEqual(state.connections, newConnections)) {
                debugLog(
                  'updateConnections',
                  state.connections,
                  newConnections,
                  'updateConnections'
                );
                ensureSerializable(newConnections, 'updateConnections.connections');
                state.connections = newConnections;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          updateInfoCards: updater =>
            set(state => {
              const newInfoCards = updater(state.infoCards);
              if (!deepEqual(state.infoCards, newInfoCards)) {
                debugLog('updateInfoCards', state.infoCards, newInfoCards, 'updateInfoCards');
                ensureSerializable(newInfoCards, 'updateInfoCards.infoCards');
                state.infoCards = newInfoCards;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          updateCanvasData: (data, options = {}) => {
            const { immediate = true, validate = true, silent = false } = options;

            // Validation if enabled
            if (validate) {
              const validation = validateCanvasData(data);
              if (!validation.isValid) {
                console.error('[CanvasStore] Invalid canvas data:', validation.errors);
                return;
              }
            }

            // Batching logic for non-immediate updates
            if (!immediate && batchUpdateTimeout === null) {
              pendingUpdates.push(data);

              batchUpdateTimeout = setTimeout(() => {
                // Merge all pending updates
                const mergedUpdate = pendingUpdates.reduce(
                  (acc, update) => ({
                    components: update.components ?? acc.components,
                    connections: update.connections ?? acc.connections,
                    infoCards: update.infoCards ?? acc.infoCards,
                  }),
                  {} as typeof data
                );

                // Clear pending updates
                pendingUpdates.length = 0;
                batchUpdateTimeout = null;

                // Apply the merged update immediately
                set(state => {
                  let hasChanges = false;

                if (
                  mergedUpdate.components !== undefined &&
                  !deepEqual(state.components, mergedUpdate.components)
                ) {
                  if (!silent) {
                    debugLog(
                      'updateCanvasData.components',
                      state.components,
                      mergedUpdate.components,
                      'batched'
                    );
                  }
                  ensureSerializable(mergedUpdate.components, 'updateCanvasData.batched.components');
                  state.components = mergedUpdate.components;
                  hasChanges = true;
                }

                if (
                    mergedUpdate.connections !== undefined &&
                  !deepEqual(state.connections, mergedUpdate.connections)
                ) {
                  if (!silent) {
                    debugLog(
                      'updateCanvasData.connections',
                      state.connections,
                      mergedUpdate.connections,
                      'batched'
                    );
                  }
                  ensureSerializable(mergedUpdate.connections, 'updateCanvasData.batched.connections');
                  state.connections = mergedUpdate.connections;
                  hasChanges = true;
                }

                  if (
                    mergedUpdate.infoCards !== undefined &&
                  !deepEqual(state.infoCards, mergedUpdate.infoCards)
                ) {
                  if (!silent) {
                    debugLog(
                      'updateCanvasData.infoCards',
                      state.infoCards,
                      mergedUpdate.infoCards,
                      'batched'
                    );
                  }
                  ensureSerializable(mergedUpdate.infoCards, 'updateCanvasData.batched.infoCards');
                  state.infoCards = mergedUpdate.infoCards;
                  hasChanges = true;
                }

                  if (hasChanges && !silent) {
                    state._lastUpdateTime = Date.now();
                    state._updateCount++;
                  }

                  if (process.env.NODE_ENV === 'development' && !hasChanges && !silent) {
                    // eslint-disable-next-line no-console
                    console.debug(
                      '[CanvasStore] Batched updateCanvasData called but no changes detected'
                    );
                  }
                });
              }, 0); // Batch within the same event loop tick

              return;
            }

            // Immediate update
            set(state => {
              let hasChanges = false;

              if (data.components !== undefined && !deepEqual(state.components, data.components)) {
                if (!silent) {
                  debugLog(
                    'updateCanvasData.components',
                    state.components,
                    data.components,
                    immediate ? 'immediate' : 'direct'
                  );
                }
                ensureSerializable(data.components, 'updateCanvasData.components');
                state.components = data.components;
                hasChanges = true;
              }

              if (
                data.connections !== undefined &&
                !deepEqual(state.connections, data.connections)
              ) {
                if (!silent) {
                  debugLog(
                    'updateCanvasData.connections',
                    state.connections,
                    data.connections,
                    immediate ? 'immediate' : 'direct'
                  );
                }
                ensureSerializable(data.connections, 'updateCanvasData.connections');
                state.connections = data.connections;
                hasChanges = true;
              }

              if (data.infoCards !== undefined && !deepEqual(state.infoCards, data.infoCards)) {
                if (!silent) {
                  debugLog(
                    'updateCanvasData.infoCards',
                    state.infoCards,
                    data.infoCards,
                    immediate ? 'immediate' : 'direct'
                  );
                }
                ensureSerializable(data.infoCards, 'updateCanvasData.infoCards');
                state.infoCards = data.infoCards;
                hasChanges = true;
              }

              if (hasChanges && !silent) {
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }

              // Mark as bootstrapped if this is initial sync
              if (silent && !state._bootstrapped) {
                state._bootstrapped = true;
              }

              if (process.env.NODE_ENV === 'development' && !hasChanges && !silent) {
                // eslint-disable-next-line no-console
                console.debug('[CanvasStore] updateCanvasData called but no changes detected');
              }
            });
          },

          resetCanvas: () =>
            set(state => {
              Object.assign(state, initialState);
            }),

          getDebugInfo: () => debugMetrics,
        })),
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

// Selective subscriptions to prevent unnecessary re-renders
export const useCanvasComponents = () =>
  useCanvasStore(state => state.components, shallow);
export const useCanvasConnections = () =>
  useCanvasStore(state => state.connections, shallow);
export const useCanvasInfoCards = () =>
  useCanvasStore(state => state.infoCards, shallow);
export const useCanvasSelectedComponent = () =>
  useCanvasStore(state => state.selectedComponent ?? null);
export const useCanvasConnectionStart = () => useCanvasStore(state => state.connectionStart);
export const useCanvasVisualTheme = () => useCanvasStore(state => state.visualTheme);

// Actions only (no state subscription) - stable reference
export const useCanvasActions = () =>
  useCanvasStore(
    state => ({
      setComponents: state.setComponents,
      setConnections: state.setConnections,
      setInfoCards: state.setInfoCards,
      setSelectedComponent: state.setSelectedComponent,
      setConnectionStart: state.setConnectionStart,
      setVisualTheme: state.setVisualTheme,
      updateComponents: state.updateComponents,
      updateConnections: state.updateConnections,
      updateInfoCards: state.updateInfoCards,
      updateCanvasData: state.updateCanvasData,
      resetCanvas: state.resetCanvas,
    }),
    (a, b) => {
      // Shallow equality check for action functions (they should be stable)
      return (
        a.setComponents === b.setComponents &&
        a.setConnections === b.setConnections &&
        a.setInfoCards === b.setInfoCards &&
        a.setSelectedComponent === b.setSelectedComponent &&
        a.setConnectionStart === b.setConnectionStart &&
        a.setVisualTheme === b.setVisualTheme &&
        a.updateComponents === b.updateComponents &&
        a.updateConnections === b.updateConnections &&
        a.updateInfoCards === b.updateInfoCards &&
        a.updateCanvasData === b.updateCanvasData &&
        a.resetCanvas === b.resetCanvas
      );
    }
  );

// Undo/redo hooks using zundo
export const useCanvasUndo = () => useCanvasStore.temporal.getState().undo;
export const useCanvasRedo = () => useCanvasStore.temporal.getState().redo;
export const useCanvasCanUndo = () => useCanvasStore.temporal.getState().pastStates.length > 0;
export const useCanvasCanRedo = () => useCanvasStore.temporal.getState().futureStates.length > 0;

// Export getState for imperative access (non-reactive)
export const getCanvasState = () => useCanvasStore.getState();
