import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useNodePresenter } from '../hooks/useNodePresenter';
import type { CustomNodeData } from '../types';
import { CustomNodeView } from './CustomNodeView';

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

export const CustomNode = memo(CustomNodeInner);

// Set displayName for better debugging
CustomNode.displayName = 'CustomNode';
