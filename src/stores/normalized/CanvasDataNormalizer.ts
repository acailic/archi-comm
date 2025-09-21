/**
 * Canvas Data Normalizer - Transforms array-based canvas data into normalized lookup tables
 * Reduces deep equality check costs and enables more efficient updates
 */

import type { DesignComponent, Connection, InfoCard } from '@shared/contracts';

// Normalized data structures for efficient lookups and updates
export interface NormalizedComponents {
  byId: Record<string, DesignComponent>;
  allIds: string[];
  byType: Record<string, string[]>;
  byLayer: Record<string, string[]>;
}

export interface NormalizedConnections {
  byId: Record<string, Connection>;
  allIds: string[];
  bySourceId: Record<string, string[]>;
  byTargetId: Record<string, string[]>;
  byType: Record<string, string[]>;
}

export interface NormalizedInfoCards {
  byId: Record<string, InfoCard>;
  allIds: string[];
  byPosition: Record<string, string[]>; // grid-based positioning for spatial queries
}

export interface NormalizedCanvasData {
  components: NormalizedComponents;
  connections: NormalizedConnections;
  infoCards: NormalizedInfoCards;
  lastUpdated: number;
  version: number;
}

export interface CanvasDataSnapshot {
  components: DesignComponent[];
  connections: Connection[];
  infoCards: InfoCard[];
}

export interface NormalizationOptions {
  gridSize?: number; // for spatial indexing of info cards
  preserveOrder?: boolean; // maintain original array order in allIds
  generateIds?: boolean; // auto-generate IDs if missing
}

/**
 * Normalizes component array into efficient lookup structures
 */
export function normalizeComponents(
  components: DesignComponent[],
  options: NormalizationOptions = {}
): NormalizedComponents {
  const byId: Record<string, DesignComponent> = {};
  const allIds: string[] = [];
  const byType: Record<string, string[]> = {};
  const byLayer: Record<string, string[]> = {};

  components.forEach((component, index) => {
    // Generate ID if missing and option is enabled
    let id = component.id;
    if (!id && options.generateIds) {
      id = `component-${Date.now()}-${index}`;
      component = { ...component, id };
    }

    if (!id) {
      console.warn('Component missing ID, skipping normalization:', component);
      return;
    }

    // Prevent duplicate IDs
    if (byId[id]) {
      console.warn(`Duplicate component ID detected: ${id}, using latest version`);
    }

    byId[id] = component;
    allIds.push(id);

    // Index by type
    const type = component.type || 'unknown';
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(id);

    // Index by layer
    const layerId = component.layerId || 'default';
    if (!byLayer[layerId]) {
      byLayer[layerId] = [];
    }
    byLayer[layerId].push(id);
  });

  return {
    byId,
    allIds,
    byType,
    byLayer,
  };
}

/**
 * Normalizes connection array into efficient lookup structures
 */
export function normalizeConnections(
  connections: Connection[],
  options: NormalizationOptions = {}
): NormalizedConnections {
  const byId: Record<string, Connection> = {};
  const allIds: string[] = [];
  const bySourceId: Record<string, string[]> = {};
  const byTargetId: Record<string, string[]> = {};
  const byType: Record<string, string[]> = {};

  connections.forEach((connection, index) => {
    // Generate ID if missing and option is enabled
    let id = connection.id;
    if (!id && options.generateIds) {
      id = `connection-${Date.now()}-${index}`;
      connection = { ...connection, id };
    }

    if (!id) {
      console.warn('Connection missing ID, skipping normalization:', connection);
      return;
    }

    // Prevent duplicate IDs
    if (byId[id]) {
      console.warn(`Duplicate connection ID detected: ${id}, using latest version`);
    }

    byId[id] = connection;
    allIds.push(id);

    // Index by source component
    if (!bySourceId[connection.from]) {
      bySourceId[connection.from] = [];
    }
    bySourceId[connection.from].push(id);

    // Index by target component
    if (!byTargetId[connection.to]) {
      byTargetId[connection.to] = [];
    }
    byTargetId[connection.to].push(id);

    // Index by type
    const type = connection.type || 'data';
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(id);
  });

  return {
    byId,
    allIds,
    bySourceId,
    byTargetId,
    byType,
  };
}

/**
 * Creates a spatial grid key for position-based indexing
 */
function createGridKey(x: number, y: number, gridSize: number): string {
  const gridX = Math.floor(x / gridSize);
  const gridY = Math.floor(y / gridSize);
  return `${gridX},${gridY}`;
}

/**
 * Normalizes info cards array into efficient lookup structures
 */
export function normalizeInfoCards(
  infoCards: InfoCard[],
  options: NormalizationOptions = {}
): NormalizedInfoCards {
  const gridSize = options.gridSize || 100; // Default 100px grid
  const byId: Record<string, InfoCard> = {};
  const allIds: string[] = [];
  const byPosition: Record<string, string[]> = {};

  infoCards.forEach((infoCard, index) => {
    // Generate ID if missing and option is enabled
    let id = infoCard.id;
    if (!id && options.generateIds) {
      id = `infocard-${Date.now()}-${index}`;
      infoCard = { ...infoCard, id };
    }

    if (!id) {
      console.warn('InfoCard missing ID, skipping normalization:', infoCard);
      return;
    }

    // Prevent duplicate IDs
    if (byId[id]) {
      console.warn(`Duplicate info card ID detected: ${id}, using latest version`);
    }

    byId[id] = infoCard;
    allIds.push(id);

    // Index by spatial position for efficient spatial queries
    const gridKey = createGridKey(infoCard.x, infoCard.y, gridSize);
    if (!byPosition[gridKey]) {
      byPosition[gridKey] = [];
    }
    byPosition[gridKey].push(id);
  });

  return {
    byId,
    allIds,
    byPosition,
  };
}

/**
 * Normalizes complete canvas data into efficient lookup structures
 */
export function normalizeCanvasData(
  data: CanvasDataSnapshot,
  options: NormalizationOptions = {}
): NormalizedCanvasData {
  return {
    components: normalizeComponents(data.components, options),
    connections: normalizeConnections(data.connections, options),
    infoCards: normalizeInfoCards(data.infoCards, options),
    lastUpdated: Date.now(),
    version: 1,
  };
}

/**
 * Denormalizes normalized data back to array format
 */
export function denormalizeCanvasData(normalizedData: NormalizedCanvasData): CanvasDataSnapshot {
  const components = normalizedData.components.allIds.map(id => normalizedData.components.byId[id]);
  const connections = normalizedData.connections.allIds.map(id => normalizedData.connections.byId[id]);
  const infoCards = normalizedData.infoCards.allIds.map(id => normalizedData.infoCards.byId[id]);

  return {
    components,
    connections,
    infoCards,
  };
}

/**
 * Efficient update operations for normalized data
 */
export class NormalizedDataUpdater {
  /**
   * Updates a single component in normalized structure
   */
  static updateComponent(
    normalized: NormalizedComponents,
    componentId: string,
    updates: Partial<DesignComponent>
  ): NormalizedComponents {
    const existingComponent = normalized.byId[componentId];
    if (!existingComponent) {
      console.warn(`Component ${componentId} not found for update`);
      return normalized;
    }

    const updatedComponent = { ...existingComponent, ...updates };
    const newById = { ...normalized.byId, [componentId]: updatedComponent };

    // Check if type or layer changed and update indexes
    let newByType = normalized.byType;
    let newByLayer = normalized.byLayer;

    if (updates.type && updates.type !== existingComponent.type) {
      newByType = { ...normalized.byType };

      // Remove from old type
      const oldType = existingComponent.type || 'unknown';
      if (newByType[oldType]) {
        newByType[oldType] = newByType[oldType].filter(id => id !== componentId);
        if (newByType[oldType].length === 0) {
          delete newByType[oldType];
        }
      }

      // Add to new type
      const newType = updates.type || 'unknown';
      if (!newByType[newType]) {
        newByType[newType] = [];
      }
      newByType[newType].push(componentId);
    }

    if (updates.layerId && updates.layerId !== existingComponent.layerId) {
      newByLayer = { ...normalized.byLayer };

      // Remove from old layer
      const oldLayerId = existingComponent.layerId || 'default';
      if (newByLayer[oldLayerId]) {
        newByLayer[oldLayerId] = newByLayer[oldLayerId].filter(id => id !== componentId);
        if (newByLayer[oldLayerId].length === 0) {
          delete newByLayer[oldLayerId];
        }
      }

      // Add to new layer
      const newLayerId = updates.layerId || 'default';
      if (!newByLayer[newLayerId]) {
        newByLayer[newLayerId] = [];
      }
      newByLayer[newLayerId].push(componentId);
    }

    return {
      byId: newById,
      allIds: normalized.allIds, // Order preserved
      byType: newByType,
      byLayer: newByLayer,
    };
  }

  /**
   * Adds a new component to normalized structure
   */
  static addComponent(
    normalized: NormalizedComponents,
    component: DesignComponent
  ): NormalizedComponents {
    if (!component.id) {
      throw new Error('Component must have an ID to be added to normalized structure');
    }

    if (normalized.byId[component.id]) {
      console.warn(`Component ${component.id} already exists, updating instead`);
      return this.updateComponent(normalized, component.id, component);
    }

    const newById = { ...normalized.byId, [component.id]: component };
    const newAllIds = [...normalized.allIds, component.id];

    // Update type index
    const type = component.type || 'unknown';
    const newByType = { ...normalized.byType };
    if (!newByType[type]) {
      newByType[type] = [];
    }
    newByType[type] = [...newByType[type], component.id];

    // Update layer index
    const layerId = component.layerId || 'default';
    const newByLayer = { ...normalized.byLayer };
    if (!newByLayer[layerId]) {
      newByLayer[layerId] = [];
    }
    newByLayer[layerId] = [...newByLayer[layerId], component.id];

    return {
      byId: newById,
      allIds: newAllIds,
      byType: newByType,
      byLayer: newByLayer,
    };
  }

  /**
   * Removes a component from normalized structure
   */
  static removeComponent(
    normalized: NormalizedComponents,
    componentId: string
  ): NormalizedComponents {
    const component = normalized.byId[componentId];
    if (!component) {
      console.warn(`Component ${componentId} not found for removal`);
      return normalized;
    }

    const { [componentId]: removed, ...newById } = normalized.byId;
    const newAllIds = normalized.allIds.filter(id => id !== componentId);

    // Update type index
    const type = component.type || 'unknown';
    const newByType = { ...normalized.byType };
    if (newByType[type]) {
      newByType[type] = newByType[type].filter(id => id !== componentId);
      if (newByType[type].length === 0) {
        delete newByType[type];
      }
    }

    // Update layer index
    const layerId = component.layerId || 'default';
    const newByLayer = { ...normalized.byLayer };
    if (newByLayer[layerId]) {
      newByLayer[layerId] = newByLayer[layerId].filter(id => id !== componentId);
      if (newByLayer[layerId].length === 0) {
        delete newByLayer[layerId];
      }
    }

    return {
      byId: newById,
      allIds: newAllIds,
      byType: newByType,
      byLayer: newByLayer,
    };
  }

  /**
   * Batch updates multiple components efficiently
   */
  static batchUpdateComponents(
    normalized: NormalizedComponents,
    updates: Record<string, Partial<DesignComponent>>
  ): NormalizedComponents {
    let result = normalized;

    Object.entries(updates).forEach(([componentId, update]) => {
      result = this.updateComponent(result, componentId, update);
    });

    return result;
  }
}

/**
 * Efficient selectors for normalized data
 */
export class NormalizedDataSelectors {
  /**
   * Gets components by type efficiently
   */
  static getComponentsByType(
    normalized: NormalizedComponents,
    type: string
  ): DesignComponent[] {
    const componentIds = normalized.byType[type] || [];
    return componentIds.map(id => normalized.byId[id]).filter(Boolean);
  }

  /**
   * Gets components by layer efficiently
   */
  static getComponentsByLayer(
    normalized: NormalizedComponents,
    layerId: string
  ): DesignComponent[] {
    const componentIds = normalized.byLayer[layerId] || [];
    return componentIds.map(id => normalized.byId[id]).filter(Boolean);
  }

  /**
   * Gets connections for a specific component efficiently
   */
  static getConnectionsForComponent(
    normalized: NormalizedConnections,
    componentId: string
  ): { incoming: Connection[]; outgoing: Connection[] } {
    const incomingIds = normalized.byTargetId[componentId] || [];
    const outgoingIds = normalized.bySourceId[componentId] || [];

    return {
      incoming: incomingIds.map(id => normalized.byId[id]).filter(Boolean),
      outgoing: outgoingIds.map(id => normalized.byId[id]).filter(Boolean),
    };
  }

  /**
   * Gets info cards in a spatial region efficiently
   */
  static getInfoCardsInRegion(
    normalized: NormalizedInfoCards,
    x: number,
    y: number,
    width: number,
    height: number,
    gridSize: number = 100
  ): InfoCard[] {
    const startGridX = Math.floor(x / gridSize);
    const endGridX = Math.floor((x + width) / gridSize);
    const startGridY = Math.floor(y / gridSize);
    const endGridY = Math.floor((y + height) / gridSize);

    const candidateIds = new Set<string>();

    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        const gridKey = `${gridX},${gridY}`;
        const idsInGrid = normalized.byPosition[gridKey] || [];
        idsInGrid.forEach(id => candidateIds.add(id));
      }
    }

    // Filter candidates that actually fall within the region
    return Array.from(candidateIds)
      .map(id => normalized.byId[id])
      .filter(card => {
        if (!card) return false;
        return card.x >= x && card.x <= x + width &&
               card.y >= y && card.y <= y + height;
      });
  }

  /**
   * Validates the integrity of normalized data
   */
  static validateIntegrity(normalized: NormalizedCanvasData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate components
    const componentIds = new Set(normalized.components.allIds);
    Object.keys(normalized.components.byId).forEach(id => {
      if (!componentIds.has(id)) {
        errors.push(`Component ${id} exists in byId but not in allIds`);
      }
    });

    // Validate connections reference existing components
    normalized.connections.allIds.forEach(connectionId => {
      const connection = normalized.connections.byId[connectionId];
      if (connection) {
        if (!normalized.components.byId[connection.from]) {
          errors.push(`Connection ${connectionId} references non-existent source component ${connection.from}`);
        }
        if (!normalized.components.byId[connection.to]) {
          errors.push(`Connection ${connectionId} references non-existent target component ${connection.to}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export { NormalizedDataUpdater as DataUpdater, NormalizedDataSelectors as DataSelectors };