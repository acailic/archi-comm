/**
 * ArchiComm Ultra-Optimized Keyboard Shortcuts System
 * Designed for maximum productivity and efficiency
 *
 * Shortcut key assignments (no duplicates):
 * Alt+C: Add component
 * Ctrl+Shift+C: Add comment
 * Alt+N: Add note
 * (see initializeDefaultShortcuts for more)
 */

// Only canonical modifiers; 'cmd' is normalized to 'meta'
export type KeyModifier = 'ctrl' | 'meta' | 'alt' | 'shift';
export type ShortcutCategory = 'general' | 'canvas' | 'components' | 'navigation' | 'project' | 'system' | 'tools';

export interface ShortcutConfig {
  key: string;
  description: string;
  category: ShortcutCategory;
  action: (event?: KeyboardEvent) => void | Promise<void>;
  modifiers?: KeyModifier[];
  preventDefault?: boolean;
  global?: boolean;
}

export class KeyboardShortcutManager {
  // Map from normalized shortcut key to a single ShortcutConfig handler (no duplicates)
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private isEnabled = true;
  private changeListeners: Set<() => void> = new Set();
  private shortcutsVersion = 0;
  private autoSetup: boolean;

  constructor(options: { autoSetup?: boolean } = { autoSetup: true }) {
    this.autoSetup = options.autoSetup !== false;
    this.handleKeyDown = this.handleKeyDown.bind(this);

    if (this.autoSetup && typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.initializeDefaultShortcuts();
      this.attachEventListeners();
    }
  }

  /**
   * Register a new keyboard shortcut. Returns an unregister function.
   * Warns if overwriting an existing shortcut in debug mode.
   */
  register(config: ShortcutConfig): () => boolean {
    const shortcutKey = this.generateShortcutKey(config.key, config.modifiers);
    if (this.debugMode && this.shortcuts.has(shortcutKey)) {
      console.warn(`Overwriting existing shortcut for ${shortcutKey}`);
    }
    this.shortcuts.set(shortcutKey, config);
    this.notifyChange();
    // Return unregister function
    return () => this.unregister(config.key, config.modifiers);
  }

  /**
   * Unregister a keyboard shortcut. Returns true if removed, false if not found.
   */
  unregister(key: string, modifiers?: KeyModifier[]): boolean {
    const shortcutKey = this.generateShortcutKey(key, modifiers);
    const removed = this.shortcuts.delete(shortcutKey);
    if (removed) this.notifyChange();
    return removed;
  }

  /**
   * Enable/disable the shortcut system
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Temporarily disable shortcuts (useful when modals/overlays are open)
   */
  private temporarilyDisabled = false;
  
  temporarilyDisableShortcuts(): void {
    this.temporarilyDisabled = true;
  }

  enableShortcuts(): void {
    this.temporarilyDisabled = false;
  }

  /**
   * Get all shortcuts by category
   */
  getShortcutsByCategory(category: ShortcutCategory): ShortcutConfig[] {
    // Only single ShortcutConfig per key; filter after flattening
    return Array.from(this.shortcuts.values()).filter(shortcut => shortcut.category === category);
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): ShortcutConfig[] {
    // Only single ShortcutConfig per key
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get current shortcuts version for change tracking
   */
  getShortcutsVersion(): number {
    return this.shortcutsVersion;
  }

  /**
   * Subscribe to shortcut changes
   */
  onShortcutsChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  /**
   * Notify listeners of shortcut changes
   */
  private notifyChange(): void {
    this.shortcutsVersion++;
    this.changeListeners.forEach(callback => callback());
  }

  /**
   * Debug mode for development
   */
  private debugMode = process.env.NODE_ENV === 'development';

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Handle keyboard events with high performance
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled || this.temporarilyDisabled) return;
    if (event.isComposing) return; // Prevent shortcut execution during IME composition

    // Skip if user is typing in input fields
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) return;

    const shortcutKey = this.generateShortcutKeyFromEvent(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut) {
      if (this.debugMode) {
        console.log(`Executing shortcut: ${shortcut.description} (${shortcutKey})`);
      }
      
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // Execute with performance monitoring
      try {
        shortcut.action();
      } catch (error) {
        console.error('Shortcut execution error:', error);
      }
    }
  }

  private attachEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private detachEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      element.contentEditable === 'true' ||
      element.isContentEditable ||
      element.hasAttribute('data-keyboard-ignore') ||
      element.closest('[data-keyboard-ignore]') !== null
    );
  }

  private generateShortcutKey(key: string, modifiers?: KeyModifier[]): string {
    const mods = modifiers?.sort().join('+') || '';
    return mods ? `${mods}+${key.toLowerCase()}` : key.toLowerCase();
  }

  private generateShortcutKeyFromEvent(event: KeyboardEvent): string {
    const modifiers: KeyModifier[] = [];
    
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.metaKey) modifiers.push('meta');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');

    return this.generateShortcutKey(event.key, modifiers);
  }

  private initializeDefaultShortcuts(): void {
    // General shortcuts
    this.register({
      key: 'n',
      modifiers: ['ctrl'],
      description: 'Create new project',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:new-project')); }
    });

    this.register({
      key: 'o',
      modifiers: ['ctrl'],
      description: 'Open project',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:open-project')); }
    });

    this.register({
      key: 's',
      modifiers: ['ctrl'],
      description: 'Save project',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:save-project')); }
    });

    this.register({
      key: ',',
      modifiers: ['ctrl'],
      description: 'AI Settings',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:ai-settings')); }
    });

    // 'Add component': Alt+C, 'Add comment': Ctrl+Shift+C (no conflicts)
    this.register({
      key: 'c',
      modifiers: ['alt'],
      description: 'Add component',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-component')); }
    });

    this.register({
      key: 'c',
      modifiers: ['ctrl', 'shift'],
      description: 'Add comment',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-comment')); }
    });

    this.register({
      key: 'z',
      modifiers: ['ctrl'],
      description: 'Undo',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:undo')); }
    });

    this.register({
      key: 'y',
      modifiers: ['ctrl'],
      description: 'Redo',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:redo')); }
    });

    this.register({
      key: 'z',
      modifiers: ['ctrl', 'shift'],
      description: 'Redo',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:redo')); }
    });

    // Canvas shortcuts
    this.register({
      key: 'c',
      modifiers: ['alt'],
      description: 'Add component',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-component')); }
    });

    this.register({
      key: 'l',
      modifiers: ['alt'],
      description: 'Add connection',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-connection')); }
    });

    this.register({
      key: 'Delete',
      description: 'Delete selected',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:delete-selected')); }
    });

    this.register({
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Select all',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:select-all')); }
    });

    this.register({
      key: 'Escape',
      description: 'Clear selection',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:clear-selection')); }
    });

    // Comment shortcuts
    this.register({
      key: 'c',
      description: 'Add comment',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-comment')); }
    });

    this.register({
      key: 'n',
      modifiers: ['alt'],
      description: 'Add note',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-note')); }
    });

    this.register({
      key: 'l',
      modifiers: ['shift'],
      description: 'Add label',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-label')); }
    });

    this.register({
      key: 'a',
      modifiers: ['shift'],
      description: 'Add arrow',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-arrow')); }
    });

    this.register({
      key: 'h',
      modifiers: ['shift'],
      description: 'Add highlight',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:add-highlight')); }
    });

    // Component shortcuts
    this.register({
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Duplicate selected',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:duplicate')); }
    });

    this.register({
      key: 'g',
      modifiers: ['ctrl'],
      description: 'Group selected',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:group')); }
    });

    this.register({
      key: 'u',
      modifiers: ['ctrl'],
      description: 'Ungroup selected',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:ungroup')); }
    });

    // Navigation shortcuts
    this.register({
      key: 'f',
      modifiers: ['ctrl'],
      description: 'Find/Search',
      category: 'navigation',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:search')); }
    });

    this.register({
      key: '1',
      modifiers: ['ctrl'],
      description: 'Switch to Canvas view',
      category: 'navigation',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:view-canvas')); }
    });

    this.register({
      key: '2',
      modifiers: ['ctrl'],
      description: 'Switch to Component palette',
      category: 'navigation',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:view-components')); }
    });

    this.register({
      key: '3',
      modifiers: ['ctrl'],
      description: 'Switch to Project view',
      category: 'navigation',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:view-project')); }
    });

    // Zoom and pan
    this.register({
      key: 'Equal',
      modifiers: ['ctrl'],
      description: 'Zoom in',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:zoom-in')); }
    });

    this.register({
      key: 'Minus',
      modifiers: ['ctrl'],
      description: 'Zoom out',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:zoom-out')); }
    });

    this.register({
      key: '0',
      modifiers: ['ctrl'],
      description: 'Reset zoom',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:zoom-reset')); }
    });

    // System shortcuts
    this.register({
      key: '?',
      modifiers: ['shift'],
      description: 'Show shortcuts help',
      category: 'system',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:show-help')); }
    });

    this.register({
      key: 'F11',
      description: 'Toggle fullscreen',
      category: 'system',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:toggle-fullscreen')); }
    });

    // Arrow key navigation
    this.register({
      key: 'ArrowUp',
      description: 'Move up',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:move-up')); }
    });

    this.register({
      key: 'ArrowDown',
      description: 'Move down',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:move-down')); }
    });

    this.register({
      key: 'ArrowLeft',
      description: 'Move left',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:move-left')); }
    });

    this.register({
      key: 'ArrowRight',
      description: 'Move right',
      category: 'canvas',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:move-right')); }
    });

    // Tool selection shortcuts
    this.register({
      key: 'v',
      description: 'Select tool',
      category: 'tools',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:tool-select')); }
    });

    this.register({
      key: 'h',
      description: 'Pan tool',
      category: 'tools',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:tool-pan')); }
    });

    this.register({
      key: 'z',
      description: 'Zoom tool',
      category: 'tools',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:tool-zoom')); }
    });

    this.register({
      key: 'a',
      description: 'Annotate tool',
      category: 'tools',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:tool-annotate')); }
    });

    // Context menu shortcuts
    this.register({
      key: 'F2',
      description: 'Edit properties',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:edit-properties')); }
    });

    this.register({
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Duplicate',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:duplicate')); }
    });

    this.register({
      key: 'c',
      modifiers: ['ctrl'],
      description: 'Copy',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:copy')); }
    });

    this.register({
      key: 'v',
      modifiers: ['ctrl'],
      description: 'Paste',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:paste')); }
    });

    this.register({
      key: ']',
      modifiers: ['ctrl', 'shift'],
      description: 'Bring to front',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:bring-to-front')); }
    });

    this.register({
      key: '[',
      modifiers: ['ctrl', 'shift'],
      description: 'Send to back',
      category: 'components',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:send-to-back')); }
    });

    this.register({
      key: 'F10',
      modifiers: ['shift'],
      description: 'Show context menu',
      category: 'general',
      action: () => { void window.dispatchEvent(new CustomEvent('shortcut:show-context-menu')); }
    });
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.detachEventListeners();
    this.shortcuts.clear();
    this.changeListeners.clear(); // Clear listeners to prevent memory leaks
  }
}

// React hook for using keyboard shortcuts
import { useEffect, useRef } from 'react';

/**
 * React hook for using keyboard shortcuts.
 * Note: The returned manager may be null on first render; consumers should handle this case.
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const managerRef = useRef<KeyboardShortcutManager | null>(new KeyboardShortcutManager());

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    // Register custom shortcuts
    shortcuts.forEach(shortcut => {
      manager.register(shortcut);
    });

    return () => {
      // Cleanup custom shortcuts
      shortcuts.forEach(shortcut => {
        manager.unregister(shortcut.key, shortcut.modifiers);
      });
    };
  }, [shortcuts]);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, []);

  return managerRef.current;
};

// Global keyboard shortcut manager instance - lazy singleton
let _globalShortcutManager: KeyboardShortcutManager | null = null;

export const getGlobalShortcutManager = (): KeyboardShortcutManager | null => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  
  if (!_globalShortcutManager) {
    _globalShortcutManager = new KeyboardShortcutManager();
  }
  
  return _globalShortcutManager;
};

// Utility functions for formatted shortcut display
export const formatShortcutKey = (key: string, modifiers?: KeyModifier[]): string => {
  // Defensive check for navigator
  let isMac = false;
  if (typeof navigator !== 'undefined' && navigator.platform) {
    isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }
  // Only valid KeyModifier keys
  const modifierSymbols: Record<KeyModifier, string> = {
    ctrl: isMac ? '⌃' : 'Ctrl',
    meta: isMac ? '⌘' : 'Meta',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
  };
  const canonicalOrder: KeyModifier[] = ['ctrl', 'meta', 'alt', 'shift'];
  const ordered = modifiers
    ? [...modifiers].sort((a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b))
    : [];
  // Provide fallback for missing modifier keys
  const formattedModifiers = ordered.map(mod => modifierSymbols[mod] ?? mod) || [];
  // Normalize key casing: capitalize first letter, except for special keys
  let formattedKey = key === ' ' ? 'Space' : key;
  if (formattedKey.length === 1) {
    formattedKey = formattedKey.toUpperCase();
  }
  return [...formattedModifiers, formattedKey].join(isMac ? '' : '+');
};

export const getShortcutsByCategory = (category: ShortcutCategory): ShortcutConfig[] => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.getShortcutsByCategory(category) : [];
};

export const getAllShortcuts = (): ShortcutConfig[] => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.getAllShortcuts() : [];
};

export const getShortcutsVersion = (): number => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.getShortcutsVersion() : 0;
};

export const onShortcutsChange = (callback: () => void): () => void => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.onShortcutsChange(callback) : () => false;
};