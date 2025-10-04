import { InfiniteLoopDetector } from "@/lib/performance/InfiniteLoopDetector";
import type {
  Annotation,
  Connection,
  DesignComponent,
  DrawingSettings,
  DrawingStroke,
  DrawingTool,
  InfoCard,
} from "@shared/contracts";
import { temporal } from "zundo";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";

import { deepEqual as coreDeepEqual } from "@/packages/core/utils";

const RATE_LIMIT_WINDOW_MS = 100;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_COOLDOWN_MS = 250;

export type CanvasMode =
  | "select"
  | "quick-connect"
  | "pan"
  | "annotation"
  | "draw";
export type PathStyle = "straight" | "curved" | "stepped";

interface CanvasStoreState {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
  annotations: Annotation[];
  drawings: DrawingStroke[];
  selectedComponent: string | null;
  connectionStart: string | null;
  visualTheme: "serious" | "playful";
  lastUpdatedAt: number;
  updateVersion: number;

  // Drawing state
  drawingTool: DrawingTool;
  drawingColor: string;
  drawingSize: number;
  drawingSettings: DrawingSettings;

  // Canvas mode and interaction state
  canvasMode: CanvasMode;
  quickConnectSource: string | null;
  quickConnectPreview: { x: number; y: number } | null;

  // Animation preferences
  animationsEnabled: boolean;
  animationSpeed: number;

  // View preferences
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSpacing: number;
  showMinimap: boolean;

  // Connection preferences
  defaultConnectionType: Connection["type"];
  defaultPathStyle: PathStyle;
  smartRouting: boolean;
  bundleConnections: boolean;

  // Onboarding state
  tourCompleted: boolean;
  dismissedTips: string[];

  // New: usage & personalization
  recentComponents: string[]; // LRU, most recent first, max 8
  favoriteComponents: string[]; // favorites, max 5
  lastUsedComponent: string | null;

  // Transient animation state (not persisted, not in undo/redo)
  droppedComponentId: string | null;
  snappingComponentId: string | null;
  flowingConnectionIds: string[];
  draggedComponentId: string | null;
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
  detectorSeverity?: "normal" | "warning" | "critical";
}

class UpdateRateLimiter {
  private timestamps: number[] = [];
  private totalUpdates = 0;
  private droppedUpdates = 0;
  private blockedUntil = 0;
  private lastAction: string | undefined;
  private listeners = new Set<(snapshot: CanvasRateLimiterSnapshot) => void>();
  private cachedSnapshot: CanvasRateLimiterSnapshot | null = null;

  attempt(action: string, now: number): boolean {
    this.trim(now);

    // Check with global InfiniteLoopDetector for unified monitoring
    let detectorResult = null;
    if (import.meta.env.DEV) {
      try {
        detectorResult = InfiniteLoopDetector.recordRender("CanvasStore", {
          componentName: "CanvasStore",
          renderCount: this.totalUpdates,
          sinceFirstRenderMs:
            this.timestamps.length > 0 ? now - this.timestamps[0] : 0,
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
      } catch (error) {
        // Silently fail if detector throws
        console.warn(
          "[CanvasStore] Failed to record with InfiniteLoopDetector:",
          error,
        );
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
    this.cachedSnapshot = null; // Invalidate cache when state changes
    this.notify();
    return true;
  }

  subscribe(
    listener: (snapshot: CanvasRateLimiterSnapshot) => void,
  ): () => void {
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
    let detectorSeverity: "normal" | "warning" | "critical" = "normal";

    if (import.meta.env.DEV) {
      try {
        const detectorReport =
          InfiniteLoopDetector.getLatestReport("CanvasStore");
        if (detectorReport) {
          detectorFlagged =
            InfiniteLoopDetector.isComponentFlagged("CanvasStore");
          detectorSeverity = detectorReport.severity;
        }
      } catch (error) {
        // Silently fail
      }
    }

    // Check if we can reuse the cached snapshot to prevent infinite re-renders
    if (this.cachedSnapshot !== null) {
      const cached = this.cachedSnapshot;
      if (
        cached.open === open &&
        cached.openUntil === (open ? this.blockedUntil : null) &&
        cached.updatesInWindow === this.timestamps.length &&
        cached.totalUpdates === this.totalUpdates &&
        cached.droppedUpdates === this.droppedUpdates &&
        cached.lastAction === this.lastAction &&
        cached.detectorFlagged === detectorFlagged &&
        cached.detectorSeverity === detectorSeverity
      ) {
        // Return cached snapshot to maintain referential equality
        return cached;
      }
    }

    // Create and cache new snapshot
    const newSnapshot = {
      open,
      openUntil: open ? this.blockedUntil : null,
      updatesInWindow: this.timestamps.length,
      totalUpdates: this.totalUpdates,
      droppedUpdates: this.droppedUpdates,
      lastAction: this.lastAction,
      detectorFlagged,
      detectorSeverity,
    };

    this.cachedSnapshot = newSnapshot;
    return newSnapshot;
  }

  private trim(now: number): void {
    while (
      this.timestamps.length > 0 &&
      now - this.timestamps[0] > RATE_LIMIT_WINDOW_MS
    ) {
      this.timestamps.shift();
    }
  }

  private registerDrop(action: string, reason?: string): void {
    this.droppedUpdates += 1;
    this.lastAction = action;
    this.cachedSnapshot = null; // Invalidate cache when state changes

    // Also inform the global detector about the drop
    if (import.meta.env.DEV && reason) {
      try {
        InfiniteLoopDetector.markCircuitBreakerOpen(
          "CanvasStore",
          Date.now() + RATE_LIMIT_COOLDOWN_MS,
          reason,
        );
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
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

const updateLimiter = new UpdateRateLimiter();

// Helpers for local persistence for recent/favorites (robust to SSR)
const LOCAL_KEYS = {
  RECENT: "canvas-recent-components",
  FAVORITES: "canvas-favorite-components",
  LAST: "canvas-last-used-component",
};

function safeLoadJSON<T>(key: string): T | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSaveJSON(key: string, value: unknown) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function showErrorToast(message: string) {
  try {
    // Try common global toast handlers if present
    const anyWin = typeof window !== "undefined" ? (window as any) : null;
    if (!anyWin) {
      console.warn(message);
      return;
    }
    if (typeof anyWin.__ARCHICOMM_TOAST === "function") {
      anyWin.__ARCHICOMM_TOAST("error", message);
      return;
    }
    if (anyWin.toast && typeof anyWin.toast.error === "function") {
      anyWin.toast.error(message);
      return;
    }
    if (anyWin.showToast && typeof anyWin.showToast === "function") {
      anyWin.showToast({ type: "error", message });
      return;
    }
  } catch {
    // fallback
  }
  console.warn(message);
}

const initialState: CanvasStoreState = {
  components: [],
  connections: [],
  infoCards: [],
  annotations: [],
  drawings: [],
  selectedComponent: null,
  connectionStart: null,
  visualTheme: "serious",
  lastUpdatedAt: 0,
  updateVersion: 0,

  // Drawing state
  drawingTool: null,
  drawingColor: "#000000",
  drawingSize: 4,
  drawingSettings: {
    color: "#000000",
    size: 4,
    tool: null,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 0.5,
  },

  // Canvas mode defaults
  canvasMode: "select",
  quickConnectSource: null,
  quickConnectPreview: null,

  // Animation defaults
  animationsEnabled: true,
  animationSpeed: 1.0,

  // View defaults
  gridEnabled: true,
  snapToGrid: false,
  gridSpacing: 20,
  showMinimap: true,

  // Connection defaults
  defaultConnectionType: "data",
  defaultPathStyle: "curved",
  smartRouting: false,
  bundleConnections: false,

  // Onboarding defaults
  tourCompleted: false,
  dismissedTips: [],

  // Usage / personalization defaults
  recentComponents:
    safeLoadJSON<string[]>(LOCAL_KEYS.RECENT) &&
    Array.isArray(safeLoadJSON<string[]>(LOCAL_KEYS.RECENT))
      ? (safeLoadJSON<string[]>(LOCAL_KEYS.RECENT) as string[])
      : [],
  favoriteComponents:
    safeLoadJSON<string[]>(LOCAL_KEYS.FAVORITES) &&
    Array.isArray(safeLoadJSON<string[]>(LOCAL_KEYS.FAVORITES))
      ? (safeLoadJSON<string[]>(LOCAL_KEYS.FAVORITES) as string[])
      : [],
  lastUsedComponent: (safeLoadJSON<string>(LOCAL_KEYS.LAST) as string) || null,

  // Transient animation state defaults (not persisted)
  droppedComponentId: null,
  snappingComponentId: null,
  flowingConnectionIds: [],
  draggedComponentId: null,
};

export const useCanvasStore = create<CanvasStoreState>()(
  persist(
    temporal(
      immer(() => initialState),
      { limit: 50 },
    ),
    {
      name: "canvas-storage",
      partialize: (state) => ({
        visualTheme: state.visualTheme,
        animationsEnabled: state.animationsEnabled,
        animationSpeed: state.animationSpeed,
        gridEnabled: state.gridEnabled,
        snapToGrid: state.snapToGrid,
        gridSpacing: state.gridSpacing,
        showMinimap: state.showMinimap,
        defaultConnectionType: state.defaultConnectionType,
        defaultPathStyle: state.defaultPathStyle,
        smartRouting: state.smartRouting,
        bundleConnections: state.bundleConnections,
        tourCompleted: state.tourCompleted,
        dismissedTips: state.dismissedTips,
        // Persist usage & personalization as part of the main store as well
        recentComponents: state.recentComponents,
        favoriteComponents: state.favoriteComponents,
        lastUsedComponent: state.lastUsedComponent,
        // Persist drawing settings
        drawingColor: state.drawingColor,
        drawingSize: state.drawingSize,
        drawingSettings: state.drawingSettings,
      }),
    },
  ),
);

const applyUpdate = (
  action: string,
  mutate: (draft: CanvasStoreState) => void,
  options?: BaseActionOptions,
) => {
  const now = Date.now();
  const allowed = updateLimiter.attempt(action, now);

  if (!allowed) {
    if (import.meta.env.DEV) {
      const snapshot = updateLimiter.getSnapshot();
      const reason = snapshot.detectorFlagged
        ? `Rate limit + detector flagged (${snapshot.detectorSeverity})`
        : "Rate limit reached";
      console.warn(`[CanvasStore] ${reason} for action ${action}`);
    }
    return;
  }

  useCanvasStore.setState((draft) => {
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
  return a.every((item, index) =>
    coreDeepEqual(item as object, b[index] as object),
  );
};

const mutableCanvasActions = {
  setComponents(components: DesignComponent[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().components;
    if (arraysEqual(current, components)) return;

    // detect newly added component types by id difference
    const existingIds = new Set(current.map((c) => c.id));
    const newlyAdded = components.filter((c) => !existingIds.has(c.id));
    const newlyAddedTypes = Array.from(new Set(newlyAdded.map((c) => c.type)));

    applyUpdate(
      "setComponents",
      (draft) => {
        draft.components = components;
      },
      options,
    );

    // Track usage for each newly added component type
    newlyAddedTypes.forEach((type) => {
      try {
        // call action; safe to reference mutableCanvasActions at runtime
        (mutableCanvasActions as any).trackComponentUsage(type);
      } catch {
        // ignore
      }
    });
  },
  setConnections(connections: Connection[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().connections;
    if (arraysEqual(current, connections)) return;
    applyUpdate(
      "setConnections",
      (draft) => {
        draft.connections = connections;
      },
      options,
    );
  },
  setInfoCards(infoCards: InfoCard[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().infoCards;
    if (arraysEqual(current, infoCards)) return;
    applyUpdate(
      "setInfoCards",
      (draft) => {
        draft.infoCards = infoCards;
      },
      options,
    );
  },
  setAnnotations(annotations: Annotation[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().annotations;
    if (arraysEqual(current, annotations)) return;
    applyUpdate(
      "setAnnotations",
      (draft) => {
        draft.annotations = annotations;
      },
      options,
    );
  },
  addAnnotation(annotation: Annotation, options?: ArrayActionOptions) {
    applyUpdate(
      "addAnnotation",
      (draft) => {
        draft.annotations.push(annotation);
      },
      options,
    );
  },
  updateAnnotation(annotation: Annotation, options?: ArrayActionOptions) {
    applyUpdate(
      "updateAnnotation",
      (draft) => {
        const index = draft.annotations.findIndex(
          (a) => a.id === annotation.id,
        );
        if (index !== -1) {
          draft.annotations[index] = annotation;
        }
      },
      options,
    );
  },
  deleteAnnotation(annotationId: string, options?: ArrayActionOptions) {
    applyUpdate(
      "deleteAnnotation",
      (draft) => {
        draft.annotations = draft.annotations.filter(
          (a) => a.id !== annotationId,
        );
      },
      options,
    );
  },
  clearAnnotations(options?: ArrayActionOptions) {
    applyUpdate(
      "clearAnnotations",
      (draft) => {
        draft.annotations = [];
      },
      options,
    );
  },
  // Drawing actions
  setDrawings(drawings: DrawingStroke[], options?: ArrayActionOptions) {
    const current = useCanvasStore.getState().drawings;
    if (arraysEqual(current, drawings)) return;
    applyUpdate(
      "setDrawings",
      (draft) => {
        draft.drawings = drawings;
      },
      options,
    );
  },
  addDrawing(drawing: DrawingStroke, options?: ArrayActionOptions) {
    applyUpdate(
      "addDrawing",
      (draft) => {
        draft.drawings.push(drawing);
      },
      options,
    );
  },
  updateDrawing(drawing: DrawingStroke, options?: ArrayActionOptions) {
    applyUpdate(
      "updateDrawing",
      (draft) => {
        const index = draft.drawings.findIndex((d) => d.id === drawing.id);
        if (index !== -1) {
          draft.drawings[index] = drawing;
        }
      },
      options,
    );
  },
  deleteDrawing(drawingId: string, options?: ArrayActionOptions) {
    applyUpdate(
      "deleteDrawing",
      (draft) => {
        draft.drawings = draft.drawings.filter((d) => d.id !== drawingId);
      },
      options,
    );
  },
  clearDrawings(options?: ArrayActionOptions) {
    applyUpdate(
      "clearDrawings",
      (draft) => {
        draft.drawings = [];
      },
      options,
    );
  },
  setDrawingTool(tool: DrawingTool, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().drawingTool;
    if (current === tool) return;
    applyUpdate(
      "setDrawingTool",
      (draft) => {
        draft.drawingTool = tool;
        draft.drawingSettings.tool = tool;
        // Update canvas mode when drawing tool is selected
        if (tool !== null && draft.canvasMode !== "draw") {
          draft.canvasMode = "draw";
        } else if (tool === null && draft.canvasMode === "draw") {
          draft.canvasMode = "select";
        }
      },
      options,
    );
  },
  setDrawingColor(color: string, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().drawingColor;
    if (current === color) return;
    applyUpdate(
      "setDrawingColor",
      (draft) => {
        draft.drawingColor = color;
        draft.drawingSettings.color = color;
      },
      options,
    );
  },
  setDrawingSize(size: number, options?: ConditionalSetOptions) {
    const clampedSize = Math.max(1, Math.min(20, size));
    const current = useCanvasStore.getState().drawingSize;
    if (current === clampedSize) return;
    applyUpdate(
      "setDrawingSize",
      (draft) => {
        draft.drawingSize = clampedSize;
        draft.drawingSettings.size = clampedSize;
      },
      options,
    );
  },
  updateDrawingSettings(
    settings: Partial<DrawingSettings>,
    options?: BaseActionOptions,
  ) {
    applyUpdate(
      "updateDrawingSettings",
      (draft) => {
        Object.assign(draft.drawingSettings, settings);
      },
      options,
    );
  },
  updateDrawings(
    updater: (drawings: DrawingStroke[]) => DrawingStroke[],
    options?: ArrayActionOptions,
  ) {
    const current = useCanvasStore.getState().drawings;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate(
      "updateDrawings",
      (draft) => {
        draft.drawings = next;
      },
      options,
    );
  },
  setSelectedComponent(id: string | null, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().selectedComponent;
    if (
      options?.onlyIfCurrentIs !== undefined &&
      current !== options.onlyIfCurrentIs
    ) {
      return;
    }
    if (
      options?.preventWhenCurrentIs !== undefined &&
      current === options.preventWhenCurrentIs
    ) {
      return;
    }
    if (current === id) return;
    applyUpdate(
      "setSelectedComponent",
      (draft) => {
        draft.selectedComponent = id;
      },
      options,
    );
  },
  setConnectionStart(id: string | null, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().connectionStart;
    if (
      options?.onlyIfCurrentIs !== undefined &&
      current !== options.onlyIfCurrentIs
    ) {
      return;
    }
    if (
      options?.preventWhenCurrentIs !== undefined &&
      current === options.preventWhenCurrentIs
    ) {
      return;
    }
    if (current === id) return;
    applyUpdate(
      "setConnectionStart",
      (draft) => {
        draft.connectionStart = id;
      },
      options,
    );
  },
  setVisualTheme(
    theme: "serious" | "playful",
    options?: ConditionalSetOptions,
  ) {
    const current = useCanvasStore.getState().visualTheme;
    if (
      options?.preventWhenCurrentIs &&
      current === options.preventWhenCurrentIs
    ) {
      return;
    }
    if (current === theme) return;
    applyUpdate(
      "setVisualTheme",
      (draft) => {
        draft.visualTheme = theme;
      },
      options,
    );
  },
  updateComponents(
    updater: (components: DesignComponent[]) => DesignComponent[],
    options?: ArrayActionOptions,
  ) {
    const current = useCanvasStore.getState().components;
    const next = updater(current);
    if (arraysEqual(current, next)) return;

    // Detect newly added component types by id difference
    const existingIds = new Set(current.map((c) => c.id));
    const newlyAdded = next.filter((c) => !existingIds.has(c.id));
    const newlyAddedTypes = Array.from(new Set(newlyAdded.map((c) => c.type)));

    applyUpdate(
      "updateComponents",
      (draft) => {
        draft.components = next;
      },
      options,
    );

    // Track usage for newly added component types
    newlyAddedTypes.forEach((type) => {
      try {
        (mutableCanvasActions as any).trackComponentUsage(type);
      } catch {
        // ignore
      }
    });
  },
  updateConnections(
    updater: (connections: Connection[]) => Connection[],
    options?: ArrayActionOptions,
  ) {
    const current = useCanvasStore.getState().connections;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate(
      "updateConnections",
      (draft) => {
        draft.connections = next;
      },
      options,
    );
  },
  updateInfoCards(
    updater: (infoCards: InfoCard[]) => InfoCard[],
    options?: ArrayActionOptions,
  ) {
    const current = useCanvasStore.getState().infoCards;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate(
      "updateInfoCards",
      (draft) => {
        draft.infoCards = next;
      },
      options,
    );
  },
  updateAnnotations(
    updater: (annotations: Annotation[]) => Annotation[],
    options?: ArrayActionOptions,
  ) {
    const current = useCanvasStore.getState().annotations;
    const next = updater(current);
    if (arraysEqual(current, next)) return;
    applyUpdate(
      "updateAnnotations",
      (draft) => {
        draft.annotations = next;
      },
      options,
    );
  },
  updateCanvasData(
    data: Partial<
      Pick<
        CanvasStoreState,
        "components" | "connections" | "infoCards" | "annotations" | "drawings"
      >
    >,
    options?: UpdateCanvasDataOptions,
  ) {
    const current = useCanvasStore.getState();
    // Pre-calc for change detection and newly added components
    const newComponentsProvided = Array.isArray(data.components);
    const currentComponents = current.components;
    const proposedComponents = newComponentsProvided
      ? (data.components as DesignComponent[])
      : currentComponents;

    let newlyAddedTypes: string[] = [];
    if (newComponentsProvided) {
      const existingIds = new Set(currentComponents.map((c) => c.id));
      const newlyAdded = proposedComponents.filter(
        (c) => !existingIds.has(c.id),
      );
      newlyAddedTypes = Array.from(new Set(newlyAdded.map((c) => c.type)));
    }

    applyUpdate(
      "updateCanvasData",
      (draft) => {
        if (
          data.components &&
          !arraysEqual(draft.components, data.components)
        ) {
          draft.components = data.components;
        }
        if (
          data.connections &&
          !arraysEqual(draft.connections, data.connections)
        ) {
          draft.connections = data.connections;
        }
        if (data.infoCards && !arraysEqual(draft.infoCards, data.infoCards)) {
          draft.infoCards = data.infoCards;
        }
        if (
          data.annotations &&
          !arraysEqual(draft.annotations, data.annotations)
        ) {
          draft.annotations = data.annotations;
        }
        if (
          data.drawings !== undefined &&
          !arraysEqual(draft.drawings, data.drawings)
        ) {
          draft.drawings = data.drawings;
        }
      },
      options,
    );

    // Track usage for newly added component types if any
    newlyAddedTypes.forEach((type) => {
      try {
        (mutableCanvasActions as any).trackComponentUsage(type);
      } catch {
        // ignore
      }
    });
  },
  resetCanvas() {
    applyUpdate("resetCanvas", (draft) => {
      draft.components = [];
      draft.connections = [];
      draft.infoCards = [];
      draft.annotations = [];
      draft.drawings = [];
      draft.selectedComponent = null;
      draft.connectionStart = null;
      draft.drawingTool = null;
      draft.lastUpdatedAt = Date.now();
      draft.updateVersion += 1;
    });
  },
  // Canvas mode actions
  setCanvasMode(mode: CanvasMode, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().canvasMode;
    if (current === mode) return;
    applyUpdate(
      "setCanvasMode",
      (draft) => {
        draft.canvasMode = mode;
        // Reset quick-connect state when changing modes
        if (mode !== "quick-connect") {
          draft.quickConnectSource = null;
          draft.quickConnectPreview = null;
        }
      },
      options,
    );
  },
  setQuickConnectSource(
    nodeId: string | null,
    options?: ConditionalSetOptions,
  ) {
    const current = useCanvasStore.getState().quickConnectSource;
    if (current === nodeId) return;
    applyUpdate(
      "setQuickConnectSource",
      (draft) => {
        draft.quickConnectSource = nodeId;
      },
      options,
    );
  },
  setQuickConnectPreview(
    position: { x: number; y: number } | null,
    options?: ConditionalSetOptions,
  ) {
    applyUpdate(
      "setQuickConnectPreview",
      (draft) => {
        draft.quickConnectPreview = position;
      },
      options,
    );
  },
  // Animation actions
  toggleAnimations() {
    applyUpdate("toggleAnimations", (draft) => {
      draft.animationsEnabled = !draft.animationsEnabled;
    });
  },
  setAnimationSpeed(speed: number, options?: ConditionalSetOptions) {
    const clamped = Math.max(0.5, Math.min(2.0, speed));
    const current = useCanvasStore.getState().animationSpeed;
    if (current === clamped) return;
    applyUpdate(
      "setAnimationSpeed",
      (draft) => {
        draft.animationSpeed = clamped;
      },
      options,
    );
  },
  // View actions
  toggleGrid() {
    applyUpdate("toggleGrid", (draft) => {
      draft.gridEnabled = !draft.gridEnabled;
    });
  },
  toggleSnapToGrid() {
    applyUpdate("toggleSnapToGrid", (draft) => {
      draft.snapToGrid = !draft.snapToGrid;
    });
  },
  setGridSpacing(spacing: number, options?: ConditionalSetOptions) {
    const clamped = Math.max(10, Math.min(100, spacing));
    const current = useCanvasStore.getState().gridSpacing;
    if (current === clamped) return;
    applyUpdate(
      "setGridSpacing",
      (draft) => {
        draft.gridSpacing = clamped;
      },
      options,
    );
  },
  toggleMinimap() {
    applyUpdate("toggleMinimap", (draft) => {
      draft.showMinimap = !draft.showMinimap;
    });
  },
  // Connection preference actions
  setDefaultConnectionType(
    type: Connection["type"],
    options?: ConditionalSetOptions,
  ) {
    const current = useCanvasStore.getState().defaultConnectionType;
    if (current === type) return;
    applyUpdate(
      "setDefaultConnectionType",
      (draft) => {
        draft.defaultConnectionType = type;
      },
      options,
    );
  },
  setDefaultPathStyle(style: PathStyle, options?: ConditionalSetOptions) {
    const current = useCanvasStore.getState().defaultPathStyle;
    if (current === style) return;
    applyUpdate(
      "setDefaultPathStyle",
      (draft) => {
        draft.defaultPathStyle = style;
      },
      options,
    );
  },
  toggleSmartRouting() {
    applyUpdate("toggleSmartRouting", (draft) => {
      draft.smartRouting = !draft.smartRouting;
    });
  },
  toggleConnectionBundling() {
    applyUpdate("toggleConnectionBundling", (draft) => {
      draft.bundleConnections = !draft.bundleConnections;
    });
  },
  // Onboarding actions
  markTourCompleted() {
    applyUpdate("markTourCompleted", (draft) => {
      draft.tourCompleted = true;
    });
  },
  dismissTip(tipId: string) {
    const current = useCanvasStore.getState().dismissedTips;
    if (current.includes(tipId)) return;
    applyUpdate("dismissTip", (draft) => {
      draft.dismissedTips.push(tipId);
    });
  },

  // New actions: track usage & favorites
  trackComponentUsage(componentType: string) {
    if (!componentType) return;
    applyUpdate(
      "trackComponentUsage",
      (draft) => {
        draft.lastUsedComponent = componentType;

        // Remove if already present
        const idx = draft.recentComponents.indexOf(componentType);
        if (idx !== -1) {
          draft.recentComponents.splice(idx, 1);
        }
        // Add to front
        draft.recentComponents.unshift(componentType);
        // Trim to max 8
        if (draft.recentComponents.length > 8) {
          draft.recentComponents = draft.recentComponents.slice(0, 8);
        }
      },
      { silent: false },
    );

    // Persist to localStorage separately for robustness
    try {
      const state = useCanvasStore.getState();
      safeSaveJSON(LOCAL_KEYS.RECENT, state.recentComponents);
      safeSaveJSON(LOCAL_KEYS.LAST, state.lastUsedComponent);
    } catch {
      // ignore
    }
  },

  toggleFavoriteComponent(componentType: string) {
    if (!componentType) return;

    const currentState = useCanvasStore.getState();
    const isFavorite = currentState.favoriteComponents.includes(componentType);

    if (!isFavorite && currentState.favoriteComponents.length >= 5) {
      showErrorToast(
        "You can only have up to 5 favorite components. Remove one to add another.",
      );
      return;
    }

    applyUpdate(
      "toggleFavoriteComponent",
      (draft) => {
        const idx = draft.favoriteComponents.indexOf(componentType);
        if (idx !== -1) {
          draft.favoriteComponents.splice(idx, 1);
        } else {
          draft.favoriteComponents.push(componentType);
        }
      },
      { silent: false },
    );

    // Persist favorites to localStorage
    try {
      const state = useCanvasStore.getState();
      safeSaveJSON(LOCAL_KEYS.FAVORITES, state.favoriteComponents);
    } catch {
      // ignore
    }
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
      recentComponents: state.recentComponents,
      favoriteComponents: state.favoriteComponents,
      lastUsedComponent: state.lastUsedComponent,
    };
  },
} as const;

Object.freeze(mutableCanvasActions);

export type CanvasActions = typeof mutableCanvasActions;

export const useCanvasComponents = (): DesignComponent[] =>
  useCanvasStore((state) => state.components, shallow);
export const useCanvasConnections = () =>
  useCanvasStore((state) => state.connections, shallow);
export const useCanvasInfoCards = () =>
  useCanvasStore((state) => state.infoCards, shallow);
export const useCanvasAnnotations = () =>
  useCanvasStore((state) => state.annotations, shallow);
export const useCanvasDrawings = () =>
  useCanvasStore((state) => state.drawings, shallow);
export const useDrawingTool = () =>
  useCanvasStore((state) => state.drawingTool);
export const useDrawingColor = () =>
  useCanvasStore((state) => state.drawingColor);
export const useDrawingSize = () =>
  useCanvasStore((state) => state.drawingSize);
export const useDrawingSettings = () =>
  useCanvasStore((state) => state.drawingSettings, shallow);
export const useCanvasSelectedComponent = () =>
  useCanvasStore((state) => state.selectedComponent ?? null);
export const useCanvasConnectionStart = () =>
  useCanvasStore((state) => state.connectionStart);
export const useCanvasVisualTheme = () =>
  useCanvasStore((state) => state.visualTheme);

// New state selectors
export const useCanvasMode = () => useCanvasStore((state) => state.canvasMode);
export const useQuickConnectSource = () =>
  useCanvasStore((state) => state.quickConnectSource);
export const useQuickConnectPreview = () =>
  useCanvasStore((state) => state.quickConnectPreview);
export const useAnimationsEnabled = () =>
  useCanvasStore((state) => state.animationsEnabled);
export const useAnimationSpeed = () =>
  useCanvasStore((state) => state.animationSpeed);
export const useGridEnabled = () =>
  useCanvasStore((state) => state.gridEnabled);
export const useSnapToGrid = () => useCanvasStore((state) => state.snapToGrid);
export const useGridSpacing = () =>
  useCanvasStore((state) => state.gridSpacing);
export const useShowMinimap = () =>
  useCanvasStore((state) => state.showMinimap);
export const useDefaultConnectionType = () =>
  useCanvasStore((state) => state.defaultConnectionType);
export const useDefaultPathStyle = () =>
  useCanvasStore((state) => state.defaultPathStyle);
export const useSmartRouting = () =>
  useCanvasStore((state) => state.smartRouting);
export const useBundleConnections = () =>
  useCanvasStore((state) => state.bundleConnections);
export const useTourCompleted = () =>
  useCanvasStore((state) => state.tourCompleted);
export const useDismissedTips = () =>
  useCanvasStore((state) => state.dismissedTips);

// New selectors for usage & personalization
export const useRecentComponents = () =>
  useCanvasStore((state) => state.recentComponents, shallow);
export const useFavoriteComponents = () =>
  useCanvasStore((state) => state.favoriteComponents, shallow);
export const useLastUsedComponent = () =>
  useCanvasStore((state) => state.lastUsedComponent);

export const useCanvasActions = () => mutableCanvasActions;

export const useCanvasUndo = () => useCanvasStore.temporal.getState().undo;
export const useCanvasRedo = () => useCanvasStore.temporal.getState().redo;
export const useCanvasCanUndo = () =>
  useCanvasStore.temporal.getState().pastStates.length > 0;
export const useCanvasCanRedo = () =>
  useCanvasStore.temporal.getState().futureStates.length > 0;

export const getCanvasState = () => useCanvasStore.getState();

export const useNormalizedCanvasData = () =>
  useCanvasStore((state) => ({
    components: state.components,
    connections: state.connections,
    infoCards: state.infoCards,
    annotations: state.annotations,
    drawings: state.drawings,
  }));

export const useComponentsByType = (type: string) =>
  useCanvasStore((state) =>
    state.components.filter((component) => component.type === type),
  );

export const useComponentsByLayer = (layerId: string) =>
  useCanvasStore((state) =>
    state.components.filter(
      (component) => (component.layerId || "default") === layerId,
    ),
  );

export const useConnectionsForComponent = (componentId: string) =>
  useCanvasStore((state) => ({
    incoming: state.connections.filter(
      (connection) => connection.to === componentId,
    ),
    outgoing: state.connections.filter(
      (connection) => connection.from === componentId,
    ),
  }));

export const useInfoCardsInRegion = (
  x: number,
  y: number,
  width: number,
  height: number,
) =>
  useCanvasStore((state) =>
    state.infoCards.filter(
      (card) =>
        card.x >= x &&
        card.x <= x + width &&
        card.y >= y &&
        card.y <= y + height,
    ),
  );

export const subscribeToCanvasCircuitBreaker =
  updateLimiter.subscribe.bind(updateLimiter);
export const getCanvasCircuitBreakerSnapshot = () =>
  updateLimiter.getSnapshot();

export const deepEqual = coreDeepEqual;
