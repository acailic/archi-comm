/**
 * src/lib/canvas/pattern-detection.ts
 * Detects common architecture patterns in canvas diagrams
 * Provides intelligent suggestions and pattern recognition
 * RELEVANT FILES: canvas-ai-assistant.ts, AIAssistantPanel.tsx, canvasStore.ts, shared/contracts/index.ts
 */

import type { DesignComponent, Connection } from '@/shared/contracts';

export interface DetectedPattern {
  id: string;
  name: string;
  confidence: number; // 0-1
  components: string[]; // component IDs involved
  description: string;
  suggestions?: string[];
}

export type PatternType =
  | 'microservices'
  | 'three-tier'
  | 'event-driven'
  | 'cqrs'
  | 'api-gateway'
  | 'database-per-service'
  | 'circuit-breaker'
  | 'load-balancer'
  | 'message-queue'
  | 'cache-aside';

/**
 * Analyze canvas and detect architecture patterns
 */
export const detectPatterns = (
  components: DesignComponent[],
  connections: Connection[]
): DetectedPattern[] => {
  const patterns: DetectedPattern[] = [];

  // Detect API Gateway pattern
  const apiGatewayPattern = detectApiGatewayPattern(components, connections);
  if (apiGatewayPattern) patterns.push(apiGatewayPattern);

  // Detect Microservices pattern
  const microservicesPattern = detectMicroservicesPattern(components, connections);
  if (microservicesPattern) patterns.push(microservicesPattern);

  // Detect Three-Tier pattern
  const threeTierPattern = detectThreeTierPattern(components, connections);
  if (threeTierPattern) patterns.push(threeTierPattern);

  // Detect Event-Driven pattern
  const eventDrivenPattern = detectEventDrivenPattern(components, connections);
  if (eventDrivenPattern) patterns.push(eventDrivenPattern);

  // Detect Database-per-Service pattern
  const dbPerServicePattern = detectDatabasePerServicePattern(components, connections);
  if (dbPerServicePattern) patterns.push(dbPerServicePattern);

  return patterns.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Detect API Gateway pattern
 */
const detectApiGatewayPattern = (
  components: DesignComponent[],
  connections: Connection[]
): DetectedPattern | null => {
  const apiGateways = components.filter(c => c.type === 'api-gateway');
  if (apiGateways.length === 0) return null;

  const gateway = apiGateways[0];
  const downstreamConnections = connections.filter(conn => conn.from === gateway.id);

  if (downstreamConnections.length < 2) return null;

  return {
    id: 'api-gateway',
    name: 'API Gateway Pattern',
    confidence: 0.9,
    components: [gateway.id, ...downstreamConnections.map(c => c.to)],
    description: 'Single entry point routing requests to multiple backend services',
    suggestions: [
      'Consider adding authentication/authorization at the gateway',
      'Add rate limiting to prevent abuse',
      'Implement circuit breaker for downstream service failures',
    ],
  };
};

/**
 * Detect Microservices architecture
 */
const detectMicroservicesPattern = (
  components: DesignComponent[],
  connections: Connection[]
): DetectedPattern | null => {
  const services = components.filter(c => c.type === 'service' || c.type === 'microservice');
  const databases = components.filter(c => c.type === 'database');

  if (services.length < 3) return null;

  const confidence = Math.min(0.95, 0.5 + (services.length * 0.1));

  return {
    id: 'microservices',
    name: 'Microservices Architecture',
    confidence,
    components: [...services.map(s => s.id), ...databases.map(d => d.id)],
    description: `${services.length} independent services with separate responsibilities`,
    suggestions: [
      'Ensure each service has its own database (Database-per-Service pattern)',
      'Consider adding a service mesh for inter-service communication',
      'Implement distributed tracing for observability',
    ],
  };
};

/**
 * Detect Three-Tier architecture
 */
const detectThreeTierPattern = (
  components: DesignComponent[],
  connections: Connection[]
): DetectedPattern | null => {
  const frontend = components.find(c => c.type === 'frontend' || c.type === 'web');
  const backend = components.find(c => c.type === 'backend' || c.type === 'application-server');
  const database = components.find(c => c.type === 'database');

  if (!frontend || !backend || !database) return null;

  // Check if they're connected in order
  const frontendToBackend = connections.some(c => c.from === frontend.id && c.to === backend.id);
  const backendToDb = connections.some(c => c.from === backend.id && c.to === database.id);

  if (!frontendToBackend || !backendToDb) return null;

  return {
    id: 'three-tier',
    name: 'Three-Tier Architecture',
    confidence: 0.95,
    components: [frontend.id, backend.id, database.id],
    description: 'Classic separation of presentation, business logic, and data layers',
    suggestions: [
      'Consider adding caching layer between backend and database',
      'Add load balancer in front of application tier for scalability',
    ],
  };
};

/**
 * Detect Event-Driven architecture
 */
const detectEventDrivenPattern = (
  components: DesignComponent[],
  connections: Connection[]
): DetectedPattern | null => {
  const messageQueues = components.filter(c =>
    c.type === 'message-queue' || c.type === 'event-bus' || c.type === 'kafka'
  );

  if (messageQueues.length === 0) return null;

  const queue = messageQueues[0];
  const producers = connections.filter(c => c.to === queue.id).map(c => c.from);
  const consumers = connections.filter(c => c.from === queue.id).map(c => c.to);

  if (producers.length < 1 || consumers.length < 1) return null;

  return {
    id: 'event-driven',
    name: 'Event-Driven Architecture',
    confidence: 0.85,
    components: [queue.id, ...producers, ...consumers],
    description: 'Asynchronous communication via events and message queues',
    suggestions: [
      'Ensure idempotent event handlers to handle duplicate messages',
      'Consider implementing event sourcing for audit trail',
      'Add dead letter queue for failed messages',
    ],
  };
};

/**
 * Detect Database-per-Service pattern
 */
const detectDatabasePerServicePattern = (
  components: DesignComponent[],
  connections: Connection[]
): DetectedPattern | null => {
  const services = components.filter(c => c.type === 'service' || c.type === 'microservice');
  const databases = components.filter(c => c.type === 'database');

  if (services.length < 2 || databases.length < 2) return null;

  // Check if each service has its own database
  const serviceToDbs = new Map<string, string[]>();
  connections.forEach(conn => {
    const sourceService = services.find(s => s.id === conn.from);
    const targetDb = databases.find(d => d.id === conn.to);
    if (sourceService && targetDb) {
      if (!serviceToDbs.has(sourceService.id)) {
        serviceToDbs.set(sourceService.id, []);
      }
      serviceToDbs.get(sourceService.id)!.push(targetDb.id);
    }
  });

  const servicesWithOwnDb = Array.from(serviceToDbs.values()).filter(dbs => dbs.length === 1).length;
  if (servicesWithOwnDb < 2) return null;

  return {
    id: 'database-per-service',
    name: 'Database-per-Service Pattern',
    confidence: 0.8,
    components: [...services.map(s => s.id), ...databases.map(d => d.id)],
    description: 'Each service owns its data and has a dedicated database',
    suggestions: [
      'Implement API-based data sharing instead of direct database access',
      'Consider event-driven sync for data consistency across services',
    ],
  };
};

/**
 * Get suggestions for improving architecture
 */
export const getArchitectureSuggestions = (
  components: DesignComponent[],
  connections: Connection[]
): string[] => {
  const suggestions: string[] = [];

  // Check for single point of failure
  const singletons = components.filter(c => {
    const outgoing = connections.filter(conn => conn.from === c.id);
    return outgoing.length > 3; // Component with many outgoing connections
  });
  if (singletons.length > 0) {
    suggestions.push('Consider load balancing and redundancy for high-traffic components');
  }

  // Check for database access patterns
  const databases = components.filter(c => c.type === 'database');
  const dbConnections = connections.filter(c => databases.some(d => d.id === c.to));
  const servicesAccessingDb = new Set(dbConnections.map(c => c.from));
  if (servicesAccessingDb.size > 5) {
    suggestions.push('Multiple services accessing same database - consider data ownership boundaries');
  }

  return suggestions;
};
