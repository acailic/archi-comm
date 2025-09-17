// src/stores/canvas/index.ts
// Barrel export for canvas store functionality
// Maintains backward compatibility with existing imports
// RELEVANT FILES: ../canvasStore.ts, slices/coreSlice.ts, slices/uiSlice.ts, utils/validation.ts

export {
  useCanvasStore,
  useCanvasComponents,
  useCanvasConnections,
  useCanvasInfoCards,
  useCanvasSelectedComponent,
  useCanvasConnectionStart,
  useCanvasVisualTheme,
  useCanvasActions,
} from '../canvasStore';