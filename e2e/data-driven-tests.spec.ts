// e2e/data-driven-tests.spec.ts
// Data-driven testing using test fixtures and utilities
// Demonstrates usage of test data management and helper functions
// RELEVANT FILES: e2e/utils/test-data-manager.ts, e2e/utils/test-helpers.ts

import { test, expect } from '@playwright/test';
import { testDataManager, testStateManager } from './utils/test-data-manager';
import { createHelpers } from './utils/test-helpers';

test.describe('Data-Driven Testing', () => {
  test.describe('Design Fixture Tests', () => {
    const fixtures = ['simple-web-app', 'microservices', 'mobile-backend'];

    fixtures.forEach(fixtureName => {
      test(`can create and verify ${fixtureName} design`, async ({ page }) => {
        const helpers = createHelpers(page);
        const design = testDataManager.getFixture(fixtureName);

        expect(design).toBeDefined();

        // Navigate to canvas
        await helpers.canvas.navigateToCanvas();

        // Apply the design fixture
        await testDataManager.applyDesignToCanvas(page, design!);

        // Verify the design was applied correctly
        const isValid = await testDataManager.verifyDesignOnCanvas(page, design!);
        expect(isValid).toBe(true);

        // Verify component count matches
        const componentCount = await helpers.canvas.getComponentCount();
        expect(componentCount).toBe(design!.components.length);

        // Take screenshot for visual verification
        await expect(page).toHaveScreenshot(`${fixtureName}-design.png`);
      });
    });

    test('can modify existing design fixtures', async ({ page }) => {
      const helpers = createHelpers(page);
      const originalDesign = testDataManager.getFixture('simple-web-app')!;

      await helpers.canvas.navigateToCanvas();
      await testDataManager.applyDesignToCanvas(page, originalDesign);

      // Add additional components
      await helpers.canvas.addComponent('cache', { x: 500, y: 150 });
      await helpers.canvas.addAnnotation('Additional caching layer', { x: 500, y: 250 });

      // Verify modifications
      const finalComponentCount = await helpers.canvas.getComponentCount();
      expect(finalComponentCount).toBe(originalDesign.components.length + 1);

      await helpers.assert.assertAnnotationExists('Additional caching layer');

      // Export modified design
      const exportedData = await testDataManager.exportDesignData(page);
      expect(exportedData.components.length).toBeGreaterThan(originalDesign.components.length);
    });

    test('can combine multiple design fixtures', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Get components from different fixtures
      const webAppDesign = testDataManager.getFixture('simple-web-app')!;
      const microservicesDesign = testDataManager.getFixture('microservices')!;

      // Add web app components
      for (const component of webAppDesign.components.slice(0, 2)) {
        await helpers.canvas.addComponent(component.type, component.position);
      }

      // Add microservices components with offset
      for (const component of microservicesDesign.components.slice(0, 2)) {
        await helpers.canvas.addComponent(component.type, {
          x: component.position.x + 300,
          y: component.position.y + 200,
        });
      }

      // Verify combined design
      const totalComponents = await helpers.canvas.getComponentCount();
      expect(totalComponents).toBe(4);

      await expect(page).toHaveScreenshot('combined-design.png');
    });
  });

  test.describe('Random Design Generation', () => {
    [5, 10, 15, 20].forEach(componentCount => {
      test(`can handle randomly generated design with ${componentCount} components`, async ({
        page,
      }) => {
        const helpers = createHelpers(page);
        const randomDesign = testDataManager.createRandomDesign(componentCount);

        await helpers.canvas.navigateToCanvas();

        const startTime = performance.now();
        await testDataManager.applyDesignToCanvas(page, randomDesign);
        const endTime = performance.now();

        const creationTime = endTime - startTime;
        console.log(`Created ${componentCount} components in ${creationTime}ms`);

        // Verify creation performance
        expect(creationTime).toBeLessThan(componentCount * 500); // 500ms per component max

        // Verify all components were created
        const actualComponentCount = await helpers.canvas.getComponentCount();
        expect(actualComponentCount).toBe(componentCount);

        // Test interaction with large design
        await helpers.canvas.selectComponent(randomDesign.components[0].name);
        await helpers.canvas.zoomOut(2);
        await helpers.canvas.resetZoom();

        // Verify responsiveness
        await helpers.assert.assertPageResponsive();
      });
    });

    test('performance remains stable with repeated random generation', async ({ page }) => {
      const helpers = createHelpers(page);
      const performanceMetrics: number[] = [];

      await helpers.canvas.navigateToCanvas();

      // Generate and apply 5 different random designs
      for (let i = 0; i < 5; i++) {
        const randomDesign = testDataManager.createRandomDesign(8);

        const startTime = performance.now();

        // Clear previous design
        await helpers.canvas.clearCanvas();

        // Apply new design
        await testDataManager.applyDesignToCanvas(page, randomDesign);

        const endTime = performance.now();
        const iterationTime = endTime - startTime;

        performanceMetrics.push(iterationTime);
        console.log(`Iteration ${i + 1}: ${iterationTime}ms`);

        // Verify design was applied
        const componentCount = await helpers.canvas.getComponentCount();
        expect(componentCount).toBe(8);
      }

      // Analyze performance stability
      const avgTime = performanceMetrics.reduce((a, b) => a + b) / performanceMetrics.length;
      const maxTime = Math.max(...performanceMetrics);
      const minTime = Math.min(...performanceMetrics);

      console.log(`Performance metrics - Avg: ${avgTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);

      // Performance should be consistent
      expect(maxTime - minTime).toBeLessThan(avgTime); // Variation should be less than average
      expect(avgTime).toBeLessThan(10000); // Average under 10 seconds
    });
  });

  test.describe('State Management Testing', () => {
    test('can save and restore page state', async ({ page }) => {
      const helpers = createHelpers(page);

      // Create initial state
      await helpers.canvas.navigateToCanvas();
      const design = testDataManager.getFixture('simple-web-app')!;
      await testDataManager.applyDesignToCanvas(page, design);

      // Save state
      await testStateManager.savePageState(page, 'test-state-1');

      // Modify state
      await helpers.canvas.addComponent('cache', { x: 600, y: 200 });
      await helpers.canvas.addAnnotation('Modified state', { x: 600, y: 300 });

      // Verify modification
      let componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(design.components.length + 1);

      // Restore previous state
      const restored = await testStateManager.restorePageState(page, 'test-state-1');
      expect(restored).toBe(true);

      await helpers.canvas.navigateToCanvas();

      // Verify state was restored
      componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(design.components.length);

      // Verify modification is gone
      const modifiedAnnotation = page.getByText('Modified state');
      const annotationCount = await modifiedAnnotation.count();
      expect(annotationCount).toBe(0);
    });

    test('can handle multiple saved states', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create and save state 1
      const design1 = testDataManager.getFixture('simple-web-app')!;
      await testDataManager.applyDesignToCanvas(page, design1);
      await testStateManager.savePageState(page, 'multi-state-1');

      // Create and save state 2
      await helpers.canvas.clearCanvas();
      const design2 = testDataManager.getFixture('microservices')!;
      await testDataManager.applyDesignToCanvas(page, design2);
      await testStateManager.savePageState(page, 'multi-state-2');

      // Create and save state 3
      await helpers.canvas.clearCanvas();
      await helpers.canvas.addComponent('server');
      await helpers.canvas.addComponent('database');
      await testStateManager.savePageState(page, 'multi-state-3');

      // Restore state 1
      await testStateManager.restorePageState(page, 'multi-state-1');
      await helpers.canvas.navigateToCanvas();

      let componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(design1.components.length);

      // Restore state 2
      await testStateManager.restorePageState(page, 'multi-state-2');
      await helpers.canvas.navigateToCanvas();

      componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(design2.components.length);

      // Restore state 3
      await testStateManager.restorePageState(page, 'multi-state-3');
      await helpers.canvas.navigateToCanvas();

      componentCount = await helpers.canvas.getComponentCount();
      expect(componentCount).toBe(2);
    });

    test('can persist state across page reloads', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create design with local storage key
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addAnnotation('Persistent test', { x: 300, y: 300 });

      // Force save to local storage
      await page.evaluate(() => {
        localStorage.setItem(
          'test-persistence',
          JSON.stringify({
            timestamp: new Date().toISOString(),
            testData: 'persistent-test-value',
          })
        );
      });

      // Reload page
      await page.reload();
      await helpers.canvas.navigateToCanvas();

      // Check if local storage persisted
      const persistedData = await page.evaluate(() => {
        return localStorage.getItem('test-persistence');
      });

      expect(persistedData).toBeTruthy();

      const parsedData = JSON.parse(persistedData!);
      expect(parsedData.testData).toBe('persistent-test-value');
    });
  });

  test.describe('Scenario-Based Testing', () => {
    test('can execute all predefined test scenarios', async ({ page }) => {
      const helpers = createHelpers(page);
      const scenarios = testDataManager.generateTestScenarios();

      for (const scenario of scenarios) {
        console.log(`Executing scenario: ${scenario.name}`);

        // Reset state
        await helpers.canvas.navigateToCanvas();
        await helpers.canvas.clearCanvas();

        // Execute scenario setup
        await scenario.setup();

        // Apply relevant design if scenario has one
        if (scenario.name.includes('Simple Web App')) {
          const design = testDataManager.getFixture('simple-web-app')!;
          await testDataManager.applyDesignToCanvas(page, design);
        } else if (scenario.name.includes('Microservices')) {
          const design = testDataManager.getFixture('microservices')!;
          await testDataManager.applyDesignToCanvas(page, design);
        } else if (scenario.name.includes('Performance')) {
          const design = testDataManager.getFixture('performance-test')!;
          await testDataManager.applyDesignToCanvas(page, design);
        }

        // Verify scenario completion
        const isValid = await scenario.verify(page);
        expect(isValid).toBe(true);

        console.log(`✓ Scenario completed: ${scenario.name}`);
      }
    });

    test('can handle scenario failures gracefully', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create a scenario that might fail
      const mockScenario = {
        name: 'Intentional Failure Test',
        description: 'Tests error handling in scenarios',
        setup: async () => {
          // Simulate setup that might fail
          throw new Error('Simulated setup failure');
        },
        verify: async (page: any) => {
          return false; // Always fail
        },
      };

      // Execute failing scenario
      let setupFailed = false;
      try {
        await mockScenario.setup();
      } catch (error) {
        setupFailed = true;
      }

      expect(setupFailed).toBe(true);

      // App should still be functional after scenario failure
      await helpers.canvas.addComponent('server');
      await helpers.assert.assertComponentExists('Server');
      await helpers.assert.assertPageResponsive();
    });
  });

  test.describe('Test Data Validation', () => {
    test('validates fixture data integrity', async ({ page }) => {
      const allFixtures = testDataManager.getAllFixtures();

      for (const [name, design] of allFixtures) {
        // Validate design structure
        expect(design.name).toBeTruthy();
        expect(design.description).toBeTruthy();
        expect(design.components).toBeInstanceOf(Array);
        expect(design.annotations).toBeInstanceOf(Array);

        // Validate components
        for (const component of design.components) {
          expect(component.type).toBeTruthy();
          expect(component.position).toHaveProperty('x');
          expect(component.position).toHaveProperty('y');
          expect(typeof component.position.x).toBe('number');
          expect(typeof component.position.y).toBe('number');
        }

        // Validate annotations
        for (const annotation of design.annotations) {
          expect(annotation.text).toBeTruthy();
          expect(annotation.position).toHaveProperty('x');
          expect(annotation.position).toHaveProperty('y');
          expect(typeof annotation.position.x).toBe('number');
          expect(typeof annotation.position.y).toBe('number');
        }

        console.log(`✓ Fixture '${name}' validation passed`);
      }
    });

    test('validates random design generation parameters', async ({ page }) => {
      const testCounts = [1, 5, 10, 25, 50];

      for (const count of testCounts) {
        const randomDesign = testDataManager.createRandomDesign(count);

        expect(randomDesign.components).toHaveLength(count);
        expect(randomDesign.name).toBeTruthy();
        expect(randomDesign.description).toBeTruthy();

        // Validate random positions are within reasonable bounds
        for (const component of randomDesign.components) {
          expect(component.position.x).toBeGreaterThanOrEqual(100);
          expect(component.position.x).toBeLessThanOrEqual(500);
          expect(component.position.y).toBeGreaterThanOrEqual(100);
          expect(component.position.y).toBeLessThanOrEqual(400);
        }

        console.log(`✓ Random design with ${count} components validated`);
      }
    });

    test('validates exported design data format', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Create test design
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addAnnotation('Test export data', { x: 300, y: 300 });

      // Export design data
      const exportedData = await testDataManager.exportDesignData(page);

      // Validate exported data structure
      expect(exportedData).toHaveProperty('components');
      expect(exportedData).toHaveProperty('annotations');
      expect(exportedData).toHaveProperty('timestamp');

      expect(exportedData.components).toBeInstanceOf(Array);
      expect(exportedData.annotations).toBeInstanceOf(Array);
      expect(exportedData.timestamp).toBeTruthy();

      // Validate timestamp format
      const timestamp = new Date(exportedData.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();

      console.log('Exported data structure:', {
        componentCount: exportedData.components.length,
        annotationCount: exportedData.annotations.length,
        timestamp: exportedData.timestamp,
      });
    });
  });

  test.describe('Performance with Test Data', () => {
    test('measures fixture application performance', async ({ page }) => {
      const helpers = createHelpers(page);
      const fixtures = ['simple-web-app', 'microservices', 'mobile-backend', 'performance-test'];
      const performanceResults: Record<string, number> = {};

      for (const fixtureName of fixtures) {
        const design = testDataManager.getFixture(fixtureName)!;

        await helpers.canvas.navigateToCanvas();
        await helpers.canvas.clearCanvas();

        const startTime = performance.now();
        await testDataManager.applyDesignToCanvas(page, design);
        const endTime = performance.now();

        const applicationTime = endTime - startTime;
        performanceResults[fixtureName] = applicationTime;

        console.log(
          `${fixtureName}: ${applicationTime}ms (${design.components.length} components, ${design.annotations.length} annotations)`
        );

        // Verify application was successful
        const isValid = await testDataManager.verifyDesignOnCanvas(page, design);
        expect(isValid).toBe(true);
      }

      // Analyze performance patterns
      const times = Object.values(performanceResults);
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Performance summary - Average: ${avgTime}ms, Max: ${maxTime}ms`);

      // Performance should be reasonable
      expect(maxTime).toBeLessThan(30000); // 30 seconds max for largest fixture
      expect(avgTime).toBeLessThan(15000); // 15 seconds average
    });

    test('compares manual vs fixture-based design creation', async ({ page }) => {
      const helpers = createHelpers(page);

      // Manual design creation
      await helpers.canvas.navigateToCanvas();

      const manualStartTime = performance.now();

      await helpers.canvas.addComponent('server', { x: 150, y: 150 });
      await helpers.canvas.addComponent('database', { x: 350, y: 150 });
      await helpers.canvas.addComponent('load-balancer', { x: 50, y: 150 });
      await helpers.canvas.addAnnotation('Manual server annotation', { x: 150, y: 250 });
      await helpers.canvas.addAnnotation('Manual database annotation', { x: 350, y: 250 });
      await helpers.canvas.addAnnotation('Manual load balancer annotation', { x: 50, y: 250 });

      const manualEndTime = performance.now();
      const manualTime = manualEndTime - manualStartTime;

      // Clear and use fixture
      await helpers.canvas.clearCanvas();

      const fixtureStartTime = performance.now();

      const design = testDataManager.getFixture('simple-web-app')!;
      await testDataManager.applyDesignToCanvas(page, design);

      const fixtureEndTime = performance.now();
      const fixtureTime = fixtureEndTime - fixtureStartTime;

      console.log(`Manual creation: ${manualTime}ms`);
      console.log(`Fixture application: ${fixtureTime}ms`);
      console.log(`Improvement: ${(((manualTime - fixtureTime) / manualTime) * 100).toFixed(1)}%`);

      // Fixture should be faster or comparable
      expect(fixtureTime).toBeLessThanOrEqual(manualTime * 1.5); // Allow 50% tolerance

      // Both should result in similar component counts
      const manualComponents = await helpers.canvas.getComponentCount();
      expect(manualComponents).toBe(design.components.length);
    });
  });
});
