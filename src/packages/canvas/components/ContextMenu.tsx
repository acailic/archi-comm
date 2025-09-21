// src/packages/canvas/components/ContextMenu.tsx
// Isolated context menu component to prevent parent re-renders from context menu state changes
// Uses React Portal for performance isolation and efficient event handling
// RELEVANT FILES: CanvasInteractionLayer.tsx, CanvasContext.tsx

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
}

interface ContextMenuCallbacks {
  onComponentSelect: (componentId: string) => void;
  onComponentDelete: (componentId: string) => void;
  onComponentDeselect: () => void;
  onConnectionSelect: (connectionId: string) => void;
  onConnectionDelete: (connectionId: string) => void;
}

export interface ContextMenuProps {
  enabled: boolean;
  callbacks: ContextMenuCallbacks;
  onStateChange?: (state: ContextMenuState) => void;
}

export interface ContextMenuAPI {
  show: (event: React.MouseEvent, nodeId?: string, edgeId?: string) => void;
  hide: () => void;
  isVisible: boolean;
}

export const ContextMenu = forwardRef<ContextMenuAPI, ContextMenuProps>(
  ({ enabled, callbacks, onStateChange }, ref) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
    });

  const portalRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Create portal container on mount
  useEffect(() => {
    const container = document.createElement("div");
    container.id = "canvas-context-menu-portal";
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.pointerEvents = "none";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
    portalRef.current = container;

    return () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);

    const hideContextMenu = useCallback(() => {
      setContextMenu((prev) => {
        if (!prev.visible) return prev; // Guard against redundant updates
        const newState = { ...prev, visible: false };
        onStateChange?.(newState);
        return newState;
      });
    }, [onStateChange]);

    const showContextMenu = useCallback(
      (event: React.MouseEvent, nodeId?: string, edgeId?: string) => {
        if (!enabled) return;

        event.preventDefault();
        const newX = event.clientX;
        const newY = event.clientY;

        setContextMenu((prev) => {
          // Avoid setting same position multiple times
          if (
            prev.visible &&
            prev.x === newX &&
            prev.y === newY &&
            prev.nodeId === nodeId &&
            prev.edgeId === edgeId
          ) {
            return prev;
          }

          const newState = {
            visible: true,
            x: newX,
            y: newY,
            nodeId,
            edgeId,
          };

          onStateChange?.(newState);
          return newState;
        });
      },
      [enabled, onStateChange]
    );

    useEffect(() => {
      if (!contextMenu.visible) {
        return;
      }

      const clickHandler = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest(".context-menu")) {
          return;
        }
        hideContextMenu();
      };

      document.addEventListener("click", clickHandler);
      return () => document.removeEventListener("click", clickHandler);
    }, [contextMenu.visible, hideContextMenu]);

  const handleItemClick = useCallback(
    (action: () => void) => {
      action();
      hideContextMenu();
    },
    [hideContextMenu]
  );

  // Create API object for external usage
    useImperativeHandle(
      ref,
      () => ({
        show: showContextMenu,
        hide: hideContextMenu,
        isVisible: contextMenu.visible,
      }),
      [hideContextMenu, showContextMenu, contextMenu.visible]
    );

    if (!portalRef.current || !contextMenu.visible) {
      return null;
    }

    return createPortal(
      <div
        className="context-menu"
        style={{
          position: "fixed",
          top: contextMenu.y,
          left: contextMenu.x,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: 4,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          zIndex: 1000,
          padding: 8,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu.nodeId && (
          <>
            <button
              type="button"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onComponentSelect(contextMenu.nodeId!)
                )
              }
              style={{ display: "block", width: "100%", marginBottom: 4 }}
            >
              Select
            </button>
            <button
              type="button"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onComponentDelete(contextMenu.nodeId!)
                )
              }
              style={{ display: "block", width: "100%" }}
            >
              Delete
            </button>
          </>
        )}
        {contextMenu.edgeId && (
          <>
            <button
              type="button"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onConnectionSelect(contextMenu.edgeId!)
                )
              }
              style={{ display: "block", width: "100%", marginBottom: 4 }}
            >
              Select
            </button>
            <button
              type="button"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onConnectionDelete(contextMenu.edgeId!)
                )
              }
              style={{ display: "block", width: "100%" }}
            >
              Delete
            </button>
          </>
        )}
        {!contextMenu.nodeId && !contextMenu.edgeId && (
          <button
            type="button"
            onClick={() =>
              handleItemClick(() => callbacksRef.current.onComponentDeselect())
            }
            style={{ display: "block", width: "100%" }}
          >
            Clear Selection
          </button>
        )}
      </div>,
      portalRef.current
    );
  }
);

ContextMenu.displayName = "ContextMenu";

// Export types for external usage
export type { ContextMenuCallbacks, ContextMenuState };
