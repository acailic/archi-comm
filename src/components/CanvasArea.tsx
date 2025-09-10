// src/components/CanvasArea.tsx
// Simple canvas area component for MVP version
// Handles drag and drop for components and connection rendering
// RELEVANT FILES: CanvasComponent.tsx, DesignCanvas.tsx

import React, { useRef, useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { CanvasComponent } from './CanvasComponent';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Trash2, Edit3, Zap, ArrowRight, MoreHorizontal } from 'lucide-react';
import type { DesignComponent, Connection, Layer } from '../shared/contracts';

interface CanvasAreaProps {
  components: DesignComponent[];
  connections: Connection[];
  layers: Layer[];
  activeLayerId: string | null;
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

  // Create SVG path for connections
  const createConnectionPath = useCallback((from: DesignComponent, to: DesignComponent) => {
    const startX = from.x + 60; // Component width/2
    const startY = from.y + 40; // Component height/2
    const endX = to.x + 60;
    const endY = to.y + 40;

    switch (connectionStyle) {
      case 'straight':
        return `M ${startX} ${startY} L ${endX} ${endY}`;
      case 'stepped':
        const midX = startX + (endX - startX) / 2;
        return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      case 'curved':
      default:
        const controlX1 = startX + (endX - startX) / 3;
        const controlY1 = startY;
        const controlX2 = startX + (2 * (endX - startX)) / 3;
        const controlY2 = endY;
        return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
    }
  }, [connectionStyle]);

  // Get connection path with component lookup
  const getConnectionPath = useCallback((connection: Connection) => {
    const fromComponent = components.find(c => c.id === connection.from);
    const toComponent = components.find(c => c.id === connection.to);
    
    if (!fromComponent || !toComponent) return '';
    return createConnectionPath(fromComponent, toComponent);
  }, [components, createConnectionPath]);

  // Combined ref for drop functionality
  const combinedRef = useCallback((node: HTMLDivElement) => {
    canvasRef.current = node;
    drop(node);
  }, [drop]);

  return (
    <div className="relative w-full h-full bg-muted/10 overflow-hidden" ref={combinedRef}>
      {/* Connection style controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        <Select value={connectionStyle} onValueChange={(value: 'straight' | 'curved' | 'stepped') => setConnectionStyle(value)}>
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

      {/* Connections SVG Layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {connections.map((connection) => {
          const path = getConnectionPath(connection);
          if (!path) return null;

          const isSelected = selectedConnection === connection.id;
          const isHighlighted = connectionStart === connection.from || connectionStart === connection.to;

          return (
            <g key={connection.id}>
              {/* Connection line */}
              <path
                d={path}
                stroke={
                  isSelected
                    ? '#3b82f6'
                    : isHighlighted
                    ? '#6366f1'
                    : '#6b7280'
                }
                strokeWidth={isSelected ? 3 : 2}
                fill="none"
                markerEnd={
                  isSelected
                    ? "url(#arrowhead-selected)"
                    : isHighlighted
                    ? "url(#arrowhead-highlighted)"
                    : "url(#arrowhead)"
                }
                className="transition-all duration-200"
                strokeDasharray={connection.type === 'event' ? '5,5' : 'none'}
              />

              {/* Connection label */}
              {connection.label && (
                <foreignObject
                  x={
                    (components.find(c => c.id === connection.from)?.x || 0) +
                    (components.find(c => c.id === connection.to)?.x || 0) / 2
                  }
                  y={
                    (components.find(c => c.id === connection.from)?.y || 0) +
                    (components.find(c => c.id === connection.to)?.y || 0) / 2 - 10
                  }
                  width="100"
                  height="20"
                  className="pointer-events-auto"
                >
                  <div className="flex justify-center">
                    <Badge
                      variant={isSelected ? 'default' : 'secondary'}
                      className="text-xs cursor-pointer bg-card/90 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnection(isSelected ? null : connection.id);
                      }}
                    >
                      {connection.label}
                    </Badge>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Arrow marker definitions */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#6b7280"
            />
          </marker>
          <marker
            id="arrowhead-selected"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#3b82f6"
            />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#6366f1"
            />
          </marker>
        </defs>
      </svg>

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

      {/* Connection editing popover */}
      {selectedConnection && (
        <Popover open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <PopoverTrigger asChild>
            <div className="absolute top-0 left-0 pointer-events-none" />
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Connection Settings</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConnection(null)}
                >
                  ×
                </Button>
              </div>
              
              {(() => {
                const connection = connections.find(c => c.id === selectedConnection);
                if (!connection) return null;

                return (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Label</label>
                      <input
                        type="text"
                        value={connection.label}
                        onChange={(e) => onConnectionLabelChange(connection.id, e.target.value)}
                        className="w-full mt-1 px-2 py-1 text-sm border rounded"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={connection.type}
                        onValueChange={(value) => onConnectionTypeChange?.(connection.id, value as Connection['type'])}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="data">Data</SelectItem>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="message">Message</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        onConnectionDelete?.(connection.id);
                        setSelectedConnection(null);
                      }}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Connection
                    </Button>
                  </div>
                );
              })()}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}