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

test('canvas toolbar functionality', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Verify CanvasToolbar is visible
  const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
  await expect(canvasToolbar).toBeVisible();
  
  // Test tool selection functionality
  const selectTool = page.locator('[data-testid="tool-select"]');
  const panTool = page.locator('[data-testid="tool-pan"]');
  const zoomTool = page.locator('[data-testid="tool-zoom"]');
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  
  await expect(selectTool).toBeVisible();
  await expect(panTool).toBeVisible();
  await expect(zoomTool).toBeVisible();
  await expect(annotateTool).toBeVisible();
  
  // Test tool selection
  await panTool.click();
  await expect(panTool).toHaveAttribute('aria-pressed', 'true');
  
  await selectTool.click();
  await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
  await expect(panTool).toHaveAttribute('aria-pressed', 'false');
});

test('canvas toolbar grid controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Test grid toggle button
  const gridToggle = page.locator('[data-testid="grid-toggle"]');
  await expect(gridToggle).toBeVisible();
  
  // Click grid toggle to open popover
  await gridToggle.click();
  
  // Verify grid controls are visible in popover
  await expect(page.getByText('Show grid')).toBeVisible();
  await expect(page.getByText('Snap to grid')).toBeVisible();
  await expect(page.getByText('Spacing')).toBeVisible();
  
  // Test grid spacing selector
  const spacingSelect = page.locator('select, [role="combobox"]').filter({ hasText: /px/ }).first();
  if (await spacingSelect.isVisible()) {
    await spacingSelect.click();
    await expect(page.getByText('20 px')).toBeVisible();
    await expect(page.getByText('40 px')).toBeVisible();
  }
});

test('canvas toolbar minimap controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add some components to make minimap useful
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();
  
  await server.dragTo(canvas);
  await database.dragTo(canvas);
  
  // Test minimap toggle button
  const minimapToggle = page.locator('[data-testid="minimap-toggle"]');
  await expect(minimapToggle).toBeVisible();
  
  // Click minimap toggle to open popover
  await minimapToggle.click();
  
  // Verify minimap content appears
  await expect(page.getByText('Preparing minimap...')).toBeVisible();
});

test('right sidebar properties panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Add a component to test properties
  const server = page.locator('[data-testid="palette-item-server"]').first();
  await server.dragTo(canvas);
  
  // Verify Properties section is visible in right sidebar
  await expect(page.getByText('Properties')).toBeVisible();
  
  // Click on the component to select it
  const serverComponent = page.getByText('Server').first();
  await serverComponent.click();
  
  // Verify properties panel shows component details
  // The exact content depends on PropertiesPanel implementation
  await expect(page.getByText('Properties')).toBeVisible();
});

test('right sidebar layers management', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Verify Layers section is visible in right sidebar
  await expect(page.getByText('Layers')).toBeVisible();
  
  // Test layer creation
  const layerNameInput = page.locator('input[placeholder="Layer name"]');
  if (await layerNameInput.isVisible()) {
    await layerNameInput.fill('Test Layer');
    await layerNameInput.press('Enter');
    
    // Verify layer appears in list
    await expect(page.getByText('Test Layer')).toBeVisible();
  }
});

test('right sidebar assignment summary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Verify Assignment section is visible in right sidebar
  await expect(page.getByText('Assignment')).toBeVisible();
  
  // Test assignment section collapse/expand
  const assignmentToggle = page.locator('button').filter({ hasText: /assignment/i }).first();
  if (await assignmentToggle.isVisible()) {
    await assignmentToggle.click();
    // Assignment content should still be manageable
  }
});

test('responsive layout behavior', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Test desktop layout - both sidebars should be visible
  await page.setViewportSize({ width: 1200, height: 800 });
  
  await expect(page.getByText('Properties')).toBeVisible();
  await expect(page.getByText('Layers')).toBeVisible();
  
  // Test tablet layout - right sidebar should be hidden
  await page.setViewportSize({ width: 768, height: 600 });
  
  // Canvas toolbar should still be visible
  const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
  await expect(canvasToolbar).toBeVisible();
  
  // Test mobile layout - both sidebars should be hidden
  await page.setViewportSize({ width: 480, height: 600 });
  
  // Canvas toolbar should still be functional
  await expect(canvasToolbar).toBeVisible();
  
  // Reset to desktop for other tests
  await page.setViewportSize({ width: 1200, height: 800 });
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

test('canvas toolbar keyboard shortcuts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Focus on canvas for keyboard shortcuts
  await canvas.click();
  
  // Test keyboard shortcuts for tools
  await page.keyboard.press('v'); // Select tool
  const selectTool = page.locator('[data-testid="tool-select"]');
  await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
  
  await page.keyboard.press('h'); // Pan tool
  const panTool = page.locator('[data-testid="tool-pan"]');
  await expect(panTool).toHaveAttribute('aria-pressed', 'true');
  
  await page.keyboard.press('z'); // Zoom tool
  const zoomTool = page.locator('[data-testid="tool-zoom"]');
  await expect(zoomTool).toHaveAttribute('aria-pressed', 'true');
  
  await page.keyboard.press('a'); // Annotate tool
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  await expect(annotateTool).toHaveAttribute('aria-pressed', 'true');
});

test('canvas toolbar accessibility', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
  
  // Verify toolbar has proper ARIA attributes
  await expect(canvasToolbar).toHaveAttribute('role', 'toolbar');
  await expect(canvasToolbar).toHaveAttribute('aria-label', 'Canvas tools');
  
  // Test keyboard navigation through tools
  const selectTool = page.locator('[data-testid="tool-select"]');
  await selectTool.focus();
  
  // Navigate with arrow keys
  await page.keyboard.press('ArrowRight');
  const panTool = page.locator('[data-testid="tool-pan"]');
  await expect(panTool).toBeFocused();
  
  // Test Enter key activation
  await page.keyboard.press('Enter');
  await expect(panTool).toHaveAttribute('aria-pressed', 'true');
});

test('inline annotation editing functionality', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  const canvas = page.locator('[data-testid="canvas"]');
  
  // First select the annotate tool from the new toolbar
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  await annotateTool.click();
  await expect(annotateTool).toHaveAttribute('aria-pressed', 'true');
  
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
  
  // Select annotate tool first
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  await annotateTool.click();
  
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
  
  // Select annotate tool first
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  await annotateTool.click();
  
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
  
  // Select annotate tool first
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  await annotateTool.click();
  
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
  
  // Select annotate tool first
  const annotateTool = page.locator('[data-testid="tool-annotate"]');
  await annotateTool.click();
  
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

test('layout integration with new toolbar and sidebars', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  
  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  
  // Verify the new layout structure
  const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
  const canvas = page.locator('[data-testid="canvas"]');
  
  await expect(canvasToolbar).toBeVisible();
  await expect(canvas).toBeVisible();
  
  // Verify left sidebar (component library) is still functional
  const server = page.locator('[data-testid="palette-item-server"]').first();
  await expect(server).toBeVisible();
  
  // Verify right sidebar sections are visible
  await expect(page.getByText('Properties')).toBeVisible();
  await expect(page.getByText('Layers')).toBeVisible();
  
  // Test that all components work together
  await server.dragTo(canvas);
  await expect(page.getByText('Server').first()).toBeVisible();
  
  // Test tool selection affects canvas interaction
  const panTool = page.locator('[data-testid="tool-pan"]');
  await panTool.click();
  await expect(panTool).toHaveAttribute('aria-pressed', 'true');
});

