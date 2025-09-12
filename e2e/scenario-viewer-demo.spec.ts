import { test, expect } from '@playwright/test';

// Helper to read the currently rendered scenario id from the preview area
async function getCurrentScenarioId(page: import('@playwright/test').Page) {
  const locator = page.locator("[data-testid='scenario-content'] [data-testid^='scenario-']");
  const count = await locator.count();
  if (count === 0) return null;
  const attr = await locator.first().getAttribute('data-testid');
  // data-testid is in the form "scenario-<id>"
  return attr?.replace(/^scenario-/, '') ?? null;
}

test.describe('Scenario Viewer Demo Mode', () => {
  test('auto-cycles scenarios when Demo Mode is enabled', async ({ page }) => {
    await page.goto('/dev/scenarios');

    // Scenario Viewer should be visible
    await expect(page.getByTestId('scenario-viewer')).toBeVisible();

    // Ensure no scenario is initially selected (or tolerate if already selected)
    const initialId = await getCurrentScenarioId(page);

    // Toggle Demo Mode on via the UI button
    const demoButton = page.getByRole('button', { name: /demo mode|stop demo/i });
    await expect(demoButton).toBeVisible();

    // If already in demo mode (button says Stop Demo), toggle off then on for a clean start
    const label = await demoButton.textContent();
    if (label && /stop demo/i.test(label)) {
      await demoButton.click();
      await expect(demoButton).toHaveText(/demo mode/i);
    }

    // Start demo mode
    await demoButton.click();
    await expect(demoButton).toHaveText(/stop demo/i);

    // First auto-navigation occurs after ~3s; wait slightly longer
    await page.waitForTimeout(3500);

    const firstId = await getCurrentScenarioId(page);
    expect(firstId).not.toBeNull();
    if (initialId) {
      // If there was an initial selection, it should have changed
      expect(firstId).not.toBe(initialId);
    }

    // Wait for another cycle and expect the scenario to change again
    await page.waitForTimeout(3500);
    const secondId = await getCurrentScenarioId(page);
    expect(secondId).not.toBeNull();
    expect(secondId).not.toBe(firstId);

    // Turn off demo mode and ensure it stops auto-cycling
    await demoButton.click();
    await expect(demoButton).toHaveText(/demo mode/i);
    const stableId = await getCurrentScenarioId(page);
    await page.waitForTimeout(3500);
    const stableIdAfter = await getCurrentScenarioId(page);
    // Should be the same (no cycling when demo is off)
    expect(stableIdAfter).toBe(stableId);
  });
});

