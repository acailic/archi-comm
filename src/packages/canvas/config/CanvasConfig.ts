import type { CanvasConfig as ContextCanvasConfig } from '../contexts/CanvasConfigContext';
import { getPerformanceConfig } from '@/lib/config/performance-config';
import { getCanvasPerformanceManager } from '@/lib/performance/CanvasPerformanceManager';
import type { CanvasPerformanceManager } from '@/lib/performance/CanvasPerformanceManager';

/**
 * Canvas configuration versioning
 */
export const CANVAS_CONFIG_VERSION = '2025.01';
export const CANVAS_CONFIG_STORAGE_KEY = 'archicomm.canvas.config.v1';

/**
 * Utility types
 */
export type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

type Nullable<T> = T | null | undefined;

type ModifierKey = 'Shift' | 'Control' | 'Alt' | 'Meta' | 'Space' | 'ctrlOrCmd' | null;

/**
 * Quality and animation levels
 */
export type CanvasQualityLevel = 'ultra' | 'high' | 'balanced' | 'performance';
export type CanvasAnimationQuality = 'low' | 'medium' | 'high';

/**
 * Virtualization settings
 */
export interface CanvasVirtualizationSettings {
  enabled: boolean;
  autoEnable: boolean;
  nodeThreshold: number;
  edgeThreshold: number;
  buffer: number;
  overscanPx: number;
  onlyRenderVisibleElements: boolean;
  clampToViewport: boolean;
  prerenderOnPan: boolean;
  dynamicSampling: boolean;
}

/**
 * Render budget configuration
 */
export interface CanvasRenderBudget {
  warningMs: number;
  criticalMs: number;
  longFrameThresholdMs: number;
}

/**
 * Debounce configuration
 */
export interface CanvasDebounceSettings {
  dragMs: number;
  zoomMs: number;
  viewportMs: number;
  selectionMs: number;
}

/**
 * Threshold configuration
 */
export interface CanvasThresholds {
  virtualizationNodeCount: number;
  virtualizationEdgeCount: number;
  onlyRenderVisibleElements: boolean;
  viewportPaddingPx: number;
  debounces: CanvasDebounceSettings;
}

/**
 * Interaction settings
 */
export interface CanvasPanSettings {
  enabled: boolean;
  inertia: boolean;
  speed: number;
  modifierKey: ModifierKey;
  friction: number;
}

export interface CanvasZoomSettings {
  enabled: boolean;
  minZoom: number;
  maxZoom: number;
  sensitivity: number;
  pinchZoom: boolean;
  doubleClickZoom: boolean;
  zoomOnScroll: boolean;
  requireModifierKey: ModifierKey;
}

export interface CanvasSelectionSettings {
  enabled: boolean;
  multiSelect: boolean;
  lassoSelect: boolean;
  dragSelect: boolean;
  rangeSelectModifier: ModifierKey;
  focusOnSelect: boolean;
}

export interface CanvasKeyboardShortcutFlags {
  delete: boolean;
  duplicate: boolean;
  undo: boolean;
  redo: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  fitView: boolean;
  createConnection: boolean;
  toggleMinimap: boolean;
}

export interface CanvasKeyboardSettings {
  enabled: boolean;
  focusOnLoad: boolean;
  announceChanges: boolean;
  shortcuts: CanvasKeyboardShortcutFlags;
}

export interface CanvasInteractionSettings {
  pan: CanvasPanSettings;
  zoom: CanvasZoomSettings;
  selection: CanvasSelectionSettings;
  keyboard: CanvasKeyboardSettings;
  pointerTolerancePx: number;
}

/**
 * Visual settings
 */
export interface CanvasVisualSettings {
  animationsEnabled: boolean;
  animationQuality: CanvasAnimationQuality;
  edgeAnimations: boolean;
  shadowsEnabled: boolean;
  hoverHalo: boolean;
  highlightIntensity: number;
  showConnectionHandles: boolean;
  themeSync: boolean;
  useGradients: boolean;
}

/**
 * Feature flags
 */
export interface CanvasExperimentalFlags {
  virtualizationV2: boolean;
  edgeBundling: boolean;
  workerRendering: boolean;
  viewportClustering: boolean;
  stickySelection: boolean;
}

export interface CanvasFeatureFlags {
  minimap: boolean;
  controls: boolean;
  background: boolean;
  grid: boolean;
  snapToGrid: boolean;
  performanceMonitoring: boolean;
  debugMode: boolean;
  keyboardShortcuts: boolean;
  devTools: boolean;
  experimental: CanvasExperimentalFlags;
}

/**
 * Cache configuration
 */
export interface CanvasCacheSettings {
  nodes: number;
  edges: number;
  layout: number;
  general: number;
  connections: number;
}

/**
 * Persistence options
 */
export interface CanvasPersistenceSettings {
  enabled: boolean;
  storageKey: string;
  version: string;
  autoSaveIntervalMs: number;
  persistViewport: boolean;
  persistTheme: boolean;
  persistSelection: boolean;
}

/**
 * Performance settings extending the context performance slice
 */
export interface CanvasPerformanceSettings extends ContextCanvasConfig['performance'] {
  renderBudget: CanvasRenderBudget;
  qualityLevel: CanvasQualityLevel;
  monitoringEnabled: boolean;
  adaptiveQuality: boolean;
  autoThrottleInteractions: boolean;
  targetFPS: number;
  maxMemoryMb: number;
  metricsSampleSize: number;
  reportingIntervalMs: number;
}

/**
 * Metrics snapshot used for dynamic adjustments
 */
export interface CanvasPerformanceMetricsSnapshot {
  averageRenderTimeMs?: number;
  worstRenderTimeMs?: number;
  frameRate?: number;
  interactionLatencyMs?: number;
  memoryUsageMb?: number;
}

/**
 * Configuration meta information
 */
export type CanvasConfigPresetKey = 'small' | 'medium' | 'large' | 'performance';
export type CanvasConfigSource = 'default' | 'preset' | 'auto' | 'user' | 'import';

export interface CanvasConfigMeta {
  version: string;
  preset: CanvasConfigPresetKey | 'custom' | 'auto' | 'base';
  source: CanvasConfigSource;
  updatedAt: number;
  notes: string[];
}

/**
 * Main configuration interface extending context configuration
 */
export interface CanvasConfig extends ContextCanvasConfig {
  virtualization: CanvasVirtualizationSettings;
  thresholds: CanvasThresholds;
  interaction: CanvasInteractionSettings;
  visuals: CanvasVisualSettings;
  features: CanvasFeatureFlags;
  caches: CanvasCacheSettings;
  persistence: CanvasPersistenceSettings;
  performance: CanvasPerformanceSettings;
  meta: CanvasConfigMeta;
}

/**
 * Validation structures
 */
export interface CanvasConfigValidationIssue {
  path: string;
  message: string;
  severity: 'warning' | 'error';
  suggestion?: string;
}

export interface CanvasConfigValidationContext {
  nodeCount?: number;
  edgeCount?: number;
  metrics?: CanvasPerformanceMetricsSnapshot;
}

export interface CanvasConfigValidationResult {
  valid: boolean;
  issues: CanvasConfigValidationIssue[];
  warnings: CanvasConfigValidationIssue[];
  errors: CanvasConfigValidationIssue[];
  suggestions: string[];
}

/**
 * Runtime application helper
 */
export interface ApplyRuntimeCanvasConfigOptions {
  source?: CanvasConfigSource;
  preset?: CanvasConfigMeta['preset'];
  validate?: boolean;
  validationContext?: CanvasConfigValidationContext;
  preserveTimestamp?: boolean;
}

/**
 * Auto detection result
 */
export interface AutoDetectCanvasConfigOptions {
  nodeCount: number;
  edgeCount: number;
  metrics?: CanvasPerformanceMetricsSnapshot;
  basePreset?: CanvasConfigPresetKey;
  overrides?: DeepPartial<CanvasConfig>;
  previousConfig?: CanvasConfig;
  includeValidation?: boolean;
}

export interface AutoDetectCanvasConfigResult {
  config: CanvasConfig;
  preset: CanvasConfigPresetKey;
  validation?: CanvasConfigValidationResult;
}

/**
 * Internal utilities
 */
const runtimePerformanceConfig = getPerformanceConfig();

const DEFAULT_RENDER_WARNING_MS = 16;
const DEFAULT_RENDER_CRITICAL_MS = 32;
const DEFAULT_LONG_FRAME_MS = 50;

const DEFAULT_NODE_VIRTUALIZATION_THRESHOLD = 50;
const DEFAULT_EDGE_VIRTUALIZATION_THRESHOLD = 80;
const DEFAULT_VIEWPORT_PADDING = 120;

const DEFAULT_NODE_CACHE_SIZE = 1000;
const DEFAULT_EDGE_CACHE_SIZE = 500;

const QUALITY_LEVEL_ORDER: CanvasQualityLevel[] = ['performance', 'balanced', 'high', 'ultra'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepClone = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as unknown as T;
  }
  if (isObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = deepClone((value as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return value;
};

const deepMergeInto = <T>(target: T, source: DeepPartial<T>): T => {
  if (!isObject(source) && !Array.isArray(source)) {
    return source === undefined ? target : (source as T);
  }

  if (Array.isArray(source)) {
    return deepClone(source) as T;
  }

  const targetObj = isObject(target) ? (target as Record<string, unknown>) : {};
  const sourceObj = source as Record<string, unknown>;

  for (const key of Object.keys(sourceObj)) {
    const value = sourceObj[key];
    if (value === undefined) {
      continue;
    }

    const current = (targetObj as Record<string, unknown>)[key];

    if (isObject(value) && isObject(current)) {
      (targetObj as Record<string, unknown>)[key] = deepMergeInto(current, value as any);
    } else {
      (targetObj as Record<string, unknown>)[key] = deepClone(value);
    }
  }

  return targetObj as T;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const ensureNotesArray = (meta: CanvasConfigMeta): void => {
  if (!meta.notes) {
    meta.notes = [];
  }
};

const qualityToPerformanceMode = (quality: CanvasQualityLevel): 'quality' | 'balanced' | 'performance' => {
  switch (quality) {
    case 'ultra':
    case 'high':
      return 'quality';
    case 'balanced':
      return 'balanced';
    case 'performance':
    default:
      return 'performance';
  }
};

const downgradeQuality = (quality: CanvasQualityLevel): CanvasQualityLevel => {
  const index = QUALITY_LEVEL_ORDER.indexOf(quality);
  return QUALITY_LEVEL_ORDER[Math.max(0, index - 1)];
};

const upgradeQuality = (quality: CanvasQualityLevel): CanvasQualityLevel => {
  const index = QUALITY_LEVEL_ORDER.indexOf(quality);
  return QUALITY_LEVEL_ORDER[Math.min(QUALITY_LEVEL_ORDER.length - 1, index + 1)];
};

/**
 * Base configuration factory
 */
const createMeta = (
  preset: CanvasConfigMeta['preset'],
  source: CanvasConfigSource,
  updatedAt = 0
): CanvasConfigMeta => ({
  version: CANVAS_CONFIG_VERSION,
  preset,
  source,
  updatedAt,
  notes: [],
});

const buildBaseConfig = (): CanvasConfig => ({
  grid: {
    visible: true,
    spacing: 20,
    snapToGrid: false,
    color: '#e2e8f0',
    opacity: 0.4,
  },
  theme: {
    mode: 'light',
    colorScheme: 'serious',
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    accentColor: '#10b981',
  },
  tools: {
    activeTool: 'select',
    toolSettings: {
      snapThreshold: 10,
      selectionMode: 'multiple',
      panMode: 'hand',
      zoomMode: 'both',
    },
  },
  viewport: {
    minZoom: 0.1,
    maxZoom: 4,
    defaultZoom: 0.65, // Lower default zoom to show more components at once
    centerOnLoad: true,
    fitViewOnLoad: false,
    panOnDrag: true,
    zoomOnScroll: true,
  },
  performance: {
    enableVirtualization: true,
    maxRenderNodes: 1000,
    bufferZone: 100,
    batchUpdateDelay: 16,
    renderBudget: {
      warningMs: DEFAULT_RENDER_WARNING_MS,
      criticalMs: DEFAULT_RENDER_CRITICAL_MS,
      longFrameThresholdMs: DEFAULT_LONG_FRAME_MS,
    },
    qualityLevel: 'balanced',
    monitoringEnabled: runtimePerformanceConfig.debug.enableRenderLogging,
    adaptiveQuality: true,
    autoThrottleInteractions: true,
    targetFPS: 60,
    maxMemoryMb: 512,
    metricsSampleSize: 120,
    reportingIntervalMs: 1000,
  },
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: false,
    highContrast: false,
    reducedMotion: false,
  },
  virtualization: {
    enabled: true,
    autoEnable: true,
    nodeThreshold: DEFAULT_NODE_VIRTUALIZATION_THRESHOLD,
    edgeThreshold: DEFAULT_EDGE_VIRTUALIZATION_THRESHOLD,
    buffer: 200,
    overscanPx: 200,
    onlyRenderVisibleElements: true,
    clampToViewport: true,
    prerenderOnPan: true,
    dynamicSampling: true,
  },
  thresholds: {
    virtualizationNodeCount: DEFAULT_NODE_VIRTUALIZATION_THRESHOLD,
    virtualizationEdgeCount: DEFAULT_EDGE_VIRTUALIZATION_THRESHOLD,
    onlyRenderVisibleElements: true,
    viewportPaddingPx: DEFAULT_VIEWPORT_PADDING,
    debounces: {
      dragMs: 16,
      zoomMs: 100,
      viewportMs: 100,
      selectionMs: 50,
    },
  },
  interaction: {
    pan: {
      enabled: true,
      inertia: true,
      speed: 1,
      modifierKey: 'Space',
      friction: 0.12,
    },
    zoom: {
      enabled: true,
      minZoom: 0.1,
      maxZoom: 4,
      sensitivity: 0.5,
      pinchZoom: true,
      doubleClickZoom: true,
      zoomOnScroll: true,
      requireModifierKey: 'ctrlOrCmd',
    },
    selection: {
      enabled: true,
      multiSelect: true,
      lassoSelect: true,
      dragSelect: true,
      rangeSelectModifier: 'Shift',
      focusOnSelect: false,
    },
    keyboard: {
      enabled: true,
      focusOnLoad: false,
      announceChanges: true,
      shortcuts: {
        delete: true,
        duplicate: true,
        undo: true,
        redo: true,
        zoomIn: true,
        zoomOut: true,
        fitView: true,
        createConnection: true,
        toggleMinimap: true,
      },
    },
    pointerTolerancePx: 6,
  },
  visuals: {
    animationsEnabled: true,
    animationQuality: 'high',
    edgeAnimations: true,
    shadowsEnabled: true,
    hoverHalo: true,
    highlightIntensity: 0.7,
    showConnectionHandles: true,
    themeSync: true,
    useGradients: true,
  },
  features: {
    minimap: false,
    controls: true,
    background: true,
    grid: true,
    snapToGrid: false,
    performanceMonitoring: runtimePerformanceConfig.debug.enableRenderLogging,
    debugMode: runtimePerformanceConfig.debug.enableRenderLogging,
    keyboardShortcuts: true,
    devTools: runtimePerformanceConfig.debug.enableRenderLogging,
    experimental: {
      virtualizationV2: false,
      edgeBundling: false,
      workerRendering: true,
      viewportClustering: false,
      stickySelection: false,
    },
  },
  caches: {
    nodes: DEFAULT_NODE_CACHE_SIZE,
    edges: DEFAULT_EDGE_CACHE_SIZE,
    layout: 200,
    general: 256,
    connections: 300,
  },
  persistence: {
    enabled: true,
    storageKey: CANVAS_CONFIG_STORAGE_KEY,
    version: CANVAS_CONFIG_VERSION,
    autoSaveIntervalMs: 3000,
    persistViewport: true,
    persistTheme: true,
    persistSelection: false,
  },
  meta: createMeta('base', 'default'),
});

/**
 * Enforce configuration constraints and normalise values
 */
const enforceConstraints = (
  config: CanvasConfig,
  options: { updateTimestamp?: boolean } = {}
): CanvasConfig => {
  const { updateTimestamp = true } = options;

  config.grid.spacing = Math.max(1, Math.round(config.grid.spacing));

  config.virtualization.nodeThreshold = Math.max(0, Math.round(config.virtualization.nodeThreshold));
  config.virtualization.edgeThreshold = Math.max(0, Math.round(config.virtualization.edgeThreshold));
  config.virtualization.buffer = Math.max(0, Math.round(config.virtualization.buffer));
  config.virtualization.overscanPx = Math.max(0, Math.round(config.virtualization.overscanPx));

  config.thresholds.virtualizationNodeCount = Math.max(
    0,
    Math.round(config.thresholds.virtualizationNodeCount)
  );
  config.thresholds.virtualizationEdgeCount = Math.max(
    0,
    Math.round(config.thresholds.virtualizationEdgeCount)
  );
  config.thresholds.viewportPaddingPx = Math.max(0, Math.round(config.thresholds.viewportPaddingPx));

  config.thresholds.debounces.dragMs = Math.max(0, Math.round(config.thresholds.debounces.dragMs));
  config.thresholds.debounces.zoomMs = Math.max(0, Math.round(config.thresholds.debounces.zoomMs));
  config.thresholds.debounces.viewportMs = Math.max(
    0,
    Math.round(config.thresholds.debounces.viewportMs)
  );
  config.thresholds.debounces.selectionMs = Math.max(
    0,
    Math.round(config.thresholds.debounces.selectionMs)
  );

  config.performance.renderBudget.warningMs = Math.max(
    1,
    Math.round(config.performance.renderBudget.warningMs)
  );
  config.performance.renderBudget.criticalMs = Math.max(
    config.performance.renderBudget.warningMs + 1,
    Math.round(config.performance.renderBudget.criticalMs)
  );
  config.performance.renderBudget.longFrameThresholdMs = Math.max(
    config.performance.renderBudget.criticalMs,
    Math.round(config.performance.renderBudget.longFrameThresholdMs)
  );

  config.performance.maxRenderNodes = Math.max(100, Math.round(config.performance.maxRenderNodes));
  config.performance.bufferZone = Math.max(0, Math.round(config.performance.bufferZone));
  config.performance.batchUpdateDelay = Math.max(0, Math.round(config.performance.batchUpdateDelay));
  config.performance.targetFPS = clampNumber(Math.round(config.performance.targetFPS), 30, 120);
  config.performance.maxMemoryMb = Math.max(64, Math.round(config.performance.maxMemoryMb));
  config.performance.metricsSampleSize = Math.max(
    10,
    Math.round(config.performance.metricsSampleSize)
  );
  config.performance.reportingIntervalMs = Math.max(
    200,
    Math.round(config.performance.reportingIntervalMs)
  );

  config.visuals.highlightIntensity = clampNumber(config.visuals.highlightIntensity, 0, 1);

  config.caches.nodes = Math.max(0, Math.round(config.caches.nodes));
  config.caches.edges = Math.max(0, Math.round(config.caches.edges));
  config.caches.layout = Math.max(0, Math.round(config.caches.layout));
  config.caches.general = Math.max(0, Math.round(config.caches.general));
  config.caches.connections = Math.max(0, Math.round(config.caches.connections));

  config.persistence.autoSaveIntervalMs = Math.max(
    500,
    Math.round(config.persistence.autoSaveIntervalMs)
  );

  if (!QUALITY_LEVEL_ORDER.includes(config.performance.qualityLevel)) {
    config.performance.qualityLevel = 'balanced';
  }

  if (!updateTimestamp) {
    return config;
  }

  config.meta.updatedAt = Date.now();
  return config;
};

/**
 * Base configuration template kept immutable
 */
const BASE_CONFIG_TEMPLATE: CanvasConfig = (() => {
  const base = buildBaseConfig();
  return Object.freeze(enforceConstraints(base, { updateTimestamp: false }));
})();

/**
 * Helper to clone the base template
 */
const cloneBaseConfig = (): CanvasConfig => deepClone(BASE_CONFIG_TEMPLATE);

/**
 * Quality profile adjustments
 */
const applyQualityProfile = (config: CanvasConfig): void => {
  switch (config.performance.qualityLevel) {
    case 'ultra': {
      config.visuals.animationsEnabled = true;
      config.visuals.animationQuality = 'high';
      config.visuals.shadowsEnabled = true;
      config.visuals.edgeAnimations = true;
      config.features.performanceMonitoring = true;
      break;
    }
    case 'high': {
      config.visuals.animationsEnabled = true;
      config.visuals.animationQuality = 'high';
      config.visuals.shadowsEnabled = true;
      config.visuals.edgeAnimations = true;
      break;
    }
    case 'balanced': {
      config.visuals.animationsEnabled = true;
      config.visuals.animationQuality = 'medium';
      config.visuals.shadowsEnabled = true;
      config.visuals.edgeAnimations = false;
      config.virtualization.buffer = Math.max(config.virtualization.buffer, 160);
      break;
    }
    case 'performance':
    default: {
      config.visuals.animationsEnabled = false;
      config.visuals.animationQuality = 'low';
      config.visuals.shadowsEnabled = false;
      config.visuals.edgeAnimations = false;
      config.features.minimap = false;
      config.features.devTools = false;
      config.virtualization.buffer = Math.max(config.virtualization.buffer, 120);
      config.visuals.hoverHalo = false;
      config.visuals.useGradients = false;
    }
  }
};

/**
 * Merge helper returning a new configuration
 */
const mergeConfig = (base: CanvasConfig, overrides?: DeepPartial<CanvasConfig>): CanvasConfig => {
  if (overrides) {
    deepMergeInto(base, overrides);
  }
  applyQualityProfile(base);
  return enforceConstraints(base);
};

/**
 * Preset definitions
 */
const PRESET_OVERRIDES: Record<CanvasConfigPresetKey, DeepPartial<CanvasConfig>> = {
  small: {
    virtualization: {
      enabled: false,
      autoEnable: false,
      onlyRenderVisibleElements: false,
      buffer: 120,
      overscanPx: 120,
    },
    performance: {
      enableVirtualization: false,
      qualityLevel: 'high',
      renderBudget: {
        warningMs: 18,
        criticalMs: 34,
        longFrameThresholdMs: 50,
      },
      maxRenderNodes: 400,
    },
    features: {
      minimap: true,
      performanceMonitoring: false,
      debugMode: false,
      experimental: {
        edgeBundling: false,
        virtualizationV2: false,
      },
    },
    visuals: {
      animationsEnabled: true,
      animationQuality: 'high',
      edgeAnimations: true,
      shadowsEnabled: true,
      hoverHalo: true,
      highlightIntensity: 0.8,
    },
    thresholds: {
      virtualizationNodeCount: 80,
      virtualizationEdgeCount: 120,
      onlyRenderVisibleElements: false,
    },
    caches: {
      nodes: 400,
      edges: 300,
      layout: 120,
      connections: 150,
    },
  },
  medium: {
    virtualization: {
      enabled: false,
      autoEnable: true,
      nodeThreshold: 40,
      edgeThreshold: 60,
      onlyRenderVisibleElements: false,
      buffer: 160,
    },
    performance: {
      qualityLevel: 'high',
      maxRenderNodes: 1200,
      renderBudget: {
        warningMs: 18,
        criticalMs: 32,
        longFrameThresholdMs: 45,
      },
    },
    features: {
      minimap: true,
      performanceMonitoring: true,
      debugMode: runtimePerformanceConfig.debug.enableRenderLogging,
    },
    visuals: {
      animationQuality: 'high',
      highlightIntensity: 0.75,
    },
    caches: {
      nodes: 1200,
      edges: 700,
      layout: 260,
      connections: 320,
    },
  },
  large: {
    virtualization: {
      enabled: true,
      autoEnable: true,
      nodeThreshold: 50,
      edgeThreshold: 70,
      onlyRenderVisibleElements: true,
      buffer: 220,
      overscanPx: 220,
    },
    performance: {
      enableVirtualization: true,
      qualityLevel: 'balanced',
      maxRenderNodes: 2000,
      renderBudget: {
        warningMs: 16,
        criticalMs: 30,
        longFrameThresholdMs: 40,
      },
      monitoringEnabled: true,
    },
    features: {
      minimap: false,
      performanceMonitoring: true,
      debugMode: runtimePerformanceConfig.debug.enableRenderLogging,
      experimental: {
        workerRendering: true,
        virtualizationV2: true,
      },
    },
    visuals: {
      animationQuality: 'medium',
      hoverHalo: true,
      highlightIntensity: 0.65,
      shadowsEnabled: true,
    },
    thresholds: {
      virtualizationNodeCount: 50,
      virtualizationEdgeCount: 70,
      onlyRenderVisibleElements: true,
    },
    caches: {
      nodes: 2000,
      edges: 1200,
      layout: 360,
      connections: 480,
    },
  },
  performance: {
    virtualization: {
      enabled: true,
      autoEnable: true,
      nodeThreshold: 40,
      edgeThreshold: 60,
      onlyRenderVisibleElements: true,
      buffer: 160,
      overscanPx: 140,
      dynamicSampling: true,
    },
    performance: {
      enableVirtualization: true,
      qualityLevel: 'performance',
      adaptiveQuality: true,
      autoThrottleInteractions: true,
      maxRenderNodes: 4000,
      renderBudget: {
        warningMs: 14,
        criticalMs: 26,
        longFrameThresholdMs: 32,
      },
      monitoringEnabled: true,
      maxMemoryMb: 384,
    },
    visuals: {
      animationsEnabled: false,
      animationQuality: 'low',
      hoverHalo: false,
      highlightIntensity: 0.5,
      showConnectionHandles: true,
      shadowsEnabled: false,
      useGradients: false,
    },
    features: {
      minimap: false,
      controls: true,
      performanceMonitoring: true,
      debugMode: runtimePerformanceConfig.debug.enableRenderLogging,
      devTools: false,
      experimental: {
        virtualizationV2: true,
        workerRendering: true,
        edgeBundling: true,
        viewportClustering: true,
        stickySelection: true,
      },
    },
    caches: {
      nodes: 4000,
      edges: 2500,
      layout: 600,
      connections: 800,
    },
    thresholds: {
      virtualizationNodeCount: 40,
      virtualizationEdgeCount: 60,
      onlyRenderVisibleElements: true,
    },
  },
};

/**
 * Preset registry (read-only)
 */
export const canvasConfigPresets: Record<CanvasConfigPresetKey, CanvasConfig> = Object.freeze(
  Object.fromEntries(
    (Object.keys(PRESET_OVERRIDES) as CanvasConfigPresetKey[]).map(presetKey => {
      const config = mergeConfig(cloneBaseConfig(), PRESET_OVERRIDES[presetKey]);
      config.meta = createMeta(presetKey, 'preset', 0);
      return [presetKey, Object.freeze(config)];
    })
  ) as Record<CanvasConfigPresetKey, CanvasConfig>
);

/**
 * Retrieve a preset instance with fresh metadata
 */
export const getCanvasConfigPreset = (preset: CanvasConfigPresetKey): CanvasConfig => {
  const presetConfig = canvasConfigPresets[preset];
  const config = deepClone(presetConfig);
  config.meta = createMeta(preset, 'preset', Date.now());
  return enforceConstraints(config);
};

/**
 * Create configuration from overrides (custom configuration)
 */
export const createCanvasConfig = (
  overrides?: DeepPartial<CanvasConfig>,
  options: { preset?: CanvasConfigMeta['preset']; source?: CanvasConfigSource } = {}
): CanvasConfig => {
  const base = cloneBaseConfig();
  if (overrides) {
    deepMergeInto(base, overrides);
  }
  const preset = options.preset ?? 'custom';
  const source = options.source ?? 'user';
  base.meta = createMeta(preset, source, Date.now());
  return mergeConfig(base);
};

/**
 * Default configuration instance
 */
export const defaultCanvasConfig = (() => {
  const config = cloneBaseConfig();
  config.meta = createMeta('base', 'default', Date.now());
  return enforceConstraints(config);
})();

/**
 * Upgrade an existing context configuration to the advanced configuration
 */
export const upgradeContextConfig = (
  contextConfig: ContextCanvasConfig,
  overrides?: DeepPartial<CanvasConfig>
): CanvasConfig => {
  const base = cloneBaseConfig();
  deepMergeInto(base, contextConfig as DeepPartial<CanvasConfig>);
  if (overrides) {
    deepMergeInto(base, overrides);
  }
  base.meta = createMeta('custom', 'user', Date.now());
  return mergeConfig(base);
};

/**
 * Extract context configuration slice from advanced configuration
 */
export const extractContextConfigSlice = (config: CanvasConfig): ContextCanvasConfig => ({
  grid: deepClone(config.grid),
  theme: deepClone(config.theme),
  tools: deepClone(config.tools),
  viewport: deepClone(config.viewport),
  performance: {
    enableVirtualization: config.performance.enableVirtualization,
    maxRenderNodes: config.performance.maxRenderNodes,
    bufferZone: config.performance.bufferZone,
    batchUpdateDelay: config.performance.batchUpdateDelay,
  },
  accessibility: deepClone(config.accessibility),
});

/**
 * Validation logic
 */
export const validateCanvasConfig = (
  config: CanvasConfig,
  context?: CanvasConfigValidationContext
): CanvasConfigValidationResult => {
  const issues: CanvasConfigValidationIssue[] = [];
  const warnings: CanvasConfigValidationIssue[] = [];
  const errors: CanvasConfigValidationIssue[] = [];
  const suggestions = new Set<string>();

  const recordIssue = (issue: CanvasConfigValidationIssue) => {
    issues.push(issue);
    if (issue.severity === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
    if (issue.suggestion) {
      suggestions.add(issue.suggestion);
    }
  };

  if (config.grid.spacing < 4) {
    recordIssue({
      path: 'grid.spacing',
      message: 'Grid spacing should be at least 4px to avoid rendering artifacts.',
      severity: 'warning',
      suggestion: 'Increase grid spacing to 4 or more for consistent snap behaviour.',
    });
  }

  if (config.virtualization.enabled && !config.thresholds.onlyRenderVisibleElements) {
    recordIssue({
      path: 'virtualization',
      message: 'Virtualization is enabled but onlyRenderVisibleElements is disabled.',
      severity: 'warning',
      suggestion: 'Enable thresholds.onlyRenderVisibleElements to leverage virtualization fully.',
    });
  }

  if (config.virtualization.nodeThreshold < 0 || config.virtualization.edgeThreshold < 0) {
    recordIssue({
      path: 'virtualization.thresholds',
      message: 'Virtualization thresholds cannot be negative.',
      severity: 'error',
      suggestion: 'Set node and edge thresholds to zero or positive values.',
    });
  }

  if (config.performance.renderBudget.warningMs >= config.performance.renderBudget.criticalMs) {
    recordIssue({
      path: 'performance.renderBudget',
      message: 'Render warning threshold must be less than critical threshold.',
      severity: 'error',
      suggestion: 'Decrease warning threshold or increase critical threshold to maintain order.',
    });
  }

  if (config.visuals.highlightIntensity > 0.9 && config.performance.qualityLevel === 'performance') {
    recordIssue({
      path: 'visuals.highlightIntensity',
      message: 'High highlight intensity can be expensive in performance mode.',
      severity: 'warning',
      suggestion: 'Reduce highlightIntensity to <= 0.7 when using performance quality level.',
    });
  }

  if (context?.nodeCount !== undefined) {
    if (!config.virtualization.enabled && context.nodeCount > config.thresholds.virtualizationNodeCount) {
      recordIssue({
        path: 'virtualization.enabled',
        message: 'Virtualization is disabled while node count exceeds configured threshold.',
        severity: 'warning',
        suggestion: 'Enable virtualization to maintain smooth rendering for larger canvases.',
      });
    }
    if (config.caches.nodes < context.nodeCount) {
      recordIssue({
        path: 'caches.nodes',
        message: 'Node cache size is smaller than current node count.',
        severity: 'warning',
        suggestion: 'Increase caches.nodes to at least the current node count to avoid thrashing.',
      });
    }
  }

  if (context?.edgeCount !== undefined && config.caches.edges < context.edgeCount) {
    recordIssue({
      path: 'caches.edges',
      message: 'Edge cache size is smaller than current edge count.',
      severity: 'warning',
      suggestion: 'Increase caches.edges to improve edge rendering performance.',
    });
  }

  if (context?.metrics?.averageRenderTimeMs !== undefined) {
    if (context.metrics.averageRenderTimeMs > config.performance.renderBudget.criticalMs) {
      recordIssue({
        path: 'performance.renderBudget',
        message: 'Average render time exceeds critical budget.',
        severity: 'warning',
        suggestion: 'Switch to a lower quality profile or enable additional virtualization.',
      });
    }
    if (
      context.metrics.frameRate !== undefined &&
      context.metrics.frameRate < config.performance.targetFPS * 0.85
    ) {
      recordIssue({
        path: 'performance.targetFPS',
        message: 'Observed frame rate is significantly below target FPS.',
        severity: 'warning',
        suggestion: 'Reduce visual effects or lower the target FPS to avoid budget violations.',
      });
    }
  }

  if (
    config.features.performanceMonitoring === false &&
    config.performance.monitoringEnabled === true
  ) {
    recordIssue({
      path: 'features.performanceMonitoring',
      message: 'Performance monitoring is enabled without the feature flag being active.',
      severity: 'warning',
      suggestion: 'Enable features.performanceMonitoring or disable performance.monitoringEnabled.',
    });
  }

  return {
    valid: errors.length === 0,
    issues,
    warnings,
    errors,
    suggestions: Array.from(suggestions),
  };
};

/**
 * Apply runtime overrides to an existing configuration
 */
export const applyRuntimeCanvasConfig = (
  config: CanvasConfig,
  overrides: DeepPartial<CanvasConfig>,
  options: ApplyRuntimeCanvasConfigOptions = {}
): { config: CanvasConfig; validation?: CanvasConfigValidationResult } => {
  const nextConfig = deepClone(config);
  deepMergeInto(nextConfig, overrides);

  if (options.preset) {
    nextConfig.meta.preset = options.preset;
  }
  if (options.source) {
    nextConfig.meta.source = options.source;
  }

  const preserveTimestamp = options.preserveTimestamp ?? false;
  nextConfig.meta.version = CANVAS_CONFIG_VERSION;
  if (!preserveTimestamp) {
    nextConfig.meta.updatedAt = Date.now();
  }

  const merged = mergeConfig(nextConfig);

  let validation: CanvasConfigValidationResult | undefined;
  const shouldValidate = options.validate ?? true;
  if (shouldValidate) {
    validation = validateCanvasConfig(merged, options.validationContext);
    if (!validation.valid && merged.features.debugMode) {
      console.warn('[CanvasConfig] Applied overrides produced validation issues:', validation);
    }
  }

  return { config: merged, validation };
};

/**
 * Determine preset key based on dataset
 */
const resolvePresetForDataset = (nodeCount: number, edgeCount: number): CanvasConfigPresetKey => {
  if (nodeCount < 20 && edgeCount < 30) {
    return 'small';
  }
  if (nodeCount <= 50 && edgeCount <= 80) {
    return 'medium';
  }
  if (nodeCount <= 200 && edgeCount <= 320) {
    return 'large';
  }
  return 'performance';
};

/**
 * Auto-detect configuration
 */
export const autoDetectCanvasConfig = (
  options: AutoDetectCanvasConfigOptions
): AutoDetectCanvasConfigResult => {
  const presetKey = options.basePreset ?? resolvePresetForDataset(options.nodeCount, options.edgeCount);
  const config = getCanvasConfigPreset(presetKey);

  const shouldEnableVirtualization =
    config.virtualization.autoEnable &&
    (options.nodeCount >= config.virtualization.nodeThreshold ||
      options.edgeCount >= config.virtualization.edgeThreshold ||
      (options.metrics?.averageRenderTimeMs ?? 0) > config.performance.renderBudget.warningMs);

  config.virtualization.enabled = shouldEnableVirtualization || config.virtualization.enabled;
  config.performance.enableVirtualization = config.virtualization.enabled;
  config.thresholds.onlyRenderVisibleElements = config.virtualization.enabled;

  config.performance.maxRenderNodes = Math.max(
    config.performance.maxRenderNodes,
    Math.round(options.nodeCount * 1.8)
  );
  config.caches.nodes = Math.max(config.caches.nodes, options.nodeCount * 2);
  config.caches.edges = Math.max(config.caches.edges, options.edgeCount * 2);

  if (options.metrics) {
    const { averageRenderTimeMs, frameRate, memoryUsageMb } = options.metrics;

    if (averageRenderTimeMs && averageRenderTimeMs > config.performance.renderBudget.warningMs) {
      config.performance.qualityLevel = downgradeQuality(config.performance.qualityLevel);
      config.virtualization.enabled = true;
    } else if (
      averageRenderTimeMs &&
      averageRenderTimeMs < config.performance.renderBudget.warningMs * 0.6 &&
      config.performance.qualityLevel !== 'ultra'
    ) {
      config.performance.qualityLevel = upgradeQuality(config.performance.qualityLevel);
    }

    if (frameRate && frameRate < config.performance.targetFPS * 0.85) {
      config.performance.qualityLevel = downgradeQuality(config.performance.qualityLevel);
      config.virtualization.enabled = true;
    }

    if (memoryUsageMb && memoryUsageMb > config.performance.maxMemoryMb * 0.85) {
      config.caches.nodes = Math.round(config.caches.nodes * 0.9);
      config.caches.edges = Math.round(config.caches.edges * 0.9);
      config.performance.maxMemoryMb = Math.max(memoryUsageMb * 1.1, config.performance.maxMemoryMb);
    }
  }

  applyQualityProfile(config);
  enforceConstraints(config);

  let validation: CanvasConfigValidationResult | undefined;
  if (options.includeValidation) {
    validation = validateCanvasConfig(config, {
      nodeCount: options.nodeCount,
      edgeCount: options.edgeCount,
      metrics: options.metrics,
    });
  }

  if (options.overrides) {
    const applied = applyRuntimeCanvasConfig(config, options.overrides, {
      source: 'auto',
      preset: presetKey,
      validate: options.includeValidation,
      validationContext: {
        nodeCount: options.nodeCount,
        edgeCount: options.edgeCount,
        metrics: options.metrics,
      },
      preserveTimestamp: false,
    });
    return {
      config: applied.config,
      preset: presetKey,
      validation: options.includeValidation ? applied.validation : validation,
    };
  }

  return { config, preset: presetKey, validation };
};

/**
 * Persistence helpers
 */
const hasStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

interface StoredCanvasConfigPayload {
  version: string;
  timestamp: number;
  config: CanvasConfig;
}

const rehydrateCanvasConfig = (
  payload: DeepPartial<CanvasConfig>,
  options: { preserveTimestamp?: boolean } = {}
): CanvasConfig => {
  const base = cloneBaseConfig();
  deepMergeInto(base, payload);
  const preserveTimestamp = options.preserveTimestamp ?? false;

  if (payload.meta) {
    base.meta.version = payload.meta.version ?? CANVAS_CONFIG_VERSION;
    base.meta.preset = (payload.meta.preset as CanvasConfigMeta['preset']) ?? 'custom';
    base.meta.source = (payload.meta.source as CanvasConfigSource) ?? 'import';
    if (preserveTimestamp && payload.meta.updatedAt) {
      base.meta.updatedAt = payload.meta.updatedAt;
    }
    ensureNotesArray(base.meta);
    if (Array.isArray(payload.meta.notes)) {
      const uniqueNotes = new Set([...base.meta.notes, ...payload.meta.notes]);
      base.meta.notes = Array.from(uniqueNotes);
    }
  } else {
    base.meta = createMeta('custom', 'import', preserveTimestamp ? 0 : Date.now());
  }

  const merged = mergeConfig(base);
  if (!preserveTimestamp || !payload.meta?.updatedAt) {
    merged.meta.updatedAt = Date.now();
  }
  return merged;
};

export const saveCanvasConfigToStorage = (
  config: CanvasConfig,
  storageKey = CANVAS_CONFIG_STORAGE_KEY
): boolean => {
  if (!hasStorage()) {
    return false;
  }
  try {
    const payload: StoredCanvasConfigPayload = {
      version: CANVAS_CONFIG_VERSION,
      timestamp: Date.now(),
      config,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('[CanvasConfig] Failed to persist configuration:', error);
    return false;
  }
};

export const loadCanvasConfigFromStorage = (
  storageKey = CANVAS_CONFIG_STORAGE_KEY
): CanvasConfig | null => {
  if (!hasStorage()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw) as StoredCanvasConfigPayload;
    if (!payload?.config) {
      return null;
    }
    return rehydrateCanvasConfig(payload.config, { preserveTimestamp: true });
  } catch (error) {
    console.warn('[CanvasConfig] Failed to load configuration from storage:', error);
    return null;
  }
};

export const clearCanvasConfigStorage = (storageKey = CANVAS_CONFIG_STORAGE_KEY): void => {
  if (!hasStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('[CanvasConfig] Failed to clear stored configuration:', error);
  }
};

export const exportCanvasConfig = (config: CanvasConfig): string =>
  JSON.stringify(
    {
      version: CANVAS_CONFIG_VERSION,
      exportedAt: Date.now(),
      config,
    },
    null,
    2
  );

export const importCanvasConfig = (
  input: string | DeepPartial<CanvasConfig>,
  options: { persist?: boolean; storageKey?: string } = {}
): CanvasConfig => {
  const payload =
    typeof input === 'string'
      ? (JSON.parse(input) as { config: DeepPartial<CanvasConfig> }).config
      : input;
  const config = rehydrateCanvasConfig(payload, { preserveTimestamp: false });

  if (options.persist) {
    saveCanvasConfigToStorage(config, options.storageKey ?? CANVAS_CONFIG_STORAGE_KEY);
  }

  return config;
};

/**
 * Sync configuration with CanvasPerformanceManager
 */
export const syncCanvasConfigWithPerformanceManager = (
  config: CanvasConfig,
  manager?: CanvasPerformanceManager | null
): void => {
  let resolvedManager = manager;
  if (!resolvedManager) {
    try {
      resolvedManager = getCanvasPerformanceManager();
    } catch (error) {
      if (config.features.debugMode) {
        console.warn('[CanvasConfig] Failed to obtain CanvasPerformanceManager instance:', error);
      }
      resolvedManager = null;
    }
  }
  if (!resolvedManager) {
    return;
  }

  resolvedManager.updateConfig({
    mode: qualityToPerformanceMode(config.performance.qualityLevel),
    adaptiveQuality: config.performance.adaptiveQuality,
    debugMode: config.features.debugMode,
    enableWorkers: config.features.experimental.workerRendering,
    targetFPS: config.performance.targetFPS,
    maxMemoryUsage: config.performance.maxMemoryMb,
  });

  resolvedManager.setPerformanceBudget('reactflow-canvas', {
    renderTime: config.performance.renderBudget.warningMs,
    memoryUsage: config.performance.maxMemoryMb,
    fpsThreshold: Math.max(30, Math.round(config.performance.targetFPS * 0.9)),
    complexityThreshold: Math.max(
      500,
      config.thresholds.virtualizationNodeCount * 30 +
        config.thresholds.virtualizationEdgeCount * 10
    ),
  });
};

/**
 * Suggest optimal configuration adjustments without mutating the original config
 */
export const suggestCanvasConfigAdjustments = (
  config: CanvasConfig,
  context: CanvasConfigValidationContext
): { suggestions: string[]; proposedConfig: CanvasConfig } => {
  const suggestions = new Set<string>();
  const proposed = deepClone(config);

  if (
    context.nodeCount !== undefined &&
    context.nodeCount > proposed.thresholds.virtualizationNodeCount &&
    !proposed.virtualization.enabled
  ) {
    proposed.virtualization.enabled = true;
    proposed.performance.enableVirtualization = true;
    proposed.thresholds.onlyRenderVisibleElements = true;
    suggestions.add('Enable virtualization for large node counts to reduce render cost.');
  }

  if (context.metrics?.averageRenderTimeMs !== undefined) {
    if (context.metrics.averageRenderTimeMs > proposed.performance.renderBudget.warningMs) {
      proposed.performance.qualityLevel = downgradeQuality(proposed.performance.qualityLevel);
      applyQualityProfile(proposed);
      suggestions.add(
        'Downgrade quality level to stay within render budget (automatic virtualization recommended).'
      );
    } else if (
      context.metrics.averageRenderTimeMs <
        proposed.performance.renderBudget.warningMs * 0.5 &&
      proposed.performance.qualityLevel !== 'ultra'
    ) {
      proposed.performance.qualityLevel = upgradeQuality(proposed.performance.qualityLevel);
      applyQualityProfile(proposed);
      suggestions.add(
        'Rendering comfortably within budget. Consider raising quality for improved visuals.'
      );
    }
  }

  enforceConstraints(proposed);
  return { suggestions: Array.from(suggestions), proposedConfig: proposed };
};