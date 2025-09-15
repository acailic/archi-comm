/**
 * React Flow Adapter Functions
 * 
 * Converts between ArchiComm domain objects and React Flow format.
 * Provides seamless integration while preserving all existing properties.
 */

import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';
import type { DesignComponent, Connection } from '../../../shared/contracts';

// Custom data types for React Flow nodes and edges
export interface ArchiCommNodeData {
  [key: string]: unknown;
  component: any; // DesignComponent type - using any to avoid circular import
  type: string;
  label: string;
  description?: string;
  properties?: Record<string, unknown>;
  layerId?: string;
}

export interface ArchiCommEdgeData {
  [key: string]: unknown;
  connection: Connection;
  connectionStyle: 'straight' | 'curved' | 'stepped';
  isSelected: boolean;
  isStartConnection: boolean;
  onConnectionSelect: (id: string | null, x?: number, y?: number) => void;
  label: string;
  type: string;
  protocol?: string;
  direction?: string;
  visualStyle?: string;
}

// Type aliases for our specific React Flow types
export type ArchiCommNode = Node<ArchiCommNodeData>;
export type ArchiCommEdge = Edge<ArchiCommEdgeData>;

/**
 * Converts DesignComponent array to React Flow nodes
 */
export function toReactFlowNodes(components: DesignComponent[]): ArchiCommNode[] {
  return components.map((component) => ({
    id: component.id,
    type: 'custom', // We'll use a custom node type for all components
    position: {
      x: component.x,
      y: component.y,
    },
    data: {
      component: component,
      type: component.type,
      label: component.label,
      description: component.description,
      properties: component.properties,
      layerId: component.layerId,
    },
    // React Flow specific properties
    draggable: true,
    selectable: true,
    deletable: true,
  }));
}

/**
 * Converts Connection array to React Flow edges
 */
export function toReactFlowEdges(connections: Connection[]): ArchiCommEdge[] {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    type: 'custom', // Use custom edge type for CustomEdge component
    data: {
      connection: connection,
      connectionStyle: getConnectionStyle(connection.type),
      isSelected: false,
      isStartConnection: false,
      onConnectionSelect: () => {}, // Will be overridden by parent
      label: connection.label,
      type: connection.type,
      protocol: connection.protocol,
      direction: connection.direction,
      visualStyle: connection.visualStyle,
    },
    // React Flow specific properties
    deletable: true,
    selectable: true,
    // Add arrow markers based on direction
    markerEnd: shouldShowEndMarker(connection.direction) ? {
      type: 'arrowclosed',
      width: 20,
      height: 20,
    } : undefined,
    markerStart: shouldShowStartMarker(connection.direction) ? {
      type: 'arrowclosed',
      width: 20,
      height: 20,
    } : undefined,
  }));
}

/**
 * Converts React Flow nodes back to DesignComponent array
 */
export function fromReactFlowNodes(nodes: ArchiCommNode[]): DesignComponent[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.data.type,
    x: node.position.x,
    y: node.position.y,
    label: node.data.label,
    description: node.data.description,
    properties: node.data.properties,
    layerId: node.data.layerId,
  }));
}

/**
 * Converts React Flow edges back to Connection array
 */
export function fromReactFlowEdges(edges: ArchiCommEdge[]): Connection[] {
  return edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    label: edge.data.label,
    type: edge.data.type as any, // Cast to ConnectionType
    protocol: edge.data.protocol,
    direction: edge.data.direction as any, // Cast to ConnectionDirection
    visualStyle: edge.data.visualStyle as any, // Cast to VisualStyle
  }));
}

/**
 * Processes React Flow node changes and returns updated DesignComponent array
 */
export function fromNodeChanges(
  changes: NodeChange[],
  components: DesignComponent[]
): DesignComponent[] {
  let updatedComponents = [...components];

  for (const change of changes) {
    switch (change.type) {
      case 'position':
        if (change.position) {
          updatedComponents = updatedComponents.map((component) =>
            component.id === change.id
              ? {
                  ...component,
                  x: change.position!.x,
                  y: change.position!.y,
                }
              : component
          );
        }
        break;

      case 'add':
        if (change.item && change.item.data) {
          const newComponent: DesignComponent = {
            id: change.item.id,
            type: change.item.data.type,
            x: change.item.position.x,
            y: change.item.position.y,
            label: change.item.data.label,
            description: change.item.data.description,
            properties: change.item.data.properties,
            layerId: change.item.data.layerId,
          };
          updatedComponents.push(newComponent);
        }
        break;

      case 'remove':
        updatedComponents = updatedComponents.filter(
          (component) => component.id !== change.id
        );
        break;

      case 'replace':
        if (change.item && change.item.data) {
          updatedComponents = updatedComponents.map((component) =>
            component.id === change.id
              ? {
                  id: change.item.id,
                  type: change.item.data.type,
                  x: change.item.position.x,
                  y: change.item.position.y,
                  label: change.item.data.label,
                  description: change.item.data.description,
                  properties: change.item.data.properties,
                  layerId: change.item.data.layerId,
                }
              : component
          );
        }
        break;

      case 'select':
      case 'dimensions':
        // These changes don't affect the DesignComponent data structure
        // Selection state is handled separately
        // Dimensions are managed by React Flow internally
        break;

      default:
        // Handle any other change types that might be added in the future
        console.warn('Unhandled node change type:', (change as any).type);
        break;
    }
  }

  return updatedComponents;
}

/**
 * Processes React Flow edge changes and returns updated Connection array
 */
export function fromEdgeChanges(
  changes: EdgeChange[],
  connections: Connection[]
): Connection[] {
  let updatedConnections = [...connections];

  for (const change of changes) {
    switch (change.type) {
      case 'add':
        if (change.item?.data) {
          const newConnection: Connection = {
            id: change.item.id,
            from: change.item.source,
            to: change.item.target,
            label: change.item.data.label,
            type: change.item.data.type as any, // Cast to ConnectionType
            protocol: change.item.data.protocol,
            direction: change.item.data.direction as any, // Cast to ConnectionDirection
            visualStyle: change.item.data.visualStyle as any, // Cast to VisualStyle
          };
          updatedConnections.push(newConnection);
        }
        break;

      case 'remove':
        updatedConnections = updatedConnections.filter(
          (connection) => connection.id !== change.id
        );
        break;

      case 'replace':
        if (change.item?.data) {
          updatedConnections = updatedConnections.map((connection) =>
            connection.id === change.id
              ? {
                  id: change.item.id,
                  from: change.item.source,
                  to: change.item.target,
                  label: change.item.data.label,
                  type: change.item.data.type as any, // Cast to ConnectionType
                  protocol: change.item.data.protocol,
                  direction: change.item.data.direction as any, // Cast to ConnectionDirection
                  visualStyle: change.item.data.visualStyle as any, // Cast to VisualStyle
                }
              : connection
          );
        }
        break;

      case 'select':
        // Selection state is handled separately
        break;

      default:
        // Handle any other change types that might be added in the future
        console.warn('Unhandled edge change type:', (change as any).type);
        break;
    }
  }

  return updatedConnections;
}

/**
 * Maps ArchiComm connection types to React Flow edge types
 */
function getReactFlowEdgeType(connectionType: string): string {
  switch (connectionType) {
    case 'data':
      return 'default'; // Straight line
    case 'control':
      return 'step'; // Stepped line
    case 'sync':
    case 'async':
      return 'smoothstep'; // Curved line
    default:
      return 'default';
  }
}

/**
 * Maps connection types to CustomEdge connectionStyle based on getReactFlowEdgeType mapping
 */
function getConnectionStyle(connectionType: string): 'straight' | 'curved' | 'stepped' {
  const reactFlowType = getReactFlowEdgeType(connectionType);
  switch (reactFlowType) {
    case 'default':
      return 'straight';
    case 'step':
      return 'stepped';
    case 'smoothstep':
      return 'curved';
    default:
      return 'straight';
  }
}

/**
 * Determines if end marker should be shown based on connection direction
 */
function shouldShowEndMarker(direction?: string): boolean {
  return direction === 'end' || direction === 'both' || !direction;
}

/**
 * Determines if start marker should be shown based on connection direction
 */
function shouldShowStartMarker(direction?: string): boolean {
  return direction === 'both';
}

/**
 * Creates a new React Flow node from a DesignComponent
 * Useful for adding new components to the canvas
 */
export function createReactFlowNode(component: DesignComponent): ArchiCommNode {
  return {
    id: component.id,
    type: 'custom',
    position: {
      x: component.x,
      y: component.y,
    },
    data: {
      component: component,
      type: component.type,
      label: component.label,
      description: component.description,
      properties: component.properties,
      layerId: component.layerId,
    },
    draggable: true,
    selectable: true,
    deletable: true,
  };
}

/**
 * Creates a new React Flow edge from a Connection
 * Useful for adding new connections to the canvas
 */
export function createReactFlowEdge(connection: Connection): ArchiCommEdge {
  return {
    id: connection.id,
    source: connection.from,
    target: connection.to,
    type: 'custom', // Use custom edge type for CustomEdge component
    data: {
      connection: connection,
      connectionStyle: getConnectionStyle(connection.type),
      isSelected: false,
      isStartConnection: false,
      onConnectionSelect: () => {}, // Will be overridden by parent
      label: connection.label,
      type: connection.type,
      protocol: connection.protocol,
      direction: connection.direction,
      visualStyle: connection.visualStyle,
    },
    deletable: true,
    selectable: true,
    markerEnd: shouldShowEndMarker(connection.direction) ? {
      type: 'arrowclosed',
      width: 20,
      height: 20,
    } : undefined,
    markerStart: shouldShowStartMarker(connection.direction) ? {
      type: 'arrowclosed',
      width: 20,
      height: 20,
    } : undefined,
  };
}

/**
 * Updates a React Flow node with new DesignComponent data
 * Preserves React Flow specific properties while updating domain data
 */
export function updateReactFlowNode(
  node: ArchiCommNode,
  component: DesignComponent
): ArchiCommNode {
  return {
    ...node,
    position: {
      x: component.x,
      y: component.y,
    },
    data: {
      ...node.data,
      component: component,
      type: component.type,
      label: component.label,
      description: component.description,
      properties: component.properties,
      layerId: component.layerId,
    },
  };
}

/**
 * Updates a React Flow edge with new Connection data
 * Preserves React Flow specific properties while updating domain data
 */
export function updateReactFlowEdge(
  edge: ArchiCommEdge,
  connection: Connection
): ArchiCommEdge {
  return {
    ...edge,
    source: connection.from,
    target: connection.to,
    type: 'custom', // Use custom edge type for CustomEdge component
    data: {
      ...edge.data,
      connection: connection,
      connectionStyle: getConnectionStyle(connection.type),
      label: connection.label,
      type: connection.type,
      protocol: connection.protocol,
      direction: connection.direction,
      visualStyle: connection.visualStyle,
    },
    markerEnd: shouldShowEndMarker(connection.direction) ? {
      type: 'arrowclosed',
      width: 20,
      height: 20,
    } : undefined,
    markerStart: shouldShowStartMarker(connection.direction) ? {
      type: 'arrowclosed',
      width: 20,
      height: 20,
    } : undefined,
  };
}