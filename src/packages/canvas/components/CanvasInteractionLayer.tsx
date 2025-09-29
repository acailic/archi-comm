import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RenderGuardPresets,
  useRenderGuard,
} from '@/lib/performance/RenderGuard';
import type { DesignComponent } from '../../../types';
import { useCanvasContext } from '../contexts/CanvasContext';
import {
  ContextMenu,
  ContextMenuAPI,
  ContextMenuCallbacks,
  ContextMenuState,
} from './ContextMenu';

export interface CanvasInteractionLayerProps {
  enableDragDrop?: boolean;
  enableContextMenu?: boolean;
  enableKeyboardShortcuts?: boolean;
  children: React.ReactNode;
}

interface KeyboardShortcuts {
  [key: string]: (event: KeyboardEvent) => void;
}

const CanvasInteractionLayerComponent: React.FC<CanvasInteractionLayerProps> = ({
  enableDragDrop = true,
  enableContextMenu = true,
  enableKeyboardShortcuts = true,
  children,
}) => {
  const { state, callbacks } = useCanvasContext();
  const { selectedItems, reactFlowInstance } = state;
  const { component: componentCallbacks, connection: connectionCallbacks } = callbacks;

  const contextMenuRef = useRef<ContextMenuAPI | null>(null);
  const contextMenuStateRef = useRef<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [draggedComponent, setDraggedComponent] = useState<DesignComponent | null>(null);

  const renderGuardHandle = useRenderGuard('ReactFlowCanvas.Interactions', {
    ...RenderGuardPresets.canvasLayers.InteractionLayer,
    context: () => ({
      enableDragDrop,
      enableContextMenu,
      enableKeyboardShortcuts,
      selectedItems: selectedItems.length,
      contextMenuVisible: contextMenuStateRef.current.visible,
    }),
  });

  const {
    shouldPause,
    circuitBreakerActive,
    lastSyntheticError,
    renderCount,
    reset,
  } = renderGuardHandle;

  useEffect(() => {
    if (!shouldPause || !import.meta.env.DEV) {
      return;
    }

    console.warn('[CanvasInteractionLayer] Render guard pause engaged', {
      renderCount,
      circuitBreakerActive,
      error: lastSyntheticError?.message,
    });
  }, [shouldPause, circuitBreakerActive, lastSyntheticError, renderCount]);

  const contextMenuCallbacks = useMemo<ContextMenuCallbacks>(
    () => ({
      onComponentSelect: componentCallbacks.onComponentSelect,
      onComponentDelete: componentCallbacks.onComponentDelete,
      onComponentDeselect: componentCallbacks.onComponentDeselect,
      onConnectionSelect: connectionCallbacks.onConnectionSelect,
      onConnectionDelete: connectionCallbacks.onConnectionDelete,
    }),
    [componentCallbacks, connectionCallbacks]
  );

  const handleContextMenuStateChange = useCallback((nextState: ContextMenuState) => {
    contextMenuStateRef.current = nextState;
  }, []);

  const hideContextMenu = useCallback(() => {
    contextMenuRef.current?.hide();
  }, []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, nodeId?: string, edgeId?: string) => {
      if (!enableContextMenu) return;
      contextMenuRef.current?.show(event, nodeId, edgeId);
    },
    [enableContextMenu]
  );

  const resolveDraggedComponent = useCallback(
    (event: React.DragEvent): DesignComponent | null => {
      if (draggedComponent) {
        return draggedComponent;
      }

      const payload = event.dataTransfer.getData('application/json');
      if (!payload) {
        return null;
      }

      try {
        return JSON.parse(payload) as DesignComponent;
      } catch {
        return null;
      }
    },
    [draggedComponent]
  );

  const handleComponentDrop = useCallback(
    (event: React.DragEvent) => {
      if (!enableDragDrop || !reactFlowInstance) return;

      event.preventDefault();

      const component = resolveDraggedComponent(event);
      if (!component) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      componentCallbacks.onComponentDrop(component, position);
      setDraggedComponent(null);
    },
    [
      componentCallbacks,
      enableDragDrop,
      reactFlowInstance,
      resolveDraggedComponent,
    ]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!enableDragDrop) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [enableDragDrop]
  );

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      hideContextMenu();

      if (!event.defaultPrevented) {
        componentCallbacks.onComponentDeselect();
      }
    },
    [componentCallbacks, hideContextMenu]
  );

  const keyboardShortcuts = useMemo<KeyboardShortcuts>(
    () => ({
      Delete: () => {
        selectedItems.forEach((itemId) => {
          if (itemId.includes('-')) {
            connectionCallbacks.onConnectionDelete(itemId);
          } else {
            componentCallbacks.onComponentDelete(itemId);
          }
        });
      },
      Escape: () => {
        componentCallbacks.onComponentDeselect();
        hideContextMenu();
      },
      KeyA: (event) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
        }
      },
    }),
    [componentCallbacks, connectionCallbacks, hideContextMenu, selectedItems]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enableKeyboardShortcuts) return;

      const key = event.code === 'Delete' ? 'Delete' : event.code;
      const shortcut = keyboardShortcuts[key];

      if (shortcut) {
        shortcut(event);
      }
    },
    [enableKeyboardShortcuts, keyboardShortcuts]
  );

  const keyDownHandlerRef = useRef(handleKeyDown);
  useEffect(() => {
    keyDownHandlerRef.current = handleKeyDown;
  }, [handleKeyDown]);

  useEffect(() => {
    if (!enableKeyboardShortcuts) {
      return;
    }

    const keyHandler = (event: KeyboardEvent) => keyDownHandlerRef.current(event);
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [enableKeyboardShortcuts]);

  const enhancedChildren = useMemo(() => {
    if (!children) {
      return children;
    }

    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      return React.cloneElement(child, {
        onPaneClick: handlePaneClick,
        onDrop: handleComponentDrop,
        onDragOver: handleDragOver,
        onPaneContextMenu: (event: React.MouseEvent) => handleContextMenu(event),
        onNodeContextMenu: (event: React.MouseEvent, node: any) =>
          handleContextMenu(event, node.id),
        onEdgeContextMenu: (event: React.MouseEvent, edge: any) =>
          handleContextMenu(event, undefined, edge.id),
        onDragStart: (event: React.DragEvent) => {
          const payload = event.dataTransfer.getData('application/json');
          if (payload) {
            try {
              setDraggedComponent(JSON.parse(payload) as DesignComponent);
              return;
            } catch {
              // Ignore malformed payloads and fall back to resolver
            }
          }
          setDraggedComponent(null);
        },
      });
    });
  }, [
    children,
    handleComponentDrop,
    handleContextMenu,
    handleDragOver,
    handlePaneClick,
  ]);

  const pauseMessage = useMemo(() => {
    if (!shouldPause) {
      return null;
    }

    if (lastSyntheticError) {
      return lastSyntheticError.message;
    }

    if (circuitBreakerActive) {
      return 'Interaction layer cooling down after rapid updates.';
    }

    return 'Interaction layer paused to prevent a render loop.';
  }, [shouldPause, lastSyntheticError, circuitBreakerActive]);

  if (shouldPause) {
    return (
      <div className="interaction-layer-paused">
        <p>{pauseMessage}</p>
        <button type="button" onClick={reset}>
          Resume interactions
        </button>
      </div>
    );
  }

  return (
    <div className="canvas-interaction-layer">
      {enhancedChildren}

      <ContextMenu
        ref={contextMenuRef}
        enabled={enableContextMenu}
        callbacks={contextMenuCallbacks}
        onStateChange={handleContextMenuStateChange}
      />
    </div>
  );
};

export const CanvasInteractionLayer = memo(CanvasInteractionLayerComponent);
