/**
 * e2e/hooks-render-error.spec.ts
 * Playwright test to reproduce and debug React hooks rendering errors
 * Tests for "Rendered more hooks than during the previous render" error in ScreenRouter
 * RELEVANT FILES: ScreenRouter.tsx, AppContainer.tsx, canvasStore.ts
 */

import { test, expect } from '@playwright/test';

test.describe('React Hooks Rendering Issues', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors to capture the hooks error
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Store console errors for later assertion
    (page as any).consoleErrors = consoleErrors;
  });

  test('should not render more hooks than previous render in ScreenRouter', async ({ page }) => {
    console.log('🧪 Testing React hooks consistency in ScreenRouter...');

    // Navigate to the app
    await page.goto('http://localhost:5174/');

    // Wait for initial render
    await page.waitForTimeout(1000);

    // Check for hooks-related errors in console
    const consoleErrors = (page as any).consoleErrors as string[];
    const hooksErrors = consoleErrors.filter(error => 
      error.includes('Rendered more hooks') || 
      error.includes('hooks than during the previous render')
    );

    if (hooksErrors.length > 0) {
      console.log('❌ Hooks errors found:');
      hooksErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No hooks errors detected in initial render');
    }

    // Navigate through different screens to trigger re-renders
    console.log('🔄 Testing screen transitions...');

    // If welcome screen is shown, complete it
    const welcomeButton = page.getByRole('button', { name: /start your journey|get started|continue/i });
    if (await welcomeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await welcomeButton.click();
      await page.waitForTimeout(500);
    }

    // Try to trigger challenge selection
    const challengeButton = page.getByRole('button', { name: /start challenge|select challenge/i }).first();
    if (await challengeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await challengeButton.click();
      await page.waitForTimeout(500);
    }

    // Check for hooks errors after navigation
    const postNavigationHooksErrors = (page as any).consoleErrors.filter((error: string) => 
      error.includes('Rendered more hooks') || 
      error.includes('hooks than during the previous render')
    );

    // Take a screenshot for debugging
    await page.screenshot({ path: 'e2e/test-results/hooks-error-debug.png' });

    // Assert no hooks errors occurred
    expect(postNavigationHooksErrors.length).toBe(0);

    console.log('✅ No hooks consistency errors detected during screen transitions');
  });

  test('should maintain stable hook calls in ScreenRouter component', async ({ page }) => {
    console.log('🧪 Testing ScreenRouter hook stability...');

    // Monitor React DevTools warnings if available
    await page.addInitScript(() => {
      const originalWarn = console.warn;
      (window as any).reactWarnings = [];
      
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('hooks') || message.includes('render')) {
          (window as any).reactWarnings.push(message);
        }
        originalWarn.apply(console, args);
      };
    });

    await page.goto('http://localhost:5174/');

    // Wait for component to stabilize
    await page.waitForTimeout(2000);

    // Force multiple re-renders by interacting with different elements
    console.log('🔄 Forcing component re-renders...');

    // Try to interact with different UI elements that might cause re-renders
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await button.hover();
        await page.waitForTimeout(100);
      }
    }

    // Check for React warnings
    const reactWarnings = await page.evaluate(() => (window as any).reactWarnings || []);
    
    if (reactWarnings.length > 0) {
      console.log('⚠️ React warnings detected:');
      reactWarnings.forEach((warning: string) => console.log(`  - ${warning}`));
    }

    // Check console errors one more time
    const finalConsoleErrors = (page as any).consoleErrors.filter((error: string) => 
      error.includes('hook') || 
      error.includes('render') ||
      error.includes('Rendered more hooks')
    );

    expect(finalConsoleErrors.length).toBe(0);
    expect(reactWarnings.length).toBe(0);

    console.log('✅ Component hook stability verified');
  });

  test('should handle canvas store state changes without hooks errors', async ({ page }) => {
    console.log('🧪 Testing canvas store state changes...');

    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(1000);

    // Complete welcome if shown
    const welcomeButton = page.getByRole('button', { name: /start your journey/i });
    if (await welcomeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await welcomeButton.click();
    }

    // Select a challenge to enter canvas mode
    const challengeButtons = page.getByRole('button', { name: /start challenge/i });
    if (await challengeButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await challengeButtons.first().click();
    }

    // Wait for canvas to load
    await page.waitForSelector('[data-testid="canvas"], [data-testid="design-canvas"], .react-flow', { timeout: 5000 });

    console.log('🎯 Canvas loaded, testing state changes...');

    // Try to interact with canvas elements that might trigger store updates
    const canvas = page.locator('[data-testid="canvas"], [data-testid="design-canvas"], .react-flow').first();
    
    if (await canvas.isVisible()) {
      // Click somewhere on the canvas
      await canvas.click();
      await page.waitForTimeout(200);

      // Try to add a component if palette is available
      const paletteItems = page.locator('[data-testid*="palette-item"]');
      if (await paletteItems.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await paletteItems.first().dragTo(canvas);
        await page.waitForTimeout(500);
      }
    }

    // Check for hooks errors after canvas interactions
    const canvasHooksErrors = (page as any).consoleErrors.filter((error: string) => 
      error.includes('Rendered more hooks') || 
      error.includes('hooks than during the previous render')
    );

    expect(canvasHooksErrors.length).toBe(0);
    console.log('✅ Canvas state changes handled without hooks errors');
  });

  test('should debug specific ScreenRouter hook usage', async ({ page }) => {
    console.log('🔍 Debugging ScreenRouter hook usage...');

    // Inject debugging code to monitor hook calls
    await page.addInitScript(() => {
      let hookCallCounts: { [key: string]: number } = {};
      let renderCount = 0;

      const originalUseCallback = (window as any).React?.useCallback;
      const originalUseMemo = (window as any).React?.useMemo;
      const originalUseCanvasStore = (window as any).useCanvasStore;

      if (originalUseCallback) {
        (window as any).React.useCallback = function(...args: any[]) {
          const name = `useCallback_${Object.keys(hookCallCounts).length + 1}`;
          hookCallCounts[name] = (hookCallCounts[name] || 0) + 1;
          console.log(`Hook call: ${name} (count: ${hookCallCounts[name]}, render: ${renderCount})`);
          return originalUseCallback.apply(this, args);
        };
      }

      if (originalUseMemo) {
        (window as any).React.useMemo = function(...args: any[]) {
          const name = `useMemo_${Object.keys(hookCallCounts).length + 1}`;
          hookCallCounts[name] = (hookCallCounts[name] || 0) + 1;
          console.log(`Hook call: ${name} (count: ${hookCallCounts[name]}, render: ${renderCount})`);
          return originalUseMemo.apply(this, args);
        };
      }

      // Track render cycles
      const observer = new MutationObserver(() => {
        renderCount++;
      });
      
      setTimeout(() => {
        observer.observe(document.body, { childList: true, subtree: true });
      }, 100);

      (window as any).getHookDebugInfo = () => ({
        hookCallCounts,
        renderCount,
      });
    });

    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(3000);

    // Get hook debug information
    const debugInfo = await page.evaluate(() => (window as any).getHookDebugInfo?.() || {});
    console.log('🔍 Hook debug info:', debugInfo);

    // Check final error count
    const finalErrors = (page as any).consoleErrors.filter((error: string) => 
      error.includes('hook') || error.includes('render')
    );

    console.log(`📊 Final error count: ${finalErrors.length}`);
    
    if (finalErrors.length > 0) {
      console.log('❌ Errors found:', finalErrors);
    }
  });
});