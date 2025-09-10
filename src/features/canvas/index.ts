/**
 * src/features/canvas/index.ts
 * Barrel export file for canvas feature
 * Provides unified access to canvas components, hooks, and utilities
 * RELEVANT FILES: CanvasArea.tsx, CanvasComponent.tsx, connection-paths.ts
 */

// Components
export { ConnectionPoint } from './components/ConnectionPoint';
export { ConnectionSvgLayer } from './components/ConnectionSvgLayer';
export { ConnectionEditorPopover } from './components/ConnectionEditorPopover';

// Hooks
export { useComponentDrag } from './hooks/useComponentDrag';
export { useConnectionEditor } from './hooks/useConnectionEditor';
export { useCanvasLayout } from './hooks/useCanvasLayout';

// Utilities
export {
  getConnectionPath,
  createStraightPath,
  createCurvedPath,
  createSteppedPath,
  getConnectionEndpoints,
  calculateConnectionPoints
} from './utils/connection-paths';

export {
  getComponentVisualState,
  getArchitecturalStyling,
  getHealthIndicator,
  getComponentGradient
} from './utils/component-styles';