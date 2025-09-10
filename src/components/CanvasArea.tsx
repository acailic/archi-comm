// src/components/CanvasArea.tsx
// Simple canvas area component for MVP version
// Handles drag and drop for components and connection rendering
// RELEVANT FILES: CanvasComponent.tsx, DesignCanvas.tsx

import { useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import type { Connection } from '../shared/types';
import { CanvasComponent } from './CanvasComponent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { ConnectionEditorPopover } from '@/features/canvas/components/ConnectionEditorPopover';
import { ConnectionSvgLayer } from '@/features/canvas/components/ConnectionSvgLayer';
import { useConnectionEditor } from '@/features/canvas/hooks/useConnectionEditor';

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

export function CanvasArea({
  components,
  connections,
  selectedComponent,
  connectionStart,
  onComponentDrop,
  onComponentMove,
  onComponentSelect,
  onConnectionLabelChange,
  onConnectionDelete,
  onConnectionTypeChange,
  onStartConnection,
  onCompleteConnection
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'stepped'>('curved');

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'component',
    drop: (item: { type: DesignComponent['type'] }, monitor) => {
      if (!canvasRef.current) return;

      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current.getBoundingClientRect();

      if (offset) {
        const x = offset.x - canvasRect.left;
        const y = offset.y - canvasRect.top;
        onComponentDrop(item.type, x, y);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onComponentDrop]);

  const {
    selectedConnection,
    popoverPosition,
    handleConnectionSelect,
    handleConnectionUpdate,
    closeEditor
  } = useConnectionEditor({
    connections,
    onConnectionLabelChange,
    onConnectionTypeChange: onConnectionTypeChange ?? (() => {}),
    onConnectionDelete: onConnectionDelete ?? (() => {})
  });

  return (
    <div
      ref={(node) => {
        canvasRef.current = node;
        drop(node);
      }}
      className="relative w-full h-full bg-muted/10 overflow-hidden"
    >
      {/* Connection style controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <Select
          value={connectionStyle}
          onValueChange={(value: 'straight' | 'curved' | 'stepped') => setConnectionStyle(value)}
        >
          <SelectTrigger className="w-32 bg-card/95 backdrop-blur-sm border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="straight">Straight</SelectItem>
            <SelectItem value="curved">Curved</SelectItem>
            <SelectItem value="stepped">Stepped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drop zone indicator */}
      {isOver && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border">
            <p className="text-sm font-medium">Drop component here</p>
          </div>
        </div>
      )}

      {/* Connections Layer */}
      <ConnectionSvgLayer
        connections={connections}
        components={components}
        connectionStyle={connectionStyle}
        selectedConnection={selectedConnection}
        connectionStart={connectionStart}
        onConnectionSelect={handleConnectionSelect}
      />

      {/* Components Layer */}
      <div className="relative w-full h-full" style={{ zIndex: 2 }}>
        {components.map((component) => (
          <CanvasComponent
            key={component.id}
            component={component}
            isSelected={selectedComponent === component.id}
            isConnectionStart={connectionStart === component.id}
            onMove={onComponentMove}
            onSelect={onComponentSelect}
            onStartConnection={onStartConnection}
            onCompleteConnection={onCompleteConnection}
            connectionStart={connectionStart}
          />
        ))}
      </div>

      {/* Connection editor popover */}
      {selectedConnection && popoverPosition && (
        <ConnectionEditorPopover
          selectedConnection={selectedConnection}
          x={popoverPosition.x}
          y={popoverPosition.y}
          onLabelChange={handleConnectionUpdate.onLabelChange}
          onTypeChange={handleConnectionUpdate.onTypeChange}
          onDelete={handleConnectionUpdate.onDelete}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
