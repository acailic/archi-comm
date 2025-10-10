// e2e/simple-canvas-infinite-loop-fix.spec.ts
// Playwright test to reproduce and verify the fix for SimpleCanvas infinite loop issue
// Tests loading SimpleCanvas component without triggering infinite re-renders
// RELEVANT FILES: SimpleCanvas.tsx, canvas-interactions.spec.ts, canvas-debug.spec.ts

import { test, expect } from '@playwright/test';

test.describe('SimpleCanvas Infinite Loop Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    
    // Wait for the app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow for initial renders
  });

  test('should load SimpleCanvas without infinite loop errors', async ({ page }) => {
    // Listen for console errors to detect infinite loops
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Check if welcome overlay is present and dismiss it
    const skipButton = page.locator('text="Skip Tutorial"');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
    }
    
    // Look for and click on a challenge to start the canvas
    const startButton = page.locator('text="Start Challenge"').first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
    }

    // Wait for SimpleCanvas to render (it's in the React Flow container)
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // Wait a bit to let any potential infinite loops manifest
    await page.waitForTimeout(2000);

    // Check that no infinite loop errors occurred
    const infiniteLoopErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth exceeded') ||
      error.includes('infinite loop') ||
      error.includes('Too many re-renders')
    );

    expect(infiniteLoopErrors).toHaveLength(0);

    // Verify the canvas is actually visible and functional
    const canvas = page.locator('[data-testid="simple-canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('should handle component interactions without infinite loops', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check if welcome overlay is present and dismiss it
    const skipButton = page.locator('text="Skip Tutorial"');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
    }
    
    // Look for and click on a challenge to start the canvas
    const startButton = page.locator('text="Start Challenge"').first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
    }

    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // Try to add a component from the palette (if available)
    const paletteItem = page.locator('[data-testid*="palette-item"]').first();
    if (await paletteItem.isVisible()) {
      // Drag and drop to canvas
      const canvas = page.locator('[data-testid="simple-canvas"]');
      await paletteItem.dragTo(canvas, {
        targetPosition: { x: 200, y: 200 }
      });
      
      // Wait for component to be added
      await page.waitForTimeout(1000);
    }

    // Click on the canvas background
    const canvasElement = page.locator('[data-testid="simple-canvas"]');
    await canvasElement.click({ position: { x: 100, y: 100 } });
    
    // Wait and check for errors
    await page.waitForTimeout(1000);

    const infiniteLoopErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth exceeded') ||
      error.includes('infinite loop') ||
      error.includes('Too many re-renders')
    );

    expect(infiniteLoopErrors).toHaveLength(0);
  });

  test('should render nodes and edges without re-render loops', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check if welcome overlay is present and dismiss it
    const skipButton = page.locator('text="Skip Tutorial"');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
    }
    
    // Look for and click on a challenge to start the canvas
    const startButton = page.locator('text="Start Challenge"').first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
    }

    await page.waitForSelector('.react-flow', { timeout: 10000 });
    
    // Wait for any initial rendering to complete
    await page.waitForTimeout(3000);

    // Look for React Flow nodes if they exist
    const nodes = page.locator('[data-component-id]');
    const nodeCount = await nodes.count();
    
    console.log(`Found ${nodeCount} nodes on canvas`);

    // If nodes exist, try interacting with them
    if (nodeCount > 0) {
      const firstNode = nodes.first();
      await firstNode.click();
      await page.waitForTimeout(500);
    }

    // Check for infinite loop errors
    const infiniteLoopErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth exceeded') ||
      error.includes('infinite loop') ||
      error.includes('Too many re-renders')
    );

    expect(infiniteLoopErrors).toHaveLength(0);
  });

  test('should handle prop changes without causing infinite loops', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check if welcome overlay is present and dismiss it
    const skipButton = page.locator('text="Skip Tutorial"');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
    }
    
    // Look for and click on a challenge to start the canvas
    const startButton = page.locator('text="Start Challenge"').first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
    }

    await page.waitForSelector('.react-flow', { timeout: 10000 });
    
    // Wait for initial render
    await page.waitForTimeout(1000);

    // Try changing modes or selections (if UI exists for it)
    const modeButtons = page.locator('[data-testid*="mode-"], [data-testid*="tool-"]');
    const buttonCount = await modeButtons.count();
    
    if (buttonCount > 0) {
      // Click different mode buttons to trigger prop changes
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        await modeButtons.nth(i).click();
        await page.waitForTimeout(500);
      }
    }

    // Check for infinite loop errors after prop changes
    const infiniteLoopErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth exceeded') ||
      error.includes('infinite loop') ||
      error.includes('Too many re-renders')
    );

    expect(infiniteLoopErrors).toHaveLength(0);
  });
});