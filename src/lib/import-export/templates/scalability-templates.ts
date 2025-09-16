import type { DesignData, DesignComponent, Connection } from '@/shared/contracts';

function meta(tags: string[], extra: Record<string, unknown> = {}): DesignData['metadata'] {
  return {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0.0',
    author: 'ArchiComm',
    tags,
    ...extra,
  };
}

export const microservicesEcosystemTemplate: DesignData = (() => {
  const components: DesignComponent[] = [
    { id: 'api', type: 'api-gateway', x: 80, y: 100, label: 'API Gateway' },
    { id: 'disc', type: 'server', x: 80, y: 180, label: 'Service Discovery' },
    { id: 'config', type: 'server', x: 80, y: 260, label: 'Config Service' },
    { id: 'mon', type: 'monitoring', x: 80, y: 340, label: 'Monitoring' },
    { id: 'log', type: 'logging', x: 80, y: 420, label: 'Logging' },
    { id: 'met', type: 'metrics', x: 80, y: 500, label: 'Metrics' },
  ];
  const cols = 10;
  const services = 50;
  for (let i = 0; i < services; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    components.push({
      id: `svc-${i + 1}`,
      type: 'microservice',
      x: 260 + col * 120,
      y: 80 + row * 80,
      label: `Service ${i + 1}`,
    });
  }
  const connections: Connection[] = [
    { id: 'm1', from: 'api', to: 'svc-1', label: 'Route', type: 'sync' },
    { id: 'm2', from: 'svc-1', to: 'disc', label: 'Discover', type: 'sync' },
  ];
  return {
    schemaVersion: 1,
    components,
    connections,
    layers: [{ id: 'ms-l1', name: 'Microservices Ecosystem', visible: true, order: 1 }],
    gridConfig: { visible: true, spacing: 50, snapToGrid: true },
    metadata: meta(['scalability', 'microservices'], {
      complexity: 'expert',
      componentCount: components.length,
      connectionCount: connections.length,
      estimatedTime: 180,
      description: '50+ microservices with platform services and observability',
    }),
  };
})();

export const serverlessArchitectureTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'api', type: 'api-gateway', x: 100, y: 100, label: 'API Gateway' },
    { id: 'auth', type: 'lambda', x: 300, y: 60, label: 'Auth Function' },
    { id: 'orders', type: 'lambda', x: 300, y: 120, label: 'Orders Function' },
    { id: 'payments', type: 'lambda', x: 300, y: 180, label: 'Payments Function' },
    { id: 's3', type: 's3', x: 500, y: 60, label: 'S3' },
    { id: 'ddb', type: 'dynamodb', x: 500, y: 120, label: 'DynamoDB' },
    { id: 'sqs', type: 'message-queue', x: 500, y: 180, label: 'SQS' },
    { id: 'cw', type: 'monitoring', x: 700, y: 120, label: 'CloudWatch' },
  ],
  connections: [
    { id: 's1', from: 'api', to: 'auth', label: 'Auth', type: 'sync' },
    { id: 's2', from: 'api', to: 'orders', label: 'Orders', type: 'sync' },
    { id: 's3', from: 'orders', to: 'ddb', label: 'Write', type: 'sync' },
    { id: 's4', from: 'payments', to: 'sqs', label: 'Enqueue', type: 'async' },
  ],
  layers: [{ id: 'svl-l1', name: 'Serverless Architecture', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['scalability', 'serverless'], {
    complexity: 'advanced',
    componentCount: 8,
    connectionCount: 4,
    estimatedTime: 90,
    description: 'Event-driven serverless template with functions and managed services',
  }),
};

export const distributedCqrsTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'cqrs', type: 'cqrs', x: 120, y: 40, label: 'CQRS' },
    { id: 'cmd', type: 'microservice', x: 120, y: 120, label: 'Command Service' },
    { id: 'qry', type: 'microservice', x: 120, y: 200, label: 'Query Service' },
    { id: 'es', type: 'event-sourcing', x: 320, y: 120, label: 'Event Store' },
    { id: 'read', type: 'database', x: 520, y: 200, label: 'Read Model' },
    { id: 'saga', type: 'server', x: 320, y: 40, label: 'Saga Orchestrator' },
    { id: 'cache', type: 'cache', x: 520, y: 120, label: 'Distributed Cache' },
  ],
  connections: [
    { id: 'd1', from: 'cmd', to: 'es', label: 'Store', type: 'sync' },
    { id: 'd2', from: 'es', to: 'read', label: 'Project', type: 'async' },
    { id: 'd3', from: 'saga', to: 'cmd', label: 'Orchestrate', type: 'sync' },
  ],
  layers: [{ id: 'dcqrs-l1', name: 'Distributed CQRS', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['scalability', 'distributed'], {
    complexity: 'advanced',
    componentCount: 7,
    connectionCount: 3,
    estimatedTime: 100,
    description: 'CQRS + Event Sourcing with orchestrator and caches',
  }),
};

export const highAvailabilityTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'lb', type: 'load-balancer', x: 120, y: 120, label: 'Global LB' },
    { id: 'az1', type: 'server', x: 300, y: 80, label: 'App AZ-1' },
    { id: 'az2', type: 'server', x: 300, y: 160, label: 'App AZ-2' },
    { id: 'db1', type: 'database', x: 520, y: 80, label: 'Primary DB' },
    { id: 'db2', type: 'database', x: 520, y: 160, label: 'Replica DB' },
    { id: 'redis', type: 'cache', x: 700, y: 120, label: 'Redis Cluster' },
    { id: 'cdn', type: 'cdn', x: 880, y: 120, label: 'CDN' },
  ],
  connections: [
    { id: 'ha1', from: 'lb', to: 'az1', label: 'Route', type: 'sync' },
    { id: 'ha2', from: 'lb', to: 'az2', label: 'Route', type: 'sync' },
    { id: 'ha3', from: 'db1', to: 'db2', label: 'Replicate', type: 'async' },
  ],
  layers: [{ id: 'ha-l1', name: 'High Availability', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['scalability', 'high-availability'], {
    complexity: 'intermediate',
    componentCount: 7,
    connectionCount: 3,
    estimatedTime: 60,
    description: 'HA template with multi-AZ, replication, and caching',
  }),
};

function makeBenchmarkTemplate(count: number): DesignData {
  const components: DesignComponent[] = [];
  const connections: Connection[] = [];
  const cols = 20;
  const spacingX = 80;
  const spacingY = 70;
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const types = ['server', 'database', 'cache', 'api-gateway', 'microservice'] as const;
    const type = types[i % types.length];
    const id = `${type}-${i + 1}`;
    components.push({ id, type, x: 80 + col * spacingX, y: 80 + row * spacingY, label: id });
    if (i > 0 && i % 5 === 0) {
      connections.push({ id: `b-${i}`, from: components[i - 1].id, to: id, label: 'link', type: 'sync' });
    }
  }
  return {
    schemaVersion: 1,
    components,
    connections,
    layers: [{ id: 'bm-l1', name: `Benchmark ${count}`, visible: true, order: 1 }],
    gridConfig: { visible: true, spacing: 50, snapToGrid: true },
    metadata: meta(['benchmark'], {
      complexity: count <= 100 ? 'intermediate' : count <= 250 ? 'advanced' : 'expert',
      componentCount: components.length,
      connectionCount: connections.length,
      estimatedTime: count <= 100 ? 10 : count <= 250 ? 20 : 30,
      description: `${count} components in grid layout for performance testing`,
      expectedLoadTimeSeconds: count <= 100 ? 10 : count <= 250 ? 20 : 30,
    }),
  };
}

export const benchmark100Template: DesignData = makeBenchmarkTemplate(100);
export const benchmark250Template: DesignData = makeBenchmarkTemplate(250);
export const benchmark500Template: DesignData = makeBenchmarkTemplate(500);

