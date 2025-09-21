import React from 'react';
import { shallow } from 'zustand/shallow';

import { ReactFlowCanvas, type ReactFlowCanvasWrapperProps } from '@canvas/components/ReactFlowCanvas';

interface CanvasContentProps {
  canvasProps: ReactFlowCanvasWrapperProps;
}

export const CanvasContent = React.memo(
  ({ canvasProps }: CanvasContentProps) => {
    return <ReactFlowCanvas {...canvasProps} />;
  },
  (prev, next) => shallow(prev.canvasProps, next.canvasProps)
);

CanvasContent.displayName = 'CanvasContent';
