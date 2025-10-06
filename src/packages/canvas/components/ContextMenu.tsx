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
import { overlayZIndex } from "@/lib/design/design-system";
import { useCanvasStore } from "@/stores/canvasStore";

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
  onComponentDuplicate?: (componentIds: string[]) => void;
  onComponentLock?: (componentIds: string[]) => void;
  onComponentUnlock?: (componentIds: string[]) => void;
  onComponentGroup?: (componentIds: string[]) => void;
  onComponentAlign?: (componentIds: string[], alignment: 'left' | 'right' | 'top' | 'bottom') => void;
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef(callbacks);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  callbacksRef.current = callbacks;

  const [focusedIndex, setFocusedIndex] = useState(0);

  // Get selected component IDs and locked status from store
  const getStoreState = () => {
    const state = useCanvasStore.getState();
    return {
      selectedIds: state.selectedComponentIds || [],
      components: state.components || [],
      groups: state.componentGroups || [],
    };
  };

  // Create portal container on mount
  useEffect(() => {
    const container = document.createElement("div");
    container.id = "canvas-context-menu-portal";
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.pointerEvents = "none";
    container.style.zIndex = String(overlayZIndex.contextMenu);
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

        // Restore focus to previously focused element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
          previousFocusRef.current = null;
        }

        return newState;
      });
    }, [onStateChange]);

    const showContextMenu = useCallback(
      (event: React.MouseEvent, nodeId?: string, edgeId?: string) => {
        if (!enabled) return;

        event.preventDefault();
        const newX = event.clientX;
        const newY = event.clientY;

        // Save current focused element before opening menu
        previousFocusRef.current = document.activeElement as HTMLElement;

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

      const keyHandler = (event: KeyboardEvent) => {
        const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') as NodeListOf<HTMLElement>;
        if (!menuItems || menuItems.length === 0) return;

        // Prevent default for all handled keys to keep focus in menu
        if (['Escape', 'ArrowDown', 'ArrowUp', 'Tab', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
        }

        if (event.key === 'Escape') {
          hideContextMenu();
        } else if (event.key === 'ArrowDown') {
          setFocusedIndex(prev => {
            const next = Math.min(prev + 1, menuItems.length - 1);
            menuItems[next]?.focus();
            return next;
          });
        } else if (event.key === 'ArrowUp') {
          setFocusedIndex(prev => {
            const next = Math.max(0, prev - 1);
            menuItems[next]?.focus();
            return next;
          });
        } else if (event.key === 'Tab') {
          if (event.shiftKey) {
            // Shift+Tab: move backwards
            setFocusedIndex(prev => {
              const next = prev === 0 ? menuItems.length - 1 : prev - 1;
              menuItems[next]?.focus();
              return next;
            });
          } else {
            // Tab: move forwards
            setFocusedIndex(prev => {
              const next = (prev + 1) % menuItems.length;
              menuItems[next]?.focus();
              return next;
            });
          }
        } else if (event.key === 'Enter' || event.key === ' ') {
          menuItems[focusedIndex]?.click();
        }
      };

      document.addEventListener("click", clickHandler);
      document.addEventListener("keydown", keyHandler);

      // Focus the first menu item when opened
      setTimeout(() => {
        const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
        (menuItems?.[0] as HTMLElement)?.focus();
      }, 0);

      return () => {
        document.removeEventListener("click", clickHandler);
        document.removeEventListener("keydown", keyHandler);
      };
    }, [contextMenu.visible, hideContextMenu, focusedIndex]);

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

    const { selectedIds, components, groups } = getStoreState();
    const isMultiSelect = selectedIds.length > 1;
    const selectedComponent = contextMenu.nodeId ? components.find(c => c.id === contextMenu.nodeId) : null;
    const isLocked = selectedComponent?.locked || false;
    const lockedComponentIds = components.filter(component => component.locked).map(component => component.id);
    const hasLockedComponents = lockedComponentIds.length > 0;

    // Determine which group would be ungrouped
    const groupsInSelection = new Set<string>();
    selectedIds.forEach(id => {
      const comp = components.find(c => c.id === id);
      if (comp?.groupId) groupsInSelection.add(comp.groupId);
    });
    const hasMultipleGroups = groupsInSelection.size > 1;
    const groupToUngroup = hasMultipleGroups
      ? groups.find(g => g.id === selectedComponent?.groupId)
      : groups.find(g => groupsInSelection.has(g.id));

    return createPortal(
      <div
        ref={menuRef}
        className="context-menu"
        role="menu"
        aria-label="Context menu"
        style={{
          position: "fixed",
          top: contextMenu.y,
          left: contextMenu.x,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: 4,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          zIndex: overlayZIndex.contextMenu,
          padding: 8,
          pointerEvents: "auto",
          minWidth: 160,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu.nodeId && (
          <>
            <button
              type="button"
              role="menuitem"
              tabIndex={focusedIndex === 0 ? 0 : -1}
              aria-label="Select component"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onComponentSelect(contextMenu.nodeId!)
                )
              }
              style={{ display: "block", width: "100%", marginBottom: 4, padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Select
            </button>
            {callbacksRef.current.onComponentDuplicate && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-label={`Duplicate ${isMultiSelect ? `${selectedIds.length} components` : 'component'}`}
                onClick={() =>
                  handleItemClick(() =>
                    callbacksRef.current.onComponentDuplicate?.(isMultiSelect ? selectedIds : [contextMenu.nodeId!])
                  )
                }
                style={{ display: "block", width: "100%", marginBottom: 4, padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Duplicate {isMultiSelect ? `(${selectedIds.length})` : ''} <span style={{ float: 'right', opacity: 0.6 }}>Ctrl/Cmd+D</span>
              </button>
            )}
            {callbacksRef.current.onComponentLock && callbacksRef.current.onComponentUnlock && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${isMultiSelect ? `${selectedIds.length} components` : 'component'}`}
                onClick={() =>
                  handleItemClick(() => {
                    const ids = isMultiSelect ? selectedIds : [contextMenu.nodeId!];
                    if (isLocked) {
                      callbacksRef.current.onComponentUnlock?.(ids);
                    } else {
                      callbacksRef.current.onComponentLock?.(ids);
                    }
                  })
                }
                style={{ display: "block", width: "100%", marginBottom: 4, padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {isLocked ? 'Unlock' : 'Lock'} {isMultiSelect ? `(${selectedIds.length})` : ''} <span style={{ float: 'right', opacity: 0.6 }}>Ctrl/Cmd+Alt+L</span>
              </button>
            )}
            {isMultiSelect && callbacksRef.current.onComponentGroup && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-label={`Group ${selectedIds.length} components`}
                onClick={() =>
                  handleItemClick(() =>
                    callbacksRef.current.onComponentGroup?.(selectedIds)
                  )
                }
                style={{ display: "block", width: "100%", marginBottom: 4, padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Group ({selectedIds.length}) <span style={{ float: 'right', opacity: 0.6 }}>Ctrl/Cmd+G</span>
              </button>
            )}
            {isMultiSelect && callbacksRef.current.onComponentAlign && (
              <>
                <div role="separator" style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
                <div role="group" aria-label="Alignment options" aria-expanded="true" style={{ fontSize: 11, opacity: 0.6, padding: '4px 8px' }}>Align:</div>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-label="Align left"
                  onClick={() =>
                    handleItemClick(() =>
                      callbacksRef.current.onComponentAlign?.(selectedIds, 'left')
                    )
                  }
                  style={{ display: "block", width: "100%", marginBottom: 2, padding: '4px 8px', textAlign: 'left', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Left
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-label="Align right"
                  onClick={() =>
                    handleItemClick(() =>
                      callbacksRef.current.onComponentAlign?.(selectedIds, 'right')
                    )
                  }
                  style={{ display: "block", width: "100%", marginBottom: 2, padding: '4px 8px', textAlign: 'left', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Right
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-label="Align top"
                  onClick={() =>
                    handleItemClick(() =>
                      callbacksRef.current.onComponentAlign?.(selectedIds, 'top')
                    )
                  }
                  style={{ display: "block", width: "100%", marginBottom: 2, padding: '4px 8px', textAlign: 'left', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Top
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-label="Align bottom"
                  onClick={() =>
                    handleItemClick(() =>
                      callbacksRef.current.onComponentAlign?.(selectedIds, 'bottom')
                    )
                  }
                  style={{ display: "block", width: "100%", marginBottom: 4, padding: '4px 8px', textAlign: 'left', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Bottom
                </button>
              </>
            )}
            <div role="separator" style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-label="Delete component"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onComponentDelete(contextMenu.nodeId!)
                )
              }
              style={{ display: "block", width: "100%", padding: '6px 8px', textAlign: 'left', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Delete
            </button>
          </>
        )}
        {contextMenu.edgeId && (
          <>
            <button
              type="button"
              role="menuitem"
              tabIndex={0}
              aria-label="Select connection"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onConnectionSelect(contextMenu.edgeId!)
                )
              }
              style={{ display: "block", width: "100%", marginBottom: 4, padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Select
            </button>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-label="Delete connection"
              onClick={() =>
                handleItemClick(() =>
                  callbacksRef.current.onConnectionDelete(contextMenu.edgeId!)
                )
              }
              style={{ display: "block", width: "100%", padding: '6px 8px', textAlign: 'left', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Delete
            </button>
          </>
        )}
        {!contextMenu.nodeId && !contextMenu.edgeId && (
          <>
            {selectedIds.length > 0 ? (
              <button
                type="button"
                role="menuitem"
                tabIndex={0}
                aria-label={`Clear selection of ${selectedIds.length} components`}
                onClick={() =>
                  handleItemClick(() => callbacksRef.current.onComponentDeselect())
                }
                style={{ display: "block", width: "100%", padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear Selection ({selectedIds.length})
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                tabIndex={0}
                aria-label="Select all components"
                onClick={() =>
                  handleItemClick(() => {
                    // Dispatch select-all event instead of deselect
                    window.dispatchEvent(new CustomEvent('canvas:select-all'));
                  })
                }
                style={{ display: "block", width: "100%", padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Select All <span style={{ float: 'right', opacity: 0.6 }}>Ctrl+A</span>
              </button>
            )}
            {hasLockedComponents && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-label={`Select ${lockedComponentIds.length} locked components`}
                onClick={() =>
                  handleItemClick(() => {
                    window.dispatchEvent(
                      new CustomEvent('canvas:select-locked')
                    );
                  })
                }
                style={{ display: "block", width: "100%", marginTop: 4, padding: '6px 8px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Select locked ({lockedComponentIds.length})
              </button>
            )}
          </>
        )}
      </div>,
      portalRef.current
    );
  }
);

ContextMenu.displayName = "ContextMenu";

// Export types for external usage
export type { ContextMenuCallbacks, ContextMenuState };
