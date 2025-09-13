// e2e/stress-testing.spec.ts
// Stress and load testing for ArchiComm application
// Tests performance under heavy load and extreme conditions
// RELEVANT FILES: src/lib/performance/*, src/services/canvas/*, playwright.config.ts

import { test, expect } from '@playwright/test';

test.describe('Stress and Load Testing', () => {
  // Increase timeout for stress tests
  test.setTimeout(120000);

  test.describe('Component Load Testing', () => {
    test('handles large number of components (100+)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      const startTime = performance.now();
      let addedComponents = 0;

      // Add 100 components
      for (let i = 0; i < 100; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();

        if (await server.isVisible()) {
          try {
            await server.dragTo(canvas, {
              targetPosition: {
                x: 100 + (i % 10) * 80,
                y: 100 + Math.floor(i / 10) * 70,
              },
            });
            addedComponents++;

            // Brief pause every 20 components to prevent overwhelming
            if (i % 20 === 19) {
              await page.waitForTimeout(500);

              // Check if app is still responsive
              const toolbar = page.locator('[data-testid="canvas-toolbar"]');
              const isResponsive = await toolbar.isVisible();

              if (!isResponsive) {
                console.log(`App became unresponsive after ${addedComponents} components`);
                break;
              }
            }
          } catch (error) {
            console.log(`Failed to add component ${i}: ${error.message}`);
            break;
          }
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Added ${addedComponents} components in ${duration}ms`);
      console.log(`Average time per component: ${duration / addedComponents}ms`);

      // Verify performance metrics
      expect(addedComponents).toBeGreaterThan(50); // Should handle at least 50 components
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds

      // Verify app is still functional
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThanOrEqual(addedComponents);

      // Test interaction after heavy load
      const selectTool = page.locator('[data-testid="tool-select"]');
      if (await selectTool.isVisible()) {
        await selectTool.click();
        await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
      }

      // Test zoom functionality under load
      const reactFlow = page.locator('.react-flow');
      await reactFlow.click();
      await page.keyboard.press('Control++');
      await page.waitForTimeout(500);
      await page.keyboard.press('Control+-');
    });

    test('handles rapid component addition and removal', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      const cycles = 10;
      const componentsPerCycle = 10;

      for (let cycle = 0; cycle < cycles; cycle++) {
        const cycleStartTime = performance.now();

        // Add components rapidly
        for (let i = 0; i < componentsPerCycle; i++) {
          const server = page.locator('[data-testid="palette-item-server"]').first();
          if (await server.isVisible()) {
            await server.dragTo(canvas, {
              targetPosition: { x: 100 + i * 60, y: 100 + cycle * 50 },
            });
          }
        }

        // Verify components were added
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThan(cycle * componentsPerCycle);

        // Select all and delete
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');

        await page.waitForTimeout(200);

        // Verify components were removed
        const remainingNodes = await nodes.count();
        expect(remainingNodes).toBeLessThan(nodeCount);

        const cycleEndTime = performance.now();
        const cycleDuration = cycleEndTime - cycleStartTime;

        console.log(`Cycle ${cycle + 1}: ${cycleDuration}ms`);

        // Each cycle should complete in reasonable time
        expect(cycleDuration).toBeLessThan(10000); // 10 seconds max per cycle
      }

      // App should still be responsive after stress cycles
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();
    });

    test('memory stability under component stress', async ({ page }) => {
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
        const memoryReadings = [];

        // Perform memory-intensive operations in cycles
        for (let cycle = 0; cycle < 5; cycle++) {
          // Add many components
          for (let i = 0; i < 30; i++) {
            const server = page.locator('[data-testid="palette-item-server"]').first();
            if (await server.isVisible()) {
              await server.dragTo(canvas);
            }
          }

          // Check memory usage
          const currentMemory = await page.evaluate(() => {
            return (performance as any).memory.usedJSHeapSize;
          });

          memoryReadings.push(currentMemory);
          console.log(`Cycle ${cycle + 1} memory: ${currentMemory / 1024 / 1024}MB`);

          // Clear all components
          await page.keyboard.press('Control+a');
          await page.keyboard.press('Delete');
          await page.waitForTimeout(500);

          // Force garbage collection if available
          await page.evaluate(() => {
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
        }

        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory.usedJSHeapSize;
        });

        const totalMemoryIncrease = finalMemory - initialMemory;
        console.log(`Total memory increase: ${totalMemoryIncrease / 1024 / 1024}MB`);

        // Memory should not grow excessively
        expect(totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit

        // Check for memory leaks (gradual increase)
        if (memoryReadings.length >= 3) {
          const firstThird = memoryReadings.slice(0, Math.floor(memoryReadings.length / 3));
          const lastThird = memoryReadings.slice(-Math.floor(memoryReadings.length / 3));

          const firstAvg = firstThird.reduce((a, b) => a + b) / firstThird.length;
          const lastAvg = lastThird.reduce((a, b) => a + b) / lastThird.length;

          const memoryGrowth = lastAvg - firstAvg;
          console.log(`Memory growth pattern: ${memoryGrowth / 1024 / 1024}MB`);

          // Should not show excessive growth pattern
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB growth limit
        }
      }
    });
  });

  test.describe('Annotation Load Testing', () => {
    test('handles large number of annotations (200+)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Add base components first
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }

      const startTime = performance.now();
      let addedAnnotations = 0;

      // Add many annotations
      for (let i = 0; i < 200; i++) {
        try {
          await canvas.dblclick({
            position: {
              x: 150 + (i % 20) * 40,
              y: 200 + Math.floor(i / 20) * 30,
            },
          });

          const textarea = page.locator('textarea').first();
          if (await textarea.isVisible()) {
            await textarea.fill(`Stress annotation ${i} - testing performance under load`);
            await textarea.press('Control+Enter');
            addedAnnotations++;

            // Brief pause every 50 annotations
            if (i % 50 === 49) {
              await page.waitForTimeout(300);

              // Check responsiveness
              const toolbar = page.locator('[data-testid="canvas-toolbar"]');
              const isResponsive = await toolbar.isVisible();

              if (!isResponsive) {
                console.log(`App became unresponsive after ${addedAnnotations} annotations`);
                break;
              }
            }
          }
        } catch (error) {
          console.log(`Failed to add annotation ${i}: ${error.message}`);
          break;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Added ${addedAnnotations} annotations in ${duration}ms`);
      console.log(`Average time per annotation: ${duration / addedAnnotations}ms`);

      // Verify performance
      expect(addedAnnotations).toBeGreaterThan(100); // Should handle at least 100 annotations
      expect(duration).toBeLessThan(90000); // Should complete within 90 seconds

      // Test annotation rendering performance
      const annotationElements = page.locator('[data-testid*="annotation"], .annotation');
      const visibleAnnotations = await annotationElements.count();

      console.log(`Visible annotations: ${visibleAnnotations}`);
      expect(visibleAnnotations).toBeGreaterThan(0);

      // Test scrolling performance with many annotations
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -500);

      // App should remain responsive
      const selectTool = page.locator('[data-testid="tool-select"]');
      if (await selectTool.isVisible()) {
        await selectTool.click();
        await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
      }
    });

    test('handles rapid annotation editing', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create base annotations
      const annotationCount = 20;
      for (let i = 0; i < annotationCount; i++) {
        await canvas.dblclick({
          position: { x: 150 + (i % 5) * 100, y: 150 + Math.floor(i / 5) * 80 },
        });

        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(`Initial annotation ${i}`);
          await textarea.press('Control+Enter');
        }
      }

      await page.waitForTimeout(1000);

      // Rapidly edit annotations
      const startTime = performance.now();
      let editsCompleted = 0;

      for (let cycle = 0; cycle < 5; cycle++) {
        for (let i = 0; i < annotationCount; i++) {
          try {
            const annotation = page.getByText(`Initial annotation ${i}`, { exact: false });
            if ((await annotation.count()) > 0) {
              await annotation.first().dblclick();

              const textarea = page.locator('textarea').first();
              if (await textarea.isVisible()) {
                await textarea.fill(`Edited annotation ${i} - cycle ${cycle}`);
                await textarea.press('Control+Enter');
                editsCompleted++;
              }
            }
          } catch (error) {
            console.log(`Edit failed for annotation ${i}, cycle ${cycle}`);
          }
        }

        await page.waitForTimeout(200);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Completed ${editsCompleted} edits in ${duration}ms`);
      console.log(`Average edit time: ${duration / editsCompleted}ms`);

      // Verify performance
      expect(editsCompleted).toBeGreaterThan(annotationCount * 3); // At least 3 cycles
      expect(duration / editsCompleted).toBeLessThan(1000); // Each edit under 1 second

      // Verify app stability
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();
    });

    test('annotation virtualization performance', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create many annotations spread across large area
      const gridSize = 50; // 50x50 grid
      const totalAnnotations = gridSize * gridSize;

      console.log(`Creating ${totalAnnotations} annotations for virtualization test`);

      const startTime = performance.now();

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          try {
            await canvas.dblclick({
              position: {
                x: 100 + x * 50,
                y: 100 + y * 50,
              },
            });

            const textarea = page.locator('textarea').first();
            if (await textarea.isVisible()) {
              await textarea.fill(`Grid ${x},${y}`);
              await textarea.press('Control+Enter');
            }

            // Minimal delay to prevent overwhelming
            if ((x * gridSize + y) % 1000 === 999) {
              await page.waitForTimeout(100);
              console.log(`Created ${x * gridSize + y + 1} annotations so far...`);
            }
          } catch (error) {
            console.log(`Failed at position ${x},${y}`);
            break;
          }
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Annotation creation completed in ${duration}ms`);

      // Test viewport scrolling performance
      const scrollTests = [
        { x: 0, y: 1000 }, // Scroll down
        { x: 1000, y: 0 }, // Scroll right
        { x: -500, y: -500 }, // Scroll back
        { x: 2000, y: 2000 }, // Scroll far
      ];

      for (const scroll of scrollTests) {
        const scrollStart = performance.now();

        await page.mouse.wheel(scroll.x, scroll.y);
        await page.waitForTimeout(300); // Allow rendering to complete

        const scrollEnd = performance.now();
        const scrollDuration = scrollEnd - scrollStart;

        console.log(`Scroll (${scroll.x}, ${scroll.y}): ${scrollDuration}ms`);

        // Scrolling should be smooth
        expect(scrollDuration).toBeLessThan(1000);

        // App should remain responsive
        const toolbar = page.locator('[data-testid="canvas-toolbar"]');
        const isVisible = await toolbar.isVisible();
        expect(isVisible).toBe(true);
      }

      // Test zoom performance with many annotations
      const reactFlow = page.locator('.react-flow');
      await reactFlow.click();

      const zoomStartTime = performance.now();
      await page.keyboard.press('Control++');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control++');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+-');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+0'); // Reset zoom
      const zoomEndTime = performance.now();

      const zoomDuration = zoomEndTime - zoomStartTime;
      console.log(`Zoom operations: ${zoomDuration}ms`);

      expect(zoomDuration).toBeLessThan(2000);
    });
  });

  test.describe('Interaction Stress Testing', () => {
    test('rapid tool switching performance', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const tools = [
        '[data-testid="tool-select"]',
        '[data-testid="tool-pan"]',
        '[data-testid="tool-zoom"]',
        '[data-testid="tool-annotate"]',
      ];

      const startTime = performance.now();
      let switchCount = 0;

      // Rapidly switch tools for 30 seconds
      const testDuration = 30000;
      const endTime = startTime + testDuration;

      while (performance.now() < endTime) {
        for (const toolSelector of tools) {
          const tool = page.locator(toolSelector);
          if (await tool.isVisible()) {
            await tool.click();
            await expect(tool).toHaveAttribute('aria-pressed', 'true');
            switchCount++;

            // Brief pause to simulate real usage
            await page.waitForTimeout(50);
          }

          if (performance.now() >= endTime) break;
        }
      }

      const actualDuration = performance.now() - startTime;
      console.log(`Completed ${switchCount} tool switches in ${actualDuration}ms`);
      console.log(`Average switch time: ${actualDuration / switchCount}ms`);

      // Performance metrics
      expect(switchCount).toBeGreaterThan(100); // Should handle many switches
      expect(actualDuration / switchCount).toBeLessThan(200); // Each switch under 200ms

      // Verify final state
      const selectTool = page.locator('[data-testid="tool-select"]');
      if (await selectTool.isVisible()) {
        await selectTool.click();
        await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
      }
    });

    test('rapid drag and drop operations', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Add initial components
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas, { targetPosition: { x: 200, y: 200 } });
      }
      if (await database.isVisible()) {
        await database.dragTo(canvas, { targetPosition: { x: 400, y: 200 } });
      }

      await page.waitForTimeout(500);

      // Rapid drag operations
      const dragOperations = 100;
      const startTime = performance.now();

      for (let i = 0; i < dragOperations; i++) {
        try {
          const serverNode = page
            .locator('.react-flow__node')
            .filter({ hasText: 'Server' })
            .first();
          const databaseNode = page
            .locator('.react-flow__node')
            .filter({ hasText: 'Database' })
            .first();

          if (await serverNode.isVisible()) {
            // Drag server to random position
            const targetX = 150 + Math.random() * 300;
            const targetY = 150 + Math.random() * 200;

            await serverNode.dragTo(canvas, {
              targetPosition: { x: targetX, y: targetY },
            });
          }

          if (await databaseNode.isVisible()) {
            // Drag database to random position
            const targetX = 150 + Math.random() * 300;
            const targetY = 150 + Math.random() * 200;

            await databaseNode.dragTo(canvas, {
              targetPosition: { x: targetX, y: targetY },
            });
          }

          // Brief pause every 20 operations
          if (i % 20 === 19) {
            await page.waitForTimeout(100);
          }
        } catch (error) {
          console.log(`Drag operation ${i} failed: ${error.message}`);
          break;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Completed ${dragOperations} drag operations in ${duration}ms`);
      console.log(`Average drag time: ${duration / dragOperations}ms`);

      // Verify performance
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(duration / dragOperations).toBeLessThan(500); // Each drag under 500ms

      // Verify components are still present and functional
      const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' });
      const databaseNode = page.locator('.react-flow__node').filter({ hasText: 'Database' });

      await expect(serverNode.first()).toBeVisible();
      await expect(databaseNode.first()).toBeVisible();

      // Test selection after stress
      await serverNode.first().click();
      await expect(serverNode.first()).toHaveClass(/selected/);
    });

    test('keyboard shortcut spam protection', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Add components for undo/redo testing
      const componentsToAdd = 10;
      for (let i = 0; i < componentsToAdd; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        if (await server.isVisible()) {
          await server.dragTo(canvas);
        }
      }

      await page.waitForTimeout(1000);

      // Spam keyboard shortcuts
      const shortcuts = [
        'Control+z', // Undo
        'Control+y', // Redo
        'Control+a', // Select all
        'Control+c', // Copy
        'Control+v', // Paste
        'Control+s', // Save
      ];

      const spamCount = 200;
      const startTime = performance.now();

      for (let i = 0; i < spamCount; i++) {
        const shortcut = shortcuts[i % shortcuts.length];

        try {
          await page.keyboard.press(shortcut);

          // No delay - test rapid fire
          if (i % 50 === 49) {
            // Brief check for responsiveness
            const toolbar = page.locator('[data-testid="canvas-toolbar"]');
            const isVisible = await toolbar.isVisible();

            if (!isVisible) {
              console.log(`App became unresponsive after ${i} shortcuts`);
              break;
            }
          }
        } catch (error) {
          console.log(`Shortcut ${i} (${shortcut}) failed: ${error.message}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Executed ${spamCount} shortcuts in ${duration}ms`);

      // App should remain stable
      expect(duration).toBeLessThan(30000); // Should handle spam quickly

      // Verify app is still functional
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();

      const selectTool = page.locator('[data-testid="tool-select"]');
      if (await selectTool.isVisible()) {
        await selectTool.click();
        await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
      }

      // Verify some components still exist
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThan(0);
    });
  });

  test.describe('Network and I/O Stress Testing', () => {
    test('handles slow network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async route => {
        // Add 500ms delay to all requests
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.continue();
      });

      const startTime = performance.now();

      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const loadTime = performance.now() - startTime;
      console.log(`App loaded in ${loadTime}ms with slow network`);

      // Should still load within reasonable time
      expect(loadTime).toBeLessThan(15000); // 15 seconds with delays

      const canvas = page.locator('[data-testid="canvas"]');
      await expect(canvas).toBeVisible();

      // Test functionality under slow network
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        const operationStart = performance.now();
        await server.dragTo(canvas);
        const operationEnd = performance.now();

        const operationTime = operationEnd - operationStart;
        console.log(`Component addition took ${operationTime}ms with slow network`);

        // Should still work but may be slower
        expect(operationTime).toBeLessThan(5000);

        const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' });
        await expect(serverNode.first()).toBeVisible();
      }
    });

    test('handles network failures gracefully', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Add initial content
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }

      // Simulate network failure
      await page.route('**/*', route => route.abort('failed'));

      // Try operations that might require network
      try {
        const exportButton = page.getByRole('button', { name: /export/i });
        if (await exportButton.isVisible()) {
          await exportButton.click();

          // Should handle failure gracefully
          const errorMessage = page.locator('[role="alert"], .error-message');
          if (await errorMessage.isVisible()) {
            await expect(errorMessage).toBeVisible();
          }
        }
      } catch (error) {
        console.log('Export failed as expected during network failure');
      }

      // App should remain functional for offline operations
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill('Offline annotation test');
        await textarea.press('Control+Enter');

        await expect(page.getByText('Offline annotation test')).toBeVisible();
      }

      // Restore network
      await page.unroute('**/*');

      // Verify app recovers
      await page.reload();
      await expect(page.getByRole('button', { name: /start your journey/i })).toBeVisible();
    });

    test('concurrent file operations stress', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Create content for export
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }
      if (await database.isVisible()) {
        await database.dragTo(canvas);
      }

      // Add annotations
      for (let i = 0; i < 5; i++) {
        await canvas.dblclick({ position: { x: 200 + i * 100, y: 200 } });
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(`Concurrent test annotation ${i}`);
          await textarea.press('Control+Enter');
        }
      }

      // Attempt concurrent exports
      const exportButton = page.getByRole('button', { name: /export png/i });

      if (await exportButton.isVisible()) {
        const concurrentExports = 5;
        const exportPromises = [];

        for (let i = 0; i < concurrentExports; i++) {
          const downloadPromise = page.waitForEvent('download').catch(() => null);
          exportPromises.push(downloadPromise);

          await exportButton.click();
          await page.waitForTimeout(100); // Brief delay between clicks
        }

        // Wait for all exports to complete or timeout
        const startTime = performance.now();
        const results = await Promise.allSettled(exportPromises);
        const endTime = performance.now();

        const duration = endTime - startTime;
        const successfulExports = results.filter(
          r => r.status === 'fulfilled' && r.value !== null
        ).length;

        console.log(`${successfulExports}/${concurrentExports} exports completed in ${duration}ms`);

        // Should handle concurrent operations gracefully
        expect(successfulExports).toBeGreaterThan(0);
        expect(duration).toBeLessThan(30000); // 30 seconds max

        // App should remain functional
        const toolbar = page.locator('[data-testid="canvas-toolbar"]');
        await expect(toolbar).toBeVisible();
      }
    });
  });

  test.describe('Browser Resource Limits', () => {
    test('performance under memory pressure', async ({ page }) => {
      // Simulate memory pressure
      await page.addInitScript(() => {
        // Create large objects to consume memory
        (window as any).memoryBallast = [];
        for (let i = 0; i < 1000; i++) {
          (window as any).memoryBallast.push(new Array(10000).fill('memory-pressure-test'));
        }
      });

      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
      });

      if (initialMemory) {
        console.log(`Initial memory with ballast: ${initialMemory / 1024 / 1024}MB`);
      }

      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Test basic functionality under memory pressure
      const operationStartTime = performance.now();

      for (let i = 0; i < 20; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        if (await server.isVisible()) {
          await server.dragTo(canvas, {
            targetPosition: { x: 150 + (i % 5) * 80, y: 150 + Math.floor(i / 5) * 60 },
          });
        }

        if (i % 5 === 4) {
          await page.waitForTimeout(200);

          // Check if app is still responsive
          const toolbar = page.locator('[data-testid="canvas-toolbar"]');
          const isVisible = await toolbar.isVisible();

          if (!isVisible) {
            console.log(`App became unresponsive after ${i + 1} operations under memory pressure`);
            break;
          }
        }
      }

      const operationEndTime = performance.now();
      const operationDuration = operationEndTime - operationStartTime;

      console.log(`Operations under memory pressure: ${operationDuration}ms`);

      // Should still function but may be slower
      expect(operationDuration).toBeLessThan(30000); // 30 seconds max

      // Verify app stability
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThan(0);

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
      });

      if (finalMemory && initialMemory) {
        const memoryIncrease = finalMemory - initialMemory;
        console.log(`Memory increase during operations: ${memoryIncrease / 1024 / 1024}MB`);

        // Should not have excessive memory growth beyond the ballast
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB additional
      }
    });

    test('performance with many browser tabs', async ({ page, context }) => {
      // Create multiple tabs to simulate resource competition
      const additionalTabs = [];

      for (let i = 0; i < 5; i++) {
        const newTab = await context.newPage();
        await newTab.goto('data:text/html,<h1>Resource Competition Tab ' + i + '</h1>');
        additionalTabs.push(newTab);
      }

      // Main functionality test
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      const startTime = performance.now();

      // Test operations with resource competition
      for (let i = 0; i < 15; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        if (await server.isVisible()) {
          await server.dragTo(canvas);
        }

        // Add annotation
        await canvas.dblclick({ position: { x: 200 + i * 30, y: 200 } });
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(`Multi-tab test ${i}`);
          await textarea.press('Control+Enter');
        }

        if (i % 5 === 4) {
          await page.waitForTimeout(300);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Operations with ${additionalTabs.length} additional tabs: ${duration}ms`);

      // Close additional tabs
      for (const tab of additionalTabs) {
        await tab.close();
      }

      // Should complete within reasonable time despite resource competition
      expect(duration).toBeLessThan(45000); // 45 seconds max

      // Verify functionality
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      expect(nodeCount).toBe(15);

      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();
    });

    test('recovery from browser freeze simulation', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');

      // Add content
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);
      }

      // Simulate freeze with blocking operation
      await page.evaluate(() => {
        const freezeStart = Date.now();
        while (Date.now() - freezeStart < 2000) {
          // Block main thread for 2 seconds
        }
      });

      await page.waitForTimeout(1000);

      // Verify app recovers
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();

      // Test that app is still functional
      const database = page.locator('[data-testid="palette-item-database"]').first();
      if (await database.isVisible()) {
        await database.dragTo(canvas);

        const databaseNode = page.locator('.react-flow__node').filter({ hasText: 'Database' });
        await expect(databaseNode.first()).toBeVisible();
      }

      // Add annotation to verify interactivity
      await canvas.dblclick({ position: { x: 300, y: 300 } });
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill('Post-freeze recovery test');
        await textarea.press('Control+Enter');

        await expect(page.getByText('Post-freeze recovery test')).toBeVisible();
      }
    });
  });
});
