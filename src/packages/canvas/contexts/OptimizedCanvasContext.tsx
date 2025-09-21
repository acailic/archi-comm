/**
 * Enhanced Optimized Canvas Context with split providers for better performance
 * Splits large context into focused providers to prevent unnecessary re-renders
 * Integrates with new performance infrastructure and enhanced callback management
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { ReactFlowInstance } from '@xyflow/react';
import { useGuardedState } from '@/lib/performance/useGuardedState';
import { equalityFunctions } from '@/shared/utils/memoization';
import { useStableCallbacks } from '@/shared/hooks/common/useStableCallbacks';
import { useIntelligentCallbacks, useContextAwareCallbacks } from '@/shared/hooks/useEnhancedCallbacks';
import { useStableConfig, useStableActions } from '@/shared/hooks/useStableLiterals';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';
import type { Connection, DesignComponent, InfoCard } from '../../../types';

// Split state into focused contexts for better performance

// Canvas State Context - for layout and configuration
export interface CanvasStateContextValue {
  layoutPositions: Record<string, { x: number; y: number }>;
  virtualizationConfig: {
    bufferZone: number;
    maxVisibleItems: number;
    enabled: boolean;
  };
  emergencyPause: boolean;
  reactFlowInstance: ReactFlowInstance | null;
  performance: {
    renderCount: number;
    lastRenderTime: number;
    averageRenderTime: number;
  };
}

// Selection Context - for selected items (changes frequently)
export interface SelectionContextValue {
  selectedItems: string[];
  hoveredItems: string[];
  editingItems: string[];
  updateSelectedItems: (items: string[]) => void;
  updateHoveredItems: (items: string[]) => void;
  updateEditingItems: (items: string[]) => void;
}

// Canvas Actions Context - for stable actions
export interface CanvasActionsContextValue {
  updateLayoutPositions: (positions: Record<string, { x: number; y: number }>) => void;
  updateVirtualizationConfig: (config: Partial<CanvasStateContextValue['virtualizationConfig']>) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  setEmergencyPause: (paused: boolean) => void;
  updatePerformanceMetrics: (metrics: Partial<CanvasStateContextValue['performance']>) => void;
  batchUpdates: (updates: Array<() => void>) => void;
}

// Callback Contexts - split by domain
export interface ComponentCallbacksContextValue {
  onComponentSelect: (componentId: string) => void;
  onComponentDeselect: () => void;
  onComponentDrop: (component: DesignComponent, position: { x: number; y: number }) => void;
  onComponentPositionChange: (componentId: string, position: { x: number; y: number }) => void;
  onComponentDelete: (componentId: string) => void;
}

export interface ConnectionCallbacksContextValue {
  onConnectionCreate: (connection: Connection) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionSelect: (connectionId: string) => void;
}

export interface InfoCardCallbacksContextValue {
  onInfoCardCreate: (infoCard: InfoCard) => void;
  onInfoCardUpdate: (infoCard: InfoCard) => void;
  onInfoCardDelete: (infoCardId: string) => void;
  onInfoCardSelect: (infoCardId: string) => void;
}

// Create contexts
const CanvasStateContext = createContext<CanvasStateContextValue | null>(null);
const SelectionContext = createContext<SelectionContextValue | null>(null);
const CanvasActionsContext = createContext<CanvasActionsContextValue | null>(null);
const ComponentCallbacksContext = createContext<ComponentCallbacksContextValue | null>(null);
const ConnectionCallbacksContext = createContext<ConnectionCallbacksContextValue | null>(null);
const InfoCardCallbacksContext = createContext<InfoCardCallbacksContextValue | null>(null);

// Enhanced Canvas State Provider with performance tracking
export const CanvasStateProvider: React.FC<{
  children: React.ReactNode;
  initialState: CanvasStateContextValue;
}> = ({ children, initialState }) => {
  const [state, setState] = useGuardedState(initialState, {
    componentName: 'CanvasStateProvider',
    maxUpdatesPerTick: 20,
  });

  // Performance tracking
  const performanceRef = React.useRef({
    renderCount: 0,
    renderTimes: [] as number[],
  });

  // Track render performance
  React.useLayoutEffect(() => {
    const now = performance.now();
    performanceRef.current.renderCount++;
    performanceRef.current.renderTimes.push(now);

    // Keep only last 10 render times
    if (performanceRef.current.renderTimes.length > 10) {
      performanceRef.current.renderTimes.shift();
    }

    // Update performance state if needed
    const avgRenderTime = performanceRef.current.renderTimes.length > 1
      ? (performanceRef.current.renderTimes[performanceRef.current.renderTimes.length - 1] -
         performanceRef.current.renderTimes[0]) / (performanceRef.current.renderTimes.length - 1)
      : 0;

    setState(prev => ({
      ...prev,
      performance: {
        renderCount: performanceRef.current.renderCount,
        lastRenderTime: now,
        averageRenderTime: avgRenderTime,
      }
    }));
  });

  const updateLayoutPositions = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      setState(prev => {
        if (equalityFunctions.mixed(prev.layoutPositions, positions)) {
          return prev;
        }
        return { ...prev, layoutPositions: positions };
      });
    },
    []
  );

  const updateVirtualizationConfig = React.useCallback(
    (config: Partial<CanvasStateContextValue['virtualizationConfig']>) => {
      setState(prev => {
        const newConfig = { ...prev.virtualizationConfig, ...config };
        if (equalityFunctions.mixed(prev.virtualizationConfig, newConfig)) {
          return prev;
        }
        return { ...prev, virtualizationConfig: newConfig };
      });
    },
    []
  );

  const setReactFlowInstance = React.useCallback(
    (instance: ReactFlowInstance | null) => {
      setState(prev => {
        if (prev.reactFlowInstance === instance) {
          return prev;
        }
        return { ...prev, reactFlowInstance: instance };
      });
    },
    []
  );

  const setEmergencyPause = React.useCallback((paused: boolean) => {
    setState(prev => {
      if (prev.emergencyPause === paused) {
        return prev;
      }
      return { ...prev, emergencyPause: paused };
    });
  }, []);

  const updatePerformanceMetrics = useCallback((metrics: Partial<CanvasStateContextValue['performance']>) => {
    setState(prev => ({
      ...prev,
      performance: { ...prev.performance, ...metrics }
    }));
  }, []);

  const batchUpdates = useCallback((updates: Array<() => void>) => {
    unstable_batchedUpdates(() => {
      updates.forEach(update => update());
    });
  }, []);

  const stableState = useStableConfig(() => state, [state]);
  const stableActions = useStableActions(() => ({
    updateLayoutPositions,
    updateVirtualizationConfig,
    setReactFlowInstance,
    setEmergencyPause,
    updatePerformanceMetrics,
    batchUpdates,
  }), [updateLayoutPositions, updateVirtualizationConfig, setReactFlowInstance, setEmergencyPause, updatePerformanceMetrics, batchUpdates]);

  return (
    <CanvasStateContext.Provider value={stableState}>
      <CanvasActionsContext.Provider value={stableActions}>
        {children}
      </CanvasActionsContext.Provider>
    </CanvasStateContext.Provider>
  );
};

// Enhanced Selection Provider with hover and editing state
export const SelectionProvider: React.FC<{
  children: React.ReactNode;
  initialSelected: string[];
  initialHovered?: string[];
  initialEditing?: string[];
}> = ({ children, initialSelected, initialHovered = [], initialEditing = [] }) => {
  const [selectedItems, setSelectedItems] = useGuardedState(initialSelected, {
    componentName: 'SelectionProvider',
    maxUpdatesPerTick: 30, // Higher limit for selection changes
  });

  const [hoveredItems, setHoveredItems] = useGuardedState(initialHovered, {
    componentName: 'SelectionProvider:hover',
    maxUpdatesPerTick: 50, // Very high for hover interactions
  });

  const [editingItems, setEditingItems] = useGuardedState(initialEditing, {
    componentName: 'SelectionProvider:editing',
    maxUpdatesPerTick: 20,
  });

  const updateSelectedItems = useCallback((items: string[]) => {
    setSelectedItems(prev => {
      if (prev.length === items.length && prev.every((item, index) => item === items[index])) {
        return prev;
      }
      return items;
    });
  }, []);

  const updateHoveredItems = useCallback((items: string[]) => {
    setHoveredItems(prev => {
      if (prev.length === items.length && prev.every((item, index) => item === items[index])) {
        return prev;
      }
      return items;
    });
  }, []);

  const updateEditingItems = useCallback((items: string[]) => {
    setEditingItems(prev => {
      if (prev.length === items.length && prev.every((item, index) => item === items[index])) {
        return prev;
      }
      return items;
    });
  }, []);

  const stableValue = useStableConfig(() => ({
    selectedItems,
    hoveredItems,
    editingItems,
    updateSelectedItems,
    updateHoveredItems,
    updateEditingItems,
  }), [selectedItems, hoveredItems, editingItems, updateSelectedItems, updateHoveredItems, updateEditingItems]);

  return (
    <SelectionContext.Provider value={stableValue}>
      {children}
    </SelectionContext.Provider>
  );
};

// Enhanced Callback Providers with intelligent optimization
export const ComponentCallbacksProvider: React.FC<{
  children: React.ReactNode;
  callbacks: ComponentCallbacksContextValue;
}> = ({ children, callbacks }) => {
  const intelligentCallbacks = useIntelligentCallbacks(callbacks, {
    autoOptimize: true,
    trackPerformance: true,
    componentName: 'ComponentCallbacks',
  });

  const contextAwareCallbacks = useContextAwareCallbacks(intelligentCallbacks, []);

  return (
    <ComponentCallbacksContext.Provider value={contextAwareCallbacks}>
      {children}
    </ComponentCallbacksContext.Provider>
  );
};

export const ConnectionCallbacksProvider: React.FC<{
  children: React.ReactNode;
  callbacks: ConnectionCallbacksContextValue;
}> = ({ children, callbacks }) => {
  const intelligentCallbacks = useIntelligentCallbacks(callbacks, {
    autoOptimize: true,
    trackPerformance: true,
    componentName: 'ConnectionCallbacks',
  });

  return (
    <ConnectionCallbacksContext.Provider value={intelligentCallbacks}>
      {children}
    </ConnectionCallbacksContext.Provider>
  );
};

export const InfoCardCallbacksProvider: React.FC<{
  children: React.ReactNode;
  callbacks: InfoCardCallbacksContextValue;
}> = ({ children, callbacks }) => {
  const intelligentCallbacks = useIntelligentCallbacks(callbacks, {
    autoOptimize: true,
    trackPerformance: true,
    componentName: 'InfoCardCallbacks',
  });

  return (
    <InfoCardCallbacksContext.Provider value={intelligentCallbacks}>
      {children}
    </InfoCardCallbacksContext.Provider>
  );
};

// Composite Provider for convenience
export const OptimizedCanvasProvider: React.FC<{
  children: React.ReactNode;
  initialState: CanvasStateContextValue;
  initialSelected: string[];
  componentCallbacks: ComponentCallbacksContextValue;
  connectionCallbacks: ConnectionCallbacksContextValue;
  infoCardCallbacks: InfoCardCallbacksContextValue;
}> = ({
  children,
  initialState,
  initialSelected,
  componentCallbacks,
  connectionCallbacks,
  infoCardCallbacks
}) => {
  return (
    <CanvasStateProvider initialState={initialState}>
      <SelectionProvider initialSelected={initialSelected}>
        <ComponentCallbacksProvider callbacks={componentCallbacks}>
          <ConnectionCallbacksProvider callbacks={connectionCallbacks}>
            <InfoCardCallbacksProvider callbacks={infoCardCallbacks}>
              {children}
            </InfoCardCallbacksProvider>
          </ConnectionCallbacksProvider>
        </ComponentCallbacksProvider>
      </SelectionProvider>
    </CanvasStateProvider>
  );
};

// Optimized hooks with selector patterns
export const useCanvasState = (): CanvasStateContextValue => {
  const context = useContext(CanvasStateContext);
  if (!context) {
    throw new Error('useCanvasState must be used within a CanvasStateProvider');
  }
  return context;
};

export const useCanvasActions = (): CanvasActionsContextValue => {
  const context = useContext(CanvasActionsContext);
  if (!context) {
    throw new Error('useCanvasActions must be used within a CanvasStateProvider');
  }
  return context;
};

export const useSelection = (): SelectionContextValue => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};

export const useComponentCallbacks = (): ComponentCallbacksContextValue => {
  const context = useContext(ComponentCallbacksContext);
  if (!context) {
    throw new Error('useComponentCallbacks must be used within a ComponentCallbacksProvider');
  }
  return context;
};

export const useConnectionCallbacks = (): ConnectionCallbacksContextValue => {
  const context = useContext(ConnectionCallbacksContext);
  if (!context) {
    throw new Error('useConnectionCallbacks must be used within a ConnectionCallbacksProvider');
  }
  return context;
};

export const useInfoCardCallbacks = (): InfoCardCallbacksContextValue => {
  const context = useContext(InfoCardCallbacksContext);
  if (!context) {
    throw new Error('useInfoCardCallbacks must be used within a InfoCardCallbacksProvider');
  }
  return context;
};

// Selector hooks for specific state slices
export const useLayoutPositions = (): Record<string, { x: number; y: number }> => {
  const { layoutPositions } = useCanvasState();
  return layoutPositions;
};

export const useVirtualizationConfig = (): CanvasStateContextValue['virtualizationConfig'] => {
  const { virtualizationConfig } = useCanvasState();
  return virtualizationConfig;
};

export const useEmergencyPause = (): boolean => {
  const { emergencyPause } = useCanvasState();
  return emergencyPause;
};

export const useReactFlowInstance = (): ReactFlowInstance | null => {
  const { reactFlowInstance } = useCanvasState();
  return reactFlowInstance;
};

export const useSelectedItems = (): string[] => {
  const { selectedItems } = useSelection();
  return selectedItems;
};

// Compatibility hooks for existing CanvasContext users
export const useCanvasContext = () => {
  const state = useCanvasState();
  const actions = useCanvasActions();
  const selection = useSelection();
  const componentCallbacks = useComponentCallbacks();
  const connectionCallbacks = useConnectionCallbacks();
  const infoCardCallbacks = useInfoCardCallbacks();

  return useMemo(() => ({
    state: {
      layoutPositions: state.layoutPositions,
      virtualizationConfig: state.virtualizationConfig,
      selectedItems: selection.selectedItems,
      reactFlowInstance: state.reactFlowInstance,
      emergencyPause: state.emergencyPause,
    },
    callbacks: {
      component: componentCallbacks,
      connection: connectionCallbacks,
      infoCard: infoCardCallbacks,
      onEmergencyPause: () => actions.setEmergencyPause(true),
      onEmergencyResume: () => actions.setEmergencyPause(false),
    },
    updateLayoutPositions: actions.updateLayoutPositions,
    updateVirtualizationConfig: actions.updateVirtualizationConfig,
    updateSelectedItems: selection.updateSelectedItems,
    setReactFlowInstance: actions.setReactFlowInstance,
    setEmergencyPause: actions.setEmergencyPause,
  }), [state, selection, actions, componentCallbacks, connectionCallbacks, infoCardCallbacks]);
};

// Additional compatibility hooks
export const useCanvasCallbacks = () => {
  const componentCallbacks = useComponentCallbacks();
  const connectionCallbacks = useConnectionCallbacks();
  const infoCardCallbacks = useInfoCardCallbacks();
  const actions = useCanvasActions();

  return useMemo(() => ({
    component: componentCallbacks,
    connection: connectionCallbacks,
    infoCard: infoCardCallbacks,
    onEmergencyPause: () => actions.setEmergencyPause(true),
    onEmergencyResume: () => actions.setEmergencyPause(false),
  }), [componentCallbacks, connectionCallbacks, infoCardCallbacks, actions]);
};

// Performance monitoring for context usage
if (import.meta.env.DEV) {
  (window as any).__CANVAS_CONTEXT_DEBUG__ = {
    getProviderCount: () => document.querySelectorAll('[data-canvas-provider]').length,
    getConsumerCount: () => document.querySelectorAll('[data-canvas-consumer]').length,
  };
}
