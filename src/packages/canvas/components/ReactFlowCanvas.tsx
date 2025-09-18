/**
 * ReactFlowCanvas - Modular Canvas Architecture
 *
 * This component has been refactored into a modular architecture for better
 * maintainability and render loop prevention. The new architecture consists of:
 *
 * - CanvasController: Main orchestration and state management
 * - NodeLayer: Node creation and management
 * - EdgeLayer: Edge/connection management
 * - LayoutEngine: ELK auto-layout functionality
 * - VirtualizationLayer: Viewport-based virtualization
 * - CanvasInteractionLayer: User interactions (DnD, context menu, keyboard)
 * - CanvasContext: Shared state and callbacks between layers
 *
 * Each layer has its own render guard and performance monitoring.
 *
 * @deprecated The monolithic implementation has been replaced with ReactFlowCanvasWrapper
 * for improved maintainability and render stability. This export is maintained for
 * backward compatibility.
 */

export { ReactFlowCanvasWrapper as ReactFlowCanvas } from './ReactFlowCanvasWrapper';
export type { ReactFlowCanvasWrapperProps as ReactFlowCanvasProps } from './ReactFlowCanvasWrapper';
