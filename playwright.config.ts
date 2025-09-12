import { defineConfig, devices } from '@playwright/test';
import os from 'os';

// Centralized configuration values
const IS_CI = !!process.env.CI;
const OUTPUT_BASE = 'e2e/test-results';
const OUTPUT_ARTIFACTS = `${OUTPUT_BASE}/artifacts`;
const CPU_COUNT = os.cpus()?.length ?? 1;
const WORKERS = IS_CI ? 1 : Math.max(2, Math.floor(CPU_COUNT / 2));

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Visual testing configuration
    toHaveScreenshot: {
      // Enable visual comparisons with appropriate thresholds
      maxDiffPixelsRatio: process.env.CI ? 0.1 : 0.2,
      threshold: 0.3,
      // Animation handling for consistent screenshots
      animations: 'disabled',
      // Reduced motion for visual stability
      mode: 'css',
    },
    toMatchScreenshot: {
      maxDiffPixelsRatio: process.env.CI ? 0.1 : 0.2,
      threshold: 0.3,
    },
  },
  retries: process.env.CI ? 2 : 0,
  // Enhanced reporting for visual testing
  reporter: [
    ['list'],
    // HTML reporter with visual diffs
    [
      'html',
      {
        // Must not clash with Playwright's outputDir
        outputFolder: `${OUTPUT_BASE}/html-report`,
        open: 'never',
      },
    ],
    // JUnit XML for CI/CD integration
    ['junit', { outputFile: `${OUTPUT_BASE}/junit-results.xml` }],
    // JSON reporter for programmatic access
    ['json', { outputFile: `${OUTPUT_BASE}/test-results.json` }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    // Screenshot configuration for visual tests
    screenshot: 'only-on-failure',
  },
  projects: [
    // Standard functional testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Visual testing project with scenario integration
    {
      name: 'scenario-visual',
      testDir: './e2e',
      testMatch: ['**/visual-regression.spec.ts', '**/responsive-design.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // Enhanced settings for visual consistency
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'reduce',
        forcedColors: 'none',
      },
      // Visual testing specific configuration
      timeout: 90_000, // Longer timeout for visual operations
      retries: process.env.CI ? 3 : 1, // More retries for visual tests
    },

    // Responsive visual testing - Mobile
    {
      name: 'mobile-visual',
      testDir: './e2e',
      testMatch: ['**/responsive-design.spec.ts'],
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    },

    // Responsive visual testing - Tablet
    {
      name: 'tablet-visual',
      testDir: './e2e',
      testMatch: ['**/responsive-design.spec.ts'],
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 1,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    },

    // Firefox cross-browser visual testing
    {
      name: 'firefox-visual',
      testDir: './e2e',
      testMatch: ['**/visual-regression.spec.ts'],
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    },

    // Dark theme visual testing
    {
      name: 'dark-theme-visual',
      testDir: './e2e',
      testMatch: ['**/visual-regression.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    },
  ],

  webServer: {
    command: 'npm run web:dev',
    port: 5173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    // Enhanced environment for visual testing
    env: {
      ...process.env,
      // Disable animations globally for consistent screenshots
      NODE_ENV: process.env.NODE_ENV || 'test',
      // Force consistent font rendering
      DISABLE_ANIMATION: 'true',
    },
  },

  // Output directory for test artifacts (must not contain the HTML report folder)
  outputDir: OUTPUT_ARTIFACTS,

  // Test artifact retention
  preserveOutput: process.env.CI ? 'failures-only' : 'always',

  // Worker configuration for parallel visual testing
  workers: WORKERS,

  // Shared test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Screenshot storage configuration
  snapshotDir: `${OUTPUT_BASE}/screenshots`,
});
