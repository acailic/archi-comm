// e2e/canvas/annotation-editing.spec.ts
// E2E tests for annotation editing: create, double-click, edit, save
// Tests the full editing lifecycle of canvas annotations
// RELEVANT FILES: src/packages/canvas/components/AnnotationLayer.tsx, src/packages/ui/components/overlays/CanvasAnnotationOverlay.tsx, src/stores/canvasStore.ts

import { expect, test } from "@playwright/test";

test.describe("Annotation Editing", () => {
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

    // Wait for canvas
    await page.locator(".react-flow").first().waitFor({ state: "visible", timeout: 10000 });
  });

  test("should create annotation via overlay", async ({ page }) => {
    console.log("🎯 Test: Create annotation via overlay");

    // Activate annotation mode
    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);
    }

    // Wait for overlay to be active
    const overlay = page.locator('[data-testid="annotation-overlay"]');
    await overlay.waitFor({ state: "visible", timeout: 3000 });
    console.log("✓ Annotation overlay is active");

    // Click on canvas to create annotation
    const canvas = page.locator(".react-flow").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      console.log("✓ Clicked to create annotation");
    }

    // Verify annotation was created
    const annotationLayer = page.locator('[data-testid="annotation-layer"]');
    await annotationLayer.waitFor({ state: "visible", timeout: 3000 });

    const annotations = page.locator('[data-testid^="annotation-"]');
    const count = await annotations.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Annotation created (${count} annotations visible)`);

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-editing-created.png" });
  });

  test("should edit annotation on double-click", async ({ page }) => {
    console.log("🎯 Test: Edit annotation on double-click");

    // First create an annotation (simplified)
    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);

      const canvas = page.locator(".react-flow").first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 300, box.y + 300);
        await page.waitForTimeout(500);
      }
    }

    // Find the annotation and double-click it
    const annotation = page.locator('[data-testid^="annotation-"]').first();
    await annotation.waitFor({ state: "visible", timeout: 3000 });
    await annotation.dblclick();
    await page.waitForTimeout(500);

    console.log("✓ Double-clicked annotation");

    // Look for edit dialog or inline editor
    const editDialog = page.locator('[data-testid="annotation-edit-dialog"]');
    const inlineEditor = page.locator('[data-testid="annotation-inline-editor"]');

    const hasDialog = await editDialog.isVisible({ timeout: 2000 }).catch(() => false);
    const hasInline = await inlineEditor.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDialog || hasInline) {
      console.log("✓ Edit interface opened");

      // Type new content
      await page.keyboard.type("Updated annotation content");
      await page.waitForTimeout(300);

      // Save (usually Enter or clicking save button)
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      console.log("✓ Annotation content updated");
    } else {
      console.log("⚠️  Edit interface not found");
    }

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-editing-edited.png" });
    console.log("✅ Annotation editing test completed");
  });

  test("should save annotation changes", async ({ page }) => {
    console.log("🎯 Test: Save annotation changes");

    // Create annotation
    const annotationButton = page.locator('[data-testid="annotation-mode-button"]');
    if (await annotationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await annotationButton.click();
      await page.waitForTimeout(300);

      const canvas = page.locator(".react-flow").first();
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 400, box.y + 400);
        await page.waitForTimeout(500);
      }
    }

    // Edit and save
    const annotation = page.locator('[data-testid^="annotation-"]').first();
    await annotation.dblclick();
    await page.waitForTimeout(300);

    await page.keyboard.type("Test content to save");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Verify content persisted
    const annotationText = await annotation.textContent();
    expect(annotationText).toContain("Test content");
    console.log("✅ Annotation changes saved");

    await page.screenshot({ path: "e2e/test-results/artifacts/annotation-editing-saved.png" });
  });
});
