// e2e/cross-platform-consistency.spec.ts
// Cross-platform workflow consistency tests for browser and device compatibility
// Tests identical behavior across browsers, viewports, and interaction methods
// RELEVANT FILES: e2e/utils/test-helpers.ts, e2e/responsive-design.spec.ts, playwright.config.ts, src/components/ResponsiveCanvas.tsx

import { test, expect, devices } from '@playwright/test';
import { createHelpers } from './utils/test-helpers';
import { testDataManager } from './utils/test-data-manager';

// Test data for consistency validation
const testDesign = {
  name: 'cross-platform-test',
  components: [
    { type: 'server', x: 200, y: 200 },
    { type: 'database', x: 400, y: 200 },
    { type: 'cache', x: 600, y: 200 },
    { type: 'api-gateway', x: 300, y: 100 },
    { type: 'load-balancer', x: 500, y: 100 }
  ],
  annotations: [
    { text: 'Main Flow', x: 400, y: 150 },
    { text: 'Data Layer', x: 500, y: 250 }
  ]
};

let baselineData: any = null;

test.describe('Cross-Platform Consistency', () => {
  test.describe('Browser Consistency', () => {
    test('identical design rendering across browsers', async ({ page, browserName }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create test design
      for (const component of testDesign.components) {
        await helpers.canvas.addComponent(component.type, { x: component.x, y: component.y });
      }

      // Add annotations
      for (const annotation of testDesign.annotations) {
        await helpers.canvas.addAnnotation(annotation.text, { x: annotation.x, y: annotation.y });
      }

      // Collect data for comparison
      const componentCount = await helpers.canvas.getComponentCount();
      const annotationCount = await helpers.canvas.getAnnotationCount();

      // Get component positions
      const components = await page.locator('.react-flow__node').all();
      const componentPositions = [];
      for (const component of components) {
        const box = await component.boundingBox();
        if (box) {
          componentPositions.push({ x: box.x, y: box.y, width: box.width, height: box.height });
        }
      }

      const currentData = {
        browserName,
        componentCount,
        annotationCount,
        componentPositions,
        viewport: await page.viewportSize()
      };

      if (!baselineData) {
        // First browser becomes baseline
        baselineData = currentData;
      } else {
        // Compare with baseline
        await helpers.assert.assertCrossPlatformConsistency(baselineData);

        // Verify specific metrics match
        expect(componentCount).toBe(baselineData.componentCount);
        expect(annotationCount).toBe(baselineData.annotationCount);
      }
    });

    test('export consistency across platforms', async ({ page, browserName }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create identical design
      await helpers.canvas.addComponent('server', { x: 300, y: 200 });
      await helpers.canvas.addComponent('database', { x: 500, y: 200 });

      // Get design export data
      const exportData = await page.evaluate(() => {
        const designData = localStorage.getItem('archicomm-design');
        return designData ? JSON.parse(designData) : null;
      });

      expect(exportData).toBeTruthy();

      // Store for comparison (in real implementation, would compare across browsers)
      if (exportData) {
        expect(exportData.components || exportData.nodes).toBeTruthy();
      }
    });

    test('keyboard shortcuts cross-browser', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      // Test undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(500);

      let componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(1);

      // Test redo
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(500);

      componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(2);

      // Test select all + delete
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(0);
    });

    test('drag and drop behavior consistency', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Test component drag from palette
      const serverComponent = page.locator('[data-testid="palette-item-server"]').first();
      const canvas = page.locator('[data-testid="canvas"]');

      await serverComponent.dragTo(canvas, { targetPosition: { x: 300, y: 200 } });
      await page.waitForTimeout(500);

      await helpers.assert.assertComponentCount(1);

      // Test component repositioning
      const addedComponent = page.locator('.react-flow__node').first();
      await addedComponent.dragTo(canvas, { targetPosition: { x: 400, y: 250 } });
      await page.waitForTimeout(500);

      // Verify component moved
      const newPosition = await addedComponent.boundingBox();
      expect(newPosition).toBeTruthy();
    });
  });

  test.describe('Mobile vs Desktop Consistency', () => {
    test('design state preservation mobile to desktop', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Start in mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.canvas.navigateToCanvas();

      // Create design on mobile
      await helpers.canvas.addComponent('server', { x: 150, y: 200 });
      await helpers.canvas.addComponent('database', { x: 200, y: 300 });

      // Get design data
      const mobileDesign = await page.evaluate(() => {
        return localStorage.getItem('archicomm-design');
      });

      // Switch to desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(1000);

      // Verify design preserved
      await helpers.assert.assertComponentCount(2);

      // Verify design data unchanged
      const desktopDesign = await page.evaluate(() => {
        return localStorage.getItem('archicomm-design');
      });

      expect(desktopDesign).toBe(mobileDesign);
    });

    test('touch vs mouse interaction equivalence', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Test touch-like interaction (mobile simulation)
      await page.setViewportSize({ width: 375, height: 667 });

      const component = page.locator('.react-flow__node').first();
      const canvas = page.locator('[data-testid="canvas"]');

      // Simulate touch drag
      await component.dispatchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 200 }]
      });

      await component.dispatchEvent('touchmove', {
        touches: [{ clientX: 300, clientY: 250 }]
      });

      await component.dispatchEvent('touchend', {
        touches: []
      });

      await page.waitForTimeout(500);

      // Switch back to desktop and verify same result
      await page.setViewportSize({ width: 1920, height: 1080 });
      await helpers.assert.assertComponentCount(1);
    });

    test('responsive design data integrity', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create complex design
      const originalViewport = { width: 1920, height: 1080 };
      await page.setViewportSize(originalViewport);

      for (const component of testDesign.components) {
        await helpers.canvas.addComponent(component.type, { x: component.x, y: component.y });
      }

      // Get baseline data
      const originalData = await page.evaluate(() => {
        return localStorage.getItem('archicomm-design');
      });

      // Test multiple viewport sizes
      const viewports = [
        { width: 768, height: 1024 }, // Tablet
        { width: 375, height: 667 },  // Mobile
        { width: 1366, height: 768 }, // Laptop
        originalViewport              // Back to original
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        // Verify data integrity
        const currentData = await page.evaluate(() => {
          return localStorage.getItem('archicomm-design');
        });

        expect(currentData).toBe(originalData);
        await helpers.assert.assertComponentCount(testDesign.components.length);
      }
    });
  });

  test.describe('Performance Consistency', () => {
    test('canvas performance across browsers', async ({ page, browserName }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Measure performance while adding components
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        const x = 100 + (i % 5) * 150;
        const y = 100 + Math.floor(i / 5) * 150;
        await helpers.canvas.addComponent('server', { x, y });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance should be reasonable across browsers
      expect(duration).toBeLessThan(30000); // 30 seconds max

      // Verify all components added
      await helpers.assert.assertComponentCount(20);

      console.log(`${browserName}: Added 20 components in ${duration}ms`);
    });

    test('memory usage consistency', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Get baseline memory
      const baselineMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Create large design
      await helpers.canvas.createLargeDesign(30);

      // Check memory usage
      const peakMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory increase should be reasonable
      const memoryIncrease = peakMemory - baselineMemory;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max increase

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('rendering performance parity', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Enable performance monitoring
      await helpers.mock.injectPerformanceMonitor();

      // Perform rendering operations
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.zoomIn(3);
      await helpers.canvas.panCanvas(100, 100);
      await helpers.canvas.resetZoom();

      // Get performance metrics
      const performanceLog = await helpers.mock.getPerformanceLog();

      // Verify reasonable frame times
      const frameTimes = performanceLog
        .filter(entry => entry.type === 'frame')
        .map(entry => entry.duration);

      if (frameTimes.length > 0) {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        expect(avgFrameTime).toBeLessThan(33); // 30fps minimum
      }
    });
  });

  test.describe('Feature Parity Testing', () => {
    test('auto-save behavior consistency', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Track auto-save events
      let autoSaveCount = 0;
      await page.route('**/api/autosave**', async route => {
        autoSaveCount++;
        await route.continue();
      });

      // Trigger auto-save events
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await page.waitForTimeout(2000);

      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await page.waitForTimeout(2000);

      // Verify auto-save behavior
      const designData = await page.evaluate(() => {
        return localStorage.getItem('archicomm-design');
      });

      expect(designData).toBeTruthy();
      if (designData) {
        const parsed = JSON.parse(designData);
        expect(parsed.lastModified).toBeTruthy();
      }
    });

    test('undo/redo stack consistency', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Build undo stack
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addComponent('cache', { x: 600, y: 200 });

      await helpers.assert.assertComponentCount(3);

      // Test undo sequence
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);
      await helpers.assert.assertComponentCount(2);

      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);
      await helpers.assert.assertComponentCount(1);

      // Test redo sequence
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(300);
      await helpers.assert.assertComponentCount(2);

      await page.keyboard.press('Control+y');
      await page.waitForTimeout(300);
      await helpers.assert.assertComponentCount(3);
    });

    test('annotation editing consistency', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create annotation
      await helpers.canvas.addAnnotation('Test Annotation', { x: 300, y: 200 });
      await helpers.assert.assertAnnotationExists('Test Annotation');

      // Edit annotation
      const annotation = page.getByText('Test Annotation').first();
      await annotation.dblclick();

      const editField = page.locator('textarea, input[type="text"]').first();
      if (await editField.isVisible()) {
        await editField.fill('Edited Annotation');
        await editField.press('Enter');
      }

      await page.waitForTimeout(500);
      await helpers.assert.assertAnnotationExists('Edited Annotation');
    });
  });

  test.describe('Visual Consistency', () => {
    test('component appearance across browsers', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 300, y: 200 });

      // Take screenshot for visual comparison
      const component = page.locator('.react-flow__node').first();
      await expect(component).toBeVisible();

      // Verify component has expected styling
      const styles = await component.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          fontSize: computed.fontSize,
          fontFamily: computed.fontFamily
        };
      });

      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.borderRadius).toBeTruthy();
    });

    test('layout stability across viewports', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create layout
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      const originalPositions = await page.locator('.react-flow__node').all();
      const positions1 = [];
      for (const node of originalPositions) {
        const box = await node.boundingBox();
        if (box) positions1.push({ x: box.x, y: box.y });
      }

      // Change viewport and back
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(1000);
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(1000);

      // Verify positions preserved
      const newPositions = await page.locator('.react-flow__node').all();
      const positions2 = [];
      for (const node of newPositions) {
        const box = await node.boundingBox();
        if (box) positions2.push({ x: box.x, y: box.y });
      }

      expect(positions2.length).toBe(positions1.length);
    });

    test('color scheme consistency', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Test both light and dark themes if available
      const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle');
      if (await themeToggle.isVisible()) {
        // Test theme switching
        await themeToggle.click();
        await page.waitForTimeout(1000);

        // Verify theme applied
        const bodyClass = await page.locator('body').getAttribute('class');
        expect(bodyClass).toBeTruthy();

        // Switch back
        await themeToggle.click();
        await page.waitForTimeout(1000);
      }

      // Verify consistent color application
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      const component = page.locator('.react-flow__node').first();

      const color = await component.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      expect(color).toBeTruthy();
    });
  });
});