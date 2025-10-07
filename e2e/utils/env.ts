// e2e/utils/env.ts
// Centralized environment flag helpers for demo and screenshot tooling.

export function isScreenshotMode(): boolean {
  return process.env.SCREENSHOT_MODE === 'true';
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}
