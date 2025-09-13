import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useNodePresenter } from '../hooks/useNodePresenter';
import { CustomNodeView } from './CustomNodeView';
import type { CustomNodeData } from '../types';

// Comment 1: Update prop type and add guard clause
function CustomNodeInner({ data, selected }: NodeProps<CustomNodeData | undefined>) {
  // Comment 1: Add a guard clause to handle missing data
  if (!data) {
    // Render nothing or a fallback UI if data is not available
    return null;
  }

  const nodeData = data;
  // Comment 2: Add a check to ensure nodeData is not undefined before calling the hook
  if (!nodeData) {
    return null; // Or a placeholder component
  }
  
  const presenter = useNodePresenter(nodeData, selected);

  return (
    <CustomNodeView
      presenter={presenter}
      nodeData={nodeData}
      selected={selected}
    />
  );
}

export const CustomNode = memo(CustomNodeInner);
