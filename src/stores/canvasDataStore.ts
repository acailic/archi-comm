// src/stores/canvasDataStore.ts
// Canvas data store (components, connections, annotations, drawings)
// Manages all canvas content data with undo/redo support and rate limiting
// RELEVANT FILES: canvasStore.ts, canvasViewStore.ts, canvasUIStore.ts, InfiniteLoopDetector.ts

import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { InfiniteLoopDetector } from "@/lib/performance/InfiniteLoopDetector";
import { deepEqual as coreDeepEqual } from "@/packages/core/utils";
import type {
  Annotation,
  Connection,
  DesignComponent,
  DrawingStroke,
  InfoCard,
} from "@/shared/contracts";
import type { BaseActionOptions } from "./types";

const RATE_LIMIT_WINDOW_MS = 100;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_COOLDOWN_MS = 250;

/**
 * Canvas Data Store State
 *
 * Manages all canvas content with proper change detection and rate limiting:
 * - Design components
 * - Connections between components
 * - Info cards
 * - Annotations
 * - Drawing strokes
 * - Update tracking (version, timestamp)
 */
interface CanvasDataState {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
  annotations: Annotation[];
  drawings: DrawingStroke[];
  lastUpdatedAt: number;
  updateVersion: number;
}

interface CanvasDataActions {
  // Component actions
  setComponents: (components: DesignComponent[], options?: BaseActionOptions) => void;
  updateComponents: (
    updater: (components: DesignComponent[]) => DesignComponent[],
    options?: BaseActionOptions,
  ) => void;

  // Connection actions
  setConnections: (connections: Connection[], options?: BaseActionOptions) => void;
  updateConnections: (
    updater: (connections: Connection[]) => Connection[],
    options?: BaseActionOptions,
  ) => void;

  // Info card actions
  setInfoCards: (infoCards: InfoCard[], options?: BaseActionOptions) => void;
  updateInfoCards: (
    updater: (infoCards: InfoCard[]) => InfoCard[],
    options?: BaseActionOptions,
  ) => void;

  // Annotation actions
  setAnnotations: (annotations: Annotation[], options?: BaseActionOptions) => void;
  addAnnotation: (annotation: Annotation, options?: BaseActionOptions) => void;
  updateAnnotation: (annotation: Annotation, options?: BaseActionOptions) => void;
  deleteAnnotation: (annotationId: string, options?: BaseActionOptions) => void;
  clearAnnotations: (options?: BaseActionOptions) => void;
  updateAnnotations: (
    updater: (annotations: Annotation[]) => Annotation[],
    options?: BaseActionOptions,
  ) => void;

  // Drawing actions
  setDrawings: (drawings: DrawingStroke[], options?: BaseActionOptions) => void;
  addDrawing: (drawing: DrawingStroke, options?: BaseActionOptions) => void;
  updateDrawing: (drawing: DrawingStroke, options?: BaseActionOptions) => void;
  deleteDrawing: (drawingId: string, options?: BaseActionOptions) => void;
  clearDrawings: (options?: BaseActionOptions) => void;
  updateDrawings: (
    updater: (drawings: DrawingStroke[]) => DrawingStroke[],
    options?: BaseActionOptions,
  ) => void;

  // Bulk update
  updateCanvasData: (
    data: Partial<Pick<CanvasDataState, "components" | "connections" | "infoCards" | "annotations" | "drawings">>,
    options?: BaseActionOptions,
  ) => void;

  // Reset
  resetCanvas: () => void;
}

type CanvasDataStore = CanvasDataState & CanvasDataActions;

class UpdateRateLimiter {
  private timestamps: number[] = [];
  private totalUpdates = 0;
  private droppedUpdates = 0;
  private blockedUntil = 0;
  private lastAction: string | undefined;

  attempt(action: string, now: number): boolean {
    this.trim(now);

    // Check with global InfiniteLoopDetector
    if (import.meta.env.DEV) {
      try {
        const detectorResult = InfiniteLoopDetector.recordRender("CanvasDataStore", {
          componentName: "CanvasDataStore",
          renderCount: this.totalUpdates,
          sinceFirstRenderMs: this.timestamps.length > 0 ? now - this.timestamps[0] : 0,
          sincePreviousRenderMs:
            this.timestamps.length > 0
              ? now - this.timestamps[this.timestamps.length - 1]
              : 0,
          timestamp: now,
          context: {
            action,
            updatesInWindow: this.timestamps.length,
            rateLimiterActive: now < this.blockedUntil,
          },
        });

        if (detectorResult?.shouldOpenCircuitBreaker && !this.isBlocked(now)) {
          this.blockedUntil = now + RATE_LIMIT_COOLDOWN_MS * 2;
          this.registerDrop(action, detectorResult.reason);
          return false;
        }
      } catch (error) {
        console.warn("[CanvasDataStore] Failed to record with InfiniteLoopDetector:", error);
      }
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
    return true;
  }

  private trim(now: number): void {
    while (this.timestamps.length > 0 && now - this.timestamps[0] > RATE_LIMIT_WINDOW_MS) {
      this.timestamps.shift();
    }
  }

  private registerDrop(action: string, reason?: string): void {
    this.droppedUpdates += 1;
    this.lastAction = action;

    if (import.meta.env.DEV && reason) {
      console.warn(`[CanvasDataStore] Dropped update for action ${action}: ${reason}`);
    }
  }

  private isBlocked(now: number): boolean {
    return now < this.blockedUntil;
  }

  reset(): void {
    this.timestamps = [];
    this.totalUpdates = 0;
    this.droppedUpdates = 0;
    this.blockedUntil = 0;
    this.lastAction = undefined;
  }
}

const updateLimiter = new UpdateRateLimiter();

const arraysEqual = <T>(a: T[], b: T[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((item, index) => coreDeepEqual(item as object, b[index] as object));
};

const applyUpdate = (
  action: string,
  mutate: (draft: CanvasDataState) => void,
  options?: BaseActionOptions,
) => {
  const now = Date.now();
  const allowed = updateLimiter.attempt(action, now);

  if (!allowed) {
    if (import.meta.env.DEV) {
      console.warn(`[CanvasDataStore] Rate limit reached for action ${action}`);
    }
    return;
  }

  useCanvasDataStore.setState((draft) => {
    mutate(draft);
    if (!options?.silent) {
      draft.lastUpdatedAt = now;
      draft.updateVersion += 1;
    }
  });
};

const initialState: CanvasDataState = {
  components: [],
  connections: [],
  infoCards: [],
  annotations: [],
  drawings: [],
  lastUpdatedAt: 0,
  updateVersion: 0,
};

export const useCanvasDataStore = create<CanvasDataStore>()(
  temporal(
    immer((set) => ({
      ...initialState,

      // Component actions
      setComponents: (components, options) => {
        const current = useCanvasDataStore.getState().components;
        if (arraysEqual(current, components)) return;
        applyUpdate("setComponents", (draft) => { draft.components = components; }, options);
      },

      updateComponents: (updater, options) => {
        const current = useCanvasDataStore.getState().components;
        const next = updater(current);
        if (arraysEqual(current, next)) return;
        applyUpdate("updateComponents", (draft) => { draft.components = next; }, options);
      },

      // Connection actions
      setConnections: (connections, options) => {
        const current = useCanvasDataStore.getState().connections;
        if (arraysEqual(current, connections)) return;
        applyUpdate("setConnections", (draft) => { draft.connections = connections; }, options);
      },

      updateConnections: (updater, options) => {
        const current = useCanvasDataStore.getState().connections;
        const next = updater(current);
        if (arraysEqual(current, next)) return;
        applyUpdate("updateConnections", (draft) => { draft.connections = next; }, options);
      },

      // Info card actions
      setInfoCards: (infoCards, options) => {
        const current = useCanvasDataStore.getState().infoCards;
        if (arraysEqual(current, infoCards)) return;
        applyUpdate("setInfoCards", (draft) => { draft.infoCards = infoCards; }, options);
      },

      updateInfoCards: (updater, options) => {
        const current = useCanvasDataStore.getState().infoCards;
        const next = updater(current);
        if (arraysEqual(current, next)) return;
        applyUpdate("updateInfoCards", (draft) => { draft.infoCards = next; }, options);
      },

      // Annotation actions
      setAnnotations: (annotations, options) => {
        const current = useCanvasDataStore.getState().annotations;
        if (arraysEqual(current, annotations)) return;
        applyUpdate("setAnnotations", (draft) => { draft.annotations = annotations; }, options);
      },

      addAnnotation: (annotation, options) => {
        applyUpdate("addAnnotation", (draft) => { draft.annotations.push(annotation); }, options);
      },

      updateAnnotation: (annotation, options) => {
        applyUpdate(
          "updateAnnotation",
          (draft) => {
            const index = draft.annotations.findIndex((a) => a.id === annotation.id);
            if (index !== -1) draft.annotations[index] = annotation;
          },
          options,
        );
      },

      deleteAnnotation: (annotationId, options) => {
        applyUpdate(
          "deleteAnnotation",
          (draft) => {
            draft.annotations = draft.annotations.filter((a) => a.id !== annotationId);
          },
          options,
        );
      },

      clearAnnotations: (options) => {
        applyUpdate("clearAnnotations", (draft) => { draft.annotations = []; }, options);
      },

      updateAnnotations: (updater, options) => {
        const current = useCanvasDataStore.getState().annotations;
        const next = updater(current);
        if (arraysEqual(current, next)) return;
        applyUpdate("updateAnnotations", (draft) => { draft.annotations = next; }, options);
      },

      // Drawing actions
      setDrawings: (drawings, options) => {
        const current = useCanvasDataStore.getState().drawings;
        if (arraysEqual(current, drawings)) return;
        applyUpdate("setDrawings", (draft) => { draft.drawings = drawings; }, options);
      },

      addDrawing: (drawing, options) => {
        applyUpdate("addDrawing", (draft) => { draft.drawings.push(drawing); }, options);
      },

      updateDrawing: (drawing, options) => {
        applyUpdate(
          "updateDrawing",
          (draft) => {
            const index = draft.drawings.findIndex((d) => d.id === drawing.id);
            if (index !== -1) draft.drawings[index] = drawing;
          },
          options,
        );
      },

      deleteDrawing: (drawingId, options) => {
        applyUpdate(
          "deleteDrawing",
          (draft) => {
            draft.drawings = draft.drawings.filter((d) => d.id !== drawingId);
          },
          options,
        );
      },

      clearDrawings: (options) => {
        applyUpdate("clearDrawings", (draft) => { draft.drawings = []; }, options);
      },

      updateDrawings: (updater, options) => {
        const current = useCanvasDataStore.getState().drawings;
        const next = updater(current);
        if (arraysEqual(current, next)) return;
        applyUpdate("updateDrawings", (draft) => { draft.drawings = next; }, options);
      },

      // Bulk update
      updateCanvasData: (data, options) => {
        applyUpdate(
          "updateCanvasData",
          (draft) => {
            if (data.components && !arraysEqual(draft.components, data.components)) {
              draft.components = data.components;
            }
            if (data.connections && !arraysEqual(draft.connections, data.connections)) {
              draft.connections = data.connections;
            }
            if (data.infoCards && !arraysEqual(draft.infoCards, data.infoCards)) {
              draft.infoCards = data.infoCards;
            }
            if (data.annotations && !arraysEqual(draft.annotations, data.annotations)) {
              draft.annotations = data.annotations;
            }
            if (data.drawings !== undefined && !arraysEqual(draft.drawings, data.drawings)) {
              draft.drawings = data.drawings;
            }
          },
          options,
        );
      },

      // Reset
      resetCanvas: () => {
        applyUpdate("resetCanvas", (draft) => {
          draft.components = [];
          draft.connections = [];
          draft.infoCards = [];
          draft.annotations = [];
          draft.drawings = [];
          draft.lastUpdatedAt = Date.now();
          draft.updateVersion += 1;
        });
      },
    })),
    { limit: 50 },
  ),
);

// Convenient selectors with memoization
export const useCanvasComponents = () => useCanvasDataStore((state) => state.components);
export const useCanvasConnections = () => useCanvasDataStore((state) => state.connections);
export const useCanvasInfoCards = () => useCanvasDataStore((state) => state.infoCards);
export const useCanvasAnnotations = () => useCanvasDataStore((state) => state.annotations);
export const useCanvasDrawings = () => useCanvasDataStore((state) => state.drawings);

// Undo/redo
export const useCanvasUndo = () => useCanvasDataStore.temporal.getState().undo;
export const useCanvasRedo = () => useCanvasDataStore.temporal.getState().redo;
export const useCanvasCanUndo = () => useCanvasDataStore.temporal.getState().pastStates.length > 0;
export const useCanvasCanRedo = () => useCanvasDataStore.temporal.getState().futureStates.length > 0;

// Normalized data
export const useNormalizedCanvasData = () =>
  useCanvasDataStore((state) => ({
    components: state.components,
    connections: state.connections,
    infoCards: state.infoCards,
    annotations: state.annotations,
    drawings: state.drawings,
  }));

// Component queries
export const useComponentsByType = (type: string) =>
  useCanvasDataStore((state) => state.components.filter((c) => c.type === type));

export const useConnectionsForComponent = (componentId: string) =>
  useCanvasDataStore((state) => ({
    incoming: state.connections.filter((c) => c.to === componentId),
    outgoing: state.connections.filter((c) => c.from === componentId),
  }));

export const resetCanvasRateLimiter = () => updateLimiter.reset();
export const deepEqual = coreDeepEqual;
