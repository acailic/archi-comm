// src/stores/canvasUIStore.ts
// Canvas UI and interaction state store
// Manages selections, groups, drawing tools, search, alignment guides, and transient animations
// RELEVANT FILES: canvasStore.ts, canvasViewStore.ts, canvasDataStore.ts, componentLibrary.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AlignmentGuide,
  ComponentGroup,
  DrawingSettings,
  DrawingTool,
} from "@/shared/contracts";
import { componentLibrary } from "@/shared/data/componentLibrary";
import { newGroupId } from "@/lib/utils/id";
import type { BaseActionOptions } from "./types";
import { useCanvasDataStore } from "./canvasDataStore";

// Helper for localStorage (SSR-safe)
const safeLoadJSON = <T>(key: string): T | null => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const safeSaveJSON = (key: string, value: unknown) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const LOCAL_KEYS = {
  RECENT: "canvas-recent-components",
  FAVORITES: "canvas-favorite-components",
  LAST: "canvas-last-used-component",
};

const typeToCategory = componentLibrary.reduce<Record<string, string>>(
  (acc, comp) => {
    acc[comp.type.toLowerCase()] = comp.category.toLowerCase();
    return acc;
  },
  {},
);

/**
 * Canvas UI Store State
 *
 * Manages UI interaction state:
 * - Multi-select and selection box
 * - Component groups
 * - Alignment guides
 * - Component locking
 * - Search and filtering
 * - Drawing tool settings
 * - Quick-connect state
 * - Usage tracking (recent/favorite components)
 * - Transient animation states
 */
interface CanvasUIState {
  // Selection state
  selectedComponent: string | null;
  selectedComponentIds: string[];
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  lastSelectedId: string | null;

  // Connection state
  connectionStart: string | null;
  quickConnectSource: string | null;
  quickConnectPreview: { x: number; y: number } | null;

  // Component groups (not persisted)
  componentGroups: ComponentGroup[];

  // Alignment guides (not persisted)
  alignmentGuides: AlignmentGuide[];

  // Component locking (not persisted - temporary workflow aid)
  lockedComponentIds: Set<string>;

  // Search/filter (not persisted - session specific)
  componentSearchQuery: string;
  componentFilterCategory: string | null;

  // Drawing tool settings (persisted)
  drawingTool: DrawingTool;
  drawingColor: string;
  drawingSize: number;
  drawingSettings: DrawingSettings;

  // Usage tracking (persisted)
  recentComponents: string[];
  favoriteComponents: string[];
  lastUsedComponent: string | null;

  // Transient animation states (not persisted)
  droppedComponentId: string | null;
  snappingComponentId: string | null;
  flowingConnectionIds: string[];
  draggedComponentId: string | null;
}

interface CanvasUIActions {
  // Selection actions
  setSelectedComponent: (id: string | null) => void;
  setSelectedComponents: (ids: string[], options?: BaseActionOptions) => void;
  toggleComponentSelection: (id: string) => void;
  clearSelection: () => void;
  setSelectionBox: (box: { x: number; y: number; width: number; height: number } | null) => void;

  // Connection actions
  setConnectionStart: (id: string | null) => void;
  setQuickConnectSource: (nodeId: string | null) => void;
  setQuickConnectPreview: (position: { x: number; y: number } | null) => void;

  // Group actions
  groupComponents: (componentIds: string[], name?: string) => ComponentGroup | null;
  ungroupComponents: (groupId: string) => void;
  recomputeGroupBounds: (groupId: string) => void;

  // Alignment actions
  clearAlignmentGuides: () => void;
  updateAlignmentGuides: (movingComponentId: string, newX: number, newY: number) => void;

  // Locking actions
  lockComponents: (componentIds: string[]) => void;
  unlockComponents: (componentIds: string[]) => void;

  // Search/filter actions
  setComponentSearchQuery: (query: string) => void;
  setComponentFilterCategory: (category: string | null) => void;

  // Drawing tool actions
  setDrawingTool: (tool: DrawingTool) => void;
  setDrawingColor: (color: string) => void;
  setDrawingSize: (size: number) => void;
  updateDrawingSettings: (settings: Partial<DrawingSettings>) => void;

  // Usage tracking actions
  trackComponentUsage: (componentType: string) => void;
  toggleFavoriteComponent: (componentType: string) => void;

  // Animation state actions
  setDraggedComponent: (componentId: string | null) => void;
  setDroppedComponent: (componentId: string | null) => void;
  setSnappingComponent: (componentId: string | null) => void;
  addFlowingConnection: (connectionId: string) => void;
  removeFlowingConnection: (connectionId: string) => void;
}

type CanvasUIStore = CanvasUIState & CanvasUIActions;

let alignmentGuideTimeoutId: ReturnType<typeof setTimeout> | null = null;

const initialState: CanvasUIState = {
  selectedComponent: null,
  selectedComponentIds: [],
  selectionBox: null,
  lastSelectedId: null,
  connectionStart: null,
  quickConnectSource: null,
  quickConnectPreview: null,
  componentGroups: [],
  alignmentGuides: [],
  lockedComponentIds: new Set(),
  componentSearchQuery: "",
  componentFilterCategory: null,
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
  recentComponents: safeLoadJSON<string[]>(LOCAL_KEYS.RECENT) || [],
  favoriteComponents: safeLoadJSON<string[]>(LOCAL_KEYS.FAVORITES) || [],
  lastUsedComponent: safeLoadJSON<string>(LOCAL_KEYS.LAST) || null,
  droppedComponentId: null,
  snappingComponentId: null,
  flowingConnectionIds: [],
  draggedComponentId: null,
};

export const useCanvasUIStore = create<CanvasUIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Selection actions
      setSelectedComponent: (id) => set({ selectedComponent: id }),

      setSelectedComponents: (ids) =>
        set({ selectedComponentIds: ids, lastSelectedId: ids[ids.length - 1] || null }),

      toggleComponentSelection: (id) => {
        const current = get().selectedComponentIds;
        const newSelection = current.includes(id)
          ? current.filter((cid) => cid !== id)
          : [...current, id];
        get().setSelectedComponents(newSelection);
      },

      clearSelection: () => set({ selectedComponentIds: [], lastSelectedId: null }),

      setSelectionBox: (box) => set({ selectionBox: box }),

      // Connection actions
      setConnectionStart: (id) => set({ connectionStart: id }),
      setQuickConnectSource: (nodeId) => set({ quickConnectSource: nodeId }),
      setQuickConnectPreview: (position) => set({ quickConnectPreview: position }),

      // Group actions
      groupComponents: (componentIds, name) => {
        const dataState = useCanvasDataStore.getState();
        const components = dataState.components.filter((c) => componentIds.includes(c.id));
        if (components.length < 2) return null;

        const minX = Math.min(...components.map((c) => c.x));
        const minY = Math.min(...components.map((c) => c.y));
        const maxX = Math.max(...components.map((c) => c.x + (c.width || 220)));
        const maxY = Math.max(...components.map((c) => c.y + (c.height || 140)));

        const groupId = newGroupId();
        const currentGroups = get().componentGroups;
        const group: ComponentGroup = {
          id: groupId,
          name: name || `Group ${currentGroups.length + 1}`,
          componentIds,
          x: minX - 10,
          y: minY - 10,
          width: maxX - minX + 20,
          height: maxY - minY + 20,
        };

        set({ componentGroups: [...currentGroups, group] });

        // Update components in data store
        useCanvasDataStore.getState().updateComponents((comps) =>
          comps.map((c) => (componentIds.includes(c.id) ? { ...c, groupId } : c)),
        );

        return group;
      },

      ungroupComponents: (groupId) => {
        const group = get().componentGroups.find((g) => g.id === groupId);
        if (!group) return;

        set({ componentGroups: get().componentGroups.filter((g) => g.id !== groupId) });

        // Update components in data store
        useCanvasDataStore.getState().updateComponents((comps) =>
          comps.map((c) => {
            if (c.groupId === groupId) {
              const { groupId: _, ...rest } = c;
              return rest as typeof c;
            }
            return c;
          }),
        );
      },

      recomputeGroupBounds: (groupId) => {
        const group = get().componentGroups.find((g) => g.id === groupId);
        if (!group) return;

        const dataState = useCanvasDataStore.getState();
        const components = dataState.components.filter((c) => group.componentIds.includes(c.id));
        if (components.length === 0) return;

        const minX = Math.min(...components.map((c) => c.x));
        const minY = Math.min(...components.map((c) => c.y));
        const maxX = Math.max(...components.map((c) => c.x + (c.width || 220)));
        const maxY = Math.max(...components.map((c) => c.y + (c.height || 140)));

        set({
          componentGroups: get().componentGroups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  x: minX - 10,
                  y: minY - 10,
                  width: maxX - minX + 20,
                  height: maxY - minY + 20,
                }
              : g,
          ),
        });
      },

      // Alignment actions
      clearAlignmentGuides: () => {
        if (alignmentGuideTimeoutId !== null) {
          clearTimeout(alignmentGuideTimeoutId);
          alignmentGuideTimeoutId = null;
        }
        set({ alignmentGuides: [] });
      },

      updateAlignmentGuides: (movingComponentId, newX, newY) => {
        const dataState = useCanvasDataStore.getState();
        const movingComp = dataState.components.find((c) => c.id === movingComponentId);
        if (!movingComp) return;

        const guides: AlignmentGuide[] = [];
        const threshold = 5;

        dataState.components.forEach((comp) => {
          if (comp.id === movingComponentId) return;

          const compCenterX = comp.x + (comp.width || 220) / 2;
          const compCenterY = comp.y + (comp.height || 140) / 2;
          const movingCenterX = newX + (movingComp.width || 220) / 2;
          const movingCenterY = newY + (movingComp.height || 140) / 2;

          if (Math.abs(movingCenterX - compCenterX) < threshold) {
            guides.push({
              id: `v-${comp.id}`,
              type: "vertical",
              position: compCenterX,
              componentIds: [movingComponentId, comp.id],
              visible: true,
            });
          }

          if (Math.abs(movingCenterY - compCenterY) < threshold) {
            guides.push({
              id: `h-${comp.id}`,
              type: "horizontal",
              position: compCenterY,
              componentIds: [movingComponentId, comp.id],
              visible: true,
            });
          }
        });

        if (alignmentGuideTimeoutId !== null) {
          clearTimeout(alignmentGuideTimeoutId);
        }

        set({ alignmentGuides: guides });

        if (guides.length > 0) {
          alignmentGuideTimeoutId = setTimeout(() => {
            get().clearAlignmentGuides();
          }, 1000);
        }
      },

      // Locking actions
      lockComponents: (componentIds) => {
        useCanvasDataStore.getState().updateComponents((comps) =>
          comps.map((c) => (componentIds.includes(c.id) ? { ...c, locked: true } : c)),
        );
      },

      unlockComponents: (componentIds) => {
        useCanvasDataStore.getState().updateComponents((comps) =>
          comps.map((c) => (componentIds.includes(c.id) ? { ...c, locked: false } : c)),
        );
      },

      // Search/filter actions
      setComponentSearchQuery: (query) => set({ componentSearchQuery: query }),
      setComponentFilterCategory: (category) => set({ componentFilterCategory: category }),

      // Drawing tool actions
      setDrawingTool: (tool) =>
        set((state) => ({
          drawingTool: tool,
          drawingSettings: { ...state.drawingSettings, tool },
        })),

      setDrawingColor: (color) =>
        set((state) => ({
          drawingColor: color,
          drawingSettings: { ...state.drawingSettings, color },
        })),

      setDrawingSize: (size) => {
        const clamped = Math.max(1, Math.min(20, size));
        set((state) => ({
          drawingSize: clamped,
          drawingSettings: { ...state.drawingSettings, size: clamped },
        }));
      },

      updateDrawingSettings: (settings) =>
        set((state) => ({
          drawingSettings: { ...state.drawingSettings, ...settings },
        })),

      // Usage tracking actions
      trackComponentUsage: (componentType) => {
        if (!componentType) return;

        const current = get().recentComponents;
        const idx = current.indexOf(componentType);
        const updated = idx !== -1 ? current.filter((_, i) => i !== idx) : current;
        const newRecent = [componentType, ...updated].slice(0, 8);

        set({
          lastUsedComponent: componentType,
          recentComponents: newRecent,
        });

        safeSaveJSON(LOCAL_KEYS.RECENT, newRecent);
        safeSaveJSON(LOCAL_KEYS.LAST, componentType);
      },

      toggleFavoriteComponent: (componentType) => {
        if (!componentType) return;

        const current = get().favoriteComponents;
        const isFavorite = current.includes(componentType);

        if (!isFavorite && current.length >= 5) {
          console.warn("Maximum 5 favorite components allowed");
          return;
        }

        const updated = isFavorite
          ? current.filter((t) => t !== componentType)
          : [...current, componentType];

        set({ favoriteComponents: updated });
        safeSaveJSON(LOCAL_KEYS.FAVORITES, updated);
      },

      // Animation state actions
      setDraggedComponent: (componentId) => set({ draggedComponentId: componentId }),

      setDroppedComponent: (componentId) => {
        if (componentId === null) {
          set({ droppedComponentId: null });
          return;
        }

        set({ droppedComponentId: componentId });
        setTimeout(() => {
          if (get().droppedComponentId === componentId) {
            set({ droppedComponentId: null });
          }
        }, 600);
      },

      setSnappingComponent: (componentId) => {
        if (componentId === null) {
          set({ snappingComponentId: null });
          return;
        }

        set({ snappingComponentId: componentId });
        setTimeout(() => {
          if (get().snappingComponentId === componentId) {
            set({ snappingComponentId: null });
          }
        }, 300);
      },

      addFlowingConnection: (connectionId) => {
        const current = get().flowingConnectionIds;
        if (!current.includes(connectionId)) {
          set({ flowingConnectionIds: [...current, connectionId] });
        }
      },

      removeFlowingConnection: (connectionId) => {
        set({
          flowingConnectionIds: get().flowingConnectionIds.filter((id) => id !== connectionId),
        });
      },
    }),
    {
      name: "canvas-ui-storage",
      partialize: (state) => ({
        drawingColor: state.drawingColor,
        drawingSize: state.drawingSize,
        drawingSettings: state.drawingSettings,
        recentComponents: state.recentComponents,
        favoriteComponents: state.favoriteComponents,
        lastUsedComponent: state.lastUsedComponent,
      }),
    },
  ),
);

// Convenient selectors
export const useSelectedComponent = () => useCanvasUIStore((state) => state.selectedComponent);
export const useSelectedComponentIds = () => useCanvasUIStore((state) => state.selectedComponentIds);
export const useSelectionBox = () => useCanvasUIStore((state) => state.selectionBox);
export const useIsComponentSelected = (id: string) =>
  useCanvasUIStore((state) => state.selectedComponentIds.includes(id));
export const useConnectionStart = () => useCanvasUIStore((state) => state.connectionStart);
export const useQuickConnectSource = () => useCanvasUIStore((state) => state.quickConnectSource);
export const useQuickConnectPreview = () => useCanvasUIStore((state) => state.quickConnectPreview);
export const useComponentGroups = () => useCanvasUIStore((state) => state.componentGroups);
export const useComponentGroup = (groupId: string) =>
  useCanvasUIStore((state) => state.componentGroups.find((g) => g.id === groupId));
export const useAlignmentGuides = () => useCanvasUIStore((state) => state.alignmentGuides);
export const useIsComponentLocked = (id: string) => {
  const components = useCanvasDataStore((state) => state.components);
  const component = components.find((c) => c.id === id);
  return component?.locked || false;
};
export const useComponentSearchQuery = () => useCanvasUIStore((state) => state.componentSearchQuery);
export const useComponentFilterCategory = () => useCanvasUIStore((state) => state.componentFilterCategory);
export const useDrawingTool = () => useCanvasUIStore((state) => state.drawingTool);
export const useDrawingColor = () => useCanvasUIStore((state) => state.drawingColor);
export const useDrawingSize = () => useCanvasUIStore((state) => state.drawingSize);
export const useDrawingSettings = () => useCanvasUIStore((state) => state.drawingSettings);
export const useRecentComponents = () => useCanvasUIStore((state) => state.recentComponents);
export const useFavoriteComponents = () => useCanvasUIStore((state) => state.favoriteComponents);
export const useLastUsedComponent = () => useCanvasUIStore((state) => state.lastUsedComponent);
export const useDraggedComponentId = () => useCanvasUIStore((state) => state.draggedComponentId);
export const useDroppedComponentId = () => useCanvasUIStore((state) => state.droppedComponentId);
export const useSnappingComponentId = () => useCanvasUIStore((state) => state.snappingComponentId);
export const useFlowingConnectionIds = () => useCanvasUIStore((state) => state.flowingConnectionIds);

// Filtered components selector
export const useFilteredComponents = () => {
  const query = useCanvasUIStore((state) => state.componentSearchQuery.trim().toLowerCase());
  const category = useCanvasUIStore((state) => state.componentFilterCategory?.toLowerCase() || null);

  let filtered = componentLibrary;

  if (category && category !== "all") {
    filtered = filtered.filter((comp) => {
      const resolvedCategory =
        typeToCategory[comp.type.toLowerCase()] ?? comp.category.toLowerCase();
      return resolvedCategory === category;
    });
  }

  if (query) {
    filtered = filtered.filter((comp) => {
      const labelMatch = comp.label.toLowerCase().includes(query);
      const typeMatch = comp.type.toLowerCase().includes(query);
      const descriptionMatch = comp.description.toLowerCase().includes(query);
      return labelMatch || typeMatch || descriptionMatch;
    });
  }

  return filtered;
};
