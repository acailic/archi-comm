/**
 * src/features/canvas/types.ts
 * Shared type definitions for canvas components
 * Centralizes CustomNodeData and other canvas types to avoid cyclic dependencies
 * RELEVANT FILES: CustomNode.tsx, CustomNodeView.tsx, useNodePresenter.ts, ReactFlowCanvas.tsx
 */

import type { Node } from '@xyflow/react';
import type { DesignComponent } from '@shared/contracts';

// Define the custom node data type for React Flow
export interface CustomNodeData extends Record<string, unknown> {
  component: DesignComponent;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isConnectionStart: boolean;
  layerZIndex?: number;
  isVisible?: boolean;
  connectionCount?: number;
  healthStatus?: 'healthy' | 'warning' | 'error';
  visualTheme?: 'serious' | 'playful';
  onSelect: (id: string) => void;
  onStartConnection: (id: string, position?: 'top' | 'bottom' | 'left' | 'right') => void;
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
