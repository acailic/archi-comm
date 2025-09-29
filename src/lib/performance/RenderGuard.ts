import { useRef, type MutableRefObject } from 'react';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import {
  getDebugFlags,
  getRenderGuardConfig,
  type RenderGuardLevel,
} from '@/lib/config/performance-config';

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const resolveContext = (
  context?: Record<string, unknown> | (() => Record<string, unknown> | undefined)
): Record<string, unknown> | undefined => {
  if (!context) return undefined;
  if (typeof context === 'function') {
    try {
      return context() ?? undefined;
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.warn('[RenderGuard] context resolver failed', error);
      }
      return undefined;
    }
  }
  return context;
};

interface RenderGuardState {
  renderCount: number;
  firstRenderAt: number;
  previousRenderAt: number;
  lastWarningAt: number;
  circuitBreakerUntil: number;
  lastSyntheticErrorRender: number;
}

const createState = (): RenderGuardState => ({
  renderCount: 0,
  firstRenderAt: 0,
  previousRenderAt: 0,
  lastWarningAt: 0,
  circuitBreakerUntil: 0,
  lastSyntheticErrorRender: 0,
});

export class RenderLoopDetectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderLoopDetectedError';
  }
}

export interface RenderGuardHandle {
  renderCount: number;
  sinceFirstRenderMs: number;
  sincePreviousRenderMs: number;
  circuitBreakerActive: boolean;
  circuitBreakerResetAt: number | null;
  shouldPause: boolean;
  lastSyntheticError?: RenderLoopDetectedError;
  reset: () => void;
}

const DISABLED_HANDLE: RenderGuardHandle = {
  renderCount: 0,
  sinceFirstRenderMs: 0,
  sincePreviousRenderMs: 0,
  circuitBreakerActive: false,
  circuitBreakerResetAt: null,
  shouldPause: false,
  reset: () => {},
};

export interface RenderGuardOptions {
  warningThreshold?: number;
  errorThreshold?: number;
  rapidRenderMs?: number;
  cooldownMs?: number;
  warningIntervalMs?: number;
  componentId?: string;
  context?: Record<string, unknown> | (() => Record<string, unknown> | undefined);
  disabled?: boolean;
  suppressErrors?: boolean;
  level?: RenderGuardLevel;
}

const createHandle = (stateRef: MutableRefObject<RenderGuardState>): RenderGuardHandle => {
  const handle: RenderGuardHandle = {
    renderCount: 0,
    sinceFirstRenderMs: 0,
    sincePreviousRenderMs: 0,
    circuitBreakerActive: false,
    circuitBreakerResetAt: null,
    shouldPause: false,
    lastSyntheticError: undefined,
    reset: () => {
      stateRef.current = createState();
      handle.renderCount = 0;
      handle.sinceFirstRenderMs = 0;
      handle.sincePreviousRenderMs = 0;
      handle.circuitBreakerActive = false;
      handle.circuitBreakerResetAt = null;
      handle.shouldPause = false;
      handle.lastSyntheticError = undefined;
    },
  };

  return handle;
};

const maybeLog = (message: string, payload: Record<string, unknown>): void => {
  if (!getDebugFlags().enableRenderLogging) {
    return;
  }
  // Collapse noisy payloads in production logs.
  if (getRenderGuardConfig().level === 'basic') {
    console.warn(message, payload);
  } else {
    console.info(message, payload);
  }
};

const resolveMilliseconds = (
  value: number | undefined,
  fallback: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
};

export const useRenderGuard = (
  componentName: string,
  options: RenderGuardOptions = {}
): RenderGuardHandle => {
  const stateRef = useRef<RenderGuardState>(createState());
  const handleRef = useRef<RenderGuardHandle>();

  if (!handleRef.current) {
    handleRef.current = createHandle(stateRef);
  }

  const config = getRenderGuardConfig();
  const level = options.level ?? config.level;

  if (level === 'off' || options.disabled) {
    return DISABLED_HANDLE;
  }

  const warningThreshold = options.warningThreshold ?? config.warningThreshold;
  const errorThreshold = options.errorThreshold ?? config.errorThreshold;
  const rapidRenderMs = resolveMilliseconds(options.rapidRenderMs, config.rapidRenderMs);
  const cooldownMs = resolveMilliseconds(options.cooldownMs, config.cooldownMs);
  const warningIntervalMs = resolveMilliseconds(options.warningIntervalMs, config.warningIntervalMs);

  const state = stateRef.current;
  const handle = handleRef.current;

  const timestamp = now();
  if (state.renderCount === 0) {
    state.firstRenderAt = timestamp;
  }

  const sinceFirstRenderMs = Math.max(0, timestamp - state.firstRenderAt);
  const sincePreviousRenderMs = state.previousRenderAt === 0 ? 0 : Math.max(0, timestamp - state.previousRenderAt);

  state.renderCount += 1;
  state.previousRenderAt = timestamp;

  handle.renderCount = state.renderCount;
  handle.sinceFirstRenderMs = sinceFirstRenderMs;
  handle.sincePreviousRenderMs = sincePreviousRenderMs;

  const contextPayload = resolveContext(options.context);
  const rapidRender = sincePreviousRenderMs > 0 && sincePreviousRenderMs < rapidRenderMs;

  if (state.renderCount >= warningThreshold) {
    const elapsedSinceWarning = timestamp - state.lastWarningAt;
    if (elapsedSinceWarning >= warningIntervalMs) {
      state.lastWarningAt = timestamp;
      maybeLog(`[RenderGuard] High render frequency in ${componentName}`, {
        componentName,
        renderCount: state.renderCount,
        sinceFirstRenderMs,
        sincePreviousRenderMs,
        rapidRender,
      });
    }
  }

  const realtimeTimestamp = Date.now();
  const detectorResult = InfiniteLoopDetector.getInstance().recordRender({
    componentName,
    componentId: options.componentId,
    timestamp: realtimeTimestamp,
    renderCount: state.renderCount,
    sinceFirstRenderMs,
    sincePreviousRenderMs,
    context: contextPayload,
  });

  if (detectorResult.shouldOpenCircuitBreaker) {
    state.circuitBreakerUntil = Math.max(state.circuitBreakerUntil, timestamp + cooldownMs);
  }

  if (state.renderCount >= errorThreshold) {
    state.circuitBreakerUntil = Math.max(state.circuitBreakerUntil, timestamp + cooldownMs);
  }

  const circuitBreakerActive = state.circuitBreakerUntil > timestamp;
  handle.circuitBreakerActive = circuitBreakerActive;
  handle.circuitBreakerResetAt = circuitBreakerActive ? state.circuitBreakerUntil : null;
  handle.shouldPause = circuitBreakerActive;

  const shouldGenerateSyntheticError =
    !options.suppressErrors &&
    state.renderCount >= errorThreshold &&
    state.lastSyntheticErrorRender !== state.renderCount;

  if (shouldGenerateSyntheticError && (config.throwOnError || detectorResult.shouldThrowSyntheticError)) {
    const syntheticError = new RenderLoopDetectedError(
      `${componentName} rendered ${state.renderCount} times in ${Math.round(sinceFirstRenderMs)}ms`
    );
    state.lastSyntheticErrorRender = state.renderCount;
    handle.lastSyntheticError = syntheticError;

    if (config.throwOnError || detectorResult.shouldThrowSyntheticError) {
      throw syntheticError;
    }
  }

  return handle;
};

export const RenderGuardPresets = {
  strict: {
    warningThreshold: 35,
    errorThreshold: 70,
  },
  balanced: {
    warningThreshold: 50,
    errorThreshold: 100,
  },
  lenient: {
    warningThreshold: 70,
    errorThreshold: 120,
  },
  canvasLayers: {
    Controller: { warningThreshold: 45, errorThreshold: 90 },
    NodeLayer: { warningThreshold: 40, errorThreshold: 80 },
    EdgeLayer: { warningThreshold: 40, errorThreshold: 80 },
    LayoutEngine: { warningThreshold: 35, errorThreshold: 70 },
    VirtualizationLayer: { warningThreshold: 40, errorThreshold: 80 },
    InteractionLayer: { warningThreshold: 40, errorThreshold: 80 },
  },
  store: {
    default: { warningThreshold: 40, errorThreshold: 80 },
    aggressive: { warningThreshold: 30, errorThreshold: 60 },
  },
} as const;
