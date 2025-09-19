import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { RenderLoopDiagnostics } from "../../../lib/debug/RenderLoopDiagnostics";
import { InfiniteLoopDetector } from "../../../lib/performance/InfiniteLoopDetector";
import {
  RenderGuardPresets,
  useRenderGuard,
} from "../../../lib/performance/RenderGuard";
import {
  getCanvasCircuitBreakerSnapshot,
  subscribeToCanvasCircuitBreaker,
} from "../../../stores/canvasStore";
import { DesignComponent } from "../../../types";
import { useCanvasContext } from "../contexts/CanvasContext";

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
  [key: string]: (event: KeyboardEvent) => void;
}

const useCanvasCircuitBreakerSnapshot = () =>
  useSyncExternalStore(
    subscribeToCanvasCircuitBreaker,
    getCanvasCircuitBreakerSnapshot,
    getCanvasCircuitBreakerSnapshot
  );

const CanvasInteractionLayerComponent: React.FC<
  CanvasInteractionLayerProps
> = ({
  enableDragDrop = true,
  enableContextMenu = true,
  enableKeyboardShortcuts = true,
  children,
}) => {
  const circuitBreakerSnapshot = useCanvasCircuitBreakerSnapshot();
  const { state, callbacks } = useCanvasContext();
  const { selectedItems, reactFlowInstance } = state;
  const { component: componentCallbacks, connection: connectionCallbacks } =
    callbacks;

  // Render debugging state
  const renderCountRef = useRef(0);
  const lastPropsRef = useRef<{
    enableDragDrop: boolean;
    enableContextMenu: boolean;
    enableKeyboardShortcuts: boolean;
    selectedItemsLength: number;
    reactFlowInstanceId: string | null;
  }>({
    enableDragDrop,
    enableContextMenu,
    enableKeyboardShortcuts,
    selectedItemsLength: 0,
    reactFlowInstanceId: null,
  });
  const propChangeHistoryRef = useRef<
    Array<{
      timestamp: number;
      property: string;
      oldValue: any;
      newValue: any;
      renderCount: number;
    }>
  >([]);
  const callbackStabilityRef = useRef<
    Map<string, { refCount: number; lastRef: any; changes: number }>
  >(new Map());

  renderCountRef.current += 1;

  // Track prop changes with detailed analysis
  const currentProps = useMemo(
    () => ({
      enableDragDrop,
      enableContextMenu,
      enableKeyboardShortcuts,
      selectedItemsLength: selectedItems.length,
      reactFlowInstanceId: reactFlowInstance?.id || null,
    }),
    [
      enableDragDrop,
      enableContextMenu,
      enableKeyboardShortcuts,
      selectedItems.length,
      reactFlowInstance?.id,
    ]
  );

  const detectPropChanges = () => {
    if (process.env.NODE_ENV !== "development") return;

    const lastProps = lastPropsRef.current;
    const changes: Array<{ property: string; oldValue: any; newValue: any }> =
      [];

    Object.keys(currentProps).forEach((key) => {
      const typedKey = key as keyof typeof currentProps;
      if (lastProps[typedKey] !== currentProps[typedKey]) {
        changes.push({
          property: key,
          oldValue: lastProps[typedKey],
          newValue: currentProps[typedKey],
        });
      }
    });

    if (changes.length > 0) {
      changes.forEach((change) => {
        propChangeHistoryRef.current.push({
          timestamp: Date.now(),
          property: change.property,
          oldValue: change.oldValue,
          newValue: change.newValue,
          renderCount: renderCountRef.current,
        });
      });

      // Keep only last 20 prop changes
      if (propChangeHistoryRef.current.length > 20) {
        propChangeHistoryRef.current = propChangeHistoryRef.current.slice(-20);
      }

      console.debug("[CanvasInteractionLayer] Prop changes detected:", {
        renderCount: renderCountRef.current,
        changes,
        propChangeHistory: propChangeHistoryRef.current.slice(-5),
        timeSinceLastRender:
          propChangeHistoryRef.current.length > 1
            ? Date.now() -
              propChangeHistoryRef.current[
                propChangeHistoryRef.current.length - 2
              ].timestamp
            : 0,
      });

      RenderLoopDiagnostics.getInstance().record(
        "interaction-layer-prop-change",
        {
          componentName: "CanvasInteractionLayer",
          renderCount: renderCountRef.current,
          changes,
          propChangeHistory: propChangeHistoryRef.current.slice(-5),
        }
      );
    }

    lastPropsRef.current = { ...currentProps };
  };

  // Track callback stability
  const trackCallbackStability = (name: string, callback: any) => {
    if (process.env.NODE_ENV !== "development") return;

    const stability = callbackStabilityRef.current.get(name) || {
      refCount: 0,
      lastRef: null,
      changes: 0,
    };
    stability.refCount += 1;

    if (stability.lastRef !== callback) {
      stability.changes += 1;
      stability.lastRef = callback;

      if (stability.refCount > 1) {
        console.warn(
          `[CanvasInteractionLayer] Callback '${name}' reference changed on render #${renderCountRef.current}`,
          {
            totalChanges: stability.changes,
            refCount: stability.refCount,
            changeRate: (stability.changes / stability.refCount) * 100,
            suggestion:
              "Consider using useCallback or stable references to prevent unnecessary re-renders",
          }
        );

        RenderLoopDiagnostics.getInstance().recordStabilityWarning(
          "CanvasInteractionLayer",
          {
            callbackName: name,
            totalChanges: stability.changes,
            refCount: stability.refCount,
            changeRate: (stability.changes / stability.refCount) * 100,
          }
        );
      }
    }

    callbackStabilityRef.current.set(name, stability);
  };

  // Run prop change detection
  detectPropChanges();

  // Track callback stability for key callbacks
  trackCallbackStability(
    "componentCallbacks.onComponentDrop",
    componentCallbacks.onComponentDrop
  );
  trackCallbackStability(
    "componentCallbacks.onComponentSelect",
    componentCallbacks.onComponentSelect
  );
  trackCallbackStability(
    "componentCallbacks.onComponentDeselect",
    componentCallbacks.onComponentDeselect
  );
  trackCallbackStability(
    "connectionCallbacks.onConnectionDelete",
    connectionCallbacks.onConnectionDelete
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [draggedComponent, setDraggedComponent] =
    useState<DesignComponent | null>(null);

  const renderGuard = useRenderGuard("ReactFlowCanvas.Interactions", {
    ...RenderGuardPresets.canvasLayers.InteractionLayer,
    linkedStoreBreaker: {
      getSnapshot: () => circuitBreakerSnapshot,
      label: "CanvasStore",
    },
    context: () => ({
      enableDragDrop,
      enableContextMenu,
      enableKeyboardShortcuts,
      selectedItems: selectedItems.length,
      contextMenuVisible: contextMenu.visible,
      renderCount: renderCountRef.current,
      propChangeHistory: propChangeHistoryRef.current.slice(-3),
      callbackStability: Object.fromEntries(
        Array.from(callbackStabilityRef.current.entries()).map(
          ([name, stats]) => [
            name,
            {
              changes: stats.changes,
              refCount: stats.refCount,
              changeRate: (stats.changes / stats.refCount) * 100,
            },
          ]
        )
      ),
    }),
    propsSnapshot: () => ({
      enableDragDrop,
      enableContextMenu,
      enableKeyboardShortcuts,
      selectedItemsLength: selectedItems.length,
      reactFlowInstanceId: reactFlowInstance?.id || null,
      contextMenuVisible: contextMenu.visible,
    }),
    stateSnapshot: () => ({
      draggedComponent: draggedComponent?.id || null,
      contextMenuState: {
        visible: contextMenu.visible,
        nodeId: contextMenu.nodeId,
        edgeId: contextMenu.edgeId,
      },
    }),
  });

  const hideContextMenu = useCallback(() => {
    setContextMenu((prev) => {
      if (!prev.visible) return prev; // Guard against redundant updates
      return { ...prev, visible: false };
    });
  }, []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, nodeId?: string, edgeId?: string) => {
      if (!enableContextMenu) return;

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
        return {
          visible: true,
          x: newX,
          y: newY,
          nodeId,
          edgeId,
        };
      });
    },
    [enableContextMenu]
  );

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (contextMenu.visible) {
        hideContextMenu();
      }

      if (!event.defaultPrevented) {
        componentCallbacks.onComponentDeselect();
      }
    },
    [componentCallbacks, contextMenu.visible, hideContextMenu]
  );

  const handleComponentDrop = useCallback(
    (event: React.DragEvent) => {
      if (!enableDragDrop || !draggedComponent || !reactFlowInstance) return;

      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      componentCallbacks.onComponentDrop(draggedComponent, position);
      setDraggedComponent(null);
    },
    [componentCallbacks, draggedComponent, enableDragDrop, reactFlowInstance]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!enableDragDrop) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [enableDragDrop]
  );

  const keyboardShortcuts = useMemo<KeyboardShortcuts>(
    () => ({
      Delete: () => {
        selectedItems.forEach((itemId) => {
          if (itemId.includes("-")) {
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

      const key = event.code === "Delete" ? "Delete" : event.code;
      const shortcut = keyboardShortcuts[key];

      if (shortcut) {
        shortcut(event);
      }
    },
    [enableKeyboardShortcuts, keyboardShortcuts]
  );

  const keyDownHandlerRef = useRef(handleKeyDown);
  keyDownHandlerRef.current = handleKeyDown;

  const hideContextMenuRef = useRef(hideContextMenu);
  hideContextMenuRef.current = hideContextMenu;

  useEffect(() => {
    if (!enableKeyboardShortcuts) {
      return;
    }
    const keyHandler = (event: KeyboardEvent) =>
      keyDownHandlerRef.current(event);
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [enableKeyboardShortcuts]);

  useEffect(() => {
    const clickHandler = () => hideContextMenuRef.current();
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, []);

  // Enhanced render tracking with detailed analysis
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    // Enhanced render loop detection with more detailed context
    const renderData = {
      componentName: "CanvasInteractionLayer",
      renderCount: renderGuard.renderCount,
      timestamp: Date.now(),
      sinceFirstRenderMs: renderGuard.sinceFirstRenderMs,
      sincePreviousRenderMs: renderGuard.sincePreviousRenderMs,
      context: {
        enableDragDrop,
        enableContextMenu,
        enableKeyboardShortcuts,
        selectedItemsCount: selectedItems.length,
        contextMenuVisible: contextMenu.visible,
        draggedComponentPresent: !!draggedComponent,
        reactFlowInstanceReady: !!reactFlowInstance,
        propChangeHistory: propChangeHistoryRef.current.slice(-3),
        callbackStability: Object.fromEntries(
          Array.from(callbackStabilityRef.current.entries()).map(
            ([name, stats]) => [
              name,
              {
                changes: stats.changes,
                changeRate: (stats.changes / stats.refCount) * 100,
              },
            ]
          )
        ),
      },
      snapshotHash: JSON.stringify({
        enableDragDrop,
        enableContextMenu,
        enableKeyboardShortcuts,
        selectedItemsCount: selectedItems.length,
        contextMenuVisible: contextMenu.visible,
        draggedComponent: draggedComponent?.id,
        reactFlowInstanceId: reactFlowInstance?.id,
      }),
    };

    const detectionResult = InfiniteLoopDetector.recordRender(
      "ReactFlowCanvas.Interactions",
      renderData
    );

    // Log detailed render analysis every few renders or when issues are detected
    if (
      renderGuard.renderCount % 5 === 0 ||
      detectionResult.isOscillating ||
      renderGuard.sincePreviousRenderMs < 16
    ) {
      console.debug("[CanvasInteractionLayer] Render analysis:", {
        renderCount: renderGuard.renderCount,
        renderTiming: {
          sinceFirstRenderMs: renderGuard.sinceFirstRenderMs,
          sincePreviousRenderMs: renderGuard.sincePreviousRenderMs,
          averageRenderInterval:
            renderGuard.sinceFirstRenderMs / renderGuard.renderCount,
        },
        detectionResult,
        renderFrequency:
          renderGuard.renderCount / (renderGuard.sinceFirstRenderMs / 1000),
        potentialIssues: {
          tooFrequent: renderGuard.sincePreviousRenderMs < 16,
          oscillating: detectionResult.isOscillating,
          circuitBreakerActive: renderGuard.circuitBreakerActive,
          storeBreakerActive: renderGuard.storeBreakerSnapshot?.open,
        },
        propAnalysis: {
          recentChanges: propChangeHistoryRef.current.slice(-5),
          frequentChanges: propChangeHistoryRef.current.reduce(
            (acc, change) => {
              acc[change.property] = (acc[change.property] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
        callbackAnalysis: Object.fromEntries(
          Array.from(callbackStabilityRef.current.entries()).map(
            ([name, stats]) => [
              name,
              {
                changes: stats.changes,
                stability:
                  ((stats.refCount - stats.changes) / stats.refCount) * 100,
                recommendation:
                  stats.changes > stats.refCount * 0.3
                    ? "Consider memoization"
                    : "Stable",
              },
            ]
          )
        ),
      });
    }

    // Record to diagnostics system
    RenderLoopDiagnostics.getInstance().record("interaction-layer-render", {
      ...renderData,
      detectionResult,
      renderAnalysis: {
        frequency:
          renderGuard.renderCount / (renderGuard.sinceFirstRenderMs / 1000),
        averageInterval:
          renderGuard.sinceFirstRenderMs / renderGuard.renderCount,
        circuitBreakerActive: renderGuard.circuitBreakerActive,
      },
    });
  }, [
    contextMenu.visible,
    enableContextMenu,
    enableDragDrop,
    enableKeyboardShortcuts,
    renderGuard.renderCount,
    renderGuard.sinceFirstRenderMs,
    renderGuard.sincePreviousRenderMs,
    renderGuard.circuitBreakerActive,
    selectedItems.length,
    draggedComponent,
    reactFlowInstance,
  ]);

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
        onPaneContextMenu: (event: React.MouseEvent) =>
          handleContextMenu(event),
        onNodeContextMenu: (event: React.MouseEvent, node: any) =>
          handleContextMenu(event, node.id),
        onEdgeContextMenu: (event: React.MouseEvent, edge: any) =>
          handleContextMenu(event, undefined, edge.id),
      });
    });
  }, [
    children,
    handleComponentDrop,
    handleContextMenu,
    handleDragOver,
    handlePaneClick,
  ]);

  const pauseReason = useMemo(() => {
    if (renderGuard.storeBreakerSnapshot?.open) {
      return "Canvas data updates are cooling down after a burst of changes.";
    }
    if (renderGuard.circuitBreakerActive) {
      return "Interaction layer paused due to rapid re-renders.";
    }
    if (renderGuard.lastSyntheticError) {
      return "Interaction layer paused after a render guard trip.";
    }
    return "Interaction layer paused to prevent a potential render loop.";
  }, [
    renderGuard.circuitBreakerActive,
    renderGuard.lastSyntheticError,
    renderGuard.storeBreakerSnapshot,
  ]);

  if (renderGuard.shouldPause) {
    return (
      <div className="interaction-layer-paused">
        <p>{pauseReason}</p>
        <button type="button" onClick={renderGuard.reset}>
          Resume interactions
        </button>
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
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: 4,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
            padding: 8,
          }}
        >
          {contextMenu.nodeId && (
            <>
              <button
                onClick={() =>
                  componentCallbacks.onComponentSelect(contextMenu.nodeId!)
                }
              >
                Select
              </button>
              <button
                onClick={() =>
                  componentCallbacks.onComponentDelete(contextMenu.nodeId!)
                }
              >
                Delete
              </button>
            </>
          )}
          {contextMenu.edgeId && (
            <>
              <button
                onClick={() =>
                  connectionCallbacks.onConnectionSelect(contextMenu.edgeId!)
                }
              >
                Select
              </button>
              <button
                onClick={() =>
                  connectionCallbacks.onConnectionDelete(contextMenu.edgeId!)
                }
              >
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

export const CanvasInteractionLayer = memo(
  CanvasInteractionLayerComponent,
  (prev, next) => {
    // More intelligent children comparison
    const childrenEqual =
      prev.children === next.children ||
      (React.isValidElement(prev.children) &&
        React.isValidElement(next.children) &&
        prev.children.type === next.children.type &&
        prev.children.key === next.children.key);

    const propsEqual =
      prev.enableDragDrop === next.enableDragDrop &&
      prev.enableContextMenu === next.enableContextMenu &&
      prev.enableKeyboardShortcuts === next.enableKeyboardShortcuts &&
      childrenEqual;

    if (process.env.NODE_ENV === "development" && !propsEqual) {
      const changedProps = [];
      if (prev.enableDragDrop !== next.enableDragDrop)
        changedProps.push("enableDragDrop");
      if (prev.enableContextMenu !== next.enableContextMenu)
        changedProps.push("enableContextMenu");
      if (prev.enableKeyboardShortcuts !== next.enableKeyboardShortcuts)
        changedProps.push("enableKeyboardShortcuts");
      if (prev.children !== next.children) changedProps.push("children");

      console.debug(
        "[CanvasInteractionLayer] Memo comparison failed - props changed:",
        {
          changedProps,
          prevProps: {
            enableDragDrop: prev.enableDragDrop,
            enableContextMenu: prev.enableContextMenu,
            enableKeyboardShortcuts: prev.enableKeyboardShortcuts,
            childrenType: typeof prev.children,
          },
          nextProps: {
            enableDragDrop: next.enableDragDrop,
            enableContextMenu: next.enableContextMenu,
            enableKeyboardShortcuts: next.enableKeyboardShortcuts,
            childrenType: typeof next.children,
          },
        }
      );

      RenderLoopDiagnostics.getInstance().record(
        "interaction-layer-memo-skip",
        {
          componentName: "CanvasInteractionLayer",
          changedProps,
          reason: "Props changed, memo comparison failed",
        }
      );
    }

    return propsEqual;
  }
);
