/**
 * Global shortcuts management hook
 * Extracted from App.tsx to improve maintainability and reduce complexity
 */

import { useEffect, useCallback, useRef } from 'react';
import { getGlobalShortcutManager, KeyboardShortcutManager, ShortcutConfig } from '../lib/shortcuts/KeyboardShortcuts';
import { isTauriEnvironment, DEBUG, FEATURES } from '../lib/environment';
import { webNotificationManager } from '../services/web-fallback';

export interface GlobalShortcutHandlers {
  onCommandPalette?: () => void;
  onChallengeManager?: () => void;
  onAISettings?: () => void;
  onShortcutCustomization?: () => void;
  onNavigateToScreen?: (screen: string) => void;
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onToggleFullscreen?: () => void;
  onShowHelp?: () => void;
}

export interface ShortcutTrackingCallbacks {
  trackKeyboardShortcut?: (shortcut: string, action: string, success: boolean) => void;
  trackShortcutUsage?: (action: string, success: boolean, duration: number, category: string) => void;
  trackWorkflowAction?: (action: string, duration: number, success: boolean, context: string, metadata?: any) => void;
}

export interface UseGlobalShortcutsOptions {
  handlers: GlobalShortcutHandlers;
  tracking?: ShortcutTrackingCallbacks;
  currentScreen?: string;
  selectedChallenge?: any;
  disabled?: boolean;
}

export interface UseGlobalShortcutsReturn {
  manager: KeyboardShortcutManager | null;
  isEnabled: boolean;
  toggleShortcuts: (enabled: boolean) => void;
  temporarilyDisable: () => void;
  enable: () => void;
  registerShortcut: (config: ShortcutConfig) => () => boolean;
  unregisterShortcut: (key: string, modifiers?: string[]) => boolean;
  getRegisteredShortcuts: () => ShortcutConfig[];
}

/**
 * Hook for managing global keyboard shortcuts with environment awareness
 */
export const useGlobalShortcuts = (options: UseGlobalShortcutsOptions): UseGlobalShortcutsReturn => {
  const {
    handlers,
    tracking,
    currentScreen = '',
    selectedChallenge,
    disabled = false,
  } = options;

  const managerRef = useRef<KeyboardShortcutManager | null>(null);
  const shortcutRegistrationsRef = useRef<Set<string>>(new Set());

  // Initialize manager
  useEffect(() => {
    if (!isTauriEnvironment() && !FEATURES.KEYBOARD_SHORTCUTS) {
      console.info('Keyboard shortcuts not supported in this environment');
      return;
    }

    managerRef.current = getGlobalShortcutManager();
    
    if (managerRef.current) {
      DEBUG.logPerformance('shortcuts-initialized', performance.now(), {
        environment: isTauriEnvironment() ? 'tauri' : 'web',
        totalShortcuts: managerRef.current.getAllShortcuts().length,
      });
    }

    return () => {
      if (managerRef.current) {
        // Clean up custom registrations
        shortcutRegistrationsRef.current.forEach(shortcutKey => {
          const [key, ...modifiers] = shortcutKey.split('+');
          managerRef.current?.unregister(key, modifiers as any);
        });
        shortcutRegistrationsRef.current.clear();
      }
    };
  }, []);

  // Helper function for registering shortcuts with tracking
  const registerShortcut = useCallback((config: ShortcutConfig): () => boolean => {
    if (!managerRef.current) {
      console.warn('Shortcut manager not available');
      return () => false;
    }

    const originalAction = config.action;
    const enhancedAction = async (event?: KeyboardEvent) => {
      const startTime = performance.now();
      let success = true;
      let error: Error | null = null;

      try {
        DEBUG.logPerformance(`shortcut-${config.key}`, startTime);
        await originalAction(event);
        
        // Track successful shortcut usage
        if (tracking?.trackKeyboardShortcut) {
          const shortcutDisplay = `${config.modifiers?.join('+')}+${config.key}`;
          tracking.trackKeyboardShortcut(shortcutDisplay, config.description, true);
        }

        if (tracking?.trackShortcutUsage) {
          const duration = performance.now() - startTime;
          tracking.trackShortcutUsage(config.description, true, duration, config.category);
        }

        if (tracking?.trackWorkflowAction) {
          const duration = performance.now() - startTime;
          tracking.trackWorkflowAction(
            `shortcut_${config.key}`, 
            duration, 
            true, 
            currentScreen,
            { shortcut: config.description, category: config.category }
          );
        }

      } catch (err) {
        success = false;
        error = err as Error;
        console.error(`Shortcut execution failed for ${config.description}:`, err);

        // Track failed shortcut usage
        if (tracking?.trackKeyboardShortcut) {
          const shortcutDisplay = `${config.modifiers?.join('+')}+${config.key}`;
          tracking.trackKeyboardShortcut(shortcutDisplay, config.description, false);
        }

        // Show error notification if available
        if (FEATURES.NOTIFICATIONS) {
          await webNotificationManager.showNotification({
            title: 'Shortcut Error',
            body: `Failed to execute: ${config.description}`,
          });
        }
      }

      DEBUG.logPerformance(`shortcut-${config.key}`, performance.now(), { 
        success, 
        error: error?.message 
      });
    };

    const enhancedConfig = { ...config, action: enhancedAction };
    const unregister = managerRef.current.register(enhancedConfig);
    
    // Track registration for cleanup
    const shortcutKey = `${config.key}+${config.modifiers?.join('+') || ''}`;
    shortcutRegistrationsRef.current.add(shortcutKey);

    return () => {
      shortcutRegistrationsRef.current.delete(shortcutKey);
      return unregister();
    };
  }, [tracking, currentScreen]);

  // Register application-specific shortcuts
  useEffect(() => {
    if (!managerRef.current || disabled) return;

    const registrations: Array<() => boolean> = [];

    // Command palette shortcuts
    if (handlers.onCommandPalette) {
      registrations.push(
        registerShortcut({
          key: 'k',
          modifiers: ['ctrl'],
          description: 'Open command palette',
          category: 'general',
          action: handlers.onCommandPalette,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'k',
          modifiers: ['meta'],
          description: 'Open command palette',
          category: 'general',
          action: handlers.onCommandPalette,
        })
      );
    }

    // Challenge manager shortcuts
    if (handlers.onChallengeManager) {
      registrations.push(
        registerShortcut({
          key: 'c',
          modifiers: ['ctrl', 'shift'],
          description: 'Open challenge manager',
          category: 'general',
          action: handlers.onChallengeManager,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'c',
          modifiers: ['meta', 'shift'],
          description: 'Open challenge manager',
          category: 'general',
          action: handlers.onChallengeManager,
        })
      );
    }

    // AI settings shortcuts
    if (handlers.onAISettings) {
      registrations.push(
        registerShortcut({
          key: ',',
          modifiers: ['ctrl'],
          description: 'Open AI settings',
          category: 'general',
          action: handlers.onAISettings,
        })
      );

      registrations.push(
        registerShortcut({
          key: ',',
          modifiers: ['meta'],
          description: 'Open AI settings',
          category: 'general',
          action: handlers.onAISettings,
        })
      );
    }

    // Shortcut customization
    if (handlers.onShortcutCustomization) {
      registrations.push(
        registerShortcut({
          key: 'h',
          modifiers: ['ctrl', 'shift'],
          description: 'Open shortcut customization',
          category: 'general',
          action: handlers.onShortcutCustomization,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'h',
          modifiers: ['meta', 'shift'],
          description: 'Open shortcut customization',
          category: 'general',
          action: handlers.onShortcutCustomization,
        })
      );
    }

    // Navigation shortcuts
    if (handlers.onNavigateToScreen) {
      const navigationShortcuts = [
        { key: '1', screen: 'challenge-selection', name: 'challenge selection' },
        { key: '2', screen: 'design-canvas', name: 'design canvas' },
        { key: '3', screen: 'audio-recording', name: 'audio recording' },
        { key: '4', screen: 'review', name: 'review' },
      ];

      navigationShortcuts.forEach(({ key, screen, name }) => {
        registrations.push(
          registerShortcut({
            key,
            modifiers: ['alt'],
            description: `Navigate to ${name}`,
            category: 'navigation',
            action: () => handlers.onNavigateToScreen!(screen),
          })
        );
      });
    }

    // Project shortcuts
    if (handlers.onNewProject) {
      registrations.push(
        registerShortcut({
          key: 'n',
          modifiers: ['ctrl'],
          description: 'Create new project',
          category: 'project',
          action: handlers.onNewProject,
        })
      );
    }

    if (handlers.onOpenProject) {
      registrations.push(
        registerShortcut({
          key: 'o',
          modifiers: ['ctrl'],
          description: 'Open project',
          category: 'project',
          action: handlers.onOpenProject,
        })
      );
    }

    if (handlers.onSaveProject) {
      registrations.push(
        registerShortcut({
          key: 's',
          modifiers: ['ctrl'],
          description: 'Save project',
          category: 'project',
          action: handlers.onSaveProject,
        })
      );

      registrations.push(
        registerShortcut({
          key: 's',
          modifiers: ['meta'],
          description: 'Save project',
          category: 'project',
          action: handlers.onSaveProject,
        })
      );
    }

    // Undo/Redo shortcuts
    if (handlers.onUndo) {
      registrations.push(
        registerShortcut({
          key: 'z',
          modifiers: ['ctrl'],
          description: 'Undo',
          category: 'general',
          action: handlers.onUndo,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'z',
          modifiers: ['meta'],
          description: 'Undo',
          category: 'general',
          action: handlers.onUndo,
        })
      );
    }

    if (handlers.onRedo) {
      registrations.push(
        registerShortcut({
          key: 'y',
          modifiers: ['ctrl'],
          description: 'Redo',
          category: 'general',
          action: handlers.onRedo,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'z',
          modifiers: ['ctrl', 'shift'],
          description: 'Redo',
          category: 'general',
          action: handlers.onRedo,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'z',
          modifiers: ['meta', 'shift'],
          description: 'Redo',
          category: 'general',
          action: handlers.onRedo,
        })
      );
    }

    // Utility shortcuts
    if (handlers.onSearch) {
      registrations.push(
        registerShortcut({
          key: 'f',
          modifiers: ['ctrl'],
          description: 'Search',
          category: 'general',
          action: handlers.onSearch,
        })
      );

      registrations.push(
        registerShortcut({
          key: 'f',
          modifiers: ['meta'],
          description: 'Search',
          category: 'general',
          action: handlers.onSearch,
        })
      );
    }

    if (handlers.onToggleFullscreen && isTauriEnvironment()) {
      registrations.push(
        registerShortcut({
          key: 'F11',
          description: 'Toggle fullscreen',
          category: 'system',
          action: handlers.onToggleFullscreen,
        })
      );
    }

    if (handlers.onShowHelp) {
      registrations.push(
        registerShortcut({
          key: '?',
          modifiers: ['shift'],
          description: 'Show help',
          category: 'system',
          action: handlers.onShowHelp,
        })
      );
    }

    // Cleanup function
    return () => {
      registrations.forEach(unregister => unregister());
    };
  }, [
    handlers,
    registerShortcut,
    disabled,
    selectedChallenge,
    currentScreen,
  ]);

  // Control functions
  const toggleShortcuts = useCallback((enabled: boolean) => {
    managerRef.current?.setEnabled(enabled);
  }, []);

  const temporarilyDisable = useCallback(() => {
    managerRef.current?.temporarilyDisableShortcuts();
  }, []);

  const enable = useCallback(() => {
    managerRef.current?.enableShortcuts();
  }, []);

  const unregisterShortcut = useCallback((key: string, modifiers?: string[]) => {
    if (!managerRef.current) return false;
    return managerRef.current.unregister(key, modifiers as any);
  }, []);

  const getRegisteredShortcuts = useCallback((): ShortcutConfig[] => {
    return managerRef.current?.getAllShortcuts() || [];
  }, []);

  return {
    manager: managerRef.current,
    isEnabled: !disabled && FEATURES.KEYBOARD_SHORTCUTS,
    toggleShortcuts,
    temporarilyDisable,
    enable,
    registerShortcut,
    unregisterShortcut,
    getRegisteredShortcuts,
  };
};