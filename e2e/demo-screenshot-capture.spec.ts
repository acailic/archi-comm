// e2e/demo-screenshot-capture.spec.ts
// Dedicated Playwright suite for generating high-quality marketing screenshots
// Produces curated captures across feature showcases, architectures, workflows, and responsive states
// RELEVANT FILES: e2e/utils/screenshot-helpers.ts, e2e/utils/video-helpers.ts, e2e/utils/test-helpers.ts, tools/scripts/generate-demo-screenshots.js

import { expect, test } from '@playwright/test';
import type { ConsoleMessage, TestInfo } from '@playwright/test';

import { createHelpers } from './utils/test-helpers';
import { createScreenshotHelpers, ScreenshotSequenceStep } from './utils/screenshot-helpers';
import { createVideoHelpers } from './utils/video-helpers';
import { demoScenarios } from './utils/demo-scenarios';
import { isScreenshotMode } from './utils/env';

const SCREENSHOT_MODE = isScreenshotMode();

const annotateScreenshotTest = (testInfo: TestInfo, category: string) => {
  testInfo.annotations.push({ type: 'tag', description: '@screenshots' });
  testInfo.annotations.push({ type: 'tag', description: `@screenshots:${category}` });
};

async function prepareCanvas(page: Parameters<typeof test>[0]['page']) {
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.addInitScript(() => {
    (window as any).SCREENSHOT_MODE = true;
    document.documentElement.style.setProperty('--animation-duration', '0s');
    document.documentElement.style.setProperty('--transition-duration', '0s');
  });

  await page.addInitScript(() => {
    document.documentElement.style.fontSmooth = 'always';
    document.documentElement.style.webkitFontSmoothing = 'antialiased';
  });
}

test.describe('Demo Screenshot Capture', () => {
  test.skip(!SCREENSHOT_MODE, 'Screenshots run only when SCREENSHOT_MODE is enabled');

  test.beforeEach(async ({ page }) => {
    await prepareCanvas(page);
  });

  test('Feature showcase marketing captures', async ({ page, context }, testInfo) => {
    annotateScreenshotTest(testInfo, 'feature-showcase');
    const helpers = createHelpers(page);
    const screenshotHelpers = createScreenshotHelpers(page, context);
    const videoHelpers = createVideoHelpers(page, context);

    await screenshotHelpers.enableAnnotationMode();

    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.clearCanvas();

    const paletteCapture = await screenshotHelpers.captureScreenshot('component-palette', {
      category: 'feature-showcase',
      scenario: 'palette-overview',
      step: 'palette',
      element: page.locator('[data-testid*="palette"]').first(),
      metadata: {
        description: 'Component palette with categorized building blocks',
      }
    });
    console.log(`📸 Saved palette capture: ${paletteCapture.relativePath}`);

    await helpers.canvas.addComponent('load-balancer', { x: 320, y: 340 });
    await helpers.canvas.addComponent('api-gateway', { x: 520, y: 340 });
    await helpers.canvas.addComponent('server', { x: 720, y: 300 });
    await helpers.canvas.addComponent('database', { x: 920, y: 360 });

    await videoHelpers.connectByLabels('Load Balancer', 'API Gateway');
    await videoHelpers.connectByLabels('API Gateway', 'Server');
    await videoHelpers.connectByLabels('Server', 'Database');

    await helpers.canvas.addAnnotation('Resilient web architecture', { x: 760, y: 140 });

    const dragCapture = await screenshotHelpers.captureScreenshot('architecture-in-progress', {
      category: 'feature-showcase',
      scenario: 'architecture-build',
      step: 'canvas-overview',
      metadata: {
        components: 4,
        connections: 3,
        annotations: 1,
      }
    });
    console.log(`📸 Saved architecture capture: ${dragCapture.relativePath}`);

    const exportButton = page.getByRole('button', { name: /export/i }).first();
    if (await exportButton.isVisible()) {
      await screenshotHelpers.highlightComponents([exportButton]);
      const exportCapture = await screenshotHelpers.captureScreenshot('export-dialog', {
        category: 'feature-showcase',
        scenario: 'export-options',
        step: 'export',
        element: exportButton,
        metadata: { description: 'Export controls ready for sharing' }
      });
      console.log(`📸 Saved export capture: ${exportCapture.relativePath}`);
    }
  });

  test('Architecture portfolio gallery', async ({ page, context }, testInfo) => {
    annotateScreenshotTest(testInfo, 'architecture-examples');
    const helpers = createHelpers(page);
    const screenshotHelpers = createScreenshotHelpers(page, context);
    const videoHelpers = createVideoHelpers(page, context);

    await screenshotHelpers.enableAnnotationMode();

    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.clearCanvas();

    const scenariosToCapture = [
      demoScenarios.ecommerceReference,
      demoScenarios.microservicesBlueprint,
      demoScenarios.cloudNativeEvolution,
    ];

    for (const scenario of scenariosToCapture) {
      console.log(`🎯 Executing scenario: ${scenario.title}`);
      await helpers.canvas.clearCanvas();
      for (const step of scenario.steps) {
        switch (step.type) {
          case 'addComponent':
            if (step.componentType && step.position) {
              await helpers.canvas.addComponent(step.componentType, step.position);
            }
            break;
          case 'connect':
            if (step.from && step.to) {
              await videoHelpers.tryConnectByLabels(step.from, step.to);
            }
            break;
          case 'annotate':
          case 'annotation':
            if (step.text && step.annotationPosition) {
              await helpers.canvas.addAnnotation(step.text, step.annotationPosition);
            }
            break;
          default:
            break;
        }
      }

      const capture = await screenshotHelpers.captureScreenshot(scenario.title, {
        category: 'architecture-examples',
        scenario: scenario.title,
        step: 'final-layout',
        metadata: {
          scenarioTitle: scenario.title,
          description: scenario.description,
          estimatedDuration: scenario.duration,
        },
      });

      console.log(`📸 Saved architecture capture: ${capture.relativePath}`);
    }
  });

  test('Workflow stage milestones', async ({ page, context }, testInfo) => {
    annotateScreenshotTest(testInfo, 'workflow-stages');
    const helpers = createHelpers(page);
    const screenshotHelpers = createScreenshotHelpers(page, context);

    await screenshotHelpers.enableAnnotationMode();

    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.clearCanvas();

    const workflowSteps: ScreenshotSequenceStep[] = [
      {
        name: 'blank-canvas',
        category: 'workflow-stages',
        scenario: 'project-lifecycle',
        step: 'empty',
        metadata: { description: 'Empty canvas ready for ideation' }
      }
    ];

    await screenshotHelpers.captureSequence(workflowSteps);

    await helpers.canvas.addComponent('web-app', { x: 320, y: 320 });
    await helpers.canvas.addComponent('server', { x: 520, y: 300 });
    await helpers.canvas.addComponent('database', { x: 720, y: 340 });

    await screenshotHelpers.addOverlayText('Design in progress', { x: 840, y: 120 }, 0);
    await screenshotHelpers.captureScreenshot('design-in-progress', {
      category: 'workflow-stages',
      scenario: 'project-lifecycle',
      step: 'in-progress',
      metadata: {
        description: 'Core services placed on canvas',
      }
    });

    await helpers.canvas.addAnnotation('Document data flow', { x: 900, y: 200 });
    await screenshotHelpers.captureScreenshot('annotation-phase', {
      category: 'workflow-stages',
      scenario: 'project-lifecycle',
      step: 'annotation',
      metadata: {
        description: 'Annotations added for clarity',
      }
    });

    const exportButton = page.getByRole('button', { name: /export/i }).first();
    await expect(exportButton).toBeVisible();
    await screenshotHelpers.captureScreenshot('export-ready', {
      category: 'workflow-stages',
      scenario: 'project-lifecycle',
      step: 'export-ready',
      element: exportButton,
      metadata: { description: 'Ready to share with stakeholders' }
    });
  });

  test('Responsive layout gallery', async ({ page, context }, testInfo) => {
    annotateScreenshotTest(testInfo, 'responsive-views');
    const helpers = createHelpers(page);
    const screenshotHelpers = createScreenshotHelpers(page, context);

    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.clearCanvas();

    await helpers.canvas.addComponent('mobile-client', { x: 280, y: 360 });
    await helpers.canvas.addComponent('api-gateway', { x: 520, y: 340 });
    await helpers.canvas.addComponent('server', { x: 760, y: 320 });

    await screenshotHelpers.captureScreenshot('desktop-hd', {
      category: 'responsive-views',
      scenario: 'responsive-gallery',
      step: 'desktop-hd',
      metadata: { viewport: 'desktop-hd' }
    });

    await screenshotHelpers.setDemoViewport('tablet');
    await screenshotHelpers.captureScreenshot('tablet-view', {
      category: 'responsive-views',
      scenario: 'responsive-gallery',
      step: 'tablet',
      metadata: { viewport: 'tablet' }
    });

    await screenshotHelpers.setDemoViewport('mobile');
    await screenshotHelpers.captureScreenshot('mobile-view', {
      category: 'responsive-views',
      scenario: 'responsive-gallery',
      step: 'mobile',
      metadata: { viewport: 'mobile' }
    });

    await screenshotHelpers.setDemoViewport('desktop-4k');
    await screenshotHelpers.captureScreenshot('desktop-4k', {
      category: 'responsive-views',
      scenario: 'responsive-gallery',
      step: 'desktop-4k',
      metadata: { viewport: 'desktop-4k' }
    });
  });

  test('Interactive moments gallery', async ({ page, context }, testInfo) => {
    annotateScreenshotTest(testInfo, 'ui-states');
    const helpers = createHelpers(page);
    const screenshotHelpers = createScreenshotHelpers(page, context);
    const videoHelpers = createVideoHelpers(page, context);

    await screenshotHelpers.enableAnnotationMode();

    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.clearCanvas();

    await helpers.canvas.addComponent('monolith', { x: 360, y: 320 });

    await screenshotHelpers.captureScreenshot('monolith-baseline', {
      category: 'ui-states',
      scenario: 'before-after',
      step: 'baseline',
      metadata: { description: 'Legacy monolith before modernization' }
    });

    await helpers.canvas.addComponent('api-gateway', { x: 620, y: 280 });
    await helpers.canvas.addComponent('microservice', { x: 820, y: 240 });
    await helpers.canvas.addComponent('microservice', { x: 820, y: 320 });
    await helpers.canvas.addComponent('microservice', { x: 820, y: 400 });
    await helpers.canvas.addComponent('event-stream', { x: 1020, y: 320 });
    await videoHelpers.tryConnectByLabels('API Gateway', 'Microservice');

    await screenshotHelpers.captureScreenshot('microservices-target', {
      category: 'ui-states',
      scenario: 'before-after',
      step: 'target',
      metadata: { description: 'Cloud-native target architecture' }
    });

    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click({ button: 'right' });
    await screenshotHelpers.captureScreenshot('context-menu', {
      category: 'ui-states',
      scenario: 'interactive-gallery',
      step: 'context-menu',
      metadata: { description: 'Component context menu open' }
    });

    await screenshotHelpers.addOverlayText('Connection suggestions', { x: 1180, y: 180 }, 0);
    await videoHelpers.drawRegion(1140, 140, 220, 180, 'AI Suggestions');

    await screenshotHelpers.captureScreenshot('ai-suggestions', {
      category: 'ui-states',
      scenario: 'interactive-gallery',
      step: 'ai-overlay',
      metadata: { description: 'AI assistant recommendations surfaced' }
    });
  });

  test('Masks skip missing locators gracefully', async ({ page, context }, testInfo) => {
    annotateScreenshotTest(testInfo, 'utilities');

    const warnings: string[] = [];
    const handleConsole = (message: ConsoleMessage) => {
      if (message.type() === 'warning') {
        warnings.push(message.text());
      }
    };
    page.on('console', handleConsole);

    const helpers = createHelpers(page);
    const screenshotHelpers = createScreenshotHelpers(page, context);

    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.clearCanvas();

    const capture = await screenshotHelpers.captureScreenshot('mask-sanity-check', {
      category: 'utilities',
      scenario: 'mask-verification',
      step: 'missing-targets',
      mask: ['[data-testid="does-not-exist"]', page.locator('[data-testid="canvas-container"]')],
    });

    expect(capture.relativePath.startsWith('runs/')).toBe(true);
    expect(warnings.some((text) => text.includes('Skipping mask; no matches'))).toBe(true);

    page.off('console', handleConsole);
  });
});
