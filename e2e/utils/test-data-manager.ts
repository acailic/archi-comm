// e2e/utils/test-data-manager.ts
// Test data management utilities for E2E tests
// Provides consistent test data, fixtures, and state management
// RELEVANT FILES: e2e/*.spec.ts, playwright.config.ts

import { Page } from '@playwright/test';
import type { DesignData as AppDesignData } from '@/shared/contracts';
import { templateRegistry } from '@/lib/import-export/templates';
import { componentIconMap } from '@/lib/design/component-icons';

type FixtureCategory = 'basic' | 'industry' | 'scalability' | 'legacy' | 'benchmark';

interface FixtureMetadata {
  name: string;
  category: FixtureCategory;
  description?: string;
  componentCount: number;
  connectionCount?: number;
  tags?: string[];
}

export interface ComponentData {
  type: string;
  name?: string;
  position: { x: number; y: number };
  properties?: Record<string, any>;
}

export interface AnnotationData {
  text: string;
  position: { x: number; y: number };
  style?: {
    color?: string;
    fontSize?: number;
    fontWeight?: string;
  };
}

export interface DesignData {
  name: string;
  description: string;
  components: ComponentData[];
  annotations: AnnotationData[];
  connections?: Array<{
    from: string;
    to: string;
    type?: string;
  }>;
}

export class TestDataManager {
  private static instance: TestDataManager;
  private fixtures: Map<string, DesignData> = new Map();
  private fixtureCategories: Map<string, FixtureCategory> = new Map();
  private fixtureMetadata: Map<string, FixtureMetadata> = new Map();

  public static getInstance(): TestDataManager {
    if (!TestDataManager.instance) {
      TestDataManager.instance = new TestDataManager();
    }
    return TestDataManager.instance;
  }

  constructor() {
    this.initializeFixtures();
    this.loadTemplatesFromRegistry();
  }

  private initializeFixtures(): void {
    // Core/basic examples
    // Simple web application design
    this.fixtures.set('simple-web-app', {
      name: 'Simple Web Application',
      description: 'Basic three-tier web application architecture',
      components: [
        {
          type: 'server',
          name: 'Web Server',
          position: { x: 150, y: 150 },
        },
        {
          type: 'database',
          name: 'Database',
          position: { x: 350, y: 150 },
        },
        {
          type: 'load-balancer',
          name: 'Load Balancer',
          position: { x: 50, y: 150 },
        },
      ],
      annotations: [
        {
          text: 'Handles HTTP requests and serves content',
          position: { x: 150, y: 250 },
        },
        {
          text: 'Stores application data and user information',
          position: { x: 350, y: 250 },
        },
        {
          text: 'Distributes traffic across multiple servers',
          position: { x: 50, y: 250 },
        },
      ],
      connections: [
        { from: 'load-balancer', to: 'server' },
        { from: 'server', to: 'database' },
      ],
    });
    this.fixtureCategories.set('simple-web-app', 'basic');
    this.fixtureMetadata.set('simple-web-app', {
      name: 'simple-web-app',
      category: 'basic',
      description: 'Basic three-tier web application architecture',
      componentCount: 3,
      connectionCount: 2,
      tags: ['web', 'three-tier']
    });

    // Microservices architecture
    this.fixtures.set('microservices', {
      name: 'Microservices Architecture',
      description: 'Complex microservices-based system',
      components: [
        {
          type: 'api-gateway',
          name: 'API Gateway',
          position: { x: 200, y: 100 },
        },
        {
          type: 'server',
          name: 'User Service',
          position: { x: 100, y: 200 },
        },
        {
          type: 'server',
          name: 'Order Service',
          position: { x: 300, y: 200 },
        },
        {
          type: 'database',
          name: 'User DB',
          position: { x: 100, y: 300 },
        },
        {
          type: 'database',
          name: 'Order DB',
          position: { x: 300, y: 300 },
        },
        {
          type: 'cache',
          name: 'Redis Cache',
          position: { x: 500, y: 200 },
        },
      ],
      annotations: [
        {
          text: 'Routes requests to appropriate services',
          position: { x: 200, y: 50 },
        },
        {
          text: 'Manages user authentication and profiles',
          position: { x: 100, y: 350 },
        },
        {
          text: 'Handles order processing and fulfillment',
          position: { x: 300, y: 350 },
        },
        {
          text: 'Caches frequently accessed data',
          position: { x: 500, y: 150 },
        },
      ],
    });
    this.fixtureCategories.set('microservices', 'basic');
    this.fixtureMetadata.set('microservices', {
      name: 'microservices',
      category: 'basic',
      description: 'Complex microservices-based system',
      componentCount: 6,
      tags: ['microservices']
    });

    // Performance testing scenario
    this.fixtures.set('performance-test', {
      name: 'Performance Test Scenario',
      description: 'Large-scale architecture for performance testing',
      components: Array.from({ length: 20 }, (_, i) => ({
        type:
          i % 4 === 0 ? 'server' : i % 4 === 1 ? 'database' : i % 4 === 2 ? 'cache' : 'api-gateway',
        name: `Component ${i + 1}`,
        position: {
          x: 100 + (i % 5) * 150,
          y: 100 + Math.floor(i / 5) * 100,
        },
      })),
      annotations: Array.from({ length: 15 }, (_, i) => ({
        text: `Performance annotation ${i + 1} - testing system under load`,
        position: {
          x: 150 + (i % 4) * 200,
          y: 50 + Math.floor(i / 4) * 80,
        },
      })),
    });
    this.fixtureCategories.set('performance-test', 'basic');
    this.fixtureMetadata.set('performance-test', {
      name: 'performance-test',
      category: 'basic',
      description: 'Large-scale architecture for performance testing',
      componentCount: 20,
      tags: ['performance']
    });

    // Mobile app backend
    this.fixtures.set('mobile-backend', {
      name: 'Mobile App Backend',
      description: 'Backend services for mobile application',
      components: [
        {
          type: 'api-gateway',
          name: 'Mobile API Gateway',
          position: { x: 200, y: 100 },
        },
        {
          type: 'server',
          name: 'Auth Service',
          position: { x: 100, y: 200 },
        },
        {
          type: 'server',
          name: 'Content Service',
          position: { x: 300, y: 200 },
        },
        {
          type: 'server',
          name: 'Push Notification Service',
          position: { x: 500, y: 200 },
        },
        {
          type: 'database',
          name: 'MongoDB',
          position: { x: 200, y: 300 },
        },
        {
          type: 'cache',
          name: 'Content Cache',
          position: { x: 400, y: 300 },
        },
      ],
      annotations: [
        {
          text: 'Handles mobile app API requests',
          position: { x: 200, y: 50 },
        },
        {
          text: 'User authentication and session management',
          position: { x: 100, y: 350 },
        },
        {
          text: 'Serves app content and media',
          position: { x: 300, y: 350 },
        },
        {
          text: 'Manages push notifications to mobile devices',
          position: { x: 500, y: 350 },
        },
      ],
    });
    this.fixtureCategories.set('mobile-backend', 'basic');
    this.fixtureMetadata.set('mobile-backend', {
      name: 'mobile-backend',
      category: 'basic',
      description: 'Backend services for mobile application',
      componentCount: 6,
      tags: ['mobile']
    });

    // Extended fixtures
    this.addIndustryFixtures();
    this.addScalabilityFixtures();
    this.addLegacyFixtures();
    this.addBenchmarkFixtures();
  }

  // Prefer app-level templates (TemplateRegistry) to avoid fixture drift
  public loadTemplatesFromRegistry(): void {
    try {
      const all = templateRegistry.getAllTemplates();
      for (const { name, category, data } of all) {
        const plain = name.includes(':') ? name.split(':')[1] : name;
        const key = `${category}-${plain}`.toLowerCase();
        const e2eData = TestUtils.convertAppTemplateToE2E(data as AppDesignData);
        this.fixtures.set(key, e2eData);
        this.fixtureCategories.set(key, category as FixtureCategory);
        this.fixtureMetadata.set(key, {
          name: key,
          category: category as FixtureCategory,
          description: e2eData.description,
          componentCount: e2eData.components.length,
          connectionCount: e2eData.connections?.length || 0,
          tags: Array.isArray((data.metadata as any)?.tags) ? ((data.metadata as any).tags as string[]) : [],
        });
      }
    } catch (err) {
      console.warn('TemplateRegistry integration failed:', (err as Error).message);
    }
  }

  // ---------------------
  // Industry fixtures
  // ---------------------
  private addIndustryFixtures(): void {
    const ecommerce = this.createECommerceArchitecture();
    this.fixtures.set('industry-ecommerce', ecommerce);
    this.fixtureCategories.set('industry-ecommerce', 'industry');
    this.fixtureMetadata.set('industry-ecommerce', {
      name: 'industry-ecommerce',
      category: 'industry',
      description: 'Comprehensive e-commerce platform architecture',
      componentCount: ecommerce.components.length,
      connectionCount: ecommerce.connections?.length || 0,
      tags: ['industry', 'ecommerce']
    });

    const fintech = this.createFintechPlatform();
    this.fixtures.set('industry-fintech', fintech);
    this.fixtureCategories.set('industry-fintech', 'industry');
    this.fixtureMetadata.set('industry-fintech', {
      name: 'industry-fintech',
      category: 'industry',
      description: 'Financial services architecture with compliance',
      componentCount: fintech.components.length,
      connectionCount: fintech.connections?.length || 0,
      tags: ['industry', 'fintech']
    });

    const healthcare = this.createHealthcareSystem();
    this.fixtures.set('industry-healthcare', healthcare);
    this.fixtureCategories.set('industry-healthcare', 'industry');
    this.fixtureMetadata.set('industry-healthcare', {
      name: 'industry-healthcare',
      category: 'industry',
      description: 'HIPAA-compliant healthcare system architecture',
      componentCount: healthcare.components.length,
      connectionCount: healthcare.connections?.length || 0,
      tags: ['industry', 'healthcare']
    });

    const gaming = this.createGamingPlatform();
    this.fixtures.set('industry-gaming', gaming);
    this.fixtureCategories.set('industry-gaming', 'industry');
    this.fixtureMetadata.set('industry-gaming', {
      name: 'industry-gaming',
      category: 'industry',
      description: 'Real-time gaming platform architecture',
      componentCount: gaming.components.length,
      connectionCount: gaming.connections?.length || 0,
      tags: ['industry', 'gaming']
    });
  }

  private createECommerceArchitecture(): DesignData {
    const components: ComponentData[] = [
      { type: 'web-app', name: 'Web App', position: { x: 100, y: 80 } },
      { type: 'mobile-app', name: 'Mobile App', position: { x: 100, y: 160 } },
      { type: 'cdn', name: 'CDN', position: { x: 260, y: 120 } },
      { type: 'load-balancer', name: 'Load Balancer', position: { x: 380, y: 120 } },
      { type: 'api-gateway', name: 'API Gateway', position: { x: 520, y: 120 } },
      { type: 'microservice', name: 'User Service', position: { x: 680, y: 40 } },
      { type: 'microservice', name: 'Product Service', position: { x: 680, y: 100 } },
      { type: 'microservice', name: 'Order Service', position: { x: 680, y: 160 } },
      { type: 'microservice', name: 'Payment Service', position: { x: 680, y: 220 } },
      { type: 'microservice', name: 'Inventory Service', position: { x: 680, y: 280 } },
      { type: 'redis', name: 'Redis Cache', position: { x: 840, y: 100 } },
      { type: 'postgresql', name: 'Orders DB', position: { x: 840, y: 160 } },
      { type: 'mongodb', name: 'Catalog DB', position: { x: 840, y: 220 } },
      { type: 'elasticsearch', name: 'Search', position: { x: 840, y: 280 } },
      { type: 'monitoring', name: 'Monitoring', position: { x: 1000, y: 80 } },
      { type: 'security', name: 'Security', position: { x: 1000, y: 160 } },
    ];

    const connections = [
      { from: 'web-app', to: 'cdn' },
      { from: 'mobile-app', to: 'api-gateway' },
      { from: 'cdn', to: 'load-balancer' },
      { from: 'load-balancer', to: 'api-gateway' },
      { from: 'api-gateway', to: 'user-service' },
      { from: 'api-gateway', to: 'product-service' },
      { from: 'api-gateway', to: 'order-service' },
      { from: 'api-gateway', to: 'payment-service' },
      { from: 'api-gateway', to: 'inventory-service' },
    ];

    const annotations: AnnotationData[] = [
      { text: 'Presentation Layer', position: { x: 140, y: 40 } },
      { text: 'API Layer', position: { x: 520, y: 80 } },
      { text: 'Service Layer', position: { x: 700, y: 10 } },
      { text: 'Data Layer', position: { x: 860, y: 70 } },
    ];

    return {
      name: 'E-Commerce Platform',
      description: 'Complete e-commerce platform with services and data stores',
      components,
      annotations,
      connections: connections.map(c => ({ from: c.from, to: c.to }))
    };
  }

  private createFintechPlatform(): DesignData {
    const components: ComponentData[] = [
      { type: 'web-app', name: 'Customer Portal', position: { x: 100, y: 100 } },
      { type: 'api-gateway', name: 'API Gateway', position: { x: 300, y: 100 } },
      { type: 'authentication', name: 'Authentication', position: { x: 480, y: 40 } },
      { type: 'authorization', name: 'Authorization', position: { x: 480, y: 100 } },
      { type: 'security', name: 'Encryption', position: { x: 480, y: 160 } },
      { type: 'microservice', name: 'Payment Gateway', position: { x: 680, y: 40 } },
      { type: 'microservice', name: 'Fraud Detection', position: { x: 680, y: 100 } },
      { type: 'microservice', name: 'Compliance Service', position: { x: 680, y: 160 } },
      { type: 'data-warehouse', name: 'Data Warehouse', position: { x: 880, y: 100 } },
      { type: 'logging', name: 'Audit Logging', position: { x: 1080, y: 100 } },
    ];
    const annotations: AnnotationData[] = [
      { text: 'PCI & Compliance Zone', position: { x: 650, y: 10 } },
    ];
    return {
      name: 'Fintech Platform',
      description: 'Financial services architecture with security and compliance',
      components,
      annotations,
      connections: [
        { from: 'customer-portal', to: 'api-gateway' },
        { from: 'api-gateway', to: 'authentication' },
        { from: 'api-gateway', to: 'authorization' },
        { from: 'api-gateway', to: 'payment-gateway' },
        { from: 'payment-gateway', to: 'fraud-detection' },
        { from: 'compliance-service', to: 'audit-logging' },
      ]
    } as DesignData;
  }

  private createHealthcareSystem(): DesignData {
    const components: ComponentData[] = [
      { type: 'web-app', name: 'Patient Portal', position: { x: 100, y: 100 } },
      { type: 'api-gateway', name: 'API Gateway', position: { x: 300, y: 100 } },
      { type: 'microservice', name: 'EHR System', position: { x: 500, y: 40 } },
      { type: 'microservice', name: 'Appointment Service', position: { x: 500, y: 100 } },
      { type: 'microservice', name: 'Billing Service', position: { x: 500, y: 160 } },
      { type: 'microservice', name: 'Lab Integration', position: { x: 700, y: 40 } },
      { type: 'microservice', name: 'Imaging Service', position: { x: 700, y: 100 } },
      { type: 'security', name: 'HIPAA Compliance', position: { x: 700, y: 160 } },
      { type: 'message-queue', name: 'Secure Messaging', position: { x: 900, y: 100 } },
    ];
    const annotations: AnnotationData[] = [
      { text: 'PHI Boundary', position: { x: 680, y: 10 } },
    ];
    return {
      name: 'Healthcare System',
      description: 'Healthcare platform with EHR, appointments, and HIPAA compliance',
      components,
      annotations,
      connections: [
        { from: 'patient-portal', to: 'api-gateway' },
        { from: 'api-gateway', to: 'ehr-system' },
        { from: 'api-gateway', to: 'appointment-service' },
        { from: 'api-gateway', to: 'billing-service' },
        { from: 'ehr-system', to: 'secure-messaging' },
      ]
    } as DesignData;
  }

  private createGamingPlatform(): DesignData {
    const components: ComponentData[] = [
      { type: 'client', name: 'Game Client', position: { x: 100, y: 100 } },
      { type: 'websocket', name: 'Realtime Messaging', position: { x: 300, y: 100 } },
      { type: 'microservice', name: 'Matchmaking', position: { x: 500, y: 40 } },
      { type: 'server', name: 'Game Server', position: { x: 500, y: 100 } },
      { type: 'microservice', name: 'Leaderboard Service', position: { x: 500, y: 160 } },
      { type: 'microservice', name: 'Chat Service', position: { x: 700, y: 100 } },
      { type: 'redis', name: 'Session Management', position: { x: 900, y: 60 } },
      { type: 'mongodb', name: 'Player Data', position: { x: 900, y: 140 } },
      { type: 'security', name: 'Anti-cheat', position: { x: 1100, y: 100 } },
      { type: 'elasticsearch', name: 'Analytics', position: { x: 1300, y: 100 } },
    ];
    const annotations: AnnotationData[] = [
      { text: 'Low latency realtime path', position: { x: 320, y: 60 } },
    ];
    return {
      name: 'Gaming Platform',
      description: 'Multiplayer gaming platform with realtime services',
      components,
      annotations,
      connections: [
        { from: 'game-client', to: 'realtime-messaging' },
        { from: 'realtime-messaging', to: 'game-server' },
        { from: 'game-server', to: 'session-management' },
        { from: 'game-server', to: 'player-data' },
      ]
    } as DesignData;
  }

  // ---------------------
  // Scalability fixtures
  // ---------------------
  private addScalabilityFixtures(): void {
    const ms = this.createMicroservicesEcosystem(50);
    this.fixtures.set('scalability-microservices-ecosystem', ms);
    this.fixtureCategories.set('scalability-microservices-ecosystem', 'scalability');
    this.fixtureMetadata.set('scalability-microservices-ecosystem', {
      name: 'scalability-microservices-ecosystem',
      category: 'scalability',
      description: '50+ microservices with service mesh and observability',
      componentCount: ms.components.length,
      connectionCount: ms.connections?.length || 0,
      tags: ['microservices', 'service-mesh']
    });

    const serverless = this.createServerlessArchitecture();
    this.fixtures.set('scalability-serverless', serverless);
    this.fixtureCategories.set('scalability-serverless', 'scalability');
    this.fixtureMetadata.set('scalability-serverless', {
      name: 'scalability-serverless',
      category: 'scalability',
      description: 'Event-driven serverless architecture',
      componentCount: serverless.components.length,
      connectionCount: serverless.connections?.length || 0,
      tags: ['serverless', 'event-driven']
    });

    const dist = this.createDistributedSystem();
    this.fixtures.set('scalability-distributed-cqrs', dist);
    this.fixtureCategories.set('scalability-distributed-cqrs', 'scalability');
    this.fixtureMetadata.set('scalability-distributed-cqrs', {
      name: 'scalability-distributed-cqrs',
      category: 'scalability',
      description: 'CQRS/Event Sourcing distributed system',
      componentCount: dist.components.length,
      connectionCount: dist.connections?.length || 0,
      tags: ['cqrs', 'event-sourcing']
    });
  }

  private createMicroservicesEcosystem(count: number = 50): DesignData {
    const components: ComponentData[] = [];
    const annotations: AnnotationData[] = [
      { text: 'Service Mesh + Discovery + Tracing', position: { x: 150, y: 40 } },
    ];

    // Core infra
    components.push(
      { type: 'api-gateway', name: 'API Gateway', position: { x: 80, y: 100 } },
      { type: 'server', name: 'Service Discovery', position: { x: 80, y: 180 } },
      { type: 'server', name: 'Config Service', position: { x: 80, y: 260 } },
      { type: 'monitoring', name: 'Monitoring', position: { x: 80, y: 340 } },
      { type: 'logging', name: 'Logging', position: { x: 80, y: 420 } },
      { type: 'metrics', name: 'Metrics', position: { x: 80, y: 500 } },
    );

    // Services grid
    const cols = 10;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      components.push({
        type: 'microservice',
        name: `Service ${i + 1}`,
        position: { x: 260 + col * 120, y: 80 + row * 80 },
      });
    }

    return {
      name: 'Microservices Ecosystem',
      description: `${count} microservices with platform services`,
      components,
      annotations,
    };
  }

  private createServerlessArchitecture(): DesignData {
    const components: ComponentData[] = [
      { type: 'api-gateway', name: 'API Gateway', position: { x: 100, y: 100 } },
      { type: 'lambda', name: 'Auth Lambda', position: { x: 300, y: 60 } },
      { type: 'lambda', name: 'Orders Lambda', position: { x: 300, y: 120 } },
      { type: 'lambda', name: 'Payments Lambda', position: { x: 300, y: 180 } },
      { type: 's3', name: 'S3 Bucket', position: { x: 500, y: 60 } },
      { type: 'dynamodb', name: 'DynamoDB', position: { x: 500, y: 120 } },
      { type: 'message-queue', name: 'SQS Queue', position: { x: 500, y: 180 } },
      { type: 'monitoring', name: 'CloudWatch', position: { x: 700, y: 120 } },
    ];
    return {
      name: 'Serverless Architecture',
      description: 'Event-driven serverless with functions and managed services',
      components,
      annotations: [
        { text: 'Event Sources → Lambda → Storage/Queues', position: { x: 120, y: 60 } },
      ],
      connections: [
        { from: 'api-gateway', to: 'auth-lambda' },
        { from: 'api-gateway', to: 'orders-lambda' },
        { from: 'orders-lambda', to: 'dynamodb' },
        { from: 'payments-lambda', to: 'sqs-queue' },
      ]
    } as DesignData;
  }

  private createDistributedSystem(): DesignData {
    const components: ComponentData[] = [
      { type: 'cqrs', name: 'CQRS', position: { x: 120, y: 40 } },
      { type: 'microservice', name: 'Command Service', position: { x: 120, y: 120 } },
      { type: 'microservice', name: 'Query Service', position: { x: 120, y: 200 } },
      { type: 'event-sourcing', name: 'Event Store', position: { x: 320, y: 120 } },
      { type: 'database', name: 'Read Model', position: { x: 520, y: 200 } },
      { type: 'server', name: 'Saga Orchestrator', position: { x: 320, y: 40 } },
      { type: 'cache', name: 'Distributed Cache', position: { x: 520, y: 120 } },
    ];
    return {
      name: 'Distributed CQRS System',
      description: 'CQRS + Event Sourcing with orchestrator and caches',
      components,
      annotations: [
        { text: 'Commands → Events → Projections', position: { x: 320, y: 10 } },
      ],
      connections: [
        { from: 'command-service', to: 'event-store' },
        { from: 'event-store', to: 'read-model' },
        { from: 'saga-orchestrator', to: 'command-service' },
      ]
    } as DesignData;
  }

  // ---------------------
  // Legacy fixtures
  // ---------------------
  private addLegacyFixtures(): void {
    const mainframe = this.createMainframeBridge();
    this.fixtures.set('legacy-mainframe-bridge', mainframe);
    this.fixtureCategories.set('legacy-mainframe-bridge', 'legacy');
    this.fixtureMetadata.set('legacy-mainframe-bridge', {
      name: 'legacy-mainframe-bridge',
      category: 'legacy',
      description: 'COBOL/DB2 integration with modern APIs',
      componentCount: mainframe.components.length,
      connectionCount: mainframe.connections?.length || 0,
      tags: ['legacy', 'mainframe']
    });

    const ftp = this.createFtpIntegration();
    this.fixtures.set('legacy-ftp-integration', ftp);
    this.fixtureCategories.set('legacy-ftp-integration', 'legacy');
    this.fixtureMetadata.set('legacy-ftp-integration', {
      name: 'legacy-ftp-integration',
      category: 'legacy',
      description: 'File-based integration with FTP and batch processing',
      componentCount: ftp.components.length,
      connectionCount: ftp.connections?.length || 0,
      tags: ['legacy', 'ftp']
    });
  }

  private createMainframeBridge(): DesignData {
    const components: ComponentData[] = [
      { type: 'server', name: 'Mainframe (COBOL)', position: { x: 100, y: 100 } },
      { type: 'database', name: 'DB2', position: { x: 100, y: 180 } },
      { type: 'message-queue', name: 'MQ Series', position: { x: 100, y: 260 } },
      { type: 'server', name: 'Batch Processing', position: { x: 100, y: 340 } },
      { type: 'api-gateway', name: 'Modern API Gateway', position: { x: 360, y: 160 } },
      { type: 'server', name: 'Transformation Service', position: { x: 240, y: 220 } },
      { type: 'security', name: 'Authentication Bridge', position: { x: 240, y: 100 } },
      { type: 'logging', name: 'Audit Service', position: { x: 520, y: 160 } },
      { type: 'monitoring', name: 'Monitoring', position: { x: 680, y: 160 } },
    ];
    const annotations: AnnotationData[] = [
      { text: 'Legacy Zone', position: { x: 80, y: 60 } },
      { text: 'Bridge/Integration Layer', position: { x: 260, y: 60 } },
    ];
    return {
      name: 'Mainframe Bridge',
      description: 'Legacy mainframe integration with modern API wrapper',
      components,
      annotations,
      connections: [
        { from: 'mainframe-(cobol)', to: 'transformation-service' },
        { from: 'transformation-service', to: 'modern-api-gateway' },
        { from: 'authentication-bridge', to: 'modern-api-gateway' },
        { from: 'modern-api-gateway', to: 'audit-service' },
      ]
    } as DesignData;
  }

  private createFtpIntegration(): DesignData {
    const components: ComponentData[] = [
      { type: 'server', name: 'FTP Server', position: { x: 100, y: 120 } },
      { type: 'server', name: 'File Watcher', position: { x: 260, y: 120 } },
      { type: 'server', name: 'Batch Processor', position: { x: 420, y: 120 } },
      { type: 'server', name: 'Transformation Service', position: { x: 580, y: 120 } },
      { type: 'server', name: 'Error Handler', position: { x: 740, y: 120 } },
      { type: 'message-queue', name: 'Notification Service', position: { x: 900, y: 120 } },
      { type: 'storage', name: 'Archive Storage', position: { x: 740, y: 200 } },
      { type: 'monitoring', name: 'Monitoring', position: { x: 900, y: 200 } },
    ];
    return {
      name: 'FTP Integration',
      description: 'File-based integration with error handling and notifications',
      components,
      annotations: [
        { text: 'Pickup → Process → Transform → Deliver', position: { x: 200, y: 80 } },
      ],
      connections: [
        { from: 'ftp-server', to: 'file-watcher' },
        { from: 'file-watcher', to: 'batch-processor' },
        { from: 'batch-processor', to: 'transformation-service' },
        { from: 'transformation-service', to: 'error-handler' },
        { from: 'error-handler', to: 'notification-service' },
      ]
    } as DesignData;
  }

  // ---------------------
  // Benchmark fixtures
  // ---------------------
  private addBenchmarkFixtures(): void {
    const b100 = this.createBenchmark(100, 'Benchmark 100');
    this.fixtures.set('benchmark-100', b100);
    this.fixtureCategories.set('benchmark-100', 'benchmark');
    this.fixtureMetadata.set('benchmark-100', {
      name: 'benchmark-100',
      category: 'benchmark',
      description: '100 components baseline performance test',
      componentCount: 100,
      tags: ['benchmark']
    });

    const b250 = this.createBenchmark(250, 'Benchmark 250');
    this.fixtures.set('benchmark-250', b250);
    this.fixtureCategories.set('benchmark-250', 'benchmark');
    this.fixtureMetadata.set('benchmark-250', {
      name: 'benchmark-250',
      category: 'benchmark',
      description: '250 components stress test',
      componentCount: 250,
      tags: ['benchmark']
    });

    const b500 = this.createBenchmark(500, 'Benchmark 500');
    this.fixtures.set('benchmark-500', b500);
    this.fixtureCategories.set('benchmark-500', 'benchmark');
    this.fixtureMetadata.set('benchmark-500', {
      name: 'benchmark-500',
      category: 'benchmark',
      description: '500 components maximum load test',
      componentCount: 500,
      tags: ['benchmark']
    });
  }

  private createBenchmark(count: number, title: string): DesignData {
    const components: ComponentData[] = [];
    const cols = 20;
    const spacingX = 80;
    const spacingY = 70;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const type = i % 5 === 0 ? 'server' : i % 5 === 1 ? 'database' : i % 5 === 2 ? 'cache' : i % 5 === 3 ? 'api-gateway' : 'microservice';
      const label = `${type}-${i + 1}`;
      components.push({
        type,
        name: label,
        position: { x: 80 + col * spacingX, y: 80 + row * spacingY },
      });
    }
    return {
      name: title,
      description: `${count} components in optimized grid layout`,
      components,
      annotations: [
        { text: `Benchmark template: ${count} components`, position: { x: 60, y: 40 } },
      ],
    };
  }

  public getFixture(name: string): DesignData | undefined {
    return this.fixtures.get(name);
  }

  public getAllFixtures(): Map<string, DesignData> {
    return new Map(this.fixtures);
  }

  public getFixturesByCategory(category: FixtureCategory | string): Array<{ key: string; data: DesignData }> {
    const results: Array<{ key: string; data: DesignData }> = [];
    for (const [key, data] of this.fixtures.entries()) {
      const cat = this.fixtureCategories.get(key);
      if (cat === (category as FixtureCategory)) {
        results.push({ key, data });
      }
    }
    return results;
  }

  public getFixtureMetadata(name: string): FixtureMetadata | undefined {
    return this.fixtureMetadata.get(name);
  }

  public validateFixtureIntegrity(design: DesignData): { valid: boolean; missingTypes: string[] } {
    // Source from app palette component icon map for DRY list of types
    const knownTypes = new Set<string>(Object.keys(componentIconMap));
    // Stopgap: include planned/common types that may appear in tests/templates
    ['sqs', 'sns', 'kinesis', 'serverless', 'kafka', 'rabbitmq'].forEach(t => knownTypes.add(t));

    const missing = Array.from(new Set(design.components.map(c => c.type))).filter(t => !knownTypes.has(t));
    return { valid: missing.length === 0, missingTypes: missing };
  }

  public createRandomDesign(componentCount: number = 5): DesignData {
    const componentTypes = ['server', 'database', 'cache', 'api-gateway', 'load-balancer'];
    const components: ComponentData[] = [];
    const annotations: AnnotationData[] = [];

    for (let i = 0; i < componentCount; i++) {
      const type = componentTypes[Math.floor(Math.random() * componentTypes.length)];
      const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`;

      components.push({
        type,
        name,
        position: {
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 300,
        },
      });

      // Add annotation for some components
      if (Math.random() > 0.5) {
        annotations.push({
          text: `Random annotation for ${name}`,
          position: {
            x: 100 + Math.random() * 400,
            y: 400 + Math.random() * 100,
          },
        });
      }
    }

    return {
      name: 'Random Test Design',
      description: `Randomly generated design with ${componentCount} components`,
      components,
      annotations,
    };
  }

  public async applyDesignToCanvas(page: Page, design: DesignData): Promise<void> {
    const canvas = page.locator('[data-testid="canvas"]');

    // Wait for canvas to be ready
    await canvas.waitFor({ state: 'visible' });

    if ((design.components?.length || 0) >= 200) {
      await TestUtils.zoomOut(page, 3);
      await page.waitForTimeout(200);
    }

    // Add components
    for (const component of design.components) {
      const paletteItem = page.locator(`[data-testid="palette-item-${component.type}"]`).first();
      await TestUtils.retryOperation(async () => {
        if (!(await paletteItem.isVisible())) throw new Error(`Palette item not visible: ${component.type}`);
        const before = await page.locator('.react-flow__node').count();
        await paletteItem.dragTo(canvas, { targetPosition: component.position });
        await page.waitForTimeout(150);
        const after = await page.locator('.react-flow__node').count();
        if (after <= before) throw new Error(`Drop did not add node for ${component.type}`);
      }, 3, 250);

      if (component.name) {
        try {
          await canvas.click({ position: component.position });
          const labelInput = page.getByPlaceholder('Enter component label...');
          await labelInput.waitFor({ state: 'visible', timeout: 2000 });
          await labelInput.fill(component.name);
          await page.waitForTimeout(50);
        } catch (e) {
          console.warn(`Unable to set label for ${component.type}: ${(e as Error).message}`);
        }
      }
    }

    // Add annotations
    for (const annotation of design.annotations) {
      await canvas.dblclick({ position: annotation.position });

      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill(annotation.text);
        await textarea.press('Control+Enter');

        // Brief pause between annotations
        await page.waitForTimeout(300);
      }
    }

    // Allow final rendering
    await page.waitForTimeout(1000);
  }

  public async verifyDesignOnCanvas(page: Page, design: DesignData): Promise<boolean> {
    // Verify components (case-insensitive; accept provided name or display name)
    for (const component of design.components) {
      const candidates = Array.from(new Set([
        component.name?.trim(),
        this.getComponentDisplayName(component.type).trim(),
      ].filter(Boolean) as string[]));

      let found = false;
      for (const cand of candidates) {
        const pattern = new RegExp(cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const node = page.locator('.react-flow__node').filter({ hasText: pattern });
        if ((await node.count()) > 0) { found = true; break; }
      }
      if (!found) {
        console.log(`Component not found (type=${component.type}, tried=${candidates.join(' | ')})`);
        return false;
      }
    }

    // Verify annotations
    for (const annotation of design.annotations) {
      const annotationElement = page.getByText(annotation.text, { exact: false });

      if ((await annotationElement.count()) === 0) {
        console.log(`Annotation "${annotation.text}" not found on canvas`);
        return false;
      }
    }

    return true;
  }

  private getComponentDisplayName(type: string): string {
    // Humanize type for comparison; verification uses case-insensitive match
    return type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  public async exportDesignData(page: Page): Promise<any> {
    // Extract current design state from the page
    return await page.evaluate(() => {
      // This would interact with the app's state management
      // to extract current design data
      const designState = {
        components: [],
        annotations: [],
        timestamp: new Date().toISOString(),
      };

      // Extract React Flow nodes
      const nodes = document.querySelectorAll('.react-flow__node');
      nodes.forEach(node => {
        const textContent = node.textContent;
        const transform = node.getAttribute('style');

        if (textContent && transform) {
          // Parse position from transform
          const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
          if (match) {
            designState.components.push({
              name: textContent.trim(),
              position: {
                x: parseFloat(match[1]),
                y: parseFloat(match[2]),
              },
            });
          }
        }
      });

      // Extract annotations
      const annotations = document.querySelectorAll('[data-testid*="annotation"]');
      annotations.forEach(annotation => {
        const text = annotation.textContent;
        const rect = annotation.getBoundingClientRect();

        if (text) {
          designState.annotations.push({
            text: text.trim(),
            position: {
              x: rect.left,
              y: rect.top,
            },
          });
        }
      });

      return designState;
    });
  }

  public generateTestScenarios(): Array<{
    name: string;
    description: string;
    setup: () => Promise<void>;
    verify: (page: Page) => Promise<boolean>;
  }> {
    return [
      {
        name: 'Simple Web App Creation',
        description: 'Create a basic three-tier web application',
        setup: async () => {
          // Setup code for this scenario
        },
        verify: async (page: Page) => {
          const design = this.getFixture('simple-web-app')!;
          return await this.verifyDesignOnCanvas(page, design);
        },
      },
      {
        name: 'Microservices Architecture',
        description: 'Build a complex microservices system',
        setup: async () => {
          // Setup code for microservices scenario
        },
        verify: async (page: Page) => {
          const design = this.getFixture('microservices')!;
          return await this.verifyDesignOnCanvas(page, design);
        },
      },
      {
        name: 'Performance Stress Test',
        description: 'Test with large number of components',
        setup: async () => {
          // Setup for performance testing
        },
        verify: async (page: Page) => {
          const nodes = page.locator('.react-flow__node');
          const nodeCount = await nodes.count();
          return nodeCount >= 20;
        },
      },
    ];
  }
}

export class TestStateManager {
  private static instance: TestStateManager;
  private state: Map<string, any> = new Map();

  public static getInstance(): TestStateManager {
    if (!TestStateManager.instance) {
      TestStateManager.instance = new TestStateManager();
    }
    return TestStateManager.instance;
  }

  public setState(key: string, value: any): void {
    this.state.set(key, value);
  }

  public getState(key: string): any {
    return this.state.get(key);
  }

  public clearState(): void {
    this.state.clear();
  }

  public async savePageState(page: Page, stateName: string): Promise<void> {
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: Object.fromEntries(Object.entries(localStorage)),
        sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
        timestamp: new Date().toISOString(),
      };
    });

    this.setState(stateName, pageState);
  }

  public async restorePageState(page: Page, stateName: string): Promise<boolean> {
    const pageState = this.getState(stateName);

    if (!pageState) {
      return false;
    }

    try {
      // Navigate to the saved URL
      await page.goto(pageState.url);

      // Restore localStorage
      await page.evaluate(state => {
        Object.entries(state.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });
      }, pageState);

      // Restore sessionStorage
      await page.evaluate(state => {
        Object.entries(state.sessionStorage).forEach(([key, value]) => {
          sessionStorage.setItem(key, value as string);
        });
      }, pageState);

      // Reload to apply stored state
      await page.reload();

      return true;
    } catch (error) {
      console.error('Failed to restore page state:', error);
      return false;
    }
  }
}

export class TestUtils {
  public static async waitForStableCanvas(page: Page, timeout: number = 5000): Promise<void> {
    const canvas = page.locator('[data-testid="canvas"]');

    // Wait for canvas to be visible
    await canvas.waitFor({ state: 'visible', timeout });

    // Wait for React Flow to initialize
    const reactFlow = page.locator('.react-flow');
    await reactFlow.waitFor({ state: 'visible', timeout });

    // Wait for any initial animations to complete
    await page.waitForTimeout(1000);
  }

  public static async measureOperationTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    return {
      result,
      duration: endTime - startTime,
    };
  }

  public static async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt} failed: ${error}`);

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }

  public static async generateScreenshotFilename(
    testName: string,
    suffix?: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTestName = testName.replace(/[^a-zA-Z0-9-]/g, '_');

    let filename = `${sanitizedTestName}_${timestamp}`;
    if (suffix) {
      filename += `_${suffix}`;
    }
    filename += '.png';

    return filename;
  }

  public static async checkElementStability(
    page: Page,
    selector: string,
    durationMs: number = 2000
  ): Promise<boolean> {
    const element = page.locator(selector);

    if (!(await element.isVisible())) {
      return false;
    }

    const initialBoundingBox = await element.boundingBox();
    if (!initialBoundingBox) {
      return false;
    }

    await page.waitForTimeout(durationMs);

    const finalBoundingBox = await element.boundingBox();
    if (!finalBoundingBox) {
      return false;
    }

    // Check if position and size remained stable
    const tolerance = 1; // 1px tolerance

    return (
      Math.abs(initialBoundingBox.x - finalBoundingBox.x) <= tolerance &&
      Math.abs(initialBoundingBox.y - finalBoundingBox.y) <= tolerance &&
      Math.abs(initialBoundingBox.width - finalBoundingBox.width) <= tolerance &&
      Math.abs(initialBoundingBox.height - finalBoundingBox.height) <= tolerance
    );
  }

  public static async simulateTypingDelay(
    page: Page,
    selector: string,
    text: string,
    delayMs: number = 100
  ): Promise<void> {
    const element = page.locator(selector);
    await element.click();

    for (const char of text) {
      await element.type(char);
      await page.waitForTimeout(delayMs);
    }
  }

  public static async getPerformanceMetrics(page: Page): Promise<{
    memory?: number;
    timing: Record<string, number>;
  }> {
    return await page.evaluate(() => {
      const metrics: any = {
        timing: {},
      };

      // Memory usage (if available)
      if ((performance as any).memory) {
        metrics.memory = (performance as any).memory.usedJSHeapSize;
      }

      // Navigation timing
      if (performance.timing) {
        const timing = performance.timing;
        metrics.timing = {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          firstPaint: timing.loadEventStart - timing.navigationStart,
        };
      }

      // Performance entries
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const entry = entries[0] as PerformanceNavigationTiming;
        metrics.timing.dnsLookup = entry.domainLookupEnd - entry.domainLookupStart;
        metrics.timing.tcpConnect = entry.connectEnd - entry.connectStart;
        metrics.timing.serverResponse = entry.responseEnd - entry.responseStart;
      }

      return metrics;
    });
  }

  // Zoom-out helper to improve benchmark drop reliability
  public static async zoomOut(page: Page, steps: number = 2): Promise<void> {
    for (let i = 0; i < steps; i++) {
      try {
        await page.keyboard.down('Control');
        await page.keyboard.press('-');
        await page.keyboard.up('Control');
      } catch {}
      try {
        await page.keyboard.down('Meta');
        await page.keyboard.press('-');
        await page.keyboard.up('Meta');
      } catch {}
      await page.waitForTimeout(50);
    }
  }

  public static async ensurePointClickable(page: Page, selector: string, position: { x: number; y: number }): Promise<void> {
    const el = page.locator(selector);
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.hover({ position }).catch(() => {});
  }

  // Convert app-level templates to simplified E2E structure
  public static convertAppTemplateToE2E(template: AppDesignData): DesignData {
    const components: ComponentData[] = template.components.map(c => ({
      type: c.type,
      name: c.label,
      position: { x: Math.round(c.x), y: Math.round(c.y) },
    }));
    const annotations: AnnotationData[] = (template.infoCards || []).map(card => ({
      text: card.content,
      position: { x: card.x, y: card.y },
    }));
    const connections = (template.connections || []).map(conn => ({ from: conn.from, to: conn.to, type: conn.type }));
    return {
      name: (template.metadata?.description as string) || 'Template',
      description: (template.metadata?.description as string) || '',
      components,
      annotations,
      connections,
    };
  }
}

// Export singleton instances
export const testDataManager = TestDataManager.getInstance();
export const testStateManager = TestStateManager.getInstance();
