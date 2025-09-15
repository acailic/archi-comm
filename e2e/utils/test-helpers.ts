// e2e/utils/test-helpers.ts
// Helper functions and utilities for E2E tests
// Provides common operations, assertions, and setup functions
// RELEVANT FILES: e2e/*.spec.ts, e2e/utils/test-data-manager.ts

import { Page, Locator, expect, BrowserContext, Browser } from '@playwright/test';
import { testDataManager, DesignData } from './test-data-manager';
import * as fs from 'fs';
import * as path from 'path';

export class CanvasHelpers {
  constructor(private page: Page) {}

  async navigateToCanvas(): Promise<void> {
    await this.page.goto('/');

    // Some builds have a landing CTA; click if present, otherwise continue
    try {
      const cta = this.page.getByRole('button', { name: /start your journey/i });
      await cta.waitFor({ state: 'visible', timeout: 1000 });
      await cta.click();
    } catch {
      // Ignore if not present
    }

    // Click first Start Challenge button on the challenge selection screen
    const startBtn = this.page.getByRole('button', { name: /start challenge/i }).first();
    await startBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startBtn.click();

    // Wait for canvas to be ready (support multiple test ids)
    const canvas = this.page.locator('[data-testid="canvas"], [data-testid="reactflow-canvas"], [data-testid="canvas-root"]');
    await canvas.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000); // Allow for initialization
  }

  async addComponent(type: string, position?: { x: number; y: number }): Promise<Locator> {
    const canvas = this.page.locator('[data-testid="canvas"]');
    const component = this.page.locator(`[data-testid="palette-item-${type}"]`).first();

    await expect(component).toBeVisible();

    if (position) {
      await component.dragTo(canvas, { targetPosition: position });
    } else {
      await component.dragTo(canvas);
    }

    await this.page.waitForTimeout(300); // Allow rendering

    // Return the created node
    const componentName = this.getComponentDisplayName(type);
    return this.page.locator('.react-flow__node').filter({ hasText: componentName }).first();
  }

  async addAnnotation(text: string, position: { x: number; y: number }): Promise<Locator> {
    const canvas = this.page.locator('[data-testid="canvas"]');

    await canvas.dblclick({ position });

    const textarea = this.page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill(text);
    await textarea.press('Control+Enter');

    await this.page.waitForTimeout(300);

    return this.page.getByText(text).first();
  }

  async selectComponent(componentName: string): Promise<void> {
    const node = this.page.locator('.react-flow__node').filter({ hasText: componentName }).first();
    await node.click();
    await expect(node).toHaveClass(/selected/);
  }

  async selectMultipleComponents(componentNames: string[]): Promise<void> {
    for (let i = 0; i < componentNames.length; i++) {
      const node = this.page
        .locator('.react-flow__node')
        .filter({ hasText: componentNames[i] })
        .first();

      if (i === 0) {
        await node.click();
      } else {
        await node.click({ modifiers: ['Shift'] });
      }
    }
  }

  async deleteSelected(): Promise<void> {
    await this.page.keyboard.press('Delete');
    await this.page.waitForTimeout(300);
  }

  async clearCanvas(): Promise<void> {
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Delete');
    await this.page.waitForTimeout(500);
  }

  async getComponentCount(): Promise<number> {
    const nodes = this.page.locator('.react-flow__node');
    return await nodes.count();
  }

  async getAnnotationCount(): Promise<number> {
    const annotations = this.page.locator('[data-testid*="annotation"], .annotation');
    return await annotations.count();
  }

  async zoomIn(steps: number = 1): Promise<void> {
    const canvas = this.page.locator('.react-flow');
    await canvas.click();

    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press('Control++');
      await this.page.waitForTimeout(200);
    }
  }

  async zoomOut(steps: number = 1): Promise<void> {
    const canvas = this.page.locator('.react-flow');
    await canvas.click();

    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press('Control+-');
      await this.page.waitForTimeout(200);
    }
  }

  async resetZoom(): Promise<void> {
    const canvas = this.page.locator('.react-flow');
    await canvas.click();
    await this.page.keyboard.press('Control+0');
    await this.page.waitForTimeout(300);
  }

  async simulateNetworkDisruption(): Promise<void> {
    // Simulate network disruption by intercepting and failing requests
    await this.page.route('**/api/**', route => route.abort('failed'));
    await this.page.waitForTimeout(1000);
  }

  async triggerMemoryPressure(): Promise<void> {
    // Create memory pressure by allocating large arrays
    await this.page.evaluate(() => {
      (window as any).memoryStress = [];
      for (let i = 0; i < 2000; i++) {
        (window as any).memoryStress.push(new Array(10000).fill('stress-test'));
      }
    });
  }

  async createLargeDesign(componentCount: number): Promise<void> {
    // Create a design with many components for scalability testing
    for (let i = 0; i < componentCount; i++) {
      const componentTypes = ['server', 'database', 'cache', 'api-gateway', 'load-balancer'];
      const type = componentTypes[i % componentTypes.length];
      const x = 100 + (i % 10) * 150;
      const y = 100 + Math.floor(i / 10) * 150;
      await this.addComponent(type, { x, y });
    }
  }

  async panCanvas(deltaX: number, deltaY: number): Promise<void> {
    const canvas = this.page.locator('.react-flow__viewport');
    const box = await canvas.boundingBox();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      await this.page.mouse.move(centerX, centerY);
      await this.page.mouse.down();
      await this.page.mouse.move(centerX + deltaX, centerY + deltaY);
      await this.page.mouse.up();

      await this.page.waitForTimeout(300);
    }
  }

  async exportToPNG(): Promise<string | null> {
    const exportButton = this.page.getByRole('button', { name: /export png/i });

    if (await exportButton.isVisible()) {
      const downloadPromise = this.page.waitForEvent('download');
      await exportButton.click();

      try {
        const download = await downloadPromise;
        return download.suggestedFilename();
      } catch (error) {
        console.log('Export handled by native dialog');
        return null;
      }
    }

    return null;
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
}

export class ToolbarHelpers {
  constructor(private page: Page) {}

  async selectTool(toolName: 'select' | 'pan' | 'zoom' | 'annotate'): Promise<void> {
    const tool = this.page.locator(`[data-testid="tool-${toolName}"]`);
    await expect(tool).toBeVisible();
    await tool.click();
    await expect(tool).toHaveAttribute('aria-pressed', 'true');
  }

  async getActiveTool(): Promise<string | null> {
    const tools = ['select', 'pan', 'zoom', 'annotate'];

    for (const tool of tools) {
      const toolElement = this.page.locator(`[data-testid="tool-${tool}"]`);

      if (await toolElement.isVisible()) {
        const isPressed = await toolElement.getAttribute('aria-pressed');
        if (isPressed === 'true') {
          return tool;
        }
      }
    }

    return null;
  }

  async openGridControls(): Promise<void> {
    const gridToggle = this.page.locator('[data-testid="grid-toggle"]');
    if (await gridToggle.isVisible()) {
      await gridToggle.click();
    }
  }

  async openMinimapControls(): Promise<void> {
    const minimapToggle = this.page.locator('[data-testid="minimap-toggle"]');
    if (await minimapToggle.isVisible()) {
      await minimapToggle.click();
    }
  }

  async isToolbarVisible(): Promise<boolean> {
    const toolbar = this.page.locator('[data-testid="canvas-toolbar"]');
    return await toolbar.isVisible();
  }
}

export class WorkflowHelpers {
  constructor(private page: Page) {}

  async completeFullWorkflow(designName: string = 'simple-web-app'): Promise<void> {
    // Navigate to canvas
    const canvasHelpers = new CanvasHelpers(this.page);
    await canvasHelpers.navigateToCanvas();

    // Apply test design
    const design = testDataManager.getFixture(designName);
    if (design) {
      await testDataManager.applyDesignToCanvas(this.page, design);
    }

    // Continue to recording
    const continueButton = this.page.getByRole('button', { name: /continue to recording/i });
    if (await continueButton.isVisible()) {
      await continueButton.click();

      // Add transcript
      const transcriptArea = this.page.getByPlaceholder(/enter your explanation text/i);
      if (await transcriptArea.isVisible()) {
        await transcriptArea.fill(
          'This design demonstrates a scalable web application architecture.'
        );

        const continueToReview = this.page.getByRole('button', { name: /continue to review/i });
        if (await continueToReview.isVisible()) {
          await continueToReview.click();

          // Wait for review screen
          await expect(this.page.getByText(/session complete/i)).toBeVisible();
        }
      }
    }
  }

  async navigateToRecording(): Promise<void> {
    const canvasHelpers = new CanvasHelpers(this.page);
    await canvasHelpers.navigateToCanvas();

    // Add minimal content to enable continue button
    await canvasHelpers.addComponent('server');

    const continueButton = this.page.getByRole('button', { name: /continue to recording/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
  }

  async navigateToReview(): Promise<void> {
    await this.navigateToRecording();

    const transcriptArea = this.page.getByPlaceholder(/enter your explanation text/i);
    if (await transcriptArea.isVisible()) {
      await transcriptArea.fill('Test explanation for workflow completion.');

      const continueToReview = this.page.getByRole('button', { name: /continue to review/i });
      await continueToReview.click();
    }
  }
}

export class AssertionHelpers {
  constructor(private page: Page) {}

  async assertComponentExists(componentName: string): Promise<void> {
    const node = this.page.locator('.react-flow__node').filter({ hasText: componentName });
    await expect(node.first()).toBeVisible();
  }

  async assertComponentCount(expectedCount: number): Promise<void> {
    const nodes = this.page.locator('.react-flow__node');
    await expect(nodes).toHaveCount(expectedCount);
  }

  async assertAnnotationExists(annotationText: string): Promise<void> {
    const annotation = this.page.getByText(annotationText, { exact: false });
    await expect(annotation.first()).toBeVisible();
  }

  async assertCanvasNotEmpty(): Promise<void> {
    const nodes = this.page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);
  }

  async assertToolbarVisible(): Promise<void> {
    const toolbar = this.page.locator('[data-testid="canvas-toolbar"]');
    await expect(toolbar).toBeVisible();
  }

  async assertToolSelected(toolName: string): Promise<void> {
    const tool = this.page.locator(`[data-testid="tool-${toolName}"]`);
    await expect(tool).toHaveAttribute('aria-pressed', 'true');
  }

  async assertPerformanceMetric(metricName: string, maxValue: number): Promise<void> {
    const metrics = await this.page.evaluate(() => {
      return (performance as any).memory
        ? {
            memory: (performance as any).memory.usedJSHeapSize,
            timing: performance.now(),
          }
        : { timing: performance.now() };
    });

    if (metricName === 'memory' && metrics.memory) {
      expect(metrics.memory).toBeLessThan(maxValue);
    } else if (metricName === 'timing') {
      expect(metrics.timing).toBeLessThan(maxValue);
    }
  }

  async assertNoErrors(): Promise<void> {
    const errors = this.page.locator('[role="alert"].error, .error-message');
    const errorCount = await errors.count();
    expect(errorCount).toBe(0);
  }

  async assertPageResponsive(): Promise<void> {
    // Test that key UI elements are still responsive
    const toolbar = this.page.locator('[data-testid="canvas-toolbar"]');
    await expect(toolbar).toBeVisible();

    const selectTool = this.page.locator('[data-testid="tool-select"]');
    if (await selectTool.isVisible()) {
      await selectTool.click();
      await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
    }
  }

  async assertRecoveryOverlayVisible(): Promise<void> {
    const recoveryOverlay = this.page.locator('[data-testid="recovery-overlay"]');
    await expect(recoveryOverlay).toBeVisible();
  }

  async assertNoRecoveryOverlay(): Promise<void> {
    const recoveryOverlay = this.page.locator('[data-testid="recovery-overlay"]');
    await expect(recoveryOverlay).not.toBeVisible();
  }

  async assertConflictResolved(): Promise<void> {
    // Verify no error banners are present
    const errorBanners = this.page.locator('[data-testid="error-banner"], .error-banner');
    await expect(errorBanners).toHaveCount(0);

    // Verify canvas is still functional
    const canvas = this.page.locator('[data-testid="canvas"]');
    await expect(canvas).toBeVisible();
  }

  async assertSessionPersisted(expectedData: any): Promise<void> {
    // Verify design state matches expected data
    const componentCount = await this.page.locator('.react-flow__node').count();
    expect(componentCount).toBe(expectedData.componentCount);

    if (expectedData.annotations) {
      const annotationCount = await this.page.locator('[data-testid*="annotation"], .annotation').count();
      expect(annotationCount).toBe(expectedData.annotations.length);
    }
  }

  async assertCrossPlatformConsistency(baseline: any): Promise<void> {
    const componentCount = await this.page.locator('.react-flow__node').count();
    const annotationCount = await this.page.locator('[data-testid*="annotation"], .annotation').count();

    expect(componentCount).toBe(baseline.componentCount);
    expect(annotationCount).toBe(baseline.annotationCount);

    // Verify component positions are roughly consistent (allow for small browser differences)
    const components = await this.page.locator('.react-flow__node').all();
    for (let i = 0; i < Math.min(components.length, baseline.componentPositions?.length || 0); i++) {
      const box = await components[i].boundingBox();
      if (box && baseline.componentPositions[i]) {
        const deltaX = Math.abs(box.x - baseline.componentPositions[i].x);
        const deltaY = Math.abs(box.y - baseline.componentPositions[i].y);
        expect(deltaX).toBeLessThan(50); // Allow 50px tolerance
        expect(deltaY).toBeLessThan(50);
      }
    }
  }
}

export class MockHelpers {
  constructor(private page: Page) {}

  async mockSlowNetwork(delayMs: number = 1000): Promise<void> {
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  async mockNetworkFailure(): Promise<void> {
    await this.page.route('**/*', route => route.abort('failed'));
  }

  async mockTauriAPI(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).__TAURI__ = {
        fs: {
          writeTextFile: () => Promise.resolve(),
          readTextFile: () => Promise.resolve('{"test": "data"}'),
        },
        dialog: {
          save: () => Promise.resolve('/path/to/file.json'),
          open: () => Promise.resolve(['/path/to/file.json']),
        },
        shell: {
          open: () => Promise.resolve(),
        },
        window: {
          appWindow: {
            setTitle: () => Promise.resolve(),
            minimize: () => Promise.resolve(),
            maximize: () => Promise.resolve(),
          },
        },
      };
    });
  }

  async restoreNetwork(): Promise<void> {
    await this.page.unroute('**/*');
  }

  async simulateMemoryPressure(): Promise<void> {
    await this.page.addInitScript(() => {
      // Create memory pressure
      (window as any).memoryBallast = [];
      for (let i = 0; i < 1000; i++) {
        (window as any).memoryBallast.push(new Array(1000).fill('memory-test'));
      }
    });
  }

  async injectPerformanceMonitor(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).performanceLog = [];

      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = callback => {
        const start = performance.now();
        return originalRAF(() => {
          const end = performance.now();
          (window as any).performanceLog.push({
            type: 'frame',
            duration: end - start,
            timestamp: end,
          });
          callback(end);
        });
      };
    });
  }

  async getPerformanceLog(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return (window as any).performanceLog || [];
    });
  }

  async advanceTimeBy(days: number): Promise<void> {
    // Override Date.now() and performance.now() for time travel simulation
    const advanceMs = days * 24 * 60 * 60 * 1000;
    await this.page.addInitScript((ms) => {
      const originalDateNow = Date.now;
      const originalPerfNow = performance.now;

      Date.now = () => originalDateNow() + ms;
      performance.now = () => originalPerfNow() + ms;
    }, advanceMs);
  }

  async openPeerContext(url: string, browser: Browser): Promise<BrowserContext> {
    // Create second browser context for collaboration testing
    const peerContext = await browser.newContext();
    const peerPage = await peerContext.newPage();
    await peerPage.goto(url);
    return peerContext;
  }

  async simulateConflict(type: string, data: any): Promise<void> {
    // Dispatch synthetic conflict events
    await this.page.evaluate(({ type, data }) => {
      const event = new CustomEvent('collaboration-conflict', {
        detail: { type, data }
      });
      window.dispatchEvent(event);
    }, { type, data });
  }

  async mockShareService(): Promise<void> {
    // Mock collaboration backend if needed
    await this.page.route('**/api/share/**', async route => {
      const url = route.request().url();
      if (url.includes('/create')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ shareId: 'test-share-123', url: 'http://localhost:3000/share/test-share-123' })
        });
      } else if (url.includes('/test-share-123')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ design: { components: [], annotations: [] } })
        });
      } else {
        await route.continue();
      }
    });
  }
}

export class DebugHelpers {
  constructor(private page: Page) {}

  async takeDebugScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug_${name}_${timestamp}.png`;
    await this.page.screenshot({ path: `e2e/test-results/debug/${filename}` });
    console.log(`Debug screenshot saved: ${filename}`);
  }

  async logPageConsole(): Promise<void> {
    this.page.on('console', msg => {
      console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
  }

  async logNetworkRequests(): Promise<void> {
    this.page.on('request', request => {
      console.log(`[NETWORK] ${request.method()} ${request.url()}`);
    });

    this.page.on('response', response => {
      console.log(`[NETWORK] ${response.status()} ${response.url()}`);
    });
  }

  async dumpPageState(): Promise<any> {
    return await this.page.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: Object.fromEntries(Object.entries(localStorage)),
        sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      };
    });
  }

  async waitForNetworkIdle(timeout: number = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async measurePageLoadTime(): Promise<number> {
    return await this.page.evaluate(() => {
      const timing = performance.timing;
      return timing.loadEventEnd - timing.navigationStart;
    });
  }
}

export class TestStateManager {
  private sessionStatesDir = path.join(process.cwd(), 'e2e', 'session-states');

  constructor() {
    // Ensure session states directory exists
    if (!fs.existsSync(this.sessionStatesDir)) {
      fs.mkdirSync(this.sessionStatesDir, { recursive: true });
    }
  }

  async saveStorageState(name: string, context: BrowserContext): Promise<string> {
    const filePath = path.join(this.sessionStatesDir, `${name}.json`);
    await context.storageState({ path: filePath });
    return filePath;
  }

  loadStorageState(name: string): string {
    return path.join(this.sessionStatesDir, `${name}.json`);
  }

  async createMultiDaySession(designData: any, dayOffset: number): Promise<string> {
    // Create session state with design created days ago
    const sessionName = `day${dayOffset}-${designData.name}`;
    const filePath = path.join(this.sessionStatesDir, `${sessionName}.json`);

    // Create mock storage state with adjusted timestamps
    const baseTime = Date.now() - (dayOffset * 24 * 60 * 60 * 1000);
    const storageState = {
      cookies: [],
      origins: [{
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'archicomm-design',
            value: JSON.stringify({
              ...designData,
              createdAt: baseTime,
              lastModified: baseTime
            })
          },
          {
            name: 'archicomm-session',
            value: JSON.stringify({
              sessionId: `session-${baseTime}`,
              startTime: baseTime
            })
          }
        ]
      }]
    };

    fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2));
    return filePath;
  }

  storageStateExists(name: string): boolean {
    const filePath = path.join(this.sessionStatesDir, `${name}.json`);
    return fs.existsSync(filePath);
  }

  deleteStorageState(name: string): void {
    const filePath = path.join(this.sessionStatesDir, `${name}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Factory function to create helper instances
export function createHelpers(page: Page) {
  return {
    canvas: new CanvasHelpers(page),
    toolbar: new ToolbarHelpers(page),
    workflow: new WorkflowHelpers(page),
    assert: new AssertionHelpers(page),
    mock: new MockHelpers(page),
    debug: new DebugHelpers(page),
    state: new TestStateManager(),
  };
}
