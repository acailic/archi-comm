/**
 * src/lib/canvas/template-library.ts
 * Library of pre-built architecture diagram templates
 * Provides common patterns like microservices, monoliths, event-driven, etc.
 * RELEVANT FILES: canvas-ai-assistant.ts, TextToDiagramModal.tsx, canvasStore.ts, shared/contracts/index.ts
 */

import type { DesignComponent, Connection } from '@/shared/contracts';

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'mobile' | 'microservices' | 'data' | 'cloud' | 'event-driven' | 'general' | 'security' | 'ai-ml' | 'iot';
  components: Omit<DesignComponent, 'id'>[];
  connections: Omit<Connection, 'id'>[];
  tags: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes to implement
}

/**
 * Get all available templates
 */
export const getAllTemplates = (): DiagramTemplate[] => {
  return [
    MICROSERVICES_TEMPLATE,
    THREE_TIER_WEB_TEMPLATE,
    EVENT_DRIVEN_TEMPLATE,
    SERVERLESS_TEMPLATE,
    CQRS_TEMPLATE,
    ECOMMERCE_PLATFORM_TEMPLATE,
    FINTECH_PLATFORM_TEMPLATE,
    HEALTHCARE_SYSTEM_TEMPLATE,
    GAMING_PLATFORM_TEMPLATE,
    IOT_PLATFORM_TEMPLATE,
    AI_ML_PIPELINE_TEMPLATE,
    SECURITY_ARCHITECTURE_TEMPLATE,
    DATA_WAREHOUSE_TEMPLATE,
    CDN_ARCHITECTURE_TEMPLATE,
    API_GATEWAY_TEMPLATE,
    GRAPHQL_FEDERATION_TEMPLATE,
  ];
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: DiagramTemplate['category']): DiagramTemplate[] => {
  return getAllTemplates().filter(t => t.category === category);
};

/**
 * Get templates by complexity
 */
export const getTemplatesByComplexity = (complexity: DiagramTemplate['complexity']): DiagramTemplate[] => {
  return getAllTemplates().filter(t => t.complexity === complexity);
};

/**
 * Search templates by name or tags
 */
export const searchTemplates = (query: string): DiagramTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return getAllTemplates().filter(
    t => t.name.toLowerCase().includes(lowerQuery) ||
         t.description.toLowerCase().includes(lowerQuery) ||
         t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get recommended templates for a given use case
 */
export const getRecommendedTemplates = (useCase: string): DiagramTemplate[] => {
  const useCaseLower = useCase.toLowerCase();

  if (useCaseLower.includes('ecommerce') || useCaseLower.includes('shopping')) {
    return [ECOMMERCE_PLATFORM_TEMPLATE, MICROSERVICES_TEMPLATE];
  }
  if (useCaseLower.includes('finance') || useCaseLower.includes('banking') || useCaseLower.includes('payment')) {
    return [FINTECH_PLATFORM_TEMPLATE, CQRS_TEMPLATE];
  }
  if (useCaseLower.includes('healthcare') || useCaseLower.includes('medical')) {
    return [HEALTHCARE_SYSTEM_TEMPLATE, MICROSERVICES_TEMPLATE];
  }
  if (useCaseLower.includes('gaming') || useCaseLower.includes('game')) {
    return [GAMING_PLATFORM_TEMPLATE, EVENT_DRIVEN_TEMPLATE];
  }
  if (useCaseLower.includes('iot') || useCaseLower.includes('internet of things')) {
    return [IOT_PLATFORM_TEMPLATE, EVENT_DRIVEN_TEMPLATE];
  }
  if (useCaseLower.includes('ai') || useCaseLower.includes('machine learning') || useCaseLower.includes('ml')) {
    return [AI_ML_PIPELINE_TEMPLATE, SERVERLESS_TEMPLATE];
  }
  if (useCaseLower.includes('security') || useCaseLower.includes('secure')) {
    return [SECURITY_ARCHITECTURE_TEMPLATE, MICROSERVICES_TEMPLATE];
  }
  if (useCaseLower.includes('data') || useCaseLower.includes('analytics')) {
    return [DATA_WAREHOUSE_TEMPLATE, CQRS_TEMPLATE];
  }
  if (useCaseLower.includes('api') || useCaseLower.includes('microservices')) {
    return [API_GATEWAY_TEMPLATE, MICROSERVICES_TEMPLATE];
  }

  // Default recommendations
  return [MICROSERVICES_TEMPLATE, THREE_TIER_WEB_TEMPLATE, EVENT_DRIVEN_TEMPLATE];
};

/**
 * Apply a template to canvas data
 */
export const applyTemplateToCanvas = (
  template: DiagramTemplate,
  existingComponents: DesignComponent[] = [],
  existingConnections: Connection[] = []
): { components: DesignComponent[]; connections: Connection[] } => {
  // Generate unique IDs for template components and connections
  const componentIdOffset = existingComponents.length;
  const connectionIdOffset = existingConnections.length;

  const componentsWithIds = template.components.map((component, index) => ({
    ...component,
    id: `template-${template.id}-${componentIdOffset + index}`,
  }));

  const connectionsWithIds = template.connections.map((connection, index) => ({
    ...connection,
    id: `template-conn-${template.id}-${connectionIdOffset + index}`,
  }));

  return {
    components: [...existingComponents, ...componentsWithIds],
    connections: [...existingConnections, ...connectionsWithIds],
  };
};

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

const MICROSERVICES_TEMPLATE: DiagramTemplate = {
  id: 'microservices-basic',
  name: 'Microservices Architecture',
  description: 'Basic microservices setup with API gateway, services, and database',
  category: 'microservices',
  tags: ['microservices', 'api-gateway', 'distributed'],
  complexity: 'basic',
  estimatedTime: 60,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 400,
      y: 100,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'User Service',
      x: 200,
      y: 300,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Order Service',
      x: 400,
      y: 300,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Payment Service',
      x: 600,
      y: 300,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'User DB',
      x: 200,
      y: 500,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Order DB',
      x: 400,
      y: 500,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const THREE_TIER_WEB_TEMPLATE: DiagramTemplate = {
  id: 'three-tier-web',
  name: '3-Tier Web Application',
  description: 'Classic presentation, business logic, and data tier architecture',
  category: 'web',
  tags: ['web', '3-tier', 'monolith'],
  complexity: 'basic',
  estimatedTime: 45,
  components: [
    {
      type: 'frontend',
      label: 'Web Frontend',
      x: 400,
      y: 100,
      width: 140,
      height: 80,
      typeSpecificProperties: { layer: 'presentation' },
    },
    {
      type: 'backend',
      label: 'Application Server',
      x: 400,
      y: 250,
      width: 140,
      height: 80,
      typeSpecificProperties: { layer: 'business' },
    },
    {
      type: 'database',
      label: 'PostgreSQL',
      x: 400,
      y: 400,
      width: 120,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const EVENT_DRIVEN_TEMPLATE: DiagramTemplate = {
  id: 'event-driven-basic',
  name: 'Event-Driven Architecture',
  description: 'Event bus with producers and consumers',
  category: 'event-driven',
  tags: ['event-driven', 'message-queue', 'async'],
  complexity: 'intermediate',
  estimatedTime: 90,
  components: [
    {
      type: 'message-queue',
      label: 'Event Bus',
      x: 400,
      y: 250,
      width: 160,
      height: 80,
      typeSpecificProperties: { layer: 'messaging' },
    },
    {
      type: 'service',
      label: 'Producer 1',
      x: 200,
      y: 100,
      width: 120,
      height: 70,
      typeSpecificProperties: { layer: 'producer' },
    },
    {
      type: 'service',
      label: 'Producer 2',
      x: 580,
      y: 100,
      width: 120,
      height: 70,
      typeSpecificProperties: { layer: 'producer' },
    },
    {
      type: 'service',
      label: 'Consumer 1',
      x: 200,
      y: 400,
      width: 120,
      height: 70,
      typeSpecificProperties: { layer: 'consumer' },
    },
    {
      type: 'service',
      label: 'Consumer 2',
      x: 580,
      y: 400,
      width: 120,
      height: 70,
      typeSpecificProperties: { layer: 'consumer' },
    },
  ],
  connections: [],
};

const SERVERLESS_TEMPLATE: DiagramTemplate = {
  id: 'serverless-basic',
  name: 'Serverless Architecture',
  description: 'API Gateway with Lambda functions and managed services',
  category: 'cloud',
  tags: ['serverless', 'lambda', 'aws', 'cloud'],
  complexity: 'intermediate',
  estimatedTime: 75,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 400,
      y: 100,
      width: 140,
      height: 70,
      typeSpecificProperties: { provider: 'aws' },
    },
    {
      type: 'lambda',
      label: 'Lambda Handler',
      x: 400,
      y: 250,
      width: 120,
      height: 70,
      typeSpecificProperties: { provider: 'aws' },
    },
    {
      type: 'database',
      label: 'DynamoDB',
      x: 400,
      y: 400,
      width: 120,
      height: 60,
      typeSpecificProperties: { provider: 'aws' },
    },
  ],
  connections: [],
};

const CQRS_TEMPLATE: DiagramTemplate = {
  id: 'cqrs-basic',
  name: 'CQRS Pattern',
  description: 'Command Query Responsibility Segregation with separate read/write models',
  category: 'general',
  tags: ['cqrs', 'pattern', 'read-write-split'],
  complexity: 'advanced',
  estimatedTime: 120,
  components: [
    {
      type: 'service',
      label: 'Command Service',
      x: 250,
      y: 150,
      width: 140,
      height: 80,
      typeSpecificProperties: { side: 'write' },
    },
    {
      type: 'service',
      label: 'Query Service',
      x: 550,
      y: 150,
      width: 140,
      height: 80,
      typeSpecificProperties: { side: 'read' },
    },
    {
      type: 'database',
      label: 'Write DB',
      x: 250,
      y: 300,
      width: 100,
      height: 60,
      typeSpecificProperties: { side: 'write' },
    },
    {
      type: 'database',
      label: 'Read DB',
      x: 550,
      y: 300,
      width: 100,
      height: 60,
      typeSpecificProperties: { side: 'read' },
    },
  ],
  connections: [],
};

const ECOMMERCE_PLATFORM_TEMPLATE: DiagramTemplate = {
  id: 'ecommerce-platform',
  name: 'E-Commerce Platform',
  description: 'Microservices-based e-commerce platform architecture',
  category: 'microservices',
  tags: ['ecommerce', 'microservices', 'aws', 'serverless'],
  complexity: 'advanced',
  estimatedTime: 180,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'User Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Product Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Order Service',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Payment Service',
      x: 650,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'User DB',
      x: 50,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Product DB',
      x: 250,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Order DB',
      x: 450,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const FINTECH_PLATFORM_TEMPLATE: DiagramTemplate = {
  id: 'fintech-platform',
  name: 'FinTech Platform',
  description: 'Secure and scalable architecture for financial applications',
  category: 'microservices',
  tags: ['fintech', 'microservices', 'security', 'aws'],
  complexity: 'advanced',
  estimatedTime: 200,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'Auth Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Account Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Transaction Service',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'User DB',
      x: 50,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Transaction DB',
      x: 250,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const HEALTHCARE_SYSTEM_TEMPLATE: DiagramTemplate = {
  id: 'healthcare-system',
  name: 'Healthcare System',
  description: 'HIPAA-compliant architecture for healthcare applications',
  category: 'microservices',
  tags: ['healthcare', 'microservices', 'security', 'aws'],
  complexity: 'advanced',
  estimatedTime: 220,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'Patient Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Appointment Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Billing Service',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'Patient DB',
      x: 50,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Appointment DB',
      x: 250,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const GAMING_PLATFORM_TEMPLATE: DiagramTemplate = {
  id: 'gaming-platform',
  name: 'Gaming Platform',
  description: 'Architecture for online gaming applications',
  category: 'microservices',
  tags: ['gaming', 'microservices', 'aws', 'serverless'],
  complexity: 'advanced',
  estimatedTime: 180,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'Game Session Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Player Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Matchmaking Service',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'User DB',
      x: 50,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Game DB',
      x: 250,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const IOT_PLATFORM_TEMPLATE: DiagramTemplate = {
  id: 'iot-platform',
  name: 'IoT Platform',
  description: 'Architecture for Internet of Things applications',
  category: 'microservices',
  tags: ['iot', 'microservices', 'aws', 'serverless'],
  complexity: 'advanced',
  estimatedTime: 200,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'Device Management Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Data Ingestion Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Analytics Service',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'Device DB',
      x: 50,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Data DB',
      x: 250,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const AI_ML_PIPELINE_TEMPLATE: DiagramTemplate = {
  id: 'ai-ml-pipeline',
  name: 'AI/ML Pipeline',
  description: 'Architecture for machine learning model training and serving',
  category: 'ai-ml',
  tags: ['ai', 'ml', 'machine learning', 'pipeline'],
  complexity: 'advanced',
  estimatedTime: 240,
  components: [
    {
      type: 'data-source',
      label: 'Data Source',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'service',
      label: 'Data Processing Service',
      x: 250,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Model Training Service',
      x: 450,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Model Serving Service',
      x: 650,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'Training Data DB',
      x: 50,
      y: 250,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Model DB',
      x: 250,
      y: 250,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const SECURITY_ARCHITECTURE_TEMPLATE: DiagramTemplate = {
  id: 'security-architecture',
  name: 'Security Architecture',
  description: 'Architecture for secure application design',
  category: 'security',
  tags: ['security', 'encryption', 'authentication', 'authorization'],
  complexity: 'advanced',
  estimatedTime: 180,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'Auth Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'User Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'encryption',
      label: 'Data Encryption',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'security' },
    },
    {
      type: 'database',
      label: 'User DB',
      x: 50,
      y: 350,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const DATA_WAREHOUSE_TEMPLATE: DiagramTemplate = {
  id: 'data-warehouse',
  name: 'Data Warehouse',
  description: 'Architecture for data warehousing and analytics',
  category: 'data',
  tags: ['data', 'warehouse', 'analytics', 'etl'],
  complexity: 'advanced',
  estimatedTime: 210,
  components: [
    {
      type: 'data-source',
      label: 'Data Source',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'service',
      label: 'ETL Service',
      x: 250,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'database',
      label: 'Staging DB',
      x: 450,
      y: 50,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'database',
      label: 'Warehouse DB',
      x: 650,
      y: 50,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
    {
      type: 'service',
      label: 'Analytics Service',
      x: 250,
      y: 250,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
  ],
  connections: [],
};

const CDN_ARCHITECTURE_TEMPLATE: DiagramTemplate = {
  id: 'cdn-architecture',
  name: 'CDN Architecture',
  description: 'Architecture for content delivery network',
  category: 'cloud',
  tags: ['cdn', 'cloud', 'architecture'],
  complexity: 'intermediate',
  estimatedTime: 120,
  components: [
    {
      type: 'cdn',
      label: 'Content Delivery Network',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'cdn' },
    },
    {
      type: 'origin-server',
      label: 'Origin Server',
      x: 250,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'origin' },
    },
    {
      type: 'database',
      label: 'Content DB',
      x: 450,
      y: 50,
      width: 100,
      height: 60,
      typeSpecificProperties: { layer: 'data' },
    },
  ],
  connections: [],
};

const API_GATEWAY_TEMPLATE: DiagramTemplate = {
  id: 'api-gateway',
  name: 'API Gateway',
  description: 'API Gateway pattern for microservices',
  category: 'microservices',
  tags: ['api-gateway', 'microservices', 'pattern'],
  complexity: 'basic',
  estimatedTime: 60,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 400,
      y: 100,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'Service A',
      x: 200,
      y: 300,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Service B',
      x: 400,
      y: 300,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Service C',
      x: 600,
      y: 300,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
  ],
  connections: [],
};

const GRAPHQL_FEDERATION_TEMPLATE: DiagramTemplate = {
  id: 'graphql-federation',
  name: 'GraphQL Federation',
  description: 'GraphQL Federation architecture for microservices',
  category: 'microservices',
  tags: ['graphql', 'federation', 'microservices'],
  complexity: 'advanced',
  estimatedTime: 150,
  components: [
    {
      type: 'api-gateway',
      label: 'API Gateway',
      x: 50,
      y: 50,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
    {
      type: 'service',
      label: 'User Service',
      x: 50,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Product Service',
      x: 250,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'service',
      label: 'Order Service',
      x: 450,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'service' },
    },
    {
      type: 'gateway',
      label: 'GraphQL Gateway',
      x: 650,
      y: 150,
      width: 120,
      height: 80,
      typeSpecificProperties: { layer: 'gateway' },
    },
  ],
  connections: [],
};

/**
 * Generate a custom template based on use case description
 */
export const generateCustomTemplate = (description: string): DiagramTemplate | null => {
  const lowerDesc = description.toLowerCase();

  // E-commerce patterns
  if (lowerDesc.includes('ecommerce') || lowerDesc.includes('shopping') || lowerDesc.includes('store')) {
    return {
      id: `custom-ecommerce-${Date.now()}`,
      name: 'Custom E-Commerce Architecture',
      description: 'Generated e-commerce architecture based on your description',
      category: 'microservices',
      complexity: 'advanced',
      estimatedTime: 180,
      tags: ['ecommerce', 'custom', 'generated'],
      components: [
        {
          type: 'api-gateway',
          label: 'API Gateway',
          x: 50,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'gateway' },
        },
        {
          type: 'service',
          label: 'Product Catalog',
          x: 50,
          y: 150,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'service',
          label: 'Shopping Cart',
          x: 250,
          y: 150,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'service',
          label: 'Payment Processing',
          x: 450,
          y: 150,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'database',
          label: 'Product DB',
          x: 50,
          y: 350,
          width: 100,
          height: 60,
          typeSpecificProperties: { layer: 'data' },
        },
        {
          type: 'database',
          label: 'Order DB',
          x: 250,
          y: 350,
          width: 100,
          height: 60,
          typeSpecificProperties: { layer: 'data' },
        },
      ],
      connections: [],
    };
  }

  // IoT patterns
  if (lowerDesc.includes('iot') || lowerDesc.includes('internet of things') || lowerDesc.includes('device')) {
    return {
      id: `custom-iot-${Date.now()}`,
      name: 'Custom IoT Architecture',
      description: 'Generated IoT architecture based on your description',
      category: 'iot',
      complexity: 'advanced',
      estimatedTime: 200,
      tags: ['iot', 'custom', 'generated'],
      components: [
        {
          type: 'service',
          label: 'Device Registry',
          x: 50,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'service',
          label: 'Data Ingestion',
          x: 250,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'service',
          label: 'Device Management',
          x: 450,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'message-queue',
          label: 'IoT Message Queue',
          x: 250,
          y: 200,
          width: 160,
          height: 80,
          typeSpecificProperties: { layer: 'messaging' },
        },
        {
          type: 'database',
          label: 'Device Data DB',
          x: 50,
          y: 350,
          width: 100,
          height: 60,
          typeSpecificProperties: { layer: 'data' },
        },
        {
          type: 'database',
          label: 'Analytics DB',
          x: 250,
          y: 350,
          width: 100,
          height: 60,
          typeSpecificProperties: { layer: 'data' },
        },
      ],
      connections: [],
    };
  }

  // AI/ML patterns
  if (lowerDesc.includes('ai') || lowerDesc.includes('machine learning') || lowerDesc.includes('ml')) {
    return {
      id: `custom-ai-${Date.now()}`,
      name: 'Custom AI/ML Architecture',
      description: 'Generated AI/ML architecture based on your description',
      category: 'ai-ml',
      complexity: 'advanced',
      estimatedTime: 240,
      tags: ['ai', 'ml', 'custom', 'generated'],
      components: [
        {
          type: 'service',
          label: 'Model Training',
          x: 50,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'service',
          label: 'Model Serving',
          x: 250,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'service',
          label: 'Feature Store',
          x: 450,
          y: 50,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
        {
          type: 'database',
          label: 'Training Data',
          x: 50,
          y: 200,
          width: 100,
          height: 60,
          typeSpecificProperties: { layer: 'data' },
        },
        {
          type: 'database',
          label: 'Model Registry',
          x: 250,
          y: 200,
          width: 100,
          height: 60,
          typeSpecificProperties: { layer: 'data' },
        },
        {
          type: 'service',
          label: 'Monitoring',
          x: 450,
          y: 200,
          width: 120,
          height: 80,
          typeSpecificProperties: { layer: 'service' },
        },
      ],
      connections: [],
    };
  }

  return null; // No matching pattern found
};
