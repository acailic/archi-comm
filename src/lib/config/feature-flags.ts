// src/lib/config/feature-flags.ts
// Feature flags for enabling/disabling features
// Why: Allows toggling features without code changes
// RELEVANT FILES: CanvasContextualHelp.tsx, settings/index.tsx

/**
 * Feature flags configuration
 * Set to true to enable a feature, false to disable
 */
export const featureFlags = {
  // Canvas features
  contextualHelp: false, // Disabled by default - can cause re-render issues
  canvasOnboardingTour: true,
  canvasAnnotations: true,
  quickConnect: true,

  // UI features
  commandPalette: true,
  devOverlay: true,

  // Performance monitoring
  performanceMonitoring: true,
  infiniteLoopDetection: true,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag] ?? false;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(featureFlags) as FeatureFlag[]).filter(
    (key) => featureFlags[key]
  );
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): FeatureFlag[] {
  return (Object.keys(featureFlags) as FeatureFlag[]).filter(
    (key) => !featureFlags[key]
  );
}
