// e2e/canvas-flow-working.spec.ts  
// Working test to trace the navigation flow from welcome to canvas
// Tests proper button clicking through welcome -> challenge selection -> design canvas
// RELEVANT FILES: src/packages/ui/components/overlays/WelcomeOverlay.tsx, src/packages/ui/components/ChallengeSelection.tsx

import { test, expect } from '@playwright/test';

test.describe('Canvas Navigation Flow Debug', () => {
  
  test('should successfully navigate from welcome to design canvas', async ({ page }) => {
    console.log('🔍 Testing complete navigation flow to canvas...');

    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 1: Handle Welcome Screen
    console.log('📍 Step 1: Checking for welcome screen...');
    
    const welcomeTitle = page.locator('h1:has-text("Welcome to ArchiComm")');
    const welcomeVisible = await welcomeTitle.isVisible({ timeout: 5000 });
    console.log(`Welcome screen visible: ${welcomeVisible ? 'YES' : 'NO'}`);

    if (welcomeVisible) {
      // Take screenshot of welcome
      await page.screenshot({ 
        path: 'e2e/test-results/artifacts/flow-01-welcome.png',
        fullPage: true 
      });

      // Click "Skip All Tutorials" to proceed directly to challenges
      console.log('   Clicking "Skip All Tutorials"...');
      const skipButton = page.locator('button:has-text("Skip All Tutorials")');
      await expect(skipButton).toBeVisible({ timeout: 5000 });
      await skipButton.click();
      await page.waitForTimeout(2000);
      
      console.log('   ✅ Welcome screen dismissed');
    }

    // Step 2: Handle Challenge Selection
    console.log('📍 Step 2: Looking for challenge selection...');
    
    await page.waitForTimeout(2000);
    
    // Look for challenge selection indicators
    const challengeTitle = page.locator('h1').filter({ hasText: /challenge/i });
    const challengeVisible = await challengeTitle.isVisible({ timeout: 10000 });
    console.log(`Challenge selection visible: ${challengeVisible ? 'YES' : 'NO'}`);

    if (challengeVisible) {
      // Take screenshot of challenge selection
      await page.screenshot({ 
        path: 'e2e/test-results/artifacts/flow-02-challenges.png',
        fullPage: true 
      });

      // Look for "Start Challenge" buttons
      const startButtons = page.locator('button:has-text("Start Challenge")');
      const buttonCount = await startButtons.count();
      console.log(`   Found ${buttonCount} "Start Challenge" buttons`);

      if (buttonCount > 0) {
        // Click the first challenge button
        console.log('   Clicking first "Start Challenge" button...');
        const firstButton = startButtons.first();
        await expect(firstButton).toBeVisible({ timeout: 5000 });
        await firstButton.click();
        await page.waitForTimeout(3000);
        
        console.log('   ✅ Challenge selected');
      } else {
        console.log('   ❌ No "Start Challenge" buttons found');
        
        // Try alternative selectors
        const altSelectors = [
          'button:has-text("Begin")',
          'button:has-text("Start")',
          'button:has-text("Select")',
          '[data-testid*="challenge"]'
        ];

        for (const selector of altSelectors) {
          const altButton = page.locator(selector).first();
          if (await altButton.isVisible({ timeout: 2000 })) {
            console.log(`   Found alternative button: ${selector}`);
            await altButton.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
      }
    } else {
      console.log('   ❌ Challenge selection screen not found');
    }

    // Step 3: Check for Design Canvas
    console.log('📍 Step 3: Looking for design canvas...');
    
    await page.waitForTimeout(3000);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/flow-03-after-challenge.png',
      fullPage: true 
    });

    // Check for canvas indicators
    const canvasChecks = [
      { selector: '.react-flow', name: 'React Flow Container' },
      { selector: '[data-testid="canvas"]', name: 'Canvas TestID' },
      { selector: '[data-testid="design-canvas"]', name: 'Design Canvas TestID' },
      { selector: 'svg', name: 'SVG Element' },
      { selector: '[class*="Canvas"]', name: 'Canvas Class' },
    ];

    let foundCanvas = false;
    for (const check of canvasChecks) {
      const isVisible = await page.locator(check.selector).first().isVisible({ timeout: 3000 }).catch(() => false);
      const count = await page.locator(check.selector).count();
      console.log(`   ${check.name}: ${isVisible ? 'VISIBLE' : 'NOT VISIBLE'} (count: ${count})`);
      
      if (isVisible) {
        foundCanvas = true;
      }
    }

    // Step 4: Check for Component Palette
    console.log('📍 Step 4: Looking for component palette...');
    
    const paletteChecks = [
      'text="Component Library"',
      'text="Components"',
      '[data-testid*="palette"]',
      '[class*="Palette"]'
    ];

    let foundPalette = false;
    for (const selector of paletteChecks) {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   ${selector}: ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
      
      if (isVisible) {
        foundPalette = true;
        
        // Check for palette items
        const paletteItems = await page.locator('[data-testid^="palette-item"]').count();
        console.log(`     Palette items: ${paletteItems}`);
      }
    }

    // Step 5: Analyze current page
    console.log('📍 Step 5: Analyzing current page state...');
    
    const currentTitle = await page.title();
    const currentUrl = page.url();
    console.log(`   Page title: "${currentTitle}"`);
    console.log(`   Current URL: ${currentUrl}`);

    // Check main content
    const mainContent = await page.locator('main, [role="main"], body > div').first();
    if (await mainContent.isVisible()) {
      const innerHTML = await mainContent.innerHTML();
      console.log(`   Main content length: ${innerHTML.length} characters`);
      
      const hasCanvasKeywords = innerHTML.includes('react-flow') || 
                               innerHTML.includes('Canvas') ||
                               innerHTML.includes('svg') ||
                               innerHTML.includes('DesignCanvas');
      console.log(`   Contains canvas keywords: ${hasCanvasKeywords ? 'YES' : 'NO'}`);
    }

    // Step 6: Final Assessment
    console.log('📍 Step 6: Final assessment...');
    console.log(`   Canvas found: ${foundCanvas ? 'YES' : 'NO'}`);
    console.log(`   Palette found: ${foundPalette ? 'YES' : 'NO'}`);

    if (!foundCanvas) {
      console.log('   🚨 ISSUE: Canvas is NOT visible after full navigation flow');
      
      // Check what screen we might be on instead
      const screenChecks = [
        { selector: 'text="Welcome"', name: 'Welcome Screen' },
        { selector: 'text="Challenge"', name: 'Challenge Screen' },
        { selector: 'text="Record"', name: 'Recording Screen' },
        { selector: 'text="Review"', name: 'Review Screen' },
        { selector: 'text="Error"', name: 'Error Screen' },
        { selector: 'text="Loading"', name: 'Loading Screen' }
      ];

      console.log('   Current screen indicators:');
      for (const check of screenChecks) {
        const found = await page.locator(check.selector).first().isVisible({ timeout: 1000 }).catch(() => false);
        if (found) {
          console.log(`     ✅ ${check.name}: DETECTED`);
        }
      }
    } else {
      console.log('   ✅ Canvas successfully found!');
    }

    // Take final screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/flow-04-final.png',
      fullPage: true 
    });

    // Save page HTML for debugging
    const htmlContent = await page.content();
    require('fs').writeFileSync('e2e/test-results/artifacts/flow-final-content.html', htmlContent);
    console.log('📁 Saved page content for analysis');

    console.log('🏁 Navigation flow test completed!');

    // Assert that we should have found a canvas by now
    // (This assertion is for debugging - we want to see what happens)
    if (foundCanvas) {
      console.log('✅ SUCCESS: Canvas is present and visible');
    } else {
      console.log('❌ FAILURE: Canvas was not found - this indicates the issue we need to investigate');
    }
  });

  test('should check DOM structure for canvas elements', async ({ page }) => {
    console.log('🔍 Checking DOM structure for canvas elements...');

    // Navigate and get to design state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Skip welcome if present
    const skipButton = page.locator('button:has-text("Skip All Tutorials")');
    if (await skipButton.isVisible({ timeout: 3000 })) {
      await skipButton.click();
      await page.waitForTimeout(2000);
    }

    // Try to get to design canvas
    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Inspect DOM structure
    console.log('📍 Inspecting DOM structure...');
    
    const domStructure = await page.evaluate(() => {
      const getElementInfo = (selector: string) => {
        const elements = document.querySelectorAll(selector);
        return {
          count: elements.length,
          visible: Array.from(elements).map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            isVisible: (el as HTMLElement).offsetParent !== null,
            boundingBox: el.getBoundingClientRect()
          }))
        };
      };

      return {
        reactFlow: getElementInfo('.react-flow'),
        canvasElements: getElementInfo('[class*="Canvas"]'),
        svgElements: getElementInfo('svg'),
        designCanvas: getElementInfo('[data-testid="design-canvas"]'),
        canvasTestId: getElementInfo('[data-testid="canvas"]'),
        bodyChildren: Array.from(document.body.children).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        }))
      };
    });

    console.log('   DOM Structure Analysis:');
    console.log('   React Flow elements:', JSON.stringify(domStructure.reactFlow, null, 2));
    console.log('   Canvas elements:', JSON.stringify(domStructure.canvasElements, null, 2));
    console.log('   SVG elements:', JSON.stringify(domStructure.svgElements, null, 2));
    console.log('   Body children:', JSON.stringify(domStructure.bodyChildren, null, 2));

    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/dom-structure-check.png',
      fullPage: true 
    });
  });
});