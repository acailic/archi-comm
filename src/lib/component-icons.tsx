// src/lib/component-icons.tsx
// Shared component icon mapping for both palette and canvas
// Provides consistent icons across the application
// RELEVANT FILES: ComponentPalette.tsx, CustomNode.tsx

import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Box,
  Boxes,
  Brain,
  Cloud,
  CloudCog,
  Code,
  Container,
  Cpu,
  Database,
  Database as DB,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Monitor,
  Network,
  Radio,
  Search,
  Server,
  Shield,
  Smartphone,
  Timer,
  UserCheck,
  Webhook,
  Wifi,
  Workflow,
  Zap,
} from 'lucide-react';
import type { DesignComponent } from '../shared/contracts';

export interface ComponentIconMapping {
  type: DesignComponent['type'];
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

export const componentIconMap: Record<DesignComponent['type'], ComponentIconMapping> = {
  // Compute & Infrastructure
  'server': { type: 'server', icon: Server, color: 'bg-blue-500' },
  'microservice': { type: 'microservice', icon: Box, color: 'bg-blue-400' },
  'serverless': { type: 'serverless', icon: CloudCog, color: 'bg-sky-500' },
  'lambda': { type: 'lambda', icon: Zap, color: 'bg-orange-400' },
  'cloud-function': { type: 'cloud-function', icon: Cloud, color: 'bg-blue-600' },

  // Containers & Orchestration
  'container': { type: 'container', icon: Container, color: 'bg-cyan-500' },
  'docker': { type: 'docker', icon: Container, color: 'bg-blue-700' },
  'kubernetes': { type: 'kubernetes', icon: Boxes, color: 'bg-indigo-600' },

  // Databases & Storage
  'database': { type: 'database', icon: Database, color: 'bg-green-500' },
  'postgresql': { type: 'postgresql', icon: DB, color: 'bg-blue-800' },
  'mysql': { type: 'mysql', icon: DB, color: 'bg-orange-600' },
  'mongodb': { type: 'mongodb', icon: DB, color: 'bg-green-600' },
  'redis': { type: 'redis', icon: HardDrive, color: 'bg-red-600' },
  'cache': { type: 'cache', icon: HardDrive, color: 'bg-orange-500' },
  'storage': { type: 'storage', icon: Archive, color: 'bg-gray-600' },
  's3': { type: 's3', icon: Archive, color: 'bg-orange-500' },
  'blob-storage': { type: 'blob-storage', icon: Archive, color: 'bg-blue-500' },
  'file-system': { type: 'file-system', icon: FolderOpen, color: 'bg-yellow-600' },

  // Networking & Traffic
  'load-balancer': { type: 'load-balancer', icon: Zap, color: 'bg-purple-500' },
  'api-gateway': { type: 'api-gateway', icon: Globe, color: 'bg-red-500' },
  'cdn': { type: 'cdn', icon: Cloud, color: 'bg-purple-600' },
  'firewall': { type: 'firewall', icon: Shield, color: 'bg-red-700' },

  // Messaging & Communication
  'message-queue': { type: 'message-queue', icon: MessageSquare, color: 'bg-amber-500' },
  'websocket': { type: 'websocket', icon: Radio, color: 'bg-green-400' },
  'grpc': { type: 'grpc', icon: Network, color: 'bg-blue-500' },

  // APIs & Services
  'rest-api': { type: 'rest-api', icon: Code, color: 'bg-emerald-500' },
  'graphql': { type: 'graphql', icon: GitBranch, color: 'bg-pink-500' },
  'webhook': { type: 'webhook', icon: Webhook, color: 'bg-violet-500' },

  // Client Applications
  'client': { type: 'client', icon: Monitor, color: 'bg-gray-500' },
  'web-app': { type: 'web-app', icon: Globe, color: 'bg-blue-600' },
  'mobile-app': { type: 'mobile-app', icon: Smartphone, color: 'bg-green-600' },
  'desktop-app': { type: 'desktop-app', icon: Monitor, color: 'bg-purple-600' },
  'iot-device': { type: 'iot-device', icon: Wifi, color: 'bg-teal-500' },

  // Security & Auth
  'security': { type: 'security', icon: Shield, color: 'bg-red-600' },
  'authentication': { type: 'authentication', icon: Key, color: 'bg-yellow-600' },
  'authorization': { type: 'authorization', icon: Lock, color: 'bg-orange-600' },
  'oauth': { type: 'oauth', icon: UserCheck, color: 'bg-blue-700' },
  'jwt': { type: 'jwt', icon: Key, color: 'bg-green-700' },

  // Monitoring & Observability
  'monitoring': { type: 'monitoring', icon: Activity, color: 'bg-blue-500' },
  'logging': { type: 'logging', icon: FileText, color: 'bg-gray-600' },
  'metrics': { type: 'metrics', icon: BarChart3, color: 'bg-green-500' },
  'alerting': { type: 'alerting', icon: AlertTriangle, color: 'bg-red-500' },
  'elasticsearch': { type: 'elasticsearch', icon: Search, color: 'bg-yellow-500' },
  'kibana': { type: 'kibana', icon: BarChart3, color: 'bg-cyan-600' },

  // Data Processing
  'data-warehouse': { type: 'data-warehouse', icon: Database, color: 'bg-indigo-600' },
  'data-lake': { type: 'data-lake', icon: Database, color: 'bg-blue-600' },
  'etl': { type: 'etl', icon: Workflow, color: 'bg-purple-500' },
  'stream-processing': { type: 'stream-processing', icon: Activity, color: 'bg-orange-500' },

  // Patterns & Architectures
  'event-sourcing': { type: 'event-sourcing', icon: Timer, color: 'bg-emerald-600' },
  'cqrs': { type: 'cqrs', icon: GitBranch, color: 'bg-violet-600' },
  'edge-computing': { type: 'edge-computing', icon: Cpu, color: 'bg-gray-700' },

  // Emerging Technologies
  'blockchain': { type: 'blockchain', icon: Layers, color: 'bg-yellow-700' },
  'ai-ml': { type: 'ai-ml', icon: Brain, color: 'bg-pink-600' },
};

export function getComponentIcon(componentType: DesignComponent['type']): ComponentIconMapping {
  return componentIconMap[componentType] || {
    type: componentType,
    icon: Box,
    color: 'bg-gray-500'
  };
}