export type RuntimeEnvironment = 'development' | 'test' | 'production';
export type RenderGuardLevel = 'off' | 'basic' | 'strict';

type MaybeRecord = Record<string, string | undefined>;

export interface RenderGuardConfig {
  level: RenderGuardLevel;
  warningThreshold: number;
  errorThreshold: number;
  rapidRenderMs: number;
  warningIntervalMs: number;
  cooldownMs: number;
  analyticsEnabled: boolean;
  throwOnError: boolean;
}

export interface RecoveryConfig {
  cooldownMs: number;
  maxAttempts: number;
  strategyOrder: Array<'component-reset' | 'soft-reload' | 'hard-reset'>;
}

export interface SelectorOptimizationConfig {
  shallowCompareByDefault: boolean;
  memoizeExpensiveSelectors: boolean;
  rapidRecomputeWindowMs: number;
  rapidRecomputeLimit: number;
  warnOnRapidRecompute: boolean;
}

export interface PerformanceBudgets {
  maxRendersPerMinute: number;
  maxRapidRenderBursts: number;
}

export interface DebugFlags {
  enableRenderLogging: boolean;
  enableStoreLogging: boolean;
  recordSelectorTimings: boolean;
}

export interface PerformanceConfig {
  env: RuntimeEnvironment;
  renderGuard: RenderGuardConfig;
  recovery: RecoveryConfig;
  selectors: SelectorOptimizationConfig;
  budgets: PerformanceBudgets;
  debug: DebugFlags;
}

const getEnv = (key: string): string | undefined => {
  try {
    const metaEnv: MaybeRecord | undefined = (import.meta as unknown as { env?: MaybeRecord })?.env;
    if (metaEnv) {
      if (metaEnv[key] != null) return metaEnv[key];
      const viteKey = `VITE_${key}`;
      if (metaEnv[viteKey] != null) return metaEnv[viteKey];
    }
  } catch (error) {
    // Accessing import.meta outside of an ES module can throw; ignore.
  }

  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key] != null) return process.env[key];
    const viteKey = `VITE_${key}`;
    if (process.env[viteKey] != null) return process.env[viteKey];
  }

  return undefined;
};

const detectEnv = (): RuntimeEnvironment => {
  const explicit = getEnv('APP_ENV') ?? getEnv('NODE_ENV');
  if (explicit) {
    const normalized = explicit.toLowerCase();
    if (normalized.startsWith('prod')) return 'production';
    if (normalized.startsWith('test')) return 'test';
    return 'development';
  }

  return typeof window !== 'undefined' && (window as any).Cypress ? 'test' : 'development';
};

const LEVELS: Record<RenderGuardLevel, Omit<RenderGuardConfig, 'level'>> = {
  off: {
    warningThreshold: Number.POSITIVE_INFINITY,
    errorThreshold: Number.POSITIVE_INFINITY,
    rapidRenderMs: 0,
    warningIntervalMs: Number.POSITIVE_INFINITY,
    cooldownMs: 0,
    analyticsEnabled: false,
    throwOnError: false,
  },
  basic: {
    warningThreshold: 50,
    errorThreshold: 100,
    rapidRenderMs: 4,
    warningIntervalMs: 2000,
    cooldownMs: 3000,
    analyticsEnabled: true,
    throwOnError: false,
  },
  strict: {
    warningThreshold: 35,
    errorThreshold: 70,
    rapidRenderMs: 4,
    warningIntervalMs: 1500,
    cooldownMs: 4000,
    analyticsEnabled: true,
    throwOnError: true,
  },
};

const detectRenderGuardLevel = (env: RuntimeEnvironment): RenderGuardLevel => {
  const explicit = getEnv('RENDER_GUARD_LEVEL');
  if (explicit) {
    const normalized = explicit.toLowerCase();
    if (normalized === 'off' || normalized === 'basic' || normalized === 'strict') {
      return normalized;
    }
  }

  switch (env) {
    case 'production':
      return 'basic';
    case 'test':
      return 'off';
    default:
      return 'basic';
  }
};

const buildConfig = (): PerformanceConfig => {
  const env = detectEnv();
  const level = detectRenderGuardLevel(env);
  const baseRenderGuard = LEVELS[level];

  return {
    env,
    renderGuard: {
      level,
      ...baseRenderGuard,
    },
    recovery: {
      cooldownMs: env === 'production' ? 30000 : 15000,
      maxAttempts: 3,
      strategyOrder: ['component-reset', 'soft-reload', 'hard-reset'],
    },
    selectors: {
      shallowCompareByDefault: true,
      memoizeExpensiveSelectors: env !== 'test',
      rapidRecomputeWindowMs: 1000,
      rapidRecomputeLimit: env === 'development' ? 12 : 8,
      warnOnRapidRecompute: env !== 'test',
    },
    budgets: {
      maxRendersPerMinute: env === 'development' ? 90 : 60,
      maxRapidRenderBursts: env === 'development' ? 6 : 4,
    },
    debug: {
      enableRenderLogging: env !== 'production',
      enableStoreLogging: env === 'development',
      recordSelectorTimings: env === 'development',
    },
  };
};

let cachedConfig: PerformanceConfig | null = null;

export const getPerformanceConfig = (): PerformanceConfig => {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }
  return cachedConfig;
};

export const getRenderGuardConfig = (): RenderGuardConfig => getPerformanceConfig().renderGuard;
export const getRecoveryConfig = (): RecoveryConfig => getPerformanceConfig().recovery;
export const getSelectorOptimizationConfig = (): SelectorOptimizationConfig => getPerformanceConfig().selectors;
export const getPerformanceBudgets = (): PerformanceBudgets => getPerformanceConfig().budgets;
export const getDebugFlags = (): DebugFlags => getPerformanceConfig().debug;

export const __unsafeResetPerformanceConfigForTests = (): void => {
  cachedConfig = null;
};
