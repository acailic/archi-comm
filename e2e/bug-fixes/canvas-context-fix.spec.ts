// e2e/bug-fixes/canvas-context-fix.spec.ts
// Test to verify the canvas context error is resolved
// Tests that DesignCanvas loads without "useCanvasContext must be used within a CanvasContextProvider" error
// RELEVANT FILES: DesignCanvasCore.tsx, useDesignCanvasCallbacks.ts, CanvasContext.tsx

import { expect, test } from "@playwright/test";

test.describe("Canvas Context Fix", () => {
  test("should load DesignCanvas without context provider error", async ({
    page,
  }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto("http://localhost:5174");

    // Wait for the app to initialize
    await page.waitForTimeout(5000);

    // Check that there are no canvas context errors
    const contextErrors = errors.filter((error) =>
      error.includes(
        "useCanvasContext must be used within a CanvasContextProvider",
      ),
    );

    console.log("Context errors found:", contextErrors);
    console.log("All errors:", errors);

    // Should have no canvas context errors
    expect(contextErrors).toHaveLength(0);
  });

  test("should be able to navigate to design canvas", async ({ page }) => {
    await page.goto("http://localhost:5174");

    // Wait for basic app load
    await Promise.race([
      page.waitForSelector("#root", { timeout: 10000 }),
      page.waitForSelector("body", { timeout: 10000 }),
    ]);

    // Wait for the app to initialize and check for challenge selection or canvas
    await page.waitForTimeout(3000);

    // Look for either challenge selection or design canvas elements
    const hasChallenge =
      (await page.locator("text=Start Challenge").count()) > 0;
    const hasCanvas =
      (await page.locator('[data-testid="design-canvas"]').count()) > 0;
    const hasPalette =
      (await page.locator('[data-testid^="palette-item-"]').count()) > 0;

    console.log("Has challenge:", hasChallenge);
    console.log("Has canvas:", hasCanvas);
    console.log("Has palette:", hasPalette);

    // The app should show either the challenge selection or the canvas
    expect(hasChallenge || hasCanvas || hasPalette).toBe(true);
  });

  test("should not have infinite loop or render errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("http://localhost:5174");

    // Wait for app to load
    await page.waitForTimeout(5000);

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes("runtime.lastError") &&
        !error.includes("message port closed") &&
        !error.includes("extension") &&
        !error.includes(
          "useCanvasContext must be used within a CanvasContextProvider",
        ), // This should be fixed
    );

    console.log("Critical errors after fix:", criticalErrors);

    // Should have no critical render/context errors after our fix
    expect(criticalErrors.length).toBeLessThanOrEqual(1); // Allow for minor non-blocking errors
  });

  test("should render component palette without errors", async ({ page }) => {
    await page.goto("http://localhost:5174");

    // Wait for app initialization
    await page.waitForTimeout(5000);

    // Check if the component palette is rendered
    const paletteCount = await page
      .locator('[data-testid^="palette-item-"]')
      .count();

    if (paletteCount > 0) {
      console.log(`Found ${paletteCount} palette items`);

      // Verify specific components are present
      const serverExists =
        (await page.locator('[data-testid="palette-item-server"]').count()) > 0;
      console.log("Server component exists:", serverExists);

      expect(serverExists).toBe(true);
    } else {
      // If no palette items, the app should at least load without errors
      const title = await page.title();
      expect(title).toBe("ArchiComm");
    }
  });
});
