import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { DesignComponent } from '../App';
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
  isConnectionStart: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onStartConnection: (id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
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

const ConnectionPoint = ({ position, onStartConnection, component }) => {
  const [, drag] = useDrag(() => ({
    type: 'connection-point',
    item: { fromId: component.id, fromComponent: component, fromPosition: position },
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
      className={`absolute w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${positionClasses[position]}`}
      onMouseDown={(e) => {
        e.stopPropagation();
        onStartConnection(component.id, position);
      }}
    />
  );
};

export function CanvasComponent({
  component,
  isSelected,
  isConnectionStart,
  onMove,
  onSelect,
  onStartConnection,
  onCompleteConnection,
}: CanvasComponentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = componentIcons[component.type] || Server;
  const bgColor = componentColors[component.type] || 'bg-gray-500';

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
          onMove(component.id, component.x + offset.x, component.y + offset.y);
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

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: component.x,
        top: component.y,
        transform: isDragging ? 'rotate(5deg)' : 'none',
      }}
      className={`
        w-32 h-20 cursor-move transition-all duration-200 group
        ${isDragging ? 'opacity-75 z-50 scale-105' : 'z-10'}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isConnectionStart ? 'ring-2 ring-yellow-500 ring-offset-2 animate-pulse' : ''}
        ${isOver ? 'ring-2 ring-green-500' : ''}
      `}
      onClick={() => onSelect(component.id)}
    >
      <div className={`
        w-full h-full rounded-lg shadow-lg border-2
        ${isSelected ? 'border-primary' : 'border-border'}
        ${isConnectionStart ? 'border-yellow-500' : ''}
        ${isOver ? 'border-green-500' : ''}
        bg-background hover:shadow-xl transition-shadow
      `}>
        <div className={`w-full h-8 ${bgColor} rounded-t-md flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="px-2 py-1 text-center">
          <div className="text-xs font-medium truncate" title={component.label}>
            {component.label}
          </div>
        </div>
      </div>

      <ConnectionPoint position="top" onStartConnection={onStartConnection} component={component} />
      <ConnectionPoint position="bottom" onStartConnection={onStartConnection} component={component} />
      <ConnectionPoint position="left" onStartConnection={onStartConnection} component={component} />
      <ConnectionPoint position="right" onStartConnection={onStartConnection} component={component} />
    </div>
  );
}