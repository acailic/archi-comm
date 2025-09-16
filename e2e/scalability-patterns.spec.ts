import { expect, test } from '@playwright/test';
import { testDataManager, TestUtils } from './utils/test-data-manager';

test.describe('Scalability and Distributed Systems Tests', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page.getByRole('button', { name: /start challenge/i }).first().click();
    await TestUtils.waitForStableCanvas(page, 10_000);
  });

  test('microservices ecosystem design @stress', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-microservices-ecosystem');
    const { duration } = await TestUtils.measureOperationTime(async () => {
      await testDataManager.applyDesignToCanvas(page, fixture!);
      await TestUtils.waitForStableCanvas(page, 15_000);
    });
    expect(duration).toBeLessThan(30_000);
    const nodes = page.locator('.react-flow__node');
    expect(await nodes.count()).toBeGreaterThan(45);
  });

  test('microservices communication patterns', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-microservices-ecosystem');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    await TestUtils.waitForStableCanvas(page, 10_000);
    const edges = page.locator('.react-flow__edge');
    await expect(edges.first()).toBeVisible();
    expect(await edges.count()).toBeGreaterThan(0);
  });

  test('microservices monitoring and observability', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-monitoring"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-logging"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-metrics"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Monitoring' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Logging' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Metrics' })).toBeVisible();
  });

  test('serverless event-driven design', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-serverless');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    expect(await testDataManager.verifyDesignOnCanvas(page, fixture!)).toBeTruthy();
  });

  test('serverless scaling patterns', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-lambda"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-message-queue"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: /aws lambda/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /message queue/i })).toBeVisible();
  });

  test('CQRS pattern implementation', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-distributed-cqrs');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    expect(await testDataManager.verifyDesignOnCanvas(page, fixture!)).toBeTruthy();
  });

  test('distributed cache patterns', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-cache"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Cache' })).toBeVisible();
  });

  test('load balancing strategies', async ({ page }) => {
    const fixture = testDataManager.getFixture('benchmark-100');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    await page.locator('[data-testid="palette-item-load-balancer"]').first().dragTo(page.locator('[data-testid="canvas"]'));
    await expect(page.locator('.react-flow__node').filter({ hasText: /load balancer/i })).toBeVisible();
  });
});
