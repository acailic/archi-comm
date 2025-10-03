import { test, expect } from '@playwright/test';

test.describe('Onboarding skip controls', () => {
  test('Skip Tutorial and Skip tour dismiss overlays', async ({ page }) => {
    await page.goto('/');

    const welcomeDialog = page.getByRole('dialog', { name: /welcome to archicomm/i });
    await expect(welcomeDialog).toBeVisible();

    await page.getByRole('button', { name: /skip tutorial/i }).click();
    await expect(welcomeDialog).toBeHidden();

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('onboarding:start', {
          detail: { flowId: 'guided-tour' },
        })
      );
    });

    const guidedTitle = page.locator('text=Welcome to ArchiComm!');
    await expect(guidedTitle).toBeVisible();

    await page.getByRole('button', { name: /^skip$/i }).click();
    await expect(guidedTitle).toBeHidden();
  });
});
