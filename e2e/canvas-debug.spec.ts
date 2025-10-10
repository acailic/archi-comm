// e2e/canvas-debug.spec.ts  
// Debug test specifically to investigate why canvas is not present in design page
// Tests navigation flow, component presence, and screen state
// RELEVANT FILES: src/packages/ui/components/AppContainer/ScreenRouter.tsx, src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx

import { test, expect, Page } from '@playwright/test';

test.describe('Canvas Debug Investigation', () => {
  
  test('should debug canvas presence on design page', async ({ page }) => {
    console.log('🔍 Starting canvas debug investigation...');

    // Enable verbose console logging
    page.on('console', (msg) => {
      console.log(`BROWSER: ${msg.type()}: ${msg.text()}`);
    });

    // Track page errors
    page.on('pageerror', (error) => {
      console.error(`PAGE ERROR: ${error.message}`);
    });

    // Navigate to app
    console.log('📍 Step 1: Navigating to app...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/debug-01-initial-load.png',
      fullPage: true 
    });

    // Check what screen is displayed
    console.log('📍 Step 2: Analyzing initial screen state...');
    
    // Check for various screen indicators
    const screenIndicators = [
      { selector: 'h1:has-text("Choose Your Challenge")', name: 'Challenge Selection' },
      { selector: 'h1:has-text("Welcome")', name: 'Welcome Screen' },
      { selector: '.react-flow', name: 'Canvas (React Flow)' },
      { selector: '[data-testid="design-canvas"]', name: 'Design Canvas' },
      { selector: '[data-testid="canvas"]', name: 'Canvas Element' }
    ];

    for (const indicator of screenIndicators) {
      const isVisible = await page.locator(indicator.selector).isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`   ${isVisible ? '✅' : '❌'} ${indicator.name}: ${isVisible ? 'VISIBLE' : 'NOT FOUND'}`);
    }

    // Check app state via global objects (if available)
    console.log('📍 Step 3: Checking app state...');
    const appStateInfo = await page.evaluate(() => {
      // Try to access app state from global objects or React DevTools
      const appState = {
        pathname: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search,
        title: document.title
      };
      
      // Check for React components in DOM
      const reactElements = {
        reactFlowExists: !!document.querySelector('.react-flow'),
        canvasExists: !!document.querySelector('[data-testid*="canvas"]'),
        designCanvasExists: !!document.querySelector('[data-testid="design-canvas"]'),
        componentPaletteExists: !!document.querySelector('h3'),
        challengeSelectionExists: !!document.querySelector('h1'),
        welcomeScreenExists: !!document.querySelector('[class*="Welcome"]') || !!document.querySelector('h1')
      };

      return { appState, reactElements };
    });

    console.log('   App State:', JSON.stringify(appStateInfo.appState, null, 2));
    console.log('   React Elements:', JSON.stringify(appStateInfo.reactElements, null, 2));

    // If we're on challenge selection, proceed with selection
    const challengeSelectionVisible = await page.locator('h1:has-text("Choose Your Challenge")').isVisible({ timeout: 5000 });
    
    if (challengeSelectionVisible) {
      console.log('📍 Step 4: Challenge selection screen detected, selecting challenge...');
      
      // Look for challenge buttons
      const challengeButtons = await page.locator('button:has-text("Start Challenge")').count();
      console.log(`   Found ${challengeButtons} challenge buttons`);

      if (challengeButtons > 0) {
        // Click first challenge
        const firstChallenge = page.locator('button:has-text("Start Challenge")').first();
        await firstChallenge.waitFor({ state: 'visible', timeout: 10000 });
        
        console.log('   Clicking first challenge button...');
        await firstChallenge.click();
        
        // Wait for navigation
        await page.waitForTimeout(3000);
        
        // Take screenshot after challenge selection
        await page.screenshot({ 
          path: 'e2e/test-results/artifacts/debug-02-after-challenge-selection.png',
          fullPage: true 
        });

        // Re-check screen state
        console.log('📍 Step 5: Analyzing screen state after challenge selection...');
        
        for (const indicator of screenIndicators) {
          const isVisible = await page.locator(indicator.selector).isVisible({ timeout: 2000 }).catch(() => false);
          console.log(`   ${isVisible ? '✅' : '❌'} ${indicator.name}: ${isVisible ? 'VISIBLE' : 'NOT FOUND'}`);
        }

        // Check for specific design canvas components
        console.log('📍 Step 6: Deep dive canvas component analysis...');
        
        const canvasComponents = [
          { selector: '.react-flow', name: 'React Flow Container' },
          { selector: '.react-flow__pane', name: 'React Flow Pane' },
          { selector: '.react-flow__viewport', name: 'React Flow Viewport' },
          { selector: '[data-testid="canvas-container"]', name: 'Canvas Container' },
          { selector: 'svg.react-flow__edges', name: 'React Flow Edges SVG' },
          { selector: '.react-flow__nodes', name: 'React Flow Nodes' },
          { selector: '[class*="DesignCanvas"]', name: 'Design Canvas Component' },
          { selector: '[class*="CanvasArea"]', name: 'Canvas Area Component' }
        ];

        for (const component of canvasComponents) {
          const element = page.locator(component.selector).first();
          const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
          const count = await page.locator(component.selector).count();
          console.log(`   ${isVisible ? '✅' : '❌'} ${component.name}: ${isVisible ? 'VISIBLE' : 'NOT FOUND'} (count: ${count})`);
          
          if (isVisible) {
            const boundingBox = await element.boundingBox().catch(() => null);
            console.log(`     Bounding box: ${JSON.stringify(boundingBox)}`);
          }
        }

        // Check for error messages or loading states
        console.log('📍 Step 7: Checking for errors or loading states...');
        
        const errorIndicators = [
          { selector: '[role="alert"]', name: 'Alert Message' },
          { selector: '.error', name: 'Error Class' },
          { selector: '[data-testid="error"]', name: 'Error Element' },
          { selector: '.loading', name: 'Loading Class' },
          { selector: '[data-testid="loading"]', name: 'Loading Element' },
          { selector: 'text="Loading"', name: 'Loading Text' },
          { selector: 'text="Error"', name: 'Error Text' }
        ];

        for (const indicator of errorIndicators) {
          const isVisible = await page.locator(indicator.selector).isVisible({ timeout: 1000 }).catch(() => false);
          if (isVisible) {
            console.log(`   ⚠️ ${indicator.name}: FOUND`);
            const text = await page.locator(indicator.selector).textContent();
            console.log(`     Content: ${text}`);
          }
        }

        // Take final screenshot
        await page.screenshot({ 
          path: 'e2e/test-results/artifacts/debug-03-final-state.png',
          fullPage: true 
        });

        // Check component palette specifically
        console.log('📍 Step 8: Component palette analysis...');
        
        const paletteSelectors = [
          'h3:has-text("Component Library")',
          '[data-testid*="palette"]',
          '[data-testid*="component-library"]',
          '.component-palette',
          '[class*="ComponentPalette"]'
        ];

        let paletteFound = false;
        for (const selector of paletteSelectors) {
          const isVisible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
          if (isVisible) {
            console.log(`   ✅ Component Palette found with selector: ${selector}`);
            paletteFound = true;
            
            // Check for palette items
            const paletteItems = await page.locator('[data-testid^="palette-item"]').count();
            console.log(`   Found ${paletteItems} palette items`);
            break;
          }
        }

        if (!paletteFound) {
          console.log('   ❌ Component Palette not found with any selector');
        }

        // Final assertions
        console.log('📍 Step 9: Final validation...');
        
        // We should at least see SOME canvas-related elements if we're on the design page
        const hasAnyCanvasElement = await page.evaluate(() => {
          return !!(
            document.querySelector('.react-flow') ||
            document.querySelector('[data-testid*="canvas"]') ||
            document.querySelector('[class*="Canvas"]') ||
            document.querySelector('svg')
          );
        });

        console.log(`   Canvas elements present: ${hasAnyCanvasElement ? 'YES' : 'NO'}`);
        
        if (!hasAnyCanvasElement) {
          console.log('   🚨 ISSUE: No canvas elements found after challenge selection!');
          
          // Let's check what IS rendered
          const bodyContent = await page.locator('body').innerHTML();
          console.log('   Current body content length:', bodyContent.length);
          
          // Save HTML content for analysis
          await page.locator('html').innerHTML().then(content => {
            require('fs').writeFileSync('e2e/test-results/artifacts/debug-page-content.html', content);
            console.log('   📁 Saved page content to debug-page-content.html');
          });
        }

      } else {
        console.log('   🚨 NO CHALLENGE BUTTONS FOUND!');
        expect(false, 'No challenge buttons available for selection').toBeTruthy();
      }
    } else {
      console.log('📍 Step 4: Not on challenge selection screen');
      
      // Check if we're already on design canvas
      const canvasVisible = await page.locator('.react-flow').isVisible({ timeout: 2000 }).catch(() => false);
      if (canvasVisible) {
        console.log('   ✅ Already on design canvas!');
      } else {
        console.log('   ❌ Unknown screen state - not challenge selection, not design canvas');
      }
    }

    console.log('🏁 Canvas debug investigation completed!');
  });

  test('should test manual navigation to design page', async ({ page }) => {
    console.log('🔍 Testing manual navigation to design page...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for any screen to load
    await page.waitForTimeout(2000);

    // Try to manually navigate to design canvas if possible
    // Look for navigation elements
    const navElements = [
      'button:has-text("Design")',
      'a:has-text("Design")', 
      'button:has-text("Canvas")',
      'a:has-text("Canvas")',
      '[data-testid="nav-design"]',
      '[data-testid="nav-canvas"]'
    ];

    let navFound = false;
    for (const selector of navElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`Found navigation element: ${selector}`);
        await element.click();
        await page.waitForTimeout(2000);
        navFound = true;
        break;
      }
    }

    if (!navFound) {
      console.log('No direct navigation to design found - this is expected for challenge-based flow');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/debug-manual-nav.png',
      fullPage: true 
    });
  });

  test('should test URL-based navigation', async ({ page }) => {
    console.log('🔍 Testing URL-based navigation...');

    // Try different potential URLs
    const testUrls = [
      '/',
      '/#design',
      '/#canvas', 
      '/#design-canvas',
      '/?screen=design',
      '/?screen=canvas'
    ];

    for (const url of testUrls) {
      console.log(`Testing URL: ${url}`);
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const hasCanvas = await page.locator('.react-flow').isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   Canvas visible: ${hasCanvas ? 'YES' : 'NO'}`);

      if (hasCanvas) {
        console.log(`   ✅ Canvas found with URL: ${url}`);
        await page.screenshot({ 
          path: `e2e/test-results/artifacts/debug-url-${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
          fullPage: true 
        });
        break;
      }
    }
  });
});