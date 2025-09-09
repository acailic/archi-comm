import React, { useRef, useState, useCallback, useMemo, Suspense, memo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { DesignComponent, ToolType } from '../shared/contracts';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from './ui/context-menu';
import { snapToGrid } from '../shared/canvasUtils';
import {
  designSystem,
  getComponentGradient,
  getElevation,
  animations,
  cx,
} from '../lib/design-system';
import { getComponentIcon } from './icon-registry';

interface CanvasComponentProps {
  component: DesignComponent;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isConnectionStart: boolean;
  layerZIndex?: number;
  isVisible?: boolean;
  snapToGrid?: boolean;
  gridSpacing?: number;
  activeTool?: ToolType;
  connectionCount?: number;
  healthStatus?: 'healthy' | 'warning' | 'error';
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onStartConnection: (id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
  onGroupMove?: (componentIds: string[], deltaX: number, deltaY: number) => void;
  onDuplicate?: (componentId: string) => void;
  onBringToFront?: (componentId: string) => void;
  onSendToBack?: (componentId: string) => void;
  onCopy?: (componentId: string) => void;
  onShowProperties?: (componentId: string) => void;
  onDelete?: (componentId: string) => void;
}

// Icons and colors now provided by a lazy icon registry.

const ConnectionPoint = ({ position, onStartConnection, componentId }) => {
  const [, drag] = useDrag(() => ({
    type: 'connection-point',
    item: { fromId: componentId, fromPosition: position },
  }));

  const positionClasses = {
    top: '-top-1 left-1/2 -translate-x-1/2',
    bottom: '-bottom-1 left-1/2 -translate-x-1/2',
    left: '-left-1 top-1/2 -translate-y-1/2',
    right: '-right-1 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      ref={drag}
      className={`absolute w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair ${positionClasses[position]}`}
      onMouseDown={e => {
        e.stopPropagation();
        onStartConnection(componentId, position);
      }}
    >
      <div className='w-full h-full rounded-full bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-transform duration-200 group-hover:scale-110' />
    </div>
  );
};

function CanvasComponentInner({
  component,
  isSelected,
  isMultiSelected = false,
  isConnectionStart,
  layerZIndex = 10,
  isVisible = true,
  snapToGrid = false,
  gridSpacing = 20,
  activeTool,
  connectionCount = 0,
  healthStatus: healthStatusProp,
  onMove,
  onSelect,
  onStartConnection,
  onCompleteConnection,
  onGroupMove,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onCopy,
  onShowProperties,
  onDelete,
}: CanvasComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragPreview, setIsDragPreview] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'error'>(
    healthStatusProp || 'healthy'
  );
  const ref = useRef<HTMLDivElement>(null);
  const Icon = useMemo(() => getComponentIcon(component.type), [component.type]);
  const gradient = getComponentGradient(component.type);
  
  // Enhanced visual states based on component type and status
  const componentVisualState = useMemo(() => {
    const base = 'transition-all duration-200';
    const hover = isHovered ? 'scale-[1.02] shadow-lg' : '';
    const selected = isSelected ? 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background shadow-xl' : '';
    const multiSel = isMultiSelected ? 'ring-2 ring-blue-500/70 ring-offset-2' : '';
    const connecting = isConnectionStart ? 'ring-2 ring-amber-500/80 ring-offset-2 animate-pulse' : '';
    const dragging = isDragPreview ? 'opacity-80 scale-[1.03] rotate-[1deg] z-50' : '';
    return `${base} ${hover} ${selected} ${multiSel} ${connecting} ${dragging}`;
  }, [isHovered, isSelected, isMultiSelected, isConnectionStart, isDragPreview]);
  
  // Get architectural-specific styling
  const architecturalStyling = useMemo(() => {
    const styles: Record<string, { borderColor: string; iconColor: string }> = {
      'load-balancer': { borderColor: 'border-purple-500', iconColor: 'text-purple-600' },
      'api-gateway': { borderColor: 'border-blue-500', iconColor: 'text-blue-600' },
      database: { borderColor: 'border-green-500', iconColor: 'text-green-600' },
      cache: { borderColor: 'border-orange-500', iconColor: 'text-orange-600' },
      microservice: { borderColor: 'border-indigo-500', iconColor: 'text-indigo-600' },
      'message-queue': { borderColor: 'border-yellow-500', iconColor: 'text-yellow-600' },
    };
    return styles[component.type] || { borderColor: 'border-gray-300', iconColor: 'text-gray-600' };
  }, [component.type]);
  
  // Health status indicator
  const getHealthIndicator = useCallback(() => {
    const indicators = {
      healthy: '🟢',
      warning: '🟡', 
      error: '🔴'
    };
    return indicators[healthStatusProp || healthStatus];
  }, [healthStatus, healthStatusProp]);

  // Stable handlers for memoization effectiveness
  const handleClick = useCallback(() => onSelect(component.id), [onSelect, component.id]);
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'canvas-component',
    item: { id: component.id },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (!monitor.didDrop() && ref.current) {
        const offset = monitor.getDifferenceFromInitialOffset();
        if (offset) {
          let newX = component.x + offset.x;
          let newY = component.y + offset.y;

          // Apply snap-to-grid if enabled
          if (snapToGrid) {
            const snapped = snapToGrid(newX, newY, gridSpacing);
            newX = snapped.x;
            newY = snapped.y;
          }

          onMove(component.id, newX, newY);
        }
      }
    },
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'connection-point',
    drop: (item: { fromId: string }) => {
      if (item.fromId !== component.id) {
        onCompleteConnection(item.fromId, component.id);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
    }),
  }));

  drag(drop(ref));

  // Hide component if not visible
  if (!isVisible) {
    return null;
  }

  const baseZIndex = layerZIndex || 10;
  const draggingZIndex = baseZIndex + 100; // Maintain dragging behavior with layer offset

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={ref}
          style={{
            position: 'absolute',
            left: component.x,
            top: component.y,
            transform: isDragging ? 'rotate(5deg)' : 'none',
            zIndex: isDragging ? draggingZIndex : baseZIndex,
          }}
          className={cx(
            'w-44 h-28 cursor-move group canvas-component touch-friendly',
            componentVisualState,
            isOver && 'ring-2 ring-emerald-500/80',
            getElevation(isSelected ? 4 : 2),
            animations.hoverRaise,
            animations.pulseGlow,
            architecturalStyling.borderColor
          )}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={cx(
              'w-full h-full rounded-xl border',
              designSystem.glass.surface,
              'bg-[var(--component-bg)]'
            )}
          >
            <div
              className={cx(
                'w-full h-9 rounded-t-xl flex items-center justify-between px-2 text-white shadow-sm',
                'border-b border-white/10',
                'bg-gradient-to-br',
                gradient
              )}
            >
              <Suspense fallback={<div className='w-4 h-4 rounded-sm bg-white/40' />}>
                <Icon className={cx('w-4 h-4', architecturalStyling.iconColor)} />
              </Suspense>
              
              {/* Health status indicator */}
              <div className="text-xs opacity-90">
                {getHealthIndicator()}
              </div>
              
              {/* Component type badge */}
              <div className="absolute -top-1 -right-1 text-[8px] bg-background/90 text-foreground px-1 rounded-full border border-border/50">
                {component.type.split('-')[0].toUpperCase()}
              </div>
            </div>
            <div className='px-2.5 py-1.5 text-center relative'>
              <div
                className='text-[12px] font-medium truncate tracking-[var(--letter-spacing-tight)]'
                title={component.label}
              >
                {component.label}
              </div>
              
              {/* Enhanced status indicators */}
              {isMultiSelected && (
                <div className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500/90 shadow ring-1 ring-white/30 flex items-center justify-center'>
                  <div className='w-2 h-2 bg-white rounded-full' />
                </div>
              )}
              
              {/* Architecture-specific metadata */}
              {component.properties?.version && (
                <div className="absolute bottom-0 right-1 text-[8px] text-muted-foreground opacity-75">
                  v{component.properties.version}
                </div>
              )}
              
              {/* Connection count indicator */}
              {isHovered && (
                <div className="absolute bottom-0 left-1 text-[8px] text-muted-foreground flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-current" />
                  <span>{connectionCount}</span>
                </div>
              )}
            </div>
          </div>

          <ConnectionPoint
            position='top'
            onStartConnection={onStartConnection}
            componentId={component.id}
          />
          <ConnectionPoint
            position='bottom'
            onStartConnection={onStartConnection}
            componentId={component.id}
          />
          <ConnectionPoint
            position='left'
            onStartConnection={onStartConnection}
            componentId={component.id}
          />
          <ConnectionPoint
            position='right'
            onStartConnection={onStartConnection}
            componentId={component.id}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className='w-56'>
        <ContextMenuItem onClick={() => onShowProperties?.(component.id)}>
          Edit Properties
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate?.(component.id)}>
          Duplicate
          <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopy?.(component.id)}>
          Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onBringToFront?.(component.id)}>
          Bring to Front
          <ContextMenuShortcut>Ctrl+Shift+]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSendToBack?.(component.id)}>
          Send to Back
          <ContextMenuShortcut>Ctrl+Shift+[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete?.(component.id)}
          className='text-destructive focus:text-destructive'
        >
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const CanvasComponent = memo(CanvasComponentInner);
