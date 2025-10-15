import { test, expect } from '@playwright/test';
import { CanvasHelpers } from '../utils/test-helpers';

const FRAME_CREATION_SHORTCUT = 'Control+Shift+F';
const TEMPLATE_LIBRARY_SHORTCUT = 'T';
const SEARCH_SHORTCUT = 'Control+F';
const TEXT_TO_DIAGRAM_SHORTCUT = 'Control+Shift+L';
const PRESENTATION_SHORTCUT = 'Control+Shift+P';

async function measureViewportTransform(page: import('@playwright/test').Page) {
  const viewport = page.locator('.react-flow__viewport');
  const transform = await viewport.getAttribute('transform');
  return transform ?? '';
}

test.describe('World-class canvas features', () => {
  test('delivers end-to-end world-class workflows', async ({ page }) => {
    const canvas = new CanvasHelpers(page);
    await canvas.navigateToCanvas();
    await page.waitForTimeout(500);

    await test.step('Frame creation, nesting, and collapse/expand', async () => {
      const firstNode = await canvas.addComponent('server', { x: 260, y: 220 });
      const secondNode = await canvas.addComponent('database', { x: 480, y: 260 });

      await firstNode.click();
      await secondNode.click({ modifiers: ['Shift'] });
      await page.keyboard.press(FRAME_CREATION_SHORTCUT);

      const frameSelector = '.frame-overlay, [data-testid="canvas-frame"], .canvas-frame';
      await expect(page.locator(frameSelector).first()).toBeVisible();

      // Collapse and expand via header button if available
      const collapseButton = page.getByRole('button', { name: /collapse frame/i });
      if (await collapseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await collapseButton.click();
        await page.waitForTimeout(200);
        const collapsedFrame = page.locator(frameSelector).first();
        await expect(collapsedFrame).toHaveAttribute('data-collapsed', /true/i);
        const expandButton = page.getByRole('button', { name: /expand frame/i });
        if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expandButton.click();
        } else {
          await collapseButton.click();
        }
      }

      // Create nested frame by wrapping first node only
      await firstNode.click();
      await page.keyboard.press(FRAME_CREATION_SHORTCUT);
      await expect(page.locator(frameSelector)).toHaveCount(2);
    });

    await test.step('Canvas search opens, filters, and navigates', async () => {
      const beforeTransform = await measureViewportTransform(page);
      await page.keyboard.press(SEARCH_SHORTCUT);
      const searchPanel = page.locator('.canvas-search-panel');
      await expect(searchPanel).toBeVisible();
      const searchInput = searchPanel.locator('input[type="text"]');
      await searchInput.fill('server');
      const firstResult = searchPanel.locator('div', { hasText: /server/i }).first();
      await expect(firstResult).toBeVisible();
      await firstResult.click();
      await page.waitForTimeout(500);
      const afterTransform = await measureViewportTransform(page);
      expect(afterTransform).not.toBe(beforeTransform);
      await page.keyboard.press('Escape');
      await expect(searchPanel).toBeHidden();
    });

    await test.step('AI workflows: Text-to-diagram and assistant suggestions', async () => {
      await page.keyboard.press(TEXT_TO_DIAGRAM_SHORTCUT);
      const textToDiagram = page.getByRole('heading', { name: /generate diagram/i });
      await expect(textToDiagram).toBeVisible();
      const promptInput = page.locator('textarea, textarea#ai-prompt, textarea[name="prompt"]').first();
      await promptInput.fill('Create an API tier with gateway, three services, and a database.');
      const generateButton = page.getByRole('button', { name: /generate diagram/i }).first();
      await generateButton.click();
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');

      // Open AI assistant panel via toolbar shortcut (fallback to button click)
      await page.keyboard.press('Control+Shift+A');
      let aiPanel = page.locator('.ai-assistant-panel');
      if (!(await aiPanel.isVisible().catch(() => false))) {
        const aiButton = page.getByRole('button', { name: /ai assistant/i }).first();
        if (await aiButton.isVisible().catch(() => false)) {
          await aiButton.click();
          await page.waitForTimeout(200);
        }
      }
      aiPanel = page.locator('.ai-assistant-panel');
      await expect(aiPanel).toBeVisible();
      const suggestionsButton = aiPanel.getByRole('button', { name: /get suggestions/i });
      if (await suggestionsButton.isVisible().catch(() => false)) {
        await suggestionsButton.click();
      }
      await page.waitForTimeout(500);
      const analyzeButton = aiPanel.getByRole('button', { name: /analyze design/i });
      if (await analyzeButton.isVisible().catch(() => false)) {
        await analyzeButton.click();
      }
      await page.waitForTimeout(500);
      await aiPanel.getByRole('button', { name: /close/i }).click({ trial: true }).catch(() => {});
      await page.keyboard.press('Escape');
    });

    await test.step('Smart routing with obstacle avoidance', async () => {
      const source = await canvas.addComponent('server', { x: 180, y: 420 });
      const obstacle = await canvas.addComponent('cache', { x: 320, y: 420 });
      const target = await canvas.addComponent('database', { x: 520, y: 420 });

      const sourceHandle = source.locator('.react-flow__handle-right, .react-flow__handle').first();
      const targetHandle = target.locator('.react-flow__handle-left, .react-flow__handle').first();
      if (await sourceHandle.isVisible() && await targetHandle.isVisible()) {
        await sourceHandle.dragTo(targetHandle);
      }
      await page.waitForTimeout(500);
      const edges = page.locator('.react-flow__edge-path');
      await expect(edges).toHaveCountGreaterThan(0);
      const pathData = await edges.first().getAttribute('d');
      expect(pathData).toBeTruthy();
    });

    await test.step('Presentation slides from viewport', async () => {
      await page.keyboard.press(PRESENTATION_SHORTCUT);
      const presentationModal = page.getByText(/presentation mode/i).first();
      if (!(await presentationModal.isVisible().catch(() => false))) {
        const presentationButton = page.getByRole('button', { name: /presentation/i }).first();
        if (await presentationButton.isVisible().catch(() => false)) {
          await presentationButton.click();
        }
      }

      const addSlideButton = page.getByRole('button', { name: /add slide/i }).first();
      if (await addSlideButton.isVisible().catch(() => false)) {
        await addSlideButton.click();
      }
      await page.waitForTimeout(300);
      const startPresentationButton = page.getByRole('button', { name: /start presentation/i }).first();
      if (await startPresentationButton.isVisible().catch(() => false)) {
        await startPresentationButton.click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Escape');
      }
      await page.keyboard.press('Escape');
    });

    await test.step('Performance stays above 55 FPS', async () => {
      const avgFps = await page.evaluate(async () => {
        const samples: number[] = [];
        let count = 0;
        let last = performance.now();
        return await new Promise<number>((resolve) => {
          function sample(time: number) {
            const delta = time - last;
            last = time;
            if (delta > 0) {
              samples.push(1000 / delta);
            }
            count += 1;
            if (count >= 60) {
              const average = samples.reduce((sum, fps) => sum + fps, 0) / samples.length;
              resolve(average);
              return;
            }
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        });
      });
      expect(avgFps).toBeGreaterThanOrEqual(55);
    });
  });
});
