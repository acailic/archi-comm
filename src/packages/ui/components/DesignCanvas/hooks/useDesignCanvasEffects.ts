// src/components/DesignCanvas/hooks/useDesignCanvasEffects.ts
// Side effects and useEffect hooks for DesignCanvas component
// Handles auto-save, keyboard shortcuts, theme loading, and navigation events
// RELEVANT FILES: DesignCanvasCore.tsx, ../../../hooks/useDebounce.ts, ../../../hooks/useAppStore.ts, ImportExportDropdown.tsx

import { useAppStore } from '@/hooks/useAppStore';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useImportExportShortcuts } from '@ui/components/ImportExportDropdown';
import type { DesignData } from '@/shared/contracts';
import { useCanvasActions } from '@/stores/canvasStore';
import { useCallback, useEffect, useRef } from 'react';

interface DesignCanvasEffectsProps {
  components: any[];
  connections: any[];
  infoCards: any[];
  currentDesignData: DesignData;
  handleQuickExport: () => Promise<void>;
  handleQuickSave: () => Promise<void>;
  handleCopyToClipboard: () => Promise<void>;
  handleImportFromClipboard: () => Promise<void>;
}

export function useDesignCanvasEffects({
  components,
  connections,
  infoCards,
  currentDesignData,
  handleQuickExport,
  handleQuickSave,
  handleCopyToClipboard,
  handleImportFromClipboard,
}: DesignCanvasEffectsProps) {
  const mountedRef = useRef(false);
  const { setVisualTheme } = useCanvasActions();
  const { actions } = useAppStore();

  // Mount detection to prevent infinite loops during initial render
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load theme settings
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const mod = await import('@/modules/settings');
        const s = mod.loadSettings?.();
        if (active && s?.appearance?.canvasTheme) {
          setVisualTheme(s.appearance.canvasTheme);
        }
      } catch (error) {
        console.error('Failed to load canvas theme settings:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [setVisualTheme]);

  // Listen for theme updates
  useEffect(() => {
    const handler = (e: any) => {
      const v = e?.detail?.canvasTheme as 'serious' | 'playful' | undefined;
      if (v === 'serious' || v === 'playful') setVisualTheme(v);
    };
    window.addEventListener('settings:appearance-updated', handler as EventListener);
    return () =>
      window.removeEventListener('settings:appearance-updated', handler as EventListener);
  }, [setVisualTheme]);

  // Save current design data to preserve state
  const saveCurrentDesign = useCallback(() => {
    if (components.length > 0 || connections.length > 0 || infoCards.length > 0) {
      actions.setDesignData(currentDesignData);
    }
  }, [currentDesignData, actions, components.length, connections.length, infoCards.length]);

  // Debounced save to prevent too frequent updates
  const debouncedSave = useDebouncedCallback(() => {
    if (!mountedRef.current) return;
    saveCurrentDesign();
  }, 1000);

  // Auto-save when data changes
  useEffect(() => {
    if (
      mountedRef.current &&
      (components.length > 0 || connections.length > 0 || infoCards.length > 0)
    ) {
      debouncedSave();
    }
  }, [components, connections, infoCards, debouncedSave]);

  // Save state when navigating away or window unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentDesign();
    };

    const handleNavigateToConfig = () => {
      saveCurrentDesign();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('navigate:config', handleNavigateToConfig as EventListener);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('navigate:config', handleNavigateToConfig as EventListener);
    };
  }, [saveCurrentDesign]);

  // Setup keyboard shortcuts for import/export
  useImportExportShortcuts({
    onQuickExport: () => {
      void handleQuickExport();
    },
    onQuickSave: () => {
      void handleQuickSave();
    },
    onImport: () => {
      window.dispatchEvent(new CustomEvent('import:trigger'));
    },
    onCopyToClipboard: () => {
      void handleCopyToClipboard();
    },
    onImportFromClipboard: () => {
      void handleImportFromClipboard();
    },
  });

  return {
    mountedRef,
  };
}