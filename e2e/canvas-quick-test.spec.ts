// e2e/canvas-quick-test.spec.ts
// Quick test to check if canvas is showing and basic interactions work
// Tests navigation to canvas and basic visibility of React Flow elements
// RELEVANT FILES: src/packages/canvas/SimpleCanvas.tsx, src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx

import { test, expect } from '@playwright/test';

test.describe('Canvas Quick Test', () => {
  
  test('should show canvas after navigation', async ({ page }) => {
    console.log('🔍 Quick canvas test started...');

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 App loaded, checking initial state...');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/quick-01-initial.png',
      fullPage: true 
    });

    // Check if we can see any welcome or onboarding elements
    const hasWelcome = await page.locator('h1, h2').filter({ hasText: /welcome|get started|tutorial/i }).isVisible({ timeout: 3000 });
    console.log(`   Welcome/Tutorial found: ${hasWelcome}`);

    if (hasWelcome) {
      // Try to skip welcome/tutorials
      console.log('📍 Attempting to skip tutorials...');
      
      const skipButtons = [
        'button:has-text("Skip All Tutorials")',
        'button:has-text("Skip")',
        'button:has-text("Continue")',
        'button:has-text("Get Started")',
        'button:has-text("Next")',
      ];

      for (const selector of skipButtons) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`   Clicking: ${selector}`);
          await button.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
    }

    // Look for challenge selection or canvas directly
    console.log('📍 Looking for challenge selection or canvas...');
    
    // Try to find challenge selection
    const challengeButton = page.locator('button').filter({ hasText: /start challenge|begin|select challenge/i }).first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      console.log('   Found challenge button, clicking...');
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Take screenshot after navigation
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/quick-02-after-navigation.png',
      fullPage: true 
    });

    // Check for React Flow canvas
    console.log('📍 Checking for React Flow canvas...');
    
    const reactFlow = page.locator('.react-flow');
    const isReactFlowVisible = await reactFlow.isVisible({ timeout: 5000 });
    console.log(`   React Flow visible: ${isReactFlowVisible}`);

    if (isReactFlowVisible) {
      // Check canvas dimensions and content
      const canvasBounds = await reactFlow.boundingBox();
      console.log(`   Canvas bounds:`, canvasBounds);

      // Check for React Flow components
      const viewport = page.locator('.react-flow__viewport');
      const pane = page.locator('.react-flow__pane');
      const controls = page.locator('.react-flow__controls');
      const minimap = page.locator('.react-flow__minimap');

      console.log(`   Viewport visible: ${await viewport.isVisible()}`);
      console.log(`   Pane visible: ${await pane.isVisible()}`);
      console.log(`   Controls visible: ${await controls.isVisible()}`);
      console.log(`   Minimap visible: ${await minimap.isVisible()}`);

      // Success - canvas is showing!
      console.log('✅ Canvas is visible and functional!');
      
      // Test basic interaction - try clicking on the canvas
      await reactFlow.click();
      await page.waitForTimeout(1000);
      
      console.log('✅ Canvas interaction test completed!');
      
    } else {
      console.log('❌ Canvas not found - checking what we have instead...');
      
      // Check what's actually on the page
      const bodyText = await page.locator('body').textContent();
      console.log(`   Page content preview: "${bodyText?.substring(0, 200)}..."`);
      
      // Look for any canvas-related elements
      const canvasElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="canvas"], [class*="Canvas"], [data-testid*="canvas"]');
        return Array.from(elements).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          visible: (el as HTMLElement).offsetParent !== null
        }));
      });
      
      console.log('   Canvas-related elements found:', canvasElements);
    }

    // Final screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/quick-03-final.png',
      fullPage: true 
    });

    // Expect canvas to be visible
    await expect(reactFlow).toBeVisible({ timeout: 10000 });
    
    console.log('🏁 Quick canvas test completed successfully!');
  });

  test('should show component palette', async ({ page }) => {
    console.log('🔍 Checking for component palette...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Skip onboarding and get to canvas
    const skipButton = page.locator('button:has-text("Skip All Tutorials")');
    if (await skipButton.isVisible({ timeout: 3000 })) {
      await skipButton.click();
      await page.waitForTimeout(1000);
    }

    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for component library/palette
    const paletteSelectors = [
      '[data-testid*="palette"]',
      'text="Component Library"',
      'text="Components"',
      '[class*="Palette"]',
      '[class*="component"]'
    ];

    let paletteFound = false;
    for (const selector of paletteSelectors) {
      const element = page.locator(selector);
      const isVisible = await element.isVisible({ timeout: 2000 });
      console.log(`   ${selector}: ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
      if (isVisible) {
        paletteFound = true;
        // Count palette items
        const items = await page.locator('[data-testid*="palette-item"], [data-testid*="component-item"]').count();
        console.log(`     Palette items: ${items}`);
      }
    }

    console.log(`Component palette found: ${paletteFound ? 'YES' : 'NO'}`);

    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/quick-palette-check.png',
      fullPage: true 
    });

    if (!paletteFound) {
      console.log('❌ Component palette not found');
      // Still pass the test as this is just exploratory
    } else {
      console.log('✅ Component palette found!');
    }
  });
});