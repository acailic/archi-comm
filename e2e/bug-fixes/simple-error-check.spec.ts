// e2e/bug-fixes/simple-error-check.spec.ts
// Simple test to check if the componentTypes export error is fixed
// Tests app loading without relying on specific DOM elements
// RELEVANT FILES: ComponentPalette.tsx, index.html

import { expect, test } from "@playwright/test";

test.describe("Simple Error Check", () => {
  test("should not have componentTypes export error", async ({ page }) => {
    const errors: string[] = [];

    // Capture all console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto("http://localhost:5174");

    // Wait for JavaScript to execute
    await page.waitForTimeout(5000);

    // Log all errors for debugging
    console.log("All console errors:", errors);

    // Check for the specific export error that we fixed
    const exportErrors = errors.filter(
      (error) =>
        error.includes("does not provide an export named") &&
        error.includes("componentTypes"),
    );

    // This specific error should be fixed
    expect(exportErrors).toHaveLength(0);
  });

  test("should not have CSP font errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("http://localhost:5174");
    await page.waitForTimeout(3000);

    console.log("All console errors:", errors);

    // Check for CSP errors related to fonts
    const fontCspErrors = errors.filter(
      (error) =>
        error.includes("Content Security Policy") &&
        (error.includes("fonts.googleapis.com") ||
          error.includes("fonts.gstatic.com")),
    );

    // This should be fixed by our CSP update
    expect(fontCspErrors).toHaveLength(0);
  });

  test("app should load basic HTML structure", async ({ page }) => {
    await page.goto("http://localhost:5174");

    // Just check that basic HTML loaded
    const title = await page.title();
    expect(title).toBe("ArchiComm");

    // Check that the root div exists
    const root = await page.locator("#root");
    await expect(root).toBeAttached();
  });
});
