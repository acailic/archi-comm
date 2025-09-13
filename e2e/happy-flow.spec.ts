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

  // Add a component using manual drag and drop events
  const paletteItem = page.locator('[data-testid="palette-item-server"]').first();
  const canvas = page.locator('[data-testid="canvas"]');
  
  // Wait for both elements to be ready
  await canvas.waitFor({ state: 'visible' });
  await paletteItem.waitFor({ state: 'visible' });
  
  // Manual drag and drop using mouse events
  const paletteBox = await paletteItem.boundingBox();
  const canvasBox = await canvas.boundingBox();
  
  if (paletteBox && canvasBox) {
    // Start drag from palette item center
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    
    // Move to canvas center and drop
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.up();
  }
  
  // Wait a bit for the component to be processed
  await page.waitForTimeout(1000);
  
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

