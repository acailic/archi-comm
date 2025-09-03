import { TaskTemplate, ComponentDefinition, TaskConstraint, EvaluationCriteria } from '../TaskPlugin';

/**
 * Microservices Architecture Design Task
 */
export const microservicesTemplate: TaskTemplate = {
  id: 'microservices-basic',
  name: 'Design a Microservices E-commerce Platform',
  description: 'Design a scalable e-commerce platform using microservices architecture with proper service boundaries, communication patterns, and data management.',
  category: 'Architecture Patterns',
  difficulty: 'intermediate',
  estimatedTime: 45,
  tags: ['microservices', 'e-commerce', 'scalability', 'distributed-systems'],
  learningObjectives: [
    'Understand microservices architecture principles',
    'Learn to identify proper service boundaries',
    'Master inter-service communication patterns',
    'Apply data management in distributed systems'
  ],
  prerequisites: [
    'Basic understanding of web architecture',
    'Familiarity with APIs and databases',
    'Knowledge of scalability concepts'
  ],
  
  steps: [
    {
      id: 'identify-services',
      title: 'Identify Core Services',
      description: 'Break down the e-commerce domain into logical microservices',
      type: 'component',
      required: true,
      hints: [
        'Think about business capabilities: user management, product catalog, orders, payments, inventory',
        'Each service should have a single responsibility',
        'Consider data ownership boundaries'
      ],
      validation: {
        rules: [
          {
            type: 'component-count',
            condition: '4',
            message: 'You should have at least 4 microservices for a basic e-commerce platform',
            severity: 'warning'
          }
        ],
        autoCheck: true
      }
    },
    {
      id: 'define-communication',
      title: 'Define Service Communication',
      description: 'Establish how services will communicate with each other',
      type: 'connection',
      required: true,
      hints: [
        'Use synchronous communication (HTTP/gRPC) for request-response patterns',
        'Use asynchronous communication (events/messages) for loose coupling',
        'Consider API Gateway for external access'
      ],
      validation: {
        rules: [
          {
            type: 'connection-exists',
            condition: 'api',
            message: 'Services should be connected through APIs or message queues',
            severity: 'error'
          }
        ],
        autoCheck: true
      }
    },
    {
      id: 'data-management',
      title: 'Design Data Management',
      description: 'Design data storage and management strategy for each service',
      type: 'component',
      required: true,
      hints: [
        'Each service should own its data',
        'Choose appropriate database types for each service',
        'Consider data consistency patterns'
      ]
    },
    {
      id: 'infrastructure',
      title: 'Add Infrastructure Components',
      description: 'Add necessary infrastructure components for the system',
      type: 'component',
      required: true,
      hints: [
        'Consider load balancers, API gateways, service discovery',
        'Add monitoring and logging components',
        'Include caching layers where appropriate'
      ]
    }
  ],

  components: [
    {
      id: 'user-service',
      name: 'User Service',
      type: 'service',
      description: 'Manages user authentication, profiles, and preferences',
      icon: 'user-circle',
      color: '#3b82f6',
      properties: [
        { key: 'database', label: 'Database Type', type: 'select', options: [
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' },
          { value: 'mysql', label: 'MySQL' }
        ]},
        { key: 'auth_method', label: 'Authentication', type: 'select', options: [
          { value: 'jwt', label: 'JWT' },
          { value: 'oauth', label: 'OAuth' },
          { value: 'session', label: 'Session-based' }
        ]}
      ],
      connectionPoints: [
        { id: 'api-out', name: 'REST API', type: 'output', protocol: 'HTTP' },
        { id: 'events-out', name: 'User Events', type: 'output', protocol: 'Message Queue' }
      ]
    },
    {
      id: 'product-service',
      name: 'Product Catalog',
      type: 'service',
      description: 'Manages product information, categories, and search',
      icon: 'shopping-bag',
      color: '#10b981',
      properties: [
        { key: 'search_engine', label: 'Search Technology', type: 'select', options: [
          { value: 'elasticsearch', label: 'Elasticsearch' },
          { value: 'solr', label: 'Apache Solr' },
          { value: 'algolia', label: 'Algolia' }
        ]},
        { key: 'cache_strategy', label: 'Caching', type: 'select', options: [
          { value: 'redis', label: 'Redis' },
          { value: 'memcached', label: 'Memcached' },
          { value: 'none', label: 'No Cache' }
        ]}
      ],
      connectionPoints: [
        { id: 'api-out', name: 'Product API', type: 'output', protocol: 'HTTP' },
        { id: 'search-out', name: 'Search API', type: 'output', protocol: 'HTTP' }
      ]
    },
    {
      id: 'order-service',
      name: 'Order Service',
      type: 'service',
      description: 'Handles order processing, status tracking, and fulfillment',
      icon: 'clipboard-list',
      color: '#f59e0b',
      properties: [
        { key: 'state_machine', label: 'Order State Management', type: 'boolean', defaultValue: true },
        { key: 'saga_pattern', label: 'Use Saga Pattern', type: 'boolean', defaultValue: false }
      ],
      connectionPoints: [
        { id: 'api-out', name: 'Order API', type: 'output', protocol: 'HTTP' },
        { id: 'events-in', name: 'Order Events', type: 'input', protocol: 'Message Queue' },
        { id: 'events-out', name: 'Order Events', type: 'output', protocol: 'Message Queue' }
      ]
    },
    {
      id: 'payment-service',
      name: 'Payment Service',
      type: 'service',
      description: 'Processes payments, handles billing, and manages transactions',
      icon: 'credit-card',
      color: '#ef4444',
      properties: [
        { key: 'payment_provider', label: 'Payment Provider', type: 'multiselect', options: [
          { value: 'stripe', label: 'Stripe' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'square', label: 'Square' }
        ]},
        { key: 'encryption', label: 'PCI Compliance', type: 'boolean', defaultValue: true }
      ],
      connectionPoints: [
        { id: 'api-out', name: 'Payment API', type: 'output', protocol: 'HTTPS' },
        { id: 'webhook-in', name: 'Payment Webhooks', type: 'input', protocol: 'HTTPS' }
      ]
    }
  ],

  constraints: [
    {
      id: 'service-limit',
      type: 'component-limit',
      description: 'Should have at least 3 core services but not more than 10 to keep complexity manageable',
      rule: '10',
      enforcement: 'soft'
    },
    {
      id: 'data-ownership',
      type: 'pattern-required',
      description: 'Each service should have its own database (no shared databases)',
      rule: 'database-per-service',
      enforcement: 'hard'
    },
    {
      id: 'api-gateway',
      type: 'pattern-required',
      description: 'Should include an API Gateway for external client access',
      rule: 'api-gateway-present',
      enforcement: 'soft'
    }
  ],

  evaluation: {
    completeness: {
      weight: 25,
      criteria: [
        'All required services are present',
        'Infrastructure components are included',
        'Data storage is defined for each service'
      ]
    },
    correctness: {
      weight: 30,
      criteria: [
        'Proper service boundaries are defined',
        'Communication patterns are appropriate',
        'Data consistency is addressed'
      ]
    },
    efficiency: {
      weight: 20,
      criteria: [
        'Appropriate technology choices',
        'Caching strategies are considered',
        'Performance optimizations are present'
      ]
    },
    scalability: {
      weight: 15,
      criteria: [
        'Services can scale independently',
        'Load balancing is considered',
        'Database scaling is addressed'
      ]
    },
    bestPractices: {
      weight: 10,
      criteria: [
        'Security considerations are included',
        'Monitoring and logging are planned',
        'DevOps practices are considered'
      ]
    }
  },

  author: 'ArchiComm Team',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

/**
 * Event-Driven Architecture Task
 */
export const eventDrivenTemplate: TaskTemplate = {
  id: 'event-driven-basic',
  name: 'Design Event-Driven Real-time Analytics Platform',
  description: 'Design a real-time analytics platform using event-driven architecture with proper event sourcing, CQRS, and stream processing.',
  category: 'Architecture Patterns',
  difficulty: 'advanced',
  estimatedTime: 60,
  tags: ['event-driven', 'real-time', 'analytics', 'stream-processing', 'cqrs'],
  learningObjectives: [
    'Master event-driven architecture patterns',
    'Understand event sourcing and CQRS',
    'Learn stream processing concepts',
    'Apply real-time data processing techniques'
  ],
  prerequisites: [
    'Understanding of microservices',
    'Knowledge of message queues',
    'Familiarity with databases',
    'Basic knowledge of streaming concepts'
  ],

  steps: [
    {
      id: 'event-sources',
      title: 'Identify Event Sources',
      description: 'Define what generates events in the system',
      type: 'component',
      required: true,
      hints: [
        'Consider user interactions, system events, external integrations',
        'Think about high-volume vs low-volume event sources',
        'Consider event schemas and versioning'
      ]
    },
    {
      id: 'event-backbone',
      title: 'Design Event Backbone',
      description: 'Design the central event streaming infrastructure',
      type: 'component',
      required: true,
      hints: [
        'Choose appropriate streaming platform (Kafka, Pulsar, etc.)',
        'Consider partitioning and replication strategies',
        'Plan for event ordering and exactly-once semantics'
      ]
    },
    {
      id: 'stream-processors',
      title: 'Add Stream Processors',
      description: 'Design components that process event streams in real-time',
      type: 'component',
      required: true,
      hints: [
        'Consider windowing operations for aggregations',
        'Think about stateful vs stateless processing',
        'Plan for fault tolerance and recovery'
      ]
    },
    {
      id: 'read-write-models',
      title: 'Separate Read/Write Models',
      description: 'Implement CQRS pattern with separate read and write models',
      type: 'component',
      required: true,
      hints: [
        'Write models should be optimized for commands',
        'Read models should be optimized for queries',
        'Consider eventual consistency implications'
      ]
    }
  ],

  components: [
    {
      id: 'event-store',
      name: 'Event Store',
      type: 'database',
      description: 'Stores all events as the single source of truth',
      icon: 'database',
      color: '#8b5cf6',
      properties: [
        { key: 'store_type', label: 'Store Type', type: 'select', options: [
          { value: 'eventstore', label: 'EventStore' },
          { value: 'kafka', label: 'Apache Kafka' },
          { value: 'postgresql', label: 'PostgreSQL' }
        ]},
        { key: 'retention', label: 'Event Retention (days)', type: 'number', defaultValue: 365 }
      ],
      connectionPoints: [
        { id: 'events-in', name: 'Event Input', type: 'input', protocol: 'Event Stream' },
        { id: 'events-out', name: 'Event Output', type: 'output', protocol: 'Event Stream' }
      ]
    },
    {
      id: 'stream-processor',
      name: 'Stream Processor',
      type: 'service',
      description: 'Processes event streams in real-time for analytics',
      icon: 'zap',
      color: '#f59e0b',
      properties: [
        { key: 'processing_engine', label: 'Processing Engine', type: 'select', options: [
          { value: 'kafka-streams', label: 'Kafka Streams' },
          { value: 'flink', label: 'Apache Flink' },
          { value: 'storm', label: 'Apache Storm' }
        ]},
        { key: 'windowing', label: 'Window Type', type: 'select', options: [
          { value: 'tumbling', label: 'Tumbling' },
          { value: 'sliding', label: 'Sliding' },
          { value: 'session', label: 'Session' }
        ]}
      ],
      connectionPoints: [
        { id: 'events-in', name: 'Input Stream', type: 'input', protocol: 'Event Stream' },
        { id: 'processed-out', name: 'Processed Events', type: 'output', protocol: 'Event Stream' }
      ]
    }
  ],

  constraints: [
    {
      id: 'event-ordering',
      type: 'pattern-required',
      description: 'Event ordering must be maintained within partitions',
      rule: 'partition-ordering',
      enforcement: 'hard'
    }
  ],

  evaluation: {
    completeness: { weight: 25, criteria: ['All event flows are defined', 'CQRS is properly implemented'] },
    correctness: { weight: 30, criteria: ['Event schemas are well-defined', 'Consistency patterns are correct'] },
    efficiency: { weight: 20, criteria: ['Stream processing is optimized', 'Storage is efficient'] },
    scalability: { weight: 15, criteria: ['Can handle high event volumes', 'Horizontal scaling is possible'] },
    bestPractices: { weight: 10, criteria: ['Event versioning strategy', 'Monitoring and observability'] }
  },

  author: 'ArchiComm Team',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

/**
 * Serverless Architecture Task
 */
export const serverlessTemplate: TaskTemplate = {
  id: 'serverless-basic',
  name: 'Design Serverless Image Processing Pipeline',
  description: 'Design a scalable image processing pipeline using serverless architecture with event triggers, function composition, and managed services.',
  category: 'Cloud Architecture',
  difficulty: 'beginner',
  estimatedTime: 30,
  tags: ['serverless', 'image-processing', 'cloud', 'event-driven', 'functions'],
  learningObjectives: [
    'Understand serverless architecture principles',
    'Learn function composition patterns',
    'Master event-driven triggers',
    'Apply managed cloud services effectively'
  ],
  prerequisites: [
    'Basic cloud services knowledge',
    'Understanding of event-driven systems',
    'Familiarity with image processing concepts'
  ],

  steps: [
    {
      id: 'trigger-events',
      title: 'Define Trigger Events',
      description: 'Identify what events will trigger the image processing',
      type: 'component',
      required: true,
      hints: [
        'Consider file upload events from storage services',
        'Think about HTTP API triggers for direct processing',
        'Consider scheduled processing for batch operations'
      ]
    },
    {
      id: 'processing-functions',
      title: 'Design Processing Functions',
      description: 'Break down image processing into composable functions',
      type: 'component',
      required: true,
      hints: [
        'Each function should have a single responsibility',
        'Consider resize, compress, format conversion, metadata extraction',
        'Think about function chaining and orchestration'
      ]
    },
    {
      id: 'storage-strategy',
      title: 'Plan Storage Strategy',
      description: 'Design how original and processed images will be stored',
      type: 'component',
      required: true,
      hints: [
        'Separate input and output storage buckets',
        'Consider CDN integration for delivery',
        'Plan for different storage tiers based on access patterns'
      ]
    }
  ],

  components: [
    {
      id: 'lambda-function',
      name: 'Processing Function',
      type: 'service',
      description: 'Serverless function for image processing operations',
      icon: 'function',
      color: '#ff6b35',
      properties: [
        { key: 'runtime', label: 'Runtime', type: 'select', options: [
          { value: 'python3.9', label: 'Python 3.9' },
          { value: 'nodejs18', label: 'Node.js 18' },
          { value: 'java11', label: 'Java 11' }
        ]},
        { key: 'memory', label: 'Memory (MB)', type: 'number', defaultValue: 512 },
        { key: 'timeout', label: 'Timeout (seconds)', type: 'number', defaultValue: 30 }
      ],
      connectionPoints: [
        { id: 'trigger-in', name: 'Event Trigger', type: 'input', protocol: 'Event' },
        { id: 'storage-out', name: 'Storage Output', type: 'output', protocol: 'HTTP' }
      ]
    },
    {
      id: 'object-storage',
      name: 'Object Storage',
      type: 'database',
      description: 'Cloud object storage for images',
      icon: 'archive',
      color: '#06b6d4',
      properties: [
        { key: 'storage_class', label: 'Storage Class', type: 'select', options: [
          { value: 'standard', label: 'Standard' },
          { value: 'infrequent', label: 'Infrequent Access' },
          { value: 'glacier', label: 'Archive' }
        ]},
        { key: 'versioning', label: 'Enable Versioning', type: 'boolean', defaultValue: true }
      ],
      connectionPoints: [
        { id: 'upload-in', name: 'File Upload', type: 'input', protocol: 'HTTP' },
        { id: 'events-out', name: 'Storage Events', type: 'output', protocol: 'Event' }
      ]
    }
  ],

  constraints: [
    {
      id: 'function-size',
      type: 'custom',
      description: 'Function deployment package should be under size limits',
      rule: 'package-size-limit',
      enforcement: 'hard'
    }
  ],

  evaluation: {
    completeness: { weight: 25, criteria: ['All processing steps are covered', 'Storage is properly planned'] },
    correctness: { weight: 25, criteria: ['Event flows are correct', 'Function composition is logical'] },
    efficiency: { weight: 25, criteria: ['Functions are right-sized', 'Storage costs are optimized'] },
    scalability: { weight: 15, criteria: ['Auto-scaling is configured', 'Can handle traffic spikes'] },
    bestPractices: { weight: 10, criteria: ['Error handling is included', 'Monitoring is planned'] }
  },

  author: 'ArchiComm Team',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// Export all templates
export const builtInTemplates = [
  microservicesTemplate,
  eventDrivenTemplate,
  serverlessTemplate
];

export default {
  microservices: microservicesTemplate,
  eventDriven: eventDrivenTemplate,
  serverless: serverlessTemplate
};