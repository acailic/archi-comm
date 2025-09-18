import React from 'react';
import { CanvasArea } from '@ui/components/CanvasArea';
import { mockCanvasStates } from '../testData';

export const canvasAreaScenarios = {
  'Canvas Area': {
    id: 'canvas-area',
    name: 'Canvas Area',
    scenarios: [
      {
        id: 'empty-canvas',
        name: 'Empty Canvas',
        description: 'Clean canvas with no components or connections',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.empty.components,
            connections: mockCanvasStates.empty.connections,
            selectedComponent: null,
            isReadOnly: false,
            onComponentAdd: (component: any) => console.log('Added component:', component),
            onComponentUpdate: (id: string, updates: any) =>
              console.log('Updated component:', id, updates),
            onComponentDelete: (id: string) => console.log('Deleted component:', id),
            onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
            onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
            onComponentSelect: (id: string) => console.log('Selected component:', id),
          }),
        documentation: {
          summary: 'Starting point for new designs or templates.',
          usageExamples: [
            {
              title: 'Blank Workspace',
              description: 'Initialize with empty arrays to avoid null checks.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: '<CanvasArea components={[]} connections={[]} isReadOnly={false} />',
              },
            },
          ],
          performance: { tips: ['Defer expensive layout ops until first component is added'] },
        },
      },
      {
        id: 'basic-layout',
        name: 'Basic Layout',
        description: 'Simple setup with 2-3 components and connections',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.basic.components,
            connections: mockCanvasStates.basic.connections,
            selectedComponent: 'comp-1',
            isReadOnly: false,
            onComponentAdd: (component: any) => console.log('Added component:', component),
            onComponentUpdate: (id: string, updates: any) =>
              console.log('Updated component:', id, updates),
            onComponentDelete: (id: string) => console.log('Deleted component:', id),
            onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
            onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
            onComponentSelect: (id: string) => console.log('Selected component:', id),
          }),
        documentation: {
          summary: 'Demonstrates minimal viable architecture and selection.',
          bestPractices: ['Keep naming consistent', 'Limit overlapping edges'],
        },
      },
      {
        id: 'complex-layout',
        name: 'Complex Layout',
        description: 'Advanced architecture with 8+ components and multiple connections',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.complex.components,
            connections: mockCanvasStates.complex.connections,
            selectedComponent: 'api-1',
            isReadOnly: false,
            onComponentAdd: (component: any) => console.log('Added component:', component),
            onComponentUpdate: (id: string, updates: any) =>
              console.log('Updated component:', id, updates),
            onComponentDelete: (id: string) => console.log('Deleted component:', id),
            onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
            onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
            onComponentSelect: (id: string) => console.log('Selected component:', id),
          }),
        documentation: {
          summary: 'Stress test interactions and performance at scale.',
          performance: {
            considerations: ['Batch updates', 'Virtualize rendering where possible'],
            tips: ['Use memoization for node rendering'],
          },
        },
      },
      {
        id: 'url-shortener-template',
        name: 'URL Shortener Template',
        description: 'Pre-configured template for URL shortener system design',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.urlShortener.components,
            connections: mockCanvasStates.urlShortener.connections,
            selectedComponent: null,
            isReadOnly: false,
            templateName: 'URL Shortener',
            onComponentAdd: (component: any) => console.log('Added component:', component),
            onComponentUpdate: (id: string, updates: any) =>
              console.log('Updated component:', id, updates),
            onComponentDelete: (id: string) => console.log('Deleted component:', id),
            onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
            onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
            onComponentSelect: (id: string) => console.log('Selected component:', id),
          }),
      },
      {
        id: 'chat-system-template',
        name: 'Chat System Template',
        description: 'Pre-configured template for real-time chat system',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.chatSystem.components,
            connections: mockCanvasStates.chatSystem.connections,
            selectedComponent: 'ws-1',
            isReadOnly: false,
            templateName: 'Chat System',
            onComponentAdd: (component: any) => console.log('Added component:', component),
            onComponentUpdate: (id: string, updates: any) =>
              console.log('Updated component:', id, updates),
            onComponentDelete: (id: string) => console.log('Deleted component:', id),
            onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
            onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
            onComponentSelect: (id: string) => console.log('Selected component:', id),
          }),
      },
      {
        id: 'read-only-mode',
        name: 'Read-Only Mode',
        description: 'Canvas in read-only mode for viewing existing designs',
        component: () =>
          React.createElement(CanvasArea, {
            components: mockCanvasStates.basic.components,
            connections: mockCanvasStates.basic.connections,
            selectedComponent: null,
            isReadOnly: true,
            showGrid: false,
            onComponentSelect: (id: string) => console.log('Viewed component:', id),
          }),
      },
    ],
  },
};