// e2e/app-workflow.spec.ts
// End-to-end test for complete ArchiComm application workflow
// Tests the full user journey from challenge selection to design submission
// RELEVANT FILES: src/packages/ui/components/AppContainer/AppContent.tsx, src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx

import { test, expect } from '@playwright/test';

test.describe('ArchiComm App Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow for initial renders
  });

  test('should load the application successfully', async ({ page }) => {
    // Check that the root element is present and has content
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    const content = await root.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);

    // Verify no critical errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit to capture any errors
    await page.waitForTimeout(2000);

    // Filter out expected/benign errors
    const criticalErrors = errors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('favicon') &&
      !err.includes('Download')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should display challenge selection screen', async ({ page }) => {
    // Wait for specific heading
    await page.waitForSelector('h1:has-text("Choose Your Challenge")', { state: 'visible', timeout: 10000 });

    // Check for challenge cards container (grid)
    const grid = page.locator('.grid').first();
    await expect(grid).toBeVisible();

    // Verify "Start Challenge" buttons exist
    const buttons = page.getByRole('button', { name: /start challenge/i });
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('complete workflow: select challenge and create design', async ({ page }) => {
    // Step 1: Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('App loaded, looking for challenges...');

    // Step 2: Wait for challenge selection screen
    await page.waitForSelector('h1:has-text("Choose Your Challenge")', { state: 'visible', timeout: 10000 });

    // Step 3: Find and click challenge button
    const challengeButton = page.getByRole('button', { name: /start challenge/i }).first();
    await challengeButton.waitFor({ state: 'visible', timeout: 10000 });

    // Take screenshot before clicking
    await page.screenshot({
      path: 'e2e/test-results/artifacts/challenge-selection.png',
      fullPage: true
    });

    // Click with retry logic
    let clicked = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Clicking challenge button (attempt ${attempt}/3)`);
        await challengeButton.click({ timeout: 3000 });
        clicked = true;
        console.log('✓ Challenge button clicked');
        break;
      } catch (error) {
        if (attempt === 3) {
          throw new Error(`Failed to click challenge button after 3 attempts: ${error}`);
        }
        await page.waitForTimeout(1000);
      }
    }

    expect(clicked).toBeTruthy();

    // Step 4: Wait for canvas to load
    console.log('Waiting for canvas...');
    await page.waitForSelector('.react-flow', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('.react-flow__pane', { state: 'visible', timeout: 5000 });

    console.log('✓ Canvas loaded');

    // Take screenshot of canvas
    await page.screenshot({
      path: 'e2e/test-results/artifacts/canvas-loaded.png',
      fullPage: true
    });

    // Step 5: Verify component palette is visible
    console.log('Looking for component palette...');

    const palette = page.locator('h3:has-text("Component Library")');
    await expect(palette).toBeVisible({ timeout: 5000 });

    console.log('✓ Component palette found');

    // Step 6: Verify palette has components
    const paletteItems = await page.locator('[data-testid^="palette-item-"]').count();
    console.log(`Found ${paletteItems} components in palette`);
    expect(paletteItems).toBeGreaterThan(0);

    // Step 7: Take final screenshot
    await page.screenshot({
      path: 'e2e/test-results/artifacts/workflow-complete.png',
      fullPage: true
    });

    console.log('✓ Workflow test completed successfully');
  });

  test('should be responsive and handle window resize', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 768, height: 1024, name: 'Tablet' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Wait for layout to stabilize after resize
      await page.waitForTimeout(500);

      // Check that root element is still visible and has content
      const root = page.locator('#root');
      await expect(root).toBeVisible();

      // Verify content is still interactive
      const content = await root.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);

      console.log(`✓ ${viewport.name} viewport test passed`);
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test keyboard shortcuts
    await page.waitForLoadState('networkidle');

    // Try common keyboard shortcuts
    // Cmd/Ctrl + K for command palette
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await page.waitForTimeout(500);

    // Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });

    // Should have focused on some element
    expect(activeElement).toBeTruthy();
  });

  test('should not have accessibility violations', async ({ page }) => {
    try {
      const { injectAxe, checkA11y } = await import('@axe-core/playwright');

      // Inject axe-core
      await injectAxe(page);

      // Run accessibility checks
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: {
          html: true,
        },
      });

      console.log('✓ Accessibility checks passed');
    } catch (error) {
      // If axe-core is not available, skip the test
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        console.log('⚠ Axe-core not available, skipping accessibility test');
        test.skip();
      } else {
        throw error;
      }
    }
  });
});

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should allow component drag and drop', async ({ page }) => {
    // Navigate to canvas first
    await page.waitForSelector('h1:has-text("Choose Your Challenge")', { state: 'visible', timeout: 10000 });
    const challengeButton = page.getByRole('button', { name: /start challenge/i }).first();
    await challengeButton.click();
    await page.waitForSelector('.react-flow', { state: 'visible', timeout: 10000 });

    // Find component palette
    const palette = page.locator('h3:has-text("Component Library")');
    await expect(palette).toBeVisible({ timeout: 5000 });

    // Get specific draggable component (server)
    const component = page.locator('[data-testid="palette-item-server"]').first();
    await expect(component).toBeVisible({ timeout: 5000 });

    // Get canvas pane
    const canvas = page.locator('.react-flow__pane');
    await expect(canvas).toBeVisible();

    // Get bounding boxes
    const componentBox = await component.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (componentBox && canvasBox) {
      const startX = componentBox.x + componentBox.width / 2;
      const startY = componentBox.y + componentBox.height / 2;
      const endX = canvasBox.x + canvasBox.width / 2;
      const endY = canvasBox.y + canvasBox.height / 2;

      // Perform drag with multiple steps
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(endX, endY, { steps: 20 });
      await page.waitForTimeout(100);
      await page.mouse.up();

      // Wait for node to appear
      await page.waitForSelector('.react-flow__node', { state: 'visible', timeout: 5000 });

      const nodeCount = await page.locator('.react-flow__node').count();
      expect(nodeCount).toBeGreaterThan(0);

      console.log('✓ Component dragged to canvas');
    }
  });

  test('should handle component selection', async ({ page }) => {
    // Navigate to canvas and add a component first
    await page.waitForSelector('h1:has-text("Choose Your Challenge")', { state: 'visible', timeout: 10000 });
    const challengeButton = page.getByRole('button', { name: /start challenge/i }).first();
    await challengeButton.click();
    await page.waitForSelector('.react-flow', { state: 'visible', timeout: 10000 });

    // Add a component
    const component = page.locator('[data-testid="palette-item-server"]').first();
    const canvas = page.locator('.react-flow__pane');

    try {
      await expect(component).toBeVisible({ timeout: 5000 });
      await expect(canvas).toBeVisible();

      const componentBox = await component.boundingBox();
      const canvasBox = await canvas.boundingBox();

      if (componentBox && canvasBox) {
        const startX = componentBox.x + componentBox.width / 2;
        const startY = componentBox.y + componentBox.height / 2;
        const endX = canvasBox.x + 400;
        const endY = canvasBox.y + 300;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 20 });
        await page.mouse.up();

        await page.waitForTimeout(1000);

        // Now try to select the node
        const node = page.locator('.react-flow__node').first();
        await node.waitFor({ state: 'visible', timeout: 5000 });
        await node.click();

        console.log('✓ Component selected');

        // Verify node is selected
        await page.waitForTimeout(500);
        const selectedNode = page.locator('.react-flow__node.selected');
        const hasSelected = await selectedNode.count();
        expect(hasSelected).toBeGreaterThan(0);
      }
    } catch (error) {
      console.log(`Component selection test error: ${error}`);
      throw error;
    }
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);

    console.log(`App loaded in ${loadTime}ms`);
  });

  test('should maintain responsive UI during interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Perform rapid interactions
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(Math.random() * 1000, Math.random() * 600);
      await page.waitForTimeout(100);
    }

    // UI should still be responsive - check #root since body has display:none
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});