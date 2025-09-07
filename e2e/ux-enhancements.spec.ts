import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Tests for UX Enhancement Features
 * 
 * This test suite comprehensively validates all the new UX enhancement features
 * including contextual help, onboarding, shortcut learning, workflow optimization,
 * and accessibility improvements.
 */

test.describe('UX Enhancements - Comprehensive Testing', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Start fresh for each test
    await page.goto('/');
    
    // Clear any stored onboarding/settings state
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('Contextual Help System', () => {
    test('should display contextual help for UI elements', async () => {
      // Skip welcome screen
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      
      // Navigate to design canvas
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      // Wait for canvas to load
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Test help for save button
      const saveButton = page.locator('[data-help-target="design-canvas-save"]');
      await saveButton.hover();
      
      // Check that tooltip appears with contextual help
      await expect(page.locator('role=tooltip')).toContainText('Save current design progress');
      
      // Test help for performance mode button
      const performanceButton = page.locator('[data-help-target="design-canvas-performance"]');
      await performanceButton.hover();
      
      await expect(page.locator('role=tooltip')).toContainText('Enable performance mode');
      
      // Test contextual help registration
      await page.evaluate(() => {
        const helpSystem = (window as any).contextualHelpSystem;
        if (helpSystem) {
          helpSystem.showHelp('design-canvas-save');
        }
      });
      
      // Verify help content is displayed
      await expect(page.locator('role=tooltip')).toBeVisible();
    });

    test('should handle keyboard navigation in help system', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Test keyboard activation of tooltips
      await page.keyboard.press('Tab'); // Navigate to first focusable element
      await page.keyboard.press('Enter'); // Activate tooltip
      
      // Test escape key to close help
      await page.keyboard.press('Escape');
      await expect(page.locator('role=tooltip')).not.toBeVisible();
    });

    test('should adapt help content based on user skill level', async () => {
      // Set user skill level through onboarding
      await page.click('text=Start Your Journey');
      await page.click('text=Beginner');
      await page.click('text=Quick Start');
      await page.click('text=Begin Learning Journey');
      
      // Skip through onboarding
      await page.keyboard.press('Escape');
      
      // Navigate to canvas and check help content adaptation
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Verify that basic-level help content is shown for beginners
      const hintsButton = page.locator('[data-help-target="design-canvas-hints"]');
      await hintsButton.hover();
      
      await expect(page.locator('role=tooltip')).toContainText('architectural guidance');
    });
  });

  test.describe('Progressive Onboarding System', () => {
    test('should complete full onboarding flow', async () => {
      // Test welcome screen with skill assessment
      await expect(page.locator('text=Start Your Journey')).toBeVisible();
      
      await page.click('text=Start Your Journey');
      
      // Test skill level selection
      await expect(page.locator('text=What\'s your experience level')).toBeVisible();
      await page.click('text=Intermediate');
      
      // Test accessibility preferences
      await page.click('input[type="checkbox"] + span:text("Reduce motion")');
      await page.click('input[type="checkbox"] + span:text("High contrast")');
      
      // Select onboarding flow
      await page.click('text=Complete Tour');
      
      // Begin onboarding
      await page.click('text=Begin Learning Journey');
      
      // Test onboarding overlay appears
      await expect(page.locator('role=dialog[aria-modal="true"]')).toBeVisible();
      
      // Navigate through onboarding steps
      await page.click('text=Next');
      await expect(page.locator('text=Design Canvas')).toBeVisible();
      
      await page.click('text=Next');
      await expect(page.locator('text=Component Palette')).toBeVisible();
      
      // Complete onboarding
      await page.click('text=Complete');
      
      // Verify onboarding completed and main app is accessible
      await expect(page.locator('[data-testid="design-canvas"]')).toBeVisible();
    });

    test('should allow skipping onboarding', async () => {
      await page.click('text=Start Your Journey');
      await page.click('text=Skip Onboarding');
      
      // Should go directly to challenge selection
      await expect(page.locator('text=Select Challenge')).toBeVisible();
    });

    test('should persist and resume onboarding progress', async () => {
      // Start onboarding
      await page.click('text=Start Your Journey');
      await page.click('text=Intermediate');
      await page.click('text=Complete Tour');
      await page.click('text=Begin Learning Journey');
      
      // Go through first step
      await page.click('text=Next');
      
      // Simulate page refresh
      await page.reload();
      
      // Should resume from where left off
      await expect(page.locator('role=dialog[aria-modal="true"]')).toBeVisible();
      await expect(page.locator('text=Design Canvas')).toBeVisible();
    });

    test('should handle responsive onboarding on different screen sizes', async () => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('text=Start Your Journey');
      await page.click('text=Intermediate');
      await page.click('text=Complete Tour');
      await page.click('text=Begin Learning Journey');
      
      // Verify onboarding adapts to mobile
      const tooltip = page.locator('role=dialog[aria-modal="true"]');
      await expect(tooltip).toBeVisible();
      
      // Check that tooltip positioning works on mobile
      const tooltipBox = await tooltip.boundingBox();
      expect(tooltipBox?.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBox?.y).toBeGreaterThanOrEqual(0);
      
      // Test on desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Continue onboarding and verify positioning
      await page.click('text=Next');
      const desktopTooltip = page.locator('role=dialog[aria-modal="true"]');
      await expect(desktopTooltip).toBeVisible();
    });
  });

  test.describe('Shortcut Learning and Customization', () => {
    test('should track shortcut usage and provide learning recommendations', async () => {
      // Skip to design canvas
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Use keyboard shortcut multiple times
      await page.keyboard.press('Control+s'); // Save shortcut
      await page.keyboard.press('Control+s');
      await page.keyboard.press('Control+s');
      
      // Perform manual action that has shortcut available
      await page.click('[data-help-target="design-canvas-save"]');
      await page.click('[data-help-target="design-canvas-save"]');
      
      // Open shortcut customization panel
      await page.keyboard.press('Control+Shift+h');
      
      // Verify shortcut customization panel opens
      await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
      await expect(page.locator('text=Show Analytics')).toBeVisible();
      
      // Check analytics show usage data
      await page.click('text=Show Analytics');
      await expect(page.locator('text=Shortcuts Used')).toBeVisible();
      await expect(page.locator('text=Time Saved')).toBeVisible();
    });

    test('should allow customizing keyboard shortcuts', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Open shortcut customization
      await page.keyboard.press('Control+Shift+h');
      
      // Find a shortcut to edit
      const editButton = page.locator('text=Edit').first();
      await editButton.click();
      
      // Test key recording
      await expect(page.locator('text=Press keys...')).toBeVisible();
      
      // Record new key combination
      await page.keyboard.press('Control+Shift+s');
      
      // Save the new shortcut
      await page.click('text=Save');
      
      // Verify shortcut was updated
      await expect(page.locator('text=Ctrl+Shift+S')).toBeVisible();
      
      // Test conflict detection
      const anotherEditButton = page.locator('text=Edit').nth(1);
      await anotherEditButton.click();
      
      // Try to use the same combination
      await page.keyboard.press('Control+Shift+s');
      
      // Should show conflict warning
      await expect(page.locator('text=Conflicts with')).toBeVisible();
    });

    test('should export and import shortcut configurations', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Open shortcut customization
      await page.keyboard.press('Control+Shift+h');
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Export shortcuts
      await page.click('text=Export');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('shortcuts');
      
      // Test import (would require file upload simulation)
      await expect(page.locator('text=Import')).toBeVisible();
    });
  });

  test.describe('Workflow Optimization', () => {
    test('should track workflow patterns and provide optimization suggestions', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Perform a workflow sequence multiple times
      for (let i = 0; i < 3; i++) {
        // Add component → Save → Export pattern
        await page.click('[data-testid="component-palette"] >> text=Server');
        await page.click('[data-testid="design-canvas"]', { position: { x: 100 + i * 50, y: 100 + i * 50 } });
        await page.keyboard.press('Control+s');
        await page.keyboard.press('Control+e');
      }
      
      // Check if workflow optimization suggestions appear
      // (These would typically appear as toast notifications or in a recommendations panel)
      await expect(page.locator('text=Workflow Optimization').or(page.locator('text=Shortcut Recommendation'))).toBeVisible({ timeout: 10000 });
    });

    test('should identify user struggle points and provide help', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Simulate struggle by repeatedly failing at an action
      for (let i = 0; i < 3; i++) {
        // Try to delete without selection (should fail)
        await page.keyboard.press('Delete');
      }
      
      // Should show help suggestion
      await expect(page.locator('text=Help with').or(page.locator('text=Tip:'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Accessibility Improvements', () => {
    test('should support keyboard navigation throughout the application', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      
      // Test keyboard navigation on challenge selection
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Select first challenge
      
      await page.click('text=Start Design');
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Test toolbar keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test keyboard shortcuts work
      await page.keyboard.press('Control+s');
      // Should trigger save action
      
      await page.keyboard.press('?'); // Toggle hints
      await expect(page.locator('text=Solution hints')).toBeVisible();
    });

    test('should respect reduced motion preferences', async () => {
      // Set reduced motion preference
      await page.click('text=Start Your Journey');
      await page.click('text=Intermediate');
      await page.click('input[type="checkbox"] + span:text("Reduce motion")');
      await page.click('text=Quick Start');
      await page.click('text=Begin Learning Journey');
      
      // Verify animations are reduced
      const onboardingDialog = page.locator('role=dialog[aria-modal="true"]');
      await expect(onboardingDialog).toBeVisible();
      
      // Check CSS property for reduced motion
      const motionReduced = await page.evaluate(() => {
        return document.documentElement.style.getPropertyValue('--motion-reduce') === 'reduce';
      });
      expect(motionReduced).toBe(true);
    });

    test('should support high contrast mode', async () => {
      await page.click('text=Start Your Journey');
      await page.click('text=Intermediate');
      await page.click('input[type="checkbox"] + span:text("High contrast")');
      await page.click('text=Quick Start');
      await page.click('text=Begin Learning Journey');
      
      // Skip onboarding
      await page.keyboard.press('Escape');
      
      // Verify high contrast class is applied
      const hasHighContrast = await page.locator('html.high-contrast').isVisible();
      expect(hasHighContrast).toBe(true);
    });

    test('should provide proper ARIA labels and screen reader support', async () => {
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Check ARIA labels on key elements
      await expect(page.locator('[aria-label="Return to challenge selection"]')).toBeVisible();
      await expect(page.locator('[aria-label="Save design progress"]')).toBeVisible();
      await expect(page.locator('[role="toolbar"]')).toBeVisible();
      await expect(page.locator('[role="main"]')).toBeVisible();
      
      // Check live regions for dynamic content
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // Test that interactive elements have proper focus indicators
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveCSS('outline-style', 'solid');
    });

    test('should handle focus management in modal dialogs', async () => {
      await page.click('text=Start Your Journey');
      await page.click('text=Intermediate');
      await page.click('text=Complete Tour');
      await page.click('text=Begin Learning Journey');
      
      // Check that focus moves to modal when opened
      const modal = page.locator('role=dialog[aria-modal="true"]');
      await expect(modal).toBeVisible();
      
      // Check that first focusable element in modal is focused
      const firstFocusable = modal.locator('button').first();
      await expect(firstFocusable).toBeFocused();
      
      // Test focus trapping within modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      const isWithinModal = await focusedElement.locator('..').locator('role=dialog').count() > 0;
      expect(isWithinModal).toBe(true);
      
      // Test escape key closes modal and restores focus
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Integration Tests', () => {
    test('should coordinate between different UX systems without conflicts', async () => {
      // Test that onboarding, contextual help, and shortcuts work together
      await page.click('text=Start Your Journey');
      await page.click('text=Advanced');
      await page.click('text=Complete Tour');
      await page.click('text=Begin Learning Journey');
      
      // During onboarding, shortcuts should be temporarily disabled
      await page.keyboard.press('Control+k'); // Should not open command palette
      await expect(page.locator('text=Command Palette')).not.toBeVisible();
      
      // Complete onboarding
      await page.click('text=Skip');
      
      // After onboarding, shortcuts should work
      await page.keyboard.press('Control+k');
      await expect(page.locator('text=Command Palette')).toBeVisible();
      
      // Close command palette
      await page.keyboard.press('Escape');
      
      // Navigate to canvas
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Test that contextual help and shortcut learning work together
      await page.hover('[data-help-target="design-canvas-save"]');
      await expect(page.locator('role=tooltip')).toContainText('Ctrl+S');
      
      // Use the shortcut and verify it's tracked
      await page.keyboard.press('Control+s');
      
      // Open shortcut panel to verify usage was tracked
      await page.keyboard.press('Control+Shift+h');
      await page.click('text=Show Analytics');
      await expect(page.locator('text=1').or(page.locator('text=saves'))).toBeVisible();
    });

    test('should maintain performance with all UX enhancements enabled', async () => {
      // Enable all features
      await page.click('text=Start Your Journey');
      await page.click('text=Advanced');
      await page.click('text=Complete Tour');
      await page.click('text=Begin Learning Journey');
      
      // Skip onboarding
      await page.keyboard.press('Escape');
      
      // Navigate to canvas with large design
      await page.click('text=Select Challenge');
      await page.click('text=Design a Large Scale System'); // Assuming this exists
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Add many components to test performance
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="component-palette"] >> text=Server');
        await page.click('[data-testid="design-canvas"]', { 
          position: { x: 100 + (i % 5) * 100, y: 100 + Math.floor(i / 5) * 100 } 
        });
      }
      
      // Enable performance mode
      await page.click('text=Performance Mode');
      await expect(page.locator('text=Performance On')).toBeVisible();
      
      // Test that interface remains responsive
      const startTime = Date.now();
      await page.click('[data-help-target="design-canvas-save"]');
      const responseTime = Date.now() - startTime;
      
      // Should respond within reasonable time even with many components
      expect(responseTime).toBeLessThan(1000);
    });

    test('should handle cleanup and memory management properly', async () => {
      // Test that event listeners and observers are properly cleaned up
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Navigate away and back
      await page.click('text=Back');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Check that UX systems still work after navigation
      await page.hover('[data-help-target="design-canvas-save"]');
      await expect(page.locator('role=tooltip')).toBeVisible();
      
      await page.keyboard.press('Control+s');
      // Should still work without memory leaks
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should gracefully handle UX system failures', async () => {
      // Simulate localStorage being unavailable
      await page.addInitScript(() => {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = () => {
          throw new Error('Storage unavailable');
        };
      });
      
      await page.click('text=Skip Onboarding');
      await page.click('text=Select Challenge');
      await page.click('text=Design a Chat Application');
      await page.click('text=Start Design');
      
      // App should still function even if storage fails
      await page.waitForSelector('[data-testid="design-canvas"]');
      
      // Basic functionality should work
      await page.keyboard.press('Control+s');
      await expect(page.locator('[data-testid="design-canvas"]')).toBeVisible();
    });

    test('should handle missing target elements in onboarding', async () => {
      // Mock an onboarding flow with invalid selectors
      await page.addInitScript(() => {
        (window as any).mockInvalidOnboarding = true;
      });
      
      await page.click('text=Start Your Journey');
      await page.click('text=Intermediate');
      await page.click('text=Complete Tour');
      await page.click('text=Begin Learning Journey');
      
      // Should handle missing elements gracefully
      await expect(page.locator('role=dialog')).toBeVisible();
      
      // Should skip steps with missing elements
      await page.click('text=Next');
      // Should not crash or get stuck
    });

    test('should validate settings and handle corrupted data', async () => {
      // Add corrupted settings to localStorage
      await page.addInitScript(() => {
        localStorage.setItem('archicomm_settings', 'invalid json{');
        localStorage.setItem('archicomm_onboarding_progress', '{broken}');
        localStorage.setItem('archicomm_shortcut_metrics', 'corrupted');
      });
      
      await page.goto('/');
      
      // Should use defaults when data is corrupted
      await expect(page.locator('text=Start Your Journey')).toBeVisible();
      
      // Should allow normal operation
      await page.click('text=Skip Onboarding');
      await expect(page.locator('text=Select Challenge')).toBeVisible();
    });
  });

  test.afterEach(async () => {
    // Clean up any test data
    await page.evaluate(() => {
      localStorage.clear();
    });
  });
});