/**
 * src/packages/canvas/types.ts
 * Shared type definitions for canvas components
 * Centralizes CustomNodeData and other canvas types to avoid cyclic dependencies
 * RELEVANT FILES: CustomNode.tsx, CustomNodeView.tsx, useNodePresenter.ts, ReactFlowCanvas.tsx, ReactFlowCanvasWrapper.tsx
 */

import type { Node } from "@xyflow/react";
import type { DesignComponent } from "../../shared/contracts";

// Re-export shared types for convenience
export type {
  Connection,
  DesignComponent,
  InfoCard,
} from "../../shared/contracts";

// Define the custom node data type for React Flow
export interface CustomNodeData extends Record<string, unknown> {
  component: DesignComponent;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isConnectionStart: boolean;
  layerZIndex?: number;
  isVisible?: boolean;
  connectionCount?: number;
  healthStatus?: "healthy" | "warning" | "error";
  visualTheme?: "serious" | "playful";
  connectionSourceType?: string; // Type of the component starting the connection (for validation)
  onSelect: (id: string) => void;
  onStartConnection: (
    id: string,
    position?: "top" | "bottom" | "left" | "right"
  ) => void;
  onCompleteConnection?: (targetId: string) => void;
  onDuplicate?: (componentId: string) => void;
  onBringToFront?: (componentId: string) => void;
  onSendToBack?: (componentId: string) => void;
  onCopy?: (componentId: string) => void;
  onShowProperties?: (componentId: string) => void;
  onDelete?: (componentId: string) => void;
  onLabelChange?: (id: string, label: string) => void;
}

// Custom node type for React Flow
export type CustomReactFlowNode = Node<CustomNodeData>;
