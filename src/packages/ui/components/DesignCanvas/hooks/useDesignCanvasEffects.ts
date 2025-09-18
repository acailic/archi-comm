// src/components/DesignCanvas/hooks/useDesignCanvasEffects.ts
// Side effects and useEffect hooks for DesignCanvas component
// Handles auto-save, keyboard shortcuts, theme loading, and navigation events
// RELEVANT FILES: DesignCanvasCore.tsx, ../../../hooks/useDebounce.ts, ../../../hooks/useAppStore.ts, ImportExportDropdown.tsx

import { useImportExportShortcuts } from '@ui/components/ImportExportDropdown';
import type { DesignData } from '@/shared/contracts';
import { useCanvasActions } from '@/stores/canvasStore';
import { useCallback, useEffect, useRef } from 'react';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import { storage } from '@services/storage';
import { useAppStore } from '@/hooks/useAppStore';

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
  const renderSafeRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);
  const idleHandleRef = useRef<number | null>(null);
  const flushInFlightRef = useRef(false);
  const lastFlushReasonRef = useRef<string | null>(null);
  const { setVisualTheme } = useCanvasActions();
  const { actions } = useAppStore();

  // Mount detection to prevent infinite loops during initial render
  useEffect(() => {
    mountedRef.current = true;
    renderSafeRef.current = true;
    return () => {
      mountedRef.current = false;
      renderSafeRef.current = false;
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

  const flushPendingDesign = useCallback(
    (reason: string, options: { immediate?: boolean } = {}) => {
      if (flushInFlightRef.current) {
        return;
      }

      const pending = currentDesignData;

      const executeFlush = () => {
        if (flushInFlightRef.current) {
          return;
        }

        flushInFlightRef.current = true;
        lastFlushReasonRef.current = reason;

        try {
          actions.setDesignData(pending);
          void storage.setItem('archicomm-design', JSON.stringify(pending));
          RenderLoopDiagnostics.getInstance().recordDesignFlush({
            reason,
            pendingNodes: components.length,
            pendingConnections: connections.length,
            pendingInfoCards: infoCards.length,
          });
        } catch (error) {
          console.error('Failed to flush design data', { error, reason });
        } finally {
          flushInFlightRef.current = false;
        }
      };

      const schedule = () => {
        if (options.immediate || !renderSafeRef.current) {
          executeFlush();
          return;
        }

        if ('requestIdleCallback' in window) {
          if (idleHandleRef.current != null) {
            (window as any).cancelIdleCallback?.(idleHandleRef.current);
          }
          idleHandleRef.current = (window as any).requestIdleCallback?.(
            () => {
              executeFlush();
              idleHandleRef.current = null;
            },
            { timeout: 1000 }
          );
        } else {
          if (flushTimerRef.current != null) {
            clearTimeout(flushTimerRef.current);
          }
          flushTimerRef.current = window.setTimeout(() => {
            executeFlush();
            flushTimerRef.current = null;
          }, 300);
        }
      };

      if (options.immediate) {
        executeFlush();
      } else {
        schedule();
      }
    },
    [currentDesignData, components.length, connections.length, infoCards.length]
  );

  const cancelScheduledFlush = useCallback(() => {
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (idleHandleRef.current != null && 'cancelIdleCallback' in window) {
      (window as any).cancelIdleCallback?.(idleHandleRef.current);
      idleHandleRef.current = null;
    }
  }, []);


  // Save state when navigating away or window unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingDesign('beforeunload', { immediate: true });
    };

    const handleNavigateToConfig = () => {
      flushPendingDesign('navigate:config', { immediate: true });
    };

    const handleExternalFlush = (event: Event) => {
      const detailReason = (event as CustomEvent)?.detail?.reason as string | undefined;
      flushPendingDesign(detailReason ?? 'external-request', { immediate: true });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('navigate:config', handleNavigateToConfig as EventListener);
    window.addEventListener(
      'archicomm:design-canvas:flush-request',
      handleExternalFlush as EventListener
    );

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('navigate:config', handleNavigateToConfig as EventListener);
      window.removeEventListener(
        'archicomm:design-canvas:flush-request',
        handleExternalFlush as EventListener
      );
    };
  }, [flushPendingDesign]);

  useEffect(() => () => {
    cancelScheduledFlush();
    flushPendingDesign('unmount', { immediate: true });
  }, [cancelScheduledFlush, flushPendingDesign]);

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
    flushPendingDesign,
    lastFlushReasonRef,
  };
}
