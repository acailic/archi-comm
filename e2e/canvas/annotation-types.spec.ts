// e2e/canvas/annotation-types.spec.ts
// E2E tests for different annotation types: note, comment, label, highlight, arrow
// Verifies type-specific behaviors and rendering
// RELEVANT FILES: src/packages/canvas/components/AnnotationLayer.tsx, src/lib/canvas/annotation-utils.ts, src/shared/contracts/index.ts

import { expect, test } from "@playwright/test";

test.describe("Annotation Types", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.waitForLoadState("networkidle");

    // Skip onboarding
    const skipButton = page.locator('button:has-text("Skip")').first();
    const hasSkip = await skipButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasSkip) {
      await skipButton.click();
      await page.waitForTimeout(1000);
    }

    await page.locator(".react-flow").first().waitFor({ state: "visible", timeout: 10000 });
  });

  test("should create note annotation", async ({ page }) => {
    console.log("🎯 Test: Create note annotation");

    // Activate annotation mode
    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);
    }

    // Select note tool
    const noteTool = page.locator('button[data-tool="note"]');
    if (await noteTool.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noteTool.click();
      await page.waitForTimeout(300);
      console.log("✓ Note tool selected");
    }

    // Create note
    const canvas = page.locator(".react-flow").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 200, box.y + 200);
      await page.waitForTimeout(500);
    }

    // Verify note annotation exists with correct type
    const noteAnnotation = page.locator('[data-annotation-type="note"]');
    const noteCount = await noteAnnotation.count();
    expect(noteCount).toBeGreaterThan(0);
    console.log(`✅ Note annotation created (${noteCount} notes)`);

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-type-note.png" });
  });

  test("should create comment annotation", async ({ page }) => {
    console.log("🎯 Test: Create comment annotation");

    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);
    }

    const commentTool = page.locator('button[data-tool="comment"]');
    if (await commentTool.isVisible({ timeout: 2000 }).catch(() => false)) {
      await commentTool.click();
      await page.waitForTimeout(300);
    }

    const canvas = page.locator(".react-flow").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 300, box.y + 200);
      await page.waitForTimeout(500);
    }

    const commentAnnotation = page.locator('[data-annotation-type="comment"]');
    const count = await commentAnnotation.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Comment annotation created (${count} comments)`);

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-type-comment.png" });
  });

  test("should create label annotation", async ({ page }) => {
    console.log("🎯 Test: Create label annotation");

    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);
    }

    const labelTool = page.locator('button[data-tool="label"]');
    if (await labelTool.isVisible({ timeout: 2000 }).catch(() => false)) {
      await labelTool.click();
      await page.waitForTimeout(300);
    }

    const canvas = page.locator(".react-flow").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 400, box.y + 200);
      await page.waitForTimeout(500);
    }

    const labelAnnotation = page.locator('[data-annotation-type="label"]');
    const count = await labelAnnotation.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Label annotation created (${count} labels)`);

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-type-label.png" });
  });

  test("should create highlight annotation", async ({ page }) => {
    console.log("🎯 Test: Create highlight annotation");

    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);
    }

    const highlightTool = page.locator('button[data-tool="highlight"]');
    if (await highlightTool.isVisible({ timeout: 2000 }).catch(() => false)) {
      await highlightTool.click();
      await page.waitForTimeout(300);
    }

    const canvas = page.locator(".react-flow").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 500, box.y + 200);
      await page.waitForTimeout(500);
    }

    const highlightAnnotation = page.locator('[data-annotation-type="highlight"]');
    const count = await highlightAnnotation.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Highlight annotation created (${count} highlights)`);

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-type-highlight.png" });
  });

  test("should create arrow annotation", async ({ page }) => {
    console.log("🎯 Test: Create arrow annotation");

    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);
    }

    const arrowTool = page.locator('button[data-tool="arrow"]');
    if (await arrowTool.isVisible({ timeout: 2000 }).catch(() => false)) {
      await arrowTool.click();
      await page.waitForTimeout(300);
    }

    const canvas = page.locator(".react-flow").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 600, box.y + 200);
      await page.waitForTimeout(500);
    }

    const arrowAnnotation = page.locator('[data-annotation-type="arrow"]');
    const count = await arrowAnnotation.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Arrow annotation created (${count} arrows)`);

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-type-arrow.png" });
  });
});
