// src/stores/canvasStore.ts
// Zustand store for canvas state management with middleware
// Centralizes components, connections, infoCards, and UI state to reduce re-renders
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/hooks/useUndoRedo.ts, src/features/canvas/types.ts, src/types/canvas.ts

import { temporal } from 'zundo';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Connection, DesignComponent, InfoCard } from '../shared/contracts';

// Enhanced deep equality comparison with performance optimizations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepEqual(a: any, b: any): boolean {
  // Fast path: reference equality
  if (a === b) return true;

  // Fast path: null/undefined checks
  if (a == null || b == null) return false;

  // Fast path: type mismatch
  if (typeof a !== typeof b) return false;

  // Fast path: primitive types
  if (typeof a !== 'object') return false;

  // Array comparison with size optimization
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;

    // Fast path: different lengths
    if (a.length !== b.length) return false;

    // For large arrays, check first/last elements first
    if (a.length > 10) {
      if (!deepEqual(a[0], b[0]) || !deepEqual(a[a.length - 1], b[b.length - 1])) {
        return false;
      }
    }

    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Object comparison
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const keysA = Object.keys(a);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const keysB = Object.keys(b);

  // Fast path: different key counts
  if (keysA.length !== keysB.length) return false;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return keysA.every(key => deepEqual(a[key], b[key]));
}

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
    const changed = !deepEqual(oldValue, newValue);
    const endTime = performance.now();
    const equalityCheckTime = endTime - startTime;

    debugMetrics.updateCount++;
    debugMetrics.lastUpdateTime = Date.now();
    debugMetrics.avgEqualityCheckTime =
      (debugMetrics.avgEqualityCheckTime * (debugMetrics.updateCount - 1) + equalityCheckTime) /
      debugMetrics.updateCount;

    if (changed) {
      // eslint-disable-next-line no-console
      console.debug(`[CanvasStore] ${action}:`, {
        changed,
        oldLength: Array.isArray(oldValue) ? oldValue.length : 'N/A',
        newLength: Array.isArray(newValue) ? newValue.length : 'N/A',
        equalityCheckTime: `${equalityCheckTime.toFixed(2)}ms`,
        source: source ?? 'unknown',
        stackTrace: new Error().stack?.split('\n').slice(2, 5).join('\n'),
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

// Batching mechanism for rapid updates
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

  // Batch updates
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
                state.infoCards = newInfoCards;
                state._lastUpdateTime = Date.now();
                state._updateCount++;
              }
            }),

          updateCanvasData: (data, options = {}) => {
            const { immediate = false, validate = true, silent = false } = options;

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
export const useCanvasComponents = () => useCanvasStore(state => state.components);
export const useCanvasConnections = () => useCanvasStore(state => state.connections);
export const useCanvasInfoCards = () => useCanvasStore(state => state.infoCards);
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
