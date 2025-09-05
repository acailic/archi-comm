import { test, expect } from '@playwright/test';
import path from 'path';

test('canvas drawing: drag, connect, annotate, import', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start your journey/i }).click();

  // Open first challenge
  await page.getByRole('button', { name: /start challenge/i }).first().click();

  const canvas = page.locator('[data-testid="canvas"]');
  const server = page.locator('[data-testid="palette-item-server"]').first();
  const database = page.locator('[data-testid="palette-item-database"]').first();

  await server.dragTo(canvas);
  await database.dragTo(canvas);

  // Connect components
  await page.getByRole('button', { name: /add connection/i }).click();
  await page.getByText(/^Server$/).first().click();
  await page.getByText(/^Database$/).first().click();
  await expect(page.getByText(/connection types/i)).toBeVisible();

  // Add a note by double click
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');
  await page.mouse.dblclick(box.x + 50, box.y + 50);
  await expect(page.getByText(/^Note$/)).toBeVisible();

  // Import JSON design
  const input = page.locator('[data-testid="import-json-input"]');
  const samplePath = path.resolve(__dirname, 'fixtures/design-sample.json');
  await input.setInputFiles(samplePath);
  // after import, expect a known label from fixture
  await expect(page.getByText(/API Gateway/i)).toBeVisible();
});

