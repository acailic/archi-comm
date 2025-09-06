/**
 * ArchiComm Ultra-Optimized Keyboard Shortcuts System
 * Designed for maximum productivity and efficiency
 */

export interface ShortcutConfig {
  key: string;
  description: string;
  action: () => void;
  category: ShortcutCategory;
  modifiers?: KeyModifier[];
  preventDefault?: boolean;
  global?: boolean;
}

export type KeyModifier = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta';
export type ShortcutCategory = 'general' | 'canvas' | 'components' | 'navigation' | 'project' | 'system';

export class KeyboardShortcutManager {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private activeElement: HTMLElement | null = null;
  private isEnabled = true;
  private listeners: Map<string, EventListener> = new Map();

  constructor() {
    this.initializeDefaultShortcuts();
    this.attachEventListeners();
  }

  /**
   * Register a new keyboard shortcut
   */
  register(config: ShortcutConfig): void {
    const shortcutKey = this.generateShortcutKey(config.key, config.modifiers);
    this.shortcuts.set(shortcutKey, config);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string, modifiers?: KeyModifier[]): void {
    const shortcutKey = this.generateShortcutKey(key, modifiers);
    this.shortcuts.delete(shortcutKey);
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
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === category);
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
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
  private handleKeyDown = (event: KeyboardEvent): void {
    if (!this.isEnabled || this.temporarilyDisabled) return;

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
  };

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
      action: () => window.dispatchEvent(new CustomEvent('shortcut:new-project'))
    });

    this.register({
      key: 'o',
      modifiers: ['ctrl'],
      description: 'Open project',
      category: 'general',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:open-project'))
    });

    this.register({
      key: 's',
      modifiers: ['ctrl'],
      description: 'Save project',
      category: 'general',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:save-project'))
    });

    this.register({
      key: 'z',
      modifiers: ['ctrl'],
      description: 'Undo',
      category: 'general',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:undo'))
    });

    this.register({
      key: 'y',
      modifiers: ['ctrl'],
      description: 'Redo',
      category: 'general',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:redo'))
    });

    // Canvas shortcuts
    this.register({
      key: 'c',
      modifiers: ['alt'],
      description: 'Add component',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-component'))
    });

    this.register({
      key: 'l',
      modifiers: ['alt'],
      description: 'Add connection',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-connection'))
    });

    this.register({
      key: 'Delete',
      description: 'Delete selected',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:delete-selected'))
    });

    this.register({
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Select all',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:select-all'))
    });

    this.register({
      key: 'Escape',
      description: 'Clear selection',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:clear-selection'))
    });

    // Comment shortcuts
    this.register({
      key: 'c',
      description: 'Add comment',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-comment'))
    });

    this.register({
      key: 'n',
      modifiers: ['alt'],
      description: 'Add note',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-note'))
    });

    this.register({
      key: 'l',
      modifiers: ['shift'],
      description: 'Add label',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-label'))
    });

    this.register({
      key: 'a',
      modifiers: ['shift'],
      description: 'Add arrow',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-arrow'))
    });

    this.register({
      key: 'h',
      modifiers: ['shift'],
      description: 'Add highlight',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:add-highlight'))
    });

    // Component shortcuts
    this.register({
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Duplicate selected',
      category: 'components',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:duplicate'))
    });

    this.register({
      key: 'g',
      modifiers: ['ctrl'],
      description: 'Group selected',
      category: 'components',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:group'))
    });

    this.register({
      key: 'u',
      modifiers: ['ctrl'],
      description: 'Ungroup selected',
      category: 'components',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:ungroup'))
    });

    // Navigation shortcuts
    this.register({
      key: 'f',
      modifiers: ['ctrl'],
      description: 'Find/Search',
      category: 'navigation',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:search'))
    });

    this.register({
      key: '1',
      modifiers: ['ctrl'],
      description: 'Switch to Canvas view',
      category: 'navigation',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:view-canvas'))
    });

    this.register({
      key: '2',
      modifiers: ['ctrl'],
      description: 'Switch to Component palette',
      category: 'navigation',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:view-components'))
    });

    this.register({
      key: '3',
      modifiers: ['ctrl'],
      description: 'Switch to Project view',
      category: 'navigation',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:view-project'))
    });

    // Zoom and pan
    this.register({
      key: 'Equal',
      modifiers: ['ctrl'],
      description: 'Zoom in',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:zoom-in'))
    });

    this.register({
      key: 'Minus',
      modifiers: ['ctrl'],
      description: 'Zoom out',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:zoom-out'))
    });

    this.register({
      key: '0',
      modifiers: ['ctrl'],
      description: 'Reset zoom',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:zoom-reset'))
    });

    // System shortcuts
    this.register({
      key: '?',
      modifiers: ['shift'],
      description: 'Show shortcuts help',
      category: 'system',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:show-help'))
    });

    this.register({
      key: 'F11',
      description: 'Toggle fullscreen',
      category: 'system',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:toggle-fullscreen'))
    });

    // Arrow key navigation
    this.register({
      key: 'ArrowUp',
      description: 'Move up',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:move-up'))
    });

    this.register({
      key: 'ArrowDown',
      description: 'Move down',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:move-down'))
    });

    this.register({
      key: 'ArrowLeft',
      description: 'Move left',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:move-left'))
    });

    this.register({
      key: 'ArrowRight',
      description: 'Move right',
      category: 'canvas',
      action: () => window.dispatchEvent(new CustomEvent('shortcut:move-right'))
    });
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.detachEventListeners();
    this.shortcuts.clear();
  }
}

// React hook for using keyboard shortcuts
import { useEffect, useRef } from 'react';

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const managerRef = useRef<KeyboardShortcutManager | null>(null);

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new KeyboardShortcutManager();
    }

    const manager = managerRef.current;

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

// Global keyboard shortcut manager instance
export const globalShortcutManager = new KeyboardShortcutManager();

// Utility functions for formatted shortcut display
export const formatShortcutKey = (key: string, modifiers?: KeyModifier[]): string => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const modifierSymbols = {
    ctrl: isMac ? '⌃' : 'Ctrl',
    cmd: '⌘',
    meta: isMac ? '⌘' : 'Win',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift'
  };

  const formattedModifiers = modifiers?.map(mod => modifierSymbols[mod]) || [];
  const formattedKey = key === ' ' ? 'Space' : key;
  
  return [...formattedModifiers, formattedKey].join(isMac ? '' : '+');
};

export const getShortcutsByCategory = (category: ShortcutCategory): ShortcutConfig[] => {
  return globalShortcutManager.getShortcutsByCategory(category);
};

export const getAllShortcuts = (): ShortcutConfig[] => {
  return globalShortcutManager.getAllShortcuts();
};