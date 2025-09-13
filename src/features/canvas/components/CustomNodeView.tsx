/**
 * src/features/canvas/components/CustomNodeView.tsx
 * Pure presentation component for rendering node UI without business logic
 * Receives all data and handlers from useNodePresenter hook following presenter pattern
 * RELEVANT FILES: CustomNode.tsx, useNodePresenter.ts, component-styles.ts, ComponentIcon.tsx
 */

import { Handle, Position } from '@xyflow/react';
import { Suspense } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { Input } from '../../../components/ui/input';
import {
  animations,
  cx,
  designSystem,
  getElevation,
} from '../../../lib/design-system';
import { getComponentIcon } from '../../../lib/component-icons';
import { getHealthIndicator } from '../utils/component-styles';
import type { CustomNodeData } from '../types';
import type { UseNodePresenterResult } from '../hooks/useNodePresenter';
import type { DesignComponent } from '../../../shared/contracts';

// Component Icon utility - keeping it local as it's simple
const ComponentIcon = ({ type, className }: { type: DesignComponent['type']; className?: string }) => {
  const iconMapping = getComponentIcon(type);
  const IconComponent = iconMapping.icon;

  return (
    <IconComponent className={className} />
  );
};

interface CustomNodeViewProps {
  presenter: UseNodePresenterResult;
  nodeData: CustomNodeData;
  selected: boolean;
}

export function CustomNodeView({ presenter, nodeData, selected }: CustomNodeViewProps) {
  const { state, actions, computed } = presenter;
  const {
    component,
    isSelected,
    isMultiSelected = false,
    isVisible = true,
    connectionCount = 0,
    healthStatus: healthStatusProp,
    onDuplicate,
    onBringToFront,
    onSendToBack,
    onCopy,
    onShowProperties,
    onDelete,
  } = nodeData;

  // Hide component if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cx(
            'w-44 h-28 cursor-move group canvas-component touch-friendly',
            computed.visualStateClasses,
            getElevation((selected || state.visualState.isSelected) ? 4 : 2),
            animations.hoverRaise,
            animations.pulseGlow,
            computed.architecturalStyling.borderColor
          )}
          onMouseEnter={actions.handleMouseEnter}
          onMouseLeave={actions.handleMouseLeave}
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
                computed.gradient
              )}
            >
              <Suspense fallback={<div className='w-5 h-5 rounded-md bg-white/40' />}>
                <div className={`w-5 h-5 rounded-md ${computed.iconInfo.color} flex items-center justify-center shadow-sm`}>
                  <ComponentIcon type={component.type} className='w-3 h-3 text-white' />
                </div>
              </Suspense>

              {/* Health status indicator */}
              <div className="text-xs opacity-90">
                {getHealthIndicator(healthStatusProp || state.healthStatus)}
              </div>

              {/* Component type badge - hidden as requested */}
              {/* <div className="absolute -top-1 -right-1 text-[8px] bg-background/90 text-foreground px-1 rounded-full border border-border/50">
                {component.type.split('-')[0].toUpperCase()}
              </div> */}
            </div>
            <div className='px-2.5 py-1.5 text-center relative'>
              {(component.properties?.showLabel !== false) && (
                <div className='relative'>
                  {state.isEditingLabel ? (
                    <Input
                      autoFocus
                      value={state.labelDraft}
                      onChange={(e) => actions.handleLabelInput(e.target.value)}
                      onBlur={actions.commitEdit}
                      onKeyDown={actions.handleKeyDown}
                      className='h-7 text-[13px] px-2 py-1'
                      placeholder='Name this component'
                    />
                  ) : (
                    <button
                      className='w-full text-[13px] font-semibold truncate text-foreground/90 leading-tight hover:underline'
                      title={component.label || 'Click to name'}
                      onClick={actions.startEdit}
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
              {state.isHovered && connectionCount > 0 && (
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
              isSelected || state.visualState.isConnectionStart
                ? "opacity-80 scale-110"
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection('top');
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-80 scale-110"
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection('bottom');
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-80 scale-110"
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection('left');
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className={cx(
              "w-3 h-3 rounded-full cursor-crosshair !bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-all duration-200 nodrag",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-80 scale-110"
                : "opacity-30 group-hover:opacity-100 group-hover:scale-110"
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection('right');
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