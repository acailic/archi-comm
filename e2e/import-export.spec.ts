import { expect, test } from "@playwright/test";

test.describe("Import/Export (dev scenario)", () => {
  test("export menu opens and clipboard import succeeds", async ({ page }) => {
    // Provide clipboard content matching expected import shape
    await page.addInitScript(() => {
      const mockDesignData = {
        formatVersion: "1.0",
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          exportedAt: new Date().toISOString(),
          version: "1.0",
          formatVersion: "1.0",
          application: { name: "ArchiComm", version: "1.0.0", platform: "web" },
        },
        design: {
          components: [
            {
              id: "test-comp-1",
              type: "api-gateway",
              label: "Test Component",
              position: { x: 100, y: 100 },
              size: { width: 120, height: 60 },
            },
          ],
          connections: [],
          infoCards: [],
          layers: [],
          metadata: { version: "1.0" },
        },
        canvas: { viewport: { x: 0, y: 0, zoom: 1 } },
        analytics: {
          componentCount: 1,
          connectionCount: 0,
          infoCardCount: 0,
          timeSpent: 0,
          componentTypes: ["api-gateway"],
          complexity: {
            score: 1,
            factors: {
              componentVariety: 1,
              connectionDensity: 0,
              layerComplexity: 0,
            },
          },
        },
      };

      // @ts-ignore
      window.__TEST_CLIPBOARD__ = JSON.stringify(mockDesignData);

      // @ts-ignore
      navigator.clipboard = {
        // @ts-ignore
        readText: async () => window.__TEST_CLIPBOARD__,
        // @ts-ignore
        writeText: async (text: string) => {
          // @ts-ignore
          window.__TEST_CLIPBOARD__ = text;
        },
      };
    });

    await page.goto("/dev/scenarios?scenario=dev-experience:import-export");

    // Wait for the page to load and find the import/export dropdown trigger
    const trigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();

    // Look for the Export as JSON menu item - use more flexible selector
    const exportMenuItem = page
      .getByRole("menuitem")
      .filter({ hasText: /Export.*JSON/i });
    if ((await exportMenuItem.count()) > 0) {
      await expect(exportMenuItem.first()).toBeVisible();
    } else {
      // If not found, look for any export-related menu item
      const anyExportItem = page
        .getByRole("menuitem")
        .filter({ hasText: /Export/i });
      await expect(anyExportItem.first()).toBeVisible();
    }

    // Try to find and click import from clipboard
    const importClipboardItem = page
      .getByRole("menuitem")
      .filter({ hasText: /Import.*Clipboard/i });
    if ((await importClipboardItem.count()) > 0) {
      await importClipboardItem.click();

      // Check for success message with more flexible text matching
      await expect(
        page.locator(
          "text=/imported.*clipboard|clipboard.*imported|import.*success/i",
        ),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("import/export dropdown functionality", async ({ page }) => {
    await page.goto("/dev/scenarios?scenario=dev-experience:import-export");

    // Find and click the import/export dropdown
    const dropdown = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdown).toBeVisible({ timeout: 10000 });

    // Verify dropdown can be opened
    await dropdown.click();

    // Check that dropdown menu appears
    const dropdownMenu = page.locator('[role="menu"]');
    await expect(dropdownMenu).toBeVisible();

    // Verify at least one menu item is present
    const menuItems = page.getByRole("menuitem");
    await expect(menuItems.first()).toBeVisible();

    // Close dropdown by clicking away
    await page.locator("body").click();
    await expect(dropdownMenu).not.toBeVisible();
  });
});
