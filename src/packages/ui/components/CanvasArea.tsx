// src/components/CanvasArea.tsx
// Wrapper component that uses React Flow for canvas functionality
// Handles the integration between the domain layer and React Flow
// RELEVANT FILES: ReactFlowCanvas.tsx, DesignCanvas.tsx, CanvasOrchestrator.tsx

import type { DesignComponent , Connection } from '../shared/contracts/index';
import { ReactFlowCanvas } from '@canvas/components/ReactFlowCanvas';

interface CanvasAreaProps {
  components: DesignComponent[];
  connections: Connection[];
  selectedComponent: string | null;
  connectionStart: string | null;
  onComponentDrop: (type: DesignComponent['type'], x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string) => void;
  onConnectionLabelChange: (id: string, label: string) => void;
  onConnectionDelete?: (id: string) => void;
  onConnectionTypeChange?: (id: string, type: Connection['type']) => void;
  onStartConnection: (id: string) => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
  gridStyle?: 'dots' | 'lines';
  snapToGrid?: boolean;
  gridSpacing?: number;
  showConnectors?: boolean;
}

/**
 * Canvas Area component that uses React Flow for all canvas operations.
 * Acts as a simple wrapper around ReactFlowCanvas to maintain API compatibility
 * with the rest of the application.
 */
export function CanvasArea(props: CanvasAreaProps) {
  return (
    <ReactFlowCanvas {...props} />
  );
}
