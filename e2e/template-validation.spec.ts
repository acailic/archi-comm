import { expect, test } from '@playwright/test';
import { testDataManager, TestUtils } from './utils/test-data-manager';

test.describe('Template Validation Tests', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page.getByRole('button', { name: /start challenge/i }).first().click();
    await TestUtils.waitForStableCanvas(page, 10_000);
  });

  // Industry templates
  test('validates e-commerce platform template', async ({ page }) => {
    const fixture = testDataManager.getFixture('industry-ecommerce');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  test('validates fintech platform template', async ({ page }) => {
    const fixture = testDataManager.getFixture('industry-fintech');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  test('validates healthcare system template', async ({ page }) => {
    const fixture = testDataManager.getFixture('industry-healthcare');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  test('validates gaming platform template', async ({ page }) => {
    const fixture = testDataManager.getFixture('industry-gaming');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  // Scalability templates
  test('validates 50-service microservices ecosystem', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-microservices-ecosystem');
    expect(fixture).toBeTruthy();
    const { duration } = await TestUtils.measureOperationTime(async () => {
      await testDataManager.applyDesignToCanvas(page, fixture!);
      await TestUtils.waitForStableCanvas(page, 10_000);
    });
    expect(duration).toBeLessThan(30_000);
  });

  test('validates serverless event-driven architecture', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-serverless');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  test('validates distributed CQRS system', async ({ page }) => {
    const fixture = testDataManager.getFixture('scalability-distributed-cqrs');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  // Legacy templates
  test('validates mainframe bridge integration', async ({ page }) => {
    const fixture = testDataManager.getFixture('legacy-mainframe-bridge');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  test('validates FTP-based integration', async ({ page }) => {
    const fixture = testDataManager.getFixture('legacy-ftp-integration');
    expect(fixture).toBeTruthy();
    await testDataManager.applyDesignToCanvas(page, fixture!);
    const ok = await testDataManager.verifyDesignOnCanvas(page, fixture!);
    expect(ok).toBeTruthy();
  });

  // Performance benchmarks
  test('validates 100-component benchmark @stress', async ({ page }) => {
    const fixture = testDataManager.getFixture('benchmark-100');
    expect(fixture).toBeTruthy();
    const { duration } = await TestUtils.measureOperationTime(async () => {
      await testDataManager.applyDesignToCanvas(page, fixture!);
      await TestUtils.waitForStableCanvas(page, 15_000);
    });
    expect(duration).toBeLessThan(10_000);
    await page.screenshot({ path: `test-artifacts/benchmark-100.png`, fullPage: true });
  });

  test('validates 250-component stress test @stress', async ({ page }) => {
    const fixture = testDataManager.getFixture('benchmark-250');
    expect(fixture).toBeTruthy();
    const { duration } = await TestUtils.measureOperationTime(async () => {
      await testDataManager.applyDesignToCanvas(page, fixture!);
      await TestUtils.waitForStableCanvas(page, 20_000);
    });
    expect(duration).toBeLessThan(25_000);
    await page.screenshot({ path: `test-artifacts/benchmark-250.png`, fullPage: true });
  });

  test('validates 500-component maximum load @stress', async ({ page }) => {
    const fixture = testDataManager.getFixture('benchmark-500');
    expect(fixture).toBeTruthy();
    const { duration } = await TestUtils.measureOperationTime(async () => {
      await testDataManager.applyDesignToCanvas(page, fixture!);
      await TestUtils.waitForStableCanvas(page, 30_000);
    });
    expect(duration).toBeLessThan(30_000);
    await page.screenshot({ path: `test-artifacts/benchmark-500.png`, fullPage: true });
  });

  // Template Integrity
  test('all templates use valid component types', async () => {
    for (const [, tpl] of testDataManager.getAllFixtures()) {
      const result = testDataManager.validateFixtureIntegrity(tpl);
      expect(result.valid, `Missing types: ${result.missingTypes.join(', ')}`).toBeTruthy();
    }
  });

  test('all templates have proper metadata', async () => {
    for (const [key] of testDataManager.getAllFixtures()) {
      const meta = testDataManager.getFixtureMetadata(key);
      expect(meta).toBeTruthy();
      expect(meta!.name).toBeTruthy();
      expect(meta!.category).toBeTruthy();
      expect(meta!.componentCount).toBeGreaterThan(0);
    }
  });

  test('all templates render without errors', async ({ page }) => {
    for (const [, tpl] of testDataManager.getAllFixtures()) {
      await testDataManager.applyDesignToCanvas(page, tpl);
      const ok = await testDataManager.verifyDesignOnCanvas(page, tpl);
      expect(ok).toBeTruthy();
    }
  });
});

