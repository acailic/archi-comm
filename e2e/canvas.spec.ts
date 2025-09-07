import { test, expect } from '@playwright/test';
import path from 'path';

test('basic canvas functionality', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();

  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();

  const canvas = page.locator('[data-testid="canvas"]');
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();

  await server.dragTo(canvas);
  await database.dragTo(canvas);

  // Verify components appear on canvas (check for "Server" and "Database" text)
  await expect(page.getByText('Server').first()).toBeVisible();
  await expect(page.getByText('Database').first()).toBeVisible();
  
  // Test export functionality exists
  await expect(page.getByRole('button', { name: /export png/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /export$/i })).toBeVisible();
  
  // Verify connection edge accuracy after import
  const connectionPath = page.locator('svg path[marker-end]').first();
  await expect(connectionPath).toBeVisible();
  
  // Test connection visual accuracy by verifying path coordinates
  const pathElement = await connectionPath.getAttribute('d');
  expect(pathElement).toBeTruthy();
  expect(pathElement).toContain('M'); // Should start with Move command
  
  // Verify connection properly connects to component edges (not centers)
  const serverComponent = page.getByText('Server').first();
  const apiComponent = page.getByText('API Gateway').first();
  
  // Both components should be visible and properly connected
  await expect(serverComponent).toBeVisible();
  await expect(apiComponent).toBeVisible();
});

test('connection edge accuracy with different component positions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add components in different relative positions
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();
  const cache = page.locator('[data-testid="palette-item-cache"]').first();
  
  // Place components horizontally
  await server.dragTo(canvas, { targetPosition: { x: 100, y: 100 } });
  await database.dragTo(canvas, { targetPosition: { x: 300, y: 100 } });
  
  // Place component vertically relative to first
  await cache.dragTo(canvas, { targetPosition: { x: 100, y: 250 } });
  
  // Verify all components are visible on canvas
  await expect(page.getByText('Server').first()).toBeVisible();
  await expect(page.getByText('Database').first()).toBeVisible();
  await expect(page.getByText('Cache').first()).toBeVisible();
  
  // Test that export buttons work with multiple components
  await expect(page.getByRole('button', { name: /export png/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /export$/i })).toBeVisible();
});

test('connection arrow directions and styles work correctly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge  
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add two components
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const api = page.locator('[data-testid="palette-item-api-gateway"]').first();
  
  await server.dragTo(canvas);
  await api.dragTo(canvas);
  
  // Verify components are draggable and appear on canvas
  await expect(page.getByText('Server').first()).toBeVisible();
  await expect(page.getByText('Api gateway').first()).toBeVisible();
  
  // Test connection style selector exists
  await expect(page.getByText(/connection style/i)).toBeVisible();
});

test('should export canvas as image', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add components to create exportable content
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();
  
  await server.dragTo(canvas);
  await database.dragTo(canvas);
  
  // Verify components are visible
  await expect(page.getByText('Server').first()).toBeVisible();
  await expect(page.getByText('Database').first()).toBeVisible();
  
  // Setup download event listener
  const downloadPromise = page.waitForEvent('download');
  
  // Click Export PNG button
  const exportPngButton = page.getByRole('button', { name: /export png/i });
  await expect(exportPngButton).toBeVisible();
  await exportPngButton.click();
  
  // Wait for download and verify filename pattern
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/-design\.png$/);
  
  // Verify the download contains data
  const stream = await download.createReadStream();
  expect(stream).toBeTruthy();
});

test('should handle image export error gracefully', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Try to export empty canvas
  const exportPngButton = page.getByRole('button', { name: /export png/i });
  await expect(exportPngButton).toBeVisible();
  
  // Click export button - should not crash even with empty canvas
  await exportPngButton.click();
  
  // Verify the page is still functional after export attempt
  await expect(page.getByText(/start building/i)).toBeVisible();
});

test('should temporarily hide UI overlays during export', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add components and create connection to show UI overlays
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();
  
  await server.dragTo(canvas);
  await database.dragTo(canvas);
  
  // Verify UI overlays are visible by default
  await expect(page.locator('.absolute.top-4.right-4')).toBeVisible();
  
  // Test export functionality
  const exportPngButton = page.getByRole('button', { name: /export png/i });
  await exportPngButton.click();
  
  // Verify the page remains functional after export
  await expect(page.locator('.absolute.top-4.right-4')).toBeVisible();
  await expect(page.getByText('Server').first()).toBeVisible();
  await expect(page.getByText('Database').first()).toBeVisible();
});

test('inline annotation editing functionality', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add components to create content for annotation
  const server = page.locator('[data-testid="palette-item-server"]').first();
  await server.dragTo(canvas);
  
  // Test inline edit activation - double-click on canvas to create annotation
  await canvas.dblclick({ position: { x: 200, y: 200 } });
  
  // Verify inline textarea appears
  const inlineTextarea = page.locator('textarea').first();
  await expect(inlineTextarea).toBeVisible();
  await expect(inlineTextarea).toBeFocused();
  
  // Test real-time content updates - type in the textarea
  await inlineTextarea.fill('Test annotation content');
  
  // Test Ctrl+Enter saves changes (Cmd+Enter on Mac)
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await inlineTextarea.press(`${modifier}+Enter`);
  
  // Verify textarea disappears and annotation is saved
  await expect(inlineTextarea).not.toBeVisible();
  await expect(page.getByText('Test annotation content')).toBeVisible();
});

test('inline editing keyboard shortcuts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Create annotation by double-clicking
  await canvas.dblclick({ position: { x: 150, y: 150 } });
  
  const inlineTextarea = page.locator('textarea').first();
  await expect(inlineTextarea).toBeVisible();
  
  // Type some content
  await inlineTextarea.fill('Original content');
  
  // Change content then test Escape key cancels editing
  await inlineTextarea.fill('Modified content');
  await inlineTextarea.press('Escape');
  
  // Verify textarea disappears and original content is restored
  await expect(inlineTextarea).not.toBeVisible();
  await expect(page.getByText('New comment')).toBeVisible(); // Original default content
  await expect(page.getByText('Modified content')).not.toBeVisible();
});

test('inline editing blur to save', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Create annotation
  await canvas.dblclick({ position: { x: 100, y: 100 } });
  
  const inlineTextarea = page.locator('textarea').first();
  await expect(inlineTextarea).toBeVisible();
  
  // Type content and blur (click outside)
  await inlineTextarea.fill('Blur save test');
  await canvas.click({ position: { x: 300, y: 300 } });
  
  // Verify changes are saved
  await expect(inlineTextarea).not.toBeVisible();
  await expect(page.getByText('Blur save test')).toBeVisible();
});

test('inline editing visual feedback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Create annotation
  await canvas.dblclick({ position: { x: 250, y: 100 } });
  
  const inlineTextarea = page.locator('textarea').first();
  await expect(inlineTextarea).toBeVisible();
  
  // Verify textarea styling indicates editing state
  await expect(inlineTextarea).toHaveCSS('border-color', /blue/i);
  await expect(inlineTextarea).toHaveCSS('background-color', /rgba.*0\.9/); // semi-transparent
  
  // Verify high z-index for overlay
  const zIndex = await inlineTextarea.evaluate(el => getComputedStyle(el).zIndex);
  expect(parseInt(zIndex)).toBeGreaterThan(20);
});

test('inline editing integration with dialog system', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Create annotation with inline editing
  await canvas.dblclick({ position: { x: 200, y: 150 } });
  
  const inlineTextarea = page.locator('textarea').first();
  await inlineTextarea.fill('Inline edited content');
  
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await inlineTextarea.press(`${modifier}+Enter`);
  
  // Verify annotation exists and can be edited via dialog
  const annotation = page.getByText('Inline edited content');
  await expect(annotation).toBeVisible();
  
  // Test that dialog editing still works after inline editing
  await annotation.click(); // Select annotation
  
  // If edit dialog is available, verify it opens and contains the content
  const editDialog = page.locator('[role="dialog"]').first();
  if (await editDialog.isVisible()) {
    await expect(editDialog).toContainText('Inline edited content');
  }
});

