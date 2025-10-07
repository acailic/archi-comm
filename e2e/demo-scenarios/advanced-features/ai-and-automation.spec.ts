// e2e/demo-scenarios/advanced-features/ai-and-automation.spec.ts
// Advanced AI and automation feature demonstrations for video generation
// Creates compelling demonstrations of intelligent design assistance and automation capabilities
// RELEVANT FILES: e2e/utils/demo-scenarios.ts, e2e/utils/test-helpers.ts, src/features/ai/, e2e/utils/video-helpers.ts

import { test, expect } from '@playwright/test';
import { createScreenshotHelpers } from '../../utils/screenshot-helpers';
import { isScreenshotMode } from '../../utils/env';

const SCREENSHOT_MODE = isScreenshotMode();

test.describe('AI and Automation Feature Demonstrations', () => {
  // Configure extended timeouts for AI feature demonstrations
  test.setTimeout(300000); // 5 minutes for AI workflows

  test.beforeEach(async ({ page }) => {
    // Configure AI service mocking for demonstration
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable AI demo mode
    await page.evaluate(() => {
      window.DEMO_MODE = true;
      window.AI_ENABLED = true;
      window.MOCK_AI_RESPONSES = true;
    });

    // Set up clean canvas for AI demo
    await page.locator('[data-testid="new-design-button"]').click();
    await page.waitForTimeout(2000);
  });

  test('AI-powered architecture recommendations', async ({ page, context }) => {
    // Show AI assistance in design process
    await page.locator('[data-testid="canvas-container"]').waitFor();
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureAI = async (name: string, step: string, metadata: Record<string, unknown> = {}) => {
      if (!screenshotHelpers) return;
      const componentCount = await page.locator('.react-flow__node').count();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'architecture-examples',
        scenario: 'AI Recommendations',
        step,
        metadata: {
          feature: 'ai-assistant',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Add AI demo annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('AI-Powered Architecture Assistant Demo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Start with basic requirements input
    await page.locator('[data-testid="ai-assistant-button"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="ai-requirements-input"]').click();
    await page.keyboard.type('I need to design a high-traffic e-commerce platform that handles 100k concurrent users with real-time inventory management');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await captureAI('ai-requirements', 'requirements', {
      description: 'AI assistant intake form with detailed architecture requirements'
    });

    // Show AI thinking indicator
    await expect(page.locator('[data-testid="ai-thinking-indicator"]')).toBeVisible();
    await page.waitForTimeout(3000);

    // Mock AI response with architecture suggestions
    await page.evaluate(() => {
      const aiResponse = {
        recommendations: [
          'Use microservices architecture for scalability',
          'Implement CQRS pattern for inventory management',
          'Add Redis caching for session management',
          'Use CDN for static content delivery',
          'Implement API gateway for service orchestration'
        ],
        suggestedComponents: [
          { type: 'load-balancer', name: 'Load Balancer', x: 400, y: 150 },
          { type: 'api-gateway', name: 'API Gateway', x: 400, y: 250 },
          { type: 'microservice', name: 'User Service', x: 200, y: 350 },
          { type: 'microservice', name: 'Product Service', x: 400, y: 350 },
          { type: 'microservice', name: 'Order Service', x: 600, y: 350 },
          { type: 'microservice', name: 'Inventory Service', x: 800, y: 350 },
          { type: 'cache', name: 'Redis Cache', x: 600, y: 450 },
          { type: 'database', name: 'User DB', x: 200, y: 500 },
          { type: 'database', name: 'Product DB', x: 400, y: 500 },
          { type: 'database', name: 'Order DB', x: 600, y: 500 },
          { type: 'message-queue', name: 'Event Bus', x: 800, y: 450 }
        ]
      };

      window.mockAIResponse = aiResponse;
    });

    // Display AI recommendations
    await page.locator('[data-testid="ai-recommendations-panel"]').waitFor();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 150 } });
    await page.keyboard.type('AI Analysis: Recommending microservices with event-driven architecture');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show AI suggesting appropriate components
    await page.locator('[data-testid="apply-ai-suggestions"]').click();
    await page.waitForTimeout(2000);

    // AI adds components with smooth animation
    const suggestedComponents = [
      { type: 'load-balancer', name: 'Load Balancer', x: 400, y: 150 },
      { type: 'api-gateway', name: 'API Gateway', x: 400, y: 250 },
      { type: 'microservice', name: 'User Service', x: 200, y: 350 },
      { type: 'microservice', name: 'Product Service', x: 400, y: 350 },
      { type: 'microservice', name: 'Order Service', x: 600, y: 350 },
      { type: 'microservice', name: 'Inventory Service', x: 800, y: 350 }
    ];

    for (let i = 0; i < suggestedComponents.length; i++) {
      const comp = suggestedComponents[i];

      // Show AI placement indicator
      await page.evaluate((component) => {
        const indicator = document.createElement('div');
        indicator.className = 'ai-placement-indicator';
        indicator.style.position = 'absolute';
        indicator.style.left = component.x + 'px';
        indicator.style.top = component.y + 'px';
        indicator.style.width = '120px';
        indicator.style.height = '80px';
        indicator.style.border = '2px dashed #0066cc';
        indicator.style.borderRadius = '8px';
        indicator.style.background = 'rgba(0, 102, 204, 0.1)';
        indicator.style.animation = 'pulse 1s ease-in-out';
        document.querySelector('[data-testid="canvas-container"]').appendChild(indicator);

        setTimeout(() => {
          indicator.remove();
        }, 1500);
      }, comp);

      await page.waitForTimeout(1500);

      // Add component
      await page.locator(`[data-testid="component-palette-${comp.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x: comp.x, y: comp.y } });
      await page.keyboard.type(comp.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
    }

    // Show intelligent component placement and connections
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 250 } });
    await page.keyboard.type('AI: Optimal component placement for traffic flow');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // AI suggests and creates intelligent connections
    await page.locator('[data-testid="ai-auto-connect"]').click();
    await page.waitForTimeout(1000);

    // Show connection suggestions one by one
    const connections = [
      { from: 'load-balancer', to: 'api-gateway' },
      { from: 'api-gateway', to: 'user-service' },
      { from: 'api-gateway', to: 'product-service' },
      { from: 'api-gateway', to: 'order-service' },
      { from: 'api-gateway', to: 'inventory-service' }
    ];

    for (const conn of connections) {
      // Highlight connection suggestion
      await page.evaluate((connection) => {
        const event = new CustomEvent('highlight-connection', {
          detail: connection
        });
        document.dispatchEvent(event);
      }, conn);

      await page.waitForTimeout(1000);

      // Create connection with animation
      await page.hover(`[data-testid="component-${conn.from}"]`);
      await page.locator(`[data-testid="connection-handle-${conn.from}-out"]`).hover();
      await page.mouse.down();
      await page.hover(`[data-testid="component-${conn.to}"]`);
      await page.locator(`[data-testid="connection-handle-${conn.to}-in"]`).hover();
      await page.mouse.up();
      await page.waitForTimeout(800);
    }

    // Show AI-generated architecture patterns
    await page.locator('[data-testid="ai-pattern-suggestions"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 350 } });
    await page.keyboard.type('AI: Applying microservices pattern with event-driven communication');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureAI('ai-pattern-application', 'pattern-suggestions', {
      description: 'AI pattern suggestions applied to architecture canvas'
    });

    // Add data layer based on AI recommendations
    await page.locator('[data-testid="ai-suggest-data-layer"]').click();
    await page.waitForTimeout(2000);

    const dataComponents = [
      { type: 'cache', name: 'Redis Cache', x: 600, y: 450 },
      { type: 'database', name: 'User DB', x: 200, y: 500 },
      { type: 'database', name: 'Product DB', x: 400, y: 500 },
      { type: 'database', name: 'Order DB', x: 600, y: 500 },
      { type: 'message-queue', name: 'Event Bus', x: 800, y: 450 }
    ];

    for (const comp of dataComponents) {
      await page.locator(`[data-testid="component-palette-${comp.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x: comp.x, y: comp.y } });
      await page.keyboard.type(comp.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    }

    // Show best practice recommendations
    await page.locator('[data-testid="ai-best-practices"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 450 } });
    await page.keyboard.type('AI Recommendations: Circuit breaker, rate limiting, monitoring');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await captureAI('ai-best-practices', 'best-practices', {
      description: 'AI-generated best practices overlaying architecture'
    });

    // Add monitoring and resilience components
    await page.locator('[data-testid="component-palette-monitoring"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 600 } });
    await page.keyboard.type('APM Monitoring');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await page.locator('[data-testid="component-palette-circuit-breaker"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 600 } });
    await page.keyboard.type('Circuit Breaker');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Show automated documentation generation
    await page.locator('[data-testid="ai-generate-docs"]').click();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 550 } });
    await page.keyboard.type('AI: Generated comprehensive architecture documentation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Show AI confidence scores and explanations
    await page.locator('[data-testid="ai-explanation-panel"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 650 } });
    await page.keyboard.type('AI-Powered Design Complete: 95% confidence score');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await captureAI('ai-final-architecture', 'final-architecture', {
      description: 'AI-generated architecture with confidence scores and documentation'
    });

    // Verify AI-generated architecture
    await expect(page.locator('[data-testid="component-load-balancer"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-user-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-redis-cache"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-event-bus"]')).toBeVisible();
  });

  test('intelligent auto-layout and organization', async ({ page, context }) => {
    // Demonstrate automatic design organization
    await page.locator('[data-testid="canvas-container"]').waitFor();
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureLayout = async (name: string, step: string, metadata: Record<string, unknown> = {}) => {
      if (!screenshotHelpers) return;
      const componentCount = await page.locator('.react-flow__node').count();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'workflow-stages',
        scenario: 'AI Auto Layout',
        step,
        metadata: {
          feature: 'auto-layout',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Add demo annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('Intelligent Auto-Layout Demo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Start with chaotic component arrangement
    const chaoticComponents = [
      { type: 'web-app', name: 'Frontend', x: 600, y: 400 },
      { type: 'database', name: 'Database', x: 200, y: 150 },
      { type: 'api-gateway', name: 'API Gateway', x: 800, y: 300 },
      { type: 'microservice', name: 'User Service', x: 150, y: 500 },
      { type: 'microservice', name: 'Order Service', x: 700, y: 150 },
      { type: 'cache', name: 'Cache', x: 400, y: 600 },
      { type: 'load-balancer', name: 'Load Balancer', x: 300, y: 200 },
      { type: 'monitoring', name: 'Monitoring', x: 750, y: 500 },
      { type: 'microservice', name: 'Product Service', x: 100, y: 300 },
      { type: 'message-queue', name: 'Message Queue', x: 650, y: 250 }
    ];

    // Add components in chaotic arrangement
    for (const comp of chaoticComponents) {
      await page.locator(`[data-testid="component-palette-${comp.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x: comp.x, y: comp.y } });
      await page.keyboard.type(comp.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }

    await captureLayout('ai-layout-chaotic', 'chaotic-state', {
      description: 'Chaotic component arrangement before AI auto-layout'
    });

    // Add some random connections
    await page.hover('[data-testid="component-frontend"]');
    await page.locator('[data-testid="connection-handle-frontend-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-service"]');
    await page.mouse.up();
    await page.waitForTimeout(500);

    await page.hover('[data-testid="component-api-gateway"]');
    await page.locator('[data-testid="connection-handle-api-gateway-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-database"]');
    await page.mouse.up();
    await page.waitForTimeout(500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 150 } });
    await page.keyboard.type('Before: Chaotic component arrangement');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show AI auto-layout algorithm organizing components
    await page.locator('[data-testid="ai-auto-layout"]').click();
    await page.waitForTimeout(1000);

    await captureLayout('ai-layout-organized', 'auto-layout', {
      description: 'AI auto-layout reorganized architecture for clarity'
    });

    // Show AI analysis of current layout
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 200 } });
    await page.keyboard.type('AI: Analyzing component relationships and dependencies');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Apply hierarchical layout strategy
    await page.locator('[data-testid="layout-strategy-hierarchical"]').click();
    await page.waitForTimeout(1000);

    // Show smooth animation of components moving to optimal positions
    await page.evaluate(() => {
      const hierarchicalLayout = {
        'load-balancer': { x: 400, y: 150 },
        'frontend': { x: 400, y: 250 },
        'api-gateway': { x: 400, y: 350 },
        'user-service': { x: 200, y: 450 },
        'product-service': { x: 400, y: 450 },
        'order-service': { x: 600, y: 450 },
        'database': { x: 200, y: 550 },
        'cache': { x: 400, y: 550 },
        'message-queue': { x: 600, y: 550 },
        'monitoring': { x: 800, y: 350 }
      };

      Object.entries(hierarchicalLayout).forEach(([componentName, position]) => {
        const element = document.querySelector(`[data-testid="component-${componentName}"]`);
        if (element) {
          element.style.transition = 'all 2s ease-in-out';
          element.style.transform = `translate(${position.x}px, ${position.y}px)`;
        }
      });
    });

    await page.waitForTimeout(3000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 250 } });
    await page.keyboard.type('Hierarchical Layout: Components organized by architectural layer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate different layout strategies
    await page.locator('[data-testid="layout-strategy-circular"]').click();
    await page.waitForTimeout(1000);

    // Apply circular layout for service mesh visualization
    await page.evaluate(() => {
      const centerX = 400;
      const centerY = 350;
      const radius = 150;
      const services = ['user-service', 'product-service', 'order-service'];

      services.forEach((service, index) => {
        const angle = (index * 2 * Math.PI) / services.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const element = document.querySelector(`[data-testid="component-${service}"]`);
        if (element) {
          element.style.transition = 'all 2s ease-in-out';
          element.style.transform = `translate(${x}px, ${y}px)`;
        }
      });
    });

    await page.waitForTimeout(3000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 300 } });
    await page.keyboard.type('Circular Layout: Perfect for service mesh visualization');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show force-directed layout for complex relationships
    await page.locator('[data-testid="layout-strategy-force-directed"]').click();
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      // Simulate force-directed layout animation
      const components = document.querySelectorAll('[data-testid*="component-"]');
      components.forEach((component, index) => {
        // Simulate physics-based positioning
        const x = 200 + (index % 4) * 200;
        const y = 200 + Math.floor(index / 4) * 150;

        component.style.transition = 'all 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        component.style.transform = `translate(${x}px, ${y}px)`;
      });
    });

    await page.waitForTimeout(3500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 350 } });
    await page.keyboard.type('Force-Directed: Natural clustering based on relationships');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show automatic connection routing optimization
    await page.locator('[data-testid="optimize-connections"]').click();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 400 } });
    await page.keyboard.type('AI: Optimized connection routing for minimal crossings');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show layer-based organization and grouping
    await page.locator('[data-testid="ai-group-by-layer"]').click();
    await page.waitForTimeout(1000);

    // Create visual layer groupings
    await page.evaluate(() => {
      const layers = [
        { name: 'Presentation Layer', components: ['frontend'], color: '#e3f2fd' },
        { name: 'Gateway Layer', components: ['load-balancer', 'api-gateway'], color: '#f3e5f5' },
        { name: 'Service Layer', components: ['user-service', 'product-service', 'order-service'], color: '#e8f5e8' },
        { name: 'Data Layer', components: ['database', 'cache', 'message-queue'], color: '#fff3e0' },
        { name: 'Infrastructure', components: ['monitoring'], color: '#fce4ec' }
      ];

      layers.forEach((layer, layerIndex) => {
        const group = document.createElement('div');
        group.className = 'layer-group';
        group.style.position = 'absolute';
        group.style.left = '50px';
        group.style.top = (150 + layerIndex * 100) + 'px';
        group.style.width = '800px';
        group.style.height = '80px';
        group.style.backgroundColor = layer.color;
        group.style.border = '2px solid #ccc';
        group.style.borderRadius = '8px';
        group.style.opacity = '0.3';
        group.style.zIndex = '-1';

        const label = document.createElement('div');
        label.textContent = layer.name;
        label.style.position = 'absolute';
        label.style.top = '-25px';
        label.style.left = '10px';
        label.style.fontWeight = 'bold';
        label.style.color = '#333';
        group.appendChild(label);

        document.querySelector('[data-testid="canvas-container"]').appendChild(group);
      });
    });

    await page.waitForTimeout(2000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 450 } });
    await page.keyboard.type('Layer Grouping: Automatic organization by architectural concerns');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show alignment and spacing optimization
    await page.locator('[data-testid="ai-optimize-spacing"]').click();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 500 } });
    await page.keyboard.type('Spacing Optimization: Perfect alignment and consistent spacing');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Final layout summary
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 550 } });
    await page.keyboard.type('Auto-Layout Complete: From chaos to organized architecture');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await captureLayout('ai-layout-final', 'final-layout', {
      description: 'Final organized layout after AI optimization and grouping'
    });

    // Verify layout optimization
    await expect(page.locator('[data-testid="component-load-balancer"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-frontend"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
  });

  test('AI-powered connection recommendations', async ({ page, context }) => {
    // Show intelligent connection assistance
    await page.locator('[data-testid="canvas-container"]').waitFor();
    const screenshotHelpers = SCREENSHOT_MODE ? createScreenshotHelpers(page, context) : null;

    if (screenshotHelpers) {
      await screenshotHelpers.enableAnnotationMode();
    }

    const captureConnections = async (name: string, step: string, metadata: Record<string, unknown> = {}) => {
      if (!screenshotHelpers) return;
      const componentCount = await page.locator('.react-flow__node').count();
      await screenshotHelpers.captureScreenshot(name, {
        category: 'architecture-examples',
        scenario: 'AI Connection Intelligence',
        step,
        metadata: {
          feature: 'ai-connections',
          stage: step,
          componentCount,
          ...metadata
        }
      });
    };

    // Add demo annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('AI Connection Intelligence Demo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add components without connections
    const components = [
      { type: 'web-app', name: 'React Frontend', x: 200, y: 150 },
      { type: 'api-gateway', name: 'API Gateway', x: 400, y: 250 },
      { type: 'microservice', name: 'Auth Service', x: 200, y: 350 },
      { type: 'microservice', name: 'User Service', x: 400, y: 350 },
      { type: 'microservice', name: 'Product Service', x: 600, y: 350 },
      { type: 'database', name: 'User Database', x: 300, y: 500 },
      { type: 'database', name: 'Product Database', x: 500, y: 500 },
      { type: 'cache', name: 'Redis Cache', x: 600, y: 450 },
      { type: 'external-service', name: 'Payment Gateway', x: 800, y: 350 }
    ];

    for (const comp of components) {
      await page.locator(`[data-testid="component-palette-${comp.type}"]`).click();
      await page.locator('[data-testid="canvas-container"]').click({ position: { x: comp.x, y: comp.y } });
      await page.keyboard.type(comp.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    }

    await captureConnections('ai-connections-initial', 'pre-connections', {
      description: 'Canvas populated with unconnected components before AI suggestions'
    });

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 150 } });
    await page.keyboard.type('Unconnected components - AI will suggest logical connections');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Enable AI connection analysis
    await page.locator('[data-testid="ai-connection-analysis"]').click();
    await page.waitForTimeout(2000);

    // Show AI analyzing component relationships
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 200 } });
    await page.keyboard.type('AI: Analyzing component types and relationships...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await captureConnections('ai-connections-analysis', 'analysis', {
      description: 'AI analyzing component relationships prior to suggesting connections'
    });

    // Show connection suggestions with confidence scores
    const connectionSuggestions = [
      {
        from: 'react-frontend',
        to: 'api-gateway',
        reason: 'Frontend typically connects to API gateway',
        confidence: 95,
        type: 'HTTP/REST'
      },
      {
        from: 'api-gateway',
        to: 'auth-service',
        reason: 'Gateway routes authentication requests',
        confidence: 90,
        type: 'HTTP/REST'
      },
      {
        from: 'api-gateway',
        to: 'user-service',
        reason: 'Gateway routes user management requests',
        confidence: 90,
        type: 'HTTP/REST'
      },
      {
        from: 'api-gateway',
        to: 'product-service',
        reason: 'Gateway routes product catalog requests',
        confidence: 88,
        type: 'HTTP/REST'
      },
      {
        from: 'user-service',
        to: 'user-database',
        reason: 'Service needs persistent user data storage',
        confidence: 98,
        type: 'Database'
      },
      {
        from: 'product-service',
        to: 'product-database',
        reason: 'Service needs product catalog storage',
        confidence: 98,
        type: 'Database'
      },
      {
        from: 'product-service',
        to: 'redis-cache',
        reason: 'Caching improves product lookup performance',
        confidence: 85,
        type: 'Cache'
      },
      {
        from: 'user-service',
        to: 'payment-gateway',
        reason: 'User service may need payment processing',
        confidence: 70,
        type: 'External API'
      }
    ];

    // Show suggestions one by one with reasoning
    for (let i = 0; i < connectionSuggestions.length; i++) {
      const suggestion = connectionSuggestions[i];

      // Highlight the suggested connection
      await page.evaluate((conn) => {
        const fromElement = document.querySelector(`[data-testid="component-${conn.from}"]`);
        const toElement = document.querySelector(`[data-testid="component-${conn.to}"]`);

        if (fromElement && toElement) {
          fromElement.style.boxShadow = '0 0 20px #4CAF50';
          toElement.style.boxShadow = '0 0 20px #4CAF50';

          // Create suggestion popup
          const popup = document.createElement('div');
          popup.className = 'ai-suggestion-popup';
          popup.style.position = 'absolute';
          popup.style.left = '50px';
          popup.style.top = (250 + (i * 40)) + 'px';
          popup.style.background = 'white';
          popup.style.border = '2px solid #4CAF50';
          popup.style.borderRadius = '8px';
          popup.style.padding = '10px';
          popup.style.zIndex = '1000';
          popup.style.maxWidth = '400px';
          popup.innerHTML = `
            <div style="font-weight: bold; color: #4CAF50;">AI Suggestion (${conn.confidence}% confidence)</div>
            <div>${conn.from} → ${conn.to}</div>
            <div style="font-size: 12px; color: #666;">${conn.reason}</div>
            <div style="font-size: 12px; color: #999;">Connection Type: ${conn.type}</div>
          `;

          document.body.appendChild(popup);

          setTimeout(() => {
            fromElement.style.boxShadow = '';
            toElement.style.boxShadow = '';
            popup.remove();
          }, 3000);
        }
      }, suggestion);

      await page.waitForTimeout(3500);

      // Accept the suggestion and create the connection
      await page.hover(`[data-testid="component-${suggestion.from}"]`);
      await page.locator(`[data-testid="connection-handle-${suggestion.from}-out"]`).hover();
      await page.mouse.down();
      await page.hover(`[data-testid="component-${suggestion.to}"]`);
      await page.locator(`[data-testid="connection-handle-${suggestion.to}-in"]`).hover();
      await page.mouse.up();
      await page.waitForTimeout(1000);
    }

    // Show connection type recommendations
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 300 } });
    await page.keyboard.type('AI: Suggesting appropriate connection types (REST, gRPC, async)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show data flow analysis and suggestions
    await page.locator('[data-testid="ai-data-flow-analysis"]').click();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 350 } });
    await page.keyboard.type('Data Flow Analysis: Identifying read/write patterns and optimization opportunities');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show security recommendations
    await page.locator('[data-testid="ai-security-analysis"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 400 } });
    await page.keyboard.type('Security Analysis: Recommending authentication, encryption, and access controls');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add security components based on AI recommendations
    await page.locator('[data-testid="component-palette-security"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 250 } });
    await page.keyboard.type('JWT Auth');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await page.locator('[data-testid="component-palette-security"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 700, y: 250 } });
    await page.keyboard.type('API Rate Limiter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Show performance optimization suggestions
    await page.locator('[data-testid="ai-performance-analysis"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 450 } });
    await page.keyboard.type('Performance: Suggesting caching, load balancing, and CDN');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add load balancer based on performance recommendations
    await page.locator('[data-testid="component-palette-load-balancer"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 150 } });
    await page.keyboard.type('Load Balancer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Connect load balancer
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-api-gateway"]');
    await page.locator('[data-testid="connection-handle-api-gateway-lb"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Final AI recommendation summary
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 500 } });
    await page.keyboard.type('AI Connection Analysis Complete: Optimized for security, performance, and maintainability');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await captureConnections('ai-connections-final', 'final-connections', {
      description: 'AI-optimized connections with security and performance enhancements'
    });

    // Show AI learning from user feedback
    await page.locator('[data-testid="ai-feedback-panel"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="thumbs-up-suggestion"]').click();
    await page.waitForTimeout(500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 550 } });
    await page.keyboard.type('AI Learning: User feedback improves future recommendations');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Verify intelligent connections
    await expect(page.locator('[data-testid="component-react-frontend"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-user-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-redis-cache"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-load-balancer"]')).toBeVisible();
  });
});
