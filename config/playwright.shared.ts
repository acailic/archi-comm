// config/playwright.shared.ts
// Shared Playwright configuration helpers to keep project definitions consistent.

import { devices } from '@playwright/test';
import type { PlaywrightTestOptions, Project } from '@playwright/test';

import { isDemoMode, isScreenshotMode } from '../e2e/utils/env';

export const baseUseOptions: PlaywrightTestOptions = {
  baseURL: 'http://localhost:5173',
  trace: 'on-first-retry',
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
};

export const visualExpectOptions = () => ({
  toHaveScreenshot: {
    maxDiffPixelsRatio: process.env.CI ? 0.1 : 0.2,
    threshold: 0.3,
    animations: 'disabled' as const,
    mode: 'css' as const,
  },
  toMatchScreenshot: {
    maxDiffPixelsRatio: process.env.CI ? 0.1 : 0.2,
    threshold: 0.3,
  },
});

export const createWebServerEnv = () => ({
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'test',
  DISABLE_ANIMATION: isDemoMode() ? 'false' : 'true',
  SCREENSHOT_MODE: isScreenshotMode() ? 'true' : 'false',
});

type ProjectConfig = Omit<Project, 'name' | 'use'> & {
  use?: PlaywrightTestOptions;
};

export const createProject = (name: string, config: ProjectConfig = {}): Project => ({
  name,
  ...config,
  use: {
    ...baseUseOptions,
    ...(config.use ?? {}),
  },
});

export const devicePresets = devices;
