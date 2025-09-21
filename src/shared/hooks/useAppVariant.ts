import { useMemo } from 'react';

import { isDevelopment, isTauriEnvironment } from '@/lib/config/environment';

export type AppVariant = 'basic' | 'complex' | 'safe';

export interface VariantFeatures {
  router: boolean;
  ux: boolean;
  commandPalette: boolean;
  diagnostics: boolean;
}

export interface AppVariantInfo {
  variant: AppVariant;
  features: VariantFeatures;
  isTauri: boolean;
  isDevelopment: boolean;
}

const baseFeatureMap: Record<AppVariant, VariantFeatures> = {
  basic: { router: false, ux: true, commandPalette: true, diagnostics: true },
  complex: { router: true, ux: true, commandPalette: true, diagnostics: true },
  safe: { router: false, ux: false, commandPalette: false, diagnostics: true },
};

const parseBooleanFlag = (value: unknown): boolean | undefined => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
};

const resolveVariant = (env: Record<string, unknown>): AppVariant => {
  const raw = env.VITE_APP_VARIANT;
  if (raw === 'basic' || raw === 'complex' || raw === 'safe') {
    return raw;
  }
  return isTauriEnvironment() ? 'complex' : 'basic';
};

export function useAppVariant(): AppVariantInfo {
  return useMemo(() => {
    const env = ((import.meta as unknown as { env?: Record<string, unknown> })?.env) ?? {};
    const variant = resolveVariant(env);
    const baseFeatures = baseFeatureMap[variant];

    const overrides: Partial<VariantFeatures> = {
      router: parseBooleanFlag(env.VITE_FEATURE_ROUTER),
      ux: parseBooleanFlag(env.VITE_FEATURE_UX),
      commandPalette: parseBooleanFlag(env.VITE_FEATURE_COMMAND_PALETTE),
      diagnostics: parseBooleanFlag(env.VITE_FEATURE_DIAGNOSTICS),
    };

    const features = { ...baseFeatures };
    (Object.keys(overrides) as Array<keyof VariantFeatures>).forEach((key) => {
      const value = overrides[key];
      if (value !== undefined) {
        features[key] = value;
      }
    });

    return {
      variant,
      features,
      isTauri: isTauriEnvironment(),
      isDevelopment: isDevelopment(),
    };
  }, []);
}
