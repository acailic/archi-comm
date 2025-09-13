// e2e/visual-regression.spec.ts
// Visual regression testing suite for ArchiComm
// Ensures UI consistency across different scenarios and states
// RELEVANT FILES: playwright.config.ts, e2e/canvas.spec.ts, src/components/ui, src/modules/canvas

import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page
      .getByRole('button', { name: /start challenge/i })
      .first()
      .click();

    // Ensure consistent rendering
    await page.waitForTimeout(1000);
  });

  test.describe('Canvas Component States', () => {
    test('empty canvas state', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      await expect(canvas).toBeVisible();

      // Take screenshot of empty canvas
      await expect(page).toHaveScreenshot('empty-canvas.png');
    });

    test('canvas with single component', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      await server.dragTo(canvas);
      await page.waitForTimeout(500); // Allow animation to complete

      await expect(page).toHaveScreenshot('single-component-canvas.png');
    });

    test('canvas with multiple components and connections', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');

      // Add multiple components
      const components = ['server', 'database', 'api-gateway', 'cache', 'load-balancer'];

      for (let i = 0; i < components.length; i++) {
        const component = page.locator(`[data-testid="palette-item-${components[i]}"]`).first();
        await component.dragTo(canvas, {
          targetPosition: { x: 150 + (i % 3) * 200, y: 150 + Math.floor(i / 3) * 150 },
        });
      }

      await page.waitForTimeout(1000); // Allow all components to render

      await expect(page).toHaveScreenshot('multi-component-canvas.png');
    });

    test('canvas with annotations', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      await server.dragTo(canvas);

      // Add annotation
      await canvas.dblclick({ position: { x: 300, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Visual regression test annotation');
      await textarea.press('Control+Enter');

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('canvas-with-annotations.png');
    });
  });

  test.describe('UI Component States', () => {
    test('canvas toolbar default state', async ({ page }) => {
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();

      await expect(toolbar).toHaveScreenshot('canvas-toolbar-default.png');
    });

    test('canvas toolbar with selected tools', async ({ page }) => {
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');

      // Select different tools and capture states
      const panTool = page.locator('[data-testid="tool-pan"]');
      await panTool.click();

      await expect(toolbar).toHaveScreenshot('canvas-toolbar-pan-selected.png');

      const annotateTool = page.locator('[data-testid="tool-annotate"]');
      await annotateTool.click();

      await expect(toolbar).toHaveScreenshot('canvas-toolbar-annotate-selected.png');
    });

    test('right sidebar properties panel', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      await server.dragTo(canvas);

      // Select component to show properties
      const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
      await serverNode.click();

      const propertiesPanel = page.locator('[data-testid="properties-panel"]');
      if (await propertiesPanel.isVisible()) {
        await expect(propertiesPanel).toHaveScreenshot('properties-panel-selected.png');
      }
    });

    test('component palette states', async ({ page }) => {
      const palette = page.locator('[data-testid="component-palette"]');
      await expect(palette).toBeVisible();

      await expect(palette).toHaveScreenshot('component-palette-default.png');

      // Test hover state if available
      const serverItem = page.locator('[data-testid="palette-item-server"]').first();
      await serverItem.hover();

      await expect(palette).toHaveScreenshot('component-palette-hover.png');
    });
  });

  test.describe('Dialog and Modal States', () => {
    test('annotation edit dialog', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');

      // Create annotation and open edit dialog
      await canvas.dblclick({ position: { x: 200, y: 200 } });

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) {
        await expect(dialog).toHaveScreenshot('annotation-edit-dialog.png');

        // Test with content
        const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
        await editor.fill('Sample annotation content for visual testing');

        await expect(dialog).toHaveScreenshot('annotation-edit-dialog-with-content.png');
      }
    });

    test('color picker dialog', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      await canvas.dblclick({ position: { x: 200, y: 200 } });

      const colorPickerTrigger = page.locator('[data-testid="color-picker-trigger"]').first();
      if (await colorPickerTrigger.isVisible()) {
        await colorPickerTrigger.click();

        const colorPickerDialog = page.locator('[role="dialog"], .color-picker-popover').first();
        await expect(colorPickerDialog).toHaveScreenshot('color-picker-dialog.png');
      }
    });
  });

  test.describe('Responsive Design States', () => {
    test('desktop layout (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('desktop-layout-1920x1080.png');
    });

    test('tablet layout (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('tablet-layout-768x1024.png');
    });

    test('mobile layout (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('mobile-layout-375x667.png');
    });
  });

  test.describe('Theme and State Variations', () => {
    test('dark theme canvas', async ({ page, browserName }) => {
      // Skip if browser doesn't support dark theme properly
      if (browserName === 'webkit') {
        test.skip();
      }

      // Force dark theme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);

      await expect(page).toHaveScreenshot('dark-theme-canvas.png');
    });

    test('loading states', async ({ page }) => {
      // Simulate slower loading by intercepting requests
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });

      await page.reload();
      await page.getByRole('button', { name: /start your journey/i }).click();

      // Capture loading state if present
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      if (await loadingSpinner.isVisible()) {
        await expect(page).toHaveScreenshot('loading-state.png');
      }
    });

    test('error states', async ({ page }) => {
      // Trigger error state if available
      await page.evaluate(() => {
        // Force an error condition
        window.dispatchEvent(new Event('error'));
      });

      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      if (await errorBoundary.isVisible()) {
        await expect(errorBoundary).toHaveScreenshot('error-state.png');
      }
    });
  });

  test.describe('Animation and Interaction States', () => {
    test('component drag preview', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      // Start drag operation
      await server.hover();
      await page.mouse.down();
      await page.mouse.move(400, 300);

      // Capture drag state
      await expect(page).toHaveScreenshot('component-drag-preview.png');

      await page.mouse.up();
    });

    test('component hover states', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      await server.dragTo(canvas);

      const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
      await serverNode.hover();

      await expect(page).toHaveScreenshot('component-hover-state.png');
    });

    test('selection states', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      await server.dragTo(canvas);
      await database.dragTo(canvas);

      // Single selection
      const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
      await serverNode.click();

      await expect(page).toHaveScreenshot('single-selection-state.png');

      // Multi-selection (if supported)
      const databaseNode = page
        .locator('.react-flow__node')
        .filter({ hasText: 'Database' })
        .first();
      await databaseNode.click({ modifiers: ['Shift'] });

      await expect(page).toHaveScreenshot('multi-selection-state.png');
    });
  });

  test.describe('Export and Share States', () => {
    test('export dialog', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      await server.dragTo(canvas);

      const exportButton = page.getByRole('button', { name: /export/i }).first();
      if (await exportButton.isVisible()) {
        await exportButton.click();

        const exportDialog = page.locator('[role="dialog"], [data-testid="export-dialog"]').first();
        if (await exportDialog.isVisible()) {
          await expect(exportDialog).toHaveScreenshot('export-dialog.png');
        }
      }
    });

    test('share dialog', async ({ page }) => {
      const shareButton = page.getByRole('button', { name: /share/i }).first();
      if (await shareButton.isVisible()) {
        await shareButton.click();

        const shareDialog = page.locator('[role="dialog"], [data-testid="share-dialog"]').first();
        if (await shareDialog.isVisible()) {
          await expect(shareDialog).toHaveScreenshot('share-dialog.png');
        }
      }
    });
  });

  test.describe('Cross-Browser Visual Consistency', () => {
    test('browser-specific rendering differences', async ({ page, browserName }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      await server.dragTo(canvas);
      await database.dragTo(canvas);

      // Add annotation
      await canvas.dblclick({ position: { x: 300, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Cross-browser test');
      await textarea.press('Control+Enter');

      await page.waitForTimeout(500);

      // Browser-specific screenshot
      await expect(page).toHaveScreenshot(`cross-browser-${browserName}.png`);
    });

    test('font rendering consistency', async ({ page, browserName }) => {
      const canvas = page.locator('[data-testid="canvas"]');

      // Create content with various text elements
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);

      await canvas.dblclick({ position: { x: 200, y: 300 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill(
        'Font rendering test with various characters: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
      );
      await textarea.press('Control+Enter');

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`font-rendering-${browserName}.png`);
    });
  });

  test.describe('Performance Impact on Visuals', () => {
    test('high component count rendering', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');

      // Add many components to test visual performance
      for (let i = 0; i < 20; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas, {
          targetPosition: {
            x: 100 + (i % 5) * 150,
            y: 100 + Math.floor(i / 5) * 100,
          },
        });

        // Add delay every 5 components to avoid overwhelming
        if (i % 5 === 4) {
          await page.waitForTimeout(200);
        }
      }

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('high-component-count.png', {
        fullPage: true,
      });
    });

    test('zoom levels visual consistency', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      await server.dragTo(canvas);
      await database.dragTo(canvas);

      // Test different zoom levels
      const reactFlow = page.locator('.react-flow');

      // Zoom in
      await reactFlow.click();
      await page.keyboard.press('Control++');
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('zoom-in-state.png');

      // Zoom out
      await page.keyboard.press('Control+-');
      await page.keyboard.press('Control+-');
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('zoom-out-state.png');

      // Reset zoom
      await page.keyboard.press('Control+0');
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('zoom-reset-state.png');
    });
  });
});
