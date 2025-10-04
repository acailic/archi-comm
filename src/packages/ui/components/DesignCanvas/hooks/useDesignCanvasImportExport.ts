import { useCallback } from 'react';
import { toast } from 'sonner';
import { storage } from '@services/storage';
import { DesignSerializer } from '@/lib/import-export/DesignSerializer';
import type { Challenge, DesignData } from '@/shared/contracts';
import { useCanvasActions } from '@/stores/canvasStore';
import { useStableCallback } from '@hooks/useStableCallbacks';

interface UseDesignCanvasImportExportProps {
  serializer: DesignSerializer;
  canvasConfig: any;
  challenge: Challenge;
  buildDesignSnapshot: (data: DesignData, options?: { updateTimestamp?: boolean }) => DesignData;
  markDesignModified: (timestamp?: string) => void;
  setCanvasConfig: (config: any) => void;
  onAnnotationsImported?: (annotations: any[]) => void;
}

export function useDesignCanvasImportExport({
  serializer,
  canvasConfig,
  challenge,
  buildDesignSnapshot,
  markDesignModified,
  setCanvasConfig,
  onAnnotationsImported,
}: UseDesignCanvasImportExportProps) {
  const canvasActions = useCanvasActions();

  const handleImport = useStableCallback((result: any) => {
    if (result.success && result.data) {
      canvasActions.updateCanvasData({
        components: result.data.components ?? [],
        connections: result.data.connections ?? [],
        infoCards: result.data.infoCards ?? [],
        annotations: result.data.annotations ?? [],
        drawings: result.data.drawings ?? [],
      });

      if (result.canvas) {
        setCanvasConfig(result.canvas);
      }

      // Propagate imported annotations back to DesignCanvasCore if callback exists
      if (result.data.annotations && onAnnotationsImported) {
        onAnnotationsImported(result.data.annotations);
      }

      canvasActions.setSelectedComponent(null);
      canvasActions.setConnectionStart(null);

      const annotationCount = result.data.annotations?.length ?? 0;
      toast.success('Design imported successfully!', {
        description: `Imported ${result.statistics.componentsImported} components, ${result.statistics.connectionsImported} connections${annotationCount > 0 ? `, and ${annotationCount} annotations` : ''}`,
      });

      markDesignModified(result.data?.metadata?.lastModified);
    }
  });

  const handleQuickExport = useCallback(async (currentDesignData: DesignData) => {
    try {
      const filename = challenge?.title ? `${challenge.title}-design` : 'archicomm-design';
      const content = await serializer.exportDesign(currentDesignData, challenge, canvasConfig);
      await DesignSerializer.downloadFile(content, `${filename}.json`, 'application/json');

      toast.success('Design exported successfully!', {
        description: `Saved as ${filename}.json`,
      });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, [challenge, canvasConfig, serializer]);

  const handleQuickSave = useCallback(async (currentDesignData: DesignData) => {
    void storage.setItem('archicomm-design', JSON.stringify(currentDesignData));
    await handleQuickExport(currentDesignData);
  }, [handleQuickExport]);

  const handleCopyToClipboard = useCallback(async (currentDesignData: DesignData) => {
    try {
      const content = await serializer.exportDesign(currentDesignData, challenge, canvasConfig);
      await navigator.clipboard.writeText(content);

      toast.success('Design copied to clipboard!', {
        description: 'You can now paste it anywhere',
      });
    } catch (error) {
      toast.error('Copy failed', {
        description: error instanceof Error ? error.message : 'Clipboard not available',
      });
    }
  }, [challenge, canvasConfig, serializer]);

  const handleImportFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        toast.error('Clipboard is empty', {
          description: 'Please copy a design JSON first',
        });
        return;
      }

      const result = await serializer.importDesign(clipboardText, {
        mode: 'replace',
        handleConflicts: 'auto',
        preserveIds: false,
        preservePositions: true,
        validateComponents: true,
        importCanvas: true,
        importAnalytics: true,
      });

      if (result.success) {
        handleImport(result);
      } else {
        toast.error('Import failed', {
          description: result.errors.join('; '),
        });
      }
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Clipboard read failed',
      });
    }
  }, [serializer, handleImport]);

  const handleSave = useCallback((currentDesignData: DesignData) => {
    const snapshot = buildDesignSnapshot(currentDesignData, { updateTimestamp: true });
    void storage.setItem('archicomm-design', JSON.stringify(snapshot));
    toast.success('Design saved locally');
  }, [buildDesignSnapshot]);

  return {
    handleImport,
    handleQuickExport,
    handleQuickSave,
    handleCopyToClipboard,
    handleImportFromClipboard,
    handleSave,
  };
}
