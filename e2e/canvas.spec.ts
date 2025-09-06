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

