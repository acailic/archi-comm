// src/lib/import-export/sampleDesigns.ts
// Sample design data for testing import/export functionality
// Provides various design scenarios with different complexities and formats
// RELEVANT FILES: DesignSerializer.ts, ImportExportModal.tsx, DesignCanvas.tsx

import type { DesignData, DesignComponent, Connection, InfoCard } from '@/shared/contracts';
import type { DesignExportData, ChallengeContext } from './types';
import { createExportMetadata, createDesignAnalytics, EXPORT_FORMAT_VERSION } from './types';
import { queueCheatsheetTemplate } from './templates/queue-cheatsheet';

// Sample Components
const sampleComponents: DesignComponent[] = [
  {
    id: 'api-gateway-1',
    type: 'api-gateway',
    x: 100,
    y: 150,
    label: 'API Gateway',
    description: 'Main entry point for all API requests',
    properties: {
      showLabel: true,
      rateLimit: '1000/min',
      authentication: true,
    },
  },
  {
    id: 'user-service-1',
    type: 'server',
    x: 350,
    y: 100,
    label: 'User Service',
    description: 'Handles user authentication and profiles',
    properties: {
      showLabel: true,
      replicas: 3,
      port: 3001,
      healthCheck: '/health',
    },
  },
  {
    id: 'order-service-1',
    type: 'server',
    x: 350,
    y: 200,
    label: 'Order Service',
    description: 'Manages order processing and fulfillment',
    properties: {
      showLabel: true,
      replicas: 2,
      port: 3002,
      healthCheck: '/health',
    },
  },
  {
    id: 'database-1',
    type: 'database',
    x: 600,
    y: 100,
    label: 'User Database',
    description: 'PostgreSQL database for user data',
    properties: {
      showLabel: true,
      type: 'relational',
      replicas: 2,
      backup: true,
    },
  },
  {
    id: 'database-2',
    type: 'database',
    x: 600,
    y: 200,
    label: 'Orders Database',
    description: 'PostgreSQL database for order data',
    properties: {
      showLabel: true,
      type: 'relational',
      replicas: 1,
      backup: true,
    },
  },
  {
    id: 'cache-1',
    type: 'cache',
    x: 350,
    y: 300,
    label: 'Redis Cache',
    description: 'High-performance caching layer',
    properties: {
      showLabel: true,
      type: 'redis',
      ttl: 3600,
      size: '2GB',
    },
  },
];

// Sample Connections
const sampleConnections: Connection[] = [
  {
    id: 'conn-1',
    from: 'api-gateway-1',
    to: 'user-service-1',
    label: 'User Requests',
    type: 'sync',
    protocol: 'HTTP',
  },
  {
    id: 'conn-2',
    from: 'api-gateway-1',
    to: 'order-service-1',
    label: 'Order Requests',
    type: 'sync',
    protocol: 'HTTP',
  },
  {
    id: 'conn-3',
    from: 'user-service-1',
    to: 'database-1',
    label: 'User Data',
    type: 'sync',
    protocol: 'SQL',
  },
  {
    id: 'conn-4',
    from: 'order-service-1',
    to: 'database-2',
    label: 'Order Data',
    type: 'sync',
    protocol: 'SQL',
  },
  {
    id: 'conn-5',
    from: 'user-service-1',
    to: 'cache-1',
    label: 'Cache User Data',
    type: 'async',
    protocol: 'Redis',
  },
  {
    id: 'conn-6',
    from: 'order-service-1',
    to: 'cache-1',
    label: 'Cache Order Data',
    type: 'async',
    protocol: 'Redis',
  },
];

// Sample Info Cards
const sampleInfoCards: InfoCard[] = [
  {
    id: 'info-1',
    x: 100,
    y: 50,
    content: 'This is a microservices architecture for an e-commerce platform',
    color: 'yellow',
  },
  {
    id: 'info-2',
    x: 450,
    y: 350,
    content: 'Redis cache improves response times by 80%',
    color: 'blue',
  },
  {
    id: 'info-3',
    x: 650,
    y: 300,
    content: 'Database replication ensures high availability',
    color: 'green',
  },
];

// Basic Design Data
export const basicDesign: DesignData = {
  schemaVersion: 1,
  components: sampleComponents.slice(0, 3), // First 3 components
  connections: sampleConnections.slice(0, 2), // First 2 connections
  infoCards: [sampleInfoCards[0]], // One info card
  layers: [],
  metadata: {
    created: new Date('2024-01-15T10:00:00Z').toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0',
    author: 'Test User',
    tags: ['microservices', 'basic'],
  },
};

// Complex Design Data
export const complexDesign: DesignData = {
  schemaVersion: 1,
  components: sampleComponents, // All components
  connections: sampleConnections, // All connections
  infoCards: sampleInfoCards, // All info cards
  layers: [
    {
      id: 'layer-1',
      name: 'API Layer',
      visible: true,
      order: 1,
    },
    {
      id: 'layer-2',
      name: 'Service Layer',
      visible: true,
      order: 2,
    },
    {
      id: 'layer-3',
      name: 'Data Layer',
      visible: true,
      order: 3,
    },
  ],
  metadata: {
    created: new Date('2024-01-10T09:00:00Z').toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.2',
    author: 'Senior Architect',
    tags: ['microservices', 'e-commerce', 'scalable', 'production'],
  },
};

// Queue Cheatsheet Design Data
export const queueCheatsheetDesign: DesignData = queueCheatsheetTemplate;

// Sample Challenge Context
const sampleChallenge: ChallengeContext = {
  id: 'ecommerce-microservices',
  title: 'E-commerce Microservices Architecture',
  difficulty: 'intermediate',
  category: 'system-design',
  estimatedTime: 45,
  tags: ['microservices', 'e-commerce', 'scalability'],
  version: '1.0',
};

// Sample Export Data - Current Format
export const sampleExportDataV1: DesignExportData = {
  formatVersion: EXPORT_FORMAT_VERSION,
  metadata: createExportMetadata(complexDesign, {
    author: 'Test User',
    title: sampleChallenge.title,
    description: 'Sample e-commerce architecture for testing',
    tags: ['test', 'sample', 'microservices'],
  }),
  challenge: sampleChallenge,
  design: complexDesign,
  canvas: {
    viewport: { x: 0, y: 0, zoom: 1.2 },
    gridConfig: {
      visible: true,
      spacing: 20,
      snapToGrid: true,
      style: 'dots',
    },
    theme: 'light',
    virtualizationEnabled: false,
  },
  analytics: createDesignAnalytics(
    complexDesign.components,
    complexDesign.connections,
    complexDesign.infoCards,
    new Date('2024-01-15T10:00:00Z'),
    new Date('2024-01-15T10:45:00Z')
  ),
};

// Legacy Format for Migration Testing (v0.9)
export const legacyExportDataV09 = {
  formatVersion: '0.9',
  metadata: {
    created: '2024-01-10T09:00:00Z',
    lastModified: new Date().toISOString(),
    version: '1.0',
    author: 'Legacy User',
  },
  design: {
    components: basicDesign.components,
    connections: basicDesign.connections,
    infoCards: basicDesign.infoCards,
    metadata: basicDesign.metadata,
  },
  // Missing analytics and canvas (will be added during migration)
};

// Invalid Export Data for Error Testing
export const invalidExportData = {
  // Missing formatVersion
  metadata: {
    created: 'invalid-date',
    lastModified: new Date().toISOString(),
  },
  design: {
    components: 'not-an-array', // Should be array
    connections: [], // Valid
    // Missing metadata
  },
};

// Export data with conflicts (duplicate IDs)
export const conflictingExportData: DesignExportData = {
  formatVersion: EXPORT_FORMAT_VERSION,
  metadata: createExportMetadata(basicDesign),
  design: {
    ...basicDesign,
    components: [
      ...basicDesign.components,
      // Duplicate component with same ID
      {
        id: 'api-gateway-1', // Duplicate ID
        type: 'load-balancer',
        x: 200,
        y: 300,
        label: 'Load Balancer',
        properties: { showLabel: true },
      },
    ],
    connections: [
      ...basicDesign.connections,
      // Duplicate connection with same ID
      {
        id: 'conn-1', // Duplicate ID
        from: 'api-gateway-1',
        to: 'user-service-1',
        label: 'Duplicate Connection',
        type: 'async',
      },
    ],
  },
  canvas: {
    viewport: { x: 0, y: 0, zoom: 1 },
    gridConfig: {
      visible: true,
      spacing: 20,
      snapToGrid: false,
      style: 'dots',
    },
    theme: 'dark',
    virtualizationEnabled: false,
  },
  analytics: createDesignAnalytics(basicDesign.components, basicDesign.connections, []),
};

// Test scenarios for different use cases
export const testScenarios = {
  // Empty design
  empty: {
    name: 'Empty Design',
    data: {
      formatVersion: EXPORT_FORMAT_VERSION,
      metadata: createExportMetadata({
        components: [],
        connections: [],
        infoCards: [],
        layers: [],
        metadata: { created: new Date().toISOString(), lastModified: new Date().toISOString(), version: '1.0' },
      }),
      design: {
        components: [],
        connections: [],
        infoCards: [],
        layers: [],
        metadata: { created: new Date().toISOString(), lastModified: new Date().toISOString(), version: '1.0' },
      },
      canvas: {
        viewport: { x: 0, y: 0, zoom: 1 },
        gridConfig: { visible: true, spacing: 20, snapToGrid: false, style: 'dots' as const },
        theme: 'light' as const,
        virtualizationEnabled: false,
      },
      analytics: createDesignAnalytics([], [], []),
    },
  },

  // Single component
  single: {
    name: 'Single Component',
    data: {
      formatVersion: EXPORT_FORMAT_VERSION,
      metadata: createExportMetadata(basicDesign),
      design: {
        components: [sampleComponents[0]],
        connections: [],
        infoCards: [],
        layers: [],
        metadata: basicDesign.metadata,
      },
      canvas: sampleExportDataV1.canvas,
      analytics: createDesignAnalytics([sampleComponents[0]], [], []),
    },
  },

  // Large design (for performance testing)
  large: {
    name: 'Large Design (50 components)',
    data: (() => {
      const largeComponents: DesignComponent[] = [];
      const largeConnections: Connection[] = [];

      // Generate 50 components in a grid
      for (let i = 0; i < 50; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;

        largeComponents.push({
          id: `component-${i}`,
          type: i % 2 === 0 ? 'server' : 'database',
          x: col * 150 + 100,
          y: row * 150 + 100,
          label: `Component ${i}`,
          properties: { showLabel: true },
        });

        // Connect to previous component
        if (i > 0) {
          largeConnections.push({
            id: `connection-${i}`,
            from: `component-${i - 1}`,
            to: `component-${i}`,
            label: `Connection ${i}`,
            type: 'data',
          });
        }
      }

      const largeDesign: DesignData = {
        schemaVersion: 1,
        components: largeComponents,
        connections: largeConnections,
        infoCards: [],
        layers: [],
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: '1.0',
          tags: ['large', 'performance-test'],
        },
      };

      return {
        formatVersion: EXPORT_FORMAT_VERSION,
        metadata: createExportMetadata(largeDesign),
        design: largeDesign,
        canvas: sampleExportDataV1.canvas,
        analytics: createDesignAnalytics(largeComponents, largeConnections, []),
      };
    })(),
  },
};

// Utility functions for testing
export function generateRandomDesign(componentCount: number = 10): DesignData {
  const components: DesignComponent[] = [];
  const connections: Connection[] = [];
  const componentTypes = ['server', 'database', 'cache', 'api-gateway', 'load-balancer'];

  // Generate components
  for (let i = 0; i < componentCount; i++) {
    components.push({
      id: `random-component-${i}`,
      type: componentTypes[i % componentTypes.length],
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      label: `Component ${i + 1}`,
      properties: { showLabel: true },
    });
  }

  // Generate connections (connect each component to 1-3 others)
  for (let i = 0; i < components.length; i++) {
    const connectionsPerComponent = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < connectionsPerComponent; j++) {
      const targetIndex = (i + j + 1) % components.length;
      if (targetIndex !== i) {
        connections.push({
          id: `random-connection-${i}-${j}`,
          from: components[i].id,
          to: components[targetIndex].id,
          label: `Connection ${connections.length + 1}`,
          type: Math.random() > 0.5 ? 'sync' : 'async',
        });
      }
    }
  }

  return {
    schemaVersion: 1,
    components,
    connections,
    infoCards: [],
    layers: [],
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0',
      tags: ['random', 'generated'],
    },
  };
}

export function createTestExportData(design: DesignData): DesignExportData {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    metadata: createExportMetadata(design),
    design,
    canvas: {
      viewport: { x: 0, y: 0, zoom: 1 },
      gridConfig: {
        visible: true,
        spacing: 20,
        snapToGrid: false,
        style: 'dots',
      },
      theme: 'light',
      virtualizationEnabled: false,
    },
    analytics: createDesignAnalytics(design.components, design.connections, design.infoCards || []),
  };
}