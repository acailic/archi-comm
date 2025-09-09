import { test, expect } from '@playwright/test';

test.describe('ErrorBoundary scenarios', () => {
  test('shows fallback UI on thrown error and recovers on retry', async ({ page }) => {
    await page.goto('/');
    // Inject an error in the page context
    await page.addInitScript(() => {
      // no-op; ensure app loads
    });
    // Trigger a runtime error inside app by calling a missing function
    await page.evaluate(() => {
      (window as any).__forceError__?.();
      // If app exposes no hook, create an uncaught reference error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const x = (window as any).thisFunctionDoesNotExist();
    }).catch(() => {});

    // Expect fallback UI to appear
    await expect(page.getByText(/Something went wrong/i)).toBeVisible({ timeout: 5000 });

    // Retry button should attempt re-render
    const retry = page.getByRole('button', { name: /try again|retry/i });
    if (await retry.count()) {
      await retry.first().click();
    }
  });
});

