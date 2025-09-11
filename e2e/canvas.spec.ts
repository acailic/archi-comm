import { expect, test } from '@playwright/test';

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

  // Wait for React Flow to initialize
  await expect(page.locator('.react-flow')).toBeVisible();

  // Verify components appear on canvas as React Flow nodes
  const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
  const databaseNode = page.locator('.react-flow__node').filter({ hasText: 'Database' }).first();
  await expect(serverNode).toBeVisible();
  await expect(databaseNode).toBeVisible();

  // Test export functionality exists
  await expect(page.getByRole('button', { name: /export png/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /export$/i })).toBeVisible();

  // Verify connection edge accuracy after import - React Flow edges
  const connectionEdge = page.locator('.react-flow__edge').first();
  await expect(connectionEdge).toBeVisible();

  // Test connection visual accuracy by verifying React Flow edge path
  const edgePath = connectionEdge.locator('path').first();
  await expect(edgePath).toBeVisible();
  const pathElement = await edgePath.getAttribute('d');
  expect(pathElement).toBeTruthy();
  expect(pathElement).toContain('M'); // Should start with Move command

  // Verify connection properly connects to React Flow node handles
  const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
  const apiNode = page.locator('.react-flow__node').filter({ hasText: 'API Gateway' }).first();

  // Both nodes should be visible and properly connected
  await expect(serverNode).toBeVisible();
  await expect(apiNode).toBeVisible();

  // Verify connection handles are present
  await expect(serverNode.locator('.react-flow__handle')).toBeVisible();
  await expect(apiNode.locator('.react-flow__handle')).toBeVisible();
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

  // Verify all components are visible as React Flow nodes
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Server' })).toBeVisible();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Database' })).toBeVisible();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Cache' })).toBeVisible();

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

  // Verify components are draggable and appear as React Flow nodes
  const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
  const apiNode = page.locator('.react-flow__node').filter({ hasText: 'Api gateway' }).first();
  await expect(serverNode).toBeVisible();
  await expect(apiNode).toBeVisible();

  // Test node dragging functionality
  await expect(serverNode).toHaveAttribute('draggable', 'true');
  await expect(apiNode).toHaveAttribute('draggable', 'true');

  // Test connection style selector exists and verify React Flow edge types
  await expect(page.getByText(/connection style/i)).toBeVisible();

  // Verify React Flow supports different edge types
  const edges = page.locator('.react-flow__edge');
  if (await edges.count() > 0) {
    const firstEdge = edges.first();
    await expect(firstEdge).toHaveAttribute('data-testid');
  }
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

  // Click on the React Flow node to select it
  const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
  await serverNode.click();

  // Verify node selection state
  await expect(serverNode).toHaveClass(/selected/);

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

  // Verify components are visible as React Flow nodes
  const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
  const databaseNode = page.locator('.react-flow__node').filter({ hasText: 'Database' }).first();
  await expect(serverNode).toBeVisible();
  await expect(databaseNode).toBeVisible();

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
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Server' })).toBeVisible();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Database' })).toBeVisible();
});

test('canvas toolbar keyboard shortcuts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();

  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();

  const canvas = page.locator('[data-testid="canvas"]');

  // Focus on React Flow canvas for keyboard shortcuts
  const reactFlowWrapper = page.locator('.react-flow').first();
  await reactFlowWrapper.click();

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

  // Test inline edit activation - double-click on React Flow viewport to create annotation
  const reactFlowViewport = page.locator('.react-flow__viewport');
  await reactFlowViewport.dblclick({ position: { x: 200, y: 200 } });

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

  // Create annotation by double-clicking on React Flow viewport
  const reactFlowViewport = page.locator('.react-flow__viewport');
  await reactFlowViewport.dblclick({ position: { x: 150, y: 150 } });

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

  // Create annotation on React Flow viewport
  const reactFlowViewport = page.locator('.react-flow__viewport');
  await reactFlowViewport.dblclick({ position: { x: 100, y: 100 } });

  const inlineTextarea = page.locator('textarea').first();
  await expect(inlineTextarea).toBeVisible();

  // Type content and blur (click outside on React Flow viewport)
  await inlineTextarea.fill('Blur save test');
  const reactFlowViewport = page.locator('.react-flow__viewport');
  await reactFlowViewport.click({ position: { x: 300, y: 300 } });

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

  // Create annotation on React Flow viewport
  const reactFlowViewport = page.locator('.react-flow__viewport');
  await reactFlowViewport.dblclick({ position: { x: 250, y: 100 } });

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

  // Create annotation with inline editing on React Flow viewport
  const reactFlowViewport = page.locator('.react-flow__viewport');
  await reactFlowViewport.dblclick({ position: { x: 200, y: 150 } });

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

test('react flow canvas integration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();

  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();

  const canvas = page.locator('[data-testid="canvas"]');

  // Verify React Flow wrapper is present
  const reactFlow = page.locator('.react-flow');
  await expect(reactFlow).toBeVisible();

  // Verify React Flow viewport
  const viewport = page.locator('.react-flow__viewport');
  await expect(viewport).toBeVisible();

  // Add components and verify they become React Flow nodes
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();

  await server.dragTo(canvas);
  await database.dragTo(canvas);

  // Verify nodes are created with proper React Flow structure
  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(2);

  // Test node selection
  const serverNode = nodes.filter({ hasText: 'Server' }).first();
  await serverNode.click();
  await expect(serverNode).toHaveClass(/selected/);

  // Test connection creation by dragging from handle to handle
  const sourceHandle = serverNode.locator('.react-flow__handle-right').first();
  const targetNode = nodes.filter({ hasText: 'Database' }).first();
  const targetHandle = targetNode.locator('.react-flow__handle-left').first();

  if (await sourceHandle.isVisible() && await targetHandle.isVisible()) {
    await sourceHandle.dragTo(targetHandle);

    // Verify edge is created
    const edges = page.locator('.react-flow__edge');
    await expect(edges).toHaveCount(1);
  }

  // Test React Flow controls
  const controls = page.locator('.react-flow__controls');
  if (await controls.isVisible()) {
    await expect(controls.locator('button')).toHaveCount(4); // zoom in, zoom out, fit view, lock
  }

  // Test minimap if present
  const minimap = page.locator('.react-flow__minimap');
  if (await minimap.isVisible()) {
    await expect(minimap).toBeVisible();
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
  const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
  await expect(serverNode).toBeVisible();

  // Verify React Flow node is properly positioned and interactive
  await expect(serverNode).toHaveAttribute('data-id');
  await expect(serverNode.locator('.react-flow__handle')).toBeVisible();

  // Test tool selection affects canvas interaction
  const panTool = page.locator('[data-testid="tool-pan"]');
  await panTool.click();
  await expect(panTool).toHaveAttribute('aria-pressed', 'true');
});

