import { TaskTemplate, ComponentDefinition, TaskConstraint, EvaluationCriteria } from '../TaskPlugin';
import type { DesignComponent, Connection } from '../../../App';

/**
 * ArchiComm Community Edition - Basic Templates Only
 * 
 * This file contains basic, educational templates suitable for learning
 * system design fundamentals. Advanced enterprise templates are available
 * in the premium version.
 */

/**
 * Basic Microservices Architecture Design Task
 * Simplified for educational purposes in the community edition
 */
export const microservicesTemplate: TaskTemplate = {
  id: 'microservices-basic',
  name: 'Design a Simple Microservices Blog Platform',
  description: 'Design a basic blog platform using microservices architecture. Learn fundamental concepts of service separation, API design, and data management.',
  category: 'Architecture Patterns',
  difficulty: 'beginner',
  estimatedTime: 30,
  tags: ['microservices', 'blog', 'api-design', 'basic-architecture'],
  learningObjectives: [
    'Understand basic microservices principles',
    'Learn to separate concerns into services',
    'Practice simple API design',
    'Apply basic data management concepts'
  ],
  prerequisites: [
    'Basic understanding of web applications',
    'Familiarity with REST APIs',
    'Basic database knowledge'
  ],
  
  steps: [
    {
      id: 'identify-services',
      title: 'Identify Core Services',
      description: 'Break down the blog platform into simple microservices',
      type: 'component',
      required: true,
      hints: [
        'Think about basic capabilities: user management, blog posts, comments',
        'Each service should handle one main responsibility',
        'Keep it simple for learning purposes'
      ],
      validation: {
        rules: [
          {
            type: 'component-count',
            condition: '3',
            message: 'You should have at least 3 microservices for a basic blog platform',
            severity: 'warning'
          }
        ],
        autoCheck: true
      }
    },
    {
      id: 'define-communication',
      title: 'Define Service Communication',
      description: 'Establish how services will communicate using REST APIs',
      type: 'connection',
      required: true,
      hints: [
        'Use HTTP REST APIs for service communication',
        'Consider an API Gateway for external access',
        'Keep communication patterns simple'
      ],
      validation: {
        rules: [
          {
            type: 'connection-exists',
            condition: 'api',
            message: 'Services should be connected through REST APIs',
            severity: 'error'
          }
        ],
        autoCheck: true
      }
    },
    {
      id: 'data-management',
      title: 'Design Data Storage',
      description: 'Design simple data storage for each service',
      type: 'component',
      required: true,
      hints: [
        'Each service should have its own database',
        'Use simple database choices (PostgreSQL, MongoDB)',
        'Focus on data separation between services'
      ]
    }
  ],

  components: [
    {
      id: 'user-service',
      name: 'User Service',
      type: 'service',
      description: 'Manages user registration, authentication, and profiles',
      icon: 'user-circle',
      color: '#3b82f6',
      properties: [
        { key: 'database', label: 'Database Type', type: 'select', options: [
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' }
        ]},
        { key: 'auth_method', label: 'Authentication', type: 'select', options: [
          { value: 'jwt', label: 'JWT' },
          { value: 'session', label: 'Session-based' }
        ]}
      ],
      connectionPoints: [
        { id: 'api-out', name: 'REST API', type: 'output', protocol: 'HTTP' }
      ]
    },
    {
      id: 'blog-service',
      name: 'Blog Service',
      type: 'service',
      description: 'Manages blog posts, categories, and content',
      icon: 'document-text',
      color: '#10b981',
      properties: [
        { key: 'database', label: 'Database Type', type: 'select', options: [
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' }
        ]}
      ],
      connectionPoints: [
        { id: 'api-out', name: 'Blog API', type: 'output', protocol: 'HTTP' }
      ]
    },
    {
      id: 'comment-service',
      name: 'Comment Service',
      type: 'service',
      description: 'Handles comments on blog posts',
      icon: 'chat-bubble-left',
      color: '#f59e0b',
      properties: [
        { key: 'database', label: 'Database Type', type: 'select', options: [
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' }
        ]}
      ],
      connectionPoints: [
        { id: 'api-out', name: 'Comment API', type: 'output', protocol: 'HTTP' }
      ]
    }
  ],

  constraints: [
    {
      id: 'service-limit',
      type: 'component-limit',
      description: 'Should have 3-5 services to keep it simple for learning',
      rule: '5',
      enforcement: 'soft'
    },
    {
      id: 'data-ownership',
      type: 'pattern-required',
      description: 'Each service should have its own database',
      rule: 'database-per-service',
      enforcement: 'hard'
    }
  ],

  evaluation: {
    completeness: {
      weight: 30,
      criteria: [
        'All required services are present',
        'Data storage is defined for each service',
        'API connections are established'
      ]
    },
    correctness: {
      weight: 40,
      criteria: [
        'Service boundaries make sense',
        'Communication patterns are simple and clear',
        'Data separation is properly implemented'
      ]
    },
    clarity: {
      weight: 20,
      criteria: [
        'Design is easy to understand',
        'Service responsibilities are clear',
        'Architecture is well-organized'
      ]
    },
    bestPractices: {
      weight: 10,
      criteria: [
        'Basic security considerations',
        'Simple monitoring approach',
        'Clean API design'
      ]
    }
  },

  author: 'ArchiComm Team',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

/**
 * Serverless Architecture Task - Community Edition
 * Perfect for beginners learning cloud and serverless concepts
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

// Export community templates only
// Advanced templates (event-driven, enterprise patterns) are available in premium version
export const builtInTemplates = [
  microservicesTemplate,
  serverlessTemplate
];

export default {
  microservices: microservicesTemplate,
  serverless: serverlessTemplate
};

// Helper: convert a TaskTemplate into canvas components and naive connections
export function convertTemplateToCanvas(template: TaskTemplate): { components: DesignComponent[]; connections: Connection[] } {
  const now = Date.now();
  // Place components on a simple grid
  const components: DesignComponent[] = template.components.map((c, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    return {
      id: `${c.type}-${now}-${idx}`,
      type: c.type,
      x: 120 + col * 180,
      y: 100 + row * 140,
      label: c.name,
      description: c.description,
      properties: {},
    } as DesignComponent;
  });

  // Naive connections: connect sequential components
  const connections: Connection[] = components.slice(1).map((comp, idx) => ({
    id: `conn-${now}-${idx}`,
    from: components[idx].id,
    to: comp.id,
    label: 'flow',
    type: 'sync',
    protocol: 'HTTP',
    direction: 'end',
  }));

  return { components, connections };
}
