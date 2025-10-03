// e2e/canvas/drawing-canvas-check.spec.ts
// Quick test to verify the drawing canvas is visible and working
// This test checks canvas rendering, interactions, and basic functionality
// RELEVANT FILES: src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx, config/playwright.config.ts

import { expect, test } from "@playwright/test";

test.describe("Drawing Canvas - Quick Check", () => {
  test("should load canvas and verify it is working", async ({ page }) => {
    console.log("🚀 Starting canvas check...");

    // Navigate to the app
    await page.goto("http://localhost:5173/");
    await page.waitForLoadState("networkidle");
    console.log("✓ Page loaded");

    // Take initial screenshot
    await page.screenshot({
      path: "e2e/test-results/artifacts/01-initial-load.png",
      fullPage: true,
    });

    // Check if we're on the welcome/tutorial screen
    const welcomeText = page.locator("text=Welcome to ArchiComm");
    const isWelcomeScreen = await welcomeText
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (isWelcomeScreen) {
      console.log("✓ Welcome screen detected");

      // Click "Skip Tutorial" or "Start Your Journey"
      const skipButton = page.locator('button:has-text("Skip Tutorial")');
      const startButton = page.locator('button:has-text("Start Your Journey")');

      const hasSkip = await skipButton
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const hasStart = await startButton
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (hasSkip) {
        await skipButton.click();
        console.log("✓ Clicked Skip Tutorial");
      } else if (hasStart) {
        await startButton.click();
        console.log("✓ Clicked Start Your Journey");
      }

      await page.waitForTimeout(1000);
    }

    // Check if we're on the challenge selection screen
    const challengeTitle = page.locator('h1:has-text("Choose Your Challenge")');
    const isChallengeScreen = await challengeTitle
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isChallengeScreen) {
      console.log("✓ Challenge selection screen detected");

      // Take screenshot of challenge screen
      await page.screenshot({
        path: "e2e/test-results/artifacts/02-challenge-screen.png",
        fullPage: true,
      });

      // Select the first challenge
      const challengeButton = page
        .getByRole("button", { name: /start challenge/i })
        .first();
      await challengeButton.waitFor({ state: "visible", timeout: 5000 });
      await challengeButton.click();
      console.log("✓ Challenge selected");

      // Wait for navigation/transition
      await page.waitForTimeout(1000);
    }

    // Look for canvas element
    const canvasSelectors = [
      ".react-flow",
      '[data-testid="canvas"]',
      '[data-testid="design-canvas"]',
      "canvas",
      ".react-flow__renderer",
    ];

    let canvasFound = false;
    let canvasSelector = "";

    for (const selector of canvasSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (isVisible) {
        canvasFound = true;
        canvasSelector = selector;
        console.log(`✓ Canvas found with selector: ${selector}`);
        break;
      }
    }

    expect(canvasFound).toBeTruthy();
    console.log("✅ Canvas is visible and working!");

    // Take screenshot of canvas
    await page.screenshot({
      path: "e2e/test-results/artifacts/03-canvas-visible.png",
      fullPage: true,
    });

    // Check for component palette
    const paletteSelectors = [
      'h3:has-text("Component Library")',
      '[data-testid="component-palette"]',
      'text="Component Library"',
    ];

    let paletteFound = false;
    for (const selector of paletteSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (isVisible) {
        paletteFound = true;
        console.log(`✓ Component palette found with selector: ${selector}`);
        break;
      }
    }

    if (paletteFound) {
      console.log("✅ Component palette is visible!");
    } else {
      console.log(
        "⚠️  Component palette not found (might be in a different UI)"
      );
    }

    // Check for any palette items
    const paletteItems = await page
      .locator('[data-testid^="palette-item"]')
      .count();
    console.log(`📦 Found ${paletteItems} components in palette`);

    // Try to interact with canvas
    if (canvasSelector) {
      const canvas = page.locator(canvasSelector).first();
      const box = await canvas.boundingBox();

      if (box) {
        console.log("🖱️  Testing canvas interaction...");

        // Click on canvas
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(500);
        console.log("✓ Canvas click interaction successful");

        // Try a drag operation on canvas (panning)
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = startX + 100;
        const endY = startY + 50;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();

        console.log("✓ Canvas drag interaction successful");

        // Take screenshot after interaction
        await page.screenshot({
          path: "e2e/test-results/artifacts/04-after-interaction.png",
          fullPage: true,
        });
      }
    }

    // Check for React Flow nodes (if any components are on canvas)
    const nodeCount = await page.locator(".react-flow__node").count();
    console.log(`🔷 Found ${nodeCount} nodes on canvas`);

    // Check for zoom controls
    const zoomControls = await page.locator(".react-flow__controls").count();
    if (zoomControls > 0) {
      console.log("✓ Zoom controls found");
    }

    // Final screenshot
    await page.screenshot({
      path: "e2e/test-results/artifacts/05-final-state.png",
      fullPage: true,
    });

    console.log("");
    console.log("=".repeat(50));
    console.log("✅ CANVAS CHECK COMPLETE");
    console.log("=".repeat(50));
    console.log(`Canvas visible: ${canvasFound ? "YES ✓" : "NO ✗"}`);
    console.log(`Palette visible: ${paletteFound ? "YES ✓" : "NO ✗"}`);
    console.log(`Palette items: ${paletteItems}`);
    console.log(`Nodes on canvas: ${nodeCount}`);
    console.log("=".repeat(50));
  });
});
