/**
 * src/shared/hooks/canvas/useCanvasKeyboardShortcuts.ts
 * Keyboard shortcuts hook for canvas operations
 * Provides hotkeys for annotation tools, navigation, and canvas actions
 * RELEVANT FILES: AnnotationToolbar.tsx, DesignCanvas.tsx, useAccessibility.ts
 */

import { useEffect, useCallback } from 'react';
import type { AnnotationTool } from '@/packages/ui/components/canvas/AnnotationToolbar';

export interface CanvasKeyboardShortcutsConfig {
  // Annotation tools
  onCommentTool?: () => void;
  onNoteTool?: () => void;
  onLabelTool?: () => void;
  onArrowTool?: () => void;
  onHighlightTool?: () => void;
  onClearTool?: () => void;

  // Canvas actions
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFitView?: () => void;

  // Navigation
  onPanUp?: () => void;
  onPanDown?: () => void;
  onPanLeft?: () => void;
  onPanRight?: () => void;

  // Mode toggles
  onToggleGrid?: () => void;
  onToggleMinimap?: () => void;
  onTogglePlayfulMode?: () => void;

  // Other
  onSave?: () => void;
  onExport?: () => void;
  onHelp?: () => void;

  // Options
  enabled?: boolean;
  preventDefaultOnMatch?: boolean;
}

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: keyof CanvasKeyboardShortcutsConfig;
}

const shortcuts: KeyboardShortcut[] = [
  // Annotation tools
  { key: 'c', description: 'Comment tool', action: 'onCommentTool' },
  { key: 'n', description: 'Note tool', action: 'onNoteTool' },
  { key: 'l', description: 'Label tool', action: 'onLabelTool' },
  { key: 'a', description: 'Arrow tool', action: 'onArrowTool' },
  { key: 'h', description: 'Highlight tool', action: 'onHighlightTool' },
  { key: 'Escape', description: 'Clear tool selection', action: 'onClearTool' },

  // Canvas actions
  { key: 'z', ctrl: true, description: 'Undo', action: 'onUndo' },
  { key: 'z', ctrl: true, shift: true, description: 'Redo', action: 'onRedo' },
  { key: 'Delete', description: 'Delete selected', action: 'onDelete' },
  { key: 'Backspace', description: 'Delete selected', action: 'onDelete' },
  { key: 'd', ctrl: true, description: 'Duplicate selected', action: 'onDuplicate' },
  { key: 'a', ctrl: true, description: 'Select all', action: 'onSelectAll' },
  { key: 'Escape', description: 'Deselect all', action: 'onDeselectAll' },

  // Zoom controls
  { key: '=', ctrl: true, description: 'Zoom in', action: 'onZoomIn' },
  { key: '+', ctrl: true, description: 'Zoom in', action: 'onZoomIn' },
  { key: '-', ctrl: true, description: 'Zoom out', action: 'onZoomOut' },
  { key: '0', ctrl: true, description: 'Reset zoom', action: 'onZoomReset' },
  { key: 'f', ctrl: true, description: 'Fit view', action: 'onFitView' },

  // Navigation
  { key: 'ArrowUp', shift: true, description: 'Pan up', action: 'onPanUp' },
  { key: 'ArrowDown', shift: true, description: 'Pan down', action: 'onPanDown' },
  { key: 'ArrowLeft', shift: true, description: 'Pan left', action: 'onPanLeft' },
  { key: 'ArrowRight', shift: true, description: 'Pan right', action: 'onPanRight' },

  // Mode toggles
  { key: 'g', ctrl: true, description: 'Toggle grid', action: 'onToggleGrid' },
  { key: 'm', ctrl: true, description: 'Toggle minimap', action: 'onToggleMinimap' },
  { key: 'p', ctrl: true, shift: true, description: 'Toggle playful mode', action: 'onTogglePlayfulMode' },

  // Other
  { key: 's', ctrl: true, description: 'Save', action: 'onSave' },
  { key: 'e', ctrl: true, shift: true, description: 'Export', action: 'onExport' },
  { key: '?', shift: true, description: 'Show help', action: 'onHelp' },
  { key: '/', description: 'Show help', action: 'onHelp' },
];

/**
 * Hook for managing canvas keyboard shortcuts
 */
export function useCanvasKeyboardShortcuts(config: CanvasKeyboardShortcutsConfig) {
  const { enabled = true, preventDefaultOnMatch = true, ...handlers } = config;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !shortcut.ctrl || (event.ctrlKey || event.metaKey);
      const shiftMatches = !shortcut.shift || event.shiftKey;
      const altMatches = !shortcut.alt || event.altKey;
      const metaMatches = !shortcut.meta || event.metaKey;

      // Check if all modifiers match their expected state
      const ctrlCorrect = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const shiftCorrect = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altCorrect = shortcut.alt ? event.altKey : !event.altKey;

      return (
        keyMatches &&
        ctrlMatches &&
        shiftMatches &&
        altMatches &&
        metaMatches &&
        ctrlCorrect &&
        shiftCorrect &&
        altCorrect
      );
    });

    if (matchingShortcut) {
      const handler = handlers[matchingShortcut.action];
      if (typeof handler === 'function') {
        if (preventDefaultOnMatch) {
          event.preventDefault();
          event.stopPropagation();
        }
        handler();
      }
    }
  }, [enabled, preventDefaultOnMatch, handlers]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Get human-readable shortcut description
 */
export function getShortcutDescription(action: keyof CanvasKeyboardShortcutsConfig): string | null {
  const shortcut = shortcuts.find(s => s.action === action);
  if (!shortcut) return null;

  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('Cmd');
  parts.push(shortcut.key);

  return parts.join('+');
}

/**
 * Get all available shortcuts with descriptions
 */
export function getAllShortcuts(): Array<{
  action: keyof CanvasKeyboardShortcutsConfig;
  keys: string;
  description: string;
  category: string;
}> {
  const categorizedShortcuts = shortcuts.map(shortcut => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Cmd');
    parts.push(shortcut.key);

    let category = 'Other';
    if (shortcut.action.includes('Tool')) category = 'Annotation Tools';
    else if (shortcut.action.includes('Zoom')) category = 'Zoom';
    else if (shortcut.action.includes('Pan')) category = 'Navigation';
    else if (shortcut.action.includes('Toggle')) category = 'View Options';
    else if (['onUndo', 'onRedo', 'onDelete', 'onDuplicate'].includes(shortcut.action)) category = 'Editing';
    else if (['onSave', 'onExport'].includes(shortcut.action)) category = 'File';

    return {
      action: shortcut.action,
      keys: parts.join('+'),
      description: shortcut.description,
      category,
    };
  });

  // Remove duplicates (e.g., Delete and Backspace both do the same thing)
  const unique = categorizedShortcuts.reduce((acc, curr) => {
    const existing = acc.find(s => s.action === curr.action);
    if (!existing) {
      acc.push(curr);
    } else if (curr.keys.length < existing.keys.length) {
      // Keep the shorter key combination
      const index = acc.indexOf(existing);
      acc[index] = curr;
    }
    return acc;
  }, [] as typeof categorizedShortcuts);

  return unique;
}

export default useCanvasKeyboardShortcuts;
