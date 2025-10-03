import { test, expect } from '@playwright/test';

test.describe('Review workflow (dev scenario)', () => {
  test('renders review screen and key panels', async ({ page }) => {
    await page.goto('/dev/scenarios?scenario=dev-experience:review-basic');

    // Expect core panels from ReviewScreen to render
    await expect(page.getByText(/Self-Assessment Checklist/i)).toBeVisible();
    await expect(page.getByText(/Performance Analysis/i)).toBeVisible();
    await expect(page.getByText(/Components Used/i)).toBeVisible();
  });
});

