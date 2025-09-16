import type { DesignData } from '@/shared/contracts';

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

export const mainframeBridgeTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'mf', type: 'server', x: 80, y: 120, label: 'Mainframe (COBOL)' },
    { id: 'db2', type: 'database', x: 80, y: 200, label: 'DB2' },
    { id: 'mq', type: 'message-queue', x: 80, y: 280, label: 'MQ Series' },
    { id: 'batch', type: 'server', x: 80, y: 360, label: 'Batch Processing' },
    { id: 'bridge-auth', type: 'security', x: 260, y: 120, label: 'Authentication Bridge' },
    { id: 'transform', type: 'server', x: 260, y: 200, label: 'Transformation Service' },
    { id: 'api', type: 'api-gateway', x: 420, y: 200, label: 'Modern API Gateway' },
    { id: 'audit', type: 'logging', x: 600, y: 200, label: 'Audit Service' },
    { id: 'monitor', type: 'monitoring', x: 760, y: 200, label: 'Monitoring' },
  ],
  connections: [
    { id: 'l1', from: 'mf', to: 'transform', label: 'Data', type: 'sync' },
    { id: 'l2', from: 'transform', to: 'api', label: 'Bridge', type: 'sync' },
    { id: 'l3', from: 'bridge-auth', to: 'api', label: 'Auth', type: 'sync' },
    { id: 'l4', from: 'api', to: 'audit', label: 'Audit', type: 'async' },
  ],
  infoCards: [
    { id: 'mfi1', x: 60, y: 60, content: 'Legacy Zone', color: 'yellow' },
    { id: 'mfi2', x: 240, y: 60, content: 'Integration Layer', color: 'blue' },
  ],
  layers: [{ id: 'lg-l1', name: 'Mainframe Bridge', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['legacy', 'mainframe'], {
    complexity: 'advanced',
    componentCount: 9,
    connectionCount: 4,
    estimatedTime: 90,
    description: 'Mainframe integration using auth bridge, transformation, and modern API wrapper',
  }),
};

export const ftpIntegrationTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'ftp', type: 'server', x: 80, y: 120, label: 'FTP Server' },
    { id: 'watch', type: 'server', x: 240, y: 120, label: 'File Watcher' },
    { id: 'batch', type: 'server', x: 400, y: 120, label: 'Batch Processor' },
    { id: 'transform', type: 'server', x: 560, y: 120, label: 'Transformation Service' },
    { id: 'err', type: 'server', x: 720, y: 120, label: 'Error Handler' },
    { id: 'notif', type: 'message-queue', x: 880, y: 120, label: 'Notification Service' },
    { id: 'archive', type: 'storage', x: 720, y: 200, label: 'Archive Storage' },
    { id: 'monitor', type: 'monitoring', x: 880, y: 200, label: 'Monitoring' },
  ],
  connections: [
    { id: 'f1', from: 'ftp', to: 'watch', label: 'Pickup', type: 'sync' },
    { id: 'f2', from: 'watch', to: 'batch', label: 'Schedule', type: 'sync' },
    { id: 'f3', from: 'batch', to: 'transform', label: 'Process', type: 'sync' },
    { id: 'f4', from: 'transform', to: 'err', label: 'Validate', type: 'sync' },
    { id: 'f5', from: 'err', to: 'notif', label: 'Notify', type: 'async' },
  ],
  layers: [{ id: 'ftp-l1', name: 'FTP Integration', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['legacy', 'ftp'], {
    complexity: 'intermediate',
    componentCount: 8,
    connectionCount: 5,
    estimatedTime: 60,
    description: 'File-based integration with error handling and notifications',
  }),
};

export const legacyDbModernizationTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'legacy-db', type: 'database', x: 120, y: 160, label: 'Legacy DB (DB2/Oracle)' },
    { id: 'replicate', type: 'server', x: 320, y: 160, label: 'Data Replication' },
    { id: 'etl', type: 'etl', x: 520, y: 160, label: 'ETL Pipeline' },
    { id: 'modern-db', type: 'postgresql', x: 720, y: 160, label: 'Modern DB (PostgreSQL)' },
    { id: 'api', type: 'api-gateway', x: 920, y: 160, label: 'API Wrapper' },
    { id: 'validate', type: 'server', x: 520, y: 240, label: 'Data Validation' },
    { id: 'monitor', type: 'monitoring', x: 920, y: 240, label: 'Monitoring' },
  ],
  connections: [
    { id: 'dbm1', from: 'legacy-db', to: 'replicate', label: 'Realtime/Batch', type: 'async' },
    { id: 'dbm2', from: 'replicate', to: 'etl', label: 'Transform', type: 'sync' },
    { id: 'dbm3', from: 'etl', to: 'modern-db', label: 'Load', type: 'sync' },
    { id: 'dbm4', from: 'api', to: 'modern-db', label: 'Access', type: 'sync' },
    { id: 'dbm5', from: 'etl', to: 'validate', label: 'Validate', type: 'sync' },
  ],
  layers: [{ id: 'dbm-l1', name: 'DB Modernization', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['legacy', 'modernization'], {
    complexity: 'advanced',
    componentCount: 7,
    connectionCount: 5,
    estimatedTime: 90,
    description: 'Database modernization with replication, ETL, validation, and API wrapper',
  }),
};

export const stranglerFigTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'legacy', type: 'server', x: 120, y: 160, label: 'Legacy Monolith' },
    { id: 'router', type: 'api-gateway', x: 320, y: 160, label: 'Routing Service' },
    { id: 'feature-toggle', type: 'server', x: 320, y: 240, label: 'Feature Toggles' },
    { id: 'modern-1', type: 'microservice', x: 520, y: 120, label: 'Modern Service A' },
    { id: 'modern-2', type: 'microservice', x: 520, y: 200, label: 'Modern Service B' },
    { id: 'monitor', type: 'monitoring', x: 720, y: 160, label: 'Monitoring' },
  ],
  connections: [
    { id: 'sf1', from: 'router', to: 'legacy', label: 'Legacy Path', type: 'sync' },
    { id: 'sf2', from: 'router', to: 'modern-1', label: 'Modern Path A', type: 'sync' },
    { id: 'sf3', from: 'router', to: 'modern-2', label: 'Modern Path B', type: 'sync' },
  ],
  layers: [{ id: 'sf-l1', name: 'Strangler Fig', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['legacy', 'migration'], {
    complexity: 'intermediate',
    componentCount: 6,
    connectionCount: 3,
    estimatedTime: 60,
    description: 'Incremental migration using routing and feature toggles',
  }),
};

export const hybridArchitectureTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'legacy-systems', type: 'server', x: 120, y: 140, label: 'Legacy Systems' },
    { id: 'integration', type: 'server', x: 320, y: 140, label: 'Integration Layer' },
    { id: 'acl', type: 'server', x: 520, y: 140, label: 'Anti-Corruption Layer' },
    { id: 'event-bridge', type: 'message-queue', x: 720, y: 140, label: 'Event Bridge' },
    { id: 'modern-services', type: 'microservice', x: 920, y: 140, label: 'Modern Services' },
    { id: 'monitor', type: 'monitoring', x: 1120, y: 140, label: 'Monitoring' },
  ],
  connections: [
    { id: 'hy1', from: 'legacy-systems', to: 'integration', label: 'Integrate', type: 'sync' },
    { id: 'hy2', from: 'integration', to: 'acl', label: 'Isolate', type: 'sync' },
    { id: 'hy3', from: 'acl', to: 'event-bridge', label: 'Publish', type: 'async' },
    { id: 'hy4', from: 'event-bridge', to: 'modern-services', label: 'Consume', type: 'async' },
  ],
  layers: [{ id: 'hy-l1', name: 'Hybrid Architecture', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['legacy', 'hybrid'], {
    complexity: 'advanced',
    componentCount: 6,
    connectionCount: 4,
    estimatedTime: 75,
    description: 'Hybrid legacy/modern architecture with clear boundaries',
  }),
};

export const legacyMonitoringTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'agents', type: 'server', x: 120, y: 140, label: 'Legacy Agents' },
    { id: 'logs', type: 'logging', x: 320, y: 100, label: 'Log Aggregation' },
    { id: 'metrics', type: 'metrics', x: 320, y: 180, label: 'Metrics Collection' },
    { id: 'alert', type: 'alerting', x: 520, y: 140, label: 'Alerting' },
    { id: 'dash', type: 'monitoring', x: 720, y: 140, label: 'Dashboard' },
    { id: 'incident', type: 'server', x: 920, y: 140, label: 'Incident Mgmt' },
  ],
  connections: [
    { id: 'lm1', from: 'agents', to: 'logs', label: 'Logs', type: 'async' },
    { id: 'lm2', from: 'agents', to: 'metrics', label: 'Metrics', type: 'async' },
    { id: 'lm3', from: 'alert', to: 'incident', label: 'Escalate', type: 'sync' },
  ],
  layers: [{ id: 'lm-l1', name: 'Legacy Monitoring', visible: true, order: 1 }],
  gridConfig: { visible: true, spacing: 50, snapToGrid: true },
  metadata: meta(['legacy', 'observability'], {
    complexity: 'intermediate',
    componentCount: 6,
    connectionCount: 3,
    estimatedTime: 45,
    description: 'Monitoring legacy systems using modern observability stack',
  }),
};

