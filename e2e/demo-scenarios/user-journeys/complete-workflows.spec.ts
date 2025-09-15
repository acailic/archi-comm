// e2e/demo-scenarios/user-journeys/complete-workflows.spec.ts
// Complete end-to-end user journey demonstrations for video generation
// Creates comprehensive workflow demonstrations showing real user scenarios from start to finish
// RELEVANT FILES: e2e/utils/demo-scenarios.ts, e2e/utils/test-helpers.ts, src/features/onboarding/, e2e/utils/video-helpers.ts

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey Demonstrations', () => {
  // Configure extended timeouts for complete user workflows
  test.setTimeout(600000); // 10 minutes for complete user journeys

  test.beforeEach(async ({ page }) => {
    // Configure comprehensive workflow recording
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable user journey demo mode
    await page.evaluate(() => {
      window.DEMO_MODE = true;
      window.USER_JOURNEY_MODE = true;
      window.COMPREHENSIVE_TRACKING = true;
    });

    await page.waitForTimeout(2000);
  });

  test('first-time user complete onboarding experience', async ({ page }) => {
    // Show complete new user flow
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Start with application landing and welcome screen
    await page.locator('[data-testid="welcome-modal"]').waitFor();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="welcome-title"]').waitFor();
    await expect(page.locator('[data-testid="welcome-title"]')).toContainText('Welcome to ArchiComm');

    await page.locator('[data-testid="start-tutorial-button"]').click();
    await page.waitForTimeout(2000);

    // Demonstrate tutorial and guided tour
    await page.locator('[data-testid="tutorial-step-1"]').waitFor();
    await page.locator('[data-testid="tutorial-annotation"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-annotation"]')).toContainText('Let\'s start by creating your first architecture diagram');

    await page.locator('[data-testid="tutorial-next"]').click();
    await page.waitForTimeout(1500);

    // Show first architecture creation with assistance
    await page.locator('[data-testid="tutorial-step-2"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-annotation"]')).toContainText('Choose a component from the palette');

    // Highlight component palette
    await expect(page.locator('[data-testid="component-palette"]')).toHaveClass(/tutorial-highlight/);

    await page.locator('[data-testid="component-palette-web-app"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="tutorial-annotation"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-annotation"]')).toContainText('Now click on the canvas to place your component');

    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 200 } });
    await page.keyboard.type('My First Web App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Tutorial celebrates first component
    await page.locator('[data-testid="tutorial-celebration"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-celebration"]')).toContainText('Great! You\'ve added your first component');

    await page.locator('[data-testid="tutorial-next"]').click();
    await page.waitForTimeout(1500);

    // Add database component with tutorial guidance
    await page.locator('[data-testid="tutorial-step-3"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-annotation"]')).toContainText('Let\'s add a database to store your app\'s data');

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 350 } });
    await page.keyboard.type('App Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Tutorial teaches connection creation
    await page.locator('[data-testid="tutorial-step-4"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-annotation"]')).toContainText('Now let\'s connect your app to the database');

    await page.locator('[data-testid="connection-tool"]').click();
    await page.waitForTimeout(500);

    // Show connection handles
    await page.hover('[data-testid="component-my-first-web-app"]');
    await expect(page.locator('[data-testid="connection-handle-my-first-web-app-out"]')).toBeVisible();

    await page.locator('[data-testid="connection-handle-my-first-web-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-app-database"]');
    await page.locator('[data-testid="connection-handle-app-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Tutorial success celebration
    await page.locator('[data-testid="tutorial-completion"]').waitFor();
    await expect(page.locator('[data-testid="tutorial-completion"]')).toContainText('Congratulations! You\'ve created your first architecture');

    // Include feature discovery and exploration
    await page.locator('[data-testid="explore-features-button"]').click();
    await page.waitForTimeout(1000);

    // Feature tour - annotations
    await page.locator('[data-testid="feature-tour-annotations"]').waitFor();
    await expect(page.locator('[data-testid="feature-tour-annotations"]')).toContainText('Add notes and explanations with annotations');

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 100, y: 150 } });
    await page.keyboard.type('My first architecture diagram!');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="feature-tour-next"]').click();
    await page.waitForTimeout(1000);

    // Feature tour - styling
    await page.locator('[data-testid="feature-tour-styling"]').waitFor();
    await expect(page.locator('[data-testid="feature-tour-styling"]')).toContainText('Customize your components with colors and styles');

    await page.locator('[data-testid="component-my-first-web-app"]').click();
    await page.locator('[data-testid="style-panel"]').waitFor();
    await page.locator('[data-testid="color-picker"]').click();
    await page.locator('[data-testid="color-blue"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="feature-tour-next"]').click();
    await page.waitForTimeout(1000);

    // Feature tour - export
    await page.locator('[data-testid="feature-tour-export"]').waitFor();
    await expect(page.locator('[data-testid="feature-tour-export"]')).toContainText('Save and share your work');

    await page.locator('[data-testid="export-menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-png"]').click();
    await page.waitForTimeout(2000);

    // Demonstrate help system and documentation access
    await page.locator('[data-testid="help-button"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="help-topics"]').waitFor();
    await page.locator('[data-testid="help-topic-getting-started"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="help-close"]').click();
    await page.waitForTimeout(500);

    // Show progression tracking
    await page.locator('[data-testid="progress-panel"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="progress-first-component"]')).toHaveClass(/completed/);
    await expect(page.locator('[data-testid="progress-first-connection"]')).toHaveClass(/completed/);
    await expect(page.locator('[data-testid="progress-first-export"]')).toHaveClass(/completed/);

    // End with successful first project completion
    await page.locator('[data-testid="save-project-button"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="project-name-input"]').fill('My First Architecture');
    await page.locator('[data-testid="save-confirm"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="onboarding-complete"]').waitFor();
    await expect(page.locator('[data-testid="onboarding-complete"]')).toContainText('Welcome to ArchiComm! Your journey begins here.');

    // Verify onboarding completion
    await expect(page.locator('[data-testid="component-my-first-web-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-app-database"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-panel"]')).toContainText('Beginner');
  });

  test('enterprise architect daily workflow', async ({ page }) => {
    // Show realistic professional usage
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Start with user login and profile setup
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="email-input"]').fill('sarah.chen@techcorp.com');
    await page.locator('[data-testid="password-input"]').fill('professional123');
    await page.locator('[data-testid="login-submit"]').click();
    await page.waitForTimeout(2000);

    // Start with project dashboard and recent designs
    await page.locator('[data-testid="dashboard"]').waitFor();
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back, Sarah');

    await page.locator('[data-testid="recent-projects"]').waitFor();
    await expect(page.locator('[data-testid="recent-project-1"]')).toContainText('E-commerce Platform V2');
    await expect(page.locator('[data-testid="recent-project-2"]')).toContainText('Microservices Migration');

    // Demonstrate opening existing architecture for review
    await page.locator('[data-testid="recent-project-1"]').click();
    await page.waitForTimeout(2000);

    await page.locator('[data-testid="project-loading"]').waitFor();
    await page.waitForTimeout(1500);

    // Complex architecture loads
    await page.locator('[data-testid="canvas-container"]').waitFor();
    await expect(page.locator('[data-testid="component-web-frontend"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-mobile-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-user-service"]')).toBeVisible();

    // Add morning review annotation
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 100 } });
    await page.keyboard.type('Daily Review: Checking architecture for client presentation');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Show client meeting preparation and presentation mode
    await page.locator('[data-testid="presentation-mode"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="presentation-slides"]').waitFor();
    await expect(page.locator('[data-testid="slide-1-title"]')).toContainText('E-commerce Platform Architecture');

    // Navigate through presentation slides
    await page.locator('[data-testid="next-slide"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="slide-2-title"]')).toContainText('Frontend Layer');

    await page.locator('[data-testid="next-slide"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="slide-3-title"]')).toContainText('Service Architecture');

    await page.locator('[data-testid="next-slide"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="slide-4-title"]')).toContainText('Data Layer');

    // Show presenter notes
    await page.locator('[data-testid="presenter-notes"]').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="notes-content"]')).toContainText('Emphasize scalability benefits');

    // Exit presentation mode
    await page.locator('[data-testid="exit-presentation"]').click();
    await page.waitForTimeout(1000);

    // Include collaborative review session with stakeholders
    await page.locator('[data-testid="share-for-review"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="invite-reviewers"]').click();
    await page.locator('[data-testid="reviewer-email"]').fill('john.doe@techcorp.com');
    await page.locator('[data-testid="add-reviewer"]').click();
    await page.locator('[data-testid="reviewer-email"]').fill('lisa.wang@techcorp.com');
    await page.locator('[data-testid="add-reviewer"]').click();
    await page.locator('[data-testid="send-invites"]').click();
    await page.waitForTimeout(1500);

    // Simulate receiving feedback
    await page.evaluate(() => {
      // Mock incoming feedback
      setTimeout(() => {
        const feedback = {
          reviewer: 'John Doe (CTO)',
          comment: 'Looks good! Can we add disaster recovery details?',
          x: 600,
          y: 400
        };

        const feedbackEl = document.createElement('div');
        feedbackEl.setAttribute('data-testid', 'feedback-comment');
        feedbackEl.style.position = 'absolute';
        feedbackEl.style.left = feedback.x + 'px';
        feedbackEl.style.top = feedback.y + 'px';
        feedbackEl.style.background = '#fff3cd';
        feedbackEl.style.border = '2px solid #ffc107';
        feedbackEl.style.borderRadius = '8px';
        feedbackEl.style.padding = '10px';
        feedbackEl.style.maxWidth = '200px';
        feedbackEl.innerHTML = `<strong>${feedback.reviewer}</strong><br>${feedback.comment}`;

        document.querySelector('[data-testid="canvas-container"]').appendChild(feedbackEl);
      }, 2000);
    });

    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="feedback-comment"]')).toBeVisible();

    // Demonstrate design iteration and approval workflow
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 200 } });
    await page.keyboard.type('Feedback incorporated: Adding DR components');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add disaster recovery components
    await page.locator('[data-testid="component-palette-backup"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 800, y: 400 } });
    await page.keyboard.type('Backup Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-dr-site"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 800, y: 500 } });
    await page.keyboard.type('DR Site');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Connect DR components
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-backup"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-backup-service"]');
    await page.locator('[data-testid="connection-handle-backup-service-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Show export for documentation and implementation
    await page.locator('[data-testid="export-menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="export-technical-doc"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="export-implementation-guide"]').click();
    await page.waitForTimeout(1500);

    // Show version control integration
    await page.locator('[data-testid="version-control"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="commit-message"]').fill('Added disaster recovery architecture based on CTO feedback');
    await page.locator('[data-testid="commit-changes"]').click();
    await page.waitForTimeout(1500);

    // Include project management integration
    await page.locator('[data-testid="project-management"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="create-implementation-tasks"]').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('[data-testid="task-1"]')).toContainText('Set up backup infrastructure');
    await expect(page.locator('[data-testid="task-2"]')).toContainText('Configure DR site replication');

    // End of day summary
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 300 } });
    await page.keyboard.type('Daily workflow complete: Architecture reviewed, updated, and approved');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Save final state
    await page.locator('[data-testid="save-project"]').click();
    await page.waitForTimeout(1500);

    // Verify professional workflow
    await expect(page.locator('[data-testid="component-backup-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-dr-site"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-comment"]')).toBeVisible();
  });

  test('startup CTO planning technical architecture', async ({ page }) => {
    // Entrepreneurial workflow
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Start with business requirements and constraints
    await page.locator('[data-testid="new-project-button"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="project-template-startup"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="business-requirements"]').waitFor();
    await page.locator('[data-testid="team-size-input"]').fill('5 engineers');
    await page.locator('[data-testid="budget-input"]').fill('$50k/month');
    await page.locator('[data-testid="timeline-input"]').fill('6 months to MVP');
    await page.locator('[data-testid="user-scale-input"]').fill('10k users year 1');
    await page.locator('[data-testid="continue-requirements"]').click();
    await page.waitForTimeout(2000);

    // Show MVP architecture planning and design
    await page.locator('[data-testid="canvas-container"]').waitFor();
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('FinTech Startup MVP Architecture - Budget: $50k/month');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Start with simple MVP components
    await page.locator('[data-testid="component-palette-web-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 150 } });
    await page.keyboard.type('React Web App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-mobile-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 500, y: 150 } });
    await page.keyboard.type('React Native App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-api"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 300 } });
    await page.keyboard.type('Node.js API');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 450 } });
    await page.keyboard.type('PostgreSQL');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Connect MVP components
    await page.hover('[data-testid="component-react-web-app"]');
    await page.locator('[data-testid="connection-handle-react-web-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-nodejs-api"]');
    await page.locator('[data-testid="connection-handle-nodejs-api-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(600);

    await page.hover('[data-testid="component-react-native-app"]');
    await page.locator('[data-testid="connection-handle-react-native-app-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-nodejs-api"]');
    await page.locator('[data-testid="connection-handle-nodejs-api-mobile"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(600);

    await page.hover('[data-testid="component-nodejs-api"]');
    await page.locator('[data-testid="connection-handle-nodejs-api-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-postgresql"]');
    await page.locator('[data-testid="connection-handle-postgresql-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(600);

    // Demonstrate scalability planning and future considerations
    await page.locator('[data-testid="scalability-planner"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="growth-scenario-year1"]').click();
    await page.waitForTimeout(1500);

    // Show year 1 growth additions
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 100 } });
    await page.keyboard.type('Year 1 Growth: Add caching and monitoring');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-cache"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 600, y: 300 } });
    await page.keyboard.type('Redis Cache');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="component-palette-monitoring"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 200, y: 300 } });
    await page.keyboard.type('DataDog');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Connect caching
    await page.hover('[data-testid="component-nodejs-api"]');
    await page.locator('[data-testid="connection-handle-nodejs-api-cache"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-redis-cache"]');
    await page.locator('[data-testid="connection-handle-redis-cache-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(600);

    // Plan year 2 scaling
    await page.locator('[data-testid="growth-scenario-year2"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 200 } });
    await page.keyboard.type('Year 2: Microservices migration path');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Add future microservices (ghosted/planned)
    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 250, y: 500 } });
    await page.keyboard.type('Auth Service (Future)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 450, y: 500 } });
    await page.keyboard.type('Payment Service (Future)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 650, y: 500 } });
    await page.keyboard.type('Analytics Service (Future)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Style future components as planned/ghosted
    await page.evaluate(() => {
      const futureComponents = document.querySelectorAll('[data-testid*="future"]');
      futureComponents.forEach(comp => {
        comp.style.opacity = '0.5';
        comp.style.border = '2px dashed #ccc';
      });
    });

    // Include cost analysis and technology selection
    await page.locator('[data-testid="cost-analyzer"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="cost-breakdown"]').waitFor();
    await expect(page.locator('[data-testid="hosting-cost"]')).toContainText('$1,200/month');
    await expect(page.locator('[data-testid="database-cost"]')).toContainText('$400/month');
    await expect(page.locator('[data-testid="monitoring-cost"]')).toContainText('$200/month');
    await expect(page.locator('[data-testid="total-cost"]')).toContainText('$1,800/month');

    await page.locator('[data-testid="cost-optimization-suggestions"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="suggestion-1"]')).toContainText('Use managed PostgreSQL to reduce ops overhead');
    await expect(page.locator('[data-testid="suggestion-2"]')).toContainText('Start with shared Redis instance');

    // Show investor presentation preparation
    await page.locator('[data-testid="investor-presentation-mode"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="presentation-title"]').waitFor();
    await expect(page.locator('[data-testid="presentation-title"]')).toContainText('FinTech Startup Technical Architecture');

    // Generate technical slides
    await page.locator('[data-testid="generate-tech-slides"]').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="slide-mvp"]')).toBeVisible();
    await expect(page.locator('[data-testid="slide-scaling"]')).toBeVisible();
    await expect(page.locator('[data-testid="slide-costs"]')).toBeVisible();

    // Show team communication and alignment
    await page.locator('[data-testid="team-sharing"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="share-with-team"]').click();
    await page.locator('[data-testid="team-member-email"]').fill('dev1@startup.com');
    await page.locator('[data-testid="add-team-member"]').click();
    await page.locator('[data-testid="team-member-email"]').fill('dev2@startup.com');
    await page.locator('[data-testid="add-team-member"]').click();
    await page.locator('[data-testid="send-team-invite"]').click();
    await page.waitForTimeout(1500);

    // Include implementation planning and roadmap creation
    await page.locator('[data-testid="implementation-planner"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="generate-roadmap"]').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="sprint-1"]')).toContainText('Backend API + Database');
    await expect(page.locator('[data-testid="sprint-2"]')).toContainText('Frontend Web App');
    await expect(page.locator('[data-testid="sprint-3"]')).toContainText('Mobile App MVP');
    await expect(page.locator('[data-testid="sprint-4"]')).toContainText('Caching + Monitoring');

    // Final startup architecture summary
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 550 } });
    await page.keyboard.type('Startup Architecture Complete: MVP → Scale → Exit strategy');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Save startup architecture plan
    await page.locator('[data-testid="save-project"]').click();
    await page.locator('[data-testid="project-name"]').fill('FinTech Startup Architecture Plan');
    await page.locator('[data-testid="save-confirm"]').click();
    await page.waitForTimeout(1500);

    // Verify startup planning workflow
    await expect(page.locator('[data-testid="component-react-web-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-react-native-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-nodejs-api"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-postgresql"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-redis-cache"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-breakdown"]')).toBeVisible();
  });

  test('computer science student learning system design', async ({ page }) => {
    // Educational workflow demonstration
    await page.locator('[data-testid="canvas-container"]').waitFor();

    // Start with student login
    await page.locator('[data-testid="student-mode"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="student-id"]').fill('cs301-student-042');
    await page.locator('[data-testid="assignment-code"]').fill('SYSDESIGN-WEEK8');
    await page.locator('[data-testid="enter-classroom"]').click();
    await page.waitForTimeout(2000);

    // Start with assignment or challenge selection
    await page.locator('[data-testid="assignment-dashboard"]').waitFor();
    await expect(page.locator('[data-testid="course-title"]')).toContainText('CS 301: System Design');
    await expect(page.locator('[data-testid="assignment-title"]')).toContainText('Week 8: Design a Social Media Platform');

    await page.locator('[data-testid="assignment-details"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="requirements"]')).toContainText('Support 1M users, real-time messaging, content feed');
    await expect(page.locator('[data-testid="constraints"]')).toContainText('Consider scalability, consistency, and availability');
    await expect(page.locator('[data-testid="deliverables"]')).toContainText('Architecture diagram + written explanation');

    await page.locator('[data-testid="start-assignment"]').click();
    await page.waitForTimeout(2000);

    // Show research and planning phase
    await page.locator('[data-testid="canvas-container"]').waitFor();
    await page.locator('[data-testid="research-panel"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="reference-architectures"]').waitFor();
    await page.locator('[data-testid="reference-twitter"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 50 } });
    await page.keyboard.type('Social Media Platform Design - CS 301 Assignment');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Demonstrate iterative design development
    // Phase 1: Basic components
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 100 } });
    await page.keyboard.type('Phase 1: Core user-facing components');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-web-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 200, y: 200 } });
    await page.keyboard.type('Web Frontend');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="component-palette-mobile-app"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 400, y: 200 } });
    await page.keyboard.type('Mobile App');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Phase 2: Backend services
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 150 } });
    await page.keyboard.type('Phase 2: Backend services');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="component-palette-api-gateway"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 300, y: 300 } });
    await page.keyboard.type('API Gateway');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 400 } });
    await page.keyboard.type('User Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 400 } });
    await page.keyboard.type('Post Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="component-palette-microservice"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 550, y: 400 } });
    await page.keyboard.type('Message Service');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Include instructor feedback and revision cycles
    await page.locator('[data-testid="request-feedback"]').click();
    await page.waitForTimeout(2000);

    // Simulate instructor feedback
    await page.evaluate(() => {
      const feedback = document.createElement('div');
      feedback.setAttribute('data-testid', 'instructor-feedback');
      feedback.style.position = 'absolute';
      feedback.style.left = '600px';
      feedback.style.top = '250px';
      feedback.style.background = '#d4edda';
      feedback.style.border = '2px solid #c3e6cb';
      feedback.style.borderRadius = '8px';
      feedback.style.padding = '15px';
      feedback.style.maxWidth = '250px';
      feedback.innerHTML = `
        <strong>📝 Prof. Johnson Feedback:</strong><br>
        Good start! Consider adding:<br>
        • Database layer<br>
        • Caching for performance<br>
        • Real-time messaging infrastructure
      `;
      document.querySelector('[data-testid="canvas-container"]').appendChild(feedback);
    });

    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="instructor-feedback"]')).toBeVisible();

    // Phase 3: Implement feedback
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 50, y: 200 } });
    await page.keyboard.type('Phase 3: Implementing instructor feedback');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Add database layer
    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 150, y: 550 } });
    await page.keyboard.type('User Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 350, y: 550 } });
    await page.keyboard.type('Posts Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await page.locator('[data-testid="component-palette-database"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 550, y: 550 } });
    await page.keyboard.type('Messages Database');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Add caching
    await page.locator('[data-testid="component-palette-cache"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 450, y: 300 } });
    await page.keyboard.type('Redis Cache');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Add real-time messaging
    await page.locator('[data-testid="component-palette-websocket"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 700, y: 400 } });
    await page.keyboard.type('WebSocket Server');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Connect components with learning annotations
    await page.locator('[data-testid="connection-tool"]').click();
    await page.waitForTimeout(500);

    // Connect frontend to API gateway
    await page.hover('[data-testid="component-web-frontend"]');
    await page.locator('[data-testid="connection-handle-web-frontend-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-api-gateway"]');
    await page.locator('[data-testid="connection-handle-api-gateway-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(600);

    // Add learning annotation for connection
    await page.locator('[data-testid="annotation-tool"]').click();
    await page.locator('[data-testid="canvas-container"]').click({ position: { x: 250, y: 250 } });
    await page.keyboard.type('HTTP/REST communication');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Connect services to databases
    await page.locator('[data-testid="connection-tool"]').click();
    await page.hover('[data-testid="component-user-service"]');
    await page.locator('[data-testid="connection-handle-user-service-out"]').hover();
    await page.mouse.down();
    await page.hover('[data-testid="component-user-database"]');
    await page.locator('[data-testid="connection-handle-user-database-in"]').hover();
    await page.mouse.up();
    await page.waitForTimeout(600);

    // Show peer collaboration and review
    await page.locator('[data-testid="peer-review"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="share-with-peers"]').click();
    await page.locator('[data-testid="peer-group"]').select('CS301-Group-B');
    await page.locator('[data-testid="request-peer-review"]').click();
    await page.waitForTimeout(1500);

    // Simulate peer feedback
    await page.evaluate(() => {
      const peerFeedback = document.createElement('div');
      peerFeedback.setAttribute('data-testid', 'peer-feedback');
      peerFeedback.style.position = 'absolute';
      peerFeedback.style.left = '50px';
      peerFeedback.style.top = '350px';
      peerFeedback.style.background = '#e2e3f1';
      peerFeedback.style.border = '2px solid #b0b3d1';
      peerFeedback.style.borderRadius = '8px';
      peerFeedback.style.padding = '10px';
      peerFeedback.style.maxWidth = '200px';
      peerFeedback.innerHTML = `
        <strong>👥 Sarah (Peer):</strong><br>
        Nice design! Maybe add a load balancer for scalability?
      `;
      document.querySelector('[data-testid="canvas-container"]').appendChild(peerFeedback);
    });

    await page.waitForTimeout(2000);

    // Demonstrate final presentation and submission
    await page.locator('[data-testid="prepare-submission"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="written-explanation"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="explanation-text"]').fill(`
Architecture Explanation:

1. Frontend Layer: Web and mobile apps provide user interfaces
2. API Gateway: Routes requests and handles authentication
3. Microservices: User, Post, and Message services handle specific domains
4. Data Layer: Separate databases for each service ensure data isolation
5. Caching: Redis improves read performance for frequently accessed data
6. Real-time: WebSocket server enables instant messaging

Scalability Considerations:
- Horizontal scaling of services
- Database sharding strategies
- CDN for static content

Trade-offs:
- Consistency vs Availability (eventual consistency for posts)
- Complexity vs Maintainability
    `);

    await page.waitForTimeout(2000);

    // Include learning progress tracking and achievements
    await page.locator('[data-testid="learning-progress"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="skill-microservices"]')).toHaveClass(/completed/);
    await expect(page.locator('[data-testid="skill-databases"]')).toHaveClass(/completed/);
    await expect(page.locator('[data-testid="skill-caching"]')).toHaveClass(/in-progress/);
    await expect(page.locator('[data-testid="skill-real-time"]')).toHaveClass(/completed/);

    // Submit assignment
    await page.locator('[data-testid="submit-assignment"]').click();
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="submission-confirmation"]').waitFor();
    await expect(page.locator('[data-testid="submission-confirmation"]')).toContainText('Assignment submitted successfully!');

    // Show grade and feedback (simulated)
    await page.evaluate(() => {
      setTimeout(() => {
        const gradeNotification = document.createElement('div');
        gradeNotification.setAttribute('data-testid', 'grade-notification');
        gradeNotification.style.position = 'fixed';
        gradeNotification.style.top = '20px';
        gradeNotification.style.right = '20px';
        gradeNotification.style.background = '#d1ecf1';
        gradeNotification.style.border = '2px solid #bee5eb';
        gradeNotification.style.borderRadius = '8px';
        gradeNotification.style.padding = '15px';
        gradeNotification.style.zIndex = '1000';
        gradeNotification.innerHTML = `
          <strong>📊 Grade: 87/100</strong><br>
          Excellent work on scalability!<br>
          Consider: Security aspects, monitoring
        `;
        document.body.appendChild(gradeNotification);
      }, 3000);
    });

    await page.waitForTimeout(4000);
    await expect(page.locator('[data-testid="grade-notification"]')).toBeVisible();

    // Verify student learning workflow
    await expect(page.locator('[data-testid="component-web-frontend"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-api-gateway"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-user-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-websocket-server"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructor-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="peer-feedback"]')).toBeVisible();
  });
});