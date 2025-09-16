import { defineConfig, devices } from '@playwright/test';
import os from 'os';

// Centralized configuration values
const IS_CI = !!process.env.CI;
const OUTPUT_BASE = 'e2e/test-results';
const OUTPUT_ARTIFACTS = `${OUTPUT_BASE}/artifacts`;
const CPU_COUNT = os.cpus()?.length ?? 1;
const WORKERS = IS_CI ? 1 : Math.max(2, Math.floor(CPU_COUNT / 2));
const ENABLE_COLLAB = process.env.ENABLE_COLLAB === 'true';

// Multi-session testing configuration
const MULTI_SESSION_TESTS = process.env.MULTI_SESSION_TESTS === 'true';
const COLLABORATION_TESTS = process.env.COLLABORATION_TESTS === 'true';
const STORAGE_STATE_DIR = './e2e/session-states';

export default defineConfig({
  testDir: './e2e',
  // Extend base timeouts (~3x) to stabilize demo recordings
  timeout: MULTI_SESSION_TESTS ? 360_000 : 180_000,
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
  // Enhanced reporting for visual testing and multi-session tests
  reporter: [
    ['list'],
    // HTML reporter with visual diffs and session state information
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
  // Global setup for session state management
  globalSetup: './e2e/utils/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    // Screenshot configuration for visual tests
    screenshot: 'only-on-failure',
  },
  projects: [
    // Curated demo videos recorder (sequential, high-quality video ON)
    {
      name: 'demo-videos',
      testDir: './e2e',
      testMatch: ['**/demo-video-recording.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        forcedColors: 'none',
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 }
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    },
    // Standard functional testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Cross-browser testing for consistency validation
    {
      name: 'firefox',
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browser testing
    {
      name: 'mobile-chrome',
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'mobile-safari',
      testMatch: ['**/cross-platform-consistency.spec.ts'],
      use: { ...devices['iPhone 12'] },
    },

    // Multi-session testing project (requires sequential execution)
    {
      name: 'multi-session',
      testMatch: ['**/multi-day-session.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Reset for each test
      },
      timeout: 180_000, // 3 minutes for multi-session tests
      retries: 1, // Fewer retries for sequential tests
    },

    // Collaboration testing project (requires multiple contexts) - enabled only when ENABLE_COLLAB=true
    ...(
      ENABLE_COLLAB
        ? [{
            name: 'collaboration',
            testMatch: ['**/collaboration-conflict.spec.ts'],
            use: {
              ...devices['Desktop Chrome'],
              storageState: undefined,
            },
            timeout: 120_000,
            retries: 2,
          }]
        : []
    ),

    // Error recovery testing project
    {
      name: 'error-recovery',
      testMatch: ['**/error-recovery.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
      timeout: 90_000,
      retries: 2,
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

    // Note: Removed legacy demo-videos* projects.

    // Demo Scenarios - Desktop HD
  {
      name: 'Demo - Desktop HD',
      testDir: './e2e/demo-scenarios',
      testMatch: ['**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference', // Allow animations for demos
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 }
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0, // No retries for demo recording
    },

    // Demo Scenarios - Mobile
    {
      name: 'Demo - Mobile',
      testDir: './e2e/demo-scenarios',
      testMatch: ['**/mobile-interactions/**/*.spec.ts'],
      use: {
        ...devices['iPhone 12 Pro'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        video: {
          mode: 'on',
          size: { width: 390, height: 844 }
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    },

    // Demo Scenarios - Tablet
    {
      name: 'Demo - Tablet',
      testDir: './e2e/demo-scenarios',
      testMatch: ['**/mobile-interactions/**/*.spec.ts'],
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
        hasTouch: true,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        video: {
          mode: 'on',
          size: { width: 1024, height: 1366 }
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 30_000,
        navigationTimeout: 90_000,
      },
      timeout: 900_000,
      retries: 0,
    },

    // Demo Scenarios - 4K Ultra HD
    {
      name: 'Demo - 4K',
      testDir: './e2e/demo-scenarios',
      testMatch: ['**/architecture-workflows/**/*.spec.ts', '**/performance-showcases/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
        deviceScaleFactor: 1,
        hasTouch: false,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        video: {
          mode: 'on',
          size: { width: 3840, height: 2160 }
        },
        trace: 'on',
        screenshot: 'on',
        actionTimeout: 45_000, // Longer for 4K rendering
        navigationTimeout: 45_000,
      },
      timeout: 600_000, // 10 minutes for 4K demos
      retries: 0,
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
      NODE_ENV: process.env.NODE_ENV || 'test',
      // Re-enable animations when DEMO_MODE is set for demo recordings
      DISABLE_ANIMATION: process.env.DEMO_MODE ? 'false' : 'true',
    },
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
  snapshotDir: `${OUTPUT_BASE}/screenshots`,
});
