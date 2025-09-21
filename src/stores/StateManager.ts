import { Subscription } from 'rxjs';
import { shallow } from 'zustand/shallow';

import { appStore, type AppState, type AppStoreActions } from '@stores/AppStore';
import { useCanvasStore, useCanvasActions } from '@stores/canvasStore';
import type { CanvasState } from '@stores/canvasStore';
import type { DesignData } from '@shared/contracts';

export interface UnifiedState {
  app: AppState;
  canvas: CanvasState;
}

export interface UnifiedActions {
  app: AppStoreActions;
  canvas: ReturnType<typeof useCanvasActions>;
}

export interface SubscriptionSource<TState> {
  getState: () => TState;
  subscribe: (listener: () => void) => () => void;
}

interface CanvasDesignSnapshot {
  components: CanvasState['components'];
  connections: CanvasState['connections'];
  infoCards: CanvasState['infoCards'];
}

const SYNC_SOURCE_APP = 'state-manager/app-sync';

class StateManager {
  private readonly actions: UnifiedActions;
  private currentState: UnifiedState;
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribers: Array<() => void> = [];
  private readonly subscriptions: Subscription[] = [];

  private syncingFromApp = false;
  private syncingFromCanvas = false;
  private lastAppFingerprint = '';
  private lastCanvasFingerprint = '';

  constructor(
    private readonly app = appStore,
    private readonly canvasStore = useCanvasStore
  ) {
    this.actions = Object.freeze({
      app: this.app.actions,
      canvas: useCanvasActions(),
    });

    this.currentState = {
      app: this.app.getState(),
      canvas: this.canvasStore.getState(),
    };

    this.initialize();
  }

  getActions(): UnifiedActions {
    return this.actions;
  }

  getState(): UnifiedState {
    return this.currentState;
  }

  getSource(): SubscriptionSource<UnifiedState> {
    return {
      getState: () => this.getState(),
      subscribe: (listener) => this.subscribe(listener),
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('StateManager failed to unsubscribe listener', error);
        }
      }
    }
    this.unsubscribers.length = 0;

    for (const subscription of this.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('StateManager failed to unsubscribe RxJS subscription', error);
        }
      }
    }
    this.subscriptions.length = 0;
    this.listeners.clear();
  }

  private initialize(): void {
    const designSubscription = this.app
      .select((state) => state.designData)
      .subscribe((design) => this.handleAppDesignChange(design));
    this.subscriptions.push(designSubscription);

    const unsubscribeApp = this.app.subscribe(() => {
      this.currentState = {
        app: this.app.getState(),
        canvas: this.currentState.canvas,
      };
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[StateManager] app -> emit', {
            selectedChallenge: this.currentState.app.selectedChallenge?.id,
            phase: this.currentState.app.phase,
            screen: this.currentState.app.currentScreen,
          });
        } catch {}
      }
      this.emit();
    });
    this.unsubscribers.push(unsubscribeApp);

    const unsubscribeCanvas = this.canvasStore.subscribe(
      (state) => state,
      (state) => {
        this.currentState = {
          app: this.currentState.app,
          canvas: state,
        };
        if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
          try {
            // eslint-disable-next-line no-console
            console.debug('[StateManager] canvas -> emit', {
              components: state.components.length,
              connections: state.connections.length,
              infoCards: state.infoCards.length,
            });
          } catch {}
        }
        this.emit();
      }
    );
    this.unsubscribers.push(unsubscribeCanvas);

    const unsubscribeCanvasDesign = this.canvasStore.subscribe(
      (state) => ({
        components: state.components,
        connections: state.connections,
        infoCards: state.infoCards,
      }),
      (snapshot) => this.handleCanvasDesignChange(snapshot),
      { equalityFn: shallow }
    );
    this.unsubscribers.push(unsubscribeCanvasDesign);
  }

  private emit(): void {
    if (this.listeners.size === 0) return;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private computeFingerprint(snapshot: CanvasDesignSnapshot | DesignData): string {
    try {
      const normalized = {
        components: snapshot.components,
        connections: snapshot.connections,
        infoCards: 'infoCards' in snapshot ? snapshot.infoCards ?? [] : [],
      } satisfies CanvasDesignSnapshot;
      return JSON.stringify(normalized);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('StateManager failed to compute fingerprint', error);
      }
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  private handleAppDesignChange(designData: DesignData): void {
    const normalized = {
      components: designData.components,
      connections: designData.connections,
      infoCards: designData.infoCards ?? [],
    } satisfies CanvasDesignSnapshot;

    const appFingerprint = this.computeFingerprint(normalized);
    this.lastAppFingerprint = appFingerprint;

    if (this.syncingFromCanvas) {
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        // eslint-disable-next-line no-console
        console.debug('[StateManager] handleAppDesignChange skipped (syncingFromCanvas)');
      }
      return;
    }

    const canvasState = this.canvasStore.getState();
    const canvasFingerprint = this.computeFingerprint({
      components: canvasState.components,
      connections: canvasState.connections,
      infoCards: canvasState.infoCards,
    });

    if (appFingerprint === canvasFingerprint) {
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        // eslint-disable-next-line no-console
        console.debug('[StateManager] fingerprints equal (app -> canvas): no sync');
      }
      this.lastCanvasFingerprint = canvasFingerprint;
      return;
    }

    this.syncingFromApp = true;
    try {
      this.actions.canvas.updateCanvasData(
        {
          components: designData.components,
          connections: designData.connections,
          infoCards: designData.infoCards ?? canvasState.infoCards,
        },
        {
          source: SYNC_SOURCE_APP,
          immediate: true,
          validate: false,
          silent: true,
        }
      );
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        // eslint-disable-next-line no-console
        console.debug('[StateManager] synced app -> canvas');
      }
      this.lastCanvasFingerprint = this.computeFingerprint({
        components: designData.components,
        connections: designData.connections,
        infoCards: designData.infoCards ?? canvasState.infoCards,
      });
    } finally {
      this.syncingFromApp = false;
    }
  }

  private handleCanvasDesignChange(snapshot: CanvasDesignSnapshot): void {
    const canvasFingerprint = this.computeFingerprint(snapshot);

    if (this.syncingFromApp) {
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        // eslint-disable-next-line no-console
        console.debug('[StateManager] handleCanvasDesignChange skipped (syncingFromApp)');
      }
      this.lastCanvasFingerprint = canvasFingerprint;
      return;
    }

    if (canvasFingerprint === this.lastCanvasFingerprint && canvasFingerprint === this.lastAppFingerprint) {
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        // eslint-disable-next-line no-console
        console.debug('[StateManager] fingerprints equal (canvas -> app): no sync');
      }
      return;
    }

    const currentAppState = this.app.getState();
    const nextDesign: DesignData = {
      ...currentAppState.designData,
      components: snapshot.components,
      connections: snapshot.connections,
      infoCards: snapshot.infoCards,
      metadata: {
        ...currentAppState.designData.metadata,
        lastModified: new Date().toISOString(),
      },
    };

    this.syncingFromCanvas = true;
    try {
      this.app.setDesignData(nextDesign);
      this.lastAppFingerprint = this.computeFingerprint(nextDesign);
      this.lastCanvasFingerprint = canvasFingerprint;
      if (process.env.NODE_ENV === 'development' && (window as any).__DEBUG_STATE__) {
        // eslint-disable-next-line no-console
        console.debug('[StateManager] synced canvas -> app');
      }
    } finally {
      this.syncingFromCanvas = false;
    }
  }
}

export const stateManager = new StateManager();
