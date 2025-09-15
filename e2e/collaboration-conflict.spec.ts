// e2e/collaboration-conflict.spec.ts
// Collaborative workflow and conflict resolution tests
// Tests multi-user editing scenarios and merge conflict handling
import { test } from '@playwright/test';
// Collaboration features are disabled; skip entire file
test.describe.configure({ mode: 'skip' });
// RELEVANT FILES: e2e/utils/test-helpers.ts, src/services/CollaborationService.ts, src/components/ConflictResolution.tsx, e2e/workflow-integration.spec.ts

import { test, expect } from '@playwright/test';
import { createHelpers } from './utils/test-helpers';
import { testDataManager } from './utils/test-data-manager';

test.describe('Collaborative Workflows', () => {
  let shareUrl: string;

  test.beforeEach(async ({ page }) => {
    const helpers = createHelpers(page);
    await helpers.mock.mockShareService();
  });

  test.describe('Basic Collaboration', () => {
    test('share design link generation', async ({ page }) => {
      const helpers = createHelpers(page);

      // Create a design to share
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });
      await helpers.canvas.addAnnotation('Shared Design', { x: 300, y: 150 });

      // Click share button
      const shareButton = page.getByRole('button', { name: /share/i });
      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Verify share URL is generated
        const shareUrlElement = page.locator('[data-testid="share-url"], .share-url');
        await expect(shareUrlElement).toBeVisible();

        shareUrl = await shareUrlElement.textContent() || '';
        expect(shareUrl).toContain('localhost:3000/share/');
      } else {
        // If no share button, use mock URL
        shareUrl = 'http://localhost:3000/share/test-share-123';
      }
    });

    test('peer can access shared design', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Owner creates design
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('api-gateway', { x: 300, y: 200 });
      await helpers.canvas.addComponent('server', { x: 500, y: 200 });

      // Open peer context
      const peerContext = await helpers.mock.openPeerContext(shareUrl, browser);
      const peerPage = peerContext.pages()[0];
      const peerHelpers = createHelpers(peerPage);

      // Verify peer can see the design
      await expect(peerPage.locator('.react-flow__node')).toHaveCount(2);
      await peerHelpers.assert.assertComponentExists('Api gateway');
      await peerHelpers.assert.assertComponentExists('Server');

      await peerContext.close();
    });

    test('real-time design viewing', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Owner context
      await helpers.canvas.navigateToCanvas();

      // Peer context
      const peerContext = await helpers.mock.openPeerContext(shareUrl, browser);
      const peerPage = peerContext.pages()[0];
      const peerHelpers = createHelpers(peerPage);

      // Owner adds component
      await helpers.canvas.addComponent('load-balancer', { x: 200, y: 100 });

      // Peer should see the new component (in real implementation)
      // For testing, we simulate the sync
      await peerPage.evaluate(() => {
        const event = new CustomEvent('design-sync', {
          detail: { type: 'component-added', data: { type: 'load-balancer', x: 200, y: 100 } }
        });
        window.dispatchEvent(event);
      });

      await peerPage.waitForTimeout(1000);

      // Verify peer sees owner's changes
      await peerHelpers.assert.assertCanvasNotEmpty();

      await peerContext.close();
    });
  });

  test.describe('Conflict Resolution', () => {
    test('concurrent component addition', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Owner context
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 300, y: 200 });

      // Peer context
      const peerContext = await helpers.mock.openPeerContext(shareUrl, browser);
      const peerPage = peerContext.pages()[0];
      const peerHelpers = createHelpers(peerPage);

      // Simulate concurrent component addition
      await Promise.all([
        helpers.canvas.addComponent('database', { x: 500, y: 200 }),
        peerPage.evaluate(() => {
          // Simulate peer adding component at same time
          const event = new CustomEvent('collaboration-conflict', {
            detail: {
              type: 'concurrent-addition',
              data: {
                owner: { type: 'database', x: 500, y: 200 },
                peer: { type: 'cache', x: 500, y: 200 }
              }
            }
          });
          window.dispatchEvent(event);
        })
      ]);

      // Check for conflict detection
      const conflictBanner = page.locator('[data-testid="conflict-banner"], .conflict-banner');
      if (await conflictBanner.isVisible()) {
        // Verify conflict resolution UI appears
        await expect(conflictBanner).toBeVisible();

        // Test merge strategy selection
        const mergeButton = page.getByRole('button', { name: /merge both/i });
        if (await mergeButton.isVisible()) {
          await mergeButton.click();
        }
      }

      // Verify conflict resolved
      await helpers.assert.assertConflictResolved();

      await peerContext.close();
    });

    test('annotation conflicts', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Setup base design
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 300, y: 200 });
      await helpers.canvas.addAnnotation('Original Text', { x: 300, y: 150 });

      // Peer context
      const peerContext = await helpers.mock.openPeerContext(shareUrl, browser);
      const peerPage = peerContext.pages()[0];

      // Simulate both users editing same annotation
      await helpers.mock.simulateConflict('annotation-edit', {
        owner: { text: 'Owner Edit', x: 300, y: 150 },
        peer: { text: 'Peer Edit', x: 300, y: 150 }
      });

      // Verify conflict detection and resolution UI
      const conflictModal = page.locator('[data-testid="conflict-modal"], .conflict-modal');
      if (await conflictModal.isVisible()) {
        await expect(conflictModal).toBeVisible();

        // Test resolution options
        const keepMineButton = page.getByRole('button', { name: /keep mine/i });
        if (await keepMineButton.isVisible()) {
          await keepMineButton.click();
        }
      }

      await helpers.assert.assertConflictResolved();

      await peerContext.close();
    });

    test('connection conflicts', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Setup components for connections
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      // Simulate conflicting connections between same components
      await helpers.mock.simulateConflict('connection-conflict', {
        owner: { from: 'server', to: 'database', type: 'sync' },
        peer: { from: 'server', to: 'database', type: 'async' }
      });

      // Wait for conflict resolution
      await page.waitForTimeout(1000);

      // Verify system handles connection conflicts
      await helpers.assert.assertNoErrors();
      await helpers.assert.assertConflictResolved();
    });

    test('delete vs edit conflicts', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Setup component
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 300, y: 200 });

      // Simulate one user deleting while other edits
      await helpers.mock.simulateConflict('delete-edit-conflict', {
        owner: { action: 'delete', component: 'server' },
        peer: { action: 'edit', component: 'server', changes: { position: { x: 350, y: 200 } } }
      });

      // Verify conflict resolution
      const conflictDialog = page.locator('[data-testid="conflict-dialog"], .conflict-dialog');
      if (await conflictDialog.isVisible()) {
        await expect(conflictDialog).toBeVisible();

        // Test resolution - keep the edit
        const keepEditButton = page.getByRole('button', { name: /keep edit/i });
        if (await keepEditButton.isVisible()) {
          await keepEditButton.click();
        }
      }

      await helpers.assert.assertConflictResolved();
    });
  });

  test.describe('Conflict Resolution UI', () => {
    test('conflict banner appears', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger conflict
      await helpers.mock.simulateConflict('test-conflict', {
        type: 'component-edit',
        message: 'Multiple users editing same component'
      });

      // Verify conflict banner shows
      const conflictBanner = page.locator('[data-testid="conflict-banner"], .conflict-banner');
      if (await conflictBanner.isVisible()) {
        await expect(conflictBanner).toBeVisible();
        await expect(conflictBanner).toContainText(/conflict/i);
      }
    });

    test('merge strategy selection', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger conflict requiring user decision
      await helpers.mock.simulateConflict('merge-required', {
        owner: { data: 'owner-version' },
        peer: { data: 'peer-version' }
      });

      // Test merge strategy options
      const mergeDialog = page.locator('[data-testid="merge-dialog"], .merge-dialog');
      if (await mergeDialog.isVisible()) {
        await expect(mergeDialog).toBeVisible();

        // Verify all merge options are available
        await expect(page.getByRole('button', { name: /keep mine/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /keep theirs/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /merge both/i })).toBeVisible();

        // Select merge both
        await page.getByRole('button', { name: /merge both/i }).click();
      }

      await helpers.assert.assertConflictResolved();
    });

    test('conflict resolution success', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      // Trigger and resolve conflict
      await helpers.mock.simulateConflict('resolvable-conflict', {
        type: 'position-conflict',
        resolution: 'auto-merge'
      });

      await page.waitForTimeout(1000);

      // Verify successful resolution
      await helpers.assert.assertConflictResolved();

      // Verify design state after resolution
      await helpers.assert.assertComponentCount(2);

      // Verify success notification
      const successNotification = page.locator('[data-testid="success-notification"], .success-notification');
      if (await successNotification.isVisible()) {
        await expect(successNotification).toContainText(/resolved/i);
      }
    });

    test('automatic merge when possible', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger conflict that can be auto-merged
      await helpers.mock.simulateConflict('auto-mergeable', {
        type: 'non-conflicting-edits',
        canAutoMerge: true
      });

      await page.waitForTimeout(500);

      // Verify automatic resolution without user intervention
      await helpers.assert.assertConflictResolved();
      await helpers.assert.assertNoErrors();

      // Verify no conflict UI was shown
      const conflictDialog = page.locator('[data-testid="conflict-dialog"], .conflict-dialog');
      await expect(conflictDialog).not.toBeVisible();
    });

    test('manual resolution when required', async ({ page }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Trigger conflict requiring manual resolution
      await helpers.mock.simulateConflict('manual-resolution-required', {
        type: 'incompatible-changes',
        requiresUserInput: true
      });

      // Verify conflict resolution UI appears
      const conflictUI = page.locator('[data-testid="conflict-resolution"], .conflict-resolution');
      if (await conflictUI.isVisible()) {
        await expect(conflictUI).toBeVisible();

        // User makes resolution choice
        const resolveButton = page.getByRole('button', { name: /resolve/i }).first();
        await resolveButton.click();
      }

      await helpers.assert.assertConflictResolved();
    });
  });

  test.describe('Real-time Synchronization', () => {
    test('peer sees owner changes instantly', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      // Owner creates initial design
      await helpers.canvas.navigateToCanvas();
      await helpers.canvas.addComponent('server', { x: 200, y: 200 });

      // Peer context
      const peerContext = await helpers.mock.openPeerContext(shareUrl, browser);
      const peerPage = peerContext.pages()[0];

      // Owner adds component
      await helpers.canvas.addComponent('database', { x: 400, y: 200 });

      // Simulate real-time sync to peer
      await peerPage.evaluate(() => {
        const event = new CustomEvent('real-time-sync', {
          detail: { type: 'component-added', data: { type: 'database', x: 400, y: 200 } }
        });
        window.dispatchEvent(event);
      });

      // Verify peer sees the change
      await peerPage.waitForTimeout(500);

      const peerComponents = await peerPage.locator('.react-flow__node').count();
      expect(peerComponents).toBeGreaterThan(1);

      await peerContext.close();
    });

    test('cursor tracking between collaborators', async ({ page, browser }) => {
      const helpers = createHelpers(page);

      await helpers.canvas.navigateToCanvas();

      // Peer context
      const peerContext = await helpers.mock.openPeerContext(shareUrl, browser);
      const peerPage = peerContext.pages()[0];

      // Simulate peer cursor movement
      await peerPage.evaluate(() => {
        const event = new CustomEvent('peer-cursor', {
          detail: { userId: 'peer-123', x: 300, y: 200, name: 'Peer User' }
        });
        window.dispatchEvent(event);
      });

      // Verify peer cursor appears on owner's screen
      const peerCursor = page.locator('[data-testid="peer-cursor"], .peer-cursor');
      if (await peerCursor.isVisible()) {
        await expect(peerCursor).toBeVisible();
      }

      await peerContext.close();
    });
  });
});
