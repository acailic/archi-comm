import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { DesignComponent, Connection, InfoCard } from '../../../types';
import { ReactFlowInstance } from '@xyflow/react';

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
  onComponentDrop: (component: DesignComponent, position: { x: number; y: number }) => void;
  onComponentPositionChange: (componentId: string, position: { x: number; y: number }) => void;
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

  React.useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const updateLayoutPositions = React.useCallback((positions: LayoutPositions) => {
    setState(prev => ({ ...prev, layoutPositions: positions }));
  }, []);

  const updateVirtualizationConfig = React.useCallback((config: Partial<VirtualizationConfig>) => {
    setState(prev => ({
      ...prev,
      virtualizationConfig: { ...prev.virtualizationConfig, ...config }
    }));
  }, []);

  const updateSelectedItems = React.useCallback((items: string[]) => {
    setState(prev => ({ ...prev, selectedItems: items }));
  }, []);

  const setReactFlowInstance = React.useCallback((instance: ReactFlowInstance | null) => {
    setState(prev => ({ ...prev, reactFlowInstance: instance }));
  }, []);

  const setEmergencyPause = React.useCallback((paused: boolean) => {
    setState(prev => ({ ...prev, emergencyPause: paused }));
  }, []);

  const contextValue = useMemo<CanvasContextValue>(() => ({
    state,
    callbacks,
    updateLayoutPositions,
    updateVirtualizationConfig,
    updateSelectedItems,
    setReactFlowInstance,
    setEmergencyPause,
  }), [
    state,
    callbacks,
    updateLayoutPositions,
    updateVirtualizationConfig,
    updateSelectedItems,
    setReactFlowInstance,
    setEmergencyPause,
  ]);

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = (): CanvasContextValue => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasContextProvider');
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