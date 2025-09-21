/**
 * Canvas Interaction Context - High-frequency interaction state
 * Separated from OptimizedCanvasContext to isolate frequently changing state
 * Contains selection, drag state, hover state, mouse position
 */

import React, { createContext, useContext, useRef } from 'react';
import { useGuardedState } from '@/lib/performance/useGuardedState';
import { useStableConfig } from '@/shared/hooks/useStableLiterals';
import { equalityFunctions } from '@/shared/utils/memoization';

export interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemType: 'component' | 'connection' | 'infoCard' | null;
  dragStartPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  dropTarget: string | null;
}

export interface SelectionState {
  selectedItems: string[];
  selectedItemType: 'component' | 'connection' | 'infoCard' | 'mixed' | null;
  lastSelectedItem: string | null;
  multiSelectMode: boolean;
  selectionBounds: { x: number; y: number; width: number; height: number } | null;
}

export interface HoverState {
  hoveredItems: string[];
  hoveredItemType: 'component' | 'connection' | 'infoCard' | null;
  hoverPosition: { x: number; y: number } | null;
  hoverDelay: number;
}

export interface InteractionState {
  isInteracting: boolean;
  interactionType: 'selecting' | 'dragging' | 'connecting' | 'panning' | 'zooming' | null;
  interactionStartTime: number | null;
  lastInteractionTime: number;
}

export interface MouseState {
  position: { x: number; y: number };
  worldPosition: { x: number; y: number }; // position in canvas world coordinates
  isPressed: boolean;
  pressedButton: number | null;
  pressStartPosition: { x: number; y: number } | null;
}

export interface CanvasInteraction {
  drag: DragState;
  selection: SelectionState;
  hover: HoverState;
  interaction: InteractionState;
  mouse: MouseState;
}

export interface CanvasInteractionContextValue {
  state: CanvasInteraction;

  // Drag operations
  startDrag: (itemId: string, itemType: 'component' | 'connection' | 'infoCard', position: { x: number; y: number }) => void;
  updateDrag: (position: { x: number; y: number }, dropTarget?: string) => void;
  endDrag: () => void;

  // Selection operations
  selectItem: (itemId: string, itemType: 'component' | 'connection' | 'infoCard', multiSelect?: boolean) => void;
  selectItems: (itemIds: string[], itemType: 'component' | 'connection' | 'infoCard' | 'mixed') => void;
  deselectItem: (itemId: string) => void;
  clearSelection: () => void;
  toggleItemSelection: (itemId: string, itemType: 'component' | 'connection' | 'infoCard') => void;

  // Hover operations
  setHoveredItem: (itemId: string | null, itemType?: 'component' | 'connection' | 'infoCard', position?: { x: number; y: number }) => void;
  setHoveredItems: (itemIds: string[], itemType?: 'component' | 'connection' | 'infoCard') => void;
  clearHover: () => void;

  // Interaction operations
  startInteraction: (type: 'selecting' | 'dragging' | 'connecting' | 'panning' | 'zooming') => void;
  endInteraction: () => void;

  // Mouse operations
  updateMousePosition: (position: { x: number; y: number }, worldPosition: { x: number; y: number }) => void;
  setMousePressed: (pressed: boolean, button?: number, position?: { x: number; y: number }) => void;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedItemId: null,
  draggedItemType: null,
  dragStartPosition: null,
  currentPosition: null,
  dropTarget: null,
};

const initialSelectionState: SelectionState = {
  selectedItems: [],
  selectedItemType: null,
  lastSelectedItem: null,
  multiSelectMode: false,
  selectionBounds: null,
};

const initialHoverState: HoverState = {
  hoveredItems: [],
  hoveredItemType: null,
  hoverPosition: null,
  hoverDelay: 500,
};

const initialInteractionState: InteractionState = {
  isInteracting: false,
  interactionType: null,
  interactionStartTime: null,
  lastInteractionTime: 0,
};

const initialMouseState: MouseState = {
  position: { x: 0, y: 0 },
  worldPosition: { x: 0, y: 0 },
  isPressed: false,
  pressedButton: null,
  pressStartPosition: null,
};

const initialCanvasInteraction: CanvasInteraction = {
  drag: initialDragState,
  selection: initialSelectionState,
  hover: initialHoverState,
  interaction: initialInteractionState,
  mouse: initialMouseState,
};

const CanvasInteractionContext = createContext<CanvasInteractionContextValue | null>(null);

export interface CanvasInteractionProviderProps {
  children: React.ReactNode;
  onSelectionChange?: (selectedItems: string[], itemType: string | null) => void;
  onDragStart?: (itemId: string, itemType: string) => void;
  onDragEnd?: (itemId: string, itemType: string, dropTarget: string | null) => void;
  onHoverChange?: (hoveredItems: string[], itemType: string | null) => void;
}

export const CanvasInteractionProvider: React.FC<CanvasInteractionProviderProps> = ({
  children,
  onSelectionChange,
  onDragStart,
  onDragEnd,
  onHoverChange,
}) => {
  const [state, setState] = useGuardedState(initialCanvasInteraction, {
    componentName: 'CanvasInteractionProvider',
    maxUpdatesPerTick: 60, // High frequency for interactions
  });

  // Performance tracking
  const interactionCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);

  const updateState = React.useCallback(
    <K extends keyof CanvasInteraction>(
      section: K,
      updates: Partial<CanvasInteraction[K]>,
      skipOptimization = false
    ) => {
      setState(prevState => {
        const currentSection = prevState[section];
        const newSection = { ...currentSection, ...updates };

        // Skip update if nothing changed (unless optimization is disabled)
        if (!skipOptimization && equalityFunctions.mixed(currentSection, newSection)) {
          return prevState;
        }

        const newState = { ...prevState, [section]: newSection };

        // Track performance in development
        if (import.meta.env.DEV) {
          const now = performance.now();
          const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
          lastUpdateTimeRef.current = now;
          interactionCountRef.current++;

          // Log high-frequency updates
          if (timeSinceLastUpdate < 16 && interactionCountRef.current % 10 === 0) {
            console.debug(`[CanvasInteractionContext] High-frequency update detected:`, {
              section,
              updateFrequency: 1000 / timeSinceLastUpdate,
              interactionCount: interactionCountRef.current,
            });
          }
        }

        return newState;
      });
    },
    []
  );

  // Drag operations
  const startDrag = React.useCallback(
    (itemId: string, itemType: 'component' | 'connection' | 'infoCard', position: { x: number; y: number }) => {
      updateState('drag', {
        isDragging: true,
        draggedItemId: itemId,
        draggedItemType: itemType,
        dragStartPosition: position,
        currentPosition: position,
        dropTarget: null,
      });

      updateState('interaction', {
        isInteracting: true,
        interactionType: 'dragging',
        interactionStartTime: Date.now(),
        lastInteractionTime: Date.now(),
      });

      if (onDragStart) {
        onDragStart(itemId, itemType);
      }
    },
    [updateState, onDragStart]
  );

  const updateDrag = React.useCallback(
    (position: { x: number; y: number }, dropTarget?: string) => {
      updateState('drag', {
        currentPosition: position,
        dropTarget: dropTarget || null,
      });

      updateState('interaction', {
        lastInteractionTime: Date.now(),
      });
    },
    [updateState]
  );

  const endDrag = React.useCallback(() => {
    const currentDrag = state.drag;

    updateState('drag', initialDragState);
    updateState('interaction', {
      isInteracting: false,
      interactionType: null,
      interactionStartTime: null,
      lastInteractionTime: Date.now(),
    });

    if (onDragEnd && currentDrag.draggedItemId) {
      onDragEnd(currentDrag.draggedItemId, currentDrag.draggedItemType || '', currentDrag.dropTarget);
    }
  }, [state.drag, updateState, onDragEnd]);

  // Selection operations
  const selectItem = React.useCallback(
    (itemId: string, itemType: 'component' | 'connection' | 'infoCard', multiSelect = false) => {
      setState(prevState => {
        const currentSelection = prevState.selection;
        let newSelectedItems: string[];
        let newItemType: 'component' | 'connection' | 'infoCard' | 'mixed';

        if (multiSelect && currentSelection.selectedItems.length > 0) {
          if (currentSelection.selectedItems.includes(itemId)) {
            // Item already selected in multi-select, don't change
            return prevState;
          }

          newSelectedItems = [...currentSelection.selectedItems, itemId];
          newItemType = currentSelection.selectedItemType === itemType ? itemType : 'mixed';
        } else {
          // Single select or first item in multi-select
          newSelectedItems = [itemId];
          newItemType = itemType;
        }

        const newSelection = {
          ...currentSelection,
          selectedItems: newSelectedItems,
          selectedItemType: newItemType,
          lastSelectedItem: itemId,
          multiSelectMode: multiSelect,
        };

        const newState = {
          ...prevState,
          selection: newSelection,
          interaction: {
            ...prevState.interaction,
            lastInteractionTime: Date.now(),
          },
        };

        // Notify external listeners
        if (onSelectionChange) {
          onSelectionChange(newSelectedItems, newItemType);
        }

        return newState;
      });
    },
    [onSelectionChange]
  );

  const selectItems = React.useCallback(
    (itemIds: string[], itemType: 'component' | 'connection' | 'infoCard' | 'mixed') => {
      updateState('selection', {
        selectedItems: itemIds,
        selectedItemType: itemType,
        lastSelectedItem: itemIds[itemIds.length - 1] || null,
        multiSelectMode: itemIds.length > 1,
      });

      updateState('interaction', {
        lastInteractionTime: Date.now(),
      });

      if (onSelectionChange) {
        onSelectionChange(itemIds, itemType);
      }
    },
    [updateState, onSelectionChange]
  );

  const deselectItem = React.useCallback(
    (itemId: string) => {
      setState(prevState => {
        const currentSelection = prevState.selection;
        const newSelectedItems = currentSelection.selectedItems.filter(id => id !== itemId);

        if (newSelectedItems.length === currentSelection.selectedItems.length) {
          // Item wasn't selected, no change
          return prevState;
        }

        const newSelection = {
          ...currentSelection,
          selectedItems: newSelectedItems,
          selectedItemType: newSelectedItems.length === 0 ? null : currentSelection.selectedItemType,
          lastSelectedItem: newSelectedItems[newSelectedItems.length - 1] || null,
          multiSelectMode: newSelectedItems.length > 1,
        };

        const newState = {
          ...prevState,
          selection: newSelection,
          interaction: {
            ...prevState.interaction,
            lastInteractionTime: Date.now(),
          },
        };

        if (onSelectionChange) {
          onSelectionChange(newSelectedItems, newSelection.selectedItemType);
        }

        return newState;
      });
    },
    [onSelectionChange]
  );

  const clearSelection = React.useCallback(() => {
    updateState('selection', initialSelectionState);
    updateState('interaction', {
      lastInteractionTime: Date.now(),
    });

    if (onSelectionChange) {
      onSelectionChange([], null);
    }
  }, [updateState, onSelectionChange]);

  const toggleItemSelection = React.useCallback(
    (itemId: string, itemType: 'component' | 'connection' | 'infoCard') => {
      if (state.selection.selectedItems.includes(itemId)) {
        deselectItem(itemId);
      } else {
        selectItem(itemId, itemType, state.selection.multiSelectMode);
      }
    },
    [state.selection, selectItem, deselectItem]
  );

  // Hover operations
  const setHoveredItem = React.useCallback(
    (itemId: string | null, itemType?: 'component' | 'connection' | 'infoCard', position?: { x: number; y: number }) => {
      const newHoveredItems = itemId ? [itemId] : [];
      const newItemType = itemId && itemType ? itemType : null;

      updateState('hover', {
        hoveredItems: newHoveredItems,
        hoveredItemType: newItemType,
        hoverPosition: position || null,
      });

      if (onHoverChange) {
        onHoverChange(newHoveredItems, newItemType);
      }
    },
    [updateState, onHoverChange]
  );

  const setHoveredItems = React.useCallback(
    (itemIds: string[], itemType?: 'component' | 'connection' | 'infoCard') => {
      updateState('hover', {
        hoveredItems: itemIds,
        hoveredItemType: itemType || null,
      });

      if (onHoverChange) {
        onHoverChange(itemIds, itemType || null);
      }
    },
    [updateState, onHoverChange]
  );

  const clearHover = React.useCallback(() => {
    updateState('hover', {
      hoveredItems: [],
      hoveredItemType: null,
      hoverPosition: null,
    });

    if (onHoverChange) {
      onHoverChange([], null);
    }
  }, [updateState, onHoverChange]);

  // Interaction operations
  const startInteraction = React.useCallback(
    (type: 'selecting' | 'dragging' | 'connecting' | 'panning' | 'zooming') => {
      updateState('interaction', {
        isInteracting: true,
        interactionType: type,
        interactionStartTime: Date.now(),
        lastInteractionTime: Date.now(),
      });
    },
    [updateState]
  );

  const endInteraction = React.useCallback(() => {
    updateState('interaction', {
      isInteracting: false,
      interactionType: null,
      interactionStartTime: null,
      lastInteractionTime: Date.now(),
    });
  }, [updateState]);

  // Mouse operations
  const updateMousePosition = React.useCallback(
    (position: { x: number; y: number }, worldPosition: { x: number; y: number }) => {
      updateState('mouse', {
        position,
        worldPosition,
      }, true); // Skip optimization for high-frequency mouse moves
    },
    [updateState]
  );

  const setMousePressed = React.useCallback(
    (pressed: boolean, button?: number, position?: { x: number; y: number }) => {
      updateState('mouse', {
        isPressed: pressed,
        pressedButton: pressed ? (button ?? null) : null,
        pressStartPosition: pressed && position ? position : null,
      });
    },
    [updateState]
  );

  // Stable context value
  const stableValue = useStableConfig(() => ({
    state,
    startDrag,
    updateDrag,
    endDrag,
    selectItem,
    selectItems,
    deselectItem,
    clearSelection,
    toggleItemSelection,
    setHoveredItem,
    setHoveredItems,
    clearHover,
    startInteraction,
    endInteraction,
    updateMousePosition,
    setMousePressed,
  }), [
    state,
    startDrag,
    updateDrag,
    endDrag,
    selectItem,
    selectItems,
    deselectItem,
    clearSelection,
    toggleItemSelection,
    setHoveredItem,
    setHoveredItems,
    clearHover,
    startInteraction,
    endInteraction,
    updateMousePosition,
    setMousePressed,
  ]);

  return (
    <CanvasInteractionContext.Provider value={stableValue}>
      {children}
    </CanvasInteractionContext.Provider>
  );
};

// Main hook
export const useCanvasInteraction = (): CanvasInteractionContextValue => {
  const context = useContext(CanvasInteractionContext);
  if (!context) {
    throw new Error('useCanvasInteraction must be used within a CanvasInteractionProvider');
  }
  return context;
};

// Selector hooks for specific state sections
export const useDragState = (): DragState => {
  const { state } = useCanvasInteraction();
  return state.drag;
};

export const useSelectionState = (): SelectionState => {
  const { state } = useCanvasInteraction();
  return state.selection;
};

export const useHoverState = (): HoverState => {
  const { state } = useCanvasInteraction();
  return state.hover;
};

export const useInteractionState = (): InteractionState => {
  const { state } = useCanvasInteraction();
  return state.interaction;
};

export const useMouseState = (): MouseState => {
  const { state } = useCanvasInteraction();
  return state.mouse;
};

// Specific property hooks for minimal re-renders
export const useSelectedItems = (): string[] => {
  const { selectedItems } = useSelectionState();
  return selectedItems;
};

export const useHoveredItems = (): string[] => {
  const { hoveredItems } = useHoverState();
  return hoveredItems;
};

export const useIsDragging = (): boolean => {
  const { isDragging } = useDragState();
  return isDragging;
};

export const useIsInteracting = (): boolean => {
  const { isInteracting } = useInteractionState();
  return isInteracting;
};

export const useMousePosition = (): { x: number; y: number } => {
  const { position } = useMouseState();
  return position;
};

export const useWorldMousePosition = (): { x: number; y: number } => {
  const { worldPosition } = useMouseState();
  return worldPosition;
};

// Operation hooks
export const useDragOperations = () => {
  const { startDrag, updateDrag, endDrag } = useCanvasInteraction();
  return { startDrag, updateDrag, endDrag };
};

export const useSelectionOperations = () => {
  const { selectItem, selectItems, deselectItem, clearSelection, toggleItemSelection } = useCanvasInteraction();
  return { selectItem, selectItems, deselectItem, clearSelection, toggleItemSelection };
};

export const useHoverOperations = () => {
  const { setHoveredItem, setHoveredItems, clearHover } = useCanvasInteraction();
  return { setHoveredItem, setHoveredItems, clearHover };
};

export const useMouseOperations = () => {
  const { updateMousePosition, setMousePressed } = useCanvasInteraction();
  return { updateMousePosition, setMousePressed };
};

// Compound operations for common use cases
export const useItemInteraction = (itemId: string, itemType: 'component' | 'connection' | 'infoCard') => {
  const { selectItem, deselectItem, toggleItemSelection, setHoveredItem, clearHover } = useCanvasInteraction();
  const { selectedItems } = useSelectionState();
  const { hoveredItems } = useHoverState();

  const isSelected = selectedItems.includes(itemId);
  const isHovered = hoveredItems.includes(itemId);

  const select = React.useCallback(
    (multiSelect = false) => selectItem(itemId, itemType, multiSelect),
    [selectItem, itemId, itemType]
  );

  const deselect = React.useCallback(
    () => deselectItem(itemId),
    [deselectItem, itemId]
  );

  const toggle = React.useCallback(
    () => toggleItemSelection(itemId, itemType),
    [toggleItemSelection, itemId, itemType]
  );

  const hover = React.useCallback(
    (position?: { x: number; y: number }) => setHoveredItem(itemId, itemType, position),
    [setHoveredItem, itemId, itemType]
  );

  const unhover = React.useCallback(
    () => clearHover(),
    [clearHover]
  );

  return {
    isSelected,
    isHovered,
    select,
    deselect,
    toggle,
    hover,
    unhover,
  };
};

// Development tools
if (import.meta.env.DEV) {
  (window as any).__CANVAS_INTERACTION_DEBUG__ = {
    getInteractionState: () => {
      const event = new CustomEvent('getCanvasInteractionState');
      window.dispatchEvent(event);
    },
    clearAllInteractions: () => {
      const event = new CustomEvent('clearAllCanvasInteractions');
      window.dispatchEvent(event);
    },
  };
}

export default CanvasInteractionContext;