// src/shared/hooks/canvas/useUndoRedo.ts
// Canvas undo/redo functionality using zundo with Zustand store
// Provides canvas-specific undo/redo with keyboard shortcuts
// RELEVANT FILES: src/stores/canvasStore.ts, src/components/DesignCanvas.tsx, src/features/canvas/types.ts

import { useCallback, useEffect } from 'react';
import { useCanvasStore, useCanvasUndo, useCanvasRedo, useCanvasCanUndo, useCanvasCanRedo } from '@/stores/canvasStore';

interface UseCanvasUndoRedoOptions {
  enableGlobalShortcuts?: boolean;
}

interface UseCanvasUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

/**
 * Canvas-specific undo/redo hook using zundo and Zustand
 * Integrates with the existing keyboard shortcut system when enabled
 */
export function useCanvasUndoRedo(
  options: UseCanvasUndoRedoOptions = {}
): UseCanvasUndoRedoReturn {
  const { enableGlobalShortcuts = false } = options;

  // Get undo/redo functions from zundo
  const undo = useCanvasUndo();
  const redo = useCanvasRedo();
  const canUndo = useCanvasCanUndo();
  const canRedo = useCanvasCanRedo();

  // Clear history function
  const clearHistory = useCallback(() => {
    const temporalState = useCanvasStore.temporal.getState();

    // Check if clear method exists and is a function before calling it
    if (temporalState && typeof temporalState.clear === 'function') {
      temporalState.clear();
    } else {
      console.warn('Canvas store clear method is not available or not a function');
    }
  }, []);

  // Global shortcut integration (similar to DesignCanvas.tsx)
  useEffect(() => {
    if (!enableGlobalShortcuts) return;

    const handleUndoShortcut = () => {
      if (canUndo) {
        undo();
        if (import.meta.env.DEV) {
          console.log('Undo triggered via keyboard shortcut');
        }
      }
    };

    const handleRedoShortcut = () => {
      if (canRedo) {
        redo();
        if (import.meta.env.DEV) {
          console.log('Redo triggered via keyboard shortcut');
        }
      }
    };

    // Add event listeners for global shortcuts
    window.addEventListener('shortcut:undo', handleUndoShortcut);
    window.addEventListener('shortcut:redo', handleRedoShortcut);

    return () => {
      window.removeEventListener('shortcut:undo', handleUndoShortcut);
      window.removeEventListener('shortcut:redo', handleRedoShortcut);
    };
  }, [enableGlobalShortcuts, canUndo, canRedo, undo, redo]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
  };
}

// Legacy hook for backward compatibility
export function useUndoRedo<T>(
  initialState: T,
  _options: { maxHistorySize?: number; enableGlobalShortcuts?: boolean } = {}
) {
  console.warn('useUndoRedo is deprecated, use useCanvasUndoRedo for canvas operations');

  // For non-canvas use cases, return a simplified version
  return {
    state: initialState,
    canUndo: false,
    canRedo: false,
    pushState: () => {},
    undo: () => {},
    redo: () => {},
    clearHistory: () => {},
  };
}
