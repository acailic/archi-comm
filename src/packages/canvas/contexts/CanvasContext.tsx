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
  const [state, setState] = React.useState<CanvasState>(initialState);

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

  React.useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const updateLayoutPositions = React.useCallback(
    (positions: LayoutPositions) => {
      setState((prev) => {
        // Avoid update if positions haven't actually changed
        if (
          JSON.stringify(prev.layoutPositions) === JSON.stringify(positions)
        ) {
          return prev;
        }
        return { ...prev, layoutPositions: positions };
      });
    },
    []
  );

  const updateVirtualizationConfig = React.useCallback(
    (config: Partial<VirtualizationConfig>) => {
      setState((prev) => {
        const newConfig = { ...prev.virtualizationConfig, ...config };
        // Avoid update if config hasn't actually changed
        if (
          JSON.stringify(prev.virtualizationConfig) ===
          JSON.stringify(newConfig)
        ) {
          return prev;
        }
        return { ...prev, virtualizationConfig: newConfig };
      });
    },
    []
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
