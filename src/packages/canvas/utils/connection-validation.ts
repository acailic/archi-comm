/**
 * File: src/packages/canvas/utils/connection-validation.ts
 * Purpose: Validate connections between components and provide feedback
 * Why: Prevents invalid connections and guides users to create proper architecture
 * Related: src/shared/contracts/index.ts, src/packages/canvas/SimpleCanvas.tsx
 */

import type { Connection, DesignComponent } from '../../../shared/contracts';

export interface ConnectionValidationResult {
  valid: boolean;
  reason?: string;
  severity?: 'error' | 'warning';
}

export type ConnectionRule = (
  sourceType: string,
  targetType: string
) => ConnectionValidationResult | null;

/**
 * Validate a connection between two components
 */
export function validateConnection(
  from: string,
  to: string,
  existingConnections: Connection[],
  components: DesignComponent[]
): ConnectionValidationResult {
  // Check if source and target are the same
  if (isSelfConnection(from, to)) {
    return {
      valid: false,
      reason: 'Cannot connect component to itself',
      severity: 'error',
    };
  }

  // Check if connection already exists
  if (isDuplicateConnection(from, to, existingConnections)) {
    return {
      valid: false,
      reason: 'Connection already exists',
      severity: 'error',
    };
  }

  // Check if source and target components exist
  const sourceComponent = components.find((c) => c.id === from);
  const targetComponent = components.find((c) => c.id === to);

  if (!sourceComponent) {
    return {
      valid: false,
      reason: 'Source component not found',
      severity: 'error',
    };
  }

  if (!targetComponent) {
    return {
      valid: false,
      reason: 'Target component not found',
      severity: 'error',
    };
  }

  // Perform type-based validation
  const typeValidation = validateConnectionByType(
    sourceComponent.type,
    targetComponent.type
  );

  if (!typeValidation.valid) {
    return typeValidation;
  }

  return { valid: true };
}

/**
 * Validate connection based on component types with architecture best practices
 */
export function validateConnectionByType(
  sourceType: string,
  targetType: string,
  rules?: ConnectionRule[]
): ConnectionValidationResult {
  // Apply custom rules if provided
  if (rules) {
    for (const rule of rules) {
      const result = rule(sourceType, targetType);
      if (result) {
        return result;
      }
    }
  }

  // Built-in architecture pattern rules
  const builtInRules = getBuiltInConnectionRules();

  for (const rule of builtInRules) {
    const result = rule(sourceType, targetType);
    if (result) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Get built-in connection validation rules based on architecture patterns
 */
function getBuiltInConnectionRules(): ConnectionRule[] {
  return [
    // Client should not connect directly to database
    (sourceType, targetType) => {
      if (
        sourceType === 'client' &&
        (targetType === 'database' ||
          targetType === 'postgresql' ||
          targetType === 'mysql' ||
          targetType === 'mongodb')
      ) {
        return {
          valid: false,
          reason: 'Clients should connect through an API Gateway, not directly to databases',
          severity: 'warning',
        };
      }
      return null;
    },

    // Database should not initiate connections
    (sourceType, targetType) => {
      if (
        sourceType === 'database' ||
        sourceType === 'postgresql' ||
        sourceType === 'mysql' ||
        sourceType === 'mongodb'
      ) {
        return {
          valid: false,
          reason: 'Databases should receive connections, not initiate them',
          severity: 'warning',
        };
      }
      return null;
    },

    // Load balancer should connect to multiple instances
    (sourceType, targetType) => {
      if (
        sourceType === 'load-balancer' &&
        targetType === 'database'
      ) {
        return {
          valid: false,
          reason: 'Load balancers typically distribute to services, not databases',
          severity: 'warning',
        };
      }
      return null;
    },
  ];
}

/**
 * Get suggested connection targets for a component
 */
export function getConnectionSuggestions(
  sourceType: string,
  components: DesignComponent[]
): string[] {
  const suggestions: string[] = [];

  // Define common architecture patterns
  const suggestionMap: Record<string, string[]> = {
    'client': ['api-gateway', 'api', 'load-balancer'],
    'api-gateway': ['microservice', 'server', 'cache'],
    'api': ['microservice', 'server', 'cache'],
    'microservice': ['database', 'cache', 'message-queue'],
    'server': ['database', 'cache', 'message-queue'],
    'load-balancer': ['microservice', 'server', 'api-gateway'],
    'producer': ['message-queue', 'kafka', 'rabbitmq'],
    'message-queue': ['consumer', 'microservice'],
    'kafka': ['consumer', 'microservice'],
    'rabbitmq': ['consumer', 'microservice'],
  };

  const recommendedTypes = suggestionMap[sourceType.toLowerCase()] || [];

  components.forEach((component) => {
    if (recommendedTypes.includes(component.type.toLowerCase())) {
      suggestions.push(component.id);
    }
  });

  return suggestions;
}

/**
 * Check if connection is from a component to itself
 */
export function isSelfConnection(from: string, to: string): boolean {
  return from === to;
}

/**
 * Check if connection already exists between two components
 */
export function isDuplicateConnection(
  from: string,
  to: string,
  connections: Connection[]
): boolean {
  return connections.some(
    (conn) =>
      (conn.from === from && conn.to === to) ||
      (conn.from === to && conn.to === from)
  );
}

/**
 * Get human-readable validation message
 */
export function getConnectionValidationMessage(
  result: ConnectionValidationResult
): string {
  if (result.valid) {
    return 'Connection is valid';
  }

  const prefix = result.severity === 'warning' ? 'Warning' : 'Error';
  return `${prefix}: ${result.reason || 'Invalid connection'}`;
}

/**
 * Validate connection direction (some connections should be one-way)
 */
export function validateConnectionDirection(
  sourceType: string,
  targetType: string,
  connectionType: string
): ConnectionValidationResult {
  // Database should not initiate connections
  if (
    ['database', 'postgresql', 'mysql', 'mongodb', 'redis'].includes(sourceType)
  ) {
    return {
      valid: false,
      reason: 'Databases should receive connections, not initiate them. Try reversing the connection.',
      severity: 'error',
    };
  }

  // Cache should not initiate connections
  if (['cache', 'redis'].includes(sourceType) && connectionType !== 'async') {
    return {
      valid: false,
      reason: 'Cache should receive connections, not initiate them. Try reversing the connection.',
      severity: 'warning',
    };
  }

  return { valid: true };
}

/**
 * Check for duplicate connections allowing multiple if different types
 */
export function validateDuplicateConnection(
  from: string,
  to: string,
  connectionType: string,
  connections: Connection[]
): ConnectionValidationResult {
  const existingConnection = connections.find(
    (conn) =>
      (conn.from === from && conn.to === to) ||
      (conn.from === to && conn.to === from)
  );

  if (!existingConnection) {
    return { valid: true };
  }

  // Allow if different type
  if (existingConnection.type !== connectionType) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: 'Connection of this type already exists. Edit the existing connection instead.',
    severity: 'error',
  };
}

/**
 * Detect circular dependencies in connections
 */
export function validateCircularDependency(
  fromId: string,
  toId: string,
  connections: Connection[]
): ConnectionValidationResult {
  // Build adjacency list
  const graph = new Map<string, Set<string>>();

  connections.forEach((conn) => {
    if (!graph.has(conn.from)) {
      graph.set(conn.from, new Set());
    }
    graph.get(conn.from)!.add(conn.to);
  });

  // Check if adding this connection would create a cycle
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Temporarily add the new connection to check for cycles
  if (!graph.has(fromId)) {
    graph.set(fromId, new Set());
  }
  graph.get(fromId)!.add(toId);

  const hasCyclicDependency = hasCycle(fromId);

  if (hasCyclicDependency) {
    return {
      valid: false,
      reason: 'This connection would create a circular dependency. Consider using async patterns or breaking the cycle.',
      severity: 'warning',
    };
  }

  return { valid: true };
}

/**
 * Validate connection count for a component
 */
export function validateConnectionCount(
  componentId: string,
  componentType: string,
  connections: Connection[],
  maxConnections?: number
): ConnectionValidationResult {
  const componentConnections = connections.filter(
    (conn) => conn.from === componentId || conn.to === componentId
  );

  // Default limits per component type
  const defaultLimits: Record<string, number> = {
    'load-balancer': 100,
    'api-gateway': 50,
    microservice: 20,
    api: 20,
    database: 30,
    cache: 50,
    'message-queue': 100,
    default: 15,
  };

  const limit = maxConnections || defaultLimits[componentType] || defaultLimits.default;

  if (componentConnections.length >= limit) {
    const suggestion =
      componentType === 'microservice'
        ? 'Consider using a load balancer or message queue to distribute connections.'
        : 'Consider splitting this component or using a different architecture pattern.';

    return {
      valid: false,
      reason: `Component has reached maximum connection limit (${limit}). ${suggestion}`,
      severity: 'warning',
    };
  }

  return { valid: true };
}

/**
 * Comprehensive validation with all checks
 */
export function validateConnectionComprehensive(
  from: string,
  to: string,
  connectionType: string,
  existingConnections: Connection[],
  components: DesignComponent[]
): ConnectionValidationResult {
  // Basic validations
  const basicResult = validateConnection(from, to, existingConnections, components);
  if (!basicResult.valid) {
    return basicResult;
  }

  const sourceComponent = components.find((c) => c.id === from);
  const targetComponent = components.find((c) => c.id === to);

  if (!sourceComponent || !targetComponent) {
    return {
      valid: false,
      reason: 'Component not found',
      severity: 'error',
    };
  }

  // Direction validation
  const directionResult = validateConnectionDirection(
    sourceComponent.type,
    targetComponent.type,
    connectionType
  );
  if (!directionResult.valid) {
    return directionResult;
  }

  // Duplicate validation with type check
  const duplicateResult = validateDuplicateConnection(
    from,
    to,
    connectionType,
    existingConnections
  );
  if (!duplicateResult.valid) {
    return duplicateResult;
  }

  // Circular dependency check
  const circularResult = validateCircularDependency(from, to, existingConnections);
  if (!circularResult.valid) {
    return circularResult;
  }

  // Connection count validation
  const sourceCountResult = validateConnectionCount(
    from,
    sourceComponent.type,
    existingConnections
  );
  if (!sourceCountResult.valid) {
    return sourceCountResult;
  }

  const targetCountResult = validateConnectionCount(
    to,
    targetComponent.type,
    existingConnections
  );
  if (!targetCountResult.valid) {
    return targetCountResult;
  }

  return { valid: true };
}
