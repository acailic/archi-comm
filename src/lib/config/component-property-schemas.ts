/**
 * File: src/lib/config/component-property-schemas.ts
 * Purpose: Define type-specific property schemas for architecture components
 * Why: Enables detailed configuration of components with validation and templates
 * Related: src/shared/contracts/index.ts, src/packages/ui/components/PropertiesPanel/PropertiesPanel.tsx
 */

export type PropertyFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'textarea';

export interface PropertyField {
  key: string;
  label: string;
  type: PropertyFieldType;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: RegExp;
  };
  helpText?: string;
  unit?: string;
}

// Database schemas
const databaseSchema: PropertyField[] = [
  {
    key: 'connectionString',
    label: 'Connection String',
    type: 'text',
    validation: { required: true },
    helpText: 'Database connection URL or connection string',
  },
  {
    key: 'port',
    label: 'Port',
    type: 'number',
    defaultValue: 5432,
    validation: { min: 1, max: 65535 },
    helpText: 'Database port number',
  },
  {
    key: 'maxConnections',
    label: 'Max Connections',
    type: 'number',
    defaultValue: 100,
    validation: { min: 1, max: 10000 },
    helpText: 'Maximum number of concurrent connections',
  },
  {
    key: 'replicationFactor',
    label: 'Replication Factor',
    type: 'number',
    defaultValue: 3,
    validation: { min: 1, max: 10 },
    helpText: 'Number of data replicas',
  },
  {
    key: 'backupEnabled',
    label: 'Backup Enabled',
    type: 'checkbox',
    defaultValue: true,
    helpText: 'Enable automatic backups',
  },
];

// API Gateway schema
const apiGatewaySchema: PropertyField[] = [
  {
    key: 'endpoint',
    label: 'Endpoint',
    type: 'text',
    validation: { required: true },
    helpText: 'API endpoint URL',
  },
  {
    key: 'authMethod',
    label: 'Authentication Method',
    type: 'select',
    defaultValue: 'JWT',
    options: [
      { value: 'JWT', label: 'JSON Web Token' },
      { value: 'OAuth', label: 'OAuth 2.0' },
      { value: 'API Key', label: 'API Key' },
      { value: 'None', label: 'None' },
    ],
    helpText: 'Authentication mechanism',
  },
  {
    key: 'rateLimitRPS',
    label: 'Rate Limit',
    type: 'number',
    defaultValue: 1000,
    validation: { min: 1 },
    unit: 'requests/sec',
    helpText: 'Maximum requests per second',
  },
  {
    key: 'timeoutMs',
    label: 'Timeout',
    type: 'number',
    defaultValue: 30000,
    validation: { min: 100 },
    unit: 'ms',
    helpText: 'Request timeout in milliseconds',
  },
  {
    key: 'corsEnabled',
    label: 'CORS Enabled',
    type: 'checkbox',
    defaultValue: true,
    helpText: 'Enable Cross-Origin Resource Sharing',
  },
];

// Cache schema
const cacheSchema: PropertyField[] = [
  {
    key: 'ttlSeconds',
    label: 'TTL',
    type: 'number',
    defaultValue: 3600,
    validation: { min: 1 },
    unit: 'seconds',
    helpText: 'Time to live for cached items',
  },
  {
    key: 'evictionPolicy',
    label: 'Eviction Policy',
    type: 'select',
    defaultValue: 'LRU',
    options: [
      { value: 'LRU', label: 'Least Recently Used' },
      { value: 'LFU', label: 'Least Frequently Used' },
      { value: 'FIFO', label: 'First In First Out' },
      { value: 'Random', label: 'Random' },
    ],
    helpText: 'Cache eviction strategy',
  },
  {
    key: 'maxSizeGB',
    label: 'Max Size',
    type: 'number',
    defaultValue: 4,
    validation: { min: 0.1, max: 1024 },
    unit: 'GB',
    helpText: 'Maximum cache size',
  },
  {
    key: 'persistenceEnabled',
    label: 'Persistence Enabled',
    type: 'checkbox',
    defaultValue: false,
    helpText: 'Enable data persistence to disk',
  },
];

// Message Queue schema
const messageQueueSchema: PropertyField[] = [
  {
    key: 'topic',
    label: 'Topic',
    type: 'text',
    validation: { required: true },
    helpText: 'Message topic or queue name',
  },
  {
    key: 'partitions',
    label: 'Partitions',
    type: 'number',
    defaultValue: 3,
    validation: { min: 1, max: 100 },
    helpText: 'Number of partitions',
  },
  {
    key: 'retentionHours',
    label: 'Retention',
    type: 'number',
    defaultValue: 168,
    validation: { min: 1 },
    unit: 'hours',
    helpText: 'Message retention period',
  },
  {
    key: 'consumerGroup',
    label: 'Consumer Group',
    type: 'text',
    helpText: 'Consumer group identifier',
  },
  {
    key: 'replicationFactor',
    label: 'Replication Factor',
    type: 'number',
    defaultValue: 3,
    validation: { min: 1 },
    helpText: 'Number of message replicas',
  },
];

// Load Balancer schema
const loadBalancerSchema: PropertyField[] = [
  {
    key: 'algorithm',
    label: 'Algorithm',
    type: 'select',
    defaultValue: 'Round Robin',
    options: [
      { value: 'Round Robin', label: 'Round Robin' },
      { value: 'Least Connections', label: 'Least Connections' },
      { value: 'IP Hash', label: 'IP Hash' },
      { value: 'Weighted', label: 'Weighted' },
    ],
    helpText: 'Load balancing algorithm',
  },
  {
    key: 'healthCheckInterval',
    label: 'Health Check Interval',
    type: 'number',
    defaultValue: 30,
    validation: { min: 5 },
    unit: 'seconds',
    helpText: 'Interval between health checks',
  },
  {
    key: 'healthCheckPath',
    label: 'Health Check Path',
    type: 'text',
    defaultValue: '/health',
    helpText: 'HTTP path for health checks',
  },
  {
    key: 'stickySessionsEnabled',
    label: 'Sticky Sessions',
    type: 'checkbox',
    defaultValue: false,
    helpText: 'Enable session affinity',
  },
];

// Component property schemas mapping
export const componentPropertySchemas: Record<string, PropertyField[]> = {
  'database': databaseSchema,
  'postgresql': databaseSchema,
  'mysql': databaseSchema,
  'mongodb': databaseSchema,
  'api-gateway': apiGatewaySchema,
  'api': apiGatewaySchema,
  'cache': cacheSchema,
  'redis': cacheSchema,
  'message-queue': messageQueueSchema,
  'kafka': messageQueueSchema,
  'rabbitmq': messageQueueSchema,
  'load-balancer': loadBalancerSchema,
};

// Property templates for common configurations
export const componentPropertyTemplates: Record<string, Record<string, any>> = {
  'database-production': {
    port: 5432,
    maxConnections: 500,
    replicationFactor: 3,
    backupEnabled: true,
  },
  'database-development': {
    port: 5432,
    maxConnections: 50,
    replicationFactor: 1,
    backupEnabled: false,
  },
  'cache-session-store': {
    ttlSeconds: 1800,
    evictionPolicy: 'LRU',
    maxSizeGB: 2,
    persistenceEnabled: false,
  },
  'cache-cdn': {
    ttlSeconds: 86400,
    evictionPolicy: 'LRU',
    maxSizeGB: 100,
    persistenceEnabled: true,
  },
  'api-public': {
    authMethod: 'API Key',
    rateLimitRPS: 100,
    timeoutMs: 30000,
    corsEnabled: true,
  },
  'api-internal': {
    authMethod: 'JWT',
    rateLimitRPS: 5000,
    timeoutMs: 10000,
    corsEnabled: false,
  },
};

// Utility functions
export function getPropertySchema(componentType: string): PropertyField[] | undefined {
  return componentPropertySchemas[componentType.toLowerCase()];
}

export function getPropertyTemplates(componentType: string): Record<string, any>[] {
  const baseType = componentType.toLowerCase();
  const templates: Record<string, any>[] = [];

  Object.entries(componentPropertyTemplates).forEach(([key, value]) => {
    if (key.startsWith(baseType)) {
      templates.push({ name: key, properties: value });
    }
  });

  return templates;
}

export function validatePropertyValue(
  field: PropertyField,
  value: any
): { valid: boolean; error?: string } {
  if (!field.validation) {
    return { valid: true };
  }

  const { required, min, max, pattern } = field.validation;

  if (required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.label} is required` };
  }

  if (field.type === 'number' && value !== undefined) {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { valid: false, error: `${field.label} must be a number` };
    }
    if (min !== undefined && numValue < min) {
      return { valid: false, error: `${field.label} must be at least ${min}` };
    }
    if (max !== undefined && numValue > max) {
      return { valid: false, error: `${field.label} must be at most ${max}` };
    }
  }

  if (pattern && typeof value === 'string' && !pattern.test(value)) {
    return { valid: false, error: `${field.label} format is invalid` };
  }

  return { valid: true };
}

export function applyPropertyTemplate(
  componentType: string,
  templateName: string
): Record<string, any> | undefined {
  return componentPropertyTemplates[templateName];
}
