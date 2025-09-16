import type { DesignData } from '@/shared/contracts';

function baseMeta(tags: string[], extra: Record<string, unknown> = {}): DesignData['metadata'] {
  return {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0.0',
    author: 'ArchiComm',
    tags,
    ...extra,
  };
}

export const ecommercePlatformTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'client-web', type: 'web-app', x: 80, y: 80, label: 'Web App', properties: { showLabel: true } },
    { id: 'client-mobile', type: 'mobile-app', x: 80, y: 160, label: 'Mobile App', properties: { showLabel: true } },
    { id: 'cdn', type: 'cdn', x: 220, y: 120, label: 'CDN', properties: { showLabel: true } },
    { id: 'lb', type: 'load-balancer', x: 340, y: 120, label: 'Load Balancer', properties: { showLabel: true } },
    { id: 'api', type: 'api-gateway', x: 480, y: 120, label: 'API Gateway', properties: { showLabel: true } },

    // Services
    { id: 'svc-user', type: 'microservice', x: 660, y: 40, label: 'User Service', properties: { showLabel: true } },
    { id: 'svc-product', type: 'microservice', x: 660, y: 100, label: 'Product Service', properties: { showLabel: true } },
    { id: 'svc-order', type: 'microservice', x: 660, y: 160, label: 'Order Service', properties: { showLabel: true } },
    { id: 'svc-payment', type: 'microservice', x: 660, y: 220, label: 'Payment Service', properties: { showLabel: true } },
    { id: 'svc-inventory', type: 'microservice', x: 660, y: 280, label: 'Inventory Service', properties: { showLabel: true } },
    { id: 'svc-reco', type: 'microservice', x: 660, y: 340, label: 'Recommendation Service', properties: { showLabel: true } },

    // Data + caches
    { id: 'db-orders', type: 'postgresql', x: 860, y: 160, label: 'Orders DB', properties: { showLabel: true } },
    { id: 'db-catalog', type: 'mongodb', x: 860, y: 220, label: 'Catalog DB', properties: { showLabel: true } },
    { id: 'cache', type: 'redis', x: 860, y: 100, label: 'Redis Cache', properties: { showLabel: true } },
    { id: 'search', type: 'elasticsearch', x: 860, y: 280, label: 'Search', properties: { showLabel: true } },

    // Observability + security
    { id: 'mon', type: 'monitoring', x: 1040, y: 100, label: 'Monitoring', properties: { showLabel: true } },
    { id: 'sec', type: 'security', x: 1040, y: 180, label: 'Security', properties: { showLabel: true } },
  ],
  connections: [
    { id: 'c1', from: 'client-web', to: 'cdn', label: 'HTTP', type: 'sync', visualStyle: 'default' },
    { id: 'c2', from: 'client-mobile', to: 'api', label: 'HTTPS', type: 'sync', visualStyle: 'default' },
    { id: 'c3', from: 'cdn', to: 'lb', label: 'Edge → LB', type: 'sync', visualStyle: 'default' },
    { id: 'c4', from: 'lb', to: 'api', label: 'Route', type: 'sync', visualStyle: 'default' },
    { id: 'c5', from: 'api', to: 'svc-user', label: 'REST', type: 'sync' },
    { id: 'c6', from: 'api', to: 'svc-product', label: 'REST', type: 'sync' },
    { id: 'c7', from: 'api', to: 'svc-order', label: 'REST', type: 'sync' },
    { id: 'c8', from: 'api', to: 'svc-payment', label: 'REST', type: 'sync' },
    { id: 'c9', from: 'api', to: 'svc-inventory', label: 'REST', type: 'sync' },
    { id: 'c10', from: 'svc-order', to: 'db-orders', label: 'SQL', type: 'sync' },
    { id: 'c11', from: 'svc-product', to: 'db-catalog', label: 'Query', type: 'sync' },
    { id: 'c12', from: 'svc-product', to: 'search', label: 'Index', type: 'async' },
    { id: 'c13', from: 'svc-user', to: 'cache', label: 'Session', type: 'sync' },
  ],
  infoCards: [
    { id: 'i1', x: 60, y: 40, content: 'Presentation Layer', color: 'blue' },
    { id: 'i2', x: 460, y: 80, content: 'API Gateway layer with rate limiting and auth', color: 'green' },
    { id: 'i3', x: 640, y: 10, content: 'Microservices: user, product, order, payment, inventory, recommendation', color: 'purple' },
    { id: 'i4', x: 840, y: 60, content: 'Data Layer: Redis, PostgreSQL, MongoDB, Elasticsearch', color: 'yellow' },
  ],
  layers: [{ id: 'l1', name: 'E-Commerce Architecture', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true, color: '#e5e7eb' },
  activeTool: 'select',
  metadata: baseMeta(['industry', 'ecommerce'], {
    complexity: 'advanced',
    componentCount: 20,
    connectionCount: 13,
    estimatedTime: 120,
    description: 'Complete e-commerce platform with layered architecture',
  }),
};

export const fintechPlatformTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'portal', type: 'web-app', x: 100, y: 120, label: 'Customer Portal', properties: { showLabel: true } },
    { id: 'api', type: 'api-gateway', x: 280, y: 120, label: 'API Gateway', properties: { showLabel: true } },
    { id: 'authn', type: 'authentication', x: 460, y: 60, label: 'Authentication', properties: { showLabel: true } },
    { id: 'authz', type: 'authorization', x: 460, y: 120, label: 'Authorization', properties: { showLabel: true } },
    { id: 'encrypt', type: 'security', x: 460, y: 180, label: 'Encryption', properties: { showLabel: true } },
    { id: 'paygw', type: 'microservice', x: 660, y: 60, label: 'Payment Gateway', properties: { showLabel: true } },
    { id: 'fraud', type: 'microservice', x: 660, y: 120, label: 'Fraud Detection', properties: { showLabel: true } },
    { id: 'comp', type: 'microservice', x: 660, y: 180, label: 'Compliance Service', properties: { showLabel: true } },
    { id: 'dwh', type: 'data-warehouse', x: 860, y: 120, label: 'Data Warehouse', properties: { showLabel: true } },
    { id: 'audit', type: 'logging', x: 1060, y: 120, label: 'Audit Logging', properties: { showLabel: true } },
  ],
  connections: [
    { id: 'f1', from: 'portal', to: 'api', label: 'HTTPS', type: 'sync' },
    { id: 'f2', from: 'api', to: 'authn', label: 'AuthN', type: 'sync' },
    { id: 'f3', from: 'api', to: 'authz', label: 'AuthZ', type: 'sync' },
    { id: 'f4', from: 'api', to: 'paygw', label: 'Payments', type: 'sync' },
    { id: 'f5', from: 'paygw', to: 'fraud', label: 'Risk', type: 'async' },
    { id: 'f6', from: 'comp', to: 'audit', label: 'Audit Trail', type: 'async' },
  ],
  infoCards: [
    { id: 'fi1', x: 620, y: 10, content: 'Compliance Zone: PCI, SOX, GDPR', color: 'red' },
    { id: 'fi2', x: 840, y: 80, content: 'Analytical storage for reporting & BI', color: 'yellow' },
  ],
  layers: [{ id: 'fl1', name: 'Fintech Architecture', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: baseMeta(['industry', 'fintech'], {
    complexity: 'advanced',
    componentCount: 10,
    connectionCount: 6,
    estimatedTime: 90,
    description: 'Financial services architecture with security, risk, and compliance',
  }),
};

export const healthcareSystemTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'patient-portal', type: 'web-app', x: 80, y: 120, label: 'Patient Portal', properties: { showLabel: true } },
    { id: 'api', type: 'api-gateway', x: 260, y: 120, label: 'API Gateway', properties: { showLabel: true } },
    { id: 'ehr', type: 'microservice', x: 440, y: 60, label: 'EHR System', properties: { showLabel: true } },
    { id: 'appt', type: 'microservice', x: 440, y: 120, label: 'Appointment Service', properties: { showLabel: true } },
    { id: 'billing', type: 'microservice', x: 440, y: 180, label: 'Billing Service', properties: { showLabel: true } },
    { id: 'lab', type: 'microservice', x: 640, y: 60, label: 'Lab Integration', properties: { showLabel: true } },
    { id: 'imaging', type: 'microservice', x: 640, y: 120, label: 'Imaging Service', properties: { showLabel: true } },
    { id: 'hipaa', type: 'security', x: 640, y: 180, label: 'HIPAA Compliance', properties: { showLabel: true } },
    { id: 'secure-msg', type: 'message-queue', x: 840, y: 120, label: 'Secure Messaging', properties: { showLabel: true } },
  ],
  connections: [
    { id: 'h1', from: 'patient-portal', to: 'api', label: 'HTTPS', type: 'sync' },
    { id: 'h2', from: 'api', to: 'ehr', label: 'REST', type: 'sync' },
    { id: 'h3', from: 'api', to: 'appt', label: 'REST', type: 'sync' },
    { id: 'h4', from: 'api', to: 'billing', label: 'REST', type: 'sync' },
    { id: 'h5', from: 'ehr', to: 'secure-msg', label: 'HL7/FHIR events', type: 'async' },
  ],
  infoCards: [
    { id: 'hc1', x: 620, y: 20, content: 'PHI Boundary and Compliance Zone', color: 'red' },
  ],
  layers: [{ id: 'hl1', name: 'Healthcare Architecture', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: baseMeta(['industry', 'healthcare'], {
    complexity: 'advanced',
    componentCount: 9,
    connectionCount: 5,
    estimatedTime: 90,
    description: 'Healthcare platform integrating EHR, labs, imaging with HIPAA compliance',
  }),
};

export const gamingPlatformTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'game-client', type: 'client', x: 80, y: 120, label: 'Game Client', properties: { showLabel: true } },
    { id: 'realtime', type: 'websocket', x: 260, y: 120, label: 'Realtime Messaging', properties: { showLabel: true } },
    { id: 'match', type: 'microservice', x: 440, y: 60, label: 'Matchmaking', properties: { showLabel: true } },
    { id: 'game-server', type: 'server', x: 440, y: 120, label: 'Game Server', properties: { showLabel: true } },
    { id: 'leaderboard', type: 'microservice', x: 440, y: 180, label: 'Leaderboard Service', properties: { showLabel: true } },
    { id: 'chat', type: 'microservice', x: 640, y: 120, label: 'Chat Service', properties: { showLabel: true } },
    { id: 'session', type: 'redis', x: 840, y: 80, label: 'Session Management', properties: { showLabel: true } },
    { id: 'player', type: 'mongodb', x: 840, y: 160, label: 'Player Data', properties: { showLabel: true } },
    { id: 'anti-cheat', type: 'security', x: 1040, y: 120, label: 'Anti-cheat', properties: { showLabel: true } },
    { id: 'analytics', type: 'elasticsearch', x: 1240, y: 120, label: 'Analytics', properties: { showLabel: true } },
  ],
  connections: [
    { id: 'g1', from: 'game-client', to: 'realtime', label: 'WS', type: 'sync' },
    { id: 'g2', from: 'realtime', to: 'game-server', label: 'WS', type: 'sync' },
    { id: 'g3', from: 'game-server', to: 'session', label: 'Session', type: 'sync' },
    { id: 'g4', from: 'game-server', to: 'player', label: 'Persist', type: 'sync' },
  ],
  infoCards: [
    { id: 'ga1', x: 240, y: 80, content: 'Realtime low-latency path', color: 'green' },
  ],
  layers: [{ id: 'gl1', name: 'Gaming Platform', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: baseMeta(['industry', 'gaming'], {
    complexity: 'advanced',
    componentCount: 10,
    connectionCount: 4,
    estimatedTime: 75,
    description: 'Multiplayer gaming architecture with realtime messaging and analytics',
  }),
};

