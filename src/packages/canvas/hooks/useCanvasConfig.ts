/**
 * src/packages/canvas/hooks/useCanvasConfig.ts
 * Hook for managing advanced canvas configuration with virtualization settings
 * Provides integration between the advanced CanvasConfig system and canvas components
 * RELEVANT FILES: src/packages/canvas/config/CanvasConfig.ts, src/packages/canvas/contexts/CanvasConfigContext.tsx
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CanvasConfig,
  defaultCanvasConfig,
  createCanvasConfig,
  applyRuntimeCanvasConfig,
  autoDetectCanvasConfig,
  validateCanvasConfig,
  syncCanvasConfigWithPerformanceManager,
} from '../config/CanvasConfig';

/**
 * Hook options for canvas configuration
 */
export interface UseCanvasConfigOptions {
  initialConfig?: Partial<CanvasConfig>;
  enablePersistence?: boolean;
  enableValidation?: boolean;
  debugMode?: boolean;
}

/**
 * Hook result for canvas configuration management
 */
export interface UseCanvasConfigResult {
  config: CanvasConfig;
  updateConfig: (updates: Partial<CanvasConfig>) => void;
  updateVirtualization: (updates: Partial<CanvasConfig['virtualization']>) => void;
  updatePerformance: (updates: Partial<CanvasConfig['performance']>) => void;
  updateInteraction: (updates: Partial<CanvasConfig['interaction']>) => void;
  updateVisuals: (updates: Partial<CanvasConfig['visuals']>) => void;
  resetToDefaults: () => void;
  autoDetectConfig: (nodeCount: number, edgeCount: number) => void;
  validateConfig: () => boolean;
  saveConfig: () => boolean;
  loadConfig: () => boolean;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Hook for managing advanced canvas configuration
 */
export function useCanvasConfig(options: UseCanvasConfigOptions = {}): UseCanvasConfigResult {
  const {
    initialConfig,
    enablePersistence = true,
    enableValidation = true,
    debugMode = false,
  } = options;

  // Initialize config state
  const [config, setConfig] = useState<CanvasConfig>(() => {
    if (initialConfig) {
      return createCanvasConfig(initialConfig);
    }
    return defaultCanvasConfig;
  });

  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load persisted config on mount
  useEffect(() => {
    if (enablePersistence) {
      loadConfig();
    }
  }, [enablePersistence]);

  // Sync with performance manager when config changes
  useEffect(() => {
    try {
      syncCanvasConfigWithPerformanceManager(config);
    } catch (error) {
      if (debugMode) {
        console.warn('[useCanvasConfig] Failed to sync with performance manager:', error);
      }
    }
  }, [config, debugMode]);

  // Validate config when it changes
  useEffect(() => {
    if (enableValidation) {
      const validation = validateCanvasConfig(config);
      setIsValid(validation.valid);
      setValidationErrors(validation.errors.map(e => e.message));
    }
  }, [config, enableValidation]);

  // Update configuration with runtime validation
  const updateConfig = useCallback((updates: Partial<CanvasConfig>) => {
    setConfig(prevConfig => {
      const result = applyRuntimeCanvasConfig(prevConfig, updates, {
        validate: enableValidation,
        source: 'user',
      });

      if (debugMode && !result.validation?.valid) {
        console.warn('[useCanvasConfig] Config update produced validation issues:', result.validation);
      }

      return result.config;
    });
  }, [enableValidation, debugMode]);

  // Specialized update functions for common sections
  const updateVirtualization = useCallback((updates: Partial<CanvasConfig['virtualization']>) => {
    updateConfig({ virtualization: { ...config.virtualization, ...updates } });
  }, [updateConfig, config.virtualization]);

  const updatePerformance = useCallback((updates: Partial<CanvasConfig['performance']>) => {
    updateConfig({ performance: { ...config.performance, ...updates } });
  }, [updateConfig, config.performance]);

  const updateInteraction = useCallback((updates: Partial<CanvasConfig['interaction']>) => {
    updateConfig({ interaction: { ...config.interaction, ...updates } });
  }, [updateConfig, config.interaction]);

  const updateVisuals = useCallback((updates: Partial<CanvasConfig['visuals']>) => {
    updateConfig({ visuals: { ...config.visuals, ...updates } });
  }, [updateConfig, config.visuals]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConfig(defaultCanvasConfig);
  }, []);

  // Auto-detect optimal configuration based on canvas content
  const autoDetectConfig = useCallback((nodeCount: number, edgeCount: number) => {
    const result = autoDetectCanvasConfig({
      nodeCount,
      edgeCount,
      includeValidation: enableValidation,
    });

    setConfig(result.config);

    if (debugMode) {
      console.log('[useCanvasConfig] Auto-detected config:', {
        preset: result.preset,
        config: result.config,
        validation: result.validation,
      });
    }
  }, [enableValidation, debugMode]);

  // Validate current configuration
  const validateConfig = useCallback((): boolean => {
    const validation = validateCanvasConfig(config);
    setIsValid(validation.valid);
    setValidationErrors(validation.errors.map(e => e.message));
    return validation.valid;
  }, [config]);

  // Persistence functions
  const saveConfig = useCallback((): boolean => {
    if (!enablePersistence) return false;

    try {
      const { saveCanvasConfigToStorage } = require('../config/CanvasConfig');
      return saveCanvasConfigToStorage(config);
    } catch (error) {
      if (debugMode) {
        console.warn('[useCanvasConfig] Failed to save config:', error);
      }
      return false;
    }
  }, [config, enablePersistence, debugMode]);

  const loadConfig = useCallback((): boolean => {
    if (!enablePersistence) return false;

    try {
      const { loadCanvasConfigFromStorage } = require('../config/CanvasConfig');
      const loadedConfig = loadCanvasConfigFromStorage();
      if (loadedConfig) {
        setConfig(loadedConfig);
        return true;
      }
    } catch (error) {
      if (debugMode) {
        console.warn('[useCanvasConfig] Failed to load config:', error);
      }
    }
    return false;
  }, [enablePersistence, debugMode]);

  // Auto-save when config changes (debounced)
  useEffect(() => {
    if (!enablePersistence) return;

    const timeoutId = setTimeout(() => {
      saveConfig();
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [config, enablePersistence, saveConfig]);

  // Memoized result to prevent unnecessary re-renders
  return useMemo(() => ({
    config,
    updateConfig,
    updateVirtualization,
    updatePerformance,
    updateInteraction,
    updateVisuals,
    resetToDefaults,
    autoDetectConfig,
    validateConfig,
    saveConfig,
    loadConfig,
    isValid,
    validationErrors,
  }), [
    config,
    updateConfig,
    updateVirtualization,
    updatePerformance,
    updateInteraction,
    updateVisuals,
    resetToDefaults,
    autoDetectConfig,
    validateConfig,
    saveConfig,
    loadConfig,
    isValid,
    validationErrors,
  ]);
}

/**
 * Hook for accessing virtualization settings specifically
 */
export function useVirtualizationConfig() {
  const { config, updateVirtualization } = useCanvasConfig();

  return useMemo(() => ({
    virtualization: config.virtualization,
    thresholds: config.thresholds,
    performance: config.performance,
    updateVirtualization,
    isEnabled: config.virtualization.enabled,
    nodeThreshold: config.virtualization.nodeThreshold,
    edgeThreshold: config.virtualization.edgeThreshold,
    buffer: config.virtualization.buffer,
    overscanPx: config.virtualization.overscanPx,
    onlyRenderVisibleElements: config.virtualization.onlyRenderVisibleElements,
  }), [config.virtualization, config.thresholds, config.performance, updateVirtualization]);
}

/**
 * Hook for accessing performance settings specifically
 */
export function usePerformanceConfig() {
  const { config, updatePerformance } = useCanvasConfig();

  return useMemo(() => ({
    performance: config.performance,
    updatePerformance,
    qualityLevel: config.performance.qualityLevel,
    targetFPS: config.performance.targetFPS,
  }), [config.performance, updatePerformance]);
}

/**
 * Hook for accessing interaction settings specifically
 */
export function useInteractionConfig() {
  const { config, updateInteraction } = useCanvasConfig();

  return useMemo(() => ({
    interaction: config.interaction,
    updateInteraction,
    pan: config.interaction.pan,
    zoom: config.interaction.zoom,
    selection: config.interaction.selection,
    keyboard: config.interaction.keyboard,
  }), [config.interaction, updateInteraction]);
}