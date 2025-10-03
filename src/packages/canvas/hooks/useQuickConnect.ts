/**
 * File: src/packages/canvas/hooks/useQuickConnect.ts
 * Purpose: Hook for quick-connect mode - click-click connection creation
 * Why: Provides faster connection workflow for power users
 * Related: src/stores/canvasStore.ts, connection-validation.ts, QuickConnectOverlay.tsx
 */

import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import { validateConnection } from '../utils/connection-validation';
import type { Connection } from '../../../shared/contracts';

export interface UseQuickConnectResult {
  // State
  isQuickConnectMode: boolean;
  quickConnectSource: string | null;
  quickConnectPreview: { x: number; y: number } | null;

  // Actions
  startQuickConnect: (nodeId: string) => void;
  completeQuickConnect: (targetNodeId: string) => void;
  cancelQuickConnect: () => void;
  updatePreview: (position: { x: number; y: number }) => void;

  // Validation
  isValidTarget: (targetNodeId: string) => boolean;
}

/**
 * Hook for managing quick-connect mode
 * Enables click-to-select-source, click-to-connect-target workflow
 */
export function useQuickConnect(
  onConnectionCreate?: (connection: Omit<Connection, 'id'>) => void
): UseQuickConnectResult {
  const canvasMode = useCanvasStore(state => state.canvasMode);
  const quickConnectSource = useCanvasStore(state => state.quickConnectSource);
  const quickConnectPreview = useCanvasStore(state => state.quickConnectPreview);
  const components = useCanvasStore(state => state.components);
  const connections = useCanvasStore(state => state.connections);
  const defaultConnectionType = useCanvasStore(state => state.defaultConnectionType);

  const isQuickConnectMode = canvasMode === 'quick-connect';

  /**
   * Start quick-connect by selecting source node
   */
  const startQuickConnect = useCallback((nodeId: string) => {
    useCanvasStore.getState().setQuickConnectSource(nodeId);
    useCanvasStore.getState().setCanvasMode('quick-connect');
  }, []);

  /**
   * Complete quick-connect by selecting target node
   */
  const completeQuickConnect = useCallback((targetNodeId: string) => {
    if (!quickConnectSource) {
      console.warn('[useQuickConnect] No source node selected');
      return;
    }

    // Validate connection
    const validation = validateConnection(
      quickConnectSource,
      targetNodeId,
      connections,
      components
    );

    if (!validation.valid) {
      console.warn('[useQuickConnect] Invalid connection:', validation.reason);
      // Could emit an error event here for UI feedback
      return;
    }

    // Create connection
    const newConnection: Omit<Connection, 'id'> = {
      from: quickConnectSource,
      to: targetNodeId,
      type: defaultConnectionType,
      label: '',
    };

    onConnectionCreate?.(newConnection);

    // Reset quick-connect state
    cancelQuickConnect();
  }, [quickConnectSource, connections, components, defaultConnectionType, onConnectionCreate]);

  /**
   * Cancel quick-connect mode
   */
  const cancelQuickConnect = useCallback(() => {
    useCanvasStore.getState().setQuickConnectSource(null);
    useCanvasStore.getState().setQuickConnectPreview(null);
    useCanvasStore.getState().setCanvasMode('select');
  }, []);

  /**
   * Update preview line position (follows cursor)
   */
  const updatePreview = useCallback((position: { x: number; y: number }) => {
    if (isQuickConnectMode && quickConnectSource) {
      useCanvasStore.getState().setQuickConnectPreview(position);
    }
  }, [isQuickConnectMode, quickConnectSource]);

  /**
   * Check if a target node is valid for connection
   */
  const isValidTarget = useCallback((targetNodeId: string) => {
    if (!quickConnectSource || targetNodeId === quickConnectSource) {
      return false;
    }

    const validation = validateConnection(
      quickConnectSource,
      targetNodeId,
      connections,
      components
    );

    return validation.valid;
  }, [quickConnectSource, connections, components]);

  // Handle Escape key to cancel quick-connect
  useEffect(() => {
    if (!isQuickConnectMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelQuickConnect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickConnectMode, cancelQuickConnect]);

  return {
    // State
    isQuickConnectMode,
    quickConnectSource,
    quickConnectPreview,

    // Actions
    startQuickConnect,
    completeQuickConnect,
    cancelQuickConnect,
    updatePreview,

    // Validation
    isValidTarget,
  };
}
