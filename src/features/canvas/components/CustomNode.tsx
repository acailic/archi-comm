import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useNodePresenter } from '../hooks/useNodePresenter';
import { CustomNodeView } from './CustomNodeView';
import type { CustomNodeData } from '../types';

function CustomNodeInner({ data, selected }: NodeProps<CustomNodeData>) {
  const nodeData = data;
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
