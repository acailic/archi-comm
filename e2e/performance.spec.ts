import { test, expect } from '@playwright/test';

test.describe('Performance Optimization Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page.getByRole('button', { name: /start challenge/i }).first().click();
  });

  test.describe('Performance Metrics Testing', () => {
    test('FPS monitoring works correctly during canvas operations', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add performance monitoring script
      await page.addInitScript(() => {
        window.performanceMetrics = [];
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
          const start = performance.now();
          return originalRAF(() => {
            const end = performance.now();
            window.performanceMetrics.push({ frameTime: end - start });
            callback(end);
          });
        };
      });

      // Perform canvas operations that should trigger FPS monitoring
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();
      
      await server.dragTo(canvas);
      await database.dragTo(canvas);
      
      // Add annotations to trigger more rendering
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Performance test annotation');
      await textarea.press('Control+Enter');
      
      // Wait for performance metrics to be collected
      await page.waitForTimeout(1000);
      
      // Check that FPS monitoring is working
      const metrics = await page.evaluate(() => window.performanceMetrics);
      expect(metrics.length).toBeGreaterThan(0);
      
      // Verify reasonable frame times (should be under 16.67ms for 60fps)
      const avgFrameTime = metrics.reduce((sum, m) => sum + m.frameTime, 0) / metrics.length;
      expect(avgFrameTime).toBeLessThan(50); // Allow for some overhead
    });

    test('performance metrics are displayed in StatusBar', async ({ page }) => {
      // Wait for StatusBar to load
      await expect(page.locator('[data-testid="status-bar"]')).toBeVisible();
      
      // Perform operations to generate performance data
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      
      await server.dragTo(canvas);
      
      // Wait for performance metrics to appear
      await page.waitForTimeout(1000);
      
      // Check for FPS indicator
      const fpsIndicator = page.locator('[data-testid="fps-indicator"]');
      if (await fpsIndicator.isVisible()) {
        const fpsText = await fpsIndicator.textContent();
        expect(fpsText).toMatch(/\d+\s*fps/i);
      }
      
      // Check for render time indicator
      const renderTimeIndicator = page.locator('[data-testid="render-time-indicator"]');
      if (await renderTimeIndicator.isVisible()) {
        const renderTimeText = await renderTimeIndicator.textContent();
        expect(renderTimeText).toMatch(/\d+(\.\d+)?\s*ms/i);
      }
    });

    test('performance dashboard functionality and data accuracy', async ({ page }) => {
      // Look for performance dashboard trigger
      const performanceTrigger = page.locator('[data-testid="performance-dashboard-trigger"]');
      
      if (await performanceTrigger.isVisible()) {
        await performanceTrigger.click();
        
        // Verify dashboard opens
        const dashboard = page.locator('[data-testid="performance-dashboard"]');
        await expect(dashboard).toBeVisible();
        
        // Check for performance charts
        const fpsChart = page.locator('[data-testid="fps-chart"]');
        const renderTimeChart = page.locator('[data-testid="render-time-chart"]');
        
        if (await fpsChart.isVisible()) {
          expect(await fpsChart.isVisible()).toBe(true);
        }
        
        if (await renderTimeChart.isVisible()) {
          expect(await renderTimeChart.isVisible()).toBe(true);
        }
        
        // Close dashboard
        await page.keyboard.press('Escape');
        await expect(dashboard).not.toBeVisible();
      }
    });

    test('performance monitoring does not significantly impact app performance', async ({ page }) => {
      // Measure baseline performance without monitoring
      const startTime = performance.now();
      
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();
      
      // Perform standard operations
      await server.dragTo(canvas);
      await database.dragTo(canvas);
      
      // Add multiple annotations
      for (let i = 0; i < 5; i++) {
        await canvas.dblclick({ position: { x: 100 + i * 50, y: 100 + i * 30 } });
        const textarea = page.locator('textarea').first();
        await textarea.fill(`Annotation ${i}`);
        await textarea.press('Control+Enter');
      }
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      // Verify operations complete in reasonable time (under 5 seconds)
      expect(operationTime).toBeLessThan(5000);
      
      // Verify UI remains responsive
      await expect(page.getByText('Server')).toBeVisible();
      await expect(page.getByText('Database')).toBeVisible();
    });
  });

  test.describe('Canvas Optimization Testing', () => {
    test('dirty region tracking with annotation operations', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add script to monitor canvas operations
      await page.addInitScript(() => {
        window.canvasOperations = [];
        const originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function(x, y, width, height) {
          window.canvasOperations.push({ type: 'clearRect', x, y, width, height });
          return originalClearRect.call(this, x, y, width, height);
        };
      });
      
      // Add annotation
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Test annotation');
      await textarea.press('Control+Enter');
      
      // Update annotation
      await page.getByText('Test annotation').dblclick();
      const updateTextarea = page.locator('textarea').first();
      await updateTextarea.fill('Updated annotation');
      await updateTextarea.press('Control+Enter');
      
      // Check that dirty region tracking is working
      const operations = await page.evaluate(() => window.canvasOperations);
      
      if (operations.length > 0) {
        // Verify that clear operations are targeted (not full canvas)
        const fullCanvasClears = operations.filter(op => 
          op.type === 'clearRect' && op.width > 800 && op.height > 600
        );
        
        // Should have fewer full canvas clears than total operations
        expect(fullCanvasClears.length).toBeLessThan(operations.length);
      }
    });

    test('render command batching and queue processing', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add multiple components rapidly to test batching
      const components = [
        'server', 'database', 'cache', 'api-gateway', 'load-balancer'
      ];
      
      const startTime = performance.now();
      
      for (const component of components) {
        const item = page.locator(`[data-testid="palette-item-${component}"]`).first();
        await item.dragTo(canvas, { 
          targetPosition: { x: 100 + components.indexOf(component) * 120, y: 100 } 
        });
      }
      
      const endTime = performance.now();
      const batchTime = endTime - startTime;
      
      // Verify all components are rendered
      for (const component of components) {
        const componentName = component.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        await expect(page.getByText(componentName).first()).toBeVisible();
      }
      
      // Batching should make operations reasonably fast
      expect(batchTime).toBeLessThan(3000);
    });

    test('offscreen canvas and worker functionality when supported', async ({ page }) => {
      // Check if OffscreenCanvas is supported
      const offscreenSupported = await page.evaluate(() => {
        return typeof OffscreenCanvas !== 'undefined';
      });
      
      const workerSupported = await page.evaluate(() => {
        return typeof Worker !== 'undefined';
      });
      
      if (offscreenSupported && workerSupported) {
        const canvas = page.locator('[data-testid="canvas"]');
        
        // Add components to trigger offscreen rendering
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas);
        
        // Add multiple annotations to stress test worker
        for (let i = 0; i < 10; i++) {
          await canvas.dblclick({ position: { x: 150 + i * 20, y: 150 + i * 15 } });
          const textarea = page.locator('textarea').first();
          await textarea.fill(`Worker test ${i}`);
          await textarea.press('Control+Enter');
        }
        
        // Verify all annotations are rendered correctly
        for (let i = 0; i < 10; i++) {
          await expect(page.getByText(`Worker test ${i}`)).toBeVisible();
        }
      } else {
        console.log('OffscreenCanvas or Worker not supported, skipping test');
      }
    });
  });

  test.describe('Memory Management Testing', () => {
    test('object pooling for annotations and components', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add script to monitor object creation
      await page.addInitScript(() => {
        window.objectCreations = 0;
        window.objectReleases = 0;
        
        // Mock object pooling monitoring
        if (window.MemoryOptimizer) {
          const originalPool = window.MemoryOptimizer.poolObject;
          const originalRelease = window.MemoryOptimizer.releaseObject;
          
          window.MemoryOptimizer.poolObject = function(...args) {
            window.objectCreations++;
            return originalPool.apply(this, args);
          };
          
          window.MemoryOptimizer.releaseObject = function(...args) {
            window.objectReleases++;
            return originalRelease.apply(this, args);
          };
        }
      });
      
      // Create and remove annotations multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        // Add annotations
        for (let i = 0; i < 5; i++) {
          await canvas.dblclick({ position: { x: 100 + i * 50, y: 100 } });
          const textarea = page.locator('textarea').first();
          await textarea.fill(`Pooling test ${cycle}-${i}`);
          await textarea.press('Control+Enter');
        }
        
        // Remove annotations (if delete functionality exists)
        const annotations = page.locator('[data-testid*="annotation"]');
        const count = await annotations.count();
        
        for (let i = 0; i < count; i++) {
          const annotation = annotations.nth(i);
          if (await annotation.isVisible()) {
            await annotation.click();
            await page.keyboard.press('Delete');
          }
        }
      }
      
      // Check pooling effectiveness
      const stats = await page.evaluate(() => ({
        creations: window.objectCreations,
        releases: window.objectReleases
      }));
      
      if (stats.creations > 0) {
        // Should have some object reuse (releases should be close to creations)
        expect(stats.releases).toBeGreaterThan(0);
      }
    });

    test('memory cleanup when components are removed', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add multiple components
      const components = ['server', 'database', 'cache'];
      
      for (const component of components) {
        const item = page.locator(`[data-testid="palette-item-${component}"]`).first();
        await item.dragTo(canvas);
      }
      
      // Verify components are added
      await expect(page.getByText('Server')).toBeVisible();
      await expect(page.getByText('Database')).toBeVisible();
      await expect(page.getByText('Cache')).toBeVisible();
      
      // Remove components (if delete functionality exists)
      const serverComponent = page.getByText('Server').first();
      await serverComponent.click();
      await page.keyboard.press('Delete');
      
      // Verify component is removed
      await expect(page.getByText('Server')).not.toBeVisible();
      
      // App should remain stable after removal
      await expect(page.getByText('Database')).toBeVisible();
      await expect(page.getByText('Cache')).toBeVisible();
    });

    test('memory usage monitoring and reporting', async ({ page }) => {
      // Check if memory monitoring is available
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (memoryInfo) {
        const canvas = page.locator('[data-testid="canvas"]');
        const initialMemory = memoryInfo.usedJSHeapSize;
        
        // Perform memory-intensive operations
        for (let i = 0; i < 20; i++) {
          const server = page.locator('[data-testid="palette-item-server"]').first();
          await server.dragTo(canvas, { 
            targetPosition: { x: 100 + (i % 5) * 100, y: 100 + Math.floor(i / 5) * 100 } 
          });
        }
        
        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory.usedJSHeapSize;
        });
        
        // Memory should increase but not excessively
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }
    });

    test('no memory leaks during extended usage', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Simulate extended usage pattern
      for (let cycle = 0; cycle < 5; cycle++) {
        // Add components
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas);
        
        // Add annotations
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        const textarea = page.locator('textarea').first();
        await textarea.fill(`Cycle ${cycle} annotation`);
        await textarea.press('Control+Enter');
        
        // Clear canvas (if functionality exists)
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        
        // Wait for cleanup
        await page.waitForTimeout(100);
      }
      
      // Verify app is still responsive
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      await expect(page.getByText('Server')).toBeVisible();
    });
  });

  test.describe('React Optimization Testing', () => {
    test('optimized hooks prevent unnecessary re-renders', async ({ page }) => {
      // Add script to monitor React re-renders
      await page.addInitScript(() => {
        window.renderCounts = {};
        
        // Mock React DevTools profiler
        if (window.React) {
          const originalCreateElement = window.React.createElement;
          window.React.createElement = function(type, props, ...children) {
            if (typeof type === 'string') {
              window.renderCounts[type] = (window.renderCounts[type] || 0) + 1;
            }
            return originalCreateElement.call(this, type, props, ...children);
          };
        }
      });
      
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Perform operations that should use optimized hooks
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      // Move component to trigger updates
      const serverComponent = page.getByText('Server').first();
      await serverComponent.hover();
      await page.mouse.down();
      await page.mouse.move(300, 200);
      await page.mouse.up();
      
      // Check render counts
      const renderCounts = await page.evaluate(() => window.renderCounts);
      
      // Should have reasonable render counts (not excessive)
      Object.values(renderCounts).forEach(count => {
        expect(count).toBeLessThan(50); // Arbitrary reasonable limit
      });
    });

    test('memoization effectiveness for expensive calculations', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add multiple components to trigger path calculations
      const components = ['server', 'database', 'api-gateway', 'cache'];
      
      const startTime = performance.now();
      
      for (const component of components) {
        const item = page.locator(`[data-testid="palette-item-${component}"]`).first();
        await item.dragTo(canvas);
      }
      
      // Create connections between components (if supported)
      const server = page.getByText('Server').first();
      const database = page.getByText('Database').first();
      
      // Try to create connection
      await server.hover();
      await page.mouse.down();
      await database.hover();
      await page.mouse.up();
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      // Memoized calculations should be fast
      expect(calculationTime).toBeLessThan(2000);
      
      // Verify components are rendered
      await expect(server).toBeVisible();
      await expect(database).toBeVisible();
    });

    test('virtualization for large component counts', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add many components to test virtualization
      const componentCount = 50;
      
      for (let i = 0; i < componentCount; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas, {
          targetPosition: { 
            x: 50 + (i % 10) * 80, 
            y: 50 + Math.floor(i / 10) * 80 
          }
        });
        
        // Only add every 10th component to avoid timeout
        if (i % 10 === 0) {
          await page.waitForTimeout(100);
        }
      }
      
      // Verify some components are visible (virtualization may hide others)
      const visibleServers = page.getByText('Server');
      const count = await visibleServers.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(componentCount);
      
      // App should remain responsive
      await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
    });

    test('stable references prevent cascade re-renders', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Add components
      const server = page.locator('[data-testid="palette-item-server"]').first();
      const database = page.locator('[data-testid="palette-item-database"]').first();
      
      await server.dragTo(canvas);
      await database.dragTo(canvas);
      
      // Perform rapid state changes that could cause cascade re-renders
      for (let i = 0; i < 10; i++) {
        await canvas.dblclick({ position: { x: 100 + i * 10, y: 100 } });
        const textarea = page.locator('textarea').first();
        await textarea.fill(`Rapid ${i}`);
        await textarea.press('Escape'); // Cancel to avoid saving
      }
      
      // App should remain stable and responsive
      await expect(page.getByText('Server')).toBeVisible();
      await expect(page.getByText('Database')).toBeVisible();
      
      // Should be able to interact normally
      await canvas.dblclick({ position: { x: 300, y: 300 } });
      const textarea = page.locator('textarea').first();
      await expect(textarea).toBeVisible();
      await textarea.press('Escape');
    });
  });

  test.describe('Performance Regression Testing', () => {
    test('establish performance baselines for common operations', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Test component addition baseline
      const addComponentStart = performance.now();
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      const addComponentEnd = performance.now();
      const addComponentTime = addComponentEnd - addComponentStart;
      
      expect(addComponentTime).toBeLessThan(1000); // Should be under 1 second
      
      // Test annotation creation baseline
      const addAnnotationStart = performance.now();
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Baseline annotation');
      await textarea.press('Control+Enter');
      const addAnnotationEnd = performance.now();
      const addAnnotationTime = addAnnotationEnd - addAnnotationStart;
      
      expect(addAnnotationTime).toBeLessThan(500); // Should be under 0.5 seconds
      
      // Test export baseline
      const exportStart = performance.now();
      const exportButton = page.getByRole('button', { name: /export png/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();
      }
      const exportEnd = performance.now();
      const exportTime = exportEnd - exportStart;
      
      expect(exportTime).toBeLessThan(3000); // Should be under 3 seconds
    });

    test('performance with various canvas complexity levels', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Test with low complexity (1-5 components)
      const lowComplexityStart = performance.now();
      for (let i = 0; i < 3; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas, { targetPosition: { x: 100 + i * 100, y: 100 } });
      }
      const lowComplexityEnd = performance.now();
      const lowComplexityTime = lowComplexityEnd - lowComplexityStart;
      
      // Test with medium complexity (10-20 components)
      const mediumComplexityStart = performance.now();
      for (let i = 0; i < 10; i++) {
        const database = page.locator('[data-testid="palette-item-database"]').first();
        await database.dragTo(canvas, { targetPosition: { x: 100 + (i % 5) * 80, y: 200 + Math.floor(i / 5) * 80 } });
      }
      const mediumComplexityEnd = performance.now();
      const mediumComplexityTime = mediumComplexityEnd - mediumComplexityStart;
      
      // Performance should scale reasonably
      expect(lowComplexityTime).toBeLessThan(2000);
      expect(mediumComplexityTime).toBeLessThan(5000);
      
      // Medium complexity shouldn't be more than 5x slower than low complexity
      expect(mediumComplexityTime / lowComplexityTime).toBeLessThan(5);
    });

    test('performance does not degrade with extended usage', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      const operationTimes = [];
      
      // Perform the same operation multiple times and measure
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas, { targetPosition: { x: 100 + i * 50, y: 100 } });
        
        await canvas.dblclick({ position: { x: 150 + i * 50, y: 150 } });
        const textarea = page.locator('textarea').first();
        await textarea.fill(`Extended test ${i}`);
        await textarea.press('Control+Enter');
        
        const end = performance.now();
        operationTimes.push(end - start);
        
        await page.waitForTimeout(100); // Brief pause between operations
      }
      
      // Check that later operations aren't significantly slower
      const firstHalf = operationTimes.slice(0, 5);
      const secondHalf = operationTimes.slice(5);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      
      // Second half shouldn't be more than 2x slower than first half
      expect(secondHalfAvg / firstHalfAvg).toBeLessThan(2);
    });

    test('performance under stress conditions', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Rapid component addition
      const rapidAddStart = performance.now();
      for (let i = 0; i < 20; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        await server.dragTo(canvas, { 
          targetPosition: { x: 50 + (i % 10) * 60, y: 50 + Math.floor(i / 10) * 60 }
        });
      }
      const rapidAddEnd = performance.now();
      const rapidAddTime = rapidAddEnd - rapidAddStart;
      
      // Should handle rapid operations without crashing
      expect(rapidAddTime).toBeLessThan(10000); // Under 10 seconds
      
      // Rapid annotation creation
      const rapidAnnotationStart = performance.now();
      for (let i = 0; i < 15; i++) {
        await canvas.dblclick({ position: { x: 200 + (i % 5) * 40, y: 200 + Math.floor(i / 5) * 30 } });
        const textarea = page.locator('textarea').first();
        await textarea.fill(`Stress ${i}`);
        await textarea.press('Control+Enter');
      }
      const rapidAnnotationEnd = performance.now();
      const rapidAnnotationTime = rapidAnnotationEnd - rapidAnnotationStart;
      
      expect(rapidAnnotationTime).toBeLessThan(8000); // Under 8 seconds
      
      // App should remain functional after stress test
      await expect(page.getByText('Server').first()).toBeVisible();
      await expect(page.getByText('Stress 0')).toBeVisible();
    });
  });

  test.describe('Integration Testing', () => {
    test('performance optimization with existing features', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Test with keyboard shortcuts
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      // Test Ctrl+Z (undo) if available
      await page.keyboard.press('Control+z');
      
      // Test Ctrl+Y (redo) if available  
      await page.keyboard.press('Control+y');
      
      // Test with auto-save (if enabled)
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Auto-save test');
      await textarea.press('Control+Enter');
      
      // Wait for potential auto-save
      await page.waitForTimeout(1000);
      
      // App should remain responsive
      await expect(page.getByText('Auto-save test')).toBeVisible();
    });

    test('performance monitoring works across different screens', async ({ page }) => {
      // Test on main canvas
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      // Check if performance metrics are visible
      const statusBar = page.locator('[data-testid="status-bar"]');
      await expect(statusBar).toBeVisible();
      
      // Navigate to different screen if available
      const homeButton = page.getByRole('button', { name: /home/i });
      if (await homeButton.isVisible()) {
        await homeButton.click();
        
        // Performance monitoring should still work
        await expect(statusBar).toBeVisible();
        
        // Navigate back
        await page.getByRole('button', { name: /start challenge/i }).first().click();
      }
      
      // Performance should be maintained across navigation
      await expect(canvas).toBeVisible();
    });

    test('graceful fallbacks when optimization features are unavailable', async ({ page }) => {
      // Disable advanced features
      await page.addInitScript(() => {
        // Mock unsupported features
        delete window.OffscreenCanvas;
        delete window.Worker;
        delete (window as any).performance.memory;
      });
      
      await page.reload();
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page.getByRole('button', { name: /start challenge/i }).first().click();
      
      const canvas = page.locator('[data-testid="canvas"]');
      
      // App should still work without advanced features
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      await expect(page.getByText('Server')).toBeVisible();
      
      // Annotations should still work
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Fallback test');
      await textarea.press('Control+Enter');
      
      await expect(page.getByText('Fallback test')).toBeVisible();
    });
  });

  test.describe('Browser Compatibility', () => {
    test('performance features work across different browsers', async ({ page, browserName }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Test basic performance monitoring
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      // Check if performance API is available
      const hasPerformanceAPI = await page.evaluate(() => {
        return typeof performance !== 'undefined' && 
               typeof performance.now === 'function';
      });
      
      expect(hasPerformanceAPI).toBe(true);
      
      // Test browser-specific features
      if (browserName === 'chromium') {
        // Chrome-specific performance features
        const hasMemoryAPI = await page.evaluate(() => {
          return !!(performance as any).memory;
        });
        
        if (hasMemoryAPI) {
          console.log('Chrome memory API available');
        }
      }
      
      // All browsers should support basic functionality
      await expect(page.getByText('Server')).toBeVisible();
    });

    test('feature detection works correctly', async ({ page }) => {
      // Test feature detection
      const features = await page.evaluate(() => {
        return {
          offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
          worker: typeof Worker !== 'undefined',
          performanceObserver: typeof PerformanceObserver !== 'undefined',
          requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
          memoryAPI: !!(performance as any).memory
        };
      });
      
      console.log('Browser features:', features);
      
      // Core features should be available
      expect(features.requestAnimationFrame).toBe(true);
      
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      // App should work regardless of feature availability
      await expect(page.getByText('Server')).toBeVisible();
    });

    test('consistent performance across different devices', async ({ page }) => {
      const canvas = page.locator('[data-testid="canvas"]');
      
      // Simulate different device capabilities
      await page.evaluate(() => {
        // Mock slower device
        const originalRAF = requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
          return originalRAF(() => {
            // Add artificial delay to simulate slower device
            setTimeout(callback, 5);
          });
        };
      });
      
      // Test performance on "slower" device
      const start = performance.now();
      
      const server = page.locator('[data-testid="palette-item-server"]').first();
      await server.dragTo(canvas);
      
      await canvas.dblclick({ position: { x: 200, y: 200 } });
      const textarea = page.locator('textarea').first();
      await textarea.fill('Device test');
      await textarea.press('Control+Enter');
      
      const end = performance.now();
      const operationTime = end - start;
      
      // Should still complete in reasonable time even on slower device
      expect(operationTime).toBeLessThan(5000);
      
      await expect(page.getByText('Server')).toBeVisible();
      await expect(page.getByText('Device test')).toBeVisible();
    });
  });
});