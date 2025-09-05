import { test, expect } from '@playwright/test';

test('happy flow: welcome -> select -> canvas -> audio -> review', async ({ page }) => {
  await page.goto('/');

  // Welcome: proceed
  await page.getByRole('button', { name: /start your journey/i }).click();

  // Challenge selection: pick first challenge
  await page.getByRole('heading', { name: /choose your challenge/i }).waitFor();
  await page.getByRole('button', { name: /start challenge/i }).first().click();

  // Design canvas: initially continue disabled
  const continueBtn = page.getByRole('button', { name: /continue to recording/i });
  await expect(continueBtn).toBeDisabled();

  // Drag a component to the canvas and continue
  const paletteItem = page.locator('[data-testid="palette-item-server"]').first();
  const canvas = page.locator('[data-testid="canvas"]');
  await paletteItem.dragTo(canvas);
  await expect(continueBtn).toBeEnabled();
  await continueBtn.click();

  // Audio recording: type transcript to enable continue
  await page.getByRole('heading', { name: /record your explanation/i }).waitFor();
  await page.getByPlaceholder(/enter your explanation text/i).fill('This is my system design rationale.');
  await page.getByRole('button', { name: /continue to review/i }).click();

  // Review screen: verify success
  await expect(page.getByText(/session complete/i)).toBeVisible();
  await expect(page.getByText(/performance analysis/i)).toBeVisible();
});

