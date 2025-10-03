import { test, expect } from '@playwright/test';

test.describe('Import/Export (dev scenario)', () => {
  test('export menu opens and clipboard import succeeds', async ({ page }) => {
    // Provide clipboard content matching expected import shape
    await page.addInitScript(() => {
      // @ts-ignore
      window.__TEST_CLIPBOARD__ = JSON.stringify({
        formatVersion: '1.0',
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          exportedAt: new Date().toISOString(),
          version: '1.0',
          formatVersion: '1.0',
          application: { name: 'ArchiComm', version: '1.0.0', platform: 'web' },
        },
        design: {
          components: [],
          connections: [],
          infoCards: [],
          layers: [],
          metadata: { version: '1.0' },
        },
        canvas: { viewport: { x: 0, y: 0, zoom: 1 } },
        analytics: {
          componentCount: 0,
          connectionCount: 0,
          infoCardCount: 0,
          timeSpent: 0,
          componentTypes: [],
          complexity: { score: 0, factors: { componentVariety: 0, connectionDensity: 0, layerComplexity: 0 } },
        },
      });
      // @ts-ignore
      navigator.clipboard = {
        // @ts-ignore
        readText: async () => window.__TEST_CLIPBOARD__,
        // @ts-ignore
        writeText: async (_t: string) => {},
      };
    });

    await page.goto('/dev/scenarios?scenario=dev-experience:import-export');

    // Open dropdown and verify export menu item appears
    const trigger = page.locator('button[title="Export Design"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole('menuitem', { name: /Export as JSON/i })).toBeVisible();

    // Import from clipboard and expect success toast
    await page.getByRole('menuitem', { name: /Import from Clipboard/i }).click();
    await expect(page.getByText(/Design imported from clipboard/i)).toBeVisible();
  });
});

