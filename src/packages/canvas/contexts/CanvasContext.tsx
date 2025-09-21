import { useGuardedState } from "@/lib/performance/useGuardedState";
import { ReactFlowInstance } from "@xyflow/react";
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { Connection, DesignComponent, InfoCard } from "../../../types";

export interface LayoutPositions {
  [nodeId: string]: { x: number; y: number };
}

export interface VirtualizationConfig {
  bufferZone: number;
  maxVisibleItems: number;
  enabled: boolean;
}

export interface CanvasState {
  layoutPositions: LayoutPositions;
  virtualizationConfig: VirtualizationConfig;
  selectedItems: string[];
  reactFlowInstance: ReactFlowInstance | null;
  emergencyPause: boolean;
}

export interface ComponentCallbacks {
  onComponentSelect: (componentId: string) => void;
  onComponentDeselect: () => void;
  onComponentDrop: (
    component: DesignComponent,
    position: { x: number; y: number }
  ) => void;
  onComponentPositionChange: (
    componentId: string,
    position: { x: number; y: number }
  ) => void;
  onComponentDelete: (componentId: string) => void;
}

export interface ConnectionCallbacks {
  onConnectionCreate: (connection: Connection) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionSelect: (connectionId: string) => void;
}

export interface InfoCardCallbacks {
  onInfoCardCreate: (infoCard: InfoCard) => void;
  onInfoCardUpdate: (infoCard: InfoCard) => void;
  onInfoCardDelete: (infoCardId: string) => void;
  onInfoCardSelect: (infoCardId: string) => void;
}

export interface CanvasCallbacks {
  component: ComponentCallbacks;
  connection: ConnectionCallbacks;
  infoCard: InfoCardCallbacks;
  onEmergencyPause: () => void;
  onEmergencyResume: () => void;
}

export interface CanvasContextValue {
  state: CanvasState;
  callbacks: CanvasCallbacks;
  updateLayoutPositions: (positions: LayoutPositions) => void;
  updateVirtualizationConfig: (config: Partial<VirtualizationConfig>) => void;
  updateSelectedItems: (items: string[]) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  setEmergencyPause: (paused: boolean) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export interface CanvasContextProviderProps {
  children: ReactNode;
  initialState: CanvasState;
  callbacks: CanvasCallbacks;
}

export const CanvasContextProvider: React.FC<CanvasContextProviderProps> = ({
  children,
  initialState,
  callbacks,
}) => {
  const [state, setState] = useGuardedState<CanvasState>(initialState, {
    componentName: "CanvasContext",
    maxUpdatesPerTick: 25,
  });

  // Shallow comparator utility
  const shallowEqual = React.useCallback((a: any, b: any) => {
    if (a === b) return true;
    if (
      typeof a !== "object" ||
      typeof b !== "object" ||
      a == null ||
      b == null
    ) {
      return false;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => a[key] === b[key]);
  }, []);

  // Targeted useEffects for specific state updates (DO NOT overwrite layoutPositions and reactFlowInstance)
  React.useEffect(() => {
    if (!shallowEqual(state.selectedItems, initialState.selectedItems)) {
      setState((prev) => ({
        ...prev,
        selectedItems: initialState.selectedItems,
      }));
    }
  }, [initialState.selectedItems, state.selectedItems, shallowEqual]);

  React.useEffect(() => {
    if (
      !shallowEqual(
        state.virtualizationConfig,
        initialState.virtualizationConfig
      )
    ) {
      setState((prev) => ({
        ...prev,
        virtualizationConfig: initialState.virtualizationConfig,
      }));
    }
  }, [
    initialState.virtualizationConfig,
    state.virtualizationConfig,
    shallowEqual,
  ]);

  React.useEffect(() => {
    if (state.emergencyPause !== initialState.emergencyPause) {
      setState((prev) => ({
        ...prev,
        emergencyPause: initialState.emergencyPause,
      }));
    }
  }, [initialState.emergencyPause, state.emergencyPause]);

  // Memoize callbacks to prevent unnecessary context value recreation
  const memoizedCallbacks = useMemo(() => {
    // Shallow comparison to detect actual callback changes vs object reference changes
    return callbacks;
  }, [
    callbacks.component.onComponentSelect,
    callbacks.component.onComponentDeselect,
    callbacks.component.onComponentDrop,
    callbacks.component.onComponentPositionChange,
    callbacks.component.onComponentDelete,
    callbacks.connection.onConnectionCreate,
    callbacks.connection.onConnectionDelete,
    callbacks.connection.onConnectionSelect,
    callbacks.infoCard.onInfoCardCreate,
    callbacks.infoCard.onInfoCardUpdate,
    callbacks.infoCard.onInfoCardDelete,
    callbacks.infoCard.onInfoCardSelect,
    callbacks.onEmergencyPause,
    callbacks.onEmergencyResume,
  ]);

  const updateLayoutPositions = React.useCallback(
    (positions: LayoutPositions) => {
      setState((prev) => {
        // Avoid update if positions haven't actually changed
        if (shallowEqual(prev.layoutPositions, positions)) {
          return prev;
        }
        return { ...prev, layoutPositions: positions };
      });
    },
    [shallowEqual]
  );

  const updateVirtualizationConfig = React.useCallback(
    (config: Partial<VirtualizationConfig>) => {
      setState((prev) => {
        const newConfig = { ...prev.virtualizationConfig, ...config };
        // Avoid update if config hasn't actually changed
        if (shallowEqual(prev.virtualizationConfig, newConfig)) {
          return prev;
        }
        return { ...prev, virtualizationConfig: newConfig };
      });
    },
    [shallowEqual]
  );

  const updateSelectedItems = React.useCallback((items: string[]) => {
    setState((prev) => {
      // Avoid update if items array is identical
      if (
        prev.selectedItems.length === items.length &&
        prev.selectedItems.every((item, index) => item === items[index])
      ) {
        return prev;
      }
      return { ...prev, selectedItems: items };
    });
  }, []);

  const setReactFlowInstance = React.useCallback(
    (instance: ReactFlowInstance | null) => {
      setState((prev) => {
        // Avoid update if instance hasn't changed
        if (prev.reactFlowInstance === instance) {
          return prev;
        }
        return { ...prev, reactFlowInstance: instance };
      });
    },
    []
  );

  const setEmergencyPause = React.useCallback((paused: boolean) => {
    setState((prev) => {
      // Avoid update if pause state hasn't changed
      if (prev.emergencyPause === paused) {
        return prev;
      }
      return { ...prev, emergencyPause: paused };
    });
  }, []);

  const contextValue = useMemo<CanvasContextValue>(
    () => ({
      state,
      callbacks: memoizedCallbacks,
      updateLayoutPositions,
      updateVirtualizationConfig,
      updateSelectedItems,
      setReactFlowInstance,
      setEmergencyPause,
    }),
    [
      state,
      memoizedCallbacks,
      updateLayoutPositions,
      updateVirtualizationConfig,
      updateSelectedItems,
      setReactFlowInstance,
      setEmergencyPause,
    ]
  );

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = (): CanvasContextValue => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error(
      "useCanvasContext must be used within a CanvasContextProvider"
    );
  }
  return context;
};

export const useCanvasState = (): CanvasState => {
  const { state } = useCanvasContext();
  return state;
};

export const useCanvasCallbacks = (): CanvasCallbacks => {
  const { callbacks } = useCanvasContext();
  return callbacks;
};
