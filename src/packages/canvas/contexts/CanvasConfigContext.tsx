/**
 * Canvas Configuration Context - Immutable canvas configuration data
 * Separated from OptimizedCanvasContext to prevent unnecessary re-renders
 * Contains theme, grid settings, tool configurations that rarely change
 */

import React, { createContext, useContext, useMemo, useRef } from 'react';
import { useStableConfig } from '@/shared/hooks/useStableLiterals';
import { equalityFunctions } from '@/shared/utils/memoization';

export interface GridConfig {
  visible: boolean;
  spacing: number;
  snapToGrid: boolean;
  color: string;
  opacity: number;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  colorScheme: 'serious' | 'playful';
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
}

export interface ToolConfig {
  activeTool: 'select' | 'pan' | 'zoom' | 'annotate' | 'connect' | 'erase';
  toolSettings: {
    snapThreshold: number;
    selectionMode: 'single' | 'multiple';
    panMode: 'hand' | 'space';
    zoomMode: 'wheel' | 'pinch' | 'both';
  };
}

export interface ViewportConfig {
  minZoom: number;
  maxZoom: number;
  defaultZoom: number;
  centerOnLoad: boolean;
  fitViewOnLoad: boolean;
  panOnDrag: boolean;
  zoomOnScroll: boolean;
}

export interface CanvasConfig {
  grid: GridConfig;
  theme: ThemeConfig;
  tools: ToolConfig;
  viewport: ViewportConfig;
  performance: {
    enableVirtualization: boolean;
    maxRenderNodes: number;
    bufferZone: number;
    batchUpdateDelay: number;
  };
  accessibility: {
    enableKeyboardNavigation: boolean;
    enableScreenReader: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
  };
}

export interface CanvasConfigContextValue {
  config: CanvasConfig;
  updateGridConfig: (updates: Partial<GridConfig>) => void;
  updateThemeConfig: (updates: Partial<ThemeConfig>) => void;
  updateToolConfig: (updates: Partial<ToolConfig>) => void;
  updateViewportConfig: (updates: Partial<ViewportConfig>) => void;
  updatePerformanceConfig: (updates: Partial<CanvasConfig['performance']>) => void;
  updateAccessibilityConfig: (updates: Partial<CanvasConfig['accessibility']>) => void;
  resetToDefaults: () => void;
}

const defaultCanvasConfig: CanvasConfig = {
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
    defaultZoom: 0.65,
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
  },
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: false,
    highContrast: false,
    reducedMotion: false,
  },
};

const CanvasConfigContext = createContext<CanvasConfigContextValue | null>(null);

export interface CanvasConfigProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<CanvasConfig>;
  onConfigChange?: (config: CanvasConfig) => void;
}

export const CanvasConfigProvider: React.FC<CanvasConfigProviderProps> = ({
  children,
  initialConfig,
  onConfigChange,
}) => {
  const [config, setConfig] = React.useState<CanvasConfig>(() => ({
    ...defaultCanvasConfig,
    ...initialConfig,
  }));

  // Track config changes for debugging
  const changeCountRef = useRef(0);
  const lastChangeRef = useRef<string>('initial');

  const updateConfig = React.useCallback(
    <K extends keyof CanvasConfig>(key: K, updates: Partial<CanvasConfig[K]>) => {
      setConfig(prevConfig => {
        const currentSection = prevConfig[key];
        const newSection = { ...currentSection, ...updates };

        // Avoid updates if nothing changed
        if (equalityFunctions.mixed(currentSection, newSection)) {
          return prevConfig;
        }

        const newConfig = { ...prevConfig, [key]: newSection };

        // Track changes in development
        if (import.meta.env.DEV) {
          changeCountRef.current++;
          lastChangeRef.current = `${key}-${Date.now()}`;
          console.debug(`[CanvasConfigContext] Config updated: ${key}`, {
            changeCount: changeCountRef.current,
            lastChange: lastChangeRef.current,
            updates,
            newSection,
          });
        }

        // Notify external listeners
        if (onConfigChange) {
          onConfigChange(newConfig);
        }

        return newConfig;
      });
    },
    [onConfigChange]
  );

  const updateGridConfig = React.useCallback(
    (updates: Partial<GridConfig>) => {
      updateConfig('grid', updates);
    },
    [updateConfig]
  );

  const updateThemeConfig = React.useCallback(
    (updates: Partial<ThemeConfig>) => {
      updateConfig('theme', updates);
    },
    [updateConfig]
  );

  const updateToolConfig = React.useCallback(
    (updates: Partial<ToolConfig>) => {
      updateConfig('tools', updates);
    },
    [updateConfig]
  );

  const updateViewportConfig = React.useCallback(
    (updates: Partial<ViewportConfig>) => {
      updateConfig('viewport', updates);
    },
    [updateConfig]
  );

  const updatePerformanceConfig = React.useCallback(
    (updates: Partial<CanvasConfig['performance']>) => {
      updateConfig('performance', updates);
    },
    [updateConfig]
  );

  const updateAccessibilityConfig = React.useCallback(
    (updates: Partial<CanvasConfig['accessibility']>) => {
      updateConfig('accessibility', updates);
    },
    [updateConfig]
  );

  const resetToDefaults = React.useCallback(() => {
    setConfig(defaultCanvasConfig);
    if (import.meta.env.DEV) {
      console.debug('[CanvasConfigContext] Config reset to defaults');
    }
    if (onConfigChange) {
      onConfigChange(defaultCanvasConfig);
    }
  }, [onConfigChange]);

  // Stable context value to prevent unnecessary re-renders
  const stableValue = useStableConfig(() => ({
    config,
    updateGridConfig,
    updateThemeConfig,
    updateToolConfig,
    updateViewportConfig,
    updatePerformanceConfig,
    updateAccessibilityConfig,
    resetToDefaults,
  }), [
    config,
    updateGridConfig,
    updateThemeConfig,
    updateToolConfig,
    updateViewportConfig,
    updatePerformanceConfig,
    updateAccessibilityConfig,
    resetToDefaults,
  ]);

  return (
    <CanvasConfigContext.Provider value={stableValue}>
      {children}
    </CanvasConfigContext.Provider>
  );
};

// Main hook
export const useCanvasConfig = (): CanvasConfigContextValue => {
  const context = useContext(CanvasConfigContext);
  if (!context) {
    throw new Error('useCanvasConfig must be used within a CanvasConfigProvider');
  }
  return context;
};

// Selector hooks for specific config sections
export const useGridConfig = (): GridConfig => {
  const { config } = useCanvasConfig();
  return config.grid;
};

export const useThemeConfig = (): ThemeConfig => {
  const { config } = useCanvasConfig();
  return config.theme;
};

export const useToolConfig = (): ToolConfig => {
  const { config } = useCanvasConfig();
  return config.tools;
};

export const useViewportConfig = (): ViewportConfig => {
  const { config } = useCanvasConfig();
  return config.viewport;
};

export const usePerformanceConfig = (): CanvasConfig['performance'] => {
  const { config } = useCanvasConfig();
  return config.performance;
};

export const useAccessibilityConfig = (): CanvasConfig['accessibility'] => {
  const { config } = useCanvasConfig();
  return config.accessibility;
};

// Specific property hooks for minimal re-renders
export const useActiveTool = (): ToolConfig['activeTool'] => {
  const { tools } = useToolConfig();
  return tools.activeTool;
};

export const useThemeMode = (): ThemeConfig['mode'] => {
  const { mode } = useThemeConfig();
  return mode;
};

export const useColorScheme = (): ThemeConfig['colorScheme'] => {
  const { colorScheme } = useThemeConfig();
  return colorScheme;
};

export const useGridVisibility = (): boolean => {
  const { visible } = useGridConfig();
  return visible;
};

export const useSnapToGrid = (): boolean => {
  const { snapToGrid } = useGridConfig();
  return snapToGrid;
};

export const useVirtualizationEnabled = (): boolean => {
  const { enableVirtualization } = usePerformanceConfig();
  return enableVirtualization;
};

// Configuration updater hooks
export const useGridConfigUpdater = () => {
  const { updateGridConfig } = useCanvasConfig();
  return updateGridConfig;
};

export const useThemeConfigUpdater = () => {
  const { updateThemeConfig } = useCanvasConfig();
  return updateThemeConfig;
};

export const useToolConfigUpdater = () => {
  const { updateToolConfig } = useCanvasConfig();
  return updateToolConfig;
};

export const useViewportConfigUpdater = () => {
  const { updateViewportConfig } = useCanvasConfig();
  return updateViewportConfig;
};

// Combined hooks for common operations
export const useThemeToggle = () => {
  const { theme } = useCanvasConfig();
  const updateTheme = useThemeConfigUpdater();

  return React.useCallback(() => {
    updateTheme({
      mode: theme.mode === 'light' ? 'dark' : 'light',
    });
  }, [theme.mode, updateTheme]);
};

export const useColorSchemeToggle = () => {
  const { theme } = useCanvasConfig();
  const updateTheme = useThemeConfigUpdater();

  return React.useCallback(() => {
    updateTheme({
      colorScheme: theme.colorScheme === 'serious' ? 'playful' : 'serious',
    });
  }, [theme.colorScheme, updateTheme]);
};

export const useGridToggle = () => {
  const { grid } = useCanvasConfig();
  const updateGrid = useGridConfigUpdater();

  return React.useCallback(() => {
    updateGrid({
      visible: !grid.visible,
    });
  }, [grid.visible, updateGrid]);
};

export const useSnapToggle = () => {
  const { grid } = useCanvasConfig();
  const updateGrid = useGridConfigUpdater();

  return React.useCallback(() => {
    updateGrid({
      snapToGrid: !grid.snapToGrid,
    });
  }, [grid.snapToGrid, updateGrid]);
};

// Development tools
if (import.meta.env.DEV) {
  (window as any).__CANVAS_CONFIG_DEBUG__ = {
    getConfig: () => {
      const event = new CustomEvent('getCanvasConfig');
      window.dispatchEvent(event);
    },
    resetConfig: () => {
      const event = new CustomEvent('resetCanvasConfig');
      window.dispatchEvent(event);
    },
  };
}

export default CanvasConfigContext;