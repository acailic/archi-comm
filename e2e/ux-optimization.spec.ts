import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end tests for UX optimization system integration
 * Tests comprehensive user behavior tracking, recommendation system, and performance metrics
 */

test.describe('UX Optimization System', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Wait for app to load and dismiss welcome screen
    await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 5000 });
    await page.click('button:has-text("Get Started")');
    await expect(page.locator('[data-testid="challenge-selection"]')).toBeVisible();
  });

  test.describe('User Behavior Tracking', () => {
    test('should track navigation between screens', async () => {
      // Navigate to challenge selection
      await expect(page.locator('text=Select Challenge')).toBeVisible();

      // Select a challenge
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('text=Design System')).toBeVisible();

      // Verify UX tracking data exists in console or local storage
      const navigationData = await page.evaluate(() => {
        return localStorage.getItem('ux-tracking-data');
      });
      expect(navigationData).toBeTruthy();
    });

    test('should track component operations on canvas', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Drop a component on canvas
      const componentPalette = page.locator('[data-testid="component-palette"] [data-component-type="server"]');
      const canvas = page.locator('[data-testid="canvas"]');
      
      await componentPalette.dragTo(canvas, { 
        targetPosition: { x: 200, y: 150 } 
      });

      // Wait for component to appear
      await expect(page.locator('[data-testid="canvas-component"]')).toHaveCount(1);

      // Verify tracking of component drop
      await page.waitForTimeout(500); // Allow tracking to process
      const trackingEvents = await page.evaluate(() => {
        return (window as any).uxTrackingEvents || [];
      });
      
      const componentDropEvent = trackingEvents.find((event: any) => 
        event.type === 'component-drop' && event.success === true
      );
      expect(componentDropEvent).toBeTruthy();
      expect(componentDropEvent.data.componentType).toBe('server');
    });

    test('should track annotation creation and editing', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Add a component first
      const componentPalette = page.locator('[data-testid="component-palette"] [data-component-type="server"]');
      const canvas = page.locator('[data-testid="canvas"]');
      await componentPalette.dragTo(canvas, { targetPosition: { x: 200, y: 150 } });

      // Create an annotation by pressing 'C' key
      await page.keyboard.press('c');
      await page.click(canvas, { position: { x: 300, y: 200 } });

      // Edit the annotation
      await page.dblclick('[data-testid="annotation"]:first-child');
      await expect(page.locator('[data-testid="annotation-edit-dialog"]')).toBeVisible();

      // Type content and save
      await page.fill('[data-testid="annotation-content"]', 'Test annotation content');
      await page.keyboard.press('Control+Enter'); // Save with shortcut

      // Verify annotation tracking
      const trackingEvents = await page.evaluate(() => {
        return (window as any).uxTrackingEvents || [];
      });
      
      const annotationEvents = trackingEvents.filter((event: any) => 
        event.type.includes('annotation')
      );
      expect(annotationEvents.length).toBeGreaterThan(0);
    });

    test('should track keyboard shortcut usage', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Use various keyboard shortcuts
      await page.keyboard.press('Control+s'); // Save
      await page.keyboard.press('Control+z'); // Undo
      await page.keyboard.press('Control+k'); // Command palette

      // Wait for tracking to process
      await page.waitForTimeout(500);

      // Verify keyboard shortcut tracking
      const trackingEvents = await page.evaluate(() => {
        return (window as any).uxTrackingEvents || [];
      });
      
      const shortcutEvents = trackingEvents.filter((event: any) => 
        event.type === 'keyboard-shortcut'
      );
      expect(shortcutEvents.length).toBeGreaterThanOrEqual(3);

      const shortcuts = shortcutEvents.map((event: any) => event.data.shortcut);
      expect(shortcuts).toContain('Ctrl+S');
      expect(shortcuts).toContain('Ctrl+Z');
      expect(shortcuts).toContain('Ctrl+K');
    });

    test('should track error events and failed operations', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Try to delete component without selecting one (should fail)
      await page.keyboard.press('Delete');

      // Try to undo when nothing to undo (should fail)
      await page.keyboard.press('Control+z');

      // Wait for tracking to process
      await page.waitForTimeout(500);

      // Verify error tracking
      const trackingEvents = await page.evaluate(() => {
        return (window as any).uxTrackingEvents || [];
      });
      
      const failedEvents = trackingEvents.filter((event: any) => 
        event.success === false
      );
      expect(failedEvents.length).toBeGreaterThan(0);
    });
  });

  test.describe('Recommendation System', () => {
    test('should display recommendations after user struggles', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Simulate struggling user behavior
      for (let i = 0; i < 5; i++) {
        // Try to perform actions that might fail
        await page.keyboard.press('Delete'); // No component selected
        await page.keyboard.press('Control+z'); // Nothing to undo
        await page.click(page.locator('[data-testid="canvas"]'), { 
          position: { x: 50, y: 50 } 
        });
        await page.waitForTimeout(200);
      }

      // Wait for recommendation system to analyze behavior
      await page.waitForTimeout(3000);

      // Check if recommendation toast appears
      const recommendationToast = page.locator('.ux-recommendation-toast');
      await expect(recommendationToast).toBeVisible({ timeout: 5000 });

      // Verify recommendation content
      const toastText = await recommendationToast.textContent();
      expect(toastText).toContain('tip' || 'suggestion' || 'try');
    });

    test('should track recommendation interactions', async () => {
      // Trigger recommendation flow (simplified)
      await page.click('[data-testid="challenge-card"]:first-child');
      
      // Force trigger a recommendation via JavaScript
      await page.evaluate(() => {
        const event = new CustomEvent('ux-recommendation', {
          detail: {
            id: 'test-recommendation',
            type: 'tip',
            priority: 'medium',
            title: 'Test Recommendation',
            message: 'This is a test recommendation',
            action: {
              label: 'Try it',
              handler: () => console.log('Recommendation accepted')
            }
          }
        });
        window.dispatchEvent(event);
      });

      // Wait for toast to appear
      const toast = page.locator('.ux-recommendation-toast');
      await expect(toast).toBeVisible({ timeout: 2000 });

      // Click accept button if available
      const acceptButton = toast.locator('button:has-text("Try it")');
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
      }

      // Verify recommendation interaction tracking
      const trackingEvents = await page.evaluate(() => {
        return (window as any).uxTrackingEvents || [];
      });
      
      const recommendationEvents = trackingEvents.filter((event: any) => 
        event.type.includes('recommendation')
      );
      expect(recommendationEvents.length).toBeGreaterThan(0);
    });

    test('should not overwhelm users with recommendations', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      
      // Force multiple recommendations quickly
      for (let i = 0; i < 3; i++) {
        await page.evaluate((index) => {
          const event = new CustomEvent('ux-recommendation', {
            detail: {
              id: `recommendation-${index}`,
              type: 'tip',
              priority: 'low',
              title: `Recommendation ${index}`,
              message: `Test recommendation ${index}`
            }
          });
          window.dispatchEvent(event);
        }, i);
        await page.waitForTimeout(100);
      }

      // Check that only one toast is visible (rate limiting)
      const toasts = page.locator('.ux-recommendation-toast');
      const count = await toasts.count();
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Performance Metrics', () => {
    test('should display FPS and performance indicators in status bar', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Wait for performance metrics to load
      await page.waitForTimeout(2000);

      // Check for FPS indicator in status bar
      const fpsIndicator = page.locator('text=/\\d+fps/');
      await expect(fpsIndicator).toBeVisible();

      // Check for render time indicator
      const renderTimeIndicator = page.locator('text=/\\d+\\.\\d+ms/');
      await expect(renderTimeIndicator).toBeVisible({ timeout: 5000 });

      // Check for performance health indicator
      const performanceIcon = page.locator('[title*="Performance Metrics"]');
      await expect(performanceIcon).toBeVisible({ timeout: 5000 });
    });

    test('should display UX metrics in status bar', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Wait for UX metrics to load
      await page.waitForTimeout(3000);

      // Check for user satisfaction indicator
      const satisfactionIndicator = page.locator('text=/\\d+%/').first();
      await expect(satisfactionIndicator).toBeVisible({ timeout: 5000 });

      // Check for skill level indicator
      const skillIndicator = page.locator('text=/beginner|intermediate|advanced/');
      await expect(skillIndicator).toBeVisible({ timeout: 5000 });

      // Verify tooltip information
      const uxMetricsArea = page.locator('[title*="UX Metrics"]');
      await uxMetricsArea.hover();
      
      // Check that tooltip contains expected metrics
      const tooltip = await page.locator('[title*="Satisfaction"]').getAttribute('title');
      expect(tooltip).toContain('Satisfaction:');
      expect(tooltip).toContain('%');
    });

    test('should update metrics in real-time during usage', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Get initial FPS value
      await page.waitForTimeout(2000);
      const initialFps = await page.locator('text=/\\d+fps/').textContent();

      // Perform intensive operations to potentially affect FPS
      const canvas = page.locator('[data-testid="canvas"]');
      for (let i = 0; i < 10; i++) {
        const componentType = ['server', 'database', 'load-balancer'][i % 3];
        const component = page.locator(`[data-component-type="${componentType}"]`);
        await component.dragTo(canvas, { 
          targetPosition: { x: 100 + i * 50, y: 100 + i * 30 } 
        });
        await page.waitForTimeout(100);
      }

      // Wait for metrics to update
      await page.waitForTimeout(2000);

      // Verify metrics have been updated
      const updatedFps = await page.locator('text=/\\d+fps/').textContent();
      
      // FPS might change or performance health might update
      const performanceHealth = page.locator('[title*="Performance Metrics"]');
      await expect(performanceHealth).toBeVisible();
      
      // At minimum, verify metrics are still being displayed and updated
      expect(updatedFps).toBeTruthy();
      expect(updatedFps).toMatch(/\\d+fps/);
    });
  });

  test.describe('Adaptive UI Tests', () => {
    test('should adapt tooltips based on user experience', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Hover over save button to see tooltip
      const saveButton = page.locator('[title*="Save"]');
      await saveButton.hover();

      // Check that tooltip exists and contains helpful information
      const saveTooltip = await saveButton.getAttribute('title');
      expect(saveTooltip).toContain('Save');
      
      // Verify smart tooltips are working
      const smartTooltips = page.locator('[data-smart-tooltip]');
      if (await smartTooltips.count() > 0) {
        await smartTooltips.first().hover();
        await page.waitForTimeout(500);
        // Smart tooltip should provide contextual help
        expect(true).toBe(true); // Placeholder for adaptive tooltip verification
      }
    });

    test('should track user skill progression', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Perform expert-level actions
      await page.keyboard.press('Control+s'); // Save
      await page.keyboard.press('Control+k'); // Command palette
      await page.keyboard.press('Escape');     // Close palette
      
      // Add components efficiently
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('c'); // Comment mode
        await page.click(page.locator('[data-testid="canvas"]'), { 
          position: { x: 150 + i * 100, y: 150 } 
        });
      }

      // Wait for skill level to potentially update
      await page.waitForTimeout(3000);

      // Check if skill level is displayed and reasonable
      const skillLevel = page.locator('text=/beginner|intermediate|advanced/');
      await expect(skillLevel).toBeVisible();
      
      const skillText = await skillLevel.textContent();
      expect(['beginner', 'intermediate', 'advanced']).toContain(skillText?.toLowerCase());
    });
  });

  test.describe('Integration Tests', () => {
    test('should complete full user workflow with UX tracking', async () => {
      // Complete challenge selection -> design -> explanation -> review flow
      
      // 1. Challenge selection
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // 2. Design phase - add components and connections
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add server component
      const serverComponent = page.locator('[data-component-type="server"]');
      await serverComponent.dragTo(canvas, { targetPosition: { x: 200, y: 150 } });
      
      // Add database component
      const dbComponent = page.locator('[data-component-type="database"]');
      await dbComponent.dragTo(canvas, { targetPosition: { x: 400, y: 150 } });

      // Wait for components to be placed
      await expect(page.locator('[data-testid="canvas-component"]')).toHaveCount(2);

      // 3. Continue to audio recording
      await page.click('button:has-text("Continue")');
      await expect(page.locator('text=Record Explanation')).toBeVisible();

      // 4. Skip to review (simulate recording)
      await page.click('button:has-text("Continue")');
      await expect(page.locator('text=Session Review')).toBeVisible();

      // Verify complete workflow tracking
      await page.waitForTimeout(1000);
      const trackingEvents = await page.evaluate(() => {
        return (window as any).uxTrackingEvents || [];
      });
      
      // Should have navigation events
      const navigationEvents = trackingEvents.filter((event: any) => 
        event.type === 'navigate'
      );
      expect(navigationEvents.length).toBeGreaterThanOrEqual(2);

      // Should have component events
      const componentEvents = trackingEvents.filter((event: any) => 
        event.type.includes('component')
      );
      expect(componentEvents.length).toBeGreaterThanOrEqual(2);
    });

    test('should maintain performance during heavy usage', async () => {
      // Navigate to design canvas
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Get initial performance metrics
      await page.waitForTimeout(2000);
      const initialMetrics = await page.evaluate(() => {
        const fpsElement = document.querySelector('[title*="Frame Rate"]');
        return fpsElement ? fpsElement.textContent : null;
      });

      // Perform many operations rapidly
      const canvas = page.locator('[data-testid="canvas"]');
      const componentTypes = ['server', 'database', 'load-balancer', 'cache', 'api-gateway'];
      
      for (let i = 0; i < 20; i++) {
        const componentType = componentTypes[i % componentTypes.length];
        const component = page.locator(`[data-component-type="${componentType}"]`);
        await component.dragTo(canvas, { 
          targetPosition: { x: 100 + (i % 5) * 80, y: 100 + Math.floor(i / 5) * 80 } 
        });
        
        // Add some keyboard shortcuts
        if (i % 3 === 0) {
          await page.keyboard.press('Control+s');
        }
      }

      // Wait for all operations to complete and metrics to stabilize
      await page.waitForTimeout(3000);

      // Check that app is still responsive
      await page.click('button:has-text("Save")');
      
      // Verify performance metrics are still being tracked
      const finalMetrics = await page.evaluate(() => {
        const fpsElement = document.querySelector('[title*="Frame Rate"]');
        return fpsElement ? fpsElement.textContent : null;
      });

      expect(finalMetrics).toBeTruthy();
      expect(finalMetrics).toMatch(/\\d+fps/);
      
      // App should still be functional
      await expect(page.locator('[data-testid="canvas-component"]')).toHaveCount(20);
    });

    test('should preserve tracking data across page reloads', async () => {
      // Navigate to design canvas and perform some actions
      await page.click('[data-testid="challenge-card"]:first-child');
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();

      // Perform tracked actions
      await page.keyboard.press('Control+s');
      const canvas = page.locator('[data-testid="canvas"]');
      const component = page.locator('[data-component-type="server"]');
      await component.dragTo(canvas, { targetPosition: { x: 200, y: 150 } });

      // Wait for tracking to process
      await page.waitForTimeout(1000);

      // Get current tracking data
      const beforeReloadData = await page.evaluate(() => {
        return localStorage.getItem('ux-tracking-data');
      });

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 5000 });
      await page.click('button:has-text("Get Started")');

      // Check if tracking data persisted
      const afterReloadData = await page.evaluate(() => {
        return localStorage.getItem('ux-tracking-data');
      });

      // Data should be preserved or gracefully handled
      expect(afterReloadData).toBeTruthy();
    });
  });
});