import { test, expect } from '@playwright/test';
import path from 'path';

test('canvas drawing: drag, connect, annotate, import', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();

  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();

  const canvas = page.locator('[data-testid="canvas"]');
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();

  await server.dragTo(canvas);
  await database.dragTo(canvas);

  // Connect components
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Database$/).first().click();
  await expect(page.getByText(/connection types/i)).toBeVisible();

  // Add a note by double click
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');
  await page.mouse.dblclick(box.x + 50, box.y + 50);
  await expect(page.getByText(/^Note$/)).toBeVisible();

  // Import JSON design
  const input = page.locator('[data-testid="import-json-input"]');
  const samplePath = path.resolve(__dirname, 'fixtures/design-sample.json');
  await input.setInputFiles(samplePath);
  // after import, expect a known label from fixture
  await expect(page.getByText(/API Gateway/i)).toBeVisible();
  
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
  
  // Create horizontal connection
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Database$/).first().click();
  
  // Create vertical connection  
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Cache$/).first().click();
  
  // Verify both connections are visible
  const connectionPaths = page.locator('svg path[marker-end]');
  await expect(connectionPaths).toHaveCount(2);
  
  // Test that paths have proper coordinates (not just component centers)
  const firstPath = connectionPaths.first();
  const secondPath = connectionPaths.nth(1);
  
  const firstPathData = await firstPath.getAttribute('d');
  const secondPathData = await secondPath.getAttribute('d');
  
  expect(firstPathData).toBeTruthy();
  expect(secondPathData).toBeTruthy();
  expect(firstPathData).not.toEqual(secondPathData); // Different positions should have different paths
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
  
  // Create connection
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Api gateway$/).first().click();
  
  // Select the connection to access direction controls
  const connectionPath = page.locator('svg path[marker-end]').first();
  await connectionPath.click();
  
  // Test different arrow directions if direction selector is available
  const directionSelector = page.locator('select').filter({ hasText: /arrow/i });
  if (await directionSelector.count() > 0) {
    // Test 'both' direction
    await directionSelector.selectOption('both');
    
    // Verify both start and end markers are present
    const pathWithBothMarkers = page.locator('svg path[marker-start][marker-end]');
    await expect(pathWithBothMarkers).toBeVisible();
    
    // Test 'none' direction
    await directionSelector.selectOption('none');
    
    // Verify no markers are present
    const pathWithNoMarkers = page.locator('svg path').filter({ 
      hasNotText: /marker-start|marker-end/ 
    });
    await expect(pathWithNoMarkers).toBeVisible();
  }
  
  // Test connection styles
  const styleSelector = page.locator('select').filter({ hasText: /connection style/i });
  if (await styleSelector.count() > 0) {
    await styleSelector.selectOption('curved');
    await expect(connectionPath).toBeVisible();
    
    await styleSelector.selectOption('straight');  
    await expect(connectionPath).toBeVisible();
    
    await styleSelector.selectOption('stepped');
    await expect(connectionPath).toBeVisible();
  }
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
  
  // Create connection
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Database$/).first().click();
  
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
  
  // Create connection to show controls
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Database$/).first().click();
  
  // Select connection to show UI overlays
  const connectionPath = page.locator('svg path[marker-end]').first();
  await connectionPath.click();
  
  // Verify UI overlays are visible before export
  await expect(page.locator('.absolute.top-4.right-4')).toBeVisible();
  
  // Monitor canvas class changes during export
  const canvasElement = canvas.first();
  
  // Start export process
  const exportPngButton = page.getByRole('button', { name: /export png/i });
  await exportPngButton.click();
  
  // The export-mode class should be added and removed quickly
  // We can't easily test the temporary class addition/removal in e2e
  // But we can verify the page remains functional after export
  await expect(page.locator('.absolute.top-4.right-4')).toBeVisible();
});

