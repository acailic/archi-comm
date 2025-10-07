// e2e/demo-scenarios/architecture-workflows/complete-system-design.spec.ts
// Comprehensive architecture design workflow demonstrations for video generation
// Creates compelling visual demonstrations of complete system design processes
// RELEVANT FILES: e2e/utils/demo-scenarios.ts, e2e/utils/test-helpers.ts, src/features/canvas/components/ReactFlowCanvas.tsx, e2e/utils/video-helpers.ts

import { test, expect } from '@playwright/test';
import { CanvasHelpers } from '../../utils/test-helpers';
import { createScreenshotHelpers } from '../../utils/screenshot-helpers';
import { isScreenshotMode } from '../../utils/env';

const SCREENSHOT_MODE = isScreenshotMode();

test.describe('Complete System Design Workflows', () => {
  // Configure extended timeouts for natural pacing suitable for video
  test.setTimeout(300000); // 5 minutes for complete workflows

  test.beforeEach(async ({ page }) => {
    // Configure video recording with optimal settings
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set up clean canvas for demo
    await page.locator('[data-testid="new-design-button"]').click();
    await page.waitForTimeout(2000); // Allow natural pacing for video
  });

  test('designing scalable e-commerce architecture', async ({ page, context }) => {
    // Start with blank canvas, progressively build complete e-commerce system
    await page.locator("[data-testid='canvas-root'], .react-flow__pane").first().waitFor();
    const canvasHelpers = new CanvasHelpers(page);
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureStage = async (name: string, step: string, metadata: Record<string, unknown> = {}) => {
      if (!screenshotHelpers) return;
      const componentCount = await canvasHelpers.getComponentCount();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'architecture-examples',
        scenario: 'E-Commerce Platform',
        step,
        metadata: {
          architecture: 'e-commerce',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Begin with user-facing components (web app, mobile app)
    await canvasHelpers.addComponent('web-app', { x: 200, y: 150 });
    await page.waitForTimeout(1500);

    await canvasHelpers.addComponent('mobile-app', { x: 400, y: 150 });
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-frontend-layer', 'user-layer');

    // Add API gateway and load balancer
    await canvasHelpers.addComponent('api-gateway', { x: 300, y: 300 });
    await page.waitForTimeout(1500);

    await canvasHelpers.addComponent('load-balancer', { x: 300, y: 250 });
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-entrypoints', 'edge-services');

    // Add microservices layer
    await canvasHelpers.addComponent('microservice', { x: 150, y: 450 });
    await page.keyboard.type('User Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await canvasHelpers.addComponent('microservice', { x: 300, y: 450 });
    await page.keyboard.type('Product Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await canvasHelpers.addComponent('microservice', { x: 450, y: 450 });
    await page.keyboard.type('Order Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await canvasHelpers.addComponent('microservice', { x: 600, y: 450 });
    await page.keyboard.type('Payment Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-microservices', 'service-layer');

    // Include databases for each service
    await canvasHelpers.addComponent('database', { x: 150, y: 600 });
    await page.keyboard.type('User DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await canvasHelpers.addComponent('database', { x: 300, y: 600 });
    await page.keyboard.type('Product DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 450, y: 600 } });
    await page.keyboard.type('Order DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-data-layer', 'data-layer');

    // Add caching layer
    await page.locator('[data-testid="component-palette-cache"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 750, y: 300 } });
    await page.keyboard.type('Redis Cache');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add external services
    await page.locator('[data-testid="component-palette-external-service"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 750, y: 450 } });
    await page.keyboard.type('Payment Gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-external-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 750, y: 550 } });
    await page.keyboard.type('Email Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-external-integrations', 'external-services');

    // Add monitoring and logging
    await page.locator('[data-testid="component-palette-monitoring"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 750 } });
    await page.keyboard.type('Monitoring');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-logging"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 750 } });
    await page.keyboard.type('Centralized Logging');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-observability', 'operations');

    // Create connections between components with smooth animations
    // Connect web app to load balancer
    await page.hover('[data-testid="component-web-app"]');
    await page.locator('[data-testid="connection-handle-web-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Connect mobile app to load balancer
    await page.hover('[data-testid="component-mobile-app"]');
    await page.locator('[data-testid="connection-handle-mobile-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Connect load balancer to API gateway
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-api-gateway"]');
    await page.locator('[data-testid="connection-handle-api-gateway-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Connect API gateway to microservices
    for (const service of ['user-service', 'product-service', 'order-service', 'payment-service']) {
      await page.hover('[data-testid="component-api-gateway"]');
      await page.locator('[data-testid="connection-handle-api-gateway-out"]').hover();
      await page.mouse.down();
      await page.hover(`[data-testid="component-${service}"]`);
      await page.locator(`[data-testid="connection-handle-${service}-in"]`).hover();
      await page.mouse.up();
      await page.waitForTimeout(800);
    }

    // Connect microservices to their databases
    const servicesToDbs = [
      ['user-service', 'user-db'],
      ['product-service', 'product-db'],
      ['order-service', 'order-db']
    ];

    for (const [service, db] of servicesToDbs) {
      await page.hover(`[data-testid="component-${service}"]`);
      await page.locator(`[data-testid="connection-handle-${service}-out"]`).hover();
      await page.mouse.down();
      await page.hover(`[data-testid="component-${db}"]`);
      await page.locator(`[data-testid="connection-handle-${db}-in"]`).hover();
      await page.mouse.up();
      await page.waitForTimeout(800);
    }

    // Connect services to cache
    await page.hover('[data-testid="component-product-service"]');
    await page.locator('[data-testid="connection-handle-product-service-cache"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-redis-cache"]');
    await page.locator('[data-testid="connection-handle-redis-cache-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Connect payment service to external payment gateway
    await page.hover('[data-testid="component-payment-service"]');
    await page.locator('[data-testid="connection-handle-payment-service-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-payment-gateway"]');
    await page.locator('[data-testid="connection-handle-payment-gateway-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Add annotations explaining architectural decisions
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 100 } });
    await page.keyboard.type('Frontend Layer: Web and mobile applications provide user interfaces');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 200 } });
    await page.keyboard.type('Gateway Layer: Load balancer distributes traffic, API gateway handles routing');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 350 } });
    await page.keyboard.type('Service Layer: Microservices handle specific business domains');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 500 } });
    await page.keyboard.type('Data Layer: Domain-specific databases ensure data isolation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 650 } });
    await page.keyboard.type('Infrastructure: Monitoring, logging, caching for operational excellence');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureStage('ecommerce-complete-architecture', 'final-architecture', {
      description: 'Comprehensive e-commerce architecture with observability and integrations'
    });

    // Demonstrate export functionality
    await page.locator('[data-testid="export-menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-png"]').click();
    await page.waitForTimeout(2000);

    // Zoom out to show complete architecture
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(2000);

    // Verify architecture is complete and well-structured
    await expect(page.locator('[data-testid="component-web-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-mobile-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-user-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-payment-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-monitoring"]')).toBeVisible();
  });

  test('monolith to microservices transformation', async ({ page, context }) => {
    // Start with monolithic architecture, transform to microservices
    await page.locator("[data-testid='canvas-root'], .react-flow__pane").first().waitFor();
    const canvasHelpers = new CanvasHelpers(page);
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureTransformation = async (
      name: string,
      step: string,
      metadata: Record<string, unknown> = {}
    ) => {
      if (!screenshotHelpers) return;
      const componentCount = await canvasHelpers.getComponentCount();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'architecture-examples',
        scenario: 'Monolith to Microservices',
        step,
        metadata: {
          architecture: 'monolith-to-microservices',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Begin with single large application component
    await page.locator('[data-testid="component-palette-application"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 400, y: 300 } });
    await page.keyboard.type('Monolithic E-commerce App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Add monolith database
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 400, y: 500 } });
    await page.keyboard.type('Monolithic Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureTransformation('transformation-baseline', 'monolith');

    // Connect monolith to database
    await page.hover('[data-testid="component-monolithic-app"]');
    await page.locator('[data-testid="connection-handle-monolithic-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-monolithic-database"]');
    await page.locator('[data-testid="connection-handle-monolithic-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Add annotation explaining current state
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 600, y: 250 } });
    await page.keyboard.type('Current State: Monolithic architecture with single database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Begin transformation: Extract user service
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 200, y: 200 } });
    await page.keyboard.type('User Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add user database
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 200, y: 350 } });
    await page.keyboard.type('User DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect user service to its database
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-db"]');
    await page.locator('[data-testid="connection-handle-user-db-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await captureTransformation('transformation-user-service', 'user-service', {
      description: 'User service and dedicated database extracted from monolith'
    });

    // Show communication between monolith and extracted service
    await page.hover('[data-testid="component-monolithic-app"]');
    await page.locator('[data-testid="connection-handle-monolithic-app-service"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Extract product service
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 600, y: 200 } });
    await page.keyboard.type('Product Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add product database
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 600, y: 350 } });
    await page.keyboard.type('Product DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect product service to its database
    await page.hover('[data-testid="component-product-service"]');
    await page.locator('[data-testid="connection-handle-product-service-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-product-db"]');
    await page.locator('[data-testid="connection-handle-product-db-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await captureTransformation('transformation-product-service', 'product-service', {
      description: 'Product service migrated with isolated data store'
    });

    // Connect monolith to product service
    await page.hover('[data-testid="component-monolithic-app"]');
    await page.locator('[data-testid="connection-handle-monolithic-app-product"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-product-service"]');
    await page.locator('[data-testid="connection-handle-product-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Extract order service
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 400, y: 100 } });
    await page.keyboard.type('Order Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add order database
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 400, y: 50 } });
    await page.keyboard.type('Order DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect order service to its database
    await page.hover('[data-testid="component-order-service"]');
    await page.locator('[data-testid="connection-handle-order-service-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-order-db"]');
    await page.locator('[data-testid="connection-handle-order-db-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await captureTransformation('transformation-order-service', 'order-service', {
      description: 'Order service and database established'
    });

    // Show service-to-service communication
    await page.hover('[data-testid="component-order-service"]');
    await page.locator('[data-testid="connection-handle-order-service-user"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-order"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.hover('[data-testid="component-order-service"]');
    await page.locator('[data-testid="connection-handle-order-service-product"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-product-service"]');
    await page.locator('[data-testid="connection-handle-product-service-order"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Add API gateway for unified access
    await page.locator('[data-testid="component-palette-api-gateway"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 600 } });
    await page.keyboard.type('API Gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect API gateway to all services
    const services = ['user-service', 'product-service', 'order-service'];
    for (const service of services) {
      await page.hover('[data-testid="component-api-gateway"]');
      await page.locator('[data-testid="connection-handle-api-gateway-out"]').hover();
      await page.mouse.down();
      await page.hover(`[data-testid="component-${service}"]`);
      await page.locator(`[data-testid="connection-handle-${service}-gateway"]`).hover();
      await page.mouse.up();
      await page.waitForTimeout(800);
    }

    // Fade out the monolith to show transformation completion
    await page.locator('[data-testid="component-monolithic-app"]').click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-monolithic-database"]').click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    await captureTransformation('transformation-final', 'final-architecture', {
      description: 'Monolith retired, API gateway fronts modular services'
    });

    // Add final annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 400 } });
    await page.keyboard.type('Transformation Complete: Microservices with dedicated databases and API gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Zoom out to show complete transformation
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Verify transformation is complete
    await expect(page.locator('[data-testid="component-user-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-product-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-order-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-monolithic-app"]')).not.toBeVisible();
  });

  test('building real-time messaging platform', async ({ page, context }) => {
    // Design comprehensive chat system architecture
    await page.locator('[data-testid="canvas-container"]').waitFor();
    const canvasHelpers = new CanvasHelpers(page);
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureRealtime = async (name: string, step: string, metadata: Record<string, unknown> = {}) => {
      if (!screenshotHelpers) return;
      const componentCount = await canvasHelpers.getComponentCount();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'architecture-examples',
        scenario: 'Real-time Messaging Platform',
        step,
        metadata: {
          architecture: 'real-time-messaging',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Start with basic client applications
    await page.locator('[data-testid="component-palette-mobile-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 150 } });
    await page.keyboard.type('Mobile Chat App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-web-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 150 } });
    await page.keyboard.type('Web Chat App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-desktop-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 550, y: 150 } });
    await page.keyboard.type('Desktop Chat App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureRealtime('realtime-clients', 'client-apps', {
      description: 'Desktop, web, and mobile chat clients connected across platforms'
    });

    // Add WebSocket gateway for real-time communication
    await page.locator('[data-testid="component-palette-websocket"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 300 } });
    await page.keyboard.type('WebSocket Gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect all clients to WebSocket gateway
    const clients = ['mobile-chat-app', 'web-chat-app', 'desktop-chat-app'];
    for (const client of clients) {
      await page.hover(`[data-testid="component-${client}"]`);
      await page.locator(`[data-testid="connection-handle-${client}-out"]`).hover();
      await page.mouse.down();
      await page.hover('[data-testid="component-websocket-gateway"]');
      await page.locator('[data-testid="connection-handle-websocket-gateway-in"]').hover();
      await page.mouse.up();
      await page.waitForTimeout(800);
    }

    await captureRealtime('realtime-gateway', 'websocket-layer', {
      description: 'WebSocket gateway routing traffic from all client platforms'
    });

    // Add message queue for reliable delivery
    await page.locator('[data-testid="component-palette-message-queue"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 150, y: 450 } });
    await page.keyboard.type('Message Queue (Redis)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add chat service for business logic
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 350, y: 450 } });
    await page.keyboard.type('Chat Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add user presence service
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 550, y: 450 } });
    await page.keyboard.type('Presence Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect WebSocket gateway to services
    await page.hover('[data-testid="component-websocket-gateway"]');
    await page.locator('[data-testid="connection-handle-websocket-gateway-chat"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-chat-service"]');
    await page.locator('[data-testid="connection-handle-chat-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-websocket-gateway"]');
    await page.locator('[data-testid="connection-handle-websocket-gateway-presence"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-presence-service"]');
    await page.locator('[data-testid="connection-handle-presence-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await captureRealtime('realtime-services', 'service-layer', {
      description: 'Real-time services connected for messaging and presence'
    });

    // Connect chat service to message queue
    await page.hover('[data-testid="component-chat-service"]');
    await page.locator('[data-testid="connection-handle-chat-service-queue"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-message-queue"]');
    await page.locator('[data-testid="connection-handle-message-queue-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Add notification service
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 750, y: 300 } });
    await page.keyboard.type('Notification Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect chat service to notification service
    await page.hover('[data-testid="component-chat-service"]');
    await page.locator('[data-testid="connection-handle-chat-service-notification"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-notification-service"]');
    await page.locator('[data-testid="connection-handle-notification-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Add databases for persistent storage
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 350, y: 600 } });
    await page.keyboard.type('Chat Messages DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 550, y: 600 } });
    await page.keyboard.type('User Data DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect services to databases
    await page.hover('[data-testid="component-chat-service"]');
    await page.locator('[data-testid="connection-handle-chat-service-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-chat-messages-db"]');
    await page.locator('[data-testid="connection-handle-chat-messages-db-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-presence-service"]');
    await page.locator('[data-testid="connection-handle-presence-service-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-data-db"]');
    await page.locator('[data-testid="connection-handle-user-data-db-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await captureRealtime('realtime-data-layer', 'data-layer', {
      description: 'Persistent storage backing chat history and presence data'
    });

    // Add external push notification service
    await page.locator('[data-testid="component-palette-external-service"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 750, y: 450 } });
    await page.keyboard.type('Push Notification Provider');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect notification service to external provider
    await page.hover('[data-testid="component-notification-service"]');
    await page.locator('[data-testid="connection-handle-notification-service-push"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-push-notification-provider"]');
    await page.locator('[data-testid="connection-handle-push-notification-provider-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Add load balancer for scaling
    await page.locator('[data-testid="component-palette-load-balancer"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 250 } });
    await page.keyboard.type('Load Balancer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Reconnect clients through load balancer
    // First disconnect direct connections
    await page.locator('[data-testid="connection-web-chat-app-websocket-gateway"]').click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Connect clients to load balancer
    for (const client of clients) {
      await page.hover(`[data-testid="component-${client}"]`);
      await page.locator(`[data-testid="connection-handle-${client}-lb"]`).hover();
      await page.mouse.down();
      await page.hover('[data-testid="component-load-balancer"]');
      await page.locator('[data-testid="connection-handle-load-balancer-in"]').hover();
      await page.mouse.up();
      await page.waitForTimeout(600);
    }

    // Connect load balancer to WebSocket gateway
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-websocket-gateway"]');
    await page.locator('[data-testid="connection-handle-websocket-gateway-lb"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await captureRealtime('realtime-scaled', 'scaling-layer', {
      description: 'Load-balanced real-time messaging stack ready for scale'
    });

    // Add annotations explaining real-time data flow
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 100 } });
    await page.keyboard.type('Real-time messaging clients connect via WebSocket');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 250 } });
    await page.keyboard.type('Load balancer ensures high availability and scaling');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 400 } });
    await page.keyboard.type('Message queue provides reliable delivery and buffering');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 550 } });
    await page.keyboard.type('Persistent storage maintains chat history and user data');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureRealtime('realtime-final-architecture', 'final-architecture', {
      description: 'End-to-end messaging platform with annotations and scaling components'
    });

    // Demonstrate message flow animation
    await page.locator('[data-testid="animate-flow-button"]').click();
    await page.waitForTimeout(3000);

    // Zoom out to show complete real-time architecture
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Verify complete real-time messaging platform
    await expect(page.locator('[data-testid="component-websocket-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-message-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-presence-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-notification-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-load-balancer"]')).toBeVisible();
  });

  test('on-premises to cloud migration planning', async ({ page, context }) => {
    // Show migration planning process from on-premises to cloud
    await page.locator('[data-testid="canvas-container"]').waitFor();
    const canvasHelpers = new CanvasHelpers(page);
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureMigration = async (name: string, step: string, metadata: Record<string, unknown> = {}) => {
      if (!screenshotHelpers) return;
      const componentCount = await canvasHelpers.getComponentCount();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'architecture-examples',
        scenario: 'On-Prem to Cloud Migration',
        step,
        metadata: {
          architecture: 'migration-plan',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Start with on-premises architecture layout
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 50 } });
    await page.keyboard.type('Current On-Premises Infrastructure');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add on-premises components
    await page.locator('[data-testid="component-palette-server"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 150 } });
    await page.keyboard.type('Web Server Cluster');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-server"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 150 } });
    await page.keyboard.type('Application Servers');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 250, y: 300 } });
    await page.keyboard.type('Oracle Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-storage"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 450, y: 300 } });
    await page.keyboard.type('File Storage (NAS)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-network"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 150 } });
    await page.keyboard.type('Load Balancer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect on-premises components
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-web-server-cluster"]');
    await page.locator('[data-testid="connection-handle-web-server-cluster-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-web-server-cluster"]');
    await page.locator('[data-testid="connection-handle-web-server-cluster-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-application-servers"]');
    await page.locator('[data-testid="connection-handle-application-servers-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-application-servers"]');
    await page.locator('[data-testid="connection-handle-application-servers-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-oracle-database"]');
    await page.locator('[data-testid="connection-handle-oracle-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-application-servers"]');
    await page.locator('[data-testid="connection-handle-application-servers-storage"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-file-storage"]');
    await page.locator('[data-testid="connection-handle-file-storage-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await captureMigration('migration-onprem', 'on-premises', {
      description: 'Current on-premises infrastructure baseline'
    });

    // Add cloud target architecture section
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 600, y: 50 } });
    await page.keyboard.type('Target Cloud Architecture (AWS)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add cloud equivalents
    await page.locator('[data-testid="component-palette-cloud-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 150 } });
    await page.keyboard.type('Application Load Balancer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-cloud-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 750, y: 150 } });
    await page.keyboard.type('EC2 Auto Scaling Group');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-cloud-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 300 } });
    await page.keyboard.type('RDS (PostgreSQL)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-cloud-storage"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 850, y: 300 } });
    await page.keyboard.type('S3 Object Storage');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add migration arrows showing transformation
    await page.locator('[data-testid="arrow-tool"]').click();
    await page.hover('[data-testid="component-load-balancer"]');
    await page.mouse.down();
    await page.hover('[data-testid="component-application-load-balancer"]');
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.hover('[data-testid="component-web-server-cluster"]');
    await page.mouse.down();
    await page.hover('[data-testid="component-ec2-auto-scaling-group"]');
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.hover('[data-testid="component-oracle-database"]');
    await page.mouse.down();
    await page.hover('[data-testid="component-rds-postgresql"]');
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.hover('[data-testid="component-file-storage"]');
    await page.mouse.down();
    await page.hover('[data-testid="component-s3-object-storage"]');
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Connect cloud components
    await page.hover('[data-testid="component-application-load-balancer"]');
    await page.locator('[data-testid="connection-handle-application-load-balancer-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-ec2-auto-scaling-group"]');
    await page.locator('[data-testid="connection-handle-ec2-auto-scaling-group-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-ec2-auto-scaling-group"]');
    await page.locator('[data-testid="connection-handle-ec2-auto-scaling-group-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-rds-postgresql"]');
    await page.locator('[data-testid="connection-handle-rds-postgresql-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-ec2-auto-scaling-group"]');
    await page.locator('[data-testid="connection-handle-ec2-auto-scaling-group-storage"]').hover();
    await page.mouse.down();
   await page.hover('[data-testid="component-s3-object-storage"]');
    await page.locator('[data-testid="connection-handle-s3-object-storage-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await captureMigration('migration-cloud-core', 'cloud-core', {
      description: 'Cloud target architecture mapped with core services'
    });

    // Add cloud-native enhancements
    await page.locator('[data-testid="component-palette-cloud-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 950, y: 150 } });
    await page.keyboard.type('CloudFront CDN');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-cloud-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 750, y: 400 } });
    await page.keyboard.type('CloudWatch Monitoring');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="component-palette-cloud-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 950, y: 400 } });
    await page.keyboard.type('Auto Backup & DR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Connect cloud enhancements
    await page.hover('[data-testid="component-cloudfront-cdn"]');
    await page.locator('[data-testid="connection-handle-cloudfront-cdn-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-application-load-balancer"]');
    await page.locator('[data-testid="connection-handle-application-load-balancer-cdn"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await captureMigration('migration-enhancements', 'cloud-enhancements', {
      description: 'Cloud-native enhancements added (CDN, monitoring, backup)'
    });

    // Add phased migration plan
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 500 } });
    await page.keyboard.type('Phase 1: Lift & Shift - Move VMs to EC2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 550 } });
    await page.keyboard.type('Phase 2: Database Migration - Oracle to RDS');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 600 } });
    await page.keyboard.type('Phase 3: Optimize - Auto Scaling, CDN, Monitoring');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 650 } });
    await page.keyboard.type('Phase 4: Modernize - Containerization & Serverless');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add cost comparison annotation
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 450 } });
    await page.keyboard.type('Cost Savings: 30-40% reduction in operational costs');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 500 } });
    await page.keyboard.type('Benefits: Improved scalability, reliability, and disaster recovery');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await captureMigration('migration-plan', 'final-architecture', {
      description: 'Complete migration roadmap with phased plan and benefits'
    });

    // Zoom out to show complete migration plan
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Verify migration architecture is complete
    await expect(page.locator('[data-testid="component-application-load-balancer"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-ec2-auto-scaling-group"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-rds-postgresql"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-s3-object-storage"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-cloudwatch-monitoring"]')).toBeVisible();
  });
});
