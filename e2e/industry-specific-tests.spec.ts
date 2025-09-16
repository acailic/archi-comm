import { expect, test } from '@playwright/test';
import { testDataManager, TestUtils } from './utils/test-data-manager';

async function openCanvas(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();
  await page.getByRole('button', { name: /start challenge/i }).first().click();
  await TestUtils.waitForStableCanvas(page, 10_000);
}

test.describe('Industry-Specific Architecture Tests', () => {
  test('e-commerce platform design workflow', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');

    // Start with basic web app
    await page.locator('[data-testid="palette-item-web-app"]').first().dragTo(canvas, { targetPosition: { x: 120, y: 120 } });

    // Add API Gateway and a couple services progressively
    await page.locator('[data-testid="palette-item-api-gateway"]').first().dragTo(canvas, { targetPosition: { x: 300, y: 120 } });
    await page.locator('[data-testid="palette-item-microservice"]').first().dragTo(canvas, { targetPosition: { x: 480, y: 80 } });
    await page.locator('[data-testid="palette-item-microservice"]').nth(1).dragTo(canvas, { targetPosition: { x: 480, y: 160 } });

    // Add data layer and analytics
    await page.locator('[data-testid="palette-item-postgresql"]').first().dragTo(canvas, { targetPosition: { x: 680, y: 140 } });
    await page.locator('[data-testid="palette-item-redis"]').first().dragTo(canvas, { targetPosition: { x: 680, y: 80 } });
    await page.locator('[data-testid="palette-item-elasticsearch"]').first().dragTo(canvas, { targetPosition: { x: 680, y: 200 } });

    // Verify components
    await expect(page.locator('.react-flow__node').filter({ hasText: /web app/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /api gateway/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /microservice/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /postgresql/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /redis/i })).toBeVisible();
  });

  test('e-commerce scalability planning', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    // Monolith to microservices
    await page.locator('[data-testid="palette-item-server"]').first().dragTo(canvas, { targetPosition: { x: 140, y: 120 } });
    await page.locator('[data-testid="palette-item-load-balancer"]').first().dragTo(canvas, { targetPosition: { x: 60, y: 120 } });
    await page.locator('[data-testid="palette-item-cdn"]').first().dragTo(canvas, { targetPosition: { x: 260, y: 60 } });
    await page.locator('[data-testid="palette-item-cache"]').first().dragTo(canvas, { targetPosition: { x: 260, y: 180 } });
    // Verify
    await expect(page.locator('.react-flow__node').filter({ hasText: /load balancer/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /cdn/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /cache/i })).toBeVisible();
  });

  test('e-commerce security implementation', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-authentication"]').first().dragTo(canvas, { targetPosition: { x: 300, y: 120 } });
    await page.locator('[data-testid="palette-item-authorization"]').first().dragTo(canvas, { targetPosition: { x: 420, y: 120 } });
    await page.locator('[data-testid="palette-item-oauth"]').first().dragTo(canvas, { targetPosition: { x: 540, y: 120 } });
    await page.locator('[data-testid="palette-item-jwt"]').first().dragTo(canvas, { targetPosition: { x: 660, y: 120 } });
    await expect(page.locator('.react-flow__node').filter({ hasText: /authentication/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /authorization/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /oauth/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /jwt/i })).toBeVisible();
  });

  test('fintech platform compliance design', async ({ page }) => {
    await openCanvas(page);
    const fixture = testDataManager.getFixture('industry-fintech');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  test('payment processing architecture', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-api-gateway"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-microservice"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-microservice"]').nth(1).dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Microservice' })).toBeVisible();
  });

  test('fintech data architecture', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-data-warehouse"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-elasticsearch"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Data Warehouse' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Elasticsearch' })).toBeVisible();
  });

  test('healthcare system integration', async ({ page }) => {
    await openCanvas(page);
    const fixture = testDataManager.getFixture('industry-healthcare');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    expect(await testDataManager.verifyDesignOnCanvas(page, fixture!)).toBeTruthy();
  });

  test('healthcare compliance architecture', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-security"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-logging"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Security' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Logging' })).toBeVisible();
  });

  test('telemedicine platform design', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-websocket"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-microservice"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-mongodb"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'WebSocket' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'MongoDB' })).toBeVisible();
  });

  test('multiplayer game architecture', async ({ page }) => {
    await openCanvas(page);
    const fixture = testDataManager.getFixture('industry-gaming');
    await testDataManager.applyDesignToCanvas(page, fixture!);
    expect(await testDataManager.verifyDesignOnCanvas(page, fixture!)).toBeTruthy();
  });

  test('gaming analytics platform', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-elasticsearch"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-metrics"]').first().dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: /elasticsearch/i })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: /metrics/i })).toBeVisible();
  });

  test('gaming infrastructure scaling', async ({ page }) => {
    await openCanvas(page);
    const canvas = page.locator('[data-testid="canvas"]');
    await page.locator('[data-testid="palette-item-load-balancer"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-server"]').first().dragTo(canvas);
    await page.locator('[data-testid="palette-item-server"]').nth(1).dragTo(canvas);
    await expect(page.locator('.react-flow__node').filter({ hasText: /load balancer/i })).toBeVisible();
  });

  // Cross-industry patterns
  test('microservices pattern validation', async ({ page }) => {
    await openCanvas(page);
    const ms = testDataManager.getFixture('scalability-microservices-ecosystem');
    await testDataManager.applyDesignToCanvas(page, ms!);
    await TestUtils.waitForStableCanvas(page, 10_000);
    const nodes = page.locator('.react-flow__node');
    expect(await nodes.count()).toBeGreaterThan(40);
  });

  test('event-driven architecture validation', async ({ page }) => {
    await openCanvas(page);
    const sls = testDataManager.getFixture('scalability-serverless');
    await testDataManager.applyDesignToCanvas(page, sls!);
    expect(await testDataManager.verifyDesignOnCanvas(page, sls!)).toBeTruthy();
  });

  test('API gateway pattern validation', async ({ page }) => {
    await openCanvas(page);
    await page.locator('[data-testid="palette-item-api-gateway"]').first().dragTo(page.locator('[data-testid="canvas"]'));
    await expect(page.locator('.react-flow__node').filter({ hasText: /api gateway/i })).toBeVisible();
  });
});
