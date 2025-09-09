import React from 'react';

// Lazy-loaded lucide-react icons with simple registry helpers
// We intentionally avoid importing named icons statically to enable code-splitting.

type IconComponent = React.ComponentType<any>;

// Map component types to lucide-react export names
const iconNameMap: Record<string, string> = {
  // Compute & Infrastructure
  server: 'Server',
  microservice: 'Box',
  serverless: 'CloudCog',
  lambda: 'Zap',
  'cloud-function': 'Cloud',

  // Containers & Orchestration
  container: 'Container',
  docker: 'Container',
  kubernetes: 'Boxes',

  // Databases & Storage
  database: 'Database',
  postgresql: 'Database',
  mysql: 'Database',
  mongodb: 'Database',
  redis: 'HardDrive',
  cache: 'HardDrive',
  storage: 'Archive',
  s3: 'Archive',
  'blob-storage': 'Archive',
  'file-system': 'FolderOpen',

  // Networking & Traffic
  'load-balancer': 'Zap',
  'api-gateway': 'Globe',
  cdn: 'Cloud',
  firewall: 'Shield',

  // Messaging & Communication
  'message-queue': 'MessageSquare',
  websocket: 'Radio',
  grpc: 'Network',

  // APIs & Services
  'rest-api': 'Code',
  graphql: 'GitBranch',
  webhook: 'Webhook',

  // Client Applications
  client: 'Monitor',
  'web-app': 'Globe',
  'mobile-app': 'Smartphone',
  'desktop-app': 'Monitor',
  'iot-device': 'Wifi',

  // Security & Auth
  security: 'Shield',
  authentication: 'Key',
  authorization: 'Lock',
  oauth: 'UserCheck',
  jwt: 'Key',

  // Monitoring & Observability
  monitoring: 'Activity',
  logging: 'FileText',
  metrics: 'BarChart3',
  alerting: 'AlertTriangle',
  elasticsearch: 'Search',
  kibana: 'BarChart3',

  // Data Processing
  'data-warehouse': 'Database',
  'data-lake': 'Database',
  etl: 'Workflow',
  'stream-processing': 'Activity',

  // Patterns & Architectures
  'event-sourcing': 'Timer',
  cqrs: 'GitBranch',
  'edge-computing': 'Cpu',

  // Emerging Technologies
  blockchain: 'Layers',
  'ai-ml': 'Brain',
};

// Color classes mapped by component type
export const componentColors: Record<string, string> = {
  // Compute & Infrastructure
  server: 'bg-blue-500',
  microservice: 'bg-blue-400',
  serverless: 'bg-sky-500',
  lambda: 'bg-orange-400',
  'cloud-function': 'bg-blue-600',

  // Containers & Orchestration
  container: 'bg-cyan-500',
  docker: 'bg-blue-700',
  kubernetes: 'bg-indigo-600',

  // Databases & Storage
  database: 'bg-green-500',
  postgresql: 'bg-blue-800',
  mysql: 'bg-orange-600',
  mongodb: 'bg-green-600',
  redis: 'bg-red-600',
  cache: 'bg-orange-500',
  storage: 'bg-gray-600',
  s3: 'bg-orange-500',
  'blob-storage': 'bg-blue-500',
  'file-system': 'bg-yellow-600',

  // Networking & Traffic
  'load-balancer': 'bg-purple-500',
  'api-gateway': 'bg-red-500',
  cdn: 'bg-purple-600',
  firewall: 'bg-red-700',

  // Messaging & Communication
  'message-queue': 'bg-amber-500',
  websocket: 'bg-green-400',
  grpc: 'bg-blue-500',

  // APIs & Services
  'rest-api': 'bg-emerald-500',
  graphql: 'bg-pink-500',
  webhook: 'bg-violet-500',

  // Client Applications
  client: 'bg-gray-500',
  'web-app': 'bg-blue-600',
  'mobile-app': 'bg-green-600',
  'desktop-app': 'bg-purple-600',
  'iot-device': 'bg-teal-500',

  // Security & Auth
  security: 'bg-red-600',
  authentication: 'bg-yellow-600',
  authorization: 'bg-orange-600',
  oauth: 'bg-blue-700',
  jwt: 'bg-green-700',

  // Monitoring & Observability
  monitoring: 'bg-blue-500',
  logging: 'bg-gray-600',
  metrics: 'bg-green-500',
  alerting: 'bg-red-500',
  elasticsearch: 'bg-yellow-500',
  kibana: 'bg-cyan-600',

  // Data Processing
  'data-warehouse': 'bg-indigo-600',
  'data-lake': 'bg-blue-600',
  etl: 'bg-purple-500',
  'stream-processing': 'bg-orange-500',

  // Patterns & Architectures
  'event-sourcing': 'bg-emerald-600',
  cqrs: 'bg-violet-600',
  'edge-computing': 'bg-gray-700',

  // Emerging Technologies
  blockchain: 'bg-yellow-700',
  'ai-ml': 'bg-pink-600',
};

let iconModulePromise: Promise<any> | null = null;

function loadIconModule() {
  if (!iconModulePromise) {
    iconModulePromise = import('lucide-react');
  }
  return iconModulePromise;
}

export function preloadIcons(): Promise<void> {
  return loadIconModule().then(() => void 0);
}

function createLazyIcon(name: string): React.LazyExoticComponent<IconComponent> {
  return React.lazy(async () => {
    const mod = await loadIconModule();
    const Comp = (mod as any)[name] || (mod as any)['Server'];
    return { default: Comp as IconComponent };
  });
}

export function getComponentIcon(type: string): React.LazyExoticComponent<IconComponent> {
  const iconName = iconNameMap[type] || 'Server';
  return createLazyIcon(iconName);
}

export function getComponentColor(type: string): string {
  return componentColors[type] || 'bg-gray-500';
}

export { iconNameMap as componentIcons };

