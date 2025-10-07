/**
 * e2e/hooks-fix-test.spec.ts
 * Simple test to verify the ScreenRouter hooks fix
 * Tests that the "Rendered more hooks" error is resolved
 * RELEVANT FILES: ScreenRouter.tsx
 */

import { test, expect } from '@playwright/test';

test('ScreenRouter hooks fix verification', async ({ page }) => {
  console.log('🧪 Testing ScreenRouter hooks fix...');

  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      console.log(`❌ Console Error: ${text}`);
    }
  });

  // Navigate to the app
  await page.goto('http://localhost:5175/');
  
  // Wait for initial render
  await page.waitForTimeout(2000);

  // Try to interact with the app to trigger re-renders
  try {
    // Check if welcome screen is visible
    const welcomeButton = page.getByRole('button', { name: /start your journey|get started|continue/i });
    if (await welcomeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Welcome screen detected, clicking continue...');
      await welcomeButton.click();
      await page.waitForTimeout(1000);
    }

    // Try to navigate to challenge selection
    const challengeButton = page.getByRole('button', { name: /start challenge|select challenge/i }).first();
    if (await challengeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Challenge selection detected, clicking challenge...');
      await challengeButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('✅ Navigation completed successfully');
  } catch (error) {
    console.log(`⚠️ Navigation error (expected): ${error}`);
  }

  // Filter for specific hooks errors
  const hooksErrors = consoleErrors.filter(error => 
    error.includes('Rendered more hooks') || 
    error.includes('hooks than during the previous render') ||
    error.includes('Hook') && error.includes('render')
  );

  // Log all console errors for debugging
  if (consoleErrors.length > 0) {
    console.log(`📊 Total console errors: ${consoleErrors.length}`);
    console.log('📝 All errors:', consoleErrors);
  }

  if (hooksErrors.length > 0) {
    console.log(`❌ Hooks errors found: ${hooksErrors.length}`);
    hooksErrors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('✅ No hooks errors detected!');
  }

  // Take screenshot for debugging
  await page.screenshot({ 
    path: 'e2e/test-results/hooks-fix-verification.png',
    fullPage: true
  });

  // Assert no hooks-related errors
  expect(hooksErrors.length).toBe(0);
  
  console.log('🎉 ScreenRouter hooks fix verification passed!');
});