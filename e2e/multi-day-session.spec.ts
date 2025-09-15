// e2e/multi-day-session.spec.ts
// Multi-day session persistence tests for complex user workflows
// Tests design state preservation across browser restarts and time gaps
// RELEVANT FILES: e2e/utils/test-helpers.ts, e2e/utils/test-data-manager.ts, src/services/PersistenceService.ts, src/services/WorkflowOptimizer.ts

import { test, expect } from '@playwright/test';
import { createHelpers } from './utils/test-helpers';
import { testDataManager } from './utils/test-data-manager';

test.describe('Multi-Day Session Persistence', () => {
  test.describe.configure({ mode: 'serial' });

  const complexDesignData = {
    name: 'complex-design',
    componentCount: 12,
    annotations: [
      { text: 'Main API Gateway', x: 200, y: 100 },
      { text: 'Database Cluster', x: 400, y: 200 },
      { text: 'Cache Layer', x: 600, y: 150 }
    ],
    components: [
      { type: 'api-gateway', x: 200, y: 100 },
      { type: 'load-balancer', x: 100, y: 50 },
      { type: 'server', x: 300, y: 150 },
      { type: 'server', x: 300, y: 250 },
      { type: 'database', x: 400, y: 200 },
      { type: 'database', x: 500, y: 200 },
      { type: 'cache', x: 600, y: 150 },
      { type: 'server', x: 700, y: 100 },
      { type: 'server', x: 700, y: 200 },
      { type: 'api-gateway', x: 800, y: 150 },
      { type: 'load-balancer', x: 900, y: 100 },
      { type: 'cache', x: 950, y: 200 }
    ]
  };

  test('day 1: create and save complex design', async ({ page, context }) => {
    const helpers = createHelpers(page);

    // Navigate to canvas
    await helpers.canvas.navigateToCanvas();

    // Create complex design with multiple components
    for (const component of complexDesignData.components) {
      await helpers.canvas.addComponent(component.type, { x: component.x, y: component.y });
    }

    // Add annotations
    for (const annotation of complexDesignData.annotations) {
      await helpers.canvas.addAnnotation(annotation.text, { x: annotation.x, y: annotation.y });
    }

    // Verify design was created correctly
    await helpers.assert.assertComponentCount(complexDesignData.componentCount);
    await helpers.assert.assertAnnotationExists(complexDesignData.annotations[0].text);

    // Wait for auto-save to complete
    await page.waitForTimeout(2000);

    // Save storage state for next day
    await helpers.state.saveStorageState('day1-complex-design', context);

    // Verify session metadata exists
    const sessionData = await page.evaluate(() => {
      return localStorage.getItem('archicomm-session');
    });
    expect(sessionData).toBeTruthy();
  });

  test('day 1: verify auto-save functionality', async ({ page }) => {
    const helpers = createHelpers(page);

    // Use storage state from previous test
    await page.goto('/');

    // Add one more component to trigger auto-save
    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.addComponent('server', { x: 1000, y: 300 });

    // Wait for auto-save indicator
    await page.waitForTimeout(1000);

    // Verify localStorage has been updated
    const designData = await page.evaluate(() => {
      return localStorage.getItem('archicomm-design');
    });
    expect(designData).toBeTruthy();

    const parsedData = JSON.parse(designData);
    expect(parsedData.lastModified).toBeTruthy();
  });

  test('day 1: test session metadata', async ({ page }) => {
    const helpers = createHelpers(page);
    await helpers.canvas.navigateToCanvas();

    // Verify WorkflowOptimizer generates proper session IDs
    const sessionData = await page.evaluate(() => {
      return localStorage.getItem('archicomm-session');
    });

    expect(sessionData).toBeTruthy();
    const parsedSession = JSON.parse(sessionData);
    expect(parsedSession.sessionId).toBeTruthy();
    expect(parsedSession.startTime).toBeTruthy();
  });

  test('day 2: restore design from previous session', async ({ page, context }) => {
    const helpers = createHelpers(page);

    // Load storage state from day 1
    const storageStatePath = helpers.state.loadStorageState('day1-complex-design');
    await context.addInitScript(() => {
      // Simulate day 2 by advancing time
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + (24 * 60 * 60 * 1000);
    });

    // Navigate to canvas
    await page.goto('/');
    await helpers.canvas.navigateToCanvas();

    // Verify all components and annotations restored
    await helpers.assert.assertSessionPersisted({
      componentCount: complexDesignData.componentCount + 1, // +1 from auto-save test
      annotations: complexDesignData.annotations
    });

    // Verify all annotations are present
    for (const annotation of complexDesignData.annotations) {
      await helpers.assert.assertAnnotationExists(annotation.text);
    }

    // Verify design is functional - user can continue working
    await helpers.canvas.addComponent('database', { x: 1100, y: 400 });
    await helpers.assert.assertComponentCount(complexDesignData.componentCount + 2);
  });

  test('day 3: continue design work', async ({ page, context }) => {
    const helpers = createHelpers(page);

    // Load from day 1 state and simulate day 3
    const storageStatePath = helpers.state.loadStorageState('day1-complex-design');
    await context.addInitScript(() => {
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + (3 * 24 * 60 * 60 * 1000);
    });

    await page.goto('/');
    await helpers.canvas.navigateToCanvas();

    // Add more components and annotations
    await helpers.canvas.addComponent('cache', { x: 1200, y: 350 });
    await helpers.canvas.addAnnotation('Backup System', { x: 1200, y: 300 });

    // Test complex interactions
    await helpers.canvas.selectMultipleComponents(['Server', 'Database']);
    await helpers.canvas.deleteSelected();

    // Verify session continues seamlessly
    const finalComponentCount = await helpers.canvas.getComponentCount();
    expect(finalComponentCount).toBeGreaterThan(8); // Some components deleted, some added
  });

  test('day 7: long-term persistence', async ({ page, context }) => {
    const helpers = createHelpers(page);

    // Simulate week-long gap
    await helpers.mock.advanceTimeBy(7);

    const storageStatePath = helpers.state.loadStorageState('day1-complex-design');
    await page.goto('/');
    await helpers.canvas.navigateToCanvas();

    // Verify design still loads after week gap
    await helpers.assert.assertComponentCount(complexDesignData.componentCount + 1);
    await helpers.assert.assertAnnotationExists(complexDesignData.annotations[0].text);

    // Test that all functionality still works
    await helpers.canvas.zoomIn(2);
    await helpers.canvas.panCanvas(100, 100);
    await helpers.canvas.resetZoom();

    // Verify no errors after long-term storage
    await helpers.assert.assertNoErrors();
  });

  test('corrupted session recovery', async ({ page }) => {
    const helpers = createHelpers(page);

    // Simulate corrupted localStorage
    await page.addInitScript(() => {
      localStorage.setItem('archicomm-design', '{"corrupted": "data"');
      localStorage.setItem('archicomm-session', 'invalid-json');
    });

    await page.goto('/');
    await helpers.canvas.navigateToCanvas();

    // Should gracefully handle corruption and start fresh
    await helpers.assert.assertNoErrors();

    // Verify user can still create designs
    await helpers.canvas.addComponent('server', { x: 200, y: 200 });
    await helpers.assert.assertComponentCount(1);
  });

  test('storage quota exceeded', async ({ page }) => {
    const helpers = createHelpers(page);

    // Simulate localStorage quota exceeded
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = (key: string, value: string) => {
        if (key.includes('archicomm')) {
          throw new Error('QuotaExceededError');
        }
        return originalSetItem.call(localStorage, key, value);
      };
    });

    await helpers.canvas.navigateToCanvas();

    // Should fallback to IndexedDB or alternative storage
    await helpers.canvas.addComponent('server', { x: 200, y: 200 });
    await page.waitForTimeout(1000);

    // Verify no errors and component was added
    await helpers.assert.assertNoErrors();
    await helpers.assert.assertComponentCount(1);
  });

  test('cross-browser session transfer', async ({ page, browser }) => {
    const helpers = createHelpers(page);

    // Create design in first context
    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.addComponent('api-gateway', { x: 300, y: 200 });
    await helpers.canvas.addComponent('database', { x: 500, y: 200 });
    await helpers.canvas.addAnnotation('Transfer Test', { x: 400, y: 150 });

    // Export design data
    const designData = await page.evaluate(() => {
      return localStorage.getItem('archicomm-design');
    });

    // Create second browser context
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    const secondHelpers = createHelpers(secondPage);

    // Import design to second context
    await secondPage.addInitScript((data) => {
      localStorage.setItem('archicomm-design', data);
    }, designData);

    await secondPage.goto('/');
    await secondHelpers.canvas.navigateToCanvas();

    // Verify design transferred correctly
    await secondHelpers.assert.assertComponentCount(2);
    await secondHelpers.assert.assertAnnotationExists('Transfer Test');

    await secondContext.close();
  });
});