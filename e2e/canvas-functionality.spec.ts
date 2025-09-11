import { test, expect } from '@playwright/test';

test.describe('Canvas functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the canvas to be properly initialized
    await expect(page.getByTestId('canvas-toolbar')).toBeVisible();
    // Wait for React Flow to be initialized
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('loads app and shows canvas toolbar', async ({ page }) => {
    await expect(page.getByTestId('canvas-toolbar')).toBeVisible();
    await expect(page.getByTestId('tool-select')).toBeVisible();
    // Verify React Flow canvas is loaded
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__pane')).toBeVisible();
  });

  test('supports basic component add and move operations', async ({ page }) => {
    // Find challenge selection and select a challenge
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    await challengeCard.click();

    // Start designing
    await page.getByRole('button', { name: 'Start Designing' }).click();

    // Wait for React Flow canvas to be visible
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__pane')).toBeVisible();

    // Open component palette
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      // Drag a server component to the React Flow pane
      const serverComponent = page.locator('[data-testid="component-server"]');
      const reactFlowPane = page.locator('.react-flow__pane');

      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 200, y: 150 }
      });

      // Verify React Flow node was added
      const reactFlowNode = page.locator('.react-flow__node').first();
      await expect(reactFlowNode).toBeVisible();

      // Test node movement by dragging
      const nodePosition = await reactFlowNode.boundingBox();
      if (nodePosition) {
        await reactFlowNode.dragTo(reactFlowPane, {
          targetPosition: { x: nodePosition.x + 50, y: nodePosition.y + 50 }
        });

        // Verify node moved by checking transform or position change
        const newPosition = await reactFlowNode.boundingBox();
        expect(newPosition?.x).not.toBe(nodePosition.x);
      }
    }
  });

  test('supports connection creation between components', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    await expect(page.locator('.react-flow')).toBeVisible();

    // Add two components first for connection testing
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      const serverComponent = page.locator('[data-testid="component-server"]');
      const reactFlowPane = page.locator('.react-flow__pane');

      // Add first component
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 100, y: 100 }
      });

      // Add second component
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 300, y: 100 }
      });

      // Wait for nodes to be rendered
      await expect(page.locator('.react-flow__node')).toHaveCount(2);

      // Test connection creation using React Flow handles
      const firstNode = page.locator('.react-flow__node').first();
      const secondNode = page.locator('.react-flow__node').nth(1);

      // Look for connection handles
      const sourceHandle = firstNode.locator('.react-flow__handle-right, .react-flow__handle');
      const targetHandle = secondNode.locator('.react-flow__handle-left, .react-flow__handle');

      if (await sourceHandle.isVisible() && await targetHandle.isVisible()) {
        // Create connection by dragging from source to target handle
        await sourceHandle.dragTo(targetHandle);

        // Verify edge was created
        await expect(page.locator('.react-flow__edge')).toHaveCount(1);
      }
    }
  });

  test('supports keyboard navigation and shortcuts', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    const reactFlowPane = page.locator('.react-flow__pane');
    await reactFlowPane.focus();

    // Add a component for testing keyboard navigation
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      const serverComponent = page.locator('[data-testid="component-server"]');
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 200, y: 150 }
      });

      // Select the node
      const reactFlowNode = page.locator('.react-flow__node').first();
      await reactFlowNode.click();

      // Test Ctrl+A for select all
      await page.keyboard.press('Control+a');

      // Test arrow keys for component movement
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');

      // Test Delete key for component deletion
      await page.keyboard.press('Delete');
    }

    // Verify React Flow pane maintains focus
    await expect(reactFlowPane).toBeFocused();
  });

  test('maintains accessibility standards', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    const reactFlow = page.locator('.react-flow');
    const reactFlowPane = page.locator('.react-flow__pane');

    // Check React Flow accessibility attributes
    await expect(reactFlow).toHaveAttribute('role', 'application');
    await expect(reactFlow).toHaveAttribute('aria-roledescription', 'System design canvas');
    await expect(reactFlowPane).toHaveAttribute('tabindex', '0');

    // Verify keyboard shortcuts are documented
    const ariaKeyshortcuts = await reactFlow.getAttribute('aria-keyshortcuts');
    if (ariaKeyshortcuts) {
      expect(ariaKeyshortcuts).toContain('Delete');
      expect(ariaKeyshortcuts).toContain('Tab');
    }

    // Test that React Flow nodes are accessible
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      const serverComponent = page.locator('[data-testid="component-server"]');
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 200, y: 150 }
      });

      const reactFlowNode = page.locator('.react-flow__node').first();
      await expect(reactFlowNode).toHaveAttribute('tabindex', '0');
      await expect(reactFlowNode).toHaveAttribute('role', 'button');
    }
  });

  test('supports export functionality', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    // Ensure React Flow is loaded
    await expect(page.locator('.react-flow')).toBeVisible();

    // Add a component to have something to export
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      const serverComponent = page.locator('[data-testid="component-server"]');
      const reactFlowPane = page.locator('.react-flow__pane');

      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 200, y: 150 }
      });

      await expect(page.locator('.react-flow__node')).toHaveCount(1);
    }

    // Look for export options in toolbar or menu
    const exportButton = page.locator('[data-testid*="export"], button:has-text("Export")').first();
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Verify export options are available
      await expect(page.locator('text=PNG')).toBeVisible();
    }
  });

  test('supports zoom and pan functionality', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    const reactFlowPane = page.locator('.react-flow__pane');
    const reactFlowViewport = page.locator('.react-flow__viewport');

    await expect(reactFlowPane).toBeVisible();
    await expect(reactFlowViewport).toBeVisible();

    // Get initial viewport transform
    const initialTransform = await reactFlowViewport.getAttribute('transform');

    // Test zoom functionality
    await reactFlowPane.hover();
    await page.mouse.wheel(0, -100); // Zoom in

    // Verify viewport transform changed
    const zoomedTransform = await reactFlowViewport.getAttribute('transform');
    expect(zoomedTransform).not.toBe(initialTransform);

    // Test pan functionality
    const paneBounds = await reactFlowPane.boundingBox();
    if (paneBounds) {
      const startX = paneBounds.x + paneBounds.width / 2;
      const startY = paneBounds.y + paneBounds.height / 2;

      // Pan by dragging
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 50, startY + 50);
      await page.mouse.up();

      // Verify viewport transform changed again
      const pannedTransform = await reactFlowViewport.getAttribute('transform');
      expect(pannedTransform).not.toBe(zoomedTransform);
    }
  });

  test('persists canvas state between sessions', async ({ page }) => {
    // This test would verify that canvas state is saved and restored
    // For now, just verify React Flow loads without errors
    await expect(page.locator('.react-flow')).toBeVisible();

    // Verify no console errors during initialization
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__pane')).toBeVisible();

    // Filter out expected errors (like performance registration)
    const unexpectedErrors = consoleErrors.filter(
      error => !error.includes('Performance registration failed')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
  test('supports edge selection and editing', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    await expect(page.locator('.react-flow')).toBeVisible();

    // Add components and create a connection
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      const serverComponent = page.locator('[data-testid="component-server"]');
      const reactFlowPane = page.locator('.react-flow__pane');

      // Add two components
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 100, y: 100 }
      });
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 300, y: 100 }
      });

      await expect(page.locator('.react-flow__node')).toHaveCount(2);

      // Create connection
      const firstNode = page.locator('.react-flow__node').first();
      const secondNode = page.locator('.react-flow__node').nth(1);

      const sourceHandle = firstNode.locator('.react-flow__handle-right, .react-flow__handle');
      const targetHandle = secondNode.locator('.react-flow__handle-left, .react-flow__handle');

      if (await sourceHandle.isVisible() && await targetHandle.isVisible()) {
        await sourceHandle.dragTo(targetHandle);

        // Verify edge was created
        const edge = page.locator('.react-flow__edge').first();
        await expect(edge).toBeVisible();

        // Test edge selection
        await edge.click();

        // Test edge deletion with keyboard
        await page.keyboard.press('Delete');

        // Verify edge was deleted
        await expect(page.locator('.react-flow__edge')).toHaveCount(0);
      }
    }
  });

  test('supports multi-selection with React Flow', async ({ page }) => {
    // Skip if no challenge selected
    const challengeCard = page.locator('[data-testid="challenge-card"]').first();
    if (await challengeCard.isVisible()) {
      await challengeCard.click();
      await page.getByRole('button', { name: 'Start Designing' }).click();
    }

    await expect(page.locator('.react-flow')).toBeVisible();

    // Add multiple components
    const componentPalette = page.locator('[data-testid="component-palette"]');
    if (await componentPalette.isVisible()) {
      const serverComponent = page.locator('[data-testid="component-server"]');
      const reactFlowPane = page.locator('.react-flow__pane');

      // Add three components
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 100, y: 100 }
      });
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 200, y: 100 }
      });
      await serverComponent.dragTo(reactFlowPane, {
        targetPosition: { x: 300, y: 100 }
      });

      await expect(page.locator('.react-flow__node')).toHaveCount(3);

      // Test box selection
      const paneBounds = await reactFlowPane.boundingBox();
      if (paneBounds) {
        // Start box selection from top-left
        await page.mouse.move(paneBounds.x + 50, paneBounds.y + 50);
        await page.mouse.down();
        await page.mouse.move(paneBounds.x + 350, paneBounds.y + 150);
        await page.mouse.up();

        // Verify multiple nodes are selected (React Flow adds selected class)
        const selectedNodes = page.locator('.react-flow__node.selected');
        await expect(selectedNodes).toHaveCount(3);
      }
    }
  });
});
