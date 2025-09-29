import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import type { Connection, DesignComponent, InfoCard } from '@shared/contracts';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';

import { deepEqual as coreDeepEqual } from '@/packages/core/utils';

const RATE_LIMIT_WINDOW_MS = 100;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_COOLDOWN_MS = 250;

interface CanvasStoreState {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
  selectedComponent: string | null;
  connectionStart: string | null;
  visualTheme: 'serious' | 'playful';
  lastUpdatedAt: number;
  updateVersion: number;
}

interface BaseActionOptions {
  source?: string;
  silent?: boolean;
  context?: Record<string, unknown>;
}

type ArrayActionOptions = BaseActionOptions;

interface ConditionalSetOptions extends BaseActionOptions {
  onlyIfCurrentIs?: unknown;
  preventWhenCurrentIs?: unknown;
}

interface UpdateCanvasDataOptions extends BaseActionOptions {
  immediate?: boolean;
  validate?: boolean;
}

export interface CanvasRateLimiterSnapshot {
  open: boolean;
  openUntil: number | null;
  updatesInWindow: number;
  totalUpdates: number;
  droppedUpdates: number;
  lastAction?: string;
  detectorFlagged?: boolean;
  detectorSeverity?: 'normal' | 'warning' | 'critical';
}

class UpdateRateLimiter {
  private timestamps: number[] = [];
  private totalUpdates = 0;
  private droppedUpdates = 0;
  private blockedUntil = 0;
  private lastAction: string | undefined;
  private listeners = new Set<(snapshot: CanvasRateLimiterSnapshot) => void>();

  attempt(action: string, now: number): boolean {
    this.trim(now);

    // Check with global InfiniteLoopDetector for unified monitoring
    let detectorResult = null;
    if (import.meta.env.DEV) {
      try {
        detectorResult = InfiniteLoopDetector.recordRender('CanvasStore', {
          componentName: 'CanvasStore',
          renderCount: this.totalUpdates,
          sinceFirstRenderMs: this.timestamps.length > 0 ? now - this.timestamps[0] : 0,
          sincePreviousRenderMs: this.timestamps.length > 0 ? now - this.timestamps[this.timestamps.length - 1] : 0,
          timestamp: now,
          context: {
            action,
            updatesInWindow: this.timestamps.length,
            rateLimiterActive: now < this.blockedUntil
          }
        });
      } catch (error) {
        // Silently fail if detector throws
        console.warn('[CanvasStore] Failed to record with InfiniteLoopDetector:', error);
      }
    }

    // Circuit breaker integration: if detector suggests opening circuit breaker, do it
    if (detectorResult?.shouldOpenCircuitBreaker && !this.isBlocked(now)) {
      this.blockedUntil = now + RATE_LIMIT_COOLDOWN_MS * 2; // Longer cooldown for detector-triggered blocks
      this.registerDrop(action, detectorResult.reason);
      return false;
    }

    if (now < this.blockedUntil) {
      this.registerDrop(action);
      return false;
    }

    if (this.timestamps.length >= RATE_LIMIT_COUNT) {
      this.blockedUntil = now + RATE_LIMIT_COOLDOWN_MS;
      this.registerDrop(action);
      return false;
    }

    this.timestamps.push(now);
    this.totalUpdates += 1;
    this.lastAction = action;
    this.notify();
    return true;
  }

  subscribe(listener: (snapshot: CanvasRateLimiterSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): CanvasRateLimiterSnapshot {
    const open = Date.now() < this.blockedUntil;

    // Include detector state information
    let detectorFlagged = false;
    let detectorSeverity: 'normal' | 'warning' | 'critical' = 'normal';

    if (import.meta.env.DEV) {
      try {
        const detectorReport = InfiniteLoopDetector.getLatestReport('CanvasStore');
        if (detectorReport) {
          detectorFlagged = InfiniteLoopDetector.isComponentFlagged('CanvasStore');
          detectorSeverity = detectorReport.severity;
        }
      } catch (error) {
        // Silently fail
      }
    }

    return {
      open,
      openUntil: open ? this.blockedUntil : null,
      updatesInWindow: this.timestamps.length,
      totalUpdates: this.totalUpdates,
      droppedUpdates: this.droppedUpdates,
      lastAction: this.lastAction,
      detectorFlagged,
      detectorSeverity,
    };
  }

  private trim(now: number): void {
    while (this.timestamps.length > 0 && now - this.timestamps[0] > RATE_LIMIT_WINDOW_MS) {
      this.timestamps.shift();
    }
  }

  private registerDrop(action: string, reason?: string): void {
    this.droppedUpdates += 1;
    this.lastAction = action;

    // Also inform the global detector about the drop
    if (import.meta.env.DEV && reason) {
      try {
        InfiniteLoopDetector.markCircuitBreakerOpen('CanvasStore', Date.now() + RATE_LIMIT_COOLDOWN_MS, reason);
      } catch (error) {
        // Silently fail
      }
    }

    this.notify();
  }

  private isBlocked(now: number): boolean {
    return now < this.blockedUntil;
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

const updateLimiter = new UpdateRateLimiter();

const initialState: CanvasStoreState = {
  components: [],
  connections: [],
  infoCards: [],
  selectedComponent: null,
  connectionStart: null,
  visualTheme: 'serious',
  lastUpdatedAt: 0,
  updateVersion: 0,
};

export const useCanvasStore = create<CanvasStoreState>()(
  persist(
    temporal(
      immer(() => initialState),
      { limit: 50 }
    ),
    {
      name: 'canvas-storage',
      partialize: state => ({ visualTheme: state.visualTheme }),
    }
  )
);

const applyUpdate = (
  action: string,
  mutate: (draft: CanvasStoreState) => void,
  options?: BaseActionOptions
) => {
  const now = Date.now();
  const allowed = updateLimiter.attempt(action, now);

  if (!allowed) {
    if (import.meta.env.DEV) {
      const snapshot = updateLimiter.getSnapshot();
      const reason = snapshot.detectorFlagged ?
        `Rate limit + detector flagged (${snapshot.detectorSeverity})` :
        'Rate limit reached';
      console.warn(`[CanvasStore] ${reason} for action ${action}`);
    }
    return;
  }

  useCanvasStore.setState(draft => {
    mutate(draft);
    if (!options?.silent) {
      draft.lastUpdatedAt = now;
      draft.updateVersion += 1;
    }
  });
};

const arraysEqual = <T>(a: T[], b: T[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((item, index) => coreDeepEqual(item as object, b[index] as object));
};

const mutableCanvasActions = {
  setComponents(components: DesignComponent[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().components;
    if (arraysEqual(current, components)) return;
    applyUpdate('setComponents', draft => {
      draft.components = components;
    }, options);
  },
  setConnections(connections: Connection[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().connections;
    if (arraysEqual(current, connections)) return;
    applyUpdate('setConnections', draft => {
      draft.connections = connections;
    }, options);
  },
  setInfoCards(infoCards: InfoCard[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().infoCards;
    if (arraysEqual(current, infoCards)) return;
    applyUpdate('setInfoCards', draft => {
      draft.infoCards = infoCards;
    }, options);
  },
  setSelectedComponent(id: string | null, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().selectedComponent;
    if (options?.onlyIfCurrentIs !== undefined && current !== options.onlyIfCurrentIs) {
      return;
    }
    if (options?.preventWhenCurrentIs !== undefined && current === options.preventWhenCurrentIs) {
      return;
    }
    if (current === id) return;
    applyUpdate('setSelectedComponent', draft => {
      draft.selectedComponent = id;
    }, options);
  },
  setConnectionStart(id: string | null, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().connectionStart;
    if (options?.onlyIfCurrentIs !== undefined && current !== options.onlyIfCurrentIs) {
      return;
    }
    if (options?.preventWhenCurrentIs !== undefined && current === options.preventWhenCurrentIs) {
      return;
    }
    if (current === id) return;
    applyUpdate('setConnectionStart', draft => {
      draft.connectionStart = id;
    }, options);
  },
  setVisualTheme(theme: 'serious' | 'playful', options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().visualTheme;
    if (options?.preventWhenCurrentIs && current === options.preventWhenCurrentIs) {
      return;
    }
    if (current === theme) return;
    applyUpdate('setVisualTheme', draft => {
      draft.visualTheme = theme;
    }, options);
  },
  updateComponents(
    updater: (components: DesignComponent[]) => DesignComponent[],
    options?: ArrayActionOptions
  ) {
    const current = useCanvasStore.getState().components;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate('updateComponents', draft => {
      draft.components = next;
    }, options);
  },
  updateConnections(
    updater: (connections: Connection[]) => Connection[],
    options?: ArrayActionOptions
  ) {
    const current = useCanvasStore.getState().connections;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate('updateConnections', draft => {
      draft.connections = next;
    }, options);
  },
  updateInfoCards(
    updater: (infoCards: InfoCard[]) => InfoCard[],
    options?: ArrayActionOptions
  ) {
    const current = useCanvasStore.getState().infoCards;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate('updateInfoCards', draft => {
      draft.infoCards = next;
    }, options);
  },
  updateCanvasData(
    data: Partial<Pick<CanvasStoreState, 'components' | 'connections' | 'infoCards'>>,
    options?: UpdateCanvasDataOptions
  ) {
    applyUpdate('updateCanvasData', draft => {
      if (data.components && !arraysEqual(draft.components, data.components)) {
        draft.components = data.components;
      }
      if (data.connections && !arraysEqual(draft.connections, data.connections)) {
        draft.connections = data.connections;
      }
      if (data.infoCards && !arraysEqual(draft.infoCards, data.infoCards)) {
        draft.infoCards = data.infoCards;
      }
    }, options);
  },
  resetCanvas() {
    applyUpdate('resetCanvas', draft => {
      draft.components = [];
      draft.connections = [];
      draft.infoCards = [];
      draft.selectedComponent = null;
      draft.connectionStart = null;
      draft.lastUpdatedAt = Date.now();
      draft.updateVersion += 1;
    });
  },
  getDebugInfo() {
    const state = useCanvasStore.getState();
    const limiter = updateLimiter.getSnapshot();
    return {
      componentCount: state.components.length,
      connectionCount: state.connections.length,
      infoCardCount: state.infoCards.length,
      lastUpdatedAt: state.lastUpdatedAt,
      updateVersion: state.updateVersion,
      rateLimiter: limiter,
    };
  },
} as const;

Object.freeze(mutableCanvasActions);

export type CanvasActions = typeof mutableCanvasActions;

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

export const useNormalizedCanvasData = () =>
  useCanvasStore(state => ({
    components: state.components,
    connections: state.connections,
    infoCards: state.infoCards,
  }));

export const useComponentsByType = (type: string) =>
  useCanvasStore(state => state.components.filter(component => component.type === type));

export const useComponentsByLayer = (layerId: string) =>
  useCanvasStore(state => state.components.filter(component => (component.layerId || 'default') === layerId));

export const useConnectionsForComponent = (componentId: string) =>
  useCanvasStore(state => ({
    incoming: state.connections.filter(connection => connection.to === componentId),
    outgoing: state.connections.filter(connection => connection.from === componentId),
  }));

export const useInfoCardsInRegion = (x: number, y: number, width: number, height: number) =>
  useCanvasStore(state => state.infoCards.filter(card => card.x >= x && card.x <= x + width && card.y >= y && card.y <= y + height));

export const subscribeToCanvasCircuitBreaker = updateLimiter.subscribe.bind(updateLimiter);
export const getCanvasCircuitBreakerSnapshot = () => updateLimiter.getSnapshot();

export const deepEqual = coreDeepEqual;
