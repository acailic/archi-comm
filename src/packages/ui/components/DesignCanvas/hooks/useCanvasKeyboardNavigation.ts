/**
 * File: src/packages/ui/components/DesignCanvas/hooks/useCanvasKeyboardNavigation.ts
 * Purpose: Comprehensive keyboard navigation for canvas components
 * Why: Makes canvas fully accessible to keyboard users and meets WCAG AA standards
 * Related: src/shared/hooks/canvas/useCanvasKeyboardShortcuts.ts, src/packages/canvas/SimpleCanvas.tsx
 */

import { useEffect, useCallback } from 'react';
import type { DesignComponent } from '../../../../shared/contracts';

export interface KeyboardNavigationOptions {
  enabled: boolean;
  components: DesignComponent[];
  selectedComponentId: string | null;
  onComponentSelect: (id: string | null) => void;
  onComponentDelete: (id: string) => void;
  onComponentDuplicate: (id: string) => void;
  onComponentMove?: (id: string, dx: number, dy: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onSelectAll?: () => void;
  onSetCanvasMode?: (mode: 'select' | 'quick-connect' | 'pan' | 'annotation') => void;
}

export function useCanvasKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    enabled,
    components,
    selectedComponentId,
    onComponentSelect,
    onComponentDelete,
    onComponentDuplicate,
    onComponentMove,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onFitView,
    onSelectAll,
    onSetCanvasMode,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle shortcuts if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Navigation shortcuts
      if (event.key === 'Tab') {
        event.preventDefault();
        const currentIndex = components.findIndex((c) => c.id === selectedComponentId);

        if (event.shiftKey) {
          // Navigate backward
          const prevIndex = currentIndex <= 0 ? components.length - 1 : currentIndex - 1;
          if (components[prevIndex]) {
            onComponentSelect(components[prevIndex].id);
          }
        } else {
          // Navigate forward
          const nextIndex = currentIndex >= components.length - 1 ? 0 : currentIndex + 1;
          if (components[nextIndex]) {
            onComponentSelect(components[nextIndex].id);
          }
        }
        return;
      }

      // Home/End navigation
      if (event.key === 'Home') {
        event.preventDefault();
        if (components.length > 0) {
          onComponentSelect(components[0].id);
        }
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        if (components.length > 0) {
          onComponentSelect(components[components.length - 1].id);
        }
        return;
      }

      // Arrow key navigation (move component)
      if (selectedComponentId && onComponentMove && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const moveAmount = event.shiftKey ? 1 : 10; // Fine adjustment with Shift

        let dx = 0, dy = 0;
        if (event.key === 'ArrowLeft') dx = -moveAmount;
        if (event.key === 'ArrowRight') dx = moveAmount;
        if (event.key === 'ArrowUp') dy = -moveAmount;
        if (event.key === 'ArrowDown') dy = moveAmount;

        onComponentMove(selectedComponentId, dx, dy);
        return;
      }

      // Delete shortcuts
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedComponentId) {
        event.preventDefault();
        onComponentDelete(selectedComponentId);
        return;
      }

      // Duplicate shortcut (Ctrl/Cmd+D)
      if (cmdOrCtrl && event.key === 'd' && selectedComponentId) {
        event.preventDefault();
        onComponentDuplicate(selectedComponentId);
        return;
      }

      // Undo shortcut (Ctrl/Cmd+Z)
      if (cmdOrCtrl && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }

      // Redo shortcuts (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)
      if (cmdOrCtrl && ((event.key === 'z' && event.shiftKey) || event.key === 'y')) {
        event.preventDefault();
        onRedo();
        return;
      }

      // Select all shortcut (Ctrl/Cmd+A)
      if (cmdOrCtrl && event.key === 'a' && onSelectAll) {
        event.preventDefault();
        onSelectAll();
        return;
      }

      // Deselect shortcut (Escape)
      if (event.key === 'Escape') {
        event.preventDefault();
        onComponentSelect(null);
        return;
      }

      // Canvas mode shortcuts
      if (onSetCanvasMode) {
        // V key - Select mode
        if (event.key === 'v' || event.key === 'V') {
          event.preventDefault();
          onSetCanvasMode('select');
          return;
        }

        // Q key - Quick Connect mode
        if (event.key === 'q' || event.key === 'Q') {
          event.preventDefault();
          onSetCanvasMode('quick-connect');
          return;
        }

        // Space key - Pan mode (only on keydown, not keyup)
        if (event.key === ' ' && event.type === 'keydown') {
          event.preventDefault();
          onSetCanvasMode('pan');
          return;
        }

        // A key - Annotation mode
        if (event.key === 'a' || event.key === 'A') {
          // Only if Ctrl/Cmd is not pressed (to avoid conflict with select all)
          if (!cmdOrCtrl) {
            event.preventDefault();
            onSetCanvasMode('annotation');
            return;
          }
        }
      }

      // Zoom shortcuts
      if (cmdOrCtrl && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        onZoomIn();
        return;
      }

      if (cmdOrCtrl && event.key === '-') {
        event.preventDefault();
        onZoomOut();
        return;
      }

      if (cmdOrCtrl && event.key === '0') {
        event.preventDefault();
        onFitView();
        return;
      }
    },
    [
      enabled,
      components,
      selectedComponentId,
      onComponentSelect,
      onComponentDelete,
      onComponentDuplicate,
      onComponentMove,
      onUndo,
      onRedo,
      onZoomIn,
      onZoomOut,
      onFitView,
      onSelectAll,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    // Expose keyboard shortcut info for help/documentation
    shortcuts: {
      modes: [
        { key: 'V', description: 'Switch to Select mode' },
        { key: 'Q', description: 'Switch to Quick Connect mode' },
        { key: 'Space', description: 'Switch to Pan mode' },
        { key: 'A', description: 'Switch to Annotation mode' },
      ],
      navigation: [
        { key: 'Tab', description: 'Navigate to next component' },
        { key: 'Shift+Tab', description: 'Navigate to previous component' },
        { key: 'Home', description: 'Select first component' },
        { key: 'End', description: 'Select last component' },
        { key: 'Arrow keys', description: 'Move selected component by 10px' },
        { key: 'Shift+Arrow keys', description: 'Move selected component by 1px' },
      ],
      actions: [
        { key: 'Delete/Backspace', description: 'Delete selected component' },
        { key: 'Ctrl/Cmd+D', description: 'Duplicate selected component' },
        { key: 'Ctrl/Cmd+Z', description: 'Undo' },
        { key: 'Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y', description: 'Redo' },
        { key: 'Ctrl/Cmd+A', description: 'Select all components' },
        { key: 'Escape', description: 'Deselect all' },
      ],
      zoom: [
        { key: 'Ctrl/Cmd++', description: 'Zoom in' },
        { key: 'Ctrl/Cmd+-', description: 'Zoom out' },
        { key: 'Ctrl/Cmd+0', description: 'Reset zoom / fit view' },
      ],
    },
  };
}
