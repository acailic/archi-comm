import type {
  ComponentProperties,
  Connection,
  ConnectionDirection,
  ConnectionType,
  DesignComponent,
} from '../../shared/contracts';

const GRID_X = 280;
const GRID_Y = 160;
const DEFAULT_COMPONENT_WIDTH = 220;
const DEFAULT_COMPONENT_HEIGHT = 140;

type IconName = string;

const gridPosition = (column: number, row: number): { x: number; y: number } => ({
  x: column * GRID_X,
  y: row * GRID_Y,
});

const generateId = (prefix: string): string => {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  const random =
    globalCrypto && typeof globalCrypto.randomUUID === 'function'
      ? globalCrypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
};

export type ComponentPresetCategory =
  | 'web-app'
  | 'microservices'
  | 'data-layer'
  | 'content-delivery'
  | 'integration'
  | 'security'
  | 'observability'
  | 'serverless';

export interface PresetComponentDefinition {
  id: string;
  type: DesignComponent['type'];
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  description?: string;
  properties?: ComponentProperties;
}

export interface PresetConnectionDefinition {
  from: string;
  to: string;
  label?: string;
  type?: ConnectionType;
  protocol?: string;
  direction?: ConnectionDirection;
  visualStyle?: Connection['visualStyle'];
  properties?: Connection['properties'];
  description?: string;
}

export interface ComponentPreset {
  id: string;
  name: string;
  description: string;
  category: ComponentPresetCategory;
  icon: IconName;
  components: PresetComponentDefinition[];
  connections: PresetConnectionDefinition[];
}

export interface ApplyPresetPosition {
  x: number;
  y: number;
}

export type AppliedPresetComponent = DesignComponent & {
  width: number;
  height: number;
};

export interface AppliedPresetResult {
  components: AppliedPresetComponent[];
  connections: Connection[];
  componentIdMap: Record<string, string>;
}

export interface ApplyPresetOptions {
  idPrefix?: string;
  overrideNodeSize?: {
    width?: number;
    height?: number;
  };
}

const threeTierWebApp: ComponentPreset = {
  id: 'three-tier-web-app',
  name: 'Three-Tier Web App',
  description:
    'Classic web application pattern with load balancing, horizontally scaled app tier, and a resilient relational database.',
  category: 'web-app',
  icon: 'Layers',
  components: [
    {
      id: 'load-balancer',
      type: 'load-balancer',
      label: 'Load Balancer',
      ...gridPosition(0, 1),
      properties: {
        algorithm: 'round-robin',
        healthCheck: true,
        showLabel: true,
      },
    },
    {
      id: 'app-server-a',
      type: 'server',
      label: 'App Server A',
      ...gridPosition(1, 0),
      properties: {
        replicas: 1,
        port: 8080,
        healthCheck: '/healthz',
        showLabel: true,
      },
    },
    {
      id: 'app-server-b',
      type: 'server',
      label: 'App Server B',
      ...gridPosition(1, 1),
      properties: {
        replicas: 1,
        port: 8080,
        healthCheck: '/healthz',
        showLabel: true,
      },
    },
    {
      id: 'app-server-c',
      type: 'server',
      label: 'App Server C',
      ...gridPosition(1, 2),
      properties: {
        replicas: 1,
        port: 8080,
        healthCheck: '/healthz',
        showLabel: true,
      },
    },
    {
      id: 'primary-database',
      type: 'database',
      label: 'Primary Database',
      ...gridPosition(2, 1),
      properties: {
        type: 'relational',
        replicas: 1,
        backup: true,
        showLabel: true,
      },
    },
  ],
  connections: [
    {
      from: 'load-balancer',
      to: 'app-server-a',
      label: 'HTTP Request',
      type: 'sync',
      protocol: 'HTTP/HTTPS',
      direction: 'end',
    },
    {
      from: 'load-balancer',
      to: 'app-server-b',
      label: 'HTTP Request',
      type: 'sync',
      protocol: 'HTTP/HTTPS',
      direction: 'end',
    },
    {
      from: 'load-balancer',
      to: 'app-server-c',
      label: 'HTTP Request',
      type: 'sync',
      protocol: 'HTTP/HTTPS',
      direction: 'end',
    },
    {
      from: 'app-server-a',
      to: 'primary-database',
      label: 'SQL Query',
      type: 'sync',
      protocol: 'PostgreSQL',
      direction: 'end',
      visualStyle: 'default',
    },
    {
      from: 'app-server-b',
      to: 'primary-database',
      label: 'SQL Query',
      type: 'sync',
      protocol: 'PostgreSQL',
      direction: 'end',
    },
    {
      from: 'app-server-c',
      to: 'primary-database',
      label: 'SQL Query',
      type: 'sync',
      protocol: 'PostgreSQL',
      direction: 'end',
    },
  ],
};

const microservicesStarter: ComponentPreset = {
  id: 'microservices-starter',
  name: 'Microservices Starter',
  description:
    'API gateway and service mesh routing traffic to domain-oriented microservices with an event-driven backbone.',
  category: 'microservices',
  icon: 'Network',
  components: [
    {
      id: 'api-gateway',
      type: 'api-gateway',
      label: 'API Gateway',
      ...gridPosition(0, 1),
      properties: {
        rateLimit: '10k rpm',
        authentication: true,
        showLabel: true,
      },
    },
    {
      id: 'service-mesh',
      type: 'service-mesh',
      label: 'Service Mesh',
      ...gridPosition(1, 1),
      properties: {
        showLabel: true,
        mTLS: true,
      } as ComponentProperties,
    },
    {
      id: 'order-service',
      type: 'microservice',
      label: 'Order Service',
      ...gridPosition(2, 0),
      properties: {
        replicas: 2,
        port: 7001,
        healthCheck: '/health',
        showLabel: true,
      },
    },
    {
      id: 'user-service',
      type: 'microservice',
      label: 'User Service',
      ...gridPosition(2, 1),
      properties: {
        replicas: 2,
        port: 7002,
        healthCheck: '/health',
        showLabel: true,
      },
    },
    {
      id: 'inventory-service',
      type: 'microservice',
      label: 'Inventory Service',
      ...gridPosition(2, 2),
      properties: {
        replicas: 2,
        port: 7003,
        healthCheck: '/health',
        showLabel: true,
      },
    },
    {
      id: 'message-queue',
      type: 'message-queue',
      label: 'Message Queue',
      ...gridPosition(3, 1),
      properties: {
        engine: 'Kafka',
        showLabel: true,
      } as ComponentProperties,
    },
  ],
  connections: [
    {
      from: 'api-gateway',
      to: 'service-mesh',
      label: 'Ingress Traffic',
      type: 'sync',
      protocol: 'HTTP/HTTPS',
      direction: 'end',
    },
    {
      from: 'service-mesh',
      to: 'order-service',
      label: 'gRPC Call',
      type: 'sync',
      protocol: 'gRPC',
      direction: 'end',
    },
    {
      from: 'service-mesh',
      to: 'user-service',
      label: 'gRPC Call',
      type: 'sync',
      protocol: 'gRPC',
      direction: 'end',
    },
    {
      from: 'service-mesh',
      to: 'inventory-service',
      label: 'gRPC Call',
      type: 'sync',
      protocol: 'gRPC',
      direction: 'end',
    },
    {
      from: 'order-service',
      to: 'message-queue',
      label: 'Domain Event',
      type: 'async',
      protocol: 'AMQP',
      direction: 'end',
      visualStyle: 'default',
    },
    {
      from: 'user-service',
      to: 'message-queue',
      label: 'User Event',
      type: 'async',
      protocol: 'AMQP',
      direction: 'end',
    },
    {
      from: 'inventory-service',
      to: 'message-queue',
      label: 'Inventory Event',
      type: 'async',
      protocol: 'AMQP',
      direction: 'end',
    },
  ],
};

const cacheLayer: ComponentPreset = {
  id: 'cache-layer',
  name: 'Cache Layer',
  description:
    'Application tier backed by a Redis cache to reduce database load with fallback queries and cache invalidation.',
  category: 'data-layer',
  icon: 'Database',
  components: [
    {
      id: 'application-server',
      type: 'server',
      label: 'Application',
      ...gridPosition(0, 1),
      properties: {
        replicas: 2,
        port: 443,
        healthCheck: '/status',
        showLabel: true,
      },
    },
    {
      id: 'redis-cache',
      type: 'cache',
      label: 'Redis Cache',
      ...gridPosition(1, 0),
      properties: {
        type: 'redis',
        ttl: 600,
        size: '4 GB',
        showLabel: true,
      },
    },
    {
      id: 'primary-db',
      type: 'database',
      label: 'Primary Database',
      ...gridPosition(1, 2),
      properties: {
        type: 'relational',
        backup: true,
        replicas: 1,
        showLabel: true,
      },
    },
  ],
  connections: [
    {
      from: 'application-server',
      to: 'redis-cache',
      label: 'Cache Lookup',
      type: 'sync',
      protocol: 'Redis',
      direction: 'end',
    },
    {
      from: 'redis-cache',
      to: 'primary-db',
      label: 'Cache Miss',
      type: 'sync',
      protocol: 'SQL',
      direction: 'end',
    },
    {
      from: 'application-server',
      to: 'primary-db',
      label: 'Fallback Query',
      type: 'sync',
      protocol: 'SQL',
      direction: 'end',
    },
    {
      from: 'primary-db',
      to: 'redis-cache',
      label: 'Invalidation',
      type: 'async',
      protocol: 'Pub/Sub',
      direction: 'end',
      visualStyle: 'default',
    },
  ],
};

const cdnSetup: ComponentPreset = {
  id: 'cdn-setup',
  name: 'CDN Setup',
  description:
    'Content delivery workflow with global CDN in front of an origin server and object storage for static assets.',
  category: 'content-delivery',
  icon: 'Globe',
  components: [
    {
      id: 'end-users',
      type: 'client',
      label: 'Users',
      ...gridPosition(0, 1),
      properties: {
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'global-cdn',
      type: 'edge-computing',
      label: 'CDN Edge',
      ...gridPosition(1, 1),
      properties: {
        provider: 'Global',
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'origin-server',
      type: 'server',
      label: 'Origin Server',
      ...gridPosition(2, 1),
      properties: {
        replicas: 1,
        port: 443,
        showLabel: true,
      },
    },
    {
      id: 'asset-storage',
      type: 'storage',
      label: 'Object Storage',
      ...gridPosition(3, 1),
      properties: {
        tier: 'Standard',
        showLabel: true,
      } as ComponentProperties,
    },
  ],
  connections: [
    {
      from: 'end-users',
      to: 'global-cdn',
      label: 'HTTP Request',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'both',
    },
    {
      from: 'global-cdn',
      to: 'origin-server',
      label: 'Cache Miss Fetch',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'end',
    },
    {
      from: 'origin-server',
      to: 'asset-storage',
      label: 'Asset Sync',
      type: 'sync',
      protocol: 'S3',
      direction: 'end',
    },
    {
      from: 'asset-storage',
      to: 'global-cdn',
      label: 'Invalidation Event',
      type: 'async',
      protocol: 'Webhooks',
      direction: 'end',
      visualStyle: 'default',
    },
  ],
};

const queuePattern: ComponentPreset = {
  id: 'queue-pattern',
  name: 'Queue Pattern',
  description:
    'Producer and consumer decoupled via durable messaging queue for asynchronous workloads and reliable processing.',
  category: 'integration',
  icon: 'Workflow',
  components: [
    {
      id: 'producer-service',
      type: 'producer',
      label: 'Producer',
      ...gridPosition(0, 1),
      properties: {
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'message-queue',
      type: 'message-queue',
      label: 'Message Queue',
      ...gridPosition(1, 1),
      properties: {
        engine: 'RabbitMQ',
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'consumer-service',
      type: 'consumer',
      label: 'Consumer',
      ...gridPosition(2, 1),
      properties: {
        concurrency: 4,
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'analytics-database',
      type: 'database',
      label: 'Analytics Database',
      ...gridPosition(3, 1),
      properties: {
        type: 'wide-column',
        backup: true,
        showLabel: true,
      },
    },
  ],
  connections: [
    {
      from: 'producer-service',
      to: 'message-queue',
      label: 'Publish Message',
      type: 'async',
      protocol: 'AMQP',
      direction: 'end',
    },
    {
      from: 'message-queue',
      to: 'consumer-service',
      label: 'Deliver Message',
      type: 'async',
      protocol: 'AMQP',
      direction: 'end',
    },
    {
      from: 'consumer-service',
      to: 'analytics-database',
      label: 'Persist Result',
      type: 'sync',
      protocol: 'SQL',
      direction: 'end',
    },
  ],
};

const authFlow: ComponentPreset = {
  id: 'auth-flow',
  name: 'Auth Flow',
  description:
    'Zero-trust authentication flow from client through API gateway to dedicated auth service and user directory.',
  category: 'security',
  icon: 'ShieldCheck',
  components: [
    {
      id: 'auth-client',
      type: 'client',
      label: 'Client',
      ...gridPosition(0, 1),
      properties: {
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'edge-api-gateway',
      type: 'api-gateway',
      label: 'API Gateway',
      ...gridPosition(1, 1),
      properties: {
        rateLimit: '5k rpm',
        authentication: true,
        showLabel: true,
      },
    },
    {
      id: 'auth-service',
      type: 'microservice',
      label: 'Auth Service',
      ...gridPosition(2, 1),
      properties: {
        replicas: 2,
        port: 7100,
        healthCheck: '/health',
        showLabel: true,
      },
    },
    {
      id: 'user-directory',
      type: 'database',
      label: 'User Database',
      ...gridPosition(3, 1),
      properties: {
        type: 'document',
        backup: true,
        showLabel: true,
      },
    },
  ],
  connections: [
    {
      from: 'auth-client',
      to: 'edge-api-gateway',
      label: 'Auth Request',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'end',
    },
    {
      from: 'edge-api-gateway',
      to: 'auth-service',
      label: 'Token Validation',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'end',
    },
    {
      from: 'auth-service',
      to: 'user-directory',
      label: 'Credential Lookup',
      type: 'sync',
      protocol: 'SQL',
      direction: 'end',
    },
    {
      from: 'auth-service',
      to: 'edge-api-gateway',
      label: 'Policy Decision',
      type: 'control',
      protocol: 'JWT',
      direction: 'both',
      visualStyle: 'default',
    },
  ],
};

const monitoringStack: ComponentPreset = {
  id: 'monitoring-stack',
  name: 'Monitoring Stack',
  description:
    'Observability pipeline with metrics collector, time series database, and dashboard for unified visibility.',
  category: 'observability',
  icon: 'Activity',
  components: [
    {
      id: 'application-service',
      type: 'server',
      label: 'Application',
      ...gridPosition(0, 1),
      properties: {
        replicas: 3,
        port: 8080,
        showLabel: true,
      },
    },
    {
      id: 'metrics-collector',
      type: 'monitoring',
      label: 'Metrics Collector',
      ...gridPosition(1, 1),
      properties: {
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'time-series-db',
      type: 'database',
      label: 'Time Series DB',
      ...gridPosition(2, 1),
      properties: {
        type: 'wide-column',
        backup: true,
        showLabel: true,
      },
    },
    {
      id: 'observability-dashboard',
      type: 'monitoring',
      label: 'Dashboard',
      ...gridPosition(3, 1),
      properties: {
        showLabel: true,
      } as ComponentProperties,
    },
  ],
  connections: [
    {
      from: 'application-service',
      to: 'metrics-collector',
      label: 'Metric Stream',
      type: 'async',
      protocol: 'OTLP',
      direction: 'end',
    },
    {
      from: 'metrics-collector',
      to: 'time-series-db',
      label: 'Write Metrics',
      type: 'async',
      protocol: 'OTLP/HTTP',
      direction: 'end',
    },
    {
      from: 'observability-dashboard',
      to: 'time-series-db',
      label: 'Query Metrics',
      type: 'sync',
      protocol: 'PromQL',
      direction: 'both',
    },
    {
      from: 'metrics-collector',
      to: 'observability-dashboard',
      label: 'Alert Feed',
      type: 'async',
      protocol: 'WebSocket',
      direction: 'end',
      visualStyle: 'default',
    },
  ],
};

const serverlessApi: ComponentPreset = {
  id: 'serverless-api',
  name: 'Serverless API',
  description:
    'Event-driven serverless API gateway invoking multiple Lambda handlers with DynamoDB persistence layer.',
  category: 'serverless',
  icon: 'Cloud',
  components: [
    {
      id: 'serverless-api-gateway',
      type: 'api-gateway',
      label: 'API Gateway',
      ...gridPosition(0, 1),
      properties: {
        rateLimit: '20k rpm',
        authentication: true,
        showLabel: true,
      },
    },
    {
      id: 'lambda-handler-a',
      type: 'serverless-function',
      label: 'Lambda Handler A',
      ...gridPosition(1, 0),
      properties: {
        runtime: 'Node.js 20',
        memory: '512 MB',
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'lambda-handler-b',
      type: 'serverless-function',
      label: 'Lambda Handler B',
      ...gridPosition(1, 1),
      properties: {
        runtime: 'Python 3.11',
        memory: '256 MB',
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'lambda-handler-c',
      type: 'serverless-function',
      label: 'Lambda Handler C',
      ...gridPosition(1, 2),
      properties: {
        runtime: 'Go 1.21',
        memory: '512 MB',
        showLabel: true,
      } as ComponentProperties,
    },
    {
      id: 'dynamodb-table',
      type: 'database',
      label: 'DynamoDB Table',
      ...gridPosition(2, 1),
      properties: {
        type: 'wide-column',
        replicas: 1,
        showLabel: true,
      },
    },
  ],
  connections: [
    {
      from: 'serverless-api-gateway',
      to: 'lambda-handler-a',
      label: 'Invoke Handler A',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'end',
    },
    {
      from: 'serverless-api-gateway',
      to: 'lambda-handler-b',
      label: 'Invoke Handler B',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'end',
    },
    {
      from: 'serverless-api-gateway',
      to: 'lambda-handler-c',
      label: 'Invoke Handler C',
      type: 'sync',
      protocol: 'HTTPS',
      direction: 'end',
    },
    {
      from: 'lambda-handler-a',
      to: 'dynamodb-table',
      label: 'Persist Item',
      type: 'sync',
      protocol: 'DynamoDB',
      direction: 'end',
    },
    {
      from: 'lambda-handler-b',
      to: 'dynamodb-table',
      label: 'Read Item',
      type: 'sync',
      protocol: 'DynamoDB',
      direction: 'end',
    },
    {
      from: 'lambda-handler-c',
      to: 'dynamodb-table',
      label: 'Update Item',
      type: 'sync',
      protocol: 'DynamoDB',
      direction: 'end',
    },
  ],
};

const basePresets: ComponentPreset[] = [
  threeTierWebApp,
  microservicesStarter,
  cacheLayer,
  cdnSetup,
  queuePattern,
  authFlow,
  monitoringStack,
  serverlessApi,
];

export const componentPresets: ComponentPreset[] = basePresets;

export const presetsRegistry: Record<string, ComponentPreset> = basePresets.reduce(
  (registry, preset) => {
    registry[preset.id] = preset;
    return registry;
  },
  {} as Record<string, ComponentPreset>,
);

export const applyPreset = (
  preset: ComponentPreset,
  basePosition: ApplyPresetPosition = { x: 0, y: 0 },
  options: ApplyPresetOptions = {},
): AppliedPresetResult => {
  const componentIdMap: Record<string, string> = {};
  const components: AppliedPresetComponent[] = preset.components.map((componentDef, index) => {
    const runtimeId = generateId(
      options.idPrefix ? `${options.idPrefix}-component-${index}` : `${preset.id}-component`,
    );
    componentIdMap[componentDef.id] = runtimeId;

    const width =
      componentDef.width ?? options.overrideNodeSize?.width ?? DEFAULT_COMPONENT_WIDTH;
    const height =
      componentDef.height ?? options.overrideNodeSize?.height ?? DEFAULT_COMPONENT_HEIGHT;

    const componentProperties = componentDef.properties
      ? ({ ...componentDef.properties } as ComponentProperties)
      : undefined;

    return {
      id: runtimeId,
      type: componentDef.type,
      x: basePosition.x + componentDef.x,
      y: basePosition.y + componentDef.y,
      label: componentDef.label,
      description: componentDef.description,
      properties: componentProperties,
      width,
      height,
    };
  });

  const connections: Connection[] = preset.connections.map((connectionDef, index) => {
    const sourceId = componentIdMap[connectionDef.from];
    const targetId = componentIdMap[connectionDef.to];

    if (!sourceId) {
      throw new Error(
        `Preset "${preset.id}" connection references unknown component "${connectionDef.from}".`,
      );
    }

    if (!targetId) {
      throw new Error(
        `Preset "${preset.id}" connection references unknown component "${connectionDef.to}".`,
      );
    }

    const connectionId = generateId(
      options.idPrefix ? `${options.idPrefix}-connection-${index}` : `${preset.id}-connection`,
    );

    return {
      id: connectionId,
      from: sourceId,
      to: targetId,
      label: connectionDef.label ?? 'Connection',
      type: connectionDef.type ?? 'data',
      protocol: connectionDef.protocol,
      direction: connectionDef.direction ?? 'end',
      visualStyle: connectionDef.visualStyle ?? 'default',
      properties: connectionDef.properties ? { ...connectionDef.properties } : undefined,
    };
  });

  return {
    components,
    connections,
    componentIdMap,
  };
};