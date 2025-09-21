/**
 * Normalized Canvas Store - Uses normalized data structures internally
 * Maintains same external API as existing canvasStore while providing better performance
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DesignComponent, Connection, InfoCard } from '@shared/contracts';

import {
  normalizeCanvasData,
  denormalizeCanvasData,
  NormalizedCanvasData,
  NormalizedDataUpdater,
  NormalizedDataSelectors,
  type CanvasDataSnapshot,
  type NormalizationOptions,
} from './CanvasDataNormalizer';

import { StoreCircuitBreaker } from '@/lib/performance/StoreCircuitBreaker';
import { deepEqual } from '@/stores/canvasStore';

// Internal normalized state structure
interface NormalizedCanvasState {
  // Normalized data structures
  normalizedData: NormalizedCanvasData;

  // UI state (kept flat for efficiency)
  selectedComponent: string | null;
  connectionStart: string | null;
  visualTheme: 'serious' | 'playful';

  // Metadata
  _lastUpdateTime: number;
  _updateCount: number;
  _bootstrapped: boolean;
  _normalizationVersion: number;
}

// External API types (same as original canvasStore)
export interface CanvasState {
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

interface ActionOptions {
  source?: string;
  context?: Record<string, unknown>;
  silent?: boolean;
  skipNormalization?: boolean;
}

interface UpdateOptions extends ActionOptions {
  immediate?: boolean;
  validate?: boolean;
}

interface NormalizedCanvasActions {
  // Component operations
  setComponents: (components: DesignComponent[], options?: ActionOptions) => void;
  updateComponent: (componentId: string, updates: Partial<DesignComponent>, options?: ActionOptions) => void;
  addComponent: (component: DesignComponent, options?: ActionOptions) => void;
  removeComponent: (componentId: string, options?: ActionOptions) => void;
  batchUpdateComponents: (updates: Record<string, Partial<DesignComponent>>, options?: ActionOptions) => void;

  // Connection operations
  setConnections: (connections: Connection[], options?: ActionOptions) => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>, options?: ActionOptions) => void;
  addConnection: (connection: Connection, options?: ActionOptions) => void;
  removeConnection: (connectionId: string, options?: ActionOptions) => void;

  // Info card operations
  setInfoCards: (infoCards: InfoCard[], options?: ActionOptions) => void;
  updateInfoCard: (infoCardId: string, updates: Partial<InfoCard>, options?: ActionOptions) => void;
  addInfoCard: (infoCard: InfoCard, options?: ActionOptions) => void;
  removeInfoCard: (infoCardId: string, options?: ActionOptions) => void;

  // Selection operations
  setSelectedComponent: (id: string | null, options?: ActionOptions) => void;
  setConnectionStart: (id: string | null, options?: ActionOptions) => void;
  setVisualTheme: (theme: 'serious' | 'playful', options?: ActionOptions) => void;

  // Batch operations
  updateCanvasData: (data: Partial<CanvasDataSnapshot>, options?: UpdateOptions) => void;
  resetCanvas: (reason?: string) => void;

  // Normalized data access
  getNormalizedData: () => NormalizedCanvasData;
  getComponentsByType: (type: string) => DesignComponent[];
  getComponentsByLayer: (layerId: string) => DesignComponent[];
  getConnectionsForComponent: (componentId: string) => { incoming: Connection[]; outgoing: Connection[] };
  getInfoCardsInRegion: (x: number, y: number, width: number, height: number) => InfoCard[];

  // Debug and validation
  validateIntegrity: () => { isValid: boolean; errors: string[] };
  getDebugInfo: () => any;
}

const initialNormalizedData: NormalizedCanvasData = {
  components: {
    byId: {},
    allIds: [],
    byType: {},
    byLayer: {},
  },
  connections: {
    byId: {},
    allIds: [],
    bySourceId: {},
    byTargetId: {},
    byType: {},
  },
  infoCards: {
    byId: {},
    allIds: [],
    byPosition: {},
  },
  lastUpdated: Date.now(),
  version: 1,
};

const initialState: NormalizedCanvasState = {
  normalizedData: initialNormalizedData,
  selectedComponent: null,
  connectionStart: null,
  visualTheme: 'serious',
  _lastUpdateTime: 0,
  _updateCount: 0,
  _bootstrapped: false,
  _normalizationVersion: 1,
};

// Circuit breaker for normalized store
const normalizedStoreCircuitBreaker = new StoreCircuitBreaker({
  name: 'NormalizedCanvasStore',
  componentId: 'zustand.normalized-canvas',
  windowMs: 160,
  warningThreshold: 10,
  errorThreshold: 15,
  cooldownMs: 2500,
  warningIntervalMs: 500,
});

// Create the normalized store
const useNormalizedCanvasStore = create<NormalizedCanvasState>()(
  subscribeWithSelector(
    persist(
      temporal(
        immer(() => initialState),
        {
          limit: 50,
          partialize: state => ({
            normalizedData: state.normalizedData,
          }),
        }
      ),
      {
        name: 'normalized-canvas-storage',
        partialize: state => ({
          visualTheme: state.visualTheme,
          normalizedData: state.normalizedData,
        }),
      }
    )
  )
);

/**
 * Helper to convert normalized state to external API format
 */
function toExternalState(internalState: NormalizedCanvasState): CanvasState {
  const snapshot = denormalizeCanvasData(internalState.normalizedData);

  return {
    components: snapshot.components,
    connections: snapshot.connections,
    infoCards: snapshot.infoCards,
    selectedComponent: internalState.selectedComponent,
    connectionStart: internalState.connectionStart,
    visualTheme: internalState.visualTheme,
    _lastUpdateTime: internalState._lastUpdateTime,
    _updateCount: internalState._updateCount,
    _bootstrapped: internalState._bootstrapped,
  };
}

/**
 * Helper to commit state changes with circuit breaker and logging
 */
function commitNormalizedChange(
  action: string,
  mutator: (draft: NormalizedCanvasState) => void,
  options?: ActionOptions
) {
  if (!normalizedStoreCircuitBreaker.shouldAllow(action)) {
    console.warn(`[NormalizedCanvasStore] Action ${action} blocked by circuit breaker`);
    return;
  }

  const timestamp = Date.now();

  useNormalizedCanvasStore.setState(state => {
    mutator(state);

    if (!options?.silent) {
      state._lastUpdateTime = timestamp;
      state._updateCount += 1;
    }

    if (options?.silent && !state._bootstrapped) {
      state._bootstrapped = true;
    }

    // Update normalization version on data changes
    if (action.includes('Component') || action.includes('Connection') || action.includes('InfoCard')) {
      state.normalizedData.lastUpdated = timestamp;
      state.normalizedData.version += 1;
    }
  }, false);

  normalizedStoreCircuitBreaker.record({
    action,
    changed: true,
    timestamp,
    context: {
      source: options?.source,
      silent: options?.silent,
      ...options?.context,
    },
  });

  // Log in development
  if (import.meta.env.DEV && !options?.silent) {
    console.debug(`[NormalizedCanvasStore] ${action}`, {
      timestamp,
      source: options?.source,
      context: options?.context,
    });
  }
}

/**
 * Actions implementation using normalized data structures
 */
const normalizedCanvasActions: NormalizedCanvasActions = {
  setComponents(components: DesignComponent[], options?: ActionOptions) {
    commitNormalizedChange('setComponents', draft => {
      const snapshot: CanvasDataSnapshot = {
        components,
        connections: denormalizeCanvasData(draft.normalizedData).connections,
        infoCards: denormalizeCanvasData(draft.normalizedData).infoCards,
      };

      const normalizationOptions: NormalizationOptions = {
        generateIds: true,
        preserveOrder: true,
      };

      draft.normalizedData = normalizeCanvasData(snapshot, normalizationOptions);
    }, options);
  },

  updateComponent(componentId: string, updates: Partial<DesignComponent>, options?: ActionOptions) {
    commitNormalizedChange('updateComponent', draft => {
      draft.normalizedData.components = NormalizedDataUpdater.updateComponent(
        draft.normalizedData.components,
        componentId,
        updates
      );
    }, options);
  },

  addComponent(component: DesignComponent, options?: ActionOptions) {
    commitNormalizedChange('addComponent', draft => {
      // Ensure component has an ID
      if (!component.id) {
        component = { ...component, id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      }

      draft.normalizedData.components = NormalizedDataUpdater.addComponent(
        draft.normalizedData.components,
        component
      );
    }, options);
  },

  removeComponent(componentId: string, options?: ActionOptions) {
    commitNormalizedChange('removeComponent', draft => {
      // Remove component
      draft.normalizedData.components = NormalizedDataUpdater.removeComponent(
        draft.normalizedData.components,
        componentId
      );

      // Remove associated connections
      const connectionsToRemove = [
        ...(draft.normalizedData.connections.bySourceId[componentId] || []),
        ...(draft.normalizedData.connections.byTargetId[componentId] || []),
      ];

      connectionsToRemove.forEach(connectionId => {
        const connection = draft.normalizedData.connections.byId[connectionId];
        if (connection) {
          // Remove from byId
          delete draft.normalizedData.connections.byId[connectionId];

          // Remove from allIds
          draft.normalizedData.connections.allIds = draft.normalizedData.connections.allIds.filter(
            id => id !== connectionId
          );

          // Remove from indexes
          draft.normalizedData.connections.bySourceId[connection.from] =
            (draft.normalizedData.connections.bySourceId[connection.from] || []).filter(id => id !== connectionId);
          draft.normalizedData.connections.byTargetId[connection.to] =
            (draft.normalizedData.connections.byTargetId[connection.to] || []).filter(id => id !== connectionId);

          const type = connection.type || 'data';
          draft.normalizedData.connections.byType[type] =
            (draft.normalizedData.connections.byType[type] || []).filter(id => id !== connectionId);
        }
      });

      // Clear selection if this component was selected
      if (draft.selectedComponent === componentId) {
        draft.selectedComponent = null;
      }

      if (draft.connectionStart === componentId) {
        draft.connectionStart = null;
      }
    }, options);
  },

  batchUpdateComponents(updates: Record<string, Partial<DesignComponent>>, options?: ActionOptions) {
    commitNormalizedChange('batchUpdateComponents', draft => {
      draft.normalizedData.components = NormalizedDataUpdater.batchUpdateComponents(
        draft.normalizedData.components,
        updates
      );
    }, options);
  },

  setConnections(connections: Connection[], options?: ActionOptions) {
    commitNormalizedChange('setConnections', draft => {
      const snapshot: CanvasDataSnapshot = {
        components: denormalizeCanvasData(draft.normalizedData).components,
        connections,
        infoCards: denormalizeCanvasData(draft.normalizedData).infoCards,
      };

      const normalizationOptions: NormalizationOptions = {
        generateIds: true,
        preserveOrder: true,
      };

      draft.normalizedData = normalizeCanvasData(snapshot, normalizationOptions);
    }, options);
  },

  updateConnection(connectionId: string, updates: Partial<Connection>, options?: ActionOptions) {
    commitNormalizedChange('updateConnection', draft => {
      const existingConnection = draft.normalizedData.connections.byId[connectionId];
      if (!existingConnection) {
        console.warn(`Connection ${connectionId} not found for update`);
        return;
      }

      const updatedConnection = { ...existingConnection, ...updates };
      draft.normalizedData.connections.byId[connectionId] = updatedConnection;

      // Update indexes if source/target/type changed
      if (updates.from && updates.from !== existingConnection.from) {
        // Remove from old source
        if (draft.normalizedData.connections.bySourceId[existingConnection.from]) {
          draft.normalizedData.connections.bySourceId[existingConnection.from] =
            draft.normalizedData.connections.bySourceId[existingConnection.from].filter(id => id !== connectionId);
        }

        // Add to new source
        if (!draft.normalizedData.connections.bySourceId[updates.from]) {
          draft.normalizedData.connections.bySourceId[updates.from] = [];
        }
        draft.normalizedData.connections.bySourceId[updates.from].push(connectionId);
      }

      if (updates.to && updates.to !== existingConnection.to) {
        // Remove from old target
        if (draft.normalizedData.connections.byTargetId[existingConnection.to]) {
          draft.normalizedData.connections.byTargetId[existingConnection.to] =
            draft.normalizedData.connections.byTargetId[existingConnection.to].filter(id => id !== connectionId);
        }

        // Add to new target
        if (!draft.normalizedData.connections.byTargetId[updates.to]) {
          draft.normalizedData.connections.byTargetId[updates.to] = [];
        }
        draft.normalizedData.connections.byTargetId[updates.to].push(connectionId);
      }

      if (updates.type && updates.type !== existingConnection.type) {
        // Remove from old type
        const oldType = existingConnection.type || 'data';
        if (draft.normalizedData.connections.byType[oldType]) {
          draft.normalizedData.connections.byType[oldType] =
            draft.normalizedData.connections.byType[oldType].filter(id => id !== connectionId);
        }

        // Add to new type
        const newType = updates.type || 'data';
        if (!draft.normalizedData.connections.byType[newType]) {
          draft.normalizedData.connections.byType[newType] = [];
        }
        draft.normalizedData.connections.byType[newType].push(connectionId);
      }
    }, options);
  },

  addConnection(connection: Connection, options?: ActionOptions) {
    commitNormalizedChange('addConnection', draft => {
      // Ensure connection has an ID
      if (!connection.id) {
        connection = { ...connection, id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      }

      // Add to byId
      draft.normalizedData.connections.byId[connection.id] = connection;

      // Add to allIds
      draft.normalizedData.connections.allIds.push(connection.id);

      // Update indexes
      if (!draft.normalizedData.connections.bySourceId[connection.from]) {
        draft.normalizedData.connections.bySourceId[connection.from] = [];
      }
      draft.normalizedData.connections.bySourceId[connection.from].push(connection.id);

      if (!draft.normalizedData.connections.byTargetId[connection.to]) {
        draft.normalizedData.connections.byTargetId[connection.to] = [];
      }
      draft.normalizedData.connections.byTargetId[connection.to].push(connection.id);

      const type = connection.type || 'data';
      if (!draft.normalizedData.connections.byType[type]) {
        draft.normalizedData.connections.byType[type] = [];
      }
      draft.normalizedData.connections.byType[type].push(connection.id);
    }, options);
  },

  removeConnection(connectionId: string, options?: ActionOptions) {
    commitNormalizedChange('removeConnection', draft => {
      const connection = draft.normalizedData.connections.byId[connectionId];
      if (!connection) {
        console.warn(`Connection ${connectionId} not found for removal`);
        return;
      }

      // Remove from byId
      delete draft.normalizedData.connections.byId[connectionId];

      // Remove from allIds
      draft.normalizedData.connections.allIds = draft.normalizedData.connections.allIds.filter(
        id => id !== connectionId
      );

      // Remove from indexes
      if (draft.normalizedData.connections.bySourceId[connection.from]) {
        draft.normalizedData.connections.bySourceId[connection.from] =
          draft.normalizedData.connections.bySourceId[connection.from].filter(id => id !== connectionId);
      }

      if (draft.normalizedData.connections.byTargetId[connection.to]) {
        draft.normalizedData.connections.byTargetId[connection.to] =
          draft.normalizedData.connections.byTargetId[connection.to].filter(id => id !== connectionId);
      }

      const type = connection.type || 'data';
      if (draft.normalizedData.connections.byType[type]) {
        draft.normalizedData.connections.byType[type] =
          draft.normalizedData.connections.byType[type].filter(id => id !== connectionId);
      }
    }, options);
  },

  setInfoCards(infoCards: InfoCard[], options?: ActionOptions) {
    commitNormalizedChange('setInfoCards', draft => {
      const snapshot: CanvasDataSnapshot = {
        components: denormalizeCanvasData(draft.normalizedData).components,
        connections: denormalizeCanvasData(draft.normalizedData).connections,
        infoCards,
      };

      const normalizationOptions: NormalizationOptions = {
        generateIds: true,
        preserveOrder: true,
        gridSize: 100,
      };

      draft.normalizedData = normalizeCanvasData(snapshot, normalizationOptions);
    }, options);
  },

  updateInfoCard(infoCardId: string, updates: Partial<InfoCard>, options?: ActionOptions) {
    commitNormalizedChange('updateInfoCard', draft => {
      const existingCard = draft.normalizedData.infoCards.byId[infoCardId];
      if (!existingCard) {
        console.warn(`InfoCard ${infoCardId} not found for update`);
        return;
      }

      const updatedCard = { ...existingCard, ...updates };
      draft.normalizedData.infoCards.byId[infoCardId] = updatedCard;

      // Update position index if position changed
      if ((updates.x !== undefined && updates.x !== existingCard.x) ||
          (updates.y !== undefined && updates.y !== existingCard.y)) {
        const gridSize = 100;

        // Remove from old position
        const oldGridKey = `${Math.floor(existingCard.x / gridSize)},${Math.floor(existingCard.y / gridSize)}`;
        if (draft.normalizedData.infoCards.byPosition[oldGridKey]) {
          draft.normalizedData.infoCards.byPosition[oldGridKey] =
            draft.normalizedData.infoCards.byPosition[oldGridKey].filter(id => id !== infoCardId);
        }

        // Add to new position
        const newX = updates.x !== undefined ? updates.x : existingCard.x;
        const newY = updates.y !== undefined ? updates.y : existingCard.y;
        const newGridKey = `${Math.floor(newX / gridSize)},${Math.floor(newY / gridSize)}`;
        if (!draft.normalizedData.infoCards.byPosition[newGridKey]) {
          draft.normalizedData.infoCards.byPosition[newGridKey] = [];
        }
        draft.normalizedData.infoCards.byPosition[newGridKey].push(infoCardId);
      }
    }, options);
  },

  addInfoCard(infoCard: InfoCard, options?: ActionOptions) {
    commitNormalizedChange('addInfoCard', draft => {
      // Ensure info card has an ID
      if (!infoCard.id) {
        infoCard = { ...infoCard, id: `infocard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      }

      // Add to byId
      draft.normalizedData.infoCards.byId[infoCard.id] = infoCard;

      // Add to allIds
      draft.normalizedData.infoCards.allIds.push(infoCard.id);

      // Update position index
      const gridSize = 100;
      const gridKey = `${Math.floor(infoCard.x / gridSize)},${Math.floor(infoCard.y / gridSize)}`;
      if (!draft.normalizedData.infoCards.byPosition[gridKey]) {
        draft.normalizedData.infoCards.byPosition[gridKey] = [];
      }
      draft.normalizedData.infoCards.byPosition[gridKey].push(infoCard.id);
    }, options);
  },

  removeInfoCard(infoCardId: string, options?: ActionOptions) {
    commitNormalizedChange('removeInfoCard', draft => {
      const infoCard = draft.normalizedData.infoCards.byId[infoCardId];
      if (!infoCard) {
        console.warn(`InfoCard ${infoCardId} not found for removal`);
        return;
      }

      // Remove from byId
      delete draft.normalizedData.infoCards.byId[infoCardId];

      // Remove from allIds
      draft.normalizedData.infoCards.allIds = draft.normalizedData.infoCards.allIds.filter(
        id => id !== infoCardId
      );

      // Remove from position index
      const gridSize = 100;
      const gridKey = `${Math.floor(infoCard.x / gridSize)},${Math.floor(infoCard.y / gridSize)}`;
      if (draft.normalizedData.infoCards.byPosition[gridKey]) {
        draft.normalizedData.infoCards.byPosition[gridKey] =
          draft.normalizedData.infoCards.byPosition[gridKey].filter(id => id !== infoCardId);
      }
    }, options);
  },

  setSelectedComponent(id: string | null, options?: ActionOptions) {
    commitNormalizedChange('setSelectedComponent', draft => {
      draft.selectedComponent = id;
    }, options);
  },

  setConnectionStart(id: string | null, options?: ActionOptions) {
    commitNormalizedChange('setConnectionStart', draft => {
      draft.connectionStart = id;
    }, options);
  },

  setVisualTheme(theme: 'serious' | 'playful', options?: ActionOptions) {
    commitNormalizedChange('setVisualTheme', draft => {
      draft.visualTheme = theme;
    }, options);
  },

  updateCanvasData(data: Partial<CanvasDataSnapshot>, options?: UpdateOptions) {
    commitNormalizedChange('updateCanvasData', draft => {
      const currentSnapshot = denormalizeCanvasData(draft.normalizedData);

      const updatedSnapshot: CanvasDataSnapshot = {
        components: data.components !== undefined ? data.components : currentSnapshot.components,
        connections: data.connections !== undefined ? data.connections : currentSnapshot.connections,
        infoCards: data.infoCards !== undefined ? data.infoCards : currentSnapshot.infoCards,
      };

      const normalizationOptions: NormalizationOptions = {
        generateIds: true,
        preserveOrder: true,
        gridSize: 100,
      };

      draft.normalizedData = normalizeCanvasData(updatedSnapshot, normalizationOptions);
    }, options);
  },

  resetCanvas(reason = 'manual-reset') {
    commitNormalizedChange('resetCanvas', draft => {
      Object.assign(draft, initialState);
    }, { source: reason });

    normalizedStoreCircuitBreaker.reset(reason);
  },

  // Efficient normalized data access methods
  getNormalizedData() {
    return useNormalizedCanvasStore.getState().normalizedData;
  },

  getComponentsByType(type: string) {
    const state = useNormalizedCanvasStore.getState();
    return NormalizedDataSelectors.getComponentsByType(state.normalizedData.components, type);
  },

  getComponentsByLayer(layerId: string) {
    const state = useNormalizedCanvasStore.getState();
    return NormalizedDataSelectors.getComponentsByLayer(state.normalizedData.components, layerId);
  },

  getConnectionsForComponent(componentId: string) {
    const state = useNormalizedCanvasStore.getState();
    return NormalizedDataSelectors.getConnectionsForComponent(state.normalizedData.connections, componentId);
  },

  getInfoCardsInRegion(x: number, y: number, width: number, height: number) {
    const state = useNormalizedCanvasStore.getState();
    return NormalizedDataSelectors.getInfoCardsInRegion(
      state.normalizedData.infoCards,
      x, y, width, height
    );
  },

  validateIntegrity() {
    const state = useNormalizedCanvasStore.getState();
    return NormalizedDataSelectors.validateIntegrity(state.normalizedData);
  },

  getDebugInfo() {
    const state = useNormalizedCanvasStore.getState();
    const integrity = this.validateIntegrity();

    return {
      normalizationVersion: state._normalizationVersion,
      lastUpdated: state.normalizedData.lastUpdated,
      dataVersion: state.normalizedData.version,
      integrity,
      componentCount: state.normalizedData.components.allIds.length,
      connectionCount: state.normalizedData.connections.allIds.length,
      infoCardCount: state.normalizedData.infoCards.allIds.length,
      circuitBreakerState: normalizedStoreCircuitBreaker.getSnapshot(),
    };
  },
};

// Hook for accessing external state format (for compatibility with existing components)
export const useNormalizedCanvasState = () => {
  return useNormalizedCanvasStore(toExternalState);
};

// Efficient selector hooks
export const useNormalizedCanvasComponents = () => {
  return useNormalizedCanvasStore(state =>
    state.normalizedData.components.allIds.map(id => state.normalizedData.components.byId[id])
  );
};

export const useNormalizedCanvasConnections = () => {
  return useNormalizedCanvasStore(state =>
    state.normalizedData.connections.allIds.map(id => state.normalizedData.connections.byId[id])
  );
};

export const useNormalizedCanvasInfoCards = () => {
  return useNormalizedCanvasStore(state =>
    state.normalizedData.infoCards.allIds.map(id => state.normalizedData.infoCards.byId[id])
  );
};

export const useNormalizedCanvasSelectedComponent = () => {
  return useNormalizedCanvasStore(state => state.selectedComponent);
};

export const useNormalizedCanvasConnectionStart = () => {
  return useNormalizedCanvasStore(state => state.connectionStart);
};

export const useNormalizedCanvasVisualTheme = () => {
  return useNormalizedCanvasStore(state => state.visualTheme);
};

// Efficient component selection by ID hook
export const useNormalizedCanvasComponent = (componentId: string | null) => {
  return useNormalizedCanvasStore(state =>
    componentId ? state.normalizedData.components.byId[componentId] || null : null
  );
};

// Efficient connection selection by ID hook
export const useNormalizedCanvasConnection = (connectionId: string | null) => {
  return useNormalizedCanvasStore(state =>
    connectionId ? state.normalizedData.connections.byId[connectionId] || null : null
  );
};

// Actions hook
export const useNormalizedCanvasActions = () => normalizedCanvasActions;

// Temporal operations (undo/redo)
export const useNormalizedCanvasUndo = () => useNormalizedCanvasStore.temporal.getState().undo;
export const useNormalizedCanvasRedo = () => useNormalizedCanvasStore.temporal.getState().redo;
export const useNormalizedCanvasCanUndo = () => useNormalizedCanvasStore.temporal.getState().pastStates.length > 0;
export const useNormalizedCanvasCanRedo = () => useNormalizedCanvasStore.temporal.getState().futureStates.length > 0;

// Direct state access
export const getNormalizedCanvasState = () => toExternalState(useNormalizedCanvasStore.getState());

// Circuit breaker subscription
export const subscribeToNormalizedCanvasCircuitBreaker = normalizedStoreCircuitBreaker.subscribe.bind(
  normalizedStoreCircuitBreaker
);

export const getNormalizedCanvasCircuitBreakerSnapshot = () => normalizedStoreCircuitBreaker.getSnapshot();

export default normalizedCanvasActions;