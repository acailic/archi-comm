import { useState, useCallback, useEffect } from 'react';

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  enableGlobalShortcuts?: boolean;
}

interface UseUndoRedoReturn<T> {
  state: T;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

/**
 * Reusable undo/redo hook for managing edit history
 * Integrates with the existing keyboard shortcut system when enabled
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50, enableGlobalShortcuts = false } = options;
  
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentState = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((newState: T) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add the new state
      newHistory.push(newState);
      
      // Enforce max history size
      if (newHistory.length > maxHistorySize) {
        newHistory.splice(0, newHistory.length - maxHistorySize);
        setCurrentIndex(maxHistorySize - 1);
        return newHistory;
      }
      
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [currentIndex, maxHistorySize]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [canRedo]);

  const clearHistory = useCallback(() => {
    setHistory([currentState]);
    setCurrentIndex(0);
  }, [currentState]);

  // Global shortcut integration (similar to DesignCanvas.tsx)
  useEffect(() => {
    if (!enableGlobalShortcuts) return;

    const handleUndoShortcut = () => {
      if (canUndo) {
        undo();
        if (process.env.NODE_ENV === 'development') {
          console.log('Undo triggered via keyboard shortcut');
        }
      }
    };

    const handleRedoShortcut = () => {
      if (canRedo) {
        redo();
        if (process.env.NODE_ENV === 'development') {
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
    state: currentState,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    clearHistory
  };
}