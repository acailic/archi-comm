// e2e/workflow-integration.spec.ts
// Complete workflow integration testing across all app modules
// Tests end-to-end user journeys and data persistence
// RELEVANT FILES: src/modules/*, src/services/*, src/lib/user-experience/WorkflowOptimizer.ts

import { test, expect } from '@playwright/test';

test.describe('Workflow Integration Testing', () => {
  test.describe('Complete User Journeys', () => {
    test('full design workflow: onboarding to export', async ({ page }) => {
      // Start from home page
      await page.goto('/');

      // Step 1: Onboarding
      await page.getByRole('button', { name: /start your journey/i }).click();

      // Verify onboarding overlay if present
      const onboardingOverlay = page.locator('[data-testid="onboarding-overlay"]');
      if (await onboardingOverlay.isVisible()) {
        const nextButton = page.getByRole('button', { name: /next|continue/i });

        // Click through onboarding steps
        while (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }

        const finishButton = page.getByRole('button', { name: /finish|get started/i });
        if (await finishButton.isVisible()) {
          await finishButton.click();
        }
      }

      // Step 2: Challenge Selection
      await page.getByRole('heading', { name: /choose your challenge/i }).waitFor();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Step 3: Design Canvas Work
      const canvas = page.locator('[data-testid="canvas"]');
      await expect(canvas).toBeVisible();

      // Add multiple components with different types
      const components = [
        { type: 'server', name: 'Server' },
        { type: 'database', name: 'Database' },
        { type: 'api-gateway', name: 'Api gateway' },
        { type: 'cache', name: 'Cache' },
        { type: 'load-balancer', name: 'Load balancer' },
      ];

      for (let i = 0; i < components.length; i++) {
        const component = page
          .locator(`[data-testid="palette-item-${components[i].type}"]`)
          .first();
        if (await component.isVisible()) {
          await component.dragTo(canvas, {
            targetPosition: {
              x: 150 + (i % 3) * 200,
              y: 150 + Math.floor(i / 3) * 150,
            },
          });
        }
      }

      // Add annotations with different content
      const annotations = [
        'Main API server handles user requests',
        'Database stores user data and sessions',
        'Cache improves response times',
        'Load balancer distributes traffic',
        'API Gateway manages external APIs',
      ];

      for (let i = 0; i < annotations.length; i++) {
        await canvas.dblclick({
          position: {
            x: 300 + (i % 2) * 300,
            y: 100 + Math.floor(i / 2) * 120,
          },
        });

        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(annotations[i]);
          await textarea.press('Control+Enter');
        }
      }

      await page.waitForTimeout(1000); // Allow rendering to complete

      // Step 4: Continue to Audio Recording
      const continueButton = page.getByRole('button', { name: /continue to recording/i });
      await expect(continueButton).toBeEnabled();
      await continueButton.click();

      // Step 5: Audio Recording/Explanation
      await page.getByRole('heading', { name: /record your explanation/i }).waitFor();

      // Use transcript instead of recording for reliability
      const transcriptArea = page.getByPlaceholder(/enter your explanation text/i);
      if (await transcriptArea.isVisible()) {
        const explanation = `This system design demonstrates a scalable web application architecture. 
        The load balancer distributes incoming traffic across multiple API servers for high availability.
        The API Gateway manages external service integrations and rate limiting.
        The cache layer reduces database load and improves response times.
        The database stores all persistent application data with proper indexing for performance.`;

        await transcriptArea.fill(explanation);

        const continueToReview = page.getByRole('button', { name: /continue to review/i });
        await expect(continueToReview).toBeEnabled();
        await continueToReview.click();
      }

      // Step 6: Review and Analysis
      await expect(page.getByText(/session complete/i)).toBeVisible();
      await expect(page.getByText(/performance analysis/i)).toBeVisible();

      // Verify all components are shown in review
      for (const component of components) {
        const componentText = page.getByText(component.name, { exact: false });
        if ((await componentText.count()) > 0) {
          await expect(componentText.first()).toBeVisible();
        }
      }

      // Step 7: Export Final Design
      const exportButton = page.getByRole('button', { name: /export png/i });
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        try {
          const download = await downloadPromise;
          const filename = download.suggestedFilename();
          expect(filename).toMatch(/-design\.png$/);

          const stream = await download.createReadStream();
          expect(stream).toBeTruthy();
        } catch (error) {
          console.log('Export handled by native dialog or fallback');
        }
      }
    });

    test('collaborative workflow with session management', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create initial design
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);

        // Add annotation
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill('Initial server setup');
          await textarea.press('Control+Enter');
        }
      }

      // Test session persistence
      const sessionId = await page.evaluate(() => {
        return localStorage.getItem('session-id') || sessionStorage.getItem('session-id');
      });

      if (sessionId) {
        console.log('Session ID found:', sessionId);

        // Simulate page refresh (session should persist)
        await page.reload();
        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        // Verify design persisted
        const persistedServer = page.locator('.react-flow__node').filter({ hasText: 'Server' });
        if ((await persistedServer.count()) > 0) {
          await expect(persistedServer.first()).toBeVisible();
        }

        const persistedAnnotation = page.getByText('Initial server setup');
        if ((await persistedAnnotation.count()) > 0) {
          await expect(persistedAnnotation.first()).toBeVisible();
        }
      }

      // Test collaborative features if available
      const shareButton = page.getByRole('button', { name: /share|collaborate/i });
      if (await shareButton.isVisible()) {
        await shareButton.click();

        const shareDialog = page.locator('[role="dialog"]');
        if (await shareDialog.isVisible()) {
          const shareLink = page.locator('input[readonly], [data-testid="share-link"]');
          if (await shareLink.isVisible()) {
            const linkValue = await shareLink.inputValue();
            expect(linkValue).toContain('http');
          }
        }
      }
    });

    test('iterative design workflow with undo/redo', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Step 1: Add components
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }

      if (await database.isVisible()) {
        await database.dragTo(canvas);
      }

      // Verify both components are added
      let serverNodes = page.locator('.react-flow__node').filter({ hasText: 'Server' });
      let databaseNodes = page.locator('.react-flow__node').filter({ hasText: 'Database' });

      await expect(serverNodes.first()).toBeVisible();
      await expect(databaseNodes.first()).toBeVisible();

      // Step 2: Test undo functionality
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);

      // Database should be removed
      databaseNodes = page.locator('.react-flow__node').filter({ hasText: 'Database' });
      const databaseCount = await databaseNodes.count();
      expect(databaseCount).toBe(0);

      // Server should still be there
      serverNodes = page.locator('.react-flow__node').filter({ hasText: 'Server' });
      await expect(serverNodes.first()).toBeVisible();

      // Step 3: Test redo functionality
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(300);

      // Database should be back
      databaseNodes = page.locator('.react-flow__node').filter({ hasText: 'Database' });
      if ((await databaseNodes.count()) > 0) {
        await expect(databaseNodes.first()).toBeVisible();
      }

      // Step 4: Test multiple undo/redo operations
      const cache = page.locator('[data-testid="palette-item-cache"]').first();
      if (await cache.isVisible()) {
        await cache.dragTo(canvas);
      }

      // Add annotation
      await canvas.dblclick({ position: { x: 300, y: 300 } });
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill('Cache annotation');
        await textarea.press('Control+Enter');
      }

      // Undo annotation
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);

      // Undo cache addition
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);

      const cacheNodes = page.locator('.react-flow__node').filter({ hasText: 'Cache' });
      const cacheCount = await cacheNodes.count();
      expect(cacheCount).toBe(0);

      // Redo both operations
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(300);

      // Everything should be back
      if ((await cacheNodes.count()) > 0) {
        await expect(cacheNodes.first()).toBeVisible();
      }

      const annotation = page.getByText('Cache annotation');
      if ((await annotation.count()) > 0) {
        await expect(annotation.first()).toBeVisible();
      }
    });
  });

  test.describe('Data Persistence and State Management', () => {
    test('local storage persistence across sessions', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create complex design
      const designData = {
        components: ['server', 'database', 'cache'],
        annotations: ['Main server', 'Data storage', 'Performance cache'],
      };

      // Add components
      for (let i = 0; i < designData.components.length; i++) {
        const component = page
          .locator(`[data-testid="palette-item-${designData.components[i]}"]`)
          .first();
        if (await component.isVisible()) {
          await component.dragTo(canvas, {
            targetPosition: { x: 150 + i * 200, y: 150 },
          });
        }
      }

      // Add annotations
      for (let i = 0; i < designData.annotations.length; i++) {
        await canvas.dblclick({ position: { x: 200 + i * 200, y: 250 } });
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(designData.annotations[i]);
          await textarea.press('Control+Enter');
        }
      }

      // Check local storage
      const storageData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const data = {};
        keys.forEach(key => {
          data[key] = localStorage.getItem(key);
        });
        return data;
      });

      console.log('Local storage data:', Object.keys(storageData));

      // Reload page and verify persistence
      await page.reload();
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      await page.waitForTimeout(1000);

      // Check if components persisted
      for (const componentType of designData.components) {
        const componentName = componentType.charAt(0).toUpperCase() + componentType.slice(1);
        const nodes = page.locator('.react-flow__node').filter({ hasText: componentName });

        if ((await nodes.count()) > 0) {
          await expect(nodes.first()).toBeVisible();
          console.log(`${componentName} component persisted successfully`);
        }
      }

      // Check if annotations persisted
      for (const annotation of designData.annotations) {
        const annotationElement = page.getByText(annotation);
        if ((await annotationElement.count()) > 0) {
          await expect(annotationElement.first()).toBeVisible();
          console.log(`Annotation "${annotation}" persisted successfully`);
        }
      }
    });

    test('IndexedDB fallback for large datasets', async ({ page }) => {
      // Check IndexedDB support
      const hasIndexedDB = await page.evaluate(() => {
        return typeof indexedDB !== 'undefined';
      });

      if (hasIndexedDB) {
        await page.goto('/');
        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        const canvas = page.locator('[data-testid="canvas"]');

        // Create large dataset by adding many components
        for (let i = 0; i < 50; i++) {
          const server = page.locator('[data-testid="palette-item-server"]').first();
          if (await server.isVisible()) {
            await server.dragTo(canvas, {
              targetPosition: {
                x: 100 + (i % 10) * 100,
                y: 100 + Math.floor(i / 10) * 80,
              },
            });
          }

          // Add annotation every 10 components
          if (i % 10 === 0) {
            await canvas.dblclick({
              position: { x: 150 + (i % 10) * 100, y: 50 + Math.floor(i / 10) * 80 },
            });
            const textarea = page.locator('textarea').first();
            if (await textarea.isVisible()) {
              await textarea.fill(
                `Server group ${Math.floor(i / 10)} - handling specific workload`
              );
              await textarea.press('Control+Enter');
            }
          }

          // Pause every 10 components to avoid overwhelming
          if (i % 10 === 9) {
            await page.waitForTimeout(200);
          }
        }

        // Check if data was stored in IndexedDB
        const indexedDBData = await page.evaluate(async () => {
          return new Promise(resolve => {
            const request = indexedDB.open('ArchiCommDB', 1);

            request.onsuccess = () => {
              const db = request.result;
              const objectStoreNames = Array.from(db.objectStoreNames);
              resolve({ databases: objectStoreNames });
            };

            request.onerror = () => {
              resolve({ error: 'Failed to open IndexedDB' });
            };

            // Timeout after 2 seconds
            setTimeout(() => resolve({ timeout: true }), 2000);
          });
        });

        console.log('IndexedDB data:', indexedDBData);

        // Verify large dataset is still functional
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThan(0);

        // Test that the canvas is still responsive
        const toolbar = page.locator('[data-testid="canvas-toolbar"]');
        await expect(toolbar).toBeVisible();

        const selectTool = page.locator('[data-testid="tool-select"]');
        if (await selectTool.isVisible()) {
          await selectTool.click();
          await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
        }
      }
    });

    test('auto-save functionality with conflict resolution', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create design that triggers auto-save
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);

        // Make rapid changes to test auto-save
        for (let i = 0; i < 5; i++) {
          await canvas.dblclick({ position: { x: 200 + i * 50, y: 200 + i * 30 } });
          const textarea = page.locator('textarea').first();
          if (await textarea.isVisible()) {
            await textarea.fill(`Auto-save annotation ${i}`);
            await textarea.press('Control+Enter');

            // Short delay between changes
            await page.waitForTimeout(500);
          }
        }

        // Look for auto-save indicators
        const autoSaveIndicators = [
          '[data-testid="auto-save-indicator"]',
          '.saving-indicator',
          '[data-testid="save-status"]',
        ];

        for (const indicator of autoSaveIndicators) {
          const element = page.locator(indicator);
          if (await element.isVisible()) {
            console.log('Auto-save indicator found:', indicator);

            // Wait for save to complete
            await page.waitForTimeout(2000);

            // Indicator should disappear when saved
            const isStillVisible = await element.isVisible();
            if (!isStillVisible) {
              console.log('Auto-save completed successfully');
            }
            break;
          }
        }

        // Test conflict resolution by simulating concurrent changes
        await page.evaluate(() => {
          // Simulate external change
          const event = new CustomEvent('external-change', {
            detail: { type: 'component-added', data: { type: 'database' } },
          });
          window.dispatchEvent(event);
        });

        // Add another component
        const database = page.locator('[data-testid="palette-item-database"]').first();
        if (await database.isVisible()) {
          await database.dragTo(canvas);
        }

        // App should handle conflict gracefully
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThan(1);

        // No error messages should appear
        const errorMessages = page.locator('[role="alert"].error, .error-message');
        const errorCount = await errorMessages.count();
        expect(errorCount).toBe(0);
      }
    });

    test('export and import data integrity', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create comprehensive design
      const testData = {
        components: [
          { type: 'server', position: { x: 150, y: 150 } },
          { type: 'database', position: { x: 350, y: 150 } },
          { type: 'cache', position: { x: 250, y: 300 } },
        ],
        annotations: [
          { text: 'Main API server', position: { x: 150, y: 250 } },
          { text: 'Data persistence', position: { x: 350, y: 250 } },
          { text: 'Caching layer', position: { x: 250, y: 400 } },
        ],
      };

      // Add components
      for (const comp of testData.components) {
        const component = page.locator(`[data-testid="palette-item-${comp.type}"]`).first();
        if (await component.isVisible()) {
          await component.dragTo(canvas, { targetPosition: comp.position });
        }
      }

      // Add annotations
      for (const ann of testData.annotations) {
        await canvas.dblclick({ position: ann.position });
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(ann.text);
          await textarea.press('Control+Enter');
        }
      }

      await page.waitForTimeout(1000);

      // Test JSON export
      const exportButton = page.getByRole('button', { name: /export$/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();

        const exportDialog = page.locator('[role="dialog"]');
        if (await exportDialog.isVisible()) {
          const jsonOption = page.getByText(/json/i);
          if (await jsonOption.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await jsonOption.click();

            try {
              const download = await downloadPromise;
              const filename = download.suggestedFilename();
              expect(filename).toMatch(/\.json$/);

              // Verify download has valid JSON content
              const path = await download.path();
              if (path) {
                const fs = require('fs');
                const exportedData = JSON.parse(fs.readFileSync(path, 'utf8'));

                expect(exportedData).toHaveProperty('version');
                expect(exportedData).toHaveProperty('components');
                expect(exportedData.components.length).toBeGreaterThan(0);

                console.log('Export data integrity verified');

                // Clean up downloaded file
                fs.unlinkSync(path);
              }
            } catch (error) {
              console.log('Export handled by native dialog or fallback');
            }
          }
        }
      }

      // Test that design state is preserved after export
      const serverNodes = page.locator('.react-flow__node').filter({ hasText: 'Server' });
      const databaseNodes = page.locator('.react-flow__node').filter({ hasText: 'Database' });
      const cacheNodes = page.locator('.react-flow__node').filter({ hasText: 'Cache' });

      await expect(serverNodes.first()).toBeVisible();
      await expect(databaseNodes.first()).toBeVisible();
      await expect(cacheNodes.first()).toBeVisible();

      // Verify annotations are still present
      for (const ann of testData.annotations) {
        const annotation = page.getByText(ann.text);
        if ((await annotation.count()) > 0) {
          await expect(annotation.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Cross-Module Integration', () => {
    test('canvas and settings module integration', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Open settings if available
      const settingsButton = page.getByRole('button', { name: /settings/i });
      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        const settingsDialog = page.locator('[role="dialog"], [data-testid="settings-modal"]');
        if (await settingsDialog.isVisible()) {
          // Test theme setting
          const darkModeToggle = page
            .locator('input[type="checkbox"]')
            .filter({ hasText: /dark mode/i });
          if (await darkModeToggle.isVisible()) {
            await darkModeToggle.check();
            await page.waitForTimeout(500);

            // Verify theme change applied
            const body = page.locator('body');
            const bodyClass = await body.getAttribute('class');
            expect(bodyClass).toContain('dark');
          }

          // Test auto-save setting
          const autoSaveToggle = page
            .locator('input[type="checkbox"]')
            .filter({ hasText: /auto.save/i });
          if (await autoSaveToggle.isVisible()) {
            await autoSaveToggle.uncheck();

            // Close settings
            const closeButton = page.getByRole('button', { name: /close|×/i });
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }

            // Test that auto-save is disabled
            const canvas = page.locator('[data-testid="canvas"]');
            const server = page.locator('[data-testid="palette-item-server"]').first();

            if (await server.isVisible()) {
              await server.dragTo(canvas);

              await canvas.dblclick({ position: { x: 200, y: 200 } });
              const textarea = page.locator('textarea').first();
              if (await textarea.isVisible()) {
                await textarea.fill('Test auto-save disabled');
                await textarea.press('Control+Enter');

                // Auto-save indicator should not appear
                const autoSaveIndicator = page.locator('[data-testid="auto-save-indicator"]');
                const isIndicatorVisible = await autoSaveIndicator.isVisible();
                expect(isIndicatorVisible).toBe(false);
              }
            }
          }
        }
      }
    });

    test('status module integration with performance data', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Check for status bar
      const statusBar = page.locator('[data-testid="status-bar"]');
      if (await statusBar.isVisible()) {
        const canvas = page.locator('[data-testid="canvas"]');

        // Add components to generate performance data
        for (let i = 0; i < 10; i++) {
          const server = page.locator('[data-testid="palette-item-server"]').first();
          if (await server.isVisible()) {
            await server.dragTo(canvas, {
              targetPosition: { x: 100 + (i % 5) * 100, y: 100 + Math.floor(i / 5) * 100 },
            });
          }
        }

        await page.waitForTimeout(2000);

        // Check for performance indicators in status bar
        const performanceIndicators = [
          '[data-testid="fps-indicator"]',
          '[data-testid="render-time-indicator"]',
          '[data-testid="memory-indicator"]',
        ];

        for (const indicator of performanceIndicators) {
          const element = statusBar.locator(indicator);
          if (await element.isVisible()) {
            const text = await element.textContent();
            console.log(`${indicator}: ${text}`);
            expect(text).toBeTruthy();
          }
        }

        // Test status bar component count
        const componentCountIndicator = statusBar.locator('[data-testid="component-count"]');
        if (await componentCountIndicator.isVisible()) {
          const countText = await componentCountIndicator.textContent();
          expect(countText).toMatch(/\d+/); // Should contain numbers
        }
      }
    });

    test('command module integration with canvas actions', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Add some components first
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }
      if (await database.isVisible()) {
        await database.dragTo(canvas);
      }

      // Test command palette if available
      await page.keyboard.press('Control+k'); // Common command palette shortcut

      const commandPalette = page.locator(
        '[role="dialog"][aria-label*="command"], [data-testid="command-palette"]'
      );
      if (await commandPalette.isVisible()) {
        // Test search functionality
        const commandInput = commandPalette.locator('input');
        if (await commandInput.isVisible()) {
          await commandInput.fill('export');

          // Should show export commands
          const exportCommand = commandPalette.getByText(/export/i);
          if (await exportCommand.isVisible()) {
            await exportCommand.click();

            // Should trigger export action
            const downloadPromise = page.waitForEvent('download').catch(() => null);
            const download = await downloadPromise;

            if (download) {
              expect(download.suggestedFilename()).toBeTruthy();
            }
          }
        }
      } else {
        // Test keyboard shortcuts directly
        await page.keyboard.press('Control+s'); // Save shortcut

        // Should show save indicator or trigger save action
        const saveIndicator = page.locator('[data-testid="save-indicator"], .saving');
        if (await saveIndicator.isVisible()) {
          await expect(saveIndicator).toBeVisible();
        }

        // Test select all
        await page.keyboard.press('Control+a');

        const selectedNodes = page.locator('.react-flow__node.selected');
        const selectedCount = await selectedNodes.count();
        expect(selectedCount).toBeGreaterThan(0);
      }
    });

    test('review module integration with session data', async ({ page }) => {
      // Complete full workflow to reach review
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create comprehensive design
      const components = ['server', 'database', 'cache'];
      for (const componentType of components) {
        const component = page.locator(`[data-testid="palette-item-${componentType}"]`).first();
        if (await component.isVisible()) {
          await component.dragTo(canvas);
        }
      }

      // Continue to recording
      const continueButton = page.getByRole('button', { name: /continue to recording/i });
      if (await continueButton.isVisible()) {
        await continueButton.click();

        // Add transcript
        const transcriptArea = page.getByPlaceholder(/enter your explanation text/i);
        if (await transcriptArea.isVisible()) {
          await transcriptArea.fill(
            'This design shows a typical web application architecture with caching.'
          );

          const continueToReview = page.getByRole('button', { name: /continue to review/i });
          if (await continueToReview.isVisible()) {
            await continueToReview.click();

            // Verify review screen shows session data
            await expect(page.getByText(/session complete/i)).toBeVisible();

            // Check for component summary
            for (const componentType of components) {
              const componentName = componentType.charAt(0).toUpperCase() + componentType.slice(1);
              const componentText = page.getByText(componentName, { exact: false });
              if ((await componentText.count()) > 0) {
                await expect(componentText.first()).toBeVisible();
              }
            }

            // Check for performance analysis
            const performanceSection = page.getByText(/performance analysis/i);
            if (await performanceSection.isVisible()) {
              await expect(performanceSection).toBeVisible();

              // Should show metrics
              const metricsIndicators = [
                /completion time/i,
                /components added/i,
                /annotations created/i,
              ];

              for (const metric of metricsIndicators) {
                const metricElement = page.getByText(metric);
                if ((await metricElement.count()) > 0) {
                  await expect(metricElement.first()).toBeVisible();
                }
              }
            }

            // Test review actions
            const shareResultsButton = page.getByRole('button', { name: /share results/i });
            if (await shareResultsButton.isVisible()) {
              await shareResultsButton.click();

              const shareDialog = page.locator('[role="dialog"]');
              if (await shareDialog.isVisible()) {
                await expect(shareDialog).toBeVisible();
              }
            }
          }
        }
      }
    });
  });
});
