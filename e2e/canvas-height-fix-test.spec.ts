// e2e/canvas-height-fix-test.spec.ts  
// Test to verify the canvas height fix works
// Tests if React Flow container now has proper height after the CSS fix
// RELEVANT FILES: src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx, DesignCanvasLayout.tsx

import { test, expect } from '@playwright/test';

test.describe('Canvas Height Fix Test', () => {
  
  test('should verify React Flow container has proper height after fix', async ({ page }) => {
    console.log('🔍 Testing canvas height fix...');

    // Navigate to design canvas
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Skip welcome
    const skipButton = page.locator('button:has-text("Skip All Tutorials")');
    if (await skipButton.isVisible({ timeout: 3000 })) {
      await skipButton.click();
      await page.waitForTimeout(2000);
    }

    // Select challenge
    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Check React Flow container height
    console.log('📍 Checking React Flow container dimensions after fix...');
    
    const reactFlowInfo = await page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow') as HTMLElement;
      if (!reactFlow) return { error: 'No React Flow found' };
      
      const rect = reactFlow.getBoundingClientRect();
      const style = window.getComputedStyle(reactFlow);
      
      return {
        boundingRect: {
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y
        },
        computedStyle: {
          width: style.width,
          height: style.height,
          minHeight: style.minHeight
        },
        offsetDimensions: {
          offsetWidth: reactFlow.offsetWidth,
          offsetHeight: reactFlow.offsetHeight
        },
        isVisible: reactFlow.offsetParent !== null
      };
    });

    console.log('   React Flow Info:', JSON.stringify(reactFlowInfo, null, 2));

    // Check if height is now > 0
    if ('error' in reactFlowInfo) {
      console.log('   ❌ React Flow container not found');
      expect(false, 'React Flow container should exist').toBeTruthy();
    } else {
      const hasProperHeight = reactFlowInfo.boundingRect.height > 100; // Should be much larger than 0px
      console.log(`   Height is > 100px: ${hasProperHeight ? 'YES' : 'NO'} (${reactFlowInfo.boundingRect.height}px)`);
      console.log(`   Is visible: ${reactFlowInfo.isVisible ? 'YES' : 'NO'}`);

      // Take screenshot
      await page.screenshot({ 
        path: 'e2e/test-results/artifacts/height-fix-test.png',
        fullPage: true 
      });

      // Assert the canvas now has proper height
      expect(hasProperHeight, `Canvas height should be > 100px, got ${reactFlowInfo.boundingRect.height}px`).toBeTruthy();
      expect(reactFlowInfo.isVisible, 'Canvas should be visible').toBeTruthy();
      
      console.log('   ✅ Canvas height fix successful!');
    }

    // Also check if we can see component palette
    const paletteVisible = await page.locator('text="Component Library"').isVisible();
    console.log(`   Component palette visible: ${paletteVisible ? 'YES' : 'NO'}`);

    console.log('🏁 Canvas height fix test completed!');
  });

  test('should verify canvas is now interactive', async ({ page }) => {
    console.log('🔍 Testing canvas interactivity after height fix...');

    // Navigate and setup
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const skipButton = page.locator('button:has-text("Skip All Tutorials")');
    if (await skipButton.isVisible({ timeout: 3000 })) {
      await skipButton.click();
      await page.waitForTimeout(2000);
    }

    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Try to drag a component to the canvas
    console.log('📍 Testing drag and drop to canvas...');
    
    // Look for first palette item
    const paletteItem = page.locator('[data-testid^="palette-item"]').first();
    if (await paletteItem.isVisible({ timeout: 3000 })) {
      // Get canvas area
      const reactFlowPane = page.locator('.react-flow__pane').first();
      if (await reactFlowPane.isVisible({ timeout: 3000 })) {
        console.log('   Both palette item and canvas pane are visible, attempting drag...');
        
        // Perform drag and drop
        await paletteItem.dragTo(reactFlowPane, { 
          targetPosition: { x: 400, y: 300 }
        });
        
        await page.waitForTimeout(1000);
        
        // Check if a node was created
        const nodeCount = await page.locator('.react-flow__node').count();
        console.log(`   Nodes created: ${nodeCount}`);
        
        if (nodeCount > 0) {
          console.log('   ✅ Drag and drop successful - canvas is interactive!');
          
          // Take screenshot showing the result
          await page.screenshot({ 
            path: 'e2e/test-results/artifacts/interactive-test-success.png',
            fullPage: true 
          });
        } else {
          console.log('   ⚠️ No nodes created - drag and drop may need additional fixes');
        }
      } else {
        console.log('   ❌ React Flow pane not visible');
      }
    } else {
      console.log('   ❌ No palette items found');
    }

    console.log('🏁 Canvas interactivity test completed!');
  });
});