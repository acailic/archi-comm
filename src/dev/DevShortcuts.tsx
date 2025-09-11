// src/dev/DevShortcuts.tsx
// Development-specific keyboard shortcuts hook for scenario viewer functionality  
// Extends the global shortcuts system with dev-only shortcuts for demo mode, reset, scenarios, and navigation
// RELEVANT FILES: ../hooks/useGlobalShortcuts.ts, ./ScenarioViewer.tsx, ./DevUtilities.tsx, ../lib/environment.ts

import { useEffect, useCallback, useRef, useState } from 'react';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { isDevelopment } from '../lib/environment';

export interface DevShortcutHandlers {
  onToggleScenarios?: () => void;
  onToggleDemoMode?: () => void;
  onReset?: () => void;
  onToggleStateInspector?: () => void;
  onTogglePropsViewer?: () => void;
  onSearch?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  onClearSelection?: () => void;
  onSelectCategory?: (categoryIndex: number) => void;
  onToggleTheme?: () => void;
  onToggleControls?: () => void;
  onResetProps?: () => void;
  onCopyProps?: () => void;
}

export interface DevShortcutCallbacks {
  onShortcutUsage?: (shortcut: string, action: string) => void;
}

export interface UseDevShortcutsOptions {
  handlers: DevShortcutHandlers;
  callbacks?: DevShortcutCallbacks;
  enabled?: boolean;
  scenarioViewerActive?: boolean;
}

export interface UseDevShortcutsReturn {
  isEnabled: boolean;
  isDemoMode: boolean;
  isStateInspectorOpen: boolean;
  isPropsViewerOpen: boolean;
  isControlsOpen: boolean;
  currentTheme: string | undefined;
  toggleDemoMode: () => void;
  toggleStateInspector: () => void;
  togglePropsViewer: () => void;
  toggleControls: () => void;
  toggleTheme: () => void;
}

/**
 * Development shortcuts hook that provides scenario viewer specific keyboard shortcuts
 * Only active in development mode and when scenario viewer is enabled
 */
export const useDevShortcuts = (
  options: UseDevShortcutsOptions
): UseDevShortcutsReturn => {
  const { handlers, callbacks, enabled = true, scenarioViewerActive = false } = options;
  
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isStateInspectorOpen, setIsStateInspectorOpen] = useState(false);
  const [isPropsViewerOpen, setIsPropsViewerOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Only register shortcuts in development mode
  const isDevEnabled = isDevelopment() && enabled;
  
  // Demo mode functionality
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => !prev);
    callbacks?.onShortcutUsage?.('Ctrl+Shift+D', 'toggle_demo_mode');
    
    if (handlers.onToggleDemoMode) {
      handlers.onToggleDemoMode();
    }
  }, [handlers.onToggleDemoMode, callbacks]);
  
  // State inspector functionality
  const toggleStateInspector = useCallback(() => {
    setIsStateInspectorOpen(prev => !prev);
    callbacks?.onShortcutUsage?.('Ctrl+Shift+I', 'toggle_state_inspector');
    
    if (handlers.onToggleStateInspector) {
      handlers.onToggleStateInspector();
    }
  }, [handlers.onToggleStateInspector, callbacks]);
  
  // Props viewer functionality
  const togglePropsViewer = useCallback(() => {
    setIsPropsViewerOpen(prev => !prev);
    callbacks?.onShortcutUsage?.('Ctrl+Shift+P', 'toggle_props_viewer');
    
    if (handlers.onTogglePropsViewer) {
      handlers.onTogglePropsViewer();
    }
  }, [handlers.onTogglePropsViewer, callbacks]);

  // Controls functionality
  const toggleControls = useCallback(() => {
    setIsControlsOpen(prev => !prev);
    callbacks?.onShortcutUsage?.('c', 'toggle_controls');
    
    if (handlers.onToggleControls) {
      handlers.onToggleControls();
    }
  }, [handlers.onToggleControls, callbacks]);

  // Theme functionality
  const toggleTheme = useCallback(() => {
    callbacks?.onShortcutUsage?.('t', 'toggle_theme');
    
    if (handlers.onToggleTheme) {
      handlers.onToggleTheme();
    }
  }, [handlers.onToggleTheme, callbacks]);

  // Global shortcuts integration
  const globalShortcuts = useGlobalShortcuts({
    handlers: {
      // Add development shortcuts to global handlers
      onSearch: handlers.onSearch,
    },
    disabled: !isDevEnabled,
  });

  // Register development-specific shortcuts
  useEffect(() => {
    if (!isDevEnabled || !globalShortcuts.manager) return;

    const registrations: Array<() => boolean> = [];

    // Scenario viewer shortcuts
    if (handlers.onToggleScenarios) {
      registrations.push(
        globalShortcuts.registerShortcut({
          key: 's',
          modifiers: ['ctrl', 'shift'],
          description: 'Toggle scenario viewer',
          category: 'development',
          action: handlers.onToggleScenarios,
          preventDefault: true,
        })
      );
    }

    // Demo mode shortcuts
    if (handlers.onToggleDemoMode) {
      registrations.push(
        globalShortcuts.registerShortcut({
          key: 'd',
          modifiers: ['ctrl', 'shift'],
          description: 'Toggle demo mode',
          category: 'development',
          action: toggleDemoMode,
          preventDefault: true,
        })
      );
    }

    // Reset shortcuts
    if (handlers.onReset) {
      registrations.push(
        globalShortcuts.registerShortcut({
          key: 'r',
          modifiers: ['ctrl', 'shift'],
          description: 'Reset scenario viewer',
          category: 'development',
          action: handlers.onReset,
          preventDefault: true,
        })
      );
    }

    // State inspector shortcuts
    if (handlers.onToggleStateInspector) {
      registrations.push(
        globalShortcuts.registerShortcut({
          key: 'i',
          modifiers: ['ctrl', 'shift'],
          description: 'Toggle state inspector',
          category: 'development',
          action: toggleStateInspector,
          preventDefault: true,
        })
      );
    }

    // Props viewer shortcuts
    if (handlers.onTogglePropsViewer) {
      registrations.push(
        globalShortcuts.registerShortcut({
          key: 'p',
          modifiers: ['ctrl', 'shift'],
          description: 'Toggle props viewer',
          category: 'development',
          action: togglePropsViewer,
          preventDefault: true,
        })
      );
    }

    // Only register scenario-specific shortcuts when scenario viewer is active
    if (scenarioViewerActive) {
      // Navigation shortcuts
      if (handlers.onNavigateNext) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'ArrowRight',
            description: 'Navigate to next scenario',
            category: 'development',
            action: handlers.onNavigateNext,
            preventDefault: true,
          })
        );
        
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'ArrowDown',
            description: 'Navigate to next scenario',
            category: 'development',
            action: handlers.onNavigateNext,
            preventDefault: true,
          })
        );
      }

      if (handlers.onNavigatePrevious) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'ArrowLeft',
            description: 'Navigate to previous scenario',
            category: 'development',
            action: handlers.onNavigatePrevious,
            preventDefault: true,
          })
        );
        
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'ArrowUp',
            description: 'Navigate to previous scenario',
            category: 'development',
            action: handlers.onNavigatePrevious,
            preventDefault: true,
          })
        );
      }

      // Clear selection shortcut
      if (handlers.onClearSelection) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'Escape',
            description: 'Clear scenario selection',
            category: 'development',
            action: handlers.onClearSelection,
            preventDefault: true,
          })
        );
      }

      // Quick category selection (1-9 keys)
      if (handlers.onSelectCategory) {
        for (let i = 1; i <= 9; i++) {
          registrations.push(
            globalShortcuts.registerShortcut({
              key: i.toString(),
              description: `Select category ${i}`,
              category: 'development',
              action: () => handlers.onSelectCategory!(i - 1),
              preventDefault: true,
            })
          );
        }
      }

      // Search shortcut (Ctrl+F)
      if (handlers.onSearch) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'f',
            modifiers: ['ctrl'],
            description: 'Search scenarios',
            category: 'development',
            action: handlers.onSearch,
            preventDefault: true,
          })
        );
      }

      // Theme toggle shortcut (T)
      if (handlers.onToggleTheme) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 't',
            description: 'Toggle theme',
            category: 'development',
            action: toggleTheme,
            preventDefault: true,
          })
        );
      }

      // Controls toggle shortcut (C)
      if (handlers.onToggleControls) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'c',
            description: 'Toggle prop controls',
            category: 'development',
            action: toggleControls,
            preventDefault: true,
          })
        );
      }

      // Reset props shortcut (Shift+R)
      if (handlers.onResetProps) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'r',
            modifiers: ['shift'],
            description: 'Reset scenario props',
            category: 'development',
            action: handlers.onResetProps,
            preventDefault: true,
          })
        );
      }

      // Copy props shortcut (Shift+C)
      if (handlers.onCopyProps) {
        registrations.push(
          globalShortcuts.registerShortcut({
            key: 'c',
            modifiers: ['shift'],
            description: 'Copy current props',
            category: 'development',
            action: handlers.onCopyProps,
            preventDefault: true,
          })
        );
      }
    }

    // Cleanup function
    return () => {
      registrations.forEach(unregister => {
        try {
          unregister();
        } catch (error) {
          console.warn('Failed to unregister dev shortcut:', error);
        }
      });
    };
  }, [
    isDevEnabled,
    scenarioViewerActive,
    globalShortcuts.manager,
    globalShortcuts.registerShortcut,
    handlers,
    toggleDemoMode,
    toggleStateInspector,
    togglePropsViewer,
    toggleControls,
    toggleTheme,
  ]);

  // Demo mode interval management
  useEffect(() => {
    if (isDemoMode && scenarioViewerActive && handlers.onNavigateNext) {
      // Auto-cycle through scenarios every 3 seconds
      demoIntervalRef.current = setInterval(() => {
        handlers.onNavigateNext!();
      }, 3000);
    } else {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    }

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    };
  }, [isDemoMode, scenarioViewerActive, handlers.onNavigateNext]);

  return {
    isEnabled: isDevEnabled,
    isDemoMode,
    isStateInspectorOpen,
    isPropsViewerOpen,
    isControlsOpen,
    currentTheme,
    toggleDemoMode,
    toggleStateInspector,
    togglePropsViewer,
    toggleControls,
    toggleTheme,
  };
};

