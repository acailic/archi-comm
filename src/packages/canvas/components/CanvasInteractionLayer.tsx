import React, { useState, useCallback, useEffect } from 'react';
import { useRenderGuard, RenderGuardPresets } from '../../../lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '../../../lib/performance/InfiniteLoopDetector';
import { useCanvasContext } from '../contexts/CanvasContext';
import { DesignComponent } from '../../../types';

export interface CanvasInteractionLayerProps {
  enableDragDrop?: boolean;
  enableContextMenu?: boolean;
  enableKeyboardShortcuts?: boolean;
  children: React.ReactNode;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
}

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export const CanvasInteractionLayer: React.FC<CanvasInteractionLayerProps> = ({
  enableDragDrop = true,
  enableContextMenu = true,
  enableKeyboardShortcuts = true,
  children,
}) => {
  const renderGuard = useRenderGuard('ReactFlowCanvas.Interactions', RenderGuardPresets.canvasLayers.InteractionLayer);

  const { state, callbacks } = useCanvasContext();
  const { selectedItems, reactFlowInstance } = state;
  const { component: componentCallbacks, connection: connectionCallbacks } = callbacks;

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [draggedComponent, setDraggedComponent] = useState<DesignComponent | null>(null);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent, nodeId?: string, edgeId?: string) => {
    if (!enableContextMenu) return;

    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId,
      edgeId,
    });
  }, [enableContextMenu]);

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (contextMenu.visible) {
      hideContextMenu();
    }

    if (!event.defaultPrevented) {
      componentCallbacks.onComponentDeselect();
    }
  }, [contextMenu.visible, hideContextMenu, componentCallbacks]);

  const handleComponentDrop = useCallback((event: React.DragEvent) => {
    if (!enableDragDrop || !draggedComponent || !reactFlowInstance) return;

    event.preventDefault();

    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    componentCallbacks.onComponentDrop(draggedComponent, position);
    setDraggedComponent(null);
  }, [enableDragDrop, draggedComponent, reactFlowInstance, componentCallbacks]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!enableDragDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [enableDragDrop]);

  const keyboardShortcuts = React.useMemo<KeyboardShortcuts>(() => ({
    'Delete': () => {
      selectedItems.forEach(itemId => {
        if (itemId.includes('-')) {
          connectionCallbacks.onConnectionDelete(itemId);
        } else {
          componentCallbacks.onComponentDelete(itemId);
        }
      });
    },
    'Escape': () => {
      componentCallbacks.onComponentDeselect();
      hideContextMenu();
    },
    'KeyA': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    },
  }), [selectedItems, connectionCallbacks, componentCallbacks, hideContextMenu]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return;

    const key = event.code === 'Delete' ? 'Delete' : event.code;
    const shortcut = keyboardShortcuts[key];

    if (shortcut) {
      shortcut(event);
    }
  }, [enableKeyboardShortcuts, keyboardShortcuts]);

  useEffect(() => {
    if (enableKeyboardShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enableKeyboardShortcuts, handleKeyDown]);

  useEffect(() => {
    document.addEventListener('click', hideContextMenu);
    return () => document.removeEventListener('click', hideContextMenu);
  }, [hideContextMenu]);

  useEffect(() => {
    const propsData = {
      enableDragDrop,
      enableContextMenu,
      enableKeyboardShortcuts,
      selectedItemsCount: selectedItems.length,
      contextMenuVisible: contextMenu.visible,
    };

    InfiniteLoopDetector.recordRender('ReactFlowCanvas.Interactions', {
      componentName: 'CanvasInteractionLayer',
      propsHash: JSON.stringify(propsData),
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
    });
  }, [
    enableDragDrop,
    enableContextMenu,
    enableKeyboardShortcuts,
    selectedItems.length,
    contextMenu.visible,
    renderGuard.renderCount,
  ]);

  const enhancedChildren = React.useMemo(() => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          onPaneClick: handlePaneClick,
          onDrop: handleComponentDrop,
          onDragOver: handleDragOver,
          onPaneContextMenu: (event: React.MouseEvent) => handleContextMenu(event),
          onNodeContextMenu: (event: React.MouseEvent, node: any) => handleContextMenu(event, node.id),
          onEdgeContextMenu: (event: React.MouseEvent, edge: any) => handleContextMenu(event, undefined, edge.id),
        });
      }
      return child;
    });
  }, [children, handlePaneClick, handleComponentDrop, handleDragOver, handleContextMenu]);

  if (renderGuard.shouldPause) {
    return (
      <div className="interaction-layer-paused">
        <p>Interaction layer paused due to render loop detection</p>
      </div>
    );
  }

  return (
    <div className="canvas-interaction-layer">
      {enhancedChildren}

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            padding: 8,
          }}
        >
          {contextMenu.nodeId && (
            <>
              <button onClick={() => componentCallbacks.onComponentSelect(contextMenu.nodeId!)}>
                Select
              </button>
              <button onClick={() => componentCallbacks.onComponentDelete(contextMenu.nodeId!)}>
                Delete
              </button>
            </>
          )}
          {contextMenu.edgeId && (
            <>
              <button onClick={() => connectionCallbacks.onConnectionSelect(contextMenu.edgeId!)}>
                Select
              </button>
              <button onClick={() => connectionCallbacks.onConnectionDelete(contextMenu.edgeId!)}>
                Delete
              </button>
            </>
          )}
          {!contextMenu.nodeId && !contextMenu.edgeId && (
            <button onClick={() => componentCallbacks.onComponentDeselect()}>
              Clear Selection
            </button>
          )}
        </div>
      )}
    </div>
  );
};