// e2e/utils/screenshot-helpers.ts
// Screenshot orchestration utilities for demo asset generation
// Provides organized capture workflows, annotation helpers, and metadata generation
// RELEVANT FILES: e2e/utils/test-helpers.ts, e2e/utils/video-helpers.ts, tools/scripts/generate-demo-screenshots.js

import { BrowserContext, Locator, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

const SCREENSHOT_RUN_ID = (() => {
  if (process.env.SCREENSHOT_RUN_ID) {
    return process.env.SCREENSHOT_RUN_ID;
  }
  const generated = new Date().toISOString().replace(/[:.]/g, '-');
  process.env.SCREENSHOT_RUN_ID = generated;
  return generated;
})();

import { createHelpers, CanvasHelpers } from './test-helpers';
import { DemoScenario, DemoStep } from './video-helpers';

export type ScreenshotViewportPreset = 'desktop-hd' | 'desktop-4k' | 'tablet' | 'mobile';

export interface ScreenshotCaptureOptions {
  category?: string;
  scenario?: string;
  step?: string;
  description?: string;
  element?: Locator | string;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  omitBackground?: boolean;
  metadata?: Record<string, unknown>;
  waitFor?: number;
  viewport?: { width: number; height: number };
  quality?: 'standard' | 'high';
  mask?: Array<Locator | string>;
  scale?: 'css' | 'device';
}

export interface ScreenshotSequenceStep extends ScreenshotCaptureOptions {
  name: string;
  viewportPreset?: ScreenshotViewportPreset;
}

export interface ScreenshotCaptureResult {
  path: string;
  metadataPath: string;
  relativePath: string;
}

export interface ScreenshotHelperApi {
  captureScreenshot: (name: string, options?: ScreenshotCaptureOptions) => Promise<ScreenshotCaptureResult>;
  captureSequence: (steps: ScreenshotSequenceStep[]) => Promise<ScreenshotCaptureResult[]>;
  enableAnnotationMode: () => Promise<void>;
  disableAnnotationMode: () => Promise<void>;
  highlightComponents: (selectors: Array<string | Locator>) => Promise<void>;
  addOverlayText: (text: string, position: { x: number; y: number }, durationMs?: number) => Promise<string>;
  removeOverlay: (overlayId: string) => Promise<void>;
  setDemoViewport: (preset: ScreenshotViewportPreset) => Promise<void>;
  waitForCanvasStable: (timeoutMs?: number) => Promise<void>;
  waitForAnimationsComplete: (timeoutMs?: number) => Promise<void>;
  saveScenarioScreenshots: (scenario: DemoScenario, category?: string) => Promise<ScreenshotCaptureResult[]>;
}

class ScreenshotHelpers {
  private readonly baseDir: string;
  private readonly runId: string;
  private readonly runDir: string;
  private readonly metadataBaseDir: string;
  private readonly canvasHelpers: CanvasHelpers;
  private readonly overlayIds = new Set<string>();
  private annotationModeEnabled = false;
  private annotationStyleId = 'demo-screenshot-annotations';
  private readonly directoryReady: Promise<void>;

  constructor(private readonly page: Page, private readonly context?: BrowserContext) {
    const helpers = createHelpers(page);
    this.canvasHelpers = helpers.canvas;

    this.baseDir = path.join(process.cwd(), 'demo-screenshots');
    this.runId = SCREENSHOT_RUN_ID;
    this.runDir = path.join(this.baseDir, 'runs', this.runId);
    this.metadataBaseDir = path.join(this.runDir, 'metadata');
    this.directoryReady = this.prepareDirectories();
  }

  private async prepareDirectories(): Promise<void> {
    const directories = [
      this.baseDir,
      path.join(this.baseDir, 'runs'),
      this.runDir,
      this.metadataBaseDir,
    ];

    for (const dir of directories) {
      await this.ensureDirectory(dir);
    }
  }

  async captureScreenshot(name: string, options: ScreenshotCaptureOptions = {}): Promise<ScreenshotCaptureResult> {
    await this.directoryReady;

    const category = this.slugify(options.category ?? 'uncategorized');
    const scenario = this.slugify(options.scenario ?? 'general');
    const safeStep = this.slugify(options.step ?? name);
    const relativeDir = path.join('runs', this.runId, category, scenario);
    const fileName = `${safeStep}.png`;
    const outputDir = path.join(this.baseDir, relativeDir);
    const screenshotPath = path.join(outputDir, fileName);

    await this.ensureDirectory(outputDir);

    if (options.viewport) {
      await this.page.setViewportSize(options.viewport);
    }

    if (options.waitFor) {
      await this.page.waitForTimeout(options.waitFor);
    }

    await this.waitForIdle();
    await this.waitForCanvasStable();
    await this.waitForAnimationsComplete();

    const maskTargets = options.mask ? await this.resolveMaskTargets(options.mask) : undefined;
    const mask = maskTargets && maskTargets.length > 0 ? maskTargets : undefined;
    const clip = options.clip;

    const screenshotOptions = {
      path: screenshotPath,
      fullPage: options.fullPage ?? !options.element && !clip,
      omitBackground: options.omitBackground ?? false,
      mask,
      clip,
      scale: options.scale ?? (options.quality === 'high' ? 'device' : 'css'),
      type: 'png' as const
    };

    if (options.element) {
      const element = await this.resolveLocator(options.element);
      await element.screenshot(screenshotOptions);
    } else {
      await this.page.screenshot(screenshotOptions);
    }

    const metadata = await this.buildMetadata({
      name,
      category,
      scenario,
      step: safeStep,
      description: options.description,
      screenshotPath,
      relativePath: path.join(relativeDir, fileName),
      extra: options.metadata
    });

    const metadataDir = path.join(this.metadataBaseDir, category, scenario);
    await this.ensureDirectory(metadataDir);
    const metadataFile = path.join(metadataDir, `${safeStep}.json`);
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

    return {
      path: screenshotPath,
      metadataPath: metadataFile,
      relativePath: metadata.relativePath
    };
  }

  async captureSequence(steps: ScreenshotSequenceStep[]): Promise<ScreenshotCaptureResult[]> {
    const results: ScreenshotCaptureResult[] = [];

    for (const step of steps) {
      if (step.viewportPreset) {
        await this.setDemoViewport(step.viewportPreset);
      }

      const result = await this.captureScreenshot(step.name, step);
      results.push(result);
    }

    return results;
  }

  async enableAnnotationMode(): Promise<void> {
    if (this.annotationModeEnabled) return;

    await this.page.addStyleTag({
      content: `
        .demo-screenshot-highlight {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.7), 0 0 24px rgba(59, 130, 246, 0.35);
          border-radius: 10px;
          transition: box-shadow 0.3s ease-out;
        }

        .demo-screenshot-overlay {
          position: fixed;
          z-index: 10050;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: rgba(15, 23, 42, 0.92);
          color: #f8fafc;
          padding: 12px 18px;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(18px);
          pointer-events: none;
        }
      `,
    });

    this.annotationModeEnabled = true;
  }

  async disableAnnotationMode(): Promise<void> {
    if (!this.annotationModeEnabled) return;

    await this.page.evaluate((styleId) => {
      const styleTags = Array.from(document.head.querySelectorAll('style'));
      for (const styleTag of styleTags) {
        if (styleTag.textContent && styleTag.textContent.includes('demo-screenshot')) {
          styleTag.remove();
        }
      }

      document.querySelectorAll('.demo-screenshot-overlay').forEach((el) => el.remove());
      document.querySelectorAll('.demo-screenshot-highlight').forEach((el) =>
        el.classList.remove('demo-screenshot-highlight')
      );

      if (styleId) {
        const existing = document.getElementById(styleId);
        existing?.remove();
      }
    }, this.annotationStyleId);

    this.overlayIds.clear();
    this.annotationModeEnabled = false;
  }

  async highlightComponents(selectors: Array<string | Locator>): Promise<void> {
    for (const selector of selectors) {
      const element = await this.resolveLocator(selector);
      await element.evaluate((el) => {
        el.classList.add('demo-screenshot-highlight');
      });
    }
  }

  async addOverlayText(
    text: string,
    position: { x: number; y: number },
    durationMs = 0
  ): Promise<string> {
    const overlayId = `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.overlayIds.add(overlayId);

    await this.page.evaluate(
      ({ id, text, position }) => {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'demo-screenshot-overlay';
        overlay.textContent = text;
        overlay.style.left = `${position.x}px`;
        overlay.style.top = `${position.y}px`;
        document.body.appendChild(overlay);
      },
      { id: overlayId, text, position }
    );

    if (durationMs > 0) {
      setTimeout(() => {
        void this.removeOverlay(overlayId);
      }, durationMs);
    }

    return overlayId;
  }

  async removeOverlay(overlayId: string): Promise<void> {
    if (!this.overlayIds.has(overlayId)) return;

    await this.page.evaluate((id) => {
      document.getElementById(id)?.remove();
    }, overlayId);

    this.overlayIds.delete(overlayId);
  }

  async setDemoViewport(preset: ScreenshotViewportPreset): Promise<void> {
    const presets: Record<ScreenshotViewportPreset, { width: number; height: number }> = {
      'desktop-hd': { width: 1920, height: 1080 },
      'desktop-4k': { width: 2560, height: 1440 },
      tablet: { width: 1280, height: 834 },
      mobile: { width: 390, height: 844 }
    };

    const viewport = presets[preset];
    await this.page.setViewportSize(viewport);
  }

  private async waitForIdle(timeoutMs = 5000): Promise<void> {
    const pollInterval = 150;
    const requiredStableIterations = 3;
    let stableIterations = 0;
    let previousCounts: { nodes: number; edges: number } | null = null;

    const idleCheck = async () => {
      while (stableIterations < requiredStableIterations) {
        const [nodeCount, edgeCount, animationsSettled] = await Promise.all([
          this.page.locator('.react-flow__node').count(),
          this.page.locator('.react-flow__edge').count(),
          this.page.evaluate(() => {
            if (!('getAnimations' in document)) {
              return true;
            }
            return document
              .getAnimations()
              .every((animation: Animation) => animation.playState !== 'running');
          }),
        ]);

        if (
          !previousCounts ||
          previousCounts.nodes !== nodeCount ||
          previousCounts.edges !== edgeCount ||
          !animationsSettled
        ) {
          stableIterations = 0;
          previousCounts = { nodes: nodeCount, edges: edgeCount };
          await this.page.waitForTimeout(pollInterval);
          continue;
        }

        stableIterations += 1;
        previousCounts = { nodes: nodeCount, edges: edgeCount };
        await this.page.waitForTimeout(pollInterval);
      }

      await this.page.evaluate(() => {
        return new Promise<void>((resolve) => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => resolve(), { timeout: 100 });
          } else {
            setTimeout(() => resolve(), 100);
          }
        });
      });

      try {
        await this.page.waitForLoadState('networkidle', { timeout: 1000 });
      } catch {
        // Ignored; not all demo flows trigger network requests.
      }
    };

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        idleCheck(),
        new Promise<void>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Canvas did not reach idle state within ${timeoutMs}ms`)),
            timeoutMs
          );
        }),
      ]);
    } catch (error) {
      console.warn(`[demo-screenshots] waitForIdle timed out: ${(error as Error).message}`);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  async waitForCanvasStable(timeoutMs = 2000): Promise<void> {
    const viewport = this.page.locator('.react-flow__viewport');
    let previousTransform = await viewport.getAttribute('transform');
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      await this.page.waitForTimeout(200);
      const current = await viewport.getAttribute('transform');
      if (current === previousTransform) {
        return;
      }
      previousTransform = current;
    }
  }

  async waitForAnimationsComplete(timeoutMs = 2000): Promise<void> {
    try {
      await this.page.waitForFunction(
        () =>
          'getAnimations' in document &&
          (document as any).getAnimations().every((animation: Animation) => animation.playState !== 'running'),
        undefined,
        { timeout: timeoutMs }
      );
    } catch {
      await this.page.waitForTimeout(250);
    }
  }

  async saveScenarioScreenshots(
    scenario: DemoScenario,
    category = scenario.category ?? 'scenario-dumps'
  ): Promise<ScreenshotCaptureResult[]> {
    const results: ScreenshotCaptureResult[] = [];

    for (let index = 0; index < scenario.steps.length; index += 1) {
      const step = scenario.steps[index];

      await this.executeScenarioStep(step);

      const result = await this.captureScreenshot(`${scenario.title}-step-${index + 1}`, {
        category,
        scenario: scenario.title,
        step: step.type,
        description: step.text,
        metadata: {
          stepType: step.type,
          index,
          scenarioTitle: scenario.title,
          scenarioDescription: scenario.description
        }
      });

      results.push(result);
    }

    return results;
  }

  private async executeScenarioStep(step: DemoStep): Promise<void> {
    switch (step.type) {
      case 'title':
      case 'annotation':
      case 'annotate':
        if (step.text && step.position) {
          await this.addOverlayText(step.text, step.position);
        }
        break;
      case 'highlight':
        if (step.target) {
          await this.highlightComponents([step.target]);
        }
        break;
      case 'addComponent':
        if ((step.componentType || step.target) && step.position) {
          await this.canvasHelpers.addComponent(step.componentType ?? step.target!, step.position);
        }
        break;
      case 'connect':
        if (step.from && step.to) {
          await this.connectByLabels(step.from, step.to);
        }
        break;
      case 'zoom':
        if (step.viewport) {
          await this.page.setViewportSize(step.viewport);
        }
        break;
      case 'export':
      case 'click':
        if (step.target) {
          const locator = await this.resolveLocator(step.target);
          await locator.click();
        }
        break;
      case 'pause':
      case 'wait':
        await this.page.waitForTimeout(step.duration ?? 800);
        break;
      case 'navigate':
        if (step.target) {
          await this.page.goto(step.target);
        }
        break;
      default:
        break;
    }
  }

  private async buildMetadata(params: {
    name: string;
    category: string;
    scenario: string;
    step: string;
    description?: string;
    screenshotPath: string;
    relativePath: string;
    extra?: Record<string, unknown>;
  }) {
    const viewport = this.page.viewportSize();
    const componentCount = await this.page.locator('.react-flow__node').count();

    return {
      name: params.name,
      category: params.category,
      scenario: params.scenario,
      step: params.step,
      description: params.description,
      relativePath: params.relativePath,
      absolutePath: params.screenshotPath,
      capturedAt: new Date().toISOString(),
      runId: this.runId,
      viewport,
      componentCount,
      annotationMode: this.annotationModeEnabled,
      ...params.extra
    };
  }

  private async connectByLabels(fromLabel: string, toLabel: string): Promise<void> {
    const fromNode = this.page.locator('.react-flow__node').filter({ hasText: fromLabel }).first();
    const toNode = this.page.locator('.react-flow__node').filter({ hasText: toLabel }).first();

    await fromNode.waitFor({ state: 'visible', timeout: 5000 });
    await toNode.waitFor({ state: 'visible', timeout: 5000 });

    const fromHandle = fromNode.locator('.react-flow__handle').first();
    const toHandle = toNode.locator('.react-flow__handle').first();

    const fromBox = await fromHandle.boundingBox();
    const toBox = await toHandle.boundingBox();

    if (!fromBox || !toBox) {
      throw new Error(`Unable to determine handles for connection between ${fromLabel} and ${toLabel}`);
    }

    await this.page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 18 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(400);
  }

  private async ensureDirectory(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'untitled';
  }

  private async resolveLocator(target: string | Locator): Promise<Locator> {
    if (typeof target === 'string') {
      return this.page.locator(target).first();
    }
    return target;
  }

  private async resolveMaskTargets(targets: Array<string | Locator>): Promise<Locator[]> {
    const resolved: Locator[] = [];

    for (const target of targets) {
      const locator = await this.resolveLocator(target);
      const descriptor = this.describeTarget(target);

      try {
        const count = await locator.count();
        if (count === 0) {
          console.warn(`[demo-screenshots] Skipping mask; no matches for ${descriptor}`);
          continue;
        }

        const isVisible = await locator.isVisible().catch(() => false);
        if (!isVisible) {
          console.warn(`[demo-screenshots] Skipping mask; target not visible: ${descriptor}`);
          continue;
        }

        resolved.push(locator);
      } catch (error) {
        console.warn(
          `[demo-screenshots] Skipping mask; failed resolving ${descriptor}: ${(error as Error).message}`
        );
      }
    }

    return resolved;
  }

  private describeTarget(target: string | Locator): string {
    if (typeof target === 'string') {
      return target;
    }

    try {
      return target.toString();
    } catch {
      return '[locator]';
    }
  }
}

export function createScreenshotHelpers(
  page: Page,
  context?: BrowserContext
): ScreenshotHelperApi {
  const helpers = new ScreenshotHelpers(page, context);

  return {
    captureScreenshot: (name, options) => helpers.captureScreenshot(name, options),
    captureSequence: (steps) => helpers.captureSequence(steps),
    enableAnnotationMode: () => helpers.enableAnnotationMode(),
    disableAnnotationMode: () => helpers.disableAnnotationMode(),
    highlightComponents: (selectors) => helpers.highlightComponents(selectors),
    addOverlayText: (text, position, durationMs) => helpers.addOverlayText(text, position, durationMs),
    removeOverlay: (overlayId) => helpers.removeOverlay(overlayId),
    setDemoViewport: (preset) => helpers.setDemoViewport(preset),
    waitForCanvasStable: (timeoutMs) => helpers.waitForCanvasStable(timeoutMs),
    waitForAnimationsComplete: (timeoutMs) => helpers.waitForAnimationsComplete(timeoutMs),
    saveScenarioScreenshots: (scenario, category) => helpers.saveScenarioScreenshots(scenario, category),
  };
}
