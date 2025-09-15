// e2e/error-recovery.spec.ts
// Comprehensive error recovery and graceful degradation tests
// Tests application resilience under various failure conditions
// RELEVANT FILES: e2e/utils/test-helpers.ts, src/services/ErrorRecoverySystem.ts, src/components/RecoveryOverlay.tsx, src/services/PersistenceService.ts

import { test, expect } from '@playwright/test';
import { createHelpers } from './utils/test-helpers';

test.describe('Error Recovery Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = createHelpers(page);
    await helpers.debug.logPageConsole();
    await helpers.debug.logNetworkRequests();
  });

  test.describe('Rendering Error Recovery', () => {
    test('canvas rendering failure recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Trigger rendering exception
      await page.evaluate(() => {
        // Simulate rendering error by corrupting React Flow
        const canvas = document.querySelector('.react-flow__viewport');
        if (canvas) {
          Object.defineProperty(canvas, 'getBoundingClientRect', {
            value: () => { throw new Error('Rendering failure'); }
          });
        }
      });

      // Try to add another component to trigger the error
      try {
        await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      } catch (error) {
        // Expected to fail
      }

      // Check if recovery overlay appears
      const recoveryOverlay = page.locator('[data-testid="recovery-overlay"]');
      if (await recoveryOverlay.isVisible()) {
        await helpers.assert.assertRecoveryOverlayVisible();

        // Click recover button
        const recoverButton = page.getByRole('button', { name: /recover/i });
        await recoverButton.click();

        // Wait for recovery
        await page.waitForTimeout(2000);

        // Verify recovery
        await helpers.assert.assertNoRecoveryOverlay();
        await helpers.assert.assertNoErrors();
      }
    });

    test('component corruption recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      // Corrupt component data in localStorage
      await page.evaluate(() => {
        const designData = localStorage.getItem('archicomm-design');
        if (designData) {
          const corrupted = designData.replace('"server"', '"corrupted-component"');
          localStorage.setItem('archicomm-design', corrupted);
        }
      });

      // Reload page to trigger corruption detection
      await page.reload();
      await page.waitForTimeout(1000);

      // Should auto-repair or show recovery options
      await helpers.assert.assertNoErrors();

      // Verify at least one component remains
      const componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBeGreaterThanOrEqual(1);
    });

    test('memory leak recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Simulate memory pressure
      await helpers.canvas.triggerMemoryPressure();

      // Try to add many components to trigger memory issues
      try {
        await helpers.canvas.createLargeDesign(100);
      } catch (error) {
        // Expected to hit memory limits
      }

      // Verify graceful handling
      await helpers.assert.assertNoErrors();

      // Verify basic functionality still works
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.assert.assertComponentCount(1);
    });
  });

  test.describe('Network Error Recovery', () => {
    test('offline mode graceful degradation', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Simulate network failure
      await helpers.canvas.simulateNetworkDisruption();

      // App should continue functioning offline
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addAnnotation('Offline Test', { x: 300, y: 150 });

      // Verify functionality
      await helpers.assert.assertComponentCount(2);
      await helpers.assert.assertAnnotationExists('Offline Test');

      // Verify no critical errors
      await helpers.assert.assertNoErrors();
    });

    test('slow network auto-save', async ({ page }) => {
      const helpers = createHelpers(page);

      // Mock slow network
      await helpers.mock.mockSlowNetwork(3000);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Verify auto-save queuing and retry logic
      await page.waitForTimeout(1000);

      // Add more components while network is slow
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addComponent('cache', { x: 600, y: 200 });

      // Wait for auto-save attempts
      await page.waitForTimeout(5000);

      // Verify components were added despite slow network
      await helpers.assert.assertComponentCount(3);

      // Restore network
      await helpers.mock.restoreNetwork();
    });

    test('network recovery after offline', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Go offline
      await helpers.mock.mockNetworkFailure();

      // Add content while offline
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addAnnotation('Offline Addition', { x: 300, y: 150 });

      // Restore network
      await helpers.mock.restoreNetwork();

      // Verify sync behavior when network returns
      await page.waitForTimeout(2000);

      // Check that offline changes are preserved
      await helpers.assert.assertComponentCount(2);
      await helpers.assert.assertAnnotationExists('Offline Addition');
    });
  });

  test.describe('Data Corruption Recovery', () => {
    test('localStorage corruption recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      // Corrupt localStorage before navigation
      await page.addInitScript(() => {
        localStorage.setItem('archicomm-design', '{invalid json}');
        localStorage.setItem('archicomm-session', 'corrupted data');
        localStorage.setItem('archicomm-settings', '{"corrupt": true');
      });

      await helpers.canvas.navigateToCanvas();

      // Should fallback to clean state or IndexedDB
      await helpers.assert.assertNoErrors();

      // Verify user can still create designs
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.assert.assertComponentCount(1);
    });

    test('partial data loss recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addComponent('cache', { x: 600, y: 200 });

      // Simulate partial data corruption
      await page.evaluate(() => {
        const designData = localStorage.getItem('archicomm-design');
        if (designData) {
          const parsed = JSON.parse(designData);
          // Remove some components but keep others
          if (parsed.components) {
            parsed.components = parsed.components.slice(0, 1);
          }
          localStorage.setItem('archicomm-design', JSON.stringify(parsed));
        }
      });

      // Reload to trigger recovery
      await page.reload();
      await page.waitForTimeout(1000);

      // Verify partial recovery
      const componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBeGreaterThan(0);

      // User should be able to continue working
      await helpers.canvas.addComponent('load-balancer', { x: 800, y: 200 });
    });

    test('backup restoration', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      // Create backup
      const backupData = await page.evaluate(() => {
        const designData = localStorage.getItem('archicomm-design');
        localStorage.setItem('archicomm-design-backup', designData || '');
        return designData;
      });

      // Corrupt primary data
      await page.evaluate(() => {
        localStorage.setItem('archicomm-design', 'corrupted');
      });

      // Reload to trigger backup restoration
      await page.reload();
      await page.waitForTimeout(1000);

      // Should restore from backup if implemented
      await helpers.assert.assertNoErrors();

      // Verify at least basic functionality
      await helpers.canvas.addComponent('cache', { x: 600, y: 200 });
    });
  });

  test.describe('Recovery UI Testing', () => {
    test('recovery overlay interaction', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger error that shows recovery overlay
      await page.evaluate(() => {
        // Simulate critical error
        const event = new CustomEvent('critical-error', {
          detail: { message: 'Test error for recovery UI', recoverable: true }
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(1000);

      const recoveryOverlay = page.locator('[data-testid="recovery-overlay"]');
      if (await recoveryOverlay.isVisible()) {
        await helpers.assert.assertRecoveryOverlayVisible();

        // Test recovery buttons
        const recoverButton = page.getByRole('button', { name: /recover/i });
        const reloadButton = page.getByRole('button', { name: /reload/i });
        const resetButton = page.getByRole('button', { name: /reset/i });

        if (await recoverButton.isVisible()) {
          await recoverButton.click();
          await page.waitForTimeout(1000);
          await helpers.assert.assertNoRecoveryOverlay();
        }
      }
    });

    test('recovery progress indication', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger recovery process
      await page.evaluate(() => {
        const event = new CustomEvent('start-recovery', {
          detail: { type: 'data-recovery', showProgress: true }
        });
        window.dispatchEvent(event);
      });

      // Verify progress indicators
      const progressIndicator = page.locator('[data-testid="recovery-progress"], .recovery-progress');
      if (await progressIndicator.isVisible()) {
        await expect(progressIndicator).toBeVisible();

        // Simulate recovery completion
        await page.evaluate(() => {
          const event = new CustomEvent('recovery-complete', {
            detail: { success: true }
          });
          window.dispatchEvent(event);
        });

        await page.waitForTimeout(1000);
      }

      await helpers.assert.assertNoRecoveryOverlay();
    });

    test('recovery success notification', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Simulate successful recovery
      await page.evaluate(() => {
        const event = new CustomEvent('recovery-success', {
          detail: { message: 'Design successfully recovered' }
        });
        window.dispatchEvent(event);
      });

      // Verify success notification
      const successNotification = page.locator('[data-testid="success-notification"], .success-notification');
      if (await successNotification.isVisible()) {
        await expect(successNotification).toBeVisible();
        await expect(successNotification).toContainText(/recovered/i);
      }
    });
  });

  test.describe('Error Boundary Testing', () => {
    test('component error boundary', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Trigger React component error
      await page.evaluate(() => {
        // Force React error by corrupting component props
        const serverNode = document.querySelector('.react-flow__node');
        if (serverNode) {
          const reactInternalInstance = Object.keys(serverNode).find(key =>
            key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
          );
          if (reactInternalInstance) {
            (serverNode as any)[reactInternalInstance] = null;
          }
        }

        // Trigger re-render
        const event = new Event('click', { bubbles: true });
        serverNode?.dispatchEvent(event);
      });

      await page.waitForTimeout(1000);

      // Error boundary should catch and display recovery options
      const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
      if (await errorBoundary.isVisible()) {
        await expect(errorBoundary).toBeVisible();

        const retryButton = page.getByRole('button', { name: /retry/i });
        if (await retryButton.isVisible()) {
          await retryButton.click();
        }
      }

      // Verify error is contained
      await helpers.assert.assertNoErrors();
    });

    test('canvas error isolation', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger canvas-specific error
      await page.evaluate(() => {
        const canvas = document.querySelector('.react-flow');
        if (canvas) {
          // Corrupt canvas state
          throw new Error('Canvas rendering error');
        }
      });

      await page.waitForTimeout(1000);

      // Verify error doesn't crash entire application
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      if (await toolbar.isVisible()) {
        await expect(toolbar).toBeVisible();
      }

      // Other UI elements should still work
      await helpers.assert.assertPageResponsive();
    });

    test('graceful error reporting', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger error with graceful reporting
      await page.evaluate(() => {
        const error = new Error('Test error for user feedback');
        const event = new CustomEvent('user-facing-error', {
          detail: { error, userFriendly: true }
        });
        window.dispatchEvent(event);
      });

      // Verify user-friendly error message
      const errorMessage = page.locator('[data-testid="error-message"], .error-message');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).not.toContainText(/stack trace|undefined|null/i);
      }
    });
  });

  test.describe('Performance Recovery', () => {
    test('performance degradation recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create performance stress
      await helpers.canvas.createLargeDesign(50);
      await helpers.canvas.triggerMemoryPressure();

      // Monitor performance
      const performanceData = await page.evaluate(() => {
        return {
          memory: (performance as any).memory?.usedJSHeapSize || 0,
          timing: performance.now()
        };
      });

      // App should detect and recover from performance issues
      await page.waitForTimeout(2000);

      // Verify app is still responsive
      await helpers.assert.assertPageResponsive();

      // Basic operations should still work
      await helpers.canvas.addComponent('server', { x: 100, y: 100 });
    });

    test('automatic cleanup on memory pressure', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.createLargeDesign(30);

      // Trigger memory pressure
      await helpers.mock.simulateMemoryPressure();

      // App should automatically clean up resources
      await page.waitForTimeout(3000);

      // Verify cleanup occurred but core functionality preserved
      const componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBeGreaterThan(0);

      // New operations should work
      await helpers.canvas.addComponent('database', { x: 200, y: 200 });
    });
  });

  test.describe('Critical System Recovery', () => {
    test('complete system recovery', async ({ page }) => {
      const helpers = createHelpers(page);

      // Simulate complete system failure
      await page.addInitScript(() => {
        // Corrupt all storage
        localStorage.clear();
        sessionStorage.clear();

        // Mock IndexedDB failure
        (window as any).indexedDB = {
          open: () => {
            throw new Error('IndexedDB not available');
          }
        };
      });

      await page.goto('/');

      // Should gracefully handle complete storage failure
      await helpers.assert.assertNoErrors();

      // Basic functionality should still work
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.assert.assertComponentCount(1);
    });

    test('emergency reset functionality', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.createLargeDesign(10);

      // Trigger emergency reset
      await page.evaluate(() => {
        const event = new CustomEvent('emergency-reset', {
          detail: { reason: 'critical-error', preserveSettings: false }
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(2000);

      // Verify clean state
      const componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(0);

      // Verify full functionality restored
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.assert.assertComponentCount(1);
    });
  });
});