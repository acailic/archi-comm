// e2e/utils/test-data-manager.ts
// Test data management utilities for E2E tests
// Provides consistent test data, fixtures, and state management
// RELEVANT FILES: e2e/*.spec.ts, playwright.config.ts

import { Page } from '@playwright/test';

export interface ComponentData {
  type: string;
  name: string;
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

  public static getInstance(): TestDataManager {
    if (!TestDataManager.instance) {
      TestDataManager.instance = new TestDataManager();
    }
    return TestDataManager.instance;
  }

  constructor() {
    this.initializeFixtures();
  }

  private initializeFixtures(): void {
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
  }

  public getFixture(name: string): DesignData | undefined {
    return this.fixtures.get(name);
  }

  public getAllFixtures(): Map<string, DesignData> {
    return new Map(this.fixtures);
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

    // Add components
    for (const component of design.components) {
      const paletteItem = page.locator(`[data-testid="palette-item-${component.type}"]`).first();

      if (await paletteItem.isVisible()) {
        await paletteItem.dragTo(canvas, {
          targetPosition: component.position,
        });

        // Brief pause to allow rendering
        await page.waitForTimeout(200);
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
    // Verify components
    for (const component of design.components) {
      const componentName = component.name || this.getComponentDisplayName(component.type);
      const node = page.locator('.react-flow__node').filter({ hasText: componentName });

      if ((await node.count()) === 0) {
        console.log(`Component ${componentName} not found on canvas`);
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
    const displayNames: Record<string, string> = {
      server: 'Server',
      database: 'Database',
      cache: 'Cache',
      'api-gateway': 'Api gateway',
      'load-balancer': 'Load balancer',
    };

    return displayNames[type] || type;
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
}

// Export singleton instances
export const testDataManager = TestDataManager.getInstance();
export const testStateManager = TestStateManager.getInstance();
