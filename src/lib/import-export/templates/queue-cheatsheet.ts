/**
 * src/lib/import-export/templates/queue-cheatsheet.ts
 * Queue system cheatsheet template that replicates the LinkedIn image layout
 * Provides comprehensive queue architecture with producers, consumers, brokers, and best practices
 * RELEVANT FILES: sampleDesigns.ts, DesignData.ts, ComponentType.ts
 */

import type { DesignData } from '@/shared/contracts';

export const queueCheatsheetTemplate: DesignData = {
  schemaVersion: 1,
  components: [
    // Producer components (left side)
    {
      id: 'producer-1',
      type: 'producer',
      x: 100,
      y: 150,
      label: 'API Service',
      description: 'REST API that sends user events',
      properties: { showLabel: true }
    },
    {
      id: 'producer-2',
      type: 'producer',
      x: 100,
      y: 250,
      label: 'Payment Service',
      description: 'Handles payment processing events',
      properties: { showLabel: true }
    },
    {
      id: 'producer-3',
      type: 'producer',
      x: 100,
      y: 350,
      label: 'Notification Service',
      description: 'Sends notification events',
      properties: { showLabel: true }
    },

    // Broker component (center)
    {
      id: 'broker-1',
      type: 'broker',
      x: 400,
      y: 250,
      label: 'Message Broker',
      description: 'Kafka/RabbitMQ middleware',
      properties: { showLabel: true }
    },

    // Main message queue
    {
      id: 'queue-main',
      type: 'message-queue',
      x: 600,
      y: 200,
      label: 'Main Queue',
      description: 'Primary message queue',
      properties: { showLabel: true }
    },

    // Dead letter queue
    {
      id: 'queue-dlq',
      type: 'dead-letter-queue',
      x: 600,
      y: 300,
      label: 'Dead Letter Queue',
      description: 'Failed message storage',
      properties: { showLabel: true }
    },

    // Consumer components (right side)
    {
      id: 'consumer-1',
      type: 'consumer',
      x: 800,
      y: 150,
      label: 'Analytics Consumer',
      description: 'Processes analytics events',
      properties: { showLabel: true }
    },
    {
      id: 'consumer-2',
      type: 'consumer',
      x: 800,
      y: 250,
      label: 'Email Consumer',
      description: 'Processes email notifications',
      properties: { showLabel: true }
    }
  ],
  connections: [
    // Producers to broker (sync connections)
    {
      id: 'conn-1',
      from: 'producer-1',
      to: 'broker-1',
      label: 'publish',
      type: 'sync',
      visualStyle: 'default'
    },
    {
      id: 'conn-2',
      from: 'producer-2',
      to: 'broker-1',
      label: 'publish',
      type: 'sync',
      visualStyle: 'default'
    },
    {
      id: 'conn-3',
      from: 'producer-3',
      to: 'broker-1',
      label: 'publish',
      type: 'sync',
      visualStyle: 'default'
    },

    // Broker to main queue (async)
    {
      id: 'conn-4',
      from: 'broker-1',
      to: 'queue-main',
      label: 'route',
      type: 'async',
      visualStyle: 'default'
    },

    // Queue to consumers (with ACK)
    {
      id: 'conn-5',
      from: 'queue-main',
      to: 'consumer-1',
      label: 'consume',
      type: 'async',
      visualStyle: 'ack'
    },
    {
      id: 'conn-6',
      from: 'queue-main',
      to: 'consumer-2',
      label: 'consume',
      type: 'async',
      visualStyle: 'ack'
    },

    // Queue to Dead Letter Queue (error flow)
    {
      id: 'conn-7',
      from: 'queue-main',
      to: 'queue-dlq',
      label: 'failed messages',
      type: 'async',
      visualStyle: 'error'
    },

    // DLQ retry connection
    {
      id: 'conn-8',
      from: 'queue-dlq',
      to: 'queue-main',
      label: 'retry',
      type: 'async',
      visualStyle: 'retry'
    }
  ],
  infoCards: [
    // Best practices card
    {
      id: 'info-1',
      x: 50,
      y: 50,
      content: '**Best Practices**\n• Use idempotent message processing\n• Implement proper error handling\n• Monitor queue depths\n• Set appropriate timeouts',
      color: 'blue'
    },

    // Performance considerations
    {
      id: 'info-2',
      x: 300,
      y: 50,
      content: '**Performance Tips**\n• Batch message processing\n• Use message compression\n• Optimize serialization\n• Configure consumer groups',
      color: 'green'
    },

    // Patterns card
    {
      id: 'info-3',
      x: 550,
      y: 50,
      content: '**Common Patterns**\n• Pub/Sub messaging\n• Event sourcing\n• CQRS architecture\n• Saga pattern for transactions',
      color: 'purple'
    },

    // Queue flow explanation
    {
      id: 'info-4',
      x: 750,
      y: 50,
      content: '**Message Flow**\n🟢 ACK - Successful processing\n🟠 Retry - Failed, retry later\n🔴 Error - Failed permanently\n⚫ Default - Standard flow',
      color: 'yellow'
    }
  ],
  layers: [
    {
      id: 'layer-1',
      name: 'Queue Architecture',
      visible: true,
      order: 1
    }
  ],
  gridConfig: {
    visible: true,
    spacing: 50,
    snapToGrid: true,
    color: '#e5e7eb'
  },
  activeTool: 'select',
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0.0',
    author: 'ArchiComm',
    tags: ['queue', 'messaging', 'cheatsheet', 'architecture']
  }
};