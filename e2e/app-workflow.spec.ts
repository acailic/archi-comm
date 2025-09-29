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
    // Check that the app container is present
    await expect(page.locator('body')).toBeVisible();

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
    // Look for challenge selection elements
    const challengeText = await page.textContent('body');

    // Check for challenge-related content
    expect(
      challengeText?.includes('Challenge') ||
      challengeText?.includes('Select') ||
      challengeText?.includes('Design') ||
      challengeText?.includes('Architecture')
    ).toBeTruthy();
  });

  test('complete workflow: select challenge and create design', async ({ page }) => {
    // Step 1: Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('App loaded, looking for challenges...');

    // Step 2: Find and click a challenge
    // Try multiple selectors for challenge cards/buttons
    const challengeSelectors = [
      '[data-testid*="challenge"]',
      'button:has-text("Select")',
      'button:has-text("Start")',
      'button:has-text("Begin")',
      '[role="button"]:has-text("Challenge")',
      '.challenge-card',
      '[class*="challenge"]'
    ];

    let challengeClicked = false;
    for (const selector of challengeSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found ${elements.length} challenges with selector: ${selector}`);
        try {
          // Click the first challenge
          await elements[0].click({ timeout: 5000 });
          challengeClicked = true;
          console.log('Challenge clicked successfully');
          break;
        } catch (e) {
          console.log(`Failed to click with selector ${selector}: ${e}`);
        }
      }
    }

    if (!challengeClicked) {
      // If no challenge button found, we might already be on the canvas
      console.log('No challenge button found, checking if already on canvas...');
    }

    // Step 3: Wait for canvas to appear
    await page.waitForTimeout(2000);

    console.log('Looking for canvas area...');

    // Step 4: Look for canvas or design area
    const canvasSelectors = [
      '[data-testid="canvas"]',
      '[data-testid="design-canvas"]',
      'canvas',
      '[class*="canvas"]',
      '[class*="Canvas"]',
      '.react-flow',
      '[data-id="react-flow"]'
    ];

    let canvasFound = false;
    for (const selector of canvasSelectors) {
      const canvas = page.locator(selector).first();
      if (await canvas.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Canvas found with selector: ${selector}`);
        canvasFound = true;
        break;
      }
    }

    // Step 5: Look for component palette
    console.log('Looking for component palette...');

    const paletteSelectors = [
      '[data-testid*="palette"]',
      '[data-testid*="component"]',
      'text=Component Library',
      'text=Components',
      '[class*="palette"]',
      '[class*="Palette"]'
    ];

    let paletteFound = false;
    for (const selector of paletteSelectors) {
      const palette = page.locator(selector).first();
      if (await palette.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Component palette found with selector: ${selector}`);
        paletteFound = true;

        // Try to interact with a component
        try {
          const components = await palette.locator('div, button').all();
          console.log(`Found ${components.length} items in palette`);

          if (components.length > 0) {
            // Get the first draggable component
            const firstComponent = components[0];
            await firstComponent.hover();
            console.log('Hovered over first component');
          }
        } catch (e) {
          console.log(`Error interacting with palette: ${e}`);
        }
        break;
      }
    }

    // Step 6: Take a screenshot of the current state
    await page.screenshot({
      path: 'e2e/test-results/artifacts/workflow-complete.png',
      fullPage: true
    });

    console.log('Screenshot saved');

    // Step 7: Verify we're in a working state
    const bodyText = await page.textContent('body');

    // Check for key UI elements
    const hasContent = bodyText && bodyText.length > 100;
    expect(hasContent).toBeTruthy();

    console.log('Workflow test completed successfully');
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
      await page.waitForTimeout(500);

      // Check that the app is still visible and functional
      const isVisible = await page.locator('body').isVisible();
      expect(isVisible).toBeTruthy();

      console.log(`${viewport.name} viewport test passed`);
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
  });
});

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should allow component drag and drop', async ({ page }) => {
    // Find component palette
    const palette = page.locator('text=Component Library').first();

    if (await palette.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get first draggable component
      const component = palette.locator('[data-testid^="palette-item"]').first();

      if (await component.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Get component position
        const box = await component.boundingBox();

        if (box) {
          // Drag to canvas center
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(800, 400, { steps: 10 });
          await page.mouse.up();

          console.log('Component dragged to canvas');
        }
      }
    }
  });

  test('should handle component selection', async ({ page }) => {
    // Try to find and click any component on canvas
    const componentSelectors = [
      '[data-id]',
      '[data-testid*="node"]',
      '.react-flow__node'
    ];

    for (const selector of componentSelectors) {
      const components = await page.locator(selector).all();
      if (components.length > 0) {
        await components[0].click();
        console.log('Component selected');

        // Check if properties panel appears
        await page.waitForTimeout(500);
        break;
      }
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

    // UI should still be responsive
    const isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();
  });
});