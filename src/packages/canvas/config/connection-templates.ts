/**
 * src/packages/canvas/config/connection-templates.ts
 * Reusable connection templates for common architecture patterns
 * Provides pre-configured connection styles for common use cases
 * RELEVANT FILES: ConnectionTemplatePanel.tsx, connection-validation.ts, canvas-colors.ts
 */

import type { Connection } from "@/shared/contracts";
import type { PathStyle } from "@/stores/canvasStore";

export interface ConnectionTemplate {
  id: string;
  name: string;
  description: string;
  category: "data-flow" | "control-flow" | "sync";
  icon: string; // Lucide icon name
  connectionType: Connection["type"];
  visualStyle?: "default" | "ack" | "retry" | "error";
  pathStyle: PathStyle;
  defaultLabel: string;
  metadata?: Record<string, any>;
  // Optional: Validation rules
  validSourceTypes?: string[];
  validTargetTypes?: string[];
}

/**
 * Data Flow Templates - for data transfer patterns
 */
const dataFlowTemplates: ConnectionTemplate[] = [
  {
    id: "rest-get",
    name: "REST GET Request",
    description: "HTTP GET request for fetching data",
    category: "data-flow",
    icon: "ArrowRight",
    connectionType: "data",
    pathStyle: "curved",
    defaultLabel: "GET",
    validSourceTypes: ["client", "api", "microservice"],
    validTargetTypes: ["api", "api-gateway", "microservice"],
    metadata: { method: "GET", protocol: "HTTP" },
  },
  {
    id: "rest-post",
    name: "REST POST Request",
    description: "HTTP POST request for creating data",
    category: "data-flow",
    icon: "ArrowRight",
    connectionType: "data",
    pathStyle: "curved",
    defaultLabel: "POST",
    validSourceTypes: ["client", "api", "microservice"],
    validTargetTypes: ["api", "api-gateway", "microservice"],
    metadata: { method: "POST", protocol: "HTTP" },
  },
  {
    id: "rest-put",
    name: "REST PUT Request",
    description: "HTTP PUT request for updating data",
    category: "data-flow",
    icon: "ArrowRight",
    connectionType: "data",
    pathStyle: "curved",
    defaultLabel: "PUT",
    validSourceTypes: ["client", "api", "microservice"],
    validTargetTypes: ["api", "api-gateway", "microservice"],
    metadata: { method: "PUT", protocol: "HTTP" },
  },
  {
    id: "rest-delete",
    name: "REST DELETE Request",
    description: "HTTP DELETE request for removing data",
    category: "data-flow",
    icon: "ArrowRight",
    connectionType: "data",
    pathStyle: "curved",
    defaultLabel: "DELETE",
    validSourceTypes: ["client", "api", "microservice"],
    validTargetTypes: ["api", "api-gateway", "microservice"],
    metadata: { method: "DELETE", protocol: "HTTP" },
  },
  {
    id: "db-read",
    name: "Database Read",
    description: "Query database for data",
    category: "data-flow",
    icon: "Database",
    connectionType: "data",
    pathStyle: "curved",
    defaultLabel: "Query",
    validSourceTypes: ["api", "microservice", "server"],
    validTargetTypes: ["database", "postgresql", "mongodb", "mysql"],
    metadata: { operation: "read", transactional: false },
  },
  {
    id: "db-write",
    name: "Database Write",
    description: "Write data to database",
    category: "data-flow",
    icon: "Database",
    connectionType: "data",
    pathStyle: "curved",
    defaultLabel: "Write",
    validSourceTypes: ["api", "microservice", "server"],
    validTargetTypes: ["database", "postgresql", "mongodb", "mysql"],
    metadata: { operation: "write", transactional: true },
  },
  {
    id: "cache-read",
    name: "Cache Lookup",
    description: "Read from cache",
    category: "data-flow",
    icon: "Zap",
    connectionType: "data",
    pathStyle: "straight",
    defaultLabel: "Get",
    validSourceTypes: ["api", "microservice", "server"],
    validTargetTypes: ["cache", "redis"],
    metadata: { operation: "get", ttl: 3600 },
  },
  {
    id: "cache-write",
    name: "Cache Write",
    description: "Write to cache",
    category: "data-flow",
    icon: "Zap",
    connectionType: "data",
    pathStyle: "straight",
    defaultLabel: "Set",
    validSourceTypes: ["api", "microservice", "server"],
    validTargetTypes: ["cache", "redis"],
    metadata: { operation: "set", ttl: 3600 },
  },
  {
    id: "message-publish",
    name: "Publish Message",
    description: "Publish message to queue/topic",
    category: "data-flow",
    icon: "Send",
    connectionType: "async",
    pathStyle: "curved",
    defaultLabel: "Publish",
    validSourceTypes: ["api", "microservice", "server", "producer"],
    validTargetTypes: ["message-queue", "kafka", "rabbitmq"],
    metadata: { pattern: "pub-sub", guaranteed: false },
  },
  {
    id: "message-subscribe",
    name: "Subscribe to Messages",
    description: "Subscribe to queue/topic messages",
    category: "data-flow",
    icon: "Inbox",
    connectionType: "async",
    pathStyle: "curved",
    defaultLabel: "Subscribe",
    validSourceTypes: ["message-queue", "kafka", "rabbitmq"],
    validTargetTypes: ["microservice", "server", "consumer"],
    metadata: { pattern: "pub-sub", autoAck: true },
  },
];

/**
 * Control Flow Templates - for load balancing and traffic management
 */
const controlFlowTemplates: ConnectionTemplate[] = [
  {
    id: "load-balance-rr",
    name: "Round-Robin Load Balancing",
    description: "Distribute requests evenly across instances",
    category: "control-flow",
    icon: "Shuffle",
    connectionType: "control",
    pathStyle: "stepped",
    defaultLabel: "Round-Robin",
    validSourceTypes: ["load-balancer"],
    validTargetTypes: ["microservice", "server", "api"],
    metadata: { algorithm: "round-robin", sticky: false },
  },
  {
    id: "load-balance-lc",
    name: "Least-Connections Load Balancing",
    description: "Route to instance with fewest active connections",
    category: "control-flow",
    icon: "Shuffle",
    connectionType: "control",
    pathStyle: "stepped",
    defaultLabel: "Least-Conn",
    validSourceTypes: ["load-balancer"],
    validTargetTypes: ["microservice", "server", "api"],
    metadata: { algorithm: "least-connections", sticky: false },
  },
  {
    id: "circuit-breaker",
    name: "Circuit Breaker",
    description: "Fail fast when service is down",
    category: "control-flow",
    icon: "Shield",
    connectionType: "control",
    visualStyle: "retry",
    pathStyle: "curved",
    defaultLabel: "Circuit Breaker",
    validSourceTypes: ["api", "microservice"],
    validTargetTypes: ["api", "microservice", "database"],
    metadata: { failureThreshold: 5, timeout: 30000 },
  },
  {
    id: "rate-limit",
    name: "Rate Limiting",
    description: "Throttle requests to prevent overload",
    category: "control-flow",
    icon: "Gauge",
    connectionType: "control",
    pathStyle: "curved",
    defaultLabel: "Rate Limited",
    validSourceTypes: ["api-gateway", "api"],
    validTargetTypes: ["api", "microservice"],
    metadata: { maxRequests: 100, window: 60 },
  },
  {
    id: "retry",
    name: "Retry with Backoff",
    description: "Automatically retry failed requests",
    category: "control-flow",
    icon: "RotateCw",
    connectionType: "control",
    visualStyle: "retry",
    pathStyle: "curved",
    defaultLabel: "Retry",
    validSourceTypes: ["api", "microservice"],
    validTargetTypes: ["api", "microservice", "database"],
    metadata: { maxRetries: 3, backoff: "exponential" },
  },
  {
    id: "fallback",
    name: "Fallback",
    description: "Use alternative service on failure",
    category: "control-flow",
    icon: "GitBranch",
    connectionType: "control",
    visualStyle: "error",
    pathStyle: "curved",
    defaultLabel: "Fallback",
    validSourceTypes: ["api", "microservice"],
    validTargetTypes: ["cache", "api", "microservice"],
    metadata: { strategy: "cache-first" },
  },
];

/**
 * Synchronization Templates - for sync/async patterns
 */
const syncTemplates: ConnectionTemplate[] = [
  {
    id: "sync-request",
    name: "Synchronous Request",
    description: "Blocking request-response pattern",
    category: "sync",
    icon: "ArrowRightLeft",
    connectionType: "sync",
    pathStyle: "curved",
    defaultLabel: "Sync",
    metadata: { blocking: true, timeout: 30000 },
  },
  {
    id: "async-event",
    name: "Asynchronous Event",
    description: "Non-blocking event notification",
    category: "sync",
    icon: "Zap",
    connectionType: "async",
    pathStyle: "curved",
    defaultLabel: "Async",
    metadata: { blocking: false, guaranteed: false },
  },
  {
    id: "webhook",
    name: "Webhook Callback",
    description: "Async response via HTTP callback",
    category: "sync",
    icon: "Webhook",
    connectionType: "async",
    pathStyle: "curved",
    defaultLabel: "Webhook",
    metadata: { protocol: "HTTP", retry: true },
  },
  {
    id: "request-reply",
    name: "Request-Reply",
    description: "Message queue request-reply pattern",
    category: "sync",
    icon: "MessageSquare",
    connectionType: "async",
    visualStyle: "ack",
    pathStyle: "curved",
    defaultLabel: "Request-Reply",
    validSourceTypes: ["api", "microservice"],
    validTargetTypes: ["message-queue"],
    metadata: { pattern: "request-reply", timeout: 30000 },
  },
  {
    id: "saga-step",
    name: "Saga Step",
    description: "Distributed transaction step",
    category: "sync",
    icon: "GitCommit",
    connectionType: "async",
    visualStyle: "ack",
    pathStyle: "stepped",
    defaultLabel: "Saga Step",
    metadata: { compensatable: true, idempotent: true },
  },
];

const protocolTemplates: ConnectionTemplate[] = [
  {
    id: "rest-api",
    name: "REST API",
    description:
      "Standard request-response over HTTP/REST for synchronous communication.",
    category: "data-flow",
    icon: "Globe",
    connectionType: "sync",
    pathStyle: "curved",
    defaultLabel: "HTTP/REST",
    metadata: {
      protocol: "REST",
      latency: "< 150ms",
      reliability: "request-response",
      lineStyle: "solid",
    },
  },
  {
    id: "graphql-query",
    name: "GraphQL Query",
    description: "Fetch or mutate data via a GraphQL endpoint.",
    category: "data-flow",
    icon: "Braces",
    connectionType: "sync",
    pathStyle: "curved",
    defaultLabel: "GraphQL Query",
    metadata: {
      protocol: "GraphQL",
      latency: "< 150ms",
      reliability: "request-response",
      lineStyle: "solid",
    },
  },
  {
    id: "grpc-call",
    name: "gRPC Call",
    description: "High-performance remote procedure call using gRPC.",
    category: "data-flow",
    icon: "Cpu",
    connectionType: "sync",
    pathStyle: "curved",
    defaultLabel: "gRPC",
    metadata: {
      protocol: "gRPC",
      latency: "< 50ms",
      reliability: "request-response",
      lineStyle: "solid",
    },
  },
  {
    id: "websocket-channel",
    name: "WebSocket Channel",
    description: "Bidirectional realtime communication over WebSocket.",
    category: "data-flow",
    icon: "Wifi",
    connectionType: "sync",
    pathStyle: "curved",
    defaultLabel: "WebSocket",
    metadata: {
      protocol: "WebSocket",
      latency: "< 50ms",
      reliability: "bidirectional",
      lineStyle: "dashed",
    },
  },
  {
    id: "amqp-queue",
    name: "Message Queue",
    description: "Asynchronous messaging through AMQP-compatible brokers.",
    category: "data-flow",
    icon: "Send",
    connectionType: "async",
    pathStyle: "stepped",
    defaultLabel: "Message Queue",
    metadata: {
      protocol: "AMQP",
      latency: "async",
      reliability: "at-least-once",
      lineStyle: "dashed",
    },
  },
  {
    id: "kafka-stream",
    name: "Event Stream",
    description: "Publish/subscribe streaming events with Kafka.",
    category: "data-flow",
    icon: "Waves",
    connectionType: "async",
    pathStyle: "curved",
    defaultLabel: "Event Stream",
    metadata: {
      protocol: "Kafka",
      latency: "async",
      reliability: "at-least-once",
      lineStyle: "dashed",
    },
  },
  {
    id: "sql-query",
    name: "Database Query",
    description: "Structured query execution against SQL databases.",
    category: "data-flow",
    icon: "Database",
    connectionType: "sync",
    pathStyle: "curved",
    defaultLabel: "DB Query",
    metadata: {
      protocol: "SQL",
      latency: "< 100ms",
      reliability: "transactional",
      lineStyle: "solid",
    },
  },
  {
    id: "redis-read",
    name: "Cache Read",
    description: "Read data from an in-memory cache such as Redis.",
    category: "data-flow",
    icon: "Zap",
    connectionType: "sync",
    pathStyle: "straight",
    defaultLabel: "Cache Read",
    metadata: {
      protocol: "Redis",
      latency: "< 10ms",
      reliability: "eventual-consistency",
      lineStyle: "dotted",
    },
  },
  {
    id: "s3-upload",
    name: "File Transfer",
    description: "Upload or transfer files to object storage services.",
    category: "data-flow",
    icon: "CloudUpload",
    connectionType: "async",
    pathStyle: "stepped",
    defaultLabel: "File Upload",
    metadata: {
      protocol: "S3",
      latency: "seconds+",
      reliability: "eventual",
      lineStyle: "dashed",
    },
  },
  {
    id: "http-load-balance",
    name: "Load Balancing",
    description: "Distribute HTTP traffic evenly across downstream targets.",
    category: "control-flow",
    icon: "Network",
    connectionType: "sync",
    pathStyle: "stepped",
    defaultLabel: "Load Balanced",
    metadata: {
      protocol: "HTTP",
      latency: "< 25ms",
      reliability: "best-effort",
      lineStyle: "solid",
    },
  },
];

/**
 * All available templates
 */
export const connectionTemplates: ConnectionTemplate[] = [
  ...dataFlowTemplates,
  ...controlFlowTemplates,
  ...syncTemplates,
  ...protocolTemplates,
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: ConnectionTemplate["category"],
): ConnectionTemplate[] {
  return connectionTemplates.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ConnectionTemplate | undefined {
  return connectionTemplates.find((t) => t.id === id);
}

/**
 * Get templates suitable for component pair
 */
export function getTemplatesForComponentPair(
  sourceType: string,
  targetType: string,
): ConnectionTemplate[] {
  return connectionTemplates.filter((template) => {
    const validSource =
      !template.validSourceTypes ||
      template.validSourceTypes.includes(sourceType);
    const validTarget =
      !template.validTargetTypes ||
      template.validTargetTypes.includes(targetType);
    return validSource && validTarget;
  });
}

/**
 * Recently used templates (stored in localStorage)
 */
const RECENT_TEMPLATES_KEY = "archicomm:recent-connection-templates";
const MAX_RECENT_TEMPLATES = 5;

/**
 * Get recently used templates
 */
export function getRecentlyUsedTemplates(
  limit: number = 5,
): ConnectionTemplate[] {
  try {
    const stored = localStorage.getItem(RECENT_TEMPLATES_KEY);
    if (!stored) return [];

    const recentIds: string[] = JSON.parse(stored);
    const templates = recentIds
      .slice(0, Math.min(limit, MAX_RECENT_TEMPLATES))
      .map((id) => getTemplateById(id))
      .filter((t): t is ConnectionTemplate => t !== undefined);

    return templates;
  } catch {
    return [];
  }
}

/**
 * Add template to recently used
 */
export function addToRecentlyUsed(templateId: string): void {
  try {
    const stored = localStorage.getItem(RECENT_TEMPLATES_KEY);
    const recentIds: string[] = stored ? JSON.parse(stored) : [];

    // Remove if already exists
    const filtered = recentIds.filter((id) => id !== templateId);

    // Add to front
    const updated = [templateId, ...filtered].slice(0, MAX_RECENT_TEMPLATES);

    localStorage.setItem(RECENT_TEMPLATES_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Apply template properties to a connection
 */
function mergeTemplateWithConnection(
  connection: Partial<Connection>,
  template: ConnectionTemplate,
): Partial<Connection> {
  const existingMetadata = connection.metadata ?? {};
  const templateMetadata = template.metadata ?? {};

  return {
    ...connection,
    type: template.connectionType,
    label: connection.label ?? template.defaultLabel,
    visualStyle: template.visualStyle ?? connection.visualStyle,
    metadata: {
      ...existingMetadata,
      ...templateMetadata,
      templateId: template.id,
      templateName: template.name,
    },
  };
}

export function applyTemplate(
  connection: Partial<Connection>,
  templateId: string,
): Partial<Connection>;
export function applyTemplate(
  template: ConnectionTemplate,
  connection: Partial<Connection>,
): Partial<Connection>;
export function applyTemplate(
  arg1: ConnectionTemplate | Partial<Connection>,
  arg2: Partial<Connection> | string,
): Partial<Connection> {
  if (typeof arg2 === "string") {
    const connection = arg1 as Partial<Connection>;
    const template = getTemplateById(arg2);
    if (!template) {
      return connection;
    }

    return mergeTemplateWithConnection(connection, template);
  }

  return mergeTemplateWithConnection(
    arg2 as Partial<Connection>,
    arg1 as ConnectionTemplate,
  );
}

/**
 * Get popular templates (most frequently used)
 */
export function getPopularTemplates(limit: number = 5): ConnectionTemplate[] {
  // For now, return a curated list of most useful templates
  const popularIds = [
    "rest-get",
    "db-read",
    "cache-read",
    "message-publish",
    "sync-request",
  ];

  return popularIds
    .map((id) => getTemplateById(id))
    .filter((t): t is ConnectionTemplate => t !== undefined)
    .slice(0, limit);
}
