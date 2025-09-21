import React from 'react';
import { CanvasArea } from '@ui/components/canvas/CanvasArea';
import { mockCanvasStates } from '../testData';

export const architectureDiagramScenarios = {
  // Component Palette
  'Component Palette': {
    id: 'component-palette',
    name: 'Component Palette',
    scenarios: [
      {
        id: 'full-palette',
        name: 'Full Palette',
        description: 'Complete component palette with all available components',
        component: () =>
          React.createElement('div', {}, 'Component Palette - Full Palette scenario'),
      },
      {
        id: 'filtered-by-category',
        name: 'Filtered by Category',
        description: 'Component palette filtered to show only compute components',
        component: () =>
          React.createElement('div', {}, 'Component Palette - Filtered by Category scenario'),
      },
      {
        id: 'search-results',
        name: 'Search Results',
        description: 'Component palette showing search results for "server"',
        component: () =>
          React.createElement('div', {}, 'Component Palette - Search Results scenario'),
      },
      {
        id: 'empty-search',
        name: 'Empty Search',
        description: 'No components found for search term',
        component: () =>
          React.createElement('div', {}, 'Component Palette - Empty Search scenario'),
      },
    ],
  },

  // Properties Panel
  'Properties Panel': {
    id: 'properties-panel',
    name: 'Properties Panel',
    scenarios: [
      {
        id: 'no-selection',
        name: 'No Selection',
        description: 'Properties panel when no component is selected',
        component: () => React.createElement('div', {}, 'Properties Panel - No Selection scenario'),
      },
      {
        id: 'server-properties',
        name: 'Server Properties',
        description: 'Properties panel for selected server component',
        component: () =>
          React.createElement('div', {}, 'Properties Panel - Server Properties scenario'),
      },
      {
        id: 'database-properties',
        name: 'Database Properties',
        description: 'Properties panel for selected database component',
        component: () =>
          React.createElement('div', {}, 'Properties Panel - Database Properties scenario'),
      },
      {
        id: 'load-balancer-properties',
        name: 'Load Balancer Properties',
        description: 'Properties panel for selected load balancer component',
        component: () =>
          React.createElement('div', {}, 'Properties Panel - Load Balancer Properties scenario'),
      },
    ],
  },

  // Design Pattern Selector
  'Design Pattern Selector': {
    id: 'design-pattern-selector',
    name: 'Design Pattern Selector',
    scenarios: [
      {
        id: 'pattern-selection',
        name: 'Pattern Selection',
        description: 'Available design patterns for quick template selection',
        component: () =>
          React.createElement('div', {}, 'Design Pattern Selector - Pattern Selection scenario'),
      },
      {
        id: 'pattern-preview',
        name: 'Pattern Preview',
        description: 'Previewing microservices architecture pattern',
        component: () =>
          React.createElement('div', {}, 'Design Pattern Selector - Pattern Preview scenario'),
      },
    ],
  },

  // Architecture Diagrams (Canvas presets)
  'Architecture Diagrams': {
    id: 'architecture-diagrams',
    name: 'Architecture Diagrams',
    scenarios: [
      {
        id: 'microservices-complex',
        name: 'Microservices (Complex)',
        description: 'Rich microservices topology with cache, DB, queue and search',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.complex.components,
            connections: mockCanvasStates.complex.connections,
            selectedComponent: null,
            connectionStart: null,
            onComponentDrop: () => {},
            onComponentMove: () => {},
            onComponentSelect: () => {},
            onConnectionLabelChange: () => {},
            onConnectionDelete: () => {},
            onConnectionTypeChange: () => {},
            onStartConnection: () => {},
            onCompleteConnection: () => {},
            gridStyle: 'dots',
            snapToGrid: true,
            gridSpacing: 20,
            showConnectors: true,
          }),
        documentation: {
          summary: 'Showcase a realistic microservices system to demo the canvas.',
          bestPractices: [
            'Group related services visually',
            'Label async vs sync connections',
          ],
        },
      },
      {
        id: 'url-shortener',
        name: 'URL Shortener',
        description: 'Classic system design: LB, app servers, cache, and DB',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.urlShortener.components,
            connections: mockCanvasStates.urlShortener.connections,
            selectedComponent: null,
            connectionStart: null,
            onComponentDrop: () => {},
            onComponentMove: () => {},
            onComponentSelect: () => {},
            onConnectionLabelChange: () => {},
            onConnectionDelete: () => {},
            onConnectionTypeChange: () => {},
            onStartConnection: () => {},
            onCompleteConnection: () => {},
            gridStyle: 'lines',
            snapToGrid: true,
            gridSpacing: 24,
            showConnectors: true,
          }),
      },
      {
        id: 'chat-system',
        name: 'Real-time Chat',
        description: 'WebSocket server, services, MQ, and DB for chat',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.chatSystem.components,
            connections: mockCanvasStates.chatSystem.connections,
            selectedComponent: null,
            connectionStart: null,
            onComponentDrop: () => {},
            onComponentMove: () => {},
            onComponentSelect: () => {},
            onConnectionLabelChange: () => {},
            onConnectionDelete: () => {},
            onConnectionTypeChange: () => {},
            onStartConnection: () => {},
            onCompleteConnection: () => {},
            gridStyle: 'dots',
            snapToGrid: true,
            gridSpacing: 18,
            showConnectors: true,
          }),
      },
      {
        id: 'layered-architecture',
        name: 'Layered Architecture',
        description: 'Three-tier: presentation, business logic, data layer',
        component: () =>
          React.createElement(CanvasArea, {
            components: (mockCanvasStates.layered.components as any[]).map((c, i) => ({
              id: `layer-${i + 1}`,
              type: c.type as any,
              x: (c as any).position?.x ?? 200,
              y: (c as any).position?.y ?? 100 + i * 100,
              label: (c as any).label,
              properties: {},
            })),
            connections: [],
            selectedComponent: null,
            connectionStart: null,
            onComponentDrop: () => {},
            onComponentMove: () => {},
            onComponentSelect: () => {},
            onConnectionLabelChange: () => {},
            onConnectionDelete: () => {},
            onConnectionTypeChange: () => {},
            onStartConnection: () => {},
            onCompleteConnection: () => {},
            gridStyle: 'lines',
            snapToGrid: false,
            gridSpacing: 20,
            showConnectors: false,
          }),
      },
      {
        id: 'event-driven',
        name: 'Event-Driven',
        description: 'Producer → Event Bus → Consumers demo',
        component: () =>
          React.createElement(CanvasArea, {
            components: (mockCanvasStates.eventDriven.components as any[]).map((c, i) => ({
              id: `eda-${i + 1}`,
              type: c.type as any,
              x: (c as any).position?.x ?? 100 + i * 150,
              y: (c as any).position?.y ?? 150,
              label: (c as any).label,
              properties: {},
            })),
            connections: [
              { id: 'eda-1', source: 'eda-1', target: 'eda-2', type: 'async', label: 'Publish' } as any,
              { id: 'eda-2', source: 'eda-2', target: 'eda-3', type: 'async', label: 'Consume' } as any,
              { id: 'eda-3', source: 'eda-2', target: 'eda-4', type: 'async', label: 'Consume' } as any,
            ],
            selectedComponent: null,
            connectionStart: null,
            onComponentDrop: () => {},
            onComponentMove: () => {},
            onComponentSelect: () => {},
            onConnectionLabelChange: () => {},
            onConnectionDelete: () => {},
            onConnectionTypeChange: () => {},
            onStartConnection: () => {},
            onCompleteConnection: () => {},
            gridStyle: 'dots',
            snapToGrid: true,
            gridSpacing: 16,
            showConnectors: true,
          }),
      },
    ],
  },
};