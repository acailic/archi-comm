// /Users/aleksandarilic/Documents/github/acailic/archicomm/e2e/canvas-diagnosis.spec.ts
// Comprehensive canvas diagnosis test to check why canvas might not be showing
// This test captures screenshots and checks all canvas-related elements
// RELEVANT FILES: src/modules/canvas/Canvas.tsx, src/modules/canvas/stores/canvasStore.ts, e2e/canvas-simple-debug.spec.ts, e2e/canvas-quick-test.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Canvas Diagnosis', () => {
  test('comprehensive canvas check with screenshots', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'canvas-diagnosis-initial.png', 
      fullPage: true 
    });
    
    console.log('=== INITIAL PAGE STATE ===');
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Check if welcome screen is visible
    const welcomeScreen = page.locator('[data-testid="welcome-screen"]');
    const isWelcomeVisible = await welcomeScreen.isVisible();
    console.log('Welcome screen visible:', isWelcomeVisible);
    
    if (isWelcomeVisible) {
      console.log('=== WELCOME SCREEN FOUND ===');
      
      // Look for buttons to get past welcome screen
      const buttons = await page.locator('button').all();
      console.log('Found buttons:', buttons.length);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const text = await button.textContent();
        console.log(`Button ${i}: "${text}"`);
      }
      
      // Try to find and click any "start", "continue", or "skip" button
      const startButtons = [
        'button:has-text("Start")',
        'button:has-text("Continue")', 
        'button:has-text("Skip")',
        'button:has-text("Get Started")',
        'button:has-text("Begin")',
        '[data-testid*="start"]',
        '[data-testid*="continue"]',
        '[data-testid*="skip"]'
      ];
      
      for (const selector of startButtons) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible()) {
            console.log(`Clicking button with selector: ${selector}`);
            await button.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          console.log(`Button not found: ${selector}`);
        }
      }
    }
    
    // Wait a bit for navigation
    await page.waitForTimeout(2000);
    
    // Take screenshot after potential navigation
    await page.screenshot({ 
      path: 'canvas-diagnosis-after-navigation.png', 
      fullPage: true 
    });
    
    console.log('=== CANVAS ELEMENTS CHECK ===');
    
    // Check for React Flow canvas
    const reactFlow = page.locator('.react-flow');
    const isReactFlowVisible = await reactFlow.isVisible();
    console.log('React Flow visible:', isReactFlowVisible);
    
    if (isReactFlowVisible) {
      const bounds = await reactFlow.boundingBox();
      console.log('React Flow bounds:', bounds);
    }
    
    // Check for canvas elements
    const canvases = await page.locator('canvas').all();
    console.log('Number of canvas elements:', canvases.length);
    
    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      const isVisible = await canvas.isVisible();
      const bounds = await canvas.boundingBox();
      console.log(`Canvas ${i}: visible=${isVisible}, bounds=`, bounds);
    }
    
    // Check for component palette
    const componentPalette = page.locator('[data-testid="component-palette"]');
    const isPaletteVisible = await componentPalette.isVisible();
    console.log('Component palette visible:', isPaletteVisible);
    
    if (isPaletteVisible) {
      const paletteItems = await page.locator('[data-testid*="palette-item"]').count();
      console.log('Palette items count:', paletteItems);
    }
    
    // Check for any error messages
    const errorMessages = await page.locator('[role="alert"], .error, [data-testid*="error"]').all();
    console.log('Error messages found:', errorMessages.length);
    
    for (let i = 0; i < errorMessages.length; i++) {
      const error = errorMessages[i];
      const text = await error.textContent();
      console.log(`Error ${i}:`, text);
    }
    
    // Check console for errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`Console Error: ${msg.text()}`);
      }
    });
    
    // Wait a bit to capture any console errors
    await page.waitForTimeout(1000);
    
    if (logs.length > 0) {
      console.log('=== CONSOLE ERRORS ===');
      logs.forEach(log => console.log(log));
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'canvas-diagnosis-final.png', 
      fullPage: true 
    });
    
    console.log('=== DIAGNOSIS COMPLETE ===');
    console.log('Screenshots saved: canvas-diagnosis-initial.png, canvas-diagnosis-after-navigation.png, canvas-diagnosis-final.png');
  });
});