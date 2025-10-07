import { defineConfig } from '@playwright/test';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  baseUseOptions,
  createProject,
  createWebServerEnv,
  devicePresets,
  visualExpectOptions,
} from './playwright.shared';

// ES module workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Centralized configuration values
const IS_CI = !!process.env.CI;
const ROOT_DIR = path.resolve(__dirname, '..');
const resolveFromRoot = (...segments: string[]): string => path.resolve(ROOT_DIR, ...segments);
const OUTPUT_BASE = resolveFromRoot('e2e/test-results');
const joinOutput = (...segments: string[]): string => path.join(OUTPUT_BASE, ...segments);
const OUTPUT_ARTIFACTS = joinOutput('artifacts');
const CPU_COUNT = os.cpus()?.length ?? 1;
const WORKERS = IS_CI ? 1 : Math.max(2, Math.floor(CPU_COUNT / 2));
const ENABLE_COLLAB = process.env.ENABLE_COLLAB === 'true';

// Multi-session testing configuration
const MULTI_SESSION_TESTS = process.env.MULTI_SESSION_TESTS === 'true';
const COLLABORATION_TESTS = process.env.COLLABORATION_TESTS === 'true';
export default defineConfig({
  testDir: resolveFromRoot('e2e'),
  // Extend base timeouts (~3x) to stabilize demo recordings
  timeout: MULTI_SESSION_TESTS ? 360_000 : 180_000,
  expect: {
    timeout: 10_000,
    ...visualExpectOptions(),
  },
  retries: process.env.CI ? 2 : 0,
  // Enhanced reporting for visual testing and multi-session tests
  reporter: [
    ['list'],
    // HTML reporter with visual diffs and session state information
    [
      'html',
      {
        // Must not clash with Playwright's outputDir
        outputFolder: joinOutput('html-report'),
        open: 'never',
      },
    ],
    // JUnit XML for CI/CD integration
    ['junit', { outputFile: joinOutput('junit-results.xml') }],
    // JSON reporter for programmatic access
    ['json', { outputFile: joinOutput('test-results.json') }],
  ],
  // Global setup for session state management
  globalSetup: resolveFromRoot('e2e/utils/global-setup.ts'),
  use: { ...baseUseOptions },
  projects: [
    // Curated demo videos recorder (sequential, high-quality video ON)
    createProject('demo-videos', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/demo-video-recording.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        forcedColors: 'none',
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 },
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    }),
    // Dedicated project for marketing screenshot capture
    createProject('demo-screenshots', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/demo-screenshot-capture.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'reduce',
        forcedColors: 'none',
        video: 'off',
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 300_000,
      retries: 0,
    }),
    // Standard functional testing
    createProject('chromium', {
      use: { ...devicePresets['Desktop Chrome'] },
    }),

    // Cross-browser testing for consistency validation
    createProject('firefox', {
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devicePresets['Desktop Firefox'] },
    }),

    createProject('webkit', {
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devicePresets['Desktop Safari'] },
    }),

    // Mobile browser testing
    createProject('mobile-chrome', {
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devicePresets['Pixel 5'] },
    }),

    createProject('mobile-safari', {
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devicePresets['iPhone 12'] },
    }),

    // Multi-session testing project (requires sequential execution)
    createProject('multi-session', {
      testMatch: ['**/multi-day-session.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        storageState: undefined, // Reset for each test
      },
      timeout: 180_000, // 3 minutes for multi-session tests
      retries: 1, // Fewer retries for sequential tests
    }),

    // Collaboration testing project (requires multiple contexts) - enabled only when ENABLE_COLLAB=true
    ...(
      ENABLE_COLLAB
        ? [
            createProject('collaboration', {
              testMatch: ['**/collaboration-conflict.spec.ts'],
              use: {
                ...devicePresets['Desktop Chrome'],
                storageState: undefined,
              },
              timeout: 120_000,
              retries: 2,
            }),
          ]
        : []
    ),

    // Error recovery testing project
    createProject('error-recovery', {
      testMatch: ['**/error-recovery.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        storageState: undefined,
      },
      timeout: 90_000,
      retries: 2,
    }),

    // Visual testing project with scenario integration
    createProject('scenario-visual', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/visual-regression.spec.ts', '**/responsive-design.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'reduce',
        forcedColors: 'none',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    }),

    // Responsive visual testing - Mobile
    createProject('mobile-visual', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/responsive-design.spec.ts'],
      use: {
        ...devicePresets['iPhone 13'],
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    }),

    // Responsive visual testing - Tablet
    createProject('tablet-visual', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/responsive-design.spec.ts'],
      use: {
        ...devicePresets['iPad Pro'],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 1,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    }),

    // Firefox cross-browser visual testing
    createProject('firefox-visual', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/visual-regression.spec.ts'],
      use: {
        ...devicePresets['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    }),

    // Dark theme visual testing
    createProject('dark-theme-visual', {
      testDir: resolveFromRoot('e2e'),
      testMatch: ['**/visual-regression.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      },
      timeout: 90_000,
      retries: process.env.CI ? 3 : 1,
    }),

    // Note: Removed legacy demo-videos* projects.

    // Demo Scenarios - Desktop HD
    createProject('Demo - Desktop HD', {
      testDir: resolveFromRoot('e2e/demo-scenarios'),
      testMatch: ['**/*.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference', // Allow animations for demos
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 },
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    }),

    // Demo Scenarios - Mobile
    createProject('Demo - Mobile', {
      testDir: resolveFromRoot('e2e/demo-scenarios'),
      testMatch: ['**/mobile-interactions/**/*.spec.ts'],
      use: {
        ...devicePresets['iPhone 12 Pro'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        video: {
          mode: 'on',
          size: { width: 390, height: 844 },
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    }),

    // Demo Scenarios - Tablet
    createProject('Demo - Tablet', {
      testDir: resolveFromRoot('e2e/demo-scenarios'),
      testMatch: ['**/mobile-interactions/**/*.spec.ts'],
      use: {
        ...devicePresets['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        video: {
          mode: 'on',
          size: { width: 1024, height: 1366 },
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    }),

    // Demo Scenarios - 4K Ultra HD
    createProject('Demo - 4K', {
      testDir: resolveFromRoot('e2e/demo-scenarios'),
      testMatch: ['**/architecture-workflows/**/*.spec.ts', '**/performance-showcases/**/*.spec.ts'],
      use: {
        ...devicePresets['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        video: {
          mode: 'on',
          size: { width: 3840, height: 2160 },
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 45_000,
        navigationTimeout: 45_000,
      },
      timeout: 600_000,
      retries: 0,
    }),
  ],

  webServer: {
    command: 'npm run web:dev',
    port: 5173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    // Enhanced environment for visual testing
    env: createWebServerEnv(),
  },

  // Output directory for test artifacts (must not contain the HTML report folder)
  outputDir: OUTPUT_ARTIFACTS,

  // Test artifact retention
  preserveOutput: process.env.CI ? 'failures-only' : 'always',

  // Worker configuration for parallel visual testing
  workers: MULTI_SESSION_TESTS ? 1 : WORKERS, // Sequential execution for multi-session tests

  // Shared test configuration
  fullyParallel: !MULTI_SESSION_TESTS, // Disable parallel execution for multi-session tests
  forbidOnly: !!process.env.CI,

  // Screenshot storage configuration
  snapshotDir: joinOutput('screenshots'),
});
