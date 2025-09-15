// e2e/demo-video-recording.spec.ts
// Demo video recording tests for marketing and demonstration purposes
// Generates high-quality videos showcasing ArchiComm's key features and workflows
// RELEVANT FILES: e2e/utils/video-helpers.ts, e2e/utils/test-helpers.ts, playwright.config.ts, e2e/utils/demo-scenarios.ts

import { test, expect } from '@playwright/test';
import { createHelpers } from './utils/test-helpers';
import { createVideoHelpers } from './utils/video-helpers';
import { demoScenarios } from './utils/demo-scenarios';

test.describe('Demo Video Recording', () => {
  // Configure for demo video recording
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for professional demos
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Disable animations for smooth recording
    await page.addInitScript(() => {
      (window as any).DISABLE_ANIMATIONS = true;
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    });

    // Ensure consistent font rendering
    await page.addInitScript(() => {
      document.documentElement.style.fontSmooth = 'always';
      document.documentElement.style.webkitFontSmoothing = 'antialiased';
    });
  });

  test('Feature Overview Demo - 90 Second Showcase', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('feature-overview-demo', {
      quality: 'high',
      frameRate: 30,
      showCursor: true,
      highlightClicks: true
    });

    // 1. App Introduction (0-10s)
    await videoHelpers.addTitle('ArchiComm - Architecture Communication Platform', 3000);
    await page.goto('/');
    await videoHelpers.smoothPause(2000);

    // 2. Navigation to Canvas (10-15s)
    await videoHelpers.highlightAndClick(
      page.getByRole('button', { name: /start your journey/i }),
      'Start Your Journey'
    );
    await videoHelpers.smoothPause(1500);

    await videoHelpers.highlightAndClick(
      page.getByRole('button', { name: /start challenge/i }).first(),
      'Begin Design Challenge'
    );

    // 3. Canvas Introduction (15-25s)
    const canvas = page.locator('[data-testid="canvas"], [data-testid="reactflow-canvas"], [data-testid="canvas-root"]').first();
    await canvas.waitFor({ state: 'visible' });
    await videoHelpers.addAnnotation('Clean, intuitive design canvas', { x: 960, y: 300 }, 2000);
    await videoHelpers.smoothPause(2000);

    // 4. Component Palette Demo (25-40s)
    await videoHelpers.highlightElement(
      page.locator('[data-testid*="palette"]').first(),
      'Drag and drop components',
      2000
    );

    // Add components with smooth animations
    const componentPositions = [
      { type: 'server', x: 300, y: 300, label: 'Web Server' },
      { type: 'database', x: 600, y: 300, label: 'Database' },
      { type: 'cache', x: 450, y: 200, label: 'Cache Layer' },
      { type: 'load-balancer', x: 150, y: 300, label: 'Load Balancer' }
    ];

    for (const comp of componentPositions) {
      await videoHelpers.smoothDragComponent(comp.type, comp.x, comp.y, comp.label);
      await videoHelpers.smoothPause(800);
    }

    // 5. Annotation Demo (40-55s)
    await videoHelpers.addAnnotation('Add explanatory notes anywhere', { x: 960, y: 150 }, 1500);

    await videoHelpers.addAnnotation('High-performance web architecture', { x: 300, y: 400 }, 1500);
    await videoHelpers.smoothPause(1500);

    // 6. Canvas Controls Demo (55-70s)
    await videoHelpers.addAnnotation('Intuitive canvas controls', { x: 1600, y: 200 }, 1500);

    // Zoom demo
    await helpers.canvas.zoomIn(2);
    await videoHelpers.smoothPause(1000);
    await helpers.canvas.resetZoom();
    await videoHelpers.smoothPause(1000);

    // Pan demo
    await helpers.canvas.panCanvas(100, 50);
    await videoHelpers.smoothPause(800);
    await helpers.canvas.panCanvas(-100, -50);

    // 7. Export Demo (70-85s)
    const exportButton = page.getByRole('button', { name: /export/i }).first();
    if (await exportButton.isVisible()) {
      await videoHelpers.highlightAndClick(exportButton, 'Export Your Design');
      await videoHelpers.smoothPause(2000);
    }

    // 8. Conclusion (85-90s)
    await videoHelpers.addTitle('Start designing with ArchiComm today!', 3000);
    await videoHelpers.smoothPause(2000);

    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Demo video saved: ${videoPath}`);
  });

  test('Complete Workflow Demo - 3 Minute Deep Dive', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('complete-workflow-demo', {
      quality: 'ultra',
      frameRate: 60,
      showCursor: true,
      highlightClicks: true
    });

    // Robust navigation to canvas
    await helpers.canvas.navigateToCanvas();

    // Intro
    await videoHelpers.addTitle('ArchiComm Complete Workflow Demo', 2500);
    await videoHelpers.addAnnotation('Clean, intuitive canvas interface', { x: 960, y: 200 }, 2000);

    // Build a simple architecture
    await videoHelpers.smoothDragComponent('load-balancer', 200, 250, 'Add Load Balancer');
    await videoHelpers.smoothDragComponent('api-gateway', 400, 250, 'Add API Gateway');
    await videoHelpers.smoothDragComponent('server', 600, 200, 'Add Web Server');
    await videoHelpers.smoothDragComponent('server', 600, 300, 'Add App Server');
    await videoHelpers.smoothDragComponent('database', 800, 250, 'Add Database');
    await videoHelpers.smoothDragComponent('cache', 600, 150, 'Add Cache Layer');

    // Notes
    await videoHelpers.addAnnotation('Add explanatory annotations', { x: 960, y: 150 }, 2000);

    // Export
    await videoHelpers.addAnnotation('Export your design', { x: 1600, y: 100 }, 1500);
    const exportBtn = page.getByRole('button', { name: /export/i }).first();
    if (await exportBtn.isVisible()) {
      await videoHelpers.highlightAndClick(exportBtn, 'Export Options');
      await videoHelpers.smoothPause(2000);
    }

    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Complete workflow video saved: ${videoPath}`);
  });

  test('Collaboration Demo - Team Features Showcase', async ({ page, context, browser }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('collaboration-demo', {
      quality: 'high',
      frameRate: 30,
      showCursor: true,
      multiContext: true
    });

    // 1. Introduction to collaboration
    await videoHelpers.addTitle('ArchiComm Collaboration Features', 3000);
    await helpers.canvas.navigateToCanvas();

    // 2. Create initial design
    await videoHelpers.addAnnotation('Designer creates initial architecture', { x: 960, y: 100 }, 2000);

    const designComponents = [
      { type: 'api-gateway', x: 300, y: 200 },
      { type: 'server', x: 500, y: 200 },
      { type: 'database', x: 700, y: 200 }
    ];

    for (const comp of designComponents) {
      await videoHelpers.smoothDragComponent(comp.type, comp.x, comp.y);
      await videoHelpers.smoothPause(600);
    }

    // 3. Share design
    const shareButton = page.getByRole('button', { name: /share/i }).first();
    if (await shareButton.isVisible()) {
      await videoHelpers.highlightAndClick(shareButton, 'Share with team');
      await videoHelpers.smoothPause(2000);
    }

    // 4. Simulate peer joining (split screen effect)
    await videoHelpers.addAnnotation('Team member joins session', { x: 960, y: 150 }, 2000);

    // Create peer context for demonstration
    const peerContext = await browser.newContext();
    const peerPage = await peerContext.newPage();
    await peerPage.setViewportSize({ width: 960, height: 1080 });

    // Show split screen collaboration
    await videoHelpers.showSplitScreen(page, peerPage);

    // 5. Collaborative editing demo
    await videoHelpers.addAnnotation('Real-time collaborative editing', { x: 960, y: 200 }, 2000);

    // Main user adds component
    await videoHelpers.smoothDragComponent('cache', 400, 100, 'Designer adds cache');

    // Simulate peer adding component (for demo purposes)
    await videoHelpers.addAnnotation('Peer adds monitoring', { x: 1400, y: 300 }, 1500);
    await videoHelpers.smoothDragComponent('server', 600, 300, 'Peer adds monitoring');

    // 6. Conclusion
    await videoHelpers.addTitle('Seamless team collaboration', 3000);

    await peerContext.close();
    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Collaboration demo video saved: ${videoPath}`);
  });

  test('Mobile Responsive Demo', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('mobile-responsive-demo', {
      quality: 'high',
      frameRate: 30,
      showCursor: false, // Hide cursor for mobile demo
      showTouches: true
    });

    // 1. Introduction
    await videoHelpers.addTitle('ArchiComm on Mobile Devices', 3000);

    // 2. Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await helpers.canvas.navigateToCanvas();
    await videoHelpers.addAnnotation('Full desktop experience', { x: 960, y: 100 }, 2000);

    // Add some components
    await videoHelpers.smoothDragComponent('server', 400, 300);
    await videoHelpers.smoothDragComponent('database', 600, 300);

    // 3. Transition to tablet
    await videoHelpers.smoothViewportTransition(1024, 768, 'Tablet View');
    await videoHelpers.smoothPause(2000);

    // 4. Transition to mobile
    await videoHelpers.smoothViewportTransition(375, 667, 'Mobile View');
    await videoHelpers.smoothPause(2000);

    // 5. Mobile interaction demo
    await videoHelpers.addAnnotation('Touch-optimized interface', { x: 187, y: 100 }, 2000);

    // Simulate touch interactions
    await videoHelpers.simulateTouchDrag('cache', 180, 250);
    await videoHelpers.smoothPause(1500);

    // 6. Conclusion
    await videoHelpers.addTitle('Design anywhere, anytime', 3000);

    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Mobile responsive demo video saved: ${videoPath}`);
  });

  test('Performance Demo - Large Scale Design', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('performance-demo', {
      quality: 'high',
      frameRate: 30,
      showCursor: true,
      showPerformanceMetrics: true
    });

    // 1. Introduction
    await videoHelpers.addTitle('ArchiComm Performance at Scale', 3000);
    await helpers.canvas.navigateToCanvas();

    // 2. Performance metrics overlay
    await videoHelpers.showPerformanceOverlay();

    // 3. Rapid component addition
    await videoHelpers.addAnnotation('Adding 50+ components smoothly', { x: 960, y: 100 }, 2000);

    const componentTypes = ['server', 'database', 'cache', 'api-gateway', 'load-balancer'];

    for (let i = 0; i < 50; i++) {
      const type = componentTypes[i % componentTypes.length];
      const x = 150 + (i % 10) * 120;
      const y = 150 + Math.floor(i / 10) * 100;

      await helpers.canvas.addComponent(type, { x, y });

      // Update performance metrics every 10 components
      if (i % 10 === 0) {
        await videoHelpers.updatePerformanceMetrics();
      }

      await page.waitForTimeout(50); // Smooth but fast addition
    }

    // 4. Smooth navigation with large design
    await videoHelpers.addAnnotation('Smooth navigation with complex designs', { x: 960, y: 150 }, 2000);

    await helpers.canvas.zoomOut(3);
    await videoHelpers.smoothPause(1000);
    await helpers.canvas.panCanvas(200, 200);
    await videoHelpers.smoothPause(1000);
    await helpers.canvas.zoomIn(5);
    await videoHelpers.smoothPause(1000);
    await helpers.canvas.resetZoom();

    // 5. Final performance metrics
    await videoHelpers.addAnnotation('Optimized for performance', { x: 960, y: 200 }, 2000);
    await videoHelpers.updatePerformanceMetrics();

    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Performance demo video saved: ${videoPath}`);
  });

  test('Feature Highlights Compilation', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('feature-highlights', {
      quality: 'ultra',
      frameRate: 60,
      showCursor: true,
      highlightClicks: true
    });

    // Create a compilation of quick feature demonstrations
    const features = [
      {
        title: 'Drag & Drop Components',
        demo: async () => {
          await helpers.canvas.navigateToCanvas();
          await videoHelpers.smoothDragComponent('server', 300, 300);
          await videoHelpers.smoothDragComponent('database', 500, 300);
        }
      },
      {
        title: 'Smart Annotations',
        demo: async () => {
          await videoHelpers.addAnnotation('Data flows here', { x: 400, y: 250 }, 1200);
        }
      },
      {
        title: 'Export Options',
        demo: async () => {
          const exportBtn = page.getByRole('button', { name: /export/i }).first();
          if (await exportBtn.isVisible()) {
            await videoHelpers.highlightAndClick(exportBtn, 'Multiple export formats');
          }
        }
      }
    ];

    for (const feature of features) {
      await videoHelpers.addTitle(feature.title, 2000);
      await feature.demo();
      await videoHelpers.smoothPause(2000);
    }

    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Feature highlights video saved: ${videoPath}`);
  });

  test('Instagram Stories Architecture Demo', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('instagram-stories-architecture', {
      quality: 'high',
      frameRate: 30,
      showCursor: true,
      highlightClicks: true
    });

    await helpers.canvas.navigateToCanvas();
    await videoHelpers.addTitle('Instagram Stories Architecture', 2500);

    // Edge/CDN/API layer
    await videoHelpers.smoothDragComponent('cdn', 200, 150, 'CDN');
    await videoHelpers.smoothDragComponent('api-gateway', 400, 150, 'API Gateway');
    await videoHelpers.smoothDragComponent('load-balancer', 600, 150, 'Load Balancer');

    // Web/App tier
    await videoHelpers.smoothDragComponent('server', 800, 100, 'Web Server');
    await videoHelpers.smoothDragComponent('server', 800, 200, 'App Server');

    // Stories + Media services
    await videoHelpers.smoothDragComponent('server', 1000, 100, 'Stories Service');
    await videoHelpers.smoothDragComponent('server', 1000, 200, 'Media Uploader');
    await videoHelpers.smoothDragComponent('server', 1200, 120, 'Filter Service');
    await videoHelpers.smoothDragComponent('server', 1200, 200, 'Transcoder');

    // Storage + Cache + DB
    await videoHelpers.smoothDragComponent('storage', 1400, 120, 'Object Storage');
    await videoHelpers.smoothDragComponent('cache', 1400, 200, 'Redis Cache');
    await videoHelpers.smoothDragComponent('database', 1600, 160, 'Metadata DB');

    // Async processing
    await videoHelpers.smoothDragComponent('message-queue', 1200, 320, 'Queue');
    await videoHelpers.smoothDragComponent('server', 1000, 320, 'Worker');

    // Annotations
    await videoHelpers.addAnnotation('Edge → API → LB → App/Stories', { x: 700, y: 80 }, 1800);
    await videoHelpers.addAnnotation('Filters/Transcode → Store in Object Storage', { x: 1320, y: 90 }, 2000);
    await videoHelpers.addAnnotation('Hot paths cached in Redis', { x: 1400, y: 240 }, 1500);

    // Wrap up
    await videoHelpers.addTitle('Scalable, cache-friendly, async processing', 2200);
    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Instagram architecture demo video saved: ${videoPath}`);
  });

  test('Ad Click Aggregation Architecture Demo', async ({ page, context }) => {
    const helpers = createHelpers(page);
    const videoHelpers = createVideoHelpers(page, context);

    await videoHelpers.startRecording('ad-click-aggregation', {
      quality: 'high',
      frameRate: 30,
      showCursor: true,
      highlightClicks: true
    });

    await helpers.canvas.navigateToCanvas();
    await videoHelpers.addTitle('Ad Click Aggregation Architecture', 2500);
    // If challenge is available, apply template via UI where possible
    try {
      // Open command palette and try template apply if wired (optional; non-blocking)
      await page.keyboard.press('Meta+K');
      const input = page.getByRole('textbox');
      await input.fill('Ad Click Aggregation');
      await page.keyboard.press('Enter');
      await videoHelpers.smoothPause(1500);
    } catch {}

    // Producers (web/mobile clients generating click events)
    await videoHelpers.smoothDragComponent('web-app', 220, 140, 'Web Client');
    await videoHelpers.smoothDragComponent('mobile-app', 220, 220, 'Mobile Client');

    // Ingestion (Edge/API → Queue/Broker)
    await videoHelpers.smoothDragComponent('api-gateway', 420, 180, 'Ingestion API');
    await videoHelpers.smoothDragComponent('broker', 640, 180, 'Kafka Broker');
    await videoHelpers.smoothDragComponent('message-queue', 820, 180, 'Click Events Topic');

    // Stream processing and ETL
    await videoHelpers.smoothDragComponent('stream-processing', 1020, 140, 'Stream Processor');
    await videoHelpers.smoothDragComponent('etl', 1020, 240, 'ETL/Enrichment');

    // Storage layers: Data Lake + Warehouse
    await videoHelpers.smoothDragComponent('data-lake', 1240, 140, 'Data Lake');
    await videoHelpers.smoothDragComponent('data-warehouse', 1240, 240, 'Data Warehouse');

    // OLAP/Analytics
    await videoHelpers.smoothDragComponent('elasticsearch', 1460, 160, 'OLAP Store');
    await videoHelpers.smoothDragComponent('kibana', 1640, 160, 'BI Dashboard');

    // Annotations for flow
    await videoHelpers.addAnnotation('Producers → API → Kafka Topic', { x: 620, y: 100 }, 1800);
    await videoHelpers.addAnnotation('Stream processing aggregates clicks', { x: 1040, y: 100 }, 1800);
    await videoHelpers.addAnnotation('Batch/ETL to Warehouse, raw to Data Lake', { x: 1240, y: 300 }, 2000);
    await videoHelpers.addAnnotation('OLAP + BI dashboards for insights', { x: 1560, y: 120 }, 2000);

    const videoPath = await videoHelpers.stopRecording();
    console.log(`✅ Ad Click Aggregation demo video saved: ${videoPath}`);
  });
});
