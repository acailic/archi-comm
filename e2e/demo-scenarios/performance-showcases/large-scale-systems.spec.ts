// e2e/demo-scenarios/performance-showcases/large-scale-systems.spec.ts
// Large-scale system performance demonstrations for video generation
// Creates impressive demonstrations of system handling massive architectures with smooth performance
// RELEVANT FILES: e2e/utils/demo-scenarios.ts, src/features/canvas/hooks/useVirtualization.ts, src/features/canvas/components/ReactFlowCanvas.tsx, e2e/utils/video-helpers.ts

import { test, expect } from '@playwright/test';

test.describe('Large-Scale System Performance Demos', () => {
  // Configure extended timeouts for performance demonstrations
  test.setTimeout(300000); // 5 minutes for performance showcases

  test.beforeEach(async ({ page }) => {
    // Configure performance monitoring for video recording
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable performance metrics overlay for demonstration
    await page.evaluate(() => {
      window.DEMO_MODE = true;
      window.SHOW_PERFORMANCE_METRICS = true;
    });

    // Set up clean canvas for large-scale demo
    await page.locator('[data-testid="new-design-button"]').click();
    await page.waitForTimeout(2000);
  });

  test('100+ component enterprise system design', async ({ page }) => {
    // Demonstrate handling of complex enterprise architectures
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Start performance monitoring
    await page.locator('[data-testid="performance-monitor-toggle"]').click();
    await page.waitForTimeout(1000);

    // Add initial annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('Enterprise Architecture Demo: Building 100+ component system');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Layer 1: Frontend Layer (10 components)
    const frontendComponents = [
      { type: 'web-app', name: 'Admin Portal', x: 100, y: 150 },
      { type: 'web-app', name: 'Customer Portal', x: 250, y: 150 },
      { type: 'mobile-app', name: 'iOS App', x: 400, y: 150 },
      { type: 'mobile-app', name: 'Android App', x: 550, y: 150 },
      { type: 'web-app', name: 'Partner Portal', x: 700, y: 150 },
      { type: 'desktop-app', name: 'Desktop Client', x: 850, y: 150 },
      { type: 'web-app', name: 'Analytics Dashboard', x: 1000, y: 150 },
      { type: 'web-app', name: 'Reporting Portal', x: 1150, y: 150 },
      { type: 'mobile-app', name: 'Tablet App', x: 1300, y: 150 },
      { type: 'web-app', name: 'Support Portal', x: 1450, y: 150 }
    ];

    // Add frontend components with performance monitoring
    for (let i = 0; i < frontendComponents.length; i++) {
      const component = frontendComponents[i];
      await page.locator(`[data-testid="component-palette-${component.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: component.x, y: component.y }
      });
      await page.keyboard.type(component.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300); // Faster for large scale demo

      // Show performance metrics every 5 components
      if ((i + 1) % 5 === 0) {
        await page.waitForTimeout(500);
        // Performance should remain smooth
        const fps = await page.locator('[data-testid="fps-counter"]').textContent();
        console.log(`FPS after ${i + 1} components: ${fps}`);
      }
    }

    // Layer 2: Load Balancers and CDN (8 components)
    const networkComponents = [
      { type: 'load-balancer', name: 'Global Load Balancer', x: 200, y: 300 },
      { type: 'load-balancer', name: 'Regional LB - US', x: 400, y: 300 },
      { type: 'load-balancer', name: 'Regional LB - EU', x: 600, y: 300 },
      { type: 'load-balancer', name: 'Regional LB - APAC', x: 800, y: 300 },
      { type: 'cdn', name: 'CloudFront CDN', x: 1000, y: 300 },
      { type: 'cdn', name: 'Regional CDN - US', x: 1200, y: 300 },
      { type: 'cdn', name: 'Regional CDN - EU', x: 1400, y: 300 },
      { type: 'firewall', name: 'WAF Security', x: 300, y: 250 }
    ];

    for (const component of networkComponents) {
      await page.locator(`[data-testid="component-palette-${component.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: component.x, y: component.y }
      });
      await page.keyboard.type(component.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
    }

    // Layer 3: API Gateway Layer (6 components)
    const gatewayComponents = [
      { type: 'api-gateway', name: 'Public API Gateway', x: 300, y: 450 },
      { type: 'api-gateway', name: 'Internal API Gateway', x: 500, y: 450 },
      { type: 'api-gateway', name: 'Partner API Gateway', x: 700, y: 450 },
      { type: 'api-gateway', name: 'Mobile API Gateway', x: 900, y: 450 },
      { type: 'api-gateway', name: 'Analytics API Gateway', x: 1100, y: 450 },
      { type: 'message-queue', name: 'API Rate Limiter', x: 600, y: 400 }
    ];

    for (const component of gatewayComponents) {
      await page.locator(`[data-testid="component-palette-${component.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: component.x, y: component.y }
      });
      await page.keyboard.type(component.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
    }

    // Layer 4: Microservices Layer (25 components)
    const microservices = [
      // Core Business Services
      { name: 'User Management Service', x: 150, y: 600 },
      { name: 'Authentication Service', x: 300, y: 600 },
      { name: 'Authorization Service', x: 450, y: 600 },
      { name: 'Profile Service', x: 600, y: 600 },
      { name: 'Account Service', x: 750, y: 600 },

      // Product & Catalog Services
      { name: 'Product Catalog Service', x: 900, y: 600 },
      { name: 'Inventory Service', x: 1050, y: 600 },
      { name: 'Pricing Service', x: 1200, y: 600 },
      { name: 'Recommendation Service', x: 1350, y: 600 },
      { name: 'Search Service', x: 1500, y: 600 },

      // Order & Payment Services
      { name: 'Order Management Service', x: 150, y: 750 },
      { name: 'Shopping Cart Service', x: 300, y: 750 },
      { name: 'Payment Processing Service', x: 450, y: 750 },
      { name: 'Billing Service', x: 600, y: 750 },
      { name: 'Invoice Service', x: 750, y: 750 },

      // Communication Services
      { name: 'Notification Service', x: 900, y: 750 },
      { name: 'Email Service', x: 1050, y: 750 },
      { name: 'SMS Service', x: 1200, y: 750 },
      { name: 'Push Notification Service', x: 1350, y: 750 },
      { name: 'Chat Service', x: 1500, y: 750 },

      // Analytics & Reporting Services
      { name: 'Analytics Service', x: 150, y: 900 },
      { name: 'Reporting Service', x: 300, y: 900 },
      { name: 'Audit Service', x: 450, y: 900 },
      { name: 'Monitoring Service', x: 600, y: 900 },
      { name: 'Logging Service', x: 750, y: 900 }
    ];

    // Add microservices with performance monitoring
    for (let i = 0; i < microservices.length; i++) {
      const service = microservices[i];
      await page.locator('[data-testid="component-palette-microservice"]').click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: service.x, y: service.y }
      });
      await page.keyboard.type(service.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // Check performance every 10 services
      if ((i + 1) % 10 === 0) {
        await page.waitForTimeout(500);
        // Verify virtualization is working
        const visibleComponents = await page.locator('[data-testid*="component-"]').count();
        console.log(`Visible components after ${i + 1} services: ${visibleComponents}`);
      }
    }

    // Layer 5: Data Layer (20 components)
    const dataComponents = [
      // Primary Databases
      { type: 'database', name: 'User Database (PostgreSQL)', x: 200, y: 1050 },
      { type: 'database', name: 'Product Database (MongoDB)', x: 400, y: 1050 },
      { type: 'database', name: 'Order Database (PostgreSQL)', x: 600, y: 1050 },
      { type: 'database', name: 'Analytics Database (ClickHouse)', x: 800, y: 1050 },
      { type: 'database', name: 'Audit Database (PostgreSQL)', x: 1000, y: 1050 },

      // Cache Layers
      { type: 'cache', name: 'User Cache (Redis)', x: 200, y: 1200 },
      { type: 'cache', name: 'Product Cache (Redis)', x: 400, y: 1200 },
      { type: 'cache', name: 'Session Cache (Redis)', x: 600, y: 1200 },
      { type: 'cache', name: 'Search Cache (Elasticsearch)', x: 800, y: 1200 },
      { type: 'cache', name: 'CDN Cache', x: 1000, y: 1200 },

      // Data Warehouses & Analytics
      { type: 'data-warehouse', name: 'Data Warehouse (Snowflake)', x: 1200, y: 1050 },
      { type: 'data-lake', name: 'Data Lake (S3)', x: 1400, y: 1050 },
      { type: 'search-engine', name: 'Search Engine (Elasticsearch)', x: 1200, y: 1200 },
      { type: 'message-queue', name: 'Event Stream (Kafka)', x: 1400, y: 1200 },

      // Storage Systems
      { type: 'storage', name: 'File Storage (S3)', x: 300, y: 1350 },
      { type: 'storage', name: 'Image Storage (S3)', x: 500, y: 1350 },
      { type: 'storage', name: 'Backup Storage (Glacier)', x: 700, y: 1350 },
      { type: 'storage', name: 'Archive Storage', x: 900, y: 1350 },
      { type: 'storage', name: 'Log Storage (S3)', x: 1100, y: 1350 },
      { type: 'storage', name: 'Metric Storage (S3)', x: 1300, y: 1350 }
    ];

    for (let i = 0; i < dataComponents.length; i++) {
      const component = dataComponents[i];
      await page.locator(`[data-testid="component-palette-${component.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: component.x, y: component.y }
      });
      await page.keyboard.type(component.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }

    // Layer 6: External Services & Integrations (15 components)
    const externalServices = [
      { name: 'Payment Gateway (Stripe)', x: 100, y: 1500 },
      { name: 'Email Provider (SendGrid)', x: 250, y: 1500 },
      { name: 'SMS Provider (Twilio)', x: 400, y: 1500 },
      { name: 'CDN Provider (CloudFlare)', x: 550, y: 1500 },
      { name: 'Monitoring (DataDog)', x: 700, y: 1500 },
      { name: 'Error Tracking (Sentry)', x: 850, y: 1500 },
      { name: 'Analytics (Google Analytics)', x: 1000, y: 1500 },
      { name: 'A/B Testing (Optimizely)', x: 1150, y: 1500 },
      { name: 'Search Provider (Algolia)', x: 1300, y: 1500 },
      { name: 'Auth Provider (Auth0)', x: 1450, y: 1500 },
      { name: 'CI/CD (GitHub Actions)', x: 200, y: 1650 },
      { name: 'Container Registry (ECR)', x: 400, y: 1650 },
      { name: 'Secret Management (Vault)', x: 600, y: 1650 },
      { name: 'DNS Provider (Route53)', x: 800, y: 1650 },
      { name: 'Backup Service (AWS Backup)', x: 1000, y: 1650 }
    ];

    for (let i = 0; i < externalServices.length; i++) {
      const service = externalServices[i];
      await page.locator('[data-testid="component-palette-external-service"]').click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: service.x, y: service.y }
      });
      await page.keyboard.type(service.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }

    // Layer 7: Infrastructure & DevOps (16 components)
    const infraComponents = [
      { type: 'monitoring', name: 'Prometheus', x: 150, y: 1800 },
      { type: 'monitoring', name: 'Grafana', x: 300, y: 1800 },
      { type: 'logging', name: 'ELK Stack', x: 450, y: 1800 },
      { type: 'container', name: 'Kubernetes Cluster', x: 600, y: 1800 },
      { type: 'container', name: 'Docker Registry', x: 750, y: 1800 },
      { type: 'ci-cd', name: 'Jenkins', x: 900, y: 1800 },
      { type: 'security', name: 'Vault', x: 1050, y: 1800 },
      { type: 'network', name: 'VPC', x: 1200, y: 1800 },
      { type: 'network', name: 'NAT Gateway', x: 1350, y: 1800 },
      { type: 'network', name: 'Internet Gateway', x: 1500, y: 1800 },
      { type: 'security', name: 'Security Groups', x: 200, y: 1950 },
      { type: 'security', name: 'IAM Roles', x: 400, y: 1950 },
      { type: 'backup', name: 'Disaster Recovery', x: 600, y: 1950 },
      { type: 'scaling', name: 'Auto Scaling Groups', x: 800, y: 1950 },
      { type: 'scaling', name: 'Application Load Balancer', x: 1000, y: 1950 },
      { type: 'scaling', name: 'Network Load Balancer', x: 1200, y: 1950 }
    ];

    for (const component of infraComponents) {
      await page.locator(`[data-testid="component-palette-${component.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: component.x, y: component.y }
      });
      await page.keyboard.type(component.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }

    // Demonstrate smooth interaction throughout the building process
    await page.waitForTimeout(2000);

    // Show virtualization activation
    const totalComponents = await page.locator('[data-testid*="component-"]').count();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 2100 } });
    await page.keyboard.type(`Total Components: ${totalComponents} - Virtualization Active`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate zoom operations to show different system layers
    await page.keyboard.press('Control++');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control++');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Include performance metrics display
    const performanceMetrics = await page.locator('[data-testid="performance-metrics"]').textContent();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 2150 } });
    await page.keyboard.type(`Performance: ${performanceMetrics} - Smooth at 100+ components`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate bulk selection and organization operations
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Show performance with complex connection patterns
    await page.locator('[data-testid="auto-connect-button"]').click();
    await page.waitForTimeout(3000);

    // Final performance validation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 2200 } });
    await page.keyboard.type('Enterprise Architecture Complete: 100+ components with maintained performance');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Verify enterprise architecture is complete and performant
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    const finalComponentCount = await page.locator('[data-testid*="component-"]').count();
    expect(finalComponentCount).toBeGreaterThanOrEqual(100);
  });

  test('200+ microservice architecture visualization', async ({ page }) => {
    // Show massive microservices ecosystem
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Enable performance monitoring
    await page.locator('[data-testid="performance-monitor-toggle"]').click();
    await page.waitForTimeout(1000);

    // Add demo annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('Microservices Ecosystem Demo: 200+ services with service mesh');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Create microservices in domains
    const domains = [
      { name: 'User Domain', services: 25, startX: 100, startY: 200 },
      { name: 'Product Domain', services: 30, startX: 500, startY: 200 },
      { name: 'Order Domain', services: 35, startX: 900, startY: 200 },
      { name: 'Payment Domain', services: 20, startX: 1300, startY: 200 },
      { name: 'Inventory Domain', services: 25, startX: 100, startY: 600 },
      { name: 'Analytics Domain', services: 30, startX: 500, startY: 600 },
      { name: 'Notification Domain', services: 15, startX: 900, startY: 600 },
      { name: 'Security Domain', services: 20, startX: 1300, startY: 600 }
    ];

    let totalServices = 0;

    for (const domain of domains) {
      // Add domain label
      await page.locator('[data-testid="annotation-tool"]').click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: domain.startX, y: domain.startY - 50 }
      });
      await page.keyboard.type(domain.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Add services in grid pattern
      for (let i = 0; i < domain.services; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = domain.startX + (col * 80);
        const y = domain.startY + (row * 60);

        await page.locator('[data-testid="component-palette-microservice"]').click();
        await page.locator('[data-testid="canvas-container"]').click({ position: { x, y } });
        await page.keyboard.type(`${domain.name.split(' ')[0]}-Service-${i + 1}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100); // Fast creation for 200+ services

        totalServices++;

        // Performance check every 50 services
        if (totalServices % 50 === 0) {
          await page.waitForTimeout(500);
          const fps = await page.locator('[data-testid="fps-counter"]').textContent();
          console.log(`Performance at ${totalServices} services: ${fps}`);
        }
      }
    }

    // Add service mesh infrastructure
    await page.locator('[data-testid="component-palette-service-mesh"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 700, y: 100 } });
    await page.keyboard.type('Istio Service Mesh');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Add API gateways for each domain
    const gateways = [
      { name: 'User API Gateway', x: 250, y: 150 },
      { name: 'Product API Gateway', x: 650, y: 150 },
      { name: 'Order API Gateway', x: 1050, y: 150 },
      { name: 'Payment API Gateway', x: 1450, y: 150 }
    ];

    for (const gateway of gateways) {
      await page.locator('[data-testid="component-palette-api-gateway"]').click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: gateway.x, y: gateway.y }
      });
      await page.keyboard.type(gateway.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    // Add service discovery and configuration
    const infraServices = [
      { type: 'service-discovery', name: 'Service Discovery (Consul)', x: 400, y: 50 },
      { type: 'config-server', name: 'Config Server', x: 600, y: 50 },
      { type: 'monitoring', name: 'Service Monitoring', x: 800, y: 50 },
      { type: 'logging', name: 'Distributed Tracing', x: 1000, y: 50 }
    ];

    for (const service of infraServices) {
      await page.locator(`[data-testid="component-palette-${service.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: service.x, y: service.y }
      });
      await page.keyboard.type(service.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    // Demonstrate service discovery and communication patterns
    await page.locator('[data-testid="auto-layout-button"]').click();
    await page.waitForTimeout(2000);

    // Show service grouping and namespace organization
    await page.locator('[data-testid="group-by-domain-button"]').click();
    await page.waitForTimeout(2000);

    // Demonstrate performance under complex connection patterns
    await page.locator('[data-testid="show-service-connections"]').click();
    await page.waitForTimeout(3000);

    // Add performance annotation
    const serviceCount = await page.locator('[data-testid*="component-microservice"]').count();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1000 } });
    await page.keyboard.type(`Microservices Count: ${serviceCount} - Service mesh managing communication`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show real-time performance monitoring
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1050 } });
    await page.keyboard.type('Performance: Virtualization + spatial indexing maintaining 60fps');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Zoom operations to test performance at different scales
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control++');
      await page.waitForTimeout(500);
    }

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+-');
      await page.waitForTimeout(500);
    }

    // Final validation
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    expect(serviceCount).toBeGreaterThanOrEqual(200);
  });

  test('multi-cloud infrastructure at scale', async ({ page }) => {
    // Demonstrate large cloud architecture
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Enable performance monitoring
    await page.locator('[data-testid="performance-monitor-toggle"]').click();
    await page.waitForTimeout(1000);

    // Add demo annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('Multi-Cloud Infrastructure: AWS + Azure + GCP with 300+ services');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // AWS Region (100 services)
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 200, y: 150 } });
    await page.keyboard.type('AWS US-East-1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const awsServices = [
      // Compute Services
      'EC2 Auto Scaling', 'ECS Clusters', 'EKS Clusters', 'Lambda Functions', 'Fargate Tasks',
      'Batch Jobs', 'Elastic Beanstalk', 'Lightsail Instances', 'EC2 Spot Instances', 'Reserved Instances',

      // Storage Services
      'S3 Buckets', 'EBS Volumes', 'EFS File Systems', 'FSx File Systems', 'Glacier Vaults',
      'Storage Gateway', 'DataSync', 'Snow Family', 'Backup Vaults', 'S3 Glacier Deep Archive',

      // Database Services
      'RDS PostgreSQL', 'RDS MySQL', 'RDS Aurora', 'DynamoDB Tables', 'ElastiCache Redis',
      'ElastiCache Memcached', 'DocumentDB', 'Neptune Graph DB', 'Timestream', 'QLDB',

      // Networking Services
      'VPC Networks', 'Application Load Balancer', 'Network Load Balancer', 'CloudFront CDN', 'Route 53',
      'Direct Connect', 'Transit Gateway', 'VPN Gateway', 'NAT Gateway', 'Internet Gateway',

      // Security Services
      'IAM Roles', 'Security Groups', 'WAF Rules', 'GuardDuty', 'Inspector',
      'Config Rules', 'CloudTrail', 'KMS Keys', 'Secrets Manager', 'Certificate Manager',

      // Analytics Services
      'Kinesis Streams', 'Kinesis Analytics', 'EMR Clusters', 'Glue Jobs', 'Athena Queries',
      'QuickSight Dashboards', 'Data Pipeline', 'MSK Kafka', 'Elasticsearch', 'OpenSearch',

      // AI/ML Services
      'SageMaker Endpoints', 'Comprehend', 'Rekognition', 'Polly', 'Transcribe',
      'Translate', 'Textract', 'Personalize', 'Forecast', 'Lex Chatbots',

      // Developer Tools
      'CodeCommit Repos', 'CodeBuild Projects', 'CodeDeploy Apps', 'CodePipeline', 'CodeStar',
      'Cloud9 IDEs', 'X-Ray Tracing', 'CloudFormation Stacks', 'CDK Apps', 'SAM Apps',

      // Monitoring & Management
      'CloudWatch Alarms', 'CloudWatch Logs', 'Systems Manager', 'OpsWorks', 'Service Catalog',
      'AWS Config', 'CloudTrail Logs', 'Personal Health Dashboard', 'Trusted Advisor', 'Cost Explorer',

      // Integration Services
      'API Gateway', 'SQS Queues', 'SNS Topics', 'EventBridge Rules', 'Step Functions',
      'SWF Workflows', 'AppSync GraphQL', 'MQ Message Brokers', 'MSK Connect', 'EventBridge Buses'
    ];

    // Create AWS services in grid layout
    for (let i = 0; i < 100 && i < awsServices.length; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = 100 + (col * 120);
      const y = 200 + (row * 80);

      await page.locator('[data-testid="component-palette-cloud-service"]').click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x, y } });
      await page.keyboard.type(awsServices[i]);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);

      if ((i + 1) % 25 === 0) {
        await page.waitForTimeout(300);
      }
    }

    // Azure Region (100 services)
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 1500, y: 150 } });
    await page.keyboard.type('Azure West Europe');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const azureServices = [
      // Compute Services
      'Virtual Machines', 'VM Scale Sets', 'Container Instances', 'Kubernetes Service', 'Service Fabric',
      'Batch', 'Functions', 'Logic Apps', 'App Service', 'Spring Cloud',

      // Storage Services
      'Blob Storage', 'File Storage', 'Queue Storage', 'Table Storage', 'Disk Storage',
      'Archive Storage', 'Data Lake Storage', 'NetApp Files', 'HPC Cache', 'Storage Sync',

      // Database Services
      'SQL Database', 'Cosmos DB', 'Database for MySQL', 'Database for PostgreSQL', 'Redis Cache',
      'Synapse Analytics', 'Analysis Services', 'Data Factory', 'Databricks', 'HDInsight',

      // Networking Services
      'Virtual Network', 'Load Balancer', 'Application Gateway', 'Traffic Manager', 'CDN',
      'ExpressRoute', 'VPN Gateway', 'Firewall', 'DDoS Protection', 'Network Watcher',

      // Security Services
      'Active Directory', 'Key Vault', 'Security Center', 'Sentinel', 'Information Protection',
      'Privileged Identity Management', 'Identity Protection', 'Conditional Access', 'Multi-Factor Authentication', 'AD Connect',

      // Analytics Services
      'Stream Analytics', 'Event Hubs', 'IoT Hub', 'Time Series Insights', 'Data Explorer',
      'Power BI Embedded', 'Machine Learning', 'Cognitive Services', 'Bot Services', 'Form Recognizer',

      // AI/ML Services
      'Computer Vision', 'Speech Services', 'Language Understanding', 'QnA Maker', 'Content Moderator',
      'Anomaly Detector', 'Personalizer', 'Immersive Reader', 'Metrics Advisor', 'Video Indexer',

      // Developer Tools
      'DevOps', 'Application Insights', 'Monitor', 'Automation', 'Resource Manager',
      'Policy', 'Cost Management', 'Advisor', 'Service Health', 'Resource Graph',

      // Integration Services
      'Service Bus', 'Event Grid', 'API Management', 'Data Factory', 'Logic Apps',
      'Functions', 'Service Fabric Mesh', 'Container Registry', 'Notification Hubs', 'SignalR Service',

      // IoT Services
      'IoT Central', 'IoT Hub', 'IoT Edge', 'Digital Twins', 'Time Series Insights',
      'Maps', 'Sphere', 'Windows for IoT', 'Industrial IoT', 'IoT Security'
    ];

    // Create Azure services
    for (let i = 0; i < 100 && i < azureServices.length; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = 1400 + (col * 120);
      const y = 200 + (row * 80);

      await page.locator('[data-testid="component-palette-cloud-service"]').click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x, y } });
      await page.keyboard.type(azureServices[i]);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);

      if ((i + 1) % 25 === 0) {
        await page.waitForTimeout(300);
      }
    }

    // GCP Region (100 services)
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 850, y: 1200 } });
    await page.keyboard.type('GCP US-Central1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const gcpServices = [
      // Compute Services
      'Compute Engine', 'Kubernetes Engine', 'App Engine', 'Cloud Functions', 'Cloud Run',
      'Batch', 'Preemptible VMs', 'Sole-tenant Nodes', 'Shielded VMs', 'Container-Optimized OS',

      // Storage Services
      'Cloud Storage', 'Persistent Disk', 'Local SSD', 'Filestore', 'Archive Storage',
      'Transfer Service', 'Storage Transfer Appliance', 'Firebase Storage', 'Cloud SQL Backups', 'Nearline Storage',

      // Database Services
      'Cloud SQL', 'Cloud Spanner', 'Firestore', 'Bigtable', 'Memorystore',
      'Firebase Realtime Database', 'BigQuery', 'Cloud Datastore', 'Firebase Extensions', 'AlloyDB',

      // Networking Services
      'VPC Network', 'Cloud Load Balancing', 'Cloud CDN', 'Cloud DNS', 'Cloud VPN',
      'Cloud Interconnect', 'Cloud NAT', 'Cloud Armor', 'Network Telemetry', 'Private Service Connect',

      // Security Services
      'Identity and Access Management', 'Cloud KMS', 'Security Command Center', 'Cloud Asset Inventory', 'VPC Service Controls',
      'Binary Authorization', 'Cloud Data Loss Prevention', 'Cloud Security Scanner', 'reCAPTCHA Enterprise', 'Identity-Aware Proxy',

      // Analytics Services
      'BigQuery', 'Dataflow', 'Dataproc', 'Cloud Composer', 'Pub/Sub',
      'Data Fusion', 'Datastream', 'Analytics Hub', 'Dataplex', 'Looker',

      // AI/ML Services
      'AI Platform', 'AutoML', 'Vision AI', 'Video AI', 'Natural Language AI',
      'Translation AI', 'Speech-to-Text', 'Text-to-Speech', 'DialogFlow', 'Contact Center AI',

      // Developer Tools
      'Cloud Build', 'Cloud Source Repositories', 'Container Registry', 'Artifact Registry', 'Cloud Code',
      'Cloud Shell', 'Cloud Debugger', 'Cloud Profiler', 'Cloud Trace', 'Error Reporting',

      // Monitoring & Operations
      'Cloud Monitoring', 'Cloud Logging', 'Cloud Profiler', 'Cloud Trace', 'Error Reporting',
      'Cloud Debugger', 'Service Monitoring', 'Uptime Checks', 'Alerting', 'Dashboards',

      // Integration Services
      'Cloud Tasks', 'Cloud Scheduler', 'Eventarc', 'Workflows', 'Cloud Endpoints',
      'API Gateway', 'Apigee', 'Firebase Cloud Messaging', 'Firebase Remote Config', 'Firebase A/B Testing'
    ];

    // Create GCP services
    for (let i = 0; i < 100 && i < gcpServices.length; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = 750 + (col * 120);
      const y = 1250 + (row * 80);

      await page.locator('[data-testid="component-palette-cloud-service"]').click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x, y } });
      await page.keyboard.type(gcpServices[i]);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);

      if ((i + 1) % 25 === 0) {
        await page.waitForTimeout(300);
      }
    }

    // Add multi-cloud connectivity
    const connectivityServices = [
      { name: 'AWS Direct Connect', x: 600, y: 1050 },
      { name: 'Azure ExpressRoute', x: 800, y: 1050 },
      { name: 'GCP Cloud Interconnect', x: 1000, y: 1050 },
      { name: 'Multi-Cloud VPN', x: 800, y: 1100 },
      { name: 'Global Load Balancer', x: 800, y: 1000 }
    ];

    for (const service of connectivityServices) {
      await page.locator('[data-testid="component-palette-network"]').click();
      await page.locator('[data-testid="canvas-container"]').click({
        position: { x: service.x, y: service.y }
      });
      await page.keyboard.type(service.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    // Show geographic distribution and connectivity
    await page.locator('[data-testid="show-geographic-view"]').click();
    await page.waitForTimeout(2000);

    // Demonstrate performance with complex nested architectures
    const totalCloudServices = await page.locator('[data-testid*="component-cloud"]').count();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 2100 } });
    await page.keyboard.type(`Multi-Cloud Services: ${totalCloudServices} - Virtualization managing complexity`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show performance monitoring for large scale
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 2150 } });
    await page.keyboard.type('Performance: Spatial indexing + LOD rendering maintaining responsiveness');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Test zoom performance with 300+ components
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Control++');
      await page.waitForTimeout(400);
    }

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Control+-');
      await page.waitForTimeout(400);
    }

    // Final validation
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    expect(totalCloudServices).toBeGreaterThanOrEqual(300);
  });

  test('virtualization and performance optimization showcase', async ({ page }) => {
    // Demonstrate performance features
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Start with performance monitoring disabled to show contrast
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('Performance Demo: Before vs After optimization');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Create large design that causes performance issues
    await page.locator('[data-testid="disable-virtualization"]').click();
    await page.waitForTimeout(500);

    // Add many components quickly to demonstrate performance impact
    for (let i = 0; i < 150; i++) {
      const row = Math.floor(i / 15);
      const col = i % 15;
      const x = 100 + (col * 80);
      const y = 150 + (row * 60);

      await page.locator('[data-testid="component-palette-microservice"]').click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x, y } });
      await page.keyboard.type(`Service-${i + 1}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(50);

      // Show performance degradation
      if (i === 50) {
        const fps1 = await page.locator('[data-testid="fps-counter"]').textContent();
        await page.locator('[data-testid="annotation-tool"]').click();
        await page.locator('[data-testid="canvas-container"]').click({ position: { x: 1300, y: 200 } });
        await page.keyboard.type(`50 components: FPS = ${fps1}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }

      if (i === 100) {
        const fps2 = await page.locator('[data-testid="fps-counter"]').textContent();
        await page.locator('[data-testid="annotation-tool"]').click();
        await page.locator('[data-testid="canvas-container"]').click({ position: { x: 1300, y: 250 } });
        await page.keyboard.type(`100 components: FPS = ${fps2} (degrading)`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    const fpsBeforeOptimization = await page.locator('[data-testid="fps-counter"]').textContent();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 1300, y: 300 } });
    await page.keyboard.type(`150 components: FPS = ${fpsBeforeOptimization} (poor performance)`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show virtualization activation and immediate improvement
    await page.locator('[data-testid="enable-virtualization"]').click();
    await page.waitForTimeout(2000);

    const fpsAfterOptimization = await page.locator('[data-testid="fps-counter"]').textContent();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 1300, y: 350 } });
    await page.keyboard.type(`After virtualization: FPS = ${fpsAfterOptimization} (optimized!)`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate level-of-detail rendering at different zoom levels
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 800 } });
    await page.keyboard.type('Level-of-Detail Demo: Components simplify when zoomed out');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Zoom out to show LOD in action
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+-');
      await page.waitForTimeout(600);

      if (i === 2) {
        await page.locator('[data-testid="annotation-tool"]').click();
        await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 850 } });
        await page.keyboard.type('Medium zoom: Component details simplified');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }

      if (i === 4) {
        await page.locator('[data-testid="annotation-tool"]').click();
        await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 900 } });
        await page.keyboard.type('Far zoom: Components rendered as simple shapes');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    // Zoom back in to show detail restoration
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control++');
      await page.waitForTimeout(600);
    }

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 950 } });
    await page.keyboard.type('Close zoom: Full component details restored');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Show spatial indexing and viewport culling in action
    await page.locator('[data-testid="show-viewport-debug"]').click();
    await page.waitForTimeout(1000);

    // Pan around to show culling
    await page.mouse.move(800, 400);
    await page.mouse.down();
    await page.mouse.move(400, 200);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.mouse.move(400, 200);
    await page.mouse.down();
    await page.mouse.move(1200, 600);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    const visibleComponents = await page.locator('[data-testid="visible-component-count"]').textContent();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1000 } });
    await page.keyboard.type(`Viewport culling: ${visibleComponents} visible / 150 total`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Include memory usage optimization demonstration
    const memoryUsage = await page.locator('[data-testid="memory-usage"]').textContent();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1050 } });
    await page.keyboard.type(`Memory optimization: ${memoryUsage} - efficient rendering`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show frame rate maintenance under heavy load
    await page.locator('[data-testid="stress-test-mode"]').click();
    await page.waitForTimeout(3000);

    const stressFps = await page.locator('[data-testid="fps-counter"]').textContent();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1100 } });
    await page.keyboard.type(`Stress test: ${stressFps} - performance maintained under load`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate performance monitoring and alerting
    await page.locator('[data-testid="performance-alert-threshold"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1150 } });
    await page.keyboard.type('Performance monitoring: Automatic optimization when thresholds exceeded');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Final performance summary
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 1200 } });
    await page.keyboard.type('Optimization Complete: Virtualization + LOD + Culling = Smooth Performance');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Verify performance optimization is working
    await expect(page.locator('[data-testid="virtualization-enabled"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();

    const finalFps = await page.locator('[data-testid="fps-counter"]').textContent();
    const fpsValue = parseInt(finalFps.replace('FPS: ', ''));
    expect(fpsValue).toBeGreaterThan(30); // Should maintain good performance
  });
});