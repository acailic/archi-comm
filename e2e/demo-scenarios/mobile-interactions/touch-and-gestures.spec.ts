// e2e/demo-scenarios/mobile-interactions/touch-and-gestures.spec.ts
// Mobile touch and gesture interaction demonstrations for video generation
// Creates compelling demonstrations of mobile-optimized architecture design workflows
// RELEVANT FILES: e2e/utils/demo-scenarios.ts, e2e/utils/test-helpers.ts, src/features/canvas/components/ReactFlowCanvas.tsx, e2e/utils/video-helpers.ts

import { test, expect, devices } from '@playwright/test';
import { CanvasHelpers, AssertionHelpers } from '../../utils/test-helpers';

test.describe('Mobile Touch and Gesture Demonstrations', () => {
  // Configure extended timeouts for mobile interaction demonstrations
  test.setTimeout(300000); // 5 minutes for mobile workflows

  test.beforeEach(async ({ page }) => {
    // Configure mobile-optimized video recording
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable mobile demo mode
    await page.evaluate(() => {
      window.DEMO_MODE = true;
      window.MOBILE_OPTIMIZED = true;
    });

    // Set up clean canvas for mobile demo
    await page.locator('[data-testid="new-design-button"]').click();
    await page.waitForTimeout(2000);
  });

  test('designing on mobile device', async ({ page }) => {
    // Use project-level device profile; rely on provided page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set up new design on mobile
    await page.locator('[data-testid="new-design-button"]').tap();
    await page.waitForTimeout(2000);

    // Add mobile demo annotation
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(200, 100);
    await page.keyboard.type('Mobile Architecture Design Demo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate touch-optimized component palette
    await page.locator('[data-testid="mobile-component-palette-toggle"]').tap();
    await page.waitForTimeout(1000);

    // Add components using touch
    await page.locator('[data-testid="mobile-component-web-app"]').tap();
    await page.touchscreen.tap(200, 250);
    await page.keyboard.type('Mobile Web App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="mobile-component-api"]').tap();
    await page.touchscreen.tap(200, 400);
    await page.keyboard.type('REST API');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="mobile-component-database"]').tap();
    await page.touchscreen.tap(200, 550);
    await page.keyboard.type('Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Skip wheel-based zoom in mobile demos

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(300, 200);
    await page.keyboard.type('Pinch to zoom for detailed editing');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show connection creation with touch
    await page.locator('[data-testid="connection-tool"]').tap();
    await page.waitForTimeout(500);

    // Create connections with pointer touch events
    const handles = page.locator('.react-flow__handle');
    const hCount = await handles.count();
    if (hCount >= 2) {
      await handles.nth(0).dispatchEvent('pointerdown', { pointerType: 'touch' } as any);
      await handles.nth(1).dispatchEvent('pointermove', { pointerType: 'touch' } as any);
      await handles.nth(1).dispatchEvent('pointerup', { pointerType: 'touch' } as any);
      await page.waitForTimeout(800);
    }

    // Show annotation editing with on-screen keyboard
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 300);
    await page.keyboard.type('Touch-optimized workflow complete');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate mobile export
    await page.locator('[data-testid="mobile-export-menu"]').tap();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-mobile-share"]').tap();
    await page.waitForTimeout(2000);

    // Verify using centralized assertions
    const a1 = new AssertionHelpers(page);
    await a1.assertComponentExists('Mobile Web App');
    await a1.assertComponentExists('REST API');
    await a1.assertComponentExists('Database');
  });

  test('tablet-based collaborative design session', async ({ page }) => {
    // Use provided page with project-level tablet emulation
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set up tablet collaboration session
    await page.locator('[data-testid="new-design-button"]').tap();
    await page.waitForTimeout(2000);

    // Add tablet demo annotation
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(400, 100);
    await page.keyboard.type('Tablet Collaborative Design Demo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate multi-touch gestures for navigation
    await page.locator('[data-testid="component-palette-microservice"]').tap();
    await page.touchscreen.tap(300, 250);
    await page.keyboard.type('User Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-microservice"]').tap();
    await page.touchscreen.tap(500, 250);
    await page.keyboard.type('Product Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-microservice"]').tap();
    await page.touchscreen.tap(700, 250);
    await page.keyboard.type('Order Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Show touch-optimized toolbar and controls
    await page.locator('[data-testid="tablet-toolbar"]').tap();
    await page.waitForTimeout(500);

    await page.locator('[data-testid="tablet-alignment-tool"]').tap();
    await page.waitForTimeout(500);

    // Select multiple components with touch
    await page.touchscreen.tap(300, 250);
    await page.waitForTimeout(200);
    await page.keyboard.down('Shift');
    await page.touchscreen.tap(500, 250);
    await page.touchscreen.tap(700, 250);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(1000);

    // Align components using tablet controls
    await page.locator('[data-testid="align-horizontal"]').tap();
    await page.waitForTimeout(1500);

    // Demonstrate stylus simulation for precise editing
    await page.locator('[data-testid="stylus-mode"]').tap();
    await page.waitForTimeout(500);

    // Use pointer events for touch-based connections
    await page.locator('[data-testid="connection-tool"]').tap();
    const tHandles = page.locator('.react-flow__handle');
    if ((await tHandles.count()) >= 3) {
      await tHandles.nth(0).dispatchEvent('pointerdown', { pointerType: 'touch' } as any);
      await tHandles.nth(1).dispatchEvent('pointermove', { pointerType: 'touch' } as any);
      await tHandles.nth(1).dispatchEvent('pointerup', { pointerType: 'touch' } as any);
      await page.waitForTimeout(800);

      await tHandles.nth(1).dispatchEvent('pointerdown', { pointerType: 'touch' } as any);
      await tHandles.nth(2).dispatchEvent('pointermove', { pointerType: 'touch' } as any);
      await tHandles.nth(2).dispatchEvent('pointerup', { pointerType: 'touch' } as any);
      await page.waitForTimeout(800);
    }

    // Show handwriting recognition for annotations
    await page.locator('[data-testid="handwriting-mode"]').tap();
    await page.waitForTimeout(500);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(400, 350);

    // Simulate handwriting input
    await page.evaluate(() => {
      const event = new CustomEvent('handwriting-input', {
        detail: { text: 'Microservices architecture' }
      });
      document.dispatchEvent(event);
    });
    await page.waitForTimeout(2000);

    // Add databases with tablet gestures
    await page.locator('[data-testid="component-palette-database"]').tap();
    await page.touchscreen.tap(300, 450);
    await page.keyboard.type('User DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-database"]').tap();
    await page.touchscreen.tap(500, 450);
    await page.keyboard.type('Product DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-database"]').tap();
    await page.touchscreen.tap(700, 450);
    await page.keyboard.type('Order DB');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Connect services to databases via pointer events
    await page.locator('[data-testid="connection-tool"]').tap();
    const dbHandles = page.locator('.react-flow__handle');
    const dbCount = await dbHandles.count();
    for (let i = 0; i + 1 < dbCount && i < 6; i += 2) {
      await dbHandles.nth(i).dispatchEvent('pointerdown', { pointerType: 'touch' } as any);
      await dbHandles.nth(i + 1).dispatchEvent('pointermove', { pointerType: 'touch' } as any);
      await dbHandles.nth(i + 1).dispatchEvent('pointerup', { pointerType: 'touch' } as any);
      await page.waitForTimeout(600);
    }

    // Show seamless sync with desktop collaborators (simulated)
    await page.locator('[data-testid="collaboration-indicator"]').tap();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 550);
    await page.keyboard.type('Syncing with desktop collaborators...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Simulate collaborative edit from desktop user
    await page.evaluate(() => {
      // Simulate external edit
      const newComponent = document.createElement('div');
      newComponent.setAttribute('data-testid', 'component-api-gateway');
      newComponent.style.position = 'absolute';
      newComponent.style.left = '500px';
      newComponent.style.top = '150px';
      document.querySelector('[data-testid="canvas-container"]').appendChild(newComponent);
    });
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(550, 100);
    await page.keyboard.type('Desktop user added API Gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show responsive design adaptation
    await page.setViewportSize({ width: 834, height: 1194 }); // Portrait mode
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(400, 600);
    await page.keyboard.type('Responsive design adapts to orientation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Return to landscape
    await page.setViewportSize({ width: 1194, height: 834 });
    await page.waitForTimeout(1000);

    // Final tablet export
    await page.locator('[data-testid="tablet-export-menu"]').tap();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-presentation-mode"]').tap();
    await page.waitForTimeout(2000);

    // Verify using centralized assertions
    const a = new AssertionHelpers(page);
    await a.assertComponentExists('User Service');
    await a.assertComponentExists('Product Service');
    await a.assertComponentExists('Order Service');
    await a.assertComponentExists('API Gateway');
  });

  test('cross-device design workflow', async ({ browser }, testInfo) => {
    // Show design continuity across devices

    // Start on desktop
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'e2e/test-results/artifacts' }
    });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto('/');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.waitForTimeout(2000);

    // Start design on desktop
    await desktopPage.locator('[data-testid="new-design-button"]').click();
    await desktopPage.waitForTimeout(1000);

    await desktopPage.locator('[data-testid="annotation-tool"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await desktopPage.keyboard.type('Cross-Device Workflow Demo');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    // Create initial design on desktop
    await desktopPage.locator('[data-testid="component-palette-web-app"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 200 } });
    await desktopPage.keyboard.type('Frontend Application');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    await desktopPage.locator('[data-testid="component-palette-api-gateway"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 300 } });
    await desktopPage.keyboard.type('API Gateway');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    // Save and get share link
    await desktopPage.locator('[data-testid="save-design"]').click();
    await desktopPage.waitForTimeout(1000);
    await desktopPage.locator('[data-testid="share-design-button"]').click();
    await desktopPage.waitForTimeout(500);
    const shareLink = await desktopPage.locator('[data-testid="share-link-input"]').inputValue();

    await desktopPage.locator('[data-testid="annotation-tool"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 400 } });
    await desktopPage.keyboard.type('Desktop: Initial design created');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1500);

    // Switch to tablet for review and editing
    const tabletContext = await browser.newContext({
      recordVideo: { dir: 'e2e/test-results/artifacts' }
    });
    const tabletPage = await tabletContext.newPage();

    await tabletPage.goto(shareLink);
    await tabletPage.waitForLoadState('networkidle');
    await tabletPage.waitForTimeout(2000);

    await tabletPage.locator('[data-testid="annotation-tool"]').tap();
    await tabletPage.touchscreen.tap(50, 100);
    await tabletPage.keyboard.type('Tablet: Reviewing and adding details');
    await tabletPage.keyboard.press('Enter');
    await tabletPage.waitForTimeout(1000);

    // Add microservices on tablet
    await tabletPage.locator('[data-testid="component-palette-microservice"]').tap();
    await tabletPage.touchscreen.tap(600, 450);
    await tabletPage.keyboard.type('User Service');
    await tabletPage.keyboard.press('Enter');
    await tabletPage.waitForTimeout(1000);

    await tabletPage.locator('[data-testid="component-palette-microservice"]').tap();
    await tabletPage.touchscreen.tap(400, 450);
    await tabletPage.keyboard.type('Product Service');
    await tabletPage.keyboard.press('Enter');
    await tabletPage.waitForTimeout(1000);

    // Connect API gateway to services
    await tabletPage.locator('[data-testid="connection-tool"]').tap();
    await tabletPage.mouse.move(500, 330);
    await tabletPage.mouse.down();
    await tabletPage.mouse.move(600, 420);
    await tabletPage.mouse.up();
    await tabletPage.waitForTimeout(600);

    await tabletPage.mouse.move(500, 330);
    await tabletPage.mouse.down();
    await tabletPage.mouse.move(400, 420);
    await tabletPage.mouse.up();
    await tabletPage.waitForTimeout(600);

    // Save changes
    await tabletPage.locator('[data-testid="save-design"]').tap();
    await tabletPage.waitForTimeout(1000);

    // Continue on phone for quick annotations
    const phoneContext = await browser.newContext({
      recordVideo: { dir: 'e2e/test-results/artifacts' }
    });
    const phonePage = await phoneContext.newPage();

    await phonePage.goto(shareLink);
    await phonePage.waitForLoadState('networkidle');
    await phonePage.waitForTimeout(2000);

    await phonePage.locator('[data-testid="annotation-tool"]').tap();
    await phonePage.touchscreen.tap(50, 100);
    await phonePage.keyboard.type('Phone: Quick review and notes');
    await phonePage.keyboard.press('Enter');
    await phonePage.waitForTimeout(1000);

    // Add quick annotation on phone
    await phonePage.locator('[data-testid="annotation-tool"]').tap();
    await phonePage.touchscreen.tap(150, 300);
    await phonePage.keyboard.type('Need load balancer here');
    await phonePage.keyboard.press('Enter');
    await phonePage.waitForTimeout(1000);

    await phonePage.locator('[data-testid="annotation-tool"]').tap();
    await phonePage.touchscreen.tap(150, 450);
    await phonePage.keyboard.type('Add databases for services');
    await phonePage.keyboard.press('Enter');
    await phonePage.waitForTimeout(1000);

    // Save phone annotations
    await phonePage.locator('[data-testid="save-design"]').tap();
    await phonePage.waitForTimeout(1000);

    // Return to desktop for final refinement
    await desktopPage.reload();
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.waitForTimeout(2000);

    await desktopPage.locator('[data-testid="annotation-tool"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 500 } });
    await desktopPage.keyboard.type('Desktop: Final refinement with feedback');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    // Implement phone suggestions
    await desktopPage.locator('[data-testid="component-palette-load-balancer"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 300 } });
    await desktopPage.keyboard.type('Load Balancer');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    await desktopPage.locator('[data-testid="component-palette-database"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 600, y: 550 } });
    await desktopPage.keyboard.type('User Database');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    await desktopPage.locator('[data-testid="component-palette-database"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 550 } });
    await desktopPage.keyboard.type('Product Database');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1000);

    // Show state preservation and synchronization
    await desktopPage.locator('[data-testid="annotation-tool"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 600 } });
    await desktopPage.keyboard.type('Cross-device workflow complete - all changes preserved');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(1500);

    // Show responsive design adaptation
    await desktopPage.locator('[data-testid="annotation-tool"]').click();
    await desktopPage.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 650 } });
    await desktopPage.keyboard.type('Design adapts perfectly to each device form factor');
    await desktopPage.keyboard.press('Enter');
    await desktopPage.waitForTimeout(2000);

    // Final export
    await desktopPage.locator('[data-testid="export-menu"]').click();
    await desktopPage.waitForTimeout(500);
    await desktopPage.locator('[data-testid="export-cross-device-summary"]').click();
    await desktopPage.waitForTimeout(2000);

    // Verify cross-device workflow
    await expect(desktopPage.locator('[data-testid="component-frontend-application"]')).toBeVisible();
    await expect(desktopPage.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(desktopPage.locator('[data-testid="component-user-service"]')).toBeVisible();
    await expect(desktopPage.locator('[data-testid="component-product-service"]')).toBeVisible();
    await expect(desktopPage.locator('[data-testid="component-load-balancer"]')).toBeVisible();

    // Attach videos before closing
    const attachVideo = async (label: string, page: any) => {
      const v = page.video?.();
      if (v) {
        const p = await v.path();
        await testInfo.attach(label, { path: p, contentType: 'video/webm' });
      }
    };
    await attachVideo('cross-device-desktop', desktopPage);
    await attachVideo('cross-device-tablet', tabletPage);
    await attachVideo('cross-device-phone', phonePage);

    await phoneContext.close();
    await tabletContext.close();
    await desktopContext.close();
  });

  test('advanced touch gestures and interactions', async ({ page }) => {
    // Demonstrate sophisticated touch capabilities
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set up gesture demo
    await page.locator('[data-testid="new-design-button"]').tap();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(400, 100);
    await page.keyboard.type('Advanced Touch Gestures Demo');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Create components for gesture demonstration
    const components = [
      { name: 'Web App', x: 200, y: 200 },
      { name: 'Mobile App', x: 400, y: 200 },
      { name: 'API Gateway', x: 600, y: 200 },
      { name: 'Database', x: 400, y: 400 }
    ];

    for (const comp of components) {
      await page.locator('[data-testid="component-palette-auto"]').tap();
      await page.touchscreen.tap(comp.x, comp.y);
      await page.keyboard.type(comp.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
    }

    // Show pinch-to-zoom with smooth scaling
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 300);
    await page.keyboard.type('Pinch-to-zoom demonstration');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Simulate pinch zoom in
    await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-container"]');
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const event = new WheelEvent('wheel', {
            deltaY: -50,
            ctrlKey: true,
            bubbles: true
          });
          canvas.dispatchEvent(event);
        }, i * 300);
      }
    });
    await page.waitForTimeout(2000);

    // Simulate pinch zoom out
    await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-container"]');
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const event = new WheelEvent('wheel', {
            deltaY: 50,
            ctrlKey: true,
            bubbles: true
          });
          canvas.dispatchEvent(event);
        }, i * 300);
      }
    });
    await page.waitForTimeout(2000);

    // Demonstrate two-finger pan
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 350);
    await page.keyboard.type('Two-finger pan navigation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Avoid mouse-based panning in mobile-only demo projects

    // Show multi-touch component manipulation
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 400);
    await page.keyboard.type('Multi-touch component selection');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Multi-select components with touch
    await page.touchscreen.tap(200, 200);
    await page.waitForTimeout(200);
    await page.keyboard.down('Control');
    await page.touchscreen.tap(400, 200);
    await page.touchscreen.tap(600, 200);
    await page.keyboard.up('Control');
    await page.waitForTimeout(1000);

    // Group selected components
    await page.locator('[data-testid="group-components"]').tap();
    await page.waitForTimeout(1000);

    // Show gesture-based selection and grouping
    await page.locator('[data-testid="lasso-select-tool"]').tap();
    await page.waitForTimeout(500);

    // Skip mouse-based lasso selection in mobile-only demo context

    // Show touch-optimized context menus
    await page.locator('[data-testid="component-web-app"]').tap({ button: 'right' });
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="context-menu-properties"]').tap();
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="close-properties"]').tap();
    await page.waitForTimeout(500);

    // Demonstrate rotation gesture simulation
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 450);
    await page.keyboard.type('Rotation and transformation gestures');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Select a component for rotation
    await page.touchscreen.tap(400, 400);
    await page.waitForTimeout(500);

    // Simulate rotation gesture
    await page.evaluate(() => {
      const component = document.querySelector('[data-testid="component-database"]');
      let rotation = 0;
      const rotateInterval = setInterval(() => {
        rotation += 15;
        component.style.transform = `rotate(${rotation}deg)`;
        if (rotation >= 90) {
          clearInterval(rotateInterval);
          // Return to original position
          setTimeout(() => {
            component.style.transform = 'rotate(0deg)';
          }, 1000);
        }
      }, 200);
    });
    await page.waitForTimeout(3000);

    // Show accessibility features for touch
    await page.locator('[data-testid="accessibility-mode"]').tap();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 500);
    await page.keyboard.type('Accessibility: Larger touch targets and voice control');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Demonstrate voice control simulation
    await page.evaluate(() => {
      // Simulate voice command
      const event = new CustomEvent('voice-command', {
        detail: { command: 'Add database component' }
      });
      document.dispatchEvent(event);
    });
    await page.waitForTimeout(2000);

    // Show large touch targets
    await page.locator('[data-testid="large-touch-targets"]').tap();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 550);
    await page.keyboard.type('Enhanced touch targets for better accessibility');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Final gesture demo - smooth connection creation
    await page.locator('[data-testid="connection-tool"]').tap();
    await page.waitForTimeout(500);

    // Create connections with pointer events
    await page.locator('[data-testid="connection-tool"]').tap();
    const connHandles = page.locator('.react-flow__handle');
    const cCount = await connHandles.count();
    for (let i = 0; i + 1 < cCount && i < 6; i += 2) {
      const src = connHandles.nth(i);
      const dst = connHandles.nth(i + 1);
      await src.dispatchEvent('pointerdown', { pointerType: 'touch' } as any);
      await dst.dispatchEvent('pointermove', { pointerType: 'touch' } as any);
      await dst.dispatchEvent('pointerup', { pointerType: 'touch' } as any);
      await page.waitForTimeout(800);
    }

    // Final annotation
    await page.locator('[data-testid="annotation-tool"]').tap();
    await page.touchscreen.tap(50, 600);
    await page.keyboard.type('Touch gesture demo complete - intuitive mobile design');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Export touch demo
    await page.locator('[data-testid="export-menu"]').tap();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-touch-demo"]').tap();
    await page.waitForTimeout(2000);

    // Verify via centralized assertions
    const a2 = new AssertionHelpers(page);
    await a2.assertComponentExists('Web App');
    await a2.assertComponentExists('Mobile App');
    await a2.assertComponentExists('API Gateway');
    await a2.assertComponentExists('Database');
  });
});
