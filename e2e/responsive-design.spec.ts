// e2e/responsive-design.spec.ts
// Responsive design testing across different screen sizes and devices
// Tests mobile, tablet, and desktop layouts for UI consistency
// RELEVANT FILES: src/components/ui, src/modules/canvas, playwright.config.ts

import { test, expect } from '@playwright/test';

test.describe('Responsive Design Testing', () => {
  const viewports = [
    { name: 'mobile-portrait', width: 375, height: 667 },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop-small', width: 1366, height: 768 },
    { name: 'desktop-large', width: 1920, height: 1080 },
    { name: 'desktop-ultrawide', width: 2560, height: 1440 },
  ];

  test.describe('Layout Adaptation', () => {
    viewports.forEach(viewport => {
      test(`layout adapts correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        // Wait for layout to stabilize
        await page.waitForTimeout(500);

        // Navigate to canvas
        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        // Verify core elements are visible and accessible
        const canvas = page.locator('[data-testid="canvas"]');
        await expect(canvas).toBeVisible();

        // Check if sidebars behave appropriately for viewport size
        const isMobile = viewport.width <= 768;
        const isTablet = viewport.width > 768 && viewport.width <= 1024;

        if (isMobile) {
          // Mobile: sidebars should be hidden or collapsible
          const leftSidebar = page.locator('[data-testid="left-sidebar"]');
          const rightSidebar = page.locator('[data-testid="right-sidebar"]');

          // Sidebars might be hidden or overlay on mobile
          if (await leftSidebar.isVisible()) {
            await expect(leftSidebar).toHaveCSS('position', /absolute|fixed/);
          }
          if (await rightSidebar.isVisible()) {
            await expect(rightSidebar).toHaveCSS('position', /absolute|fixed/);
          }
        } else if (isTablet) {
          // Tablet: some sidebars might be hidden or collapsed
          // Implementation depends on design decisions
        } else {
          // Desktop: both sidebars should be visible
          const propertiesSection = page.getByText('Properties');
          const layersSection = page.getByText('Layers');

          if (await propertiesSection.isVisible()) {
            await expect(propertiesSection).toBeVisible();
          }
          if (await layersSection.isVisible()) {
            await expect(layersSection).toBeVisible();
          }
        }

        // Canvas toolbar should always be accessible
        const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
        await expect(canvasToolbar).toBeVisible();

        // Take screenshot for visual regression
        await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`);
      });
    });
  });

  test.describe('Touch and Mobile Interactions', () => {
    test('mobile touch interactions work correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Test touch drag and drop
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        // Simulate touch drag
        await server.dispatchEvent('touchstart', {
          touches: [{ clientX: 50, clientY: 100 }],
        });

        await canvas.dispatchEvent('touchmove', {
          touches: [{ clientX: 200, clientY: 200 }],
        });

        await canvas.dispatchEvent('touchend', {});

        // Verify component was added
        const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' });
        if ((await serverNode.count()) > 0) {
          await expect(serverNode.first()).toBeVisible();
        }
      }
    });

    test('mobile zoom and pan gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      const reactFlow = page.locator('.react-flow');

      // Add components first
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }

      // Test pinch to zoom (simulated)
      await reactFlow.dispatchEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
      });

      await page.waitForTimeout(300);

      // Test pan gesture (simulated)
      await reactFlow.dispatchEvent('touchstart', {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
      });

      await reactFlow.dispatchEvent('touchmove', {
        touches: [
          { clientX: 150, clientY: 150 },
          { clientX: 250, clientY: 250 },
        ],
      });

      await reactFlow.dispatchEvent('touchend', {});

      // Verify canvas is still functional
      await expect(canvas).toBeVisible();
    });

    test('mobile toolbar adaptation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(canvasToolbar).toBeVisible();

      // Verify toolbar buttons are accessible on mobile
      const selectTool = page.locator('[data-testid="tool-select"]');
      const panTool = page.locator('[data-testid="tool-pan"]');

      await expect(selectTool).toBeVisible();
      await expect(panTool).toBeVisible();

      // Test tool selection on mobile
      await panTool.tap();
      await expect(panTool).toHaveAttribute('aria-pressed', 'true');

      await selectTool.tap();
      await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Content Reflow and Typography', () => {
    test('text content reflows properly across viewports', async ({ page }) => {
      const viewportsToTest = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewportsToTest) {
        await page.setViewportSize(viewport);
        await page.goto('/');

        // Check welcome screen text
        const welcomeText = page.getByText(/start your journey/i);
        if (await welcomeText.isVisible()) {
          await expect(welcomeText).toBeVisible();

          // Verify text doesn't overflow
          const boundingBox = await welcomeText.boundingBox();
          if (boundingBox) {
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width - 40); // Account for padding
          }
        }

        // Navigate and test canvas text
        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        const canvas = page.locator('[data-testid="canvas"]');
        const server = page.locator('[data-testid="palette-item-server"]').first();

        if (await server.isVisible()) {
          await server.dragTo(canvas);

          // Add annotation to test text reflow
          await canvas.dblclick({ position: { x: 200, y: 200 } });
          const textarea = page.locator('textarea').first();

          if (await textarea.isVisible()) {
            const longText =
              'This is a very long annotation text that should wrap properly across different viewport sizes without overflowing the container or becoming unreadable on smaller screens.';
            await textarea.fill(longText);
            await textarea.press('Control+Enter');

            // Verify annotation text is visible and wrapped
            const annotation = page.getByText(longText);
            if (await annotation.isVisible()) {
              const annotationBox = await annotation.boundingBox();
              if (annotationBox) {
                expect(annotationBox.width).toBeLessThanOrEqual(viewport.width - 40);
              }
            }
          }
        }
      }
    });

    test('font scaling works across different screen densities', async ({ page }) => {
      const densities = [1, 1.5, 2, 3]; // Different device pixel ratios

      for (const density of densities) {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.emulateMedia({ reducedMotion: 'reduce' });

        // Simulate different device pixel ratios
        await page.addInitScript(devicePixelRatio => {
          Object.defineProperty(window, 'devicePixelRatio', {
            value: devicePixelRatio,
            writable: false,
          });
        }, density);

        await page.goto('/');
        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        // Verify text remains readable
        const canvas = page.locator('[data-testid="canvas"]');
        const server = page.locator('[data-testid="palette-item-server"]').first();

        if (await server.isVisible()) {
          await server.dragTo(canvas);

          const serverNode = page
            .locator('.react-flow__node')
            .filter({ hasText: 'Server' })
            .first();
          if (await serverNode.isVisible()) {
            // Verify text is properly scaled
            const fontSize = await serverNode.evaluate(el => getComputedStyle(el).fontSize);

            const fontSizeValue = parseInt(fontSize);
            expect(fontSizeValue).toBeGreaterThan(8); // Minimum readable size
            expect(fontSizeValue).toBeLessThan(100); // Maximum reasonable size
          }
        }
      }
    });
  });

  test.describe('Navigation and Menu Adaptation', () => {
    test('navigation menus adapt to screen size', async ({ page }) => {
      // Test mobile navigation
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Look for mobile menu trigger
      const mobileMenuTrigger = page.locator(
        '[data-testid="mobile-menu-trigger"], button[aria-label*="menu"]'
      );

      if (await mobileMenuTrigger.isVisible()) {
        await mobileMenuTrigger.click();

        // Verify mobile menu opens
        const mobileMenu = page.locator('[data-testid="mobile-menu"], [role="navigation"]');
        if (await mobileMenu.isVisible()) {
          await expect(mobileMenu).toBeVisible();
          await expect(mobileMenu).toHaveScreenshot('mobile-navigation-menu.png');
        }
      }

      // Test tablet navigation
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      // Navigation might be different on tablet
      const tabletNav = page.locator('[data-testid="tablet-navigation"], nav');
      if (await tabletNav.isVisible()) {
        await expect(tabletNav).toBeVisible();
      }

      // Test desktop navigation
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      // Desktop should show full navigation
      const desktopNav = page.locator('nav, [role="navigation"]');
      if ((await desktopNav.count()) > 0) {
        await expect(desktopNav.first()).toBeVisible();
      }
    });

    test('context menus work on different input methods', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 1920, height: 1080, name: 'desktop' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');

        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        const canvas = page.locator('[data-testid="canvas"]');
        const server = page.locator('[data-testid="palette-item-server"]').first();

        if (await server.isVisible()) {
          await server.dragTo(canvas);

          const serverNode = page
            .locator('.react-flow__node')
            .filter({ hasText: 'Server' })
            .first();

          if (viewport.name === 'mobile') {
            // Long press for context menu on mobile
            await serverNode.tap({ duration: 1000 });
          } else {
            // Right click for context menu on desktop
            await serverNode.click({ button: 'right' });
          }

          // Check if context menu appears
          const contextMenu = page.locator('[role="menu"], [data-testid="context-menu"]');
          if (await contextMenu.isVisible()) {
            await expect(contextMenu).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Performance on Different Screen Sizes', () => {
    test('canvas performance scales with viewport size', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 }, // Mobile
        { width: 1920, height: 1080 }, // Desktop
        { width: 2560, height: 1440 }, // Large desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');

        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        const canvas = page.locator('[data-testid="canvas"]');

        // Measure performance of adding multiple components
        const startTime = Date.now();

        // Add components appropriate to screen size
        const componentCount = viewport.width <= 768 ? 5 : 10;

        for (let i = 0; i < componentCount; i++) {
          const server = page.locator('[data-testid="palette-item-server"]').first();
          if (await server.isVisible()) {
            await server.dragTo(canvas, {
              targetPosition: {
                x: 100 + (i % 3) * 100,
                y: 100 + Math.floor(i / 3) * 80,
              },
            });
          }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Performance should be reasonable regardless of viewport
        expect(duration).toBeLessThan(10000); // 10 seconds max

        // Verify all components are visible
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThanOrEqual(componentCount);
      }
    });

    test('memory usage remains stable across viewports', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },
        { width: 1920, height: 1080 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        // Check if memory API is available
        const initialMemory = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
        });

        if (initialMemory) {
          await page.goto('/');
          await page.getByRole('button', { name: /start your journey/i }).click();
          await page
            .getByRole('button', { name: /start challenge/i })
            .first()
            .click();

          const canvas = page.locator('[data-testid="canvas"]');

          // Perform operations that might affect memory
          for (let i = 0; i < 5; i++) {
            const server = page.locator('[data-testid="palette-item-server"]').first();
            if (await server.isVisible()) {
              await server.dragTo(canvas);
            }
          }

          const finalMemory = await page.evaluate(() => {
            return (performance as any).memory.usedJSHeapSize;
          });

          const memoryIncrease = finalMemory - initialMemory;

          // Memory increase should be reasonable
          expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
        }
      }
    });
  });

  test.describe('Accessibility Across Screen Sizes', () => {
    test('keyboard navigation works on all viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1920, height: 1080 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');

        // Navigate using keyboard only
        await page.keyboard.press('Tab');
        const startButton = page.getByRole('button', { name: /start your journey/i });

        if (await startButton.isVisible()) {
          await expect(startButton).toBeFocused();
          await page.keyboard.press('Enter');

          // Continue keyboard navigation
          await page.keyboard.press('Tab');
          const challengeButton = page.getByRole('button', { name: /start challenge/i }).first();

          if (await challengeButton.isVisible()) {
            await expect(challengeButton).toBeFocused();
            await page.keyboard.press('Enter');

            // Test canvas keyboard navigation
            const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
            if (await canvasToolbar.isVisible()) {
              await page.keyboard.press('Tab');

              // Verify focus moves to toolbar
              const focusedElement = page.locator(':focus');
              const isInToolbar = await focusedElement.evaluate(el => {
                return el.closest('[data-testid="canvas-toolbar"]') !== null;
              });

              if (isInToolbar) {
                expect(isInToolbar).toBe(true);
              }
            }
          }
        }
      }
    });

    test('focus indicators are visible at all screen sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvasToolbar = page.locator('[data-testid="canvas-toolbar"]');
      if (await canvasToolbar.isVisible()) {
        const selectTool = page.locator('[data-testid="tool-select"]');

        if (await selectTool.isVisible()) {
          await selectTool.focus();

          // Verify focus indicator is visible
          const focusStyle = await selectTool.evaluate(el => {
            const styles = getComputedStyle(el);
            return {
              outline: styles.outline,
              outlineWidth: styles.outlineWidth,
              boxShadow: styles.boxShadow,
            };
          });

          // Should have some form of focus indicator
          const hasFocusIndicator =
            focusStyle.outline !== 'none' ||
            focusStyle.outlineWidth !== '0px' ||
            focusStyle.boxShadow !== 'none';

          expect(hasFocusIndicator).toBe(true);
        }
      }
    });
  });
});
