// e2e/import-export-dialog.spec.ts
// Playwright tests for import/export dialog button functionality
// Tests the modal dialog buttons, their states, and functionality
// RELEVANT FILES: ImportExportModal.tsx, ImportExportDropdown.tsx, DesignCanvasHeader.tsx

import { expect, test } from "@playwright/test";

test.describe("Import/Export Dialog Buttons", () => {
  test.beforeEach(async ({ page }) => {
    // Set up clipboard mock for import functionality
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
              label: "Test API Gateway",
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

      // Mock clipboard API
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

      // Mock file download
      // @ts-ignore
      window.__mockDownload = (filename: string, content: string) => {
        console.log(`Mock download: ${filename}`, content);
      };
    });

    // Navigate to a design canvas page with some test data
    await page.goto("/dev/scenarios?scenario=dev-experience:import-export");
  });

  test("export button should be visible and clickable in export dialog", async ({
    page,
  }) => {
    // Open the import/export dropdown
    const dropdownTrigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    // Click on "Advanced Export..." to open the modal
    const advancedExportItem = page.getByRole("menuitem", {
      name: /Advanced Export/i,
    });
    await expect(advancedExportItem).toBeVisible();
    await advancedExportItem.click();

    // Wait for the export dialog to open
    const exportDialog = page.locator('[role="dialog"]');
    await expect(exportDialog).toBeVisible();

    // Verify dialog title contains "Export"
    await expect(
      page.getByRole("heading", { name: /Export Design/i }),
    ).toBeVisible();

    // Verify the export button exists and has correct text
    const exportButton = page
      .getByRole("button", { name: /Export Design/i })
      .last();
    await expect(exportButton).toBeVisible();
    await expect(exportButton).not.toBeDisabled();

    // Verify button contains the export icon and text
    await expect(exportButton.locator("svg")).toBeVisible(); // Download icon

    // Click the export button
    await exportButton.click();

    // Verify the button changes state to processing
    await expect(
      page.getByRole("button", { name: /Exporting/i }),
    ).toBeVisible();

    // Wait for export to complete and verify success message
    await expect(page.getByText(/exported successfully/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("import button should be visible and clickable in import dialog", async ({
    page,
  }) => {
    // Open the import/export dropdown
    const dropdownTrigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    // Look for import from file option
    const importItem = page.getByRole("menuitem", {
      name: /Import from File/i,
    });
    await expect(importItem).toBeVisible();
    await importItem.click();

    // Wait for the import dialog to open
    const importDialog = page.locator('[role="dialog"]');
    await expect(importDialog).toBeVisible();

    // Verify dialog title contains "Import"
    await expect(
      page.getByRole("heading", { name: /Import Design/i }),
    ).toBeVisible();

    // Create a test file input
    const fileInput = page.locator('input[type="file"]');

    // Create a mock JSON file for import
    const testContent = JSON.stringify({
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
            id: "imported-comp-1",
            type: "database",
            label: "Imported Database",
            position: { x: 200, y: 150 },
            size: { width: 100, height: 80 },
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
        componentTypes: ["database"],
        complexity: {
          score: 1,
          factors: {
            componentVariety: 1,
            connectionDensity: 0,
            layerComplexity: 0,
          },
        },
      },
    });

    // Upload the test file
    await fileInput.setInputFiles({
      name: "test-design.json",
      mimeType: "application/json",
      buffer: Buffer.from(testContent),
    });

    // Verify the import button becomes enabled after file selection
    const importButton = page
      .getByRole("button", { name: /Import Design/i })
      .last();
    await expect(importButton).toBeVisible();
    await expect(importButton).not.toBeDisabled();

    // Verify button contains the import icon and text
    await expect(importButton.locator("svg")).toBeVisible(); // Upload icon

    // Click the import button
    await importButton.click();

    // Verify the button changes state to processing
    await expect(
      page.getByRole("button", { name: /Importing/i }),
    ).toBeVisible();

    // Wait for import to complete and verify success message
    await expect(page.getByText(/imported successfully/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("export button should be disabled when no design data exists", async ({
    page,
  }) => {
    // Navigate to an empty canvas
    await page.goto("/challenges/system-design");

    // Open the import/export dropdown
    const dropdownTrigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    // Click on "Advanced Export..." to open the modal
    const advancedExportItem = page.getByRole("menuitem", {
      name: /Advanced Export/i,
    });
    if (await advancedExportItem.isVisible()) {
      await advancedExportItem.click();

      // Wait for the export dialog to open
      const exportDialog = page.locator('[role="dialog"]');
      await expect(exportDialog).toBeVisible();

      // Verify the export button is disabled when no design data
      const exportButton = page
        .getByRole("button", { name: /Export Design/i })
        .last();
      await expect(exportButton).toBeDisabled();
    }
  });

  test("import button should handle file validation errors gracefully", async ({
    page,
  }) => {
    // Open the import dialog
    const dropdownTrigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    const importItem = page.getByRole("menuitem", {
      name: /Import from File/i,
    });
    await expect(importItem).toBeVisible();
    await importItem.click();

    // Wait for the import dialog to open
    const importDialog = page.locator('[role="dialog"]');
    await expect(importDialog).toBeVisible();

    // Upload an invalid JSON file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "invalid-design.json",
      mimeType: "application/json",
      buffer: Buffer.from("invalid json content"),
    });

    // Try to import
    const importButton = page
      .getByRole("button", { name: /Import Design/i })
      .last();
    await importButton.click();

    // Verify error handling
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("modal should close properly when clicking cancel or close button", async ({
    page,
  }) => {
    // Open export dialog
    const dropdownTrigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    const advancedExportItem = page.getByRole("menuitem", {
      name: /Advanced Export/i,
    });
    await expect(advancedExportItem).toBeVisible();
    await advancedExportItem.click();

    // Verify dialog is open
    const exportDialog = page.locator('[role="dialog"]');
    await expect(exportDialog).toBeVisible();

    // Click cancel button
    const cancelButton = page.getByRole("button", { name: /Cancel/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify dialog closes
    await expect(exportDialog).not.toBeVisible();
  });

  test("buttons should have proper accessibility attributes", async ({
    page,
  }) => {
    // Open export dialog
    const dropdownTrigger = page
      .locator('button[title*="Export Design"], button[title*="Import Design"]')
      .first();
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    const advancedExportItem = page.getByRole("menuitem", {
      name: /Advanced Export/i,
    });
    await expect(advancedExportItem).toBeVisible();
    await advancedExportItem.click();

    // Verify dialog is accessible
    const exportDialog = page.locator('[role="dialog"]');
    await expect(exportDialog).toBeVisible();

    // Check export button accessibility
    const exportButton = page
      .getByRole("button", { name: /Export Design/i })
      .last();

    // Verify button is focusable and has proper role
    await exportButton.focus();
    await expect(exportButton).toBeFocused();

    // Verify button can be activated with Enter key
    await exportButton.press("Enter");

    // Verify processing state maintains accessibility
    const processingButton = page.getByRole("button", { name: /Exporting/i });
    await expect(processingButton).toBeVisible();
    await expect(processingButton).toBeDisabled();
  });
});
