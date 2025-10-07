// test-infinite-loop-fix.js
// Simple script to test if the infinite loop issue is fixed

import { chromium } from 'playwright';

async function testInfiniteLoopFix() {
  console.log('Starting test for infinite loop fix...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  const errorMessages = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log(`Console: ${text}`);
    
    // Check for infinite loop indicators
    if (text.includes('Maximum update depth exceeded') || 
        text.includes('getSnapshot should be cached') ||
        text.includes('infinite loop')) {
      errorMessages.push(text);
    }
  });
  
  page.on('pageerror', (error) => {
    const message = error.message;
    errorMessages.push(message);
    console.log(`Page Error: ${message}`);
  });
  
  try {
    // Navigate to the app
    console.log('Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Page loaded, waiting 5 seconds to check for infinite loops...');
    await page.waitForTimeout(5000);
    
    // Try to navigate to canvas
    console.log('Looking for canvas elements...');
    
    // Check if we can find some key elements without errors
    const welcomeButton = await page.getByRole('button', { name: /start your journey/i }).isVisible().catch(() => false);
    console.log(`Welcome button visible: ${welcomeButton}`);
    
    if (welcomeButton) {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page.waitForTimeout(2000);
    }
    
    // Look for challenge selection or canvas
    const challengeElements = await page.locator('.challenge-card, [data-testid*="challenge"]').count();
    console.log(`Challenge elements found: ${challengeElements}`);
    
    console.log('Test completed successfully!');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Error messages: ${errorMessages.length}`);
    
    if (errorMessages.length === 0) {
      console.log('✅ SUCCESS: No infinite loop errors detected!');
    } else {
      console.log('❌ FAILURE: Infinite loop errors still present:');
      errorMessages.forEach(msg => console.log(`  - ${msg}`));
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log(`Error messages captured: ${errorMessages.length}`);
    errorMessages.forEach(msg => console.log(`  - ${msg}`));
  } finally {
    await browser.close();
  }
}

// Run the test
testInfiniteLoopFix().catch(console.error);