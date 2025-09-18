import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('Accessibility (axe) smoke checks', () => {
  test('home has no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    // Give the app a moment to stabilize visually
    await expect(page).toHaveTitle(/Archi/i);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // Exclude areas known to be noisy in canvas libraries
      .exclude('.react-flow__minimap')
      .analyze();

    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, `Axe violations: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  });
});

