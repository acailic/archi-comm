import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import { Suspense, memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import {
  animations,
  cx,
  designSystem,
  getElevation,
} from '../../../lib/design-system';
import { getComponentIcon } from '../../../lib/component-icons';
import type { DesignComponent } from '../../../shared/contracts';
import { Input } from '../../../components/ui/input';
import {
  getArchitecturalStyling,
  getComponentGradient,
  getComponentVisualState,
  getHealthIndicator,
  type ComponentVisualState,
} from '../utils/component-styles';

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
  onSelect: (id: string) => void;
  onStartConnection: (id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
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

// Real Lucide icon component using shared icon mapping
const ComponentIcon = ({ type, className }: { type: DesignComponent['type']; className?: string }) => {
  const iconMapping = getComponentIcon(type);
  const IconComponent = iconMapping.icon;
  
  return (
    <IconComponent className={className} />
  );
};

function CustomNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const {
    component,
    isSelected,
    isMultiSelected = false,
    isConnectionStart,
    isVisible = true,
    connectionCount = 0,
    healthStatus: healthStatusProp,
    onSelect,
    onStartConnection,
    onDuplicate,
    onBringToFront,
    onSendToBack,
    onCopy,
    onShowProperties,
    onDelete,
  } = nodeData;

  const [isHovered, setIsHovered] = useState(false);
  const [healthStatus] = useState<'healthy' | 'warning' | 'error'>(
    healthStatusProp || 'healthy'
  );
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(component.label || '');
  const ref = useRef<HTMLDivElement>(null);

  const architecturalStyling = getArchitecturalStyling(component.type);
  const gradient = getComponentGradient(component.type);
  const iconInfo = getComponentIcon(component.type);

  // Enhanced visual states based on component type and status
  const visualState: ComponentVisualState = {
    isHovered,
    isSelected: isSelected || selected,
    isMultiSelected,
    isConnectionStart,
    isDragPreview: false, // React Flow handles dragging internally
  };

  const componentVisualState = getComponentVisualState(visualState);

  // Stable handlers for memoization effectiveness
  const handleClick = useCallback(() => onSelect(nodeData.component.id), [onSelect, nodeData.component.id]);
  const startEdit = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditingLabel(true);
    setLabelDraft(component.label || '');
  }, [component.label]);
  const commitEdit = useCallback(() => {
    setIsEditingLabel(false);
    const next = labelDraft.trim();
    if (nodeData.onLabelChange) {
      nodeData.onLabelChange(component.id, next);
    }
  }, [labelDraft, nodeData.onLabelChange, component.id]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingLabel(false);
      setLabelDraft(component.label || '');
    }
  }, [commitEdit, component.label]);
  useEffect(() => {
    if (!isEditingLabel) {
      setLabelDraft(component.label || '');
    }
  }, [component.label, isEditingLabel]);
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const handleStartConnection = useCallback((position: 'top' | 'bottom' | 'left' | 'right') => {
    onStartConnection(nodeData.component.id, position);
  }, [onStartConnection, component.id]);

  // Hide component if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={ref}
          className={cx(
            'w-44 h-28 cursor-move group canvas-component touch-friendly',
            componentVisualState,
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
              <Suspense fallback={<div className='w-5 h-5 rounded-md bg-white/40' />}>
                <div className={`w-5 h-5 rounded-md ${iconInfo.color} flex items-center justify-center shadow-sm`}>
                  <ComponentIcon type={component.type} className='w-3 h-3 text-white' />
                </div>
              </Suspense>

              {/* Health status indicator */}
              <div className="text-xs opacity-90">
                {getHealthIndicator(healthStatusProp || healthStatus)}
              </div>

              {/* Component type badge - hidden as requested */}
              {/* <div className="absolute -top-1 -right-1 text-[8px] bg-background/90 text-foreground px-1 rounded-full border border-border/50">
                {component.type.split('-')[0].toUpperCase()}
              </div> */}
            </div>
            <div className='px-2.5 py-1.5 text-center relative'>
              {(component.properties?.showLabel !== false) && (
                <div className='relative'>
                  {isEditingLabel ? (
                    <Input
                      autoFocus
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className='h-7 text-[13px] px-2 py-1'
                      placeholder='Name this component'
                    />
                  ) : (
                    <button
                      className='w-full text-[13px] font-semibold truncate text-foreground/90 leading-tight hover:underline'
                      title={component.label || 'Click to name'}
                      onClick={startEdit}
                    >
                      {component.label || <span className='text-muted-foreground'>Click to name</span>}
                    </button>
                  )}
                </div>
              )}

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
              {isHovered && connectionCount > 0 && (
                <div className="absolute bottom-0 left-1 text-[8px] text-muted-foreground flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-current" />
                  <span>{connectionCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* React Flow Handles for connection points */}
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || isConnectionStart 
                ? "opacity-80 scale-110" 
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartConnection('top');
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || isConnectionStart 
                ? "opacity-80 scale-110" 
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartConnection('bottom');
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || isConnectionStart 
                ? "opacity-80 scale-110" 
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartConnection('left');
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || isConnectionStart 
                ? "opacity-80 scale-110" 
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartConnection('right');
            }}
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

export const CustomNode = memo(CustomNodeInner);
