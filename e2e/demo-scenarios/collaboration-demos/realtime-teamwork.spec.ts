// e2e/demo-scenarios/collaboration-demos/realtime-teamwork.spec.ts
// Real-time collaboration demonstration scenarios for video generation
// Creates compelling demonstrations of multi-user collaborative design workflows
// RELEVANT FILES: e2e/utils/demo-scenarios.ts, e2e/utils/test-helpers.ts, src/features/collaboration/, e2e/utils/video-helpers.ts

import { test, expect, BrowserContext } from '@playwright/test';
// Collaboration features are currently disabled; skip this suite
test.describe.configure({ mode: 'skip' });
import { AssertionHelpers } from '../../utils/test-helpers';
import { CanvasHelpers } from '../../utils/test-helpers';

test.describe('Real-Time Collaboration Demonstrations', () => {
  // Configure extended timeouts for natural collaboration pacing
  test.setTimeout(300000); // 5 minutes for complete collaboration workflows
  let collaboratorContext: BrowserContext;

  test.beforeEach(async ({ page, browser }) => {
    // Set up primary designer session
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create new design for collaboration
    await page.locator('[data-testid="new-design-button"]').click();
    await page.waitForTimeout(2000);

    // Set up second browser context for collaborator (with video recording)
    collaboratorContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'e2e/test-results/artifacts' }
    });
  });

  test.afterEach(async () => {
    await collaboratorContext?.close();
  });

  test('architect and developer designing together', async ({ page }, testInfo) => {
    // Show realistic team collaboration scenario
    await page.locator("[data-testid='canvas-root'], .react-flow__pane").first().waitFor();

    // Context 1 (Architect): Start with high-level system design
    await page.locator('[data-testid="user-profile-button"]').click();
    await page.locator('[data-testid="set-user-name"]').fill('Sarah Chen (Architect)');
    await page.locator('[data-testid="save-profile"]').click();
    await page.waitForTimeout(1000);

    // Architect begins with high-level architecture components
    const architectCanvas = new CanvasHelpers(page);
    await architectCanvas.addComponent('web-app', { x: 200, y: 150 });
    await page.keyboard.type('Client Application');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await architectCanvas.addComponent('api-gateway', { x: 400, y: 300 });
    await page.keyboard.type('API Gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await architectCanvas.addComponent('microservice', { x: 600, y: 450 });
    await page.keyboard.type('Business Logic');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add architectural annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 100 } });
    await page.keyboard.type('High-level architecture - need detailed implementation design');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Generate share link for collaboration
    await page.locator('[data-testid="share-design-button"]').click();
    await page.waitForTimeout(1000);
    const shareLink = await page.locator('[data-testid="share-link-input"]').inputValue();
    await page.locator('[data-testid="copy-share-link"]').click();
    await page.waitForTimeout(1000);

    // Context 2 (Developer): Join via share link
    const collaboratorPage = await collaboratorContext.newPage();
    await collaboratorPage.goto(shareLink);
    await collaboratorPage.waitForLoadState('networkidle');
    await collaboratorPage.waitForTimeout(2000);

    // Set developer profile
    await collaboratorPage.locator('[data-testid="user-profile-button"]').click();
    await collaboratorPage.locator('[data-testid="set-user-name"]').fill('Mike Rodriguez (Developer)');
    await collaboratorPage.locator('[data-testid="save-profile"]').click();
    await collaboratorPage.waitForTimeout(1500);

    // Developer adds detailed implementation components
    await collaboratorPage.locator('[data-testid="component-palette-database"]').click();
    await collaboratorPage.locator('[data-testid="canvas-container"]').click({ position: { x: 600, y: 600 } });
    await collaboratorPage.keyboard.type('PostgreSQL Database');
    await collaboratorPage.keyboard.press('Enter');
    await collaboratorPage.waitForTimeout(1500);

    await collaboratorPage.locator('[data-testid="component-palette-cache"]').click();
    await collaboratorPage.locator('[data-testid="canvas-container"]').click({ position: { x: 800, y: 450 } });
    await collaboratorPage.keyboard.type('Redis Cache');
    await collaboratorPage.keyboard.press('Enter');
    await collaboratorPage.waitForTimeout(1500);

    await collaboratorPage.locator('[data-testid="component-palette-load-balancer"]').click();
    await collaboratorPage.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 200 } });
    await collaboratorPage.keyboard.type('Load Balancer');
    await collaboratorPage.keyboard.press('Enter');
    await collaboratorPage.waitForTimeout(1500);

    // Show real-time synchronization as both users work simultaneously
    // Architect adds more high-level components while developer works on implementation
    await page.locator('[data-testid="component-palette-external-service"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 300 } });
    await page.keyboard.type('Authentication Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Developer connects implementation components
    await collaboratorPage.hover('[data-testid="component-business-logic"]');
    await collaboratorPage.locator('[data-testid="connection-handle-business-logic-out"]').hover();
    await collaboratorPage.mouse.down();
    await collaboratorPage.hover('[data-testid="component-postgresql-database"]');
    await collaboratorPage.locator('[data-testid="connection-handle-postgresql-database-in"]').hover();
    await collaboratorPage.mouse.up();
    await collaboratorPage.waitForTimeout(1000);

    await collaboratorPage.hover('[data-testid="component-business-logic"]');
    await collaboratorPage.locator('[data-testid="connection-handle-business-logic-cache"]').hover();
    await collaboratorPage.mouse.down();
    await collaboratorPage.hover('[data-testid="component-redis-cache"]');
    await collaboratorPage.locator('[data-testid="connection-handle-redis-cache-in"]').hover();
    await collaboratorPage.mouse.up();
    await collaboratorPage.waitForTimeout(1000);

    // Architect connects high-level flow
    await page.hover('[data-testid="component-client-application"]');
    await page.locator('[data-testid="connection-handle-client-application-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-api-gateway"]');
    await page.locator('[data-testid="connection-handle-api-gateway-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Demonstrate conflict resolution when both users edit same area
    // Both users try to add monitoring at the same time
    await page.locator('[data-testid="component-palette-monitoring"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 300, y: 500 } });

    await collaboratorPage.locator('[data-testid="component-palette-logging"]').click();
    await collaboratorPage.locator("[data-testid='canvas-root']").click({ position: { x: 320, y: 520 } });

    // Show conflict resolution dialog
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="conflict-resolution-dialog"]')).toBeVisible();
    await page.locator('[data-testid="accept-both-changes"]').click();
    await page.waitForTimeout(1500);

    // Show annotation collaboration with comments and feedback
    await collaboratorPage.locator('[data-testid="annotation-tool"]').click();
    await collaboratorPage.locator("[data-testid='canvas-root']").click({ position: { x: 500, y: 350 } });
    await collaboratorPage.keyboard.type('Mike: Should we add health checks for the API gateway?');
    await collaboratorPage.keyboard.press('Enter');
    await collaboratorPage.waitForTimeout(1500);

    // Architect responds to developer suggestion
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 500, y: 380 } });
    await page.keyboard.type('Sarah: Great idea! Also consider circuit breaker pattern.');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Developer implements the suggestion
    await collaboratorPage.locator('[data-testid="component-palette-monitoring"]').click();
    await collaboratorPage.locator("[data-testid='canvas-root']").click({ position: { x: 550, y: 300 } });
    await collaboratorPage.keyboard.type('Health Checks');
    await collaboratorPage.keyboard.press('Enter');
    await collaboratorPage.waitForTimeout(1500);

    await collaboratorPage.locator('[data-testid="component-palette-circuit-breaker"]').click();
    await collaboratorPage.locator("[data-testid='canvas-root']").click({ position: { x: 450, y: 350 } });
    await collaboratorPage.keyboard.type('Circuit Breaker');
    await collaboratorPage.keyboard.press('Enter');
    await collaboratorPage.waitForTimeout(1500);

    // Connect circuit breaker
    await collaboratorPage.hover('[data-testid="component-api-gateway"]');
    await collaboratorPage.locator('[data-testid="connection-handle-api-gateway-out"]').hover();
    await collaboratorPage.mouse.down();
    await collaboratorPage.hover('[data-testid="component-circuit-breaker"]');
    await collaboratorPage.locator('[data-testid="connection-handle-circuit-breaker-in"]').hover();
    await collaboratorPage.mouse.up();
    await collaboratorPage.waitForTimeout(1000);

    await collaboratorPage.hover('[data-testid="component-circuit-breaker"]');
    await collaboratorPage.locator('[data-testid="connection-handle-circuit-breaker-out"]').hover();
    await collaboratorPage.mouse.down();
    await collaboratorPage.hover('[data-testid="component-business-logic"]');
    await collaboratorPage.locator('[data-testid="connection-handle-business-logic-in"]').hover();
    await collaboratorPage.mouse.up();
    await collaboratorPage.waitForTimeout(1000);

    // Show final collaborative annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator("[data-testid='canvas-root']").click({ position: { x: 50, y: 650 } });
    await page.keyboard.type('Collaborative Design Complete: Architecture + Implementation Details');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // End with successful design completion and export
    await page.locator('[data-testid="export-menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-pdf"]').click();
    await page.waitForTimeout(2000);

    // Zoom out to show complete collaborative architecture
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Verify collaboration was successful (centralized assertions)
    const a = new AssertionHelpers(page);
    await a.assertComponentExists('Client Application');
    await a.assertComponentExists('API Gateway');
    await a.assertComponentExists('Business Logic');

    // Attach collaborator video (if available)
    const v = collaboratorPage.video?.();
    if (v) {
      const p = await v.path();
      await testInfo.attach('collaborator-developer-video', { path: p, contentType: 'video/webm' });
    }
  });

  test('collaborative design review and feedback', async ({ page }, testInfo) => {
    // Simulate design review meeting
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Owner presents existing architecture design
    await page.locator('[data-testid="user-profile-button"]').click();
    await page.locator('[data-testid="set-user-name"]').fill('Alex Kim (Lead Architect)');
    await page.locator('[data-testid="save-profile"]').click();
    await page.waitForTimeout(1000);

    // Load existing design for review (simulate opening saved design)
    await page.locator('[data-testid="component-palette-web-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 200, y: 150 } });
    await page.keyboard.type('Frontend App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 300 } });
    await page.keyboard.type('User Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 600, y: 300 } });
    await page.keyboard.type('Payment Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 450 } });
    await page.keyboard.type('Shared Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Connect components
    await page.hover('[data-testid="component-frontend-app"]');
    await page.locator('[data-testid="connection-handle-frontend-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-frontend-app"]');
    await page.locator('[data-testid="connection-handle-frontend-app-payment"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-payment-service"]');
    await page.locator('[data-testid="connection-handle-payment-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-shared-database"]');
    await page.locator('[data-testid="connection-handle-shared-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-payment-service"]');
    await page.locator('[data-testid="connection-handle-payment-service-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-shared-database"]');
    await page.locator('[data-testid="connection-handle-shared-database-payment"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Generate share link for reviewers
    await page.locator('[data-testid="share-design-button"]').click();
    await page.waitForTimeout(1000);
    const shareLink = await page.locator('[data-testid="share-link-input"]').inputValue();

    // Reviewer 1 joins
    const reviewer1Page = await collaboratorContext.newPage();
    await reviewer1Page.goto(shareLink);
    await reviewer1Page.waitForLoadState('networkidle');
    await reviewer1Page.waitForTimeout(1500);

    await reviewer1Page.locator('[data-testid="user-profile-button"]').click();
    await reviewer1Page.locator('[data-testid="set-user-name"]').fill('Dr. Smith (Security Architect)');
    await reviewer1Page.locator('[data-testid="save-profile"]').click();
    await reviewer1Page.waitForTimeout(1000);

    // Reviewer adds feedback annotations
    await reviewer1Page.locator('[data-testid="annotation-tool"]').click();
    await reviewer1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 200 } });
    await reviewer1Page.keyboard.type('🔒 SECURITY CONCERN: Shared database creates coupling');
    await reviewer1Page.keyboard.press('Enter');
    await reviewer1Page.waitForTimeout(1500);

    await reviewer1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 250 } });
    await reviewer1Page.keyboard.type('💡 RECOMMENDATION: Separate databases for each service');
    await reviewer1Page.keyboard.press('Enter');
    await reviewer1Page.waitForTimeout(1500);

    // Reviewer 2 joins (Performance Expert)
    const reviewer2Page = await collaboratorContext.newPage();
    await reviewer2Page.goto(shareLink);
    await reviewer2Page.waitForLoadState('networkidle');
    await reviewer2Page.waitForTimeout(1500);

    await reviewer2Page.locator('[data-testid="user-profile-button"]').click();
    await reviewer2Page.locator('[data-testid="set-user-name"]').fill('Jana Okoye (Performance Engineer)');
    await reviewer2Page.locator('[data-testid="save-profile"]').click();
    await reviewer2Page.waitForTimeout(1000);

    await reviewer2Page.locator('[data-testid="annotation-tool"]').click();
    await reviewer2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 700, y: 250 } });
    await reviewer2Page.keyboard.type('⚡ PERFORMANCE: Need caching layer for frequently accessed data');
    await reviewer2Page.keyboard.press('Enter');
    await reviewer2Page.waitForTimeout(1500);

    await reviewer2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 700, y: 300 } });
    await reviewer2Page.keyboard.type('📊 SUGGESTION: Add load balancer for horizontal scaling');
    await reviewer2Page.keyboard.press('Enter');
    await reviewer2Page.waitForTimeout(1500);

    // Show suggestion implementation in real-time
    // Owner implements security feedback
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 500 } });
    await page.keyboard.type('User Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 500 } });
    await page.keyboard.type('Payment Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Disconnect from shared database and reconnect to separate databases
    await page.locator('[data-testid="connection-user-service-shared-database"]').click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    await page.locator('[data-testid="connection-payment-service-shared-database"]').click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-database"]');
    await page.locator('[data-testid="connection-handle-user-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-payment-service"]');
    await page.locator('[data-testid="connection-handle-payment-service-db"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-payment-database"]');
    await page.locator('[data-testid="connection-handle-payment-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Owner implements performance suggestions
    await page.locator('[data-testid="component-palette-cache"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 200 } });
    await page.keyboard.type('Redis Cache');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-load-balancer"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 200, y: 250 } });
    await page.keyboard.type('Load Balancer');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Connect performance enhancements
    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-user"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-lb"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-load-balancer"]');
    await page.locator('[data-testid="connection-handle-load-balancer-payment"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-payment-service"]');
    await page.locator('[data-testid="connection-handle-payment-service-lb"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-cache"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-redis-cache"]');
    await page.locator('[data-testid="connection-handle-redis-cache-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Reviewers approve the changes
    await reviewer1Page.locator('[data-testid="annotation-tool"]').click();
    await reviewer1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 400 } });
    await reviewer1Page.keyboard.type('✅ APPROVED: Database separation addresses security concerns');
    await reviewer1Page.keyboard.press('Enter');
    await reviewer1Page.waitForTimeout(1500);

    await reviewer2Page.locator('[data-testid="annotation-tool"]').click();
    await reviewer2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 450 } });
    await reviewer2Page.keyboard.type('✅ APPROVED: Performance improvements look good');
    await reviewer2Page.keyboard.press('Enter');
    await reviewer2Page.waitForTimeout(1500);

    // Include approval workflow and final design sign-off
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 550 } });
    await page.keyboard.type('DESIGN REVIEW COMPLETE ✅ All feedback incorporated - Ready for implementation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Version comparison and final export
    await page.locator('[data-testid="version-history-button"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="compare-versions"]').click();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="export-menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-architecture-doc"]').click();
    await page.waitForTimeout(2000);

    // Zoom out to show complete reviewed architecture
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Verify design review was successful
    await expect(page.locator('[data-testid="component-user-database"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-payment-database"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-redis-cache"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-load-balancer"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-shared-database"]')).toBeVisible();

    // Close reviewer pages
    await reviewer1Page.close();
    await reviewer2Page.close();
    // Attach reviewer videos
    const attachVid = async (label: string, p: any) => {
      const v = p.video?.();
      if (v) {
        const path = await v.path();
        await testInfo.attach(label, { path, contentType: 'video/webm' });
      }
    };
    await attachVid('reviewer-1-video', reviewer1Page);
    await attachVid('reviewer-2-video', reviewer2Page);
  });

  test('distributed team architecture workshop', async ({ page }, testInfo) => {
    // Show remote team collaboration
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Workshop facilitator
    await page.locator('[data-testid="user-profile-button"]').click();
    await page.locator('[data-testid="set-user-name"]').fill('Emma Thompson (Workshop Facilitator)');
    await page.locator('[data-testid="save-profile"]').click();
    await page.waitForTimeout(1000);

    // Set up workshop canvas with initial prompt
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 100 } });
    await page.keyboard.type('WORKSHOP: Design a scalable e-learning platform architecture');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 150 } });
    await page.keyboard.type('Requirements: 100K concurrent users, video streaming, real-time chat');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Generate share link for workshop participants
    await page.locator('[data-testid="share-design-button"]').click();
    await page.waitForTimeout(1000);
    const shareLink = await page.locator('[data-testid="share-link-input"]').inputValue();

    // Participant 1 joins (Frontend Expert)
    const participant1Page = await collaboratorContext.newPage();
    await participant1Page.goto(shareLink);
    await participant1Page.waitForLoadState('networkidle');
    await participant1Page.waitForTimeout(1500);

    await participant1Page.locator('[data-testid="user-profile-button"]').click();
    await participant1Page.locator('[data-testid="set-user-name"]').fill('Carlos Martinez (Frontend Lead)');
    await participant1Page.locator('[data-testid="save-profile"]').click();
    await participant1Page.waitForTimeout(1000);

    // Participant 2 joins (Backend Expert)
    const participant2Page = await collaboratorContext.newPage();
    await participant2Page.goto(shareLink);
    await participant2Page.waitForLoadState('networkidle');
    await participant2Page.waitForTimeout(1500);

    await participant2Page.locator('[data-testid="user-profile-button"]').click();
    await participant2Page.locator('[data-testid="set-user-name"]').fill('Priya Patel (Backend Architect)');
    await participant2Page.locator('[data-testid="save-profile"]').click();
    await participant2Page.waitForTimeout(1000);

    // Participant 3 joins (DevOps Expert)
    const participant3Page = await collaboratorContext.newPage();
    await participant3Page.goto(shareLink);
    await participant3Page.waitForLoadState('networkidle');
    await participant3Page.waitForTimeout(1500);

    await participant3Page.locator('[data-testid="user-profile-button"]').click();
    await participant3Page.locator('[data-testid="set-user-name"]').fill('Ahmed Hassan (DevOps Engineer)');
    await participant3Page.locator('[data-testid="save-profile"]').click();
    await participant3Page.waitForTimeout(1000);

    // Brainstorming phase with rapid component addition
    // Frontend expert adds user-facing components
    await participant1Page.locator('[data-testid="component-palette-web-app"]').click();
    await participant1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 250 } });
    await participant1Page.keyboard.type('Web Portal');
    await participant1Page.keyboard.press('Enter');
    await participant1Page.waitForTimeout(1000);

    await participant1Page.locator('[data-testid="component-palette-mobile-app"]').click();
    await participant1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 250 } });
    await participant1Page.keyboard.type('Mobile App');
    await participant1Page.keyboard.press('Enter');
    await participant1Page.waitForTimeout(1000);

    await participant1Page.locator('[data-testid="annotation-tool"]').click();
    await participant1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 200 } });
    await participant1Page.keyboard.type('Carlos: Need responsive design for all devices');
    await participant1Page.keyboard.press('Enter');
    await participant1Page.waitForTimeout(1000);

    // Backend expert adds service layer
    await participant2Page.locator('[data-testid="component-palette-microservice"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 300 } });
    await participant2Page.keyboard.type('User Management');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="component-palette-microservice"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 300 } });
    await participant2Page.keyboard.type('Content Service');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="component-palette-microservice"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 800, y: 300 } });
    await participant2Page.keyboard.type('Video Streaming');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="annotation-tool"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 250 } });
    await participant2Page.keyboard.type('Priya: Microservices for scalability and maintainability');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    // DevOps expert adds infrastructure
    await participant3Page.locator('[data-testid="component-palette-load-balancer"]').click();
    await participant3Page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 400 } });
    await participant3Page.keyboard.type('Global Load Balancer');
    await participant3Page.keyboard.press('Enter');
    await participant3Page.waitForTimeout(1000);

    await participant3Page.locator('[data-testid="component-palette-cdn"]').click();
    await participant3Page.locator('[data-testid="canvas-container"]').click({ position: { x: 200, y: 400 } });
    await participant3Page.keyboard.type('CDN');
    await participant3Page.keyboard.press('Enter');
    await participant3Page.waitForTimeout(1000);

    await participant3Page.locator('[data-testid="component-palette-monitoring"]').click();
    await participant3Page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 500 } });
    await participant3Page.keyboard.type('Monitoring & Alerts');
    await participant3Page.keyboard.press('Enter');
    await participant3Page.waitForTimeout(1000);

    await participant3Page.locator('[data-testid="annotation-tool"]').click();
    await participant3Page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 350 } });
    await participant3Page.keyboard.type('Ahmed: Need auto-scaling and monitoring for 100K users');
    await participant3Page.keyboard.press('Enter');
    await participant3Page.waitForTimeout(1000);

    // Facilitator adds real-time requirements
    await page.locator('[data-testid="component-palette-websocket"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 950, y: 350 } });
    await page.keyboard.type('Real-time Chat');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 950, y: 300 } });
    await page.keyboard.type('Emma: Real-time discussion during lessons is critical');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Collaborative refinement and organization
    // Facilitator suggests grouping
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 600 } });
    await page.keyboard.type('Let\'s organize into layers: Presentation, API, Services, Data');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Participants collaborate on organization
    await participant1Page.locator('[data-testid="component-palette-api-gateway"]').click();
    await participant1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 350 } });
    await participant1Page.keyboard.type('API Gateway');
    await participant1Page.keyboard.press('Enter');
    await participant1Page.waitForTimeout(1000);

    // Connect frontend to API gateway
    await participant1Page.hover('[data-testid="component-web-portal"]');
    await participant1Page.locator('[data-testid="connection-handle-web-portal-out"]').hover();
    await participant1Page.mouse.down();
    await participant1Page.hover('[data-testid="component-api-gateway"]');
    await participant1Page.locator('[data-testid="connection-handle-api-gateway-in"]').hover();
    await participant1Page.mouse.up();
    await participant1Page.waitForTimeout(800);

    await participant1Page.hover('[data-testid="component-mobile-app"]');
    await participant1Page.locator('[data-testid="connection-handle-mobile-app-out"]').hover();
    await participant1Page.mouse.down();
    await participant1Page.hover('[data-testid="component-api-gateway"]');
    await participant1Page.locator('[data-testid="connection-handle-api-gateway-mobile"]').hover();
    await participant1Page.mouse.up();
    await participant1Page.waitForTimeout(800);

    // Backend expert adds databases
    await participant2Page.locator('[data-testid="component-palette-database"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 500 } });
    await participant2Page.keyboard.type('User Database');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="component-palette-database"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 500 } });
    await participant2Page.keyboard.type('Content Database');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="component-palette-storage"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 800, y: 500 } });
    await participant2Page.keyboard.type('Video Storage');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    // Connect services to databases
    await participant2Page.hover('[data-testid="component-user-management"]');
    await participant2Page.locator('[data-testid="connection-handle-user-management-out"]').hover();
    await participant2Page.mouse.down();
    await participant2Page.hover('[data-testid="component-user-database"]');
    await participant2Page.locator('[data-testid="connection-handle-user-database-in"]').hover();
    await participant2Page.mouse.up();
    await participant2Page.waitForTimeout(800);

    // Real-time discussion through annotations
    await participant3Page.locator('[data-testid="annotation-tool"]').click();
    await participant3Page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 600 } });
    await participant3Page.keyboard.type('Ahmed: We need caching for video metadata');
    await participant3Page.keyboard.press('Enter');
    await participant3Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="annotation-tool"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 650 } });
    await participant2Page.keyboard.type('Priya: Good point! Adding Redis cache');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="component-palette-cache"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 750, y: 400 } });
    await participant2Page.keyboard.type('Redis Cache');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    // Consensus building and final architecture agreement
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 700 } });
    await page.keyboard.type('Architecture consensus: Microservices + CDN + Real-time chat ✅');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Final approval from all participants
    await participant1Page.locator('[data-testid="annotation-tool"]').click();
    await participant1Page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 750 } });
    await participant1Page.keyboard.type('Carlos: Frontend approach approved ✅');
    await participant1Page.keyboard.press('Enter');
    await participant1Page.waitForTimeout(1000);

    await participant2Page.locator('[data-testid="annotation-tool"]').click();
    await participant2Page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 750 } });
    await participant2Page.keyboard.type('Priya: Backend services look solid ✅');
    await participant2Page.keyboard.press('Enter');
    await participant2Page.waitForTimeout(1000);

    await participant3Page.locator('[data-testid="annotation-tool"]').click();
    await participant3Page.locator('[data-testid="canvas-container"]').click({ position: { x: 550, y: 750 } });
    await participant3Page.keyboard.type('Ahmed: Infrastructure ready to scale ✅');
    await participant3Page.keyboard.press('Enter');
    await participant3Page.waitForTimeout(1000);

    // Workshop completion
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 800 } });
    await page.keyboard.type('WORKSHOP COMPLETE: E-learning platform architecture finalized');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Export workshop results
    await page.locator('[data-testid="export-menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-workshop-summary"]').click();
    await page.waitForTimeout(2000);

    // Zoom out to show complete collaborative architecture
    await page.keyboard.press('Control+-');
    await page.waitForTimeout(1000);

    // Verify workshop collaboration was successful
    const a2 = new AssertionHelpers(page);
    await a2.assertComponentExists('Web Portal');
    await a2.assertComponentExists('Mobile App');
    await a2.assertComponentExists('API Gateway');

    // Attach participant videos then close
    const attach = async (label: string, p: any) => {
      const v = p.video?.();
      if (v) {
        const path = await v.path();
        await testInfo.attach(label, { path, contentType: 'video/webm' });
      }
      await p.close();
    };
    await attach('participant-frontend-video', participant1Page);
    await attach('participant-backend-video', participant2Page);
    await attach('participant-infra-video', participant3Page);
  });
});
