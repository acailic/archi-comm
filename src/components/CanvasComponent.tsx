import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { DesignComponent, ToolType } from '../App';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from './ui/context-menu';
import { snapToGrid } from './CanvasArea';
import { designSystem, getComponentGradient, getElevation, animations, cx } from '../lib/design-system';
import { 
  Server, Database, Zap, Globe, Monitor, HardDrive, Cloud, Container, 
  Layers, Activity, Shield, Key, Lock, Code, Smartphone, MessageSquare,
  Archive, BarChart3, AlertTriangle, FileText, Search, Workflow,
  GitBranch, Radio, Wifi, Cpu, Memory, Network, CloudCog,
  FolderOpen, Box, Boxes, Settings, Users, UserCheck, Webhook,
  Timer, Gauge, TrendingUp, Brain, Database as DB, HardDriveIcon
} from 'lucide-react';

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

const componentIcons: Record<DesignComponent['type'], React.ComponentType<any>> = {
  // Compute & Infrastructure
  'server': Server,
  'microservice': Box,
  'serverless': CloudCog,
  'lambda': Zap,
  'cloud-function': Cloud,

  // Containers & Orchestration
  'container': Container,
  'docker': Container,
  'kubernetes': Boxes,

  // Databases & Storage
  'database': Database,
  'postgresql': DB,
  'mysql': DB,
  'mongodb': DB,
  'redis': HardDrive,
  'cache': HardDrive,
  'storage': Archive,
  's3': Archive,
  'blob-storage': Archive,
  'file-system': FolderOpen,

  // Networking & Traffic
  'load-balancer': Zap,
  'api-gateway': Globe,
  'cdn': Cloud,
  'firewall': Shield,

  // Messaging & Communication
  'message-queue': MessageSquare,
  'websocket': Radio,
  'grpc': Network,

  // APIs & Services
  'rest-api': Code,
  'graphql': GitBranch,
  'webhook': Webhook,

  // Client Applications
  'client': Monitor,
  'web-app': Globe,
  'mobile-app': Smartphone,
  'desktop-app': Monitor,
  'iot-device': Wifi,

  // Security & Auth
  'security': Shield,
  'authentication': Key,
  'authorization': Lock,
  'oauth': UserCheck,
  'jwt': Key,

  // Monitoring & Observability
  'monitoring': Activity,
  'logging': FileText,
  'metrics': BarChart3,
  'alerting': AlertTriangle,
  'elasticsearch': Search,
  'kibana': BarChart3,

  // Data Processing
  'data-warehouse': Database,
  'data-lake': Database,
  'etl': Workflow,
  'stream-processing': Activity,

  // Patterns & Architectures
  'event-sourcing': Timer,
  'cqrs': GitBranch,
  'edge-computing': Cpu,

  // Emerging Technologies
  'blockchain': Layers,
  'ai-ml': Brain
};

const componentColors: Record<DesignComponent['type'], string> = {
  // Compute & Infrastructure
  'server': 'bg-blue-500',
  'microservice': 'bg-blue-400',
  'serverless': 'bg-sky-500',
  'lambda': 'bg-orange-400',
  'cloud-function': 'bg-blue-600',

  // Containers & Orchestration
  'container': 'bg-cyan-500',
  'docker': 'bg-blue-700',
  'kubernetes': 'bg-indigo-600',

  // Databases & Storage
  'database': 'bg-green-500',
  'postgresql': 'bg-blue-800',
  'mysql': 'bg-orange-600',
  'mongodb': 'bg-green-600',
  'redis': 'bg-red-600',
  'cache': 'bg-orange-500',
  'storage': 'bg-gray-600',
  's3': 'bg-orange-500',
  'blob-storage': 'bg-blue-500',
  'file-system': 'bg-yellow-600',

  // Networking & Traffic
  'load-balancer': 'bg-purple-500',
  'api-gateway': 'bg-red-500',
  'cdn': 'bg-purple-600',
  'firewall': 'bg-red-700',

  // Messaging & Communication
  'message-queue': 'bg-amber-500',
  'websocket': 'bg-green-400',
  'grpc': 'bg-blue-500',

  // APIs & Services
  'rest-api': 'bg-emerald-500',
  'graphql': 'bg-pink-500',
  'webhook': 'bg-violet-500',

  // Client Applications
  'client': 'bg-gray-500',
  'web-app': 'bg-blue-600',
  'mobile-app': 'bg-green-600',
  'desktop-app': 'bg-purple-600',
  'iot-device': 'bg-teal-500',

  // Security & Auth
  'security': 'bg-red-600',
  'authentication': 'bg-yellow-600',
  'authorization': 'bg-orange-600',
  'oauth': 'bg-blue-700',
  'jwt': 'bg-green-700',

  // Monitoring & Observability
  'monitoring': 'bg-blue-500',
  'logging': 'bg-gray-600',
  'metrics': 'bg-green-500',
  'alerting': 'bg-red-500',
  'elasticsearch': 'bg-yellow-500',
  'kibana': 'bg-cyan-600',

  // Data Processing
  'data-warehouse': 'bg-indigo-600',
  'data-lake': 'bg-blue-600',
  'etl': 'bg-purple-500',
  'stream-processing': 'bg-orange-500',

  // Patterns & Architectures
  'event-sourcing': 'bg-emerald-600',
  'cqrs': 'bg-violet-600',
  'edge-computing': 'bg-gray-700',

  // Emerging Technologies
  'blockchain': 'bg-yellow-700',
  'ai-ml': 'bg-pink-600'
};

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
      onMouseDown={(e) => {
        e.stopPropagation();
        onStartConnection(componentId, position);
      }}
    >
      <div className="w-full h-full rounded-full bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset] ring-2 ring-primary/20 transition-transform duration-200 group-hover:scale-110" />
    </div>
  );
};

export function CanvasComponent({
  component,
  isSelected,
  isMultiSelected = false,
  isConnectionStart,
  layerZIndex = 10,
  isVisible = true,
  snapToGrid = false,
  gridSpacing = 20,
  activeTool,
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
  const ref = useRef<HTMLDivElement>(null);
  const Icon = componentIcons[component.type] || Server;
  const gradient = getComponentGradient(component.type);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'canvas-component',
    item: { id: component.id },
    collect: (monitor) => ({
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
    collect: (monitor) => ({
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
            'w-44 h-28 cursor-move group transition-all',
            isDragging && 'opacity-80 scale-[1.03] rotate-[1deg]',
            isSelected && 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background',
            isMultiSelected && 'ring-2 ring-blue-500/70 ring-offset-2',
            isConnectionStart && 'ring-2 ring-amber-500/80 ring-offset-2 animate-pulse',
            isOver && 'ring-2 ring-emerald-500/80',
            getElevation(isSelected ? 4 : 2),
            animations.hoverRaise,
            animations.pulseGlow
          )}
          onClick={() => onSelect(component.id)}
        >
          <div className={cx('w-full h-full rounded-xl border', designSystem.glass.surface, 'bg-[var(--component-bg)]') }>
            <div className={cx('w-full h-9 rounded-t-xl flex items-center justify-center text-white shadow-sm', 'border-b border-white/10', 'bg-gradient-to-br', gradient)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="px-2.5 py-1.5 text-center relative">
              <div className="text-[12px] font-medium truncate tracking-[var(--letter-spacing-tight)]" title={component.label}>
                {component.label}
              </div>
              {isMultiSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500/90 shadow ring-1 ring-white/30 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </div>
          </div>

          <ConnectionPoint position="top" onStartConnection={onStartConnection} componentId={component.id} />
          <ConnectionPoint position="bottom" onStartConnection={onStartConnection} componentId={component.id} />
          <ConnectionPoint position="left" onStartConnection={onStartConnection} componentId={component.id} />
          <ConnectionPoint position="right" onStartConnection={onStartConnection} componentId={component.id} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
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
          className="text-destructive focus:text-destructive"
        >
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
