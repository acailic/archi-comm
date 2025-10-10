// e2e/canvas-simple-debug.spec.ts  
// Simple debug test to check navigation flow from welcome to canvas
// Tests welcome screen -> challenge selection -> design canvas flow
// RELEVANT FILES: src/packages/ui/components/overlays/WelcomeOverlay.tsx, src/packages/ui/components/AppContainer/ScreenRouter.tsx

import { test, expect } from '@playwright/test';

test.describe('Simple Canvas Flow Debug', () => {
  
  test('should trace complete flow from welcome to canvas', async ({ page }) => {
    console.log('🔍 Starting simple canvas flow debug...');

    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 1: Check if welcome screen is showing
    console.log('📍 Step 1: Checking welcome screen...');
    
    const welcomeVisible = await page.locator('h1:has-text("Welcome")').isVisible({ timeout: 5000 });
    console.log(`Welcome screen visible: ${welcomeVisible ? 'YES' : 'NO'}`);

    if (welcomeVisible) {
      // Take screenshot of welcome
      await page.screenshot({ 
        path: 'e2e/test-results/artifacts/simple-01-welcome.png',
        fullPage: true 
      });

      // Look for welcome completion button
      const welcomeButtons = [
        'button:has-text("Get Started")',
        'button:has-text("Continue")', 
        'button:has-text("Next")',
        'button:has-text("Start")',
        'button[type="button"]'
      ];

      let welcomeCompleted = false;
      for (const selector of welcomeButtons) {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`   Found welcome button: ${selector}`);
          await button.click();
          await page.waitForTimeout(2000);
          welcomeCompleted = true;
          break;
        }
      }

      if (!welcomeCompleted) {
        // Try clicking anywhere on welcome screen or pressing Enter
        console.log('   No button found, trying click on welcome area...');
        await page.locator('body').click();
        await page.waitForTimeout(1000);
        
        // Or try pressing Enter/Escape
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }
    }

    // Step 2: Check for challenge selection
    console.log('📍 Step 2: Checking challenge selection...');
    
    await page.waitForTimeout(2000);
    const challengeVisible = await page.locator('h1').filter({ hasText: /challenge/i }).isVisible({ timeout: 5000 });
    console.log(`Challenge selection visible: ${challengeVisible ? 'YES' : 'NO'}`);

    if (challengeVisible) {
      // Take screenshot of challenge selection
      await page.screenshot({ 
        path: 'e2e/test-results/artifacts/simple-02-challenges.png',
        fullPage: true 
      });

      // Look for challenge buttons
      const challengeSelectors = [
        'button:has-text("Start Challenge")',
        'button:has-text("Begin")',
        'button:has-text("Select")',
        '[data-testid*="challenge"]',
        'button[data-testid*="start"]'
      ];

      let challengeSelected = false;
      for (const selector of challengeSelectors) {
        const buttons = page.locator(selector);
        const count = await buttons.count();
        console.log(`   Found ${count} buttons with selector: ${selector}`);
        
        if (count > 0) {
          const firstButton = buttons.first();
          if (await firstButton.isVisible({ timeout: 2000 })) {
            console.log(`   Clicking first challenge button: ${selector}`);
            await firstButton.click();
            await page.waitForTimeout(3000);
            challengeSelected = true;
            break;
          }
        }
      }

      if (!challengeSelected) {
        console.log('   No challenge button found or clicked successfully');
      }
    }

    // Step 3: Check for design canvas
    console.log('📍 Step 3: Checking for design canvas...');
    
    await page.waitForTimeout(2000);
    
    // Look for various canvas indicators
    const canvasIndicators = [
      { selector: '.react-flow', name: 'React Flow' },
      { selector: '[data-testid="canvas"]', name: 'Canvas TestID' },
      { selector: '[data-testid="design-canvas"]', name: 'Design Canvas TestID' },
      { selector: 'svg', name: 'SVG Element' },
      { selector: '[class*="Canvas"]', name: 'Canvas Class' },
      { selector: '[class*="DesignCanvas"]', name: 'DesignCanvas Class' }
    ];

    let canvasFound = false;
    for (const indicator of canvasIndicators) {
      const isVisible = await page.locator(indicator.selector).first().isVisible({ timeout: 2000 }).catch(() => false);
      const count = await page.locator(indicator.selector).count();
      console.log(`   ${indicator.name}: ${isVisible ? 'VISIBLE' : 'NOT VISIBLE'} (count: ${count})`);
      
      if (isVisible) {
        canvasFound = true;
      }
    }

    // Take final screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/simple-03-final.png',
      fullPage: true 
    });

    // Step 4: Check current page content
    console.log('📍 Step 4: Analyzing current page state...');
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`   Page title: "${title}"`);
    console.log(`   Current URL: ${url}`);

    // Check for main content areas
    const contentAreas = [
      'main',
      '[role="main"]', 
      '.app',
      '[class*="App"]',
      'body > div',
      '#root'
    ];

    for (const selector of contentAreas) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        const innerHTML = await element.innerHTML().catch(() => 'Could not get innerHTML');
        console.log(`   Content area ${selector}: ${innerHTML.length} characters`);
        
        // Check if it contains canvas-related content
        const hasCanvasContent = innerHTML.includes('react-flow') || 
                                innerHTML.includes('canvas') || 
                                innerHTML.includes('Canvas') ||
                                innerHTML.includes('svg');
        console.log(`     Contains canvas content: ${hasCanvasContent ? 'YES' : 'NO'}`);
      }
    }

    // Step 5: Final assessment
    console.log('📍 Step 5: Final assessment...');
    console.log(`   Canvas found: ${canvasFound ? 'YES' : 'NO'}`);
    
    if (!canvasFound) {
      console.log('   🚨 ISSUE CONFIRMED: Canvas is not present after navigation flow');
      
      // Check what screen we're actually on
      const screenMarkers = [
        { text: 'Welcome', screen: 'Welcome Screen' },
        { text: 'Challenge', screen: 'Challenge Selection' },
        { text: 'Design', screen: 'Design Canvas' },
        { text: 'Record', screen: 'Recording Screen' },
        { text: 'Review', screen: 'Review Screen' },
        { text: 'Error', screen: 'Error Screen' }
      ];

      for (const marker of screenMarkers) {
        const hasMarker = await page.locator(`text=${marker.text}`).first().isVisible({ timeout: 1000 }).catch(() => false);
        if (hasMarker) {
          console.log(`   Current screen appears to be: ${marker.screen}`);
        }
      }
    } else {
      console.log('   ✅ Canvas successfully found!');
    }

    console.log('🏁 Simple canvas flow debug completed!');

    // Save page content for analysis
    const htmlContent = await page.content();
    require('fs').writeFileSync('e2e/test-results/artifacts/simple-final-content.html', htmlContent);
    console.log('📁 Saved page content to simple-final-content.html');
  });

  test('should check component palette presence', async ({ page }) => {
    console.log('🔍 Checking component palette specifically...');

    // Navigate and try to get to design canvas
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Skip welcome if present
    const welcomeButton = page.locator('button').first();
    if (await welcomeButton.isVisible({ timeout: 3000 })) {
      await welcomeButton.click();
      await page.waitForTimeout(2000);
    }

    // Skip to challenge selection and select first challenge
    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Now check for component palette
    console.log('📍 Looking for component palette...');
    
    const paletteSelectors = [
      'text="Component Library"',
      'text="Components"', 
      'text="Palette"',
      '[data-testid*="palette"]',
      '[data-testid*="component"]',
      '[class*="Palette"]',
      '[class*="Component"]'
    ];

    let paletteFound = false;
    for (const selector of paletteSelectors) {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`   ${selector}: ${isVisible ? 'FOUND' : 'NOT FOUND'}`);
      if (isVisible) {
        paletteFound = true;
        
        // Look for palette items nearby
        const paletteItems = await page.locator('[data-testid*="palette-item"]').count();
        console.log(`     Palette items found: ${paletteItems}`);
      }
    }

    console.log(`Component palette found: ${paletteFound ? 'YES' : 'NO'}`);

    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/simple-palette-check.png',
      fullPage: true 
    });
  });
});