import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('Canvas a11y', () => {
  test('canvas view has no serious/critical issues after basic interaction', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page.getByRole('heading', { name: /choose your challenge/i }).waitFor();
    await page
      .getByRole('button', { name: /start challenge/i })
      .first()
      .click();

    // Wait for canvas UI
    const reactFlow = page.locator('.react-flow');
    await expect(reactFlow).toBeVisible();

    // Do a minimal interaction (drag one palette item) to render nodes
    const paletteItem = page.locator('[data-testid="palette-item-server"]').first();
    const canvas = page.locator('[data-testid="canvas"]');
    if (await paletteItem.count()) {
      await paletteItem.dragTo(canvas);
    }

    // Run axe with common WCAG tags; exclude minimap and SVG edges for noise
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.react-flow__minimap')
      .exclude('.react-flow__edge')
      .analyze();

    const serious = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(serious, `Axe violations: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  });
});
