import { expect, test } from '@playwright/test';
import { testDataManager, TestUtils } from './utils/test-data-manager';

test.describe('Legacy System Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page.getByRole('button', { name: /start challenge/i }).first().click();
    await TestUtils.waitForStableCanvas(page, 10_000);
  });

  test('mainframe to modern API bridge', async ({ page }) => {
    const fx = testDataManager.getFixture('legacy-mainframe-bridge');
    await testDataManager.applyDesignToCanvas(page, fx!);
    expect(await testDataManager.verifyDesignOnCanvas(page, fx!)).toBeTruthy();
  });

  test('mainframe data synchronization', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-database"]').first().dragTo(canvas, { targetPosition: { x: 140, y: 120 } });
    await page.locator('[data-testid="palette-item-etl"]').first().dragTo(canvas, { targetPosition: { x: 300, y: 120 } });
    await page.locator('[data-testid="palette-item-postgresql"]').first().dragTo(canvas, { targetPosition: { x: 460, y: 120 } });
    await expect(page.locator('.react-flow__node').filter({ hasText: 'ETL' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'PostgreSQL' })).toBeVisible();
  });

  test('FTP file processing workflow', async ({ page }) => {
    const fx = testDataManager.getFixture('legacy-ftp-integration');
    await testDataManager.applyDesignToCanvas(page, fx!);
    expect(await testDataManager.verifyDesignOnCanvas(page, fx!)).toBeTruthy();
  });

  test('message transformation patterns', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-message-queue"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-server"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Message Queue' })).toBeVisible();
  });

  test('strangler fig pattern', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-api-gateway"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-server"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-microservice"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Api gateway' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Server' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Microservice' })).toBeVisible();
  });
});

