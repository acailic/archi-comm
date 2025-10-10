// src/stores/canvasViewStore.ts
// Canvas view and UI preferences store
// Manages viewport, grid, animations, theme, and visual settings
// RELEVANT FILES: canvasStore.ts, canvasDataStore.ts, canvasUIStore.ts, design-system.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasMode, PathStyle } from "./types";
import type { Connection } from "@/shared/contracts";

/**
 * Canvas View Store State
 *
 * Handles all view-related preferences:
 * - Canvas mode (select, pan, draw, annotation, quick-connect)
 * - Grid settings (enabled, spacing, snap-to-grid)
 * - Minimap visibility
 * - Animation preferences
 * - Visual theme
 * - Connection styling preferences
 * - Layer visibility and opacity
 * - Onboarding state
 */
interface CanvasViewState {
  // Canvas mode
  canvasMode: CanvasMode;

  // Grid settings
  gridEnabled: boolean;
  snapToGrid: boolean;
  gridSpacing: number;

  // Minimap
  showMinimap: boolean;

  // Animations
  animationsEnabled: boolean;
  animationSpeed: number;

  // Visual theme
  visualTheme: "serious" | "playful";

  // Connection preferences
  defaultConnectionType: Connection["type"];
  defaultPathStyle: PathStyle;
  smartRouting: boolean;
  bundleConnections: boolean;

  // Layer visibility
  layerVisibility: Record<string, boolean>;
  layerOpacity: Record<string, number>;

  // Alignment guides
  showAlignmentGuides: boolean;

  // Onboarding
  tourCompleted: boolean;
  dismissedTips: string[];
}

interface CanvasViewActions {
  // Mode actions
  setCanvasMode: (mode: CanvasMode) => void;

  // Grid actions
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSpacing: (spacing: number) => void;

  // Minimap actions
  toggleMinimap: () => void;

  // Animation actions
  toggleAnimations: () => void;
  setAnimationSpeed: (speed: number) => void;

  // Theme actions
  setVisualTheme: (theme: "serious" | "playful") => void;

  // Connection preference actions
  setDefaultConnectionType: (type: Connection["type"]) => void;
  setDefaultPathStyle: (style: PathStyle) => void;
  toggleSmartRouting: () => void;
  toggleConnectionBundling: () => void;

  // Layer actions
  setLayerVisibility: (layer: string, visible: boolean) => void;
  toggleLayerVisibility: (layer: string) => void;
  setAllLayersVisibility: (visible: boolean) => void;
  setLayerOpacity: (layer: string, opacity: number) => void;

  // Onboarding actions
  markTourCompleted: () => void;
  dismissTip: (tipId: string) => void;
}

type CanvasViewStore = CanvasViewState & CanvasViewActions;

const initialState: CanvasViewState = {
  canvasMode: "select",
  gridEnabled: true,
  snapToGrid: false,
  gridSpacing: 20,
  showMinimap: true,
  animationsEnabled: true,
  animationSpeed: 1.0,
  visualTheme: "serious",
  defaultConnectionType: "data",
  defaultPathStyle: "curved",
  smartRouting: false,
  bundleConnections: false,
  layerVisibility: {
    components: true,
    connections: true,
    drawings: true,
    annotations: true,
    infoCards: true,
  },
  layerOpacity: {
    components: 1,
    connections: 1,
    drawings: 1,
    annotations: 1,
    infoCards: 1,
  },
  showAlignmentGuides: true,
  tourCompleted: false,
  dismissedTips: [],
};

export const useCanvasViewStore = create<CanvasViewStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Mode actions
      setCanvasMode: (mode) => set({ canvasMode: mode }),

      // Grid actions
      toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),
      toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
      setGridSpacing: (spacing) => {
        const clamped = Math.max(10, Math.min(100, spacing));
        set({ gridSpacing: clamped });
      },

      // Minimap actions
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

      // Animation actions
      toggleAnimations: () => set((state) => ({ animationsEnabled: !state.animationsEnabled })),
      setAnimationSpeed: (speed) => {
        const clamped = Math.max(0.5, Math.min(2.0, speed));
        set({ animationSpeed: clamped });
      },

      // Theme actions
      setVisualTheme: (theme) => set({ visualTheme: theme }),

      // Connection preference actions
      setDefaultConnectionType: (type) => set({ defaultConnectionType: type }),
      setDefaultPathStyle: (style) => set({ defaultPathStyle: style }),
      toggleSmartRouting: () => set((state) => ({ smartRouting: !state.smartRouting })),
      toggleConnectionBundling: () => set((state) => ({ bundleConnections: !state.bundleConnections })),

      // Layer actions
      setLayerVisibility: (layer, visible) =>
        set((state) => ({
          layerVisibility: { ...state.layerVisibility, [layer]: visible },
        })),
      toggleLayerVisibility: (layer) =>
        set((state) => ({
          layerVisibility: {
            ...state.layerVisibility,
            [layer]: !state.layerVisibility[layer],
          },
        })),
      setAllLayersVisibility: (visible) =>
        set((state) => {
          const updated = { ...state.layerVisibility };
          Object.keys(updated).forEach((layer) => {
            updated[layer] = visible;
          });
          return { layerVisibility: updated };
        }),
      setLayerOpacity: (layer, opacity) => {
        const clamped = Math.max(0, Math.min(1, opacity));
        set((state) => ({
          layerOpacity: { ...state.layerOpacity, [layer]: clamped },
        }));
      },

      // Onboarding actions
      markTourCompleted: () => set({ tourCompleted: true }),
      dismissTip: (tipId) =>
        set((state) => ({
          dismissedTips: state.dismissedTips.includes(tipId)
            ? state.dismissedTips
            : [...state.dismissedTips, tipId],
        })),
    }),
    {
      name: "canvas-view-storage",
      partialize: (state) => ({
        gridEnabled: state.gridEnabled,
        snapToGrid: state.snapToGrid,
        gridSpacing: state.gridSpacing,
        showMinimap: state.showMinimap,
        animationsEnabled: state.animationsEnabled,
        animationSpeed: state.animationSpeed,
        visualTheme: state.visualTheme,
        defaultConnectionType: state.defaultConnectionType,
        defaultPathStyle: state.defaultPathStyle,
        smartRouting: state.smartRouting,
        bundleConnections: state.bundleConnections,
        layerVisibility: state.layerVisibility,
        layerOpacity: state.layerOpacity,
        tourCompleted: state.tourCompleted,
        dismissedTips: state.dismissedTips,
      }),
    },
  ),
);

// Convenient selectors
export const useCanvasMode = () => useCanvasViewStore((state) => state.canvasMode);
export const useGridEnabled = () => useCanvasViewStore((state) => state.gridEnabled);
export const useSnapToGrid = () => useCanvasViewStore((state) => state.snapToGrid);
export const useGridSpacing = () => useCanvasViewStore((state) => state.gridSpacing);
export const useShowMinimap = () => useCanvasViewStore((state) => state.showMinimap);
export const useAnimationsEnabled = () => useCanvasViewStore((state) => state.animationsEnabled);
export const useAnimationSpeed = () => useCanvasViewStore((state) => state.animationSpeed);
export const useVisualTheme = () => useCanvasViewStore((state) => state.visualTheme);
export const useDefaultConnectionType = () => useCanvasViewStore((state) => state.defaultConnectionType);
export const useDefaultPathStyle = () => useCanvasViewStore((state) => state.defaultPathStyle);
export const useSmartRouting = () => useCanvasViewStore((state) => state.smartRouting);
export const useBundleConnections = () => useCanvasViewStore((state) => state.bundleConnections);
export const useLayerVisibility = (layer: string) =>
  useCanvasViewStore((state) => state.layerVisibility[layer] ?? true);
export const useLayerOpacity = (layer: string) =>
  useCanvasViewStore((state) => state.layerOpacity[layer] ?? 1);
export const useTourCompleted = () => useCanvasViewStore((state) => state.tourCompleted);
export const useDismissedTips = () => useCanvasViewStore((state) => state.dismissedTips);
