import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useNodePresenter } from '../hooks/useNodePresenter';
import type { CustomNodeData } from '../types';
import { CustomNodeView } from './CustomNodeView';
import { createCanvasNodeComponent } from '@/shared/utils/hotLeafMemoization';
import { equalityFunctions } from '@/shared/utils/memoization';

/**
 * Custom node component for rendering nodes in the canvas.
 * Uses useNodePresenter for memoization and rendering logic.
 * @param data - The node data containing component information
 * @param selected - Whether the node is currently selected
 * @returns JSX element representing the custom node
 */
function CustomNodeInner({ data, selected }: NodeProps<CustomNodeData | undefined>): JSX.Element | null {
  // Add a guard clause to handle missing data
  if (!data) {
    // Render nothing or a fallback UI if data is not available
    return null;
  }

  const presenter = useNodePresenter(data, selected);

  return <CustomNodeView presenter={presenter} nodeData={data} selected={selected} />;
}

// Create optimized canvas node with hot leaf memoization
export const CustomNode = createCanvasNodeComponent(CustomNodeInner, {
  positionSensitive: true,
  styleSensitive: true,
  interactionSensitive: true,
  trackPerformance: true,
  displayName: 'CustomNode',
  debugMode: import.meta.env.DEV,
});
