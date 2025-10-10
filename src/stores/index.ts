// src/stores/index.ts
// Unified exports for canvas stores
// Re-exports from split stores for backward compatibility and convenient imports
// RELEVANT FILES: canvasViewStore.ts, canvasDataStore.ts, canvasUIStore.ts, canvasStore.ts

/**
 * Canvas Store Migration Guide
 *
 * The monolithic canvasStore (2028 LOC) has been split into 3 focused stores:
 *
 * 1. canvasViewStore - View preferences (grid, minimap, animations, theme)
 * 2. canvasDataStore - Canvas data (components, connections, annotations, drawings)
 * 3. canvasUIStore - UI interaction state (selections, groups, drawing tools, search)
 *
 * MIGRATION PATH:
 * - Old code can continue using unified exports from this file
 * - New code should import directly from specific stores for better performance
 * - Use shallow selectors to prevent unnecessary re-renders
 *
 * PERFORMANCE BENEFITS:
 * - Reduced re-renders (components only subscribe to relevant state slices)
 * - Better code splitting and tree-shaking
 * - Clearer separation of concerns
 * - Each store under 300 LOC (vs 2028 LOC monolith)
 */

// Re-export all stores
export { useCanvasViewStore } from "./canvasViewStore";
export { useCanvasDataStore } from "./canvasDataStore";
export { useCanvasUIStore } from "./canvasUIStore";

// Re-export types
export type { CanvasMode, PathStyle, BaseActionOptions } from "./types";

// Re-export all selectors for backward compatibility
export * from "./canvasViewStore";
export * from "./canvasDataStore";
export * from "./canvasUIStore";

// Unified actions for backward compatibility
import { useCanvasViewStore } from "./canvasViewStore";
import { useCanvasDataStore } from "./canvasDataStore";
import { useCanvasUIStore } from "./canvasUIStore";

export const canvasActions = {
  // View actions
  setCanvasMode: useCanvasViewStore.getState().setCanvasMode,
  toggleGrid: useCanvasViewStore.getState().toggleGrid,
  toggleSnapToGrid: useCanvasViewStore.getState().toggleSnapToGrid,
  setGridSpacing: useCanvasViewStore.getState().setGridSpacing,
  toggleMinimap: useCanvasViewStore.getState().toggleMinimap,
  toggleAnimations: useCanvasViewStore.getState().toggleAnimations,
  setAnimationSpeed: useCanvasViewStore.getState().setAnimationSpeed,
  setVisualTheme: useCanvasViewStore.getState().setVisualTheme,
  setDefaultConnectionType: useCanvasViewStore.getState().setDefaultConnectionType,
  setDefaultPathStyle: useCanvasViewStore.getState().setDefaultPathStyle,
  toggleSmartRouting: useCanvasViewStore.getState().toggleSmartRouting,
  toggleConnectionBundling: useCanvasViewStore.getState().toggleConnectionBundling,
  setLayerVisibility: useCanvasViewStore.getState().setLayerVisibility,
  toggleLayerVisibility: useCanvasViewStore.getState().toggleLayerVisibility,
  setAllLayersVisibility: useCanvasViewStore.getState().setAllLayersVisibility,
  setLayerOpacity: useCanvasViewStore.getState().setLayerOpacity,
  markTourCompleted: useCanvasViewStore.getState().markTourCompleted,
  dismissTip: useCanvasViewStore.getState().dismissTip,

  // Data actions
  setComponents: useCanvasDataStore.getState().setComponents,
  updateComponents: useCanvasDataStore.getState().updateComponents,
  setConnections: useCanvasDataStore.getState().setConnections,
  updateConnections: useCanvasDataStore.getState().updateConnections,
  setInfoCards: useCanvasDataStore.getState().setInfoCards,
  updateInfoCards: useCanvasDataStore.getState().updateInfoCards,
  setAnnotations: useCanvasDataStore.getState().setAnnotations,
  addAnnotation: useCanvasDataStore.getState().addAnnotation,
  updateAnnotation: useCanvasDataStore.getState().updateAnnotation,
  deleteAnnotation: useCanvasDataStore.getState().deleteAnnotation,
  clearAnnotations: useCanvasDataStore.getState().clearAnnotations,
  updateAnnotations: useCanvasDataStore.getState().updateAnnotations,
  setDrawings: useCanvasDataStore.getState().setDrawings,
  addDrawing: useCanvasDataStore.getState().addDrawing,
  updateDrawing: useCanvasDataStore.getState().updateDrawing,
  deleteDrawing: useCanvasDataStore.getState().deleteDrawing,
  clearDrawings: useCanvasDataStore.getState().clearDrawings,
  updateDrawings: useCanvasDataStore.getState().updateDrawings,
  updateCanvasData: useCanvasDataStore.getState().updateCanvasData,
  resetCanvas: useCanvasDataStore.getState().resetCanvas,

  // UI actions
  setSelectedComponent: useCanvasUIStore.getState().setSelectedComponent,
  setSelectedComponents: useCanvasUIStore.getState().setSelectedComponents,
  toggleComponentSelection: useCanvasUIStore.getState().toggleComponentSelection,
  clearSelection: useCanvasUIStore.getState().clearSelection,
  setSelectionBox: useCanvasUIStore.getState().setSelectionBox,
  setConnectionStart: useCanvasUIStore.getState().setConnectionStart,
  setQuickConnectSource: useCanvasUIStore.getState().setQuickConnectSource,
  setQuickConnectPreview: useCanvasUIStore.getState().setQuickConnectPreview,
  groupComponents: useCanvasUIStore.getState().groupComponents,
  ungroupComponents: useCanvasUIStore.getState().ungroupComponents,
  recomputeGroupBounds: useCanvasUIStore.getState().recomputeGroupBounds,
  clearAlignmentGuides: useCanvasUIStore.getState().clearAlignmentGuides,
  updateAlignmentGuides: useCanvasUIStore.getState().updateAlignmentGuides,
  lockComponents: useCanvasUIStore.getState().lockComponents,
  unlockComponents: useCanvasUIStore.getState().unlockComponents,
  setComponentSearchQuery: useCanvasUIStore.getState().setComponentSearchQuery,
  setComponentFilterCategory: useCanvasUIStore.getState().setComponentFilterCategory,
  setDrawingTool: useCanvasUIStore.getState().setDrawingTool,
  setDrawingColor: useCanvasUIStore.getState().setDrawingColor,
  setDrawingSize: useCanvasUIStore.getState().setDrawingSize,
  updateDrawingSettings: useCanvasUIStore.getState().updateDrawingSettings,
  trackComponentUsage: useCanvasUIStore.getState().trackComponentUsage,
  toggleFavoriteComponent: useCanvasUIStore.getState().toggleFavoriteComponent,
  setDraggedComponent: useCanvasUIStore.getState().setDraggedComponent,
  setDroppedComponent: useCanvasUIStore.getState().setDroppedComponent,
  setSnappingComponent: useCanvasUIStore.getState().setSnappingComponent,
  addFlowingConnection: useCanvasUIStore.getState().addFlowingConnection,
  removeFlowingConnection: useCanvasUIStore.getState().removeFlowingConnection,
};

// Hook to access all actions (for backward compatibility)
export const useCanvasActions = () => canvasActions;

// Deprecated - for backward compatibility only
// New code should use canvasActions directly
export const useCanvasStore = {
  getState: () => ({
    ...useCanvasViewStore.getState(),
    ...useCanvasDataStore.getState(),
    ...useCanvasUIStore.getState(),
  }),
  temporal: useCanvasDataStore.temporal,
};
