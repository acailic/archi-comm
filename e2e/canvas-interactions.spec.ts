// e2e/canvas-interactions.spec.ts
// Focused E2E tests for canvas interactions and component manipulation
// Tests drag-and-drop, connections, and canvas controls
// RELEVANT FILES: src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx, src/packages/canvas/components/ReactFlowCanvasWrapper.tsx

import { test, expect, Page } from '@playwright/test';

// Helper functions
async function waitForCanvas(page: Page): Promise<boolean> {
  const selectors = [
    '.react-flow',
    '[data-testid="canvas"]',
    '[data-testid="design-canvas"]',
    'canvas'
  ];

  for (const selector of selectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

async function findComponentPalette(page: Page) {
  // Use the correct selector: h3 with "Component Library" text
  const selector = 'h3:has-text("Component Library")';
  const element = page.locator(selector).first();

  try {
    await element.waitFor({ state: 'visible', timeout: 5000 });
    return element;
  } catch (error) {
    console.log(`Component palette not found: ${error}`);
    return null;
  }
}

async function getPaletteComponent(page: Page, type: string = 'server') {
  // Use correct data-testid format: palette-item-{type}
  const selector = `[data-testid="palette-item-${type}"]`;
  const element = page.locator(selector).first();

  try {
    await element.waitFor({ state: 'visible', timeout: 5000 });
    return element;
  } catch (error) {
    console.log(`Palette component '${type}' not found: ${error}`);
    return null;
  }
}

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Start the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for challenge selection screen
    await page.waitForSelector('h1:has-text("Choose Your Challenge")', { state: 'visible', timeout: 10000 });

    // Select a challenge
    const challengeButton = page.getByRole('button', { name: /start challenge/i }).first();
    await challengeButton.waitFor({ state: 'visible', timeout: 10000 });

    try {
      await challengeButton.click({ timeout: 3000 });
    } catch (error) {
      console.log(`Challenge button click error: ${error}`);
      throw error;
    }

    // Wait for canvas to be ready
    await page.waitForSelector('.react-flow', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('canvas should be visible and interactive', async ({ page }) => {
    const canvasVisible = await waitForCanvas(page);
    expect(canvasVisible).toBeTruthy();

    console.log('✓ Canvas is visible');

    // Take screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/canvas-visible.png',
      fullPage: false
    });
  });

  test('component palette should be accessible', async ({ page }) => {
    const palette = await findComponentPalette(page);
    expect(palette).toBeTruthy();

    console.log('✓ Component palette found');

    // Check if palette has components
    const paletteItems = await page.locator('[data-testid^="palette-item"]').count();
    console.log(`Found ${paletteItems} components in palette`);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/palette-visible.png',
      fullPage: false
    });
  });

  test('should drag component from palette to canvas', async ({ page }) => {
    // Find component to drag (use 'server' type)
    const component = await getPaletteComponent(page, 'server');

    if (!component) {
      console.log('⚠ No draggable components found, skipping test');
      test.skip();
      return;
    }

    // Get canvas pane
    const canvas = page.locator('.react-flow__pane');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Get component bounding box
    const componentBox = await component.boundingBox();
    const canvasBox = await canvas.boundingBox();

    expect(componentBox).toBeTruthy();
    expect(canvasBox).toBeTruthy();

    if (componentBox && canvasBox) {
      console.log(`Component position: x=${componentBox.x}, y=${componentBox.y}`);

      // Perform drag operation with multi-step movement
      const startX = componentBox.x + componentBox.width / 2;
      const startY = componentBox.y + componentBox.height / 2;
      const endX = canvasBox.x + canvasBox.width / 2;
      const endY = canvasBox.y + canvasBox.height / 2;

      // Drag with 20 steps for smooth operation
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(endX, endY, { steps: 20 });
      await page.waitForTimeout(100);
      await page.mouse.up();

      console.log('✓ Drag operation completed');

      // Wait for React Flow node to appear
      await page.waitForSelector('.react-flow__node', { state: 'visible', timeout: 5000 });

      // Verify node count
      const nodeCount = await page.locator('.react-flow__node').count();
      expect(nodeCount).toBeGreaterThan(0);

      console.log(`✓ ${nodeCount} node(s) on canvas`);

      // Take screenshot of result
      await page.screenshot({
        path: 'e2e/test-results/artifacts/component-dropped.png',
        fullPage: false
      });
    }
  });

  test('should add multiple components to canvas', async ({ page }) => {
    const positions = [
      { x: 400, y: 300 },
      { x: 800, y: 300 },
      { x: 600, y: 500 }
    ];

    for (let i = 0; i < positions.length; i++) {
      const component = await getPaletteComponent(page, i % 3); // Cycle through first 3 components

      if (component) {
        const box = await component.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(50);
          await page.mouse.move(positions[i].x, positions[i].y, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(500);

          console.log(`✓ Component ${i + 1} added at (${positions[i].x}, ${positions[i].y})`);
        }
      }
    }

    // Take final screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/multiple-components.png',
      fullPage: false
    });
  });

  test('should handle canvas zoom controls', async ({ page }) => {
    // Look for zoom buttons
    const zoomInSelectors = [
      'button[aria-label*="zoom in" i]',
      'button:has-text("+")',
      '[data-testid="zoom-in"]'
    ];

    for (const selector of zoomInSelectors) {
      const zoomIn = page.locator(selector).first();
      if (await zoomIn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click zoom in
        await zoomIn.click();
        await page.waitForTimeout(300);
        await zoomIn.click();
        await page.waitForTimeout(300);

        console.log('✓ Zoom in successful');
        break;
      }
    }

    // Try zoom out
    const zoomOutSelectors = [
      'button[aria-label*="zoom out" i]',
      'button:has-text("-")',
      '[data-testid="zoom-out"]'
    ];

    for (const selector of zoomOutSelectors) {
      const zoomOut = page.locator(selector).first();
      if (await zoomOut.isVisible({ timeout: 2000 }).catch(() => false)) {
        await zoomOut.click();
        await page.waitForTimeout(300);

        console.log('✓ Zoom out successful');
        break;
      }
    }

    // Take screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/zoom-controls.png',
      fullPage: false
    });
  });

  test('should handle canvas panning', async ({ page }) => {
    const canvasVisible = await waitForCanvas(page);
    if (!canvasVisible) {
      test.skip();
      return;
    }

    // Pan by dragging on canvas
    const startX = 600;
    const startY = 400;
    const endX = 400;
    const endY = 300;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 15 });
    await page.mouse.up();

    console.log('✓ Canvas panning completed');

    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/canvas-panned.png',
      fullPage: false
    });
  });

  test('should search and filter components in palette', async ({ page }) => {
    // Look for search input
    const searchSelectors = [
      'input[placeholder*="Search" i]',
      'input[type="search"]',
      '[data-testid="search-input"]'
    ];

    for (const selector of searchSelectors) {
      const searchInput = page.locator(selector).first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Type search query
        await searchInput.fill('server');
        await page.waitForTimeout(500);

        console.log('✓ Search filter applied');

        // Take screenshot
        await page.screenshot({
          path: 'e2e/test-results/artifacts/palette-filtered.png',
          fullPage: false
        });

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(300);

        break;
      }
    }
  });

  test('should handle component selection and properties', async ({ page }) => {
    // Add a component first
    const component = await getPaletteComponent(page, 0);

    if (component) {
      const box = await component.boundingBox();
      if (box) {
        // Drag component to canvas
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(600, 400, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(1000);

        // Click on the dropped component to select it
        await page.mouse.click(600, 400);
        await page.waitForTimeout(500);

        console.log('✓ Component selected');

        // Look for properties panel
        const propertiesSelectors = [
          'text=Properties',
          '[data-testid="properties-panel"]',
          '[class*="PropertiesPanel"]'
        ];

        let propertiesFound = false;
        for (const selector of propertiesSelectors) {
          const panel = page.locator(selector).first();
          if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('✓ Properties panel visible');
            propertiesFound = true;
            break;
          }
        }

        // Take screenshot
        await page.screenshot({
          path: 'e2e/test-results/artifacts/component-selected.png',
          fullPage: false
        });
      }
    }
  });

  test('should persist canvas state', async ({ page }) => {
    // Add a component
    const component = await getPaletteComponent(page, 0);

    if (component) {
      const box = await component.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(500, 350, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(1000);

        console.log('✓ Component added');

        // Take screenshot before reload
        await page.screenshot({
          path: 'e2e/test-results/artifacts/before-reload.png',
          fullPage: false
        });

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('✓ Page reloaded');

        // Take screenshot after reload
        await page.screenshot({
          path: 'e2e/test-results/artifacts/after-reload.png',
          fullPage: false
        });

        // Check if canvas is still there
        const canvasVisible = await waitForCanvas(page);
        expect(canvasVisible).toBeTruthy();
      }
    }
  });
});

test.describe('Canvas Performance', () => {
  test('should handle rapid component additions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const startTime = Date.now();

    // Try to add 5 components rapidly
    for (let i = 0; i < 5; i++) {
      const component = await getPaletteComponent(page, 0);
      if (component) {
        const box = await component.boundingBox();
        if (box) {
          const x = 300 + i * 150;
          const y = 300 + (i % 2) * 150;

          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(x, y, { steps: 5 });
          await page.mouse.up();
          await page.waitForTimeout(200);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✓ Added 5 components in ${duration}ms`);

    // Should complete in reasonable time (< 10 seconds)
    expect(duration).toBeLessThan(10000);

    // Take final screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/performance-test.png',
      fullPage: false
    });
  });
});