// src/components/ImportExportDropdown.tsx
// Dropdown menu component for import/export actions in the header toolbar
// Provides quick access to export/import options with keyboard shortcuts
// RELEVANT FILES: DesignCanvas.tsx, ImportExportModal.tsx, DesignSerializer.ts

import React, { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  Download,
  Upload,
  FileJson,
  Image,
  FileText,
  Copy,
  ExternalLink,
  ChevronDown,
  Save,
  FolderOpen,
  Clipboard,
} from 'lucide-react';
import type { Challenge, DesignData } from '@/shared/contracts';
import type { CanvasConfig, ExportFormat } from '@/lib/import-export/types';
import { DesignSerializer } from '@/lib/import-export/DesignSerializer';
import { ImportExportModal } from './ImportExportModal';
import { toast } from 'sonner';

interface ImportExportDropdownProps {
  designData: DesignData;
  challenge?: Challenge;
  canvasConfig?: CanvasConfig;
  onImport: (result: any) => void;
  disabled?: boolean;
  className?: string;
}

export function ImportExportDropdown({
  designData,
  challenge,
  canvasConfig,
  onImport,
  disabled = false,
  className = '',
}: ImportExportDropdownProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'import' | 'export'>('export');
  const [isProcessing, setIsProcessing] = useState(false);

  const serializer = new DesignSerializer();

  // Quick export handlers
  const handleQuickExportJSON = useCallback(async () => {
    if (!designData) return;

    setIsProcessing(true);
    try {
      const filename = challenge?.title ? `${challenge.title}-design` : 'archicomm-design';
      const content = await serializer.exportDesign(designData, challenge, canvasConfig);
      await DesignSerializer.downloadFile(content, `${filename}.json`, 'application/json');

      toast.success('Design exported successfully!', {
        description: `Saved as ${filename}.json`,
      });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [designData, challenge, canvasConfig]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!designData) return;

    setIsProcessing(true);
    try {
      const content = await serializer.exportDesign(designData, challenge, canvasConfig);
      await navigator.clipboard.writeText(content);

      toast.success('Design copied to clipboard!', {
        description: 'You can now paste it anywhere',
      });
    } catch (error) {
      toast.error('Copy failed', {
        description: error instanceof Error ? error.message : 'Clipboard not available',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [designData, challenge, canvasConfig]);

  const handleImportFromClipboard = useCallback(async () => {
    setIsProcessing(true);
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
        onImport(result);
        toast.success('Design imported from clipboard!', {
          description: `${result.statistics.componentsImported} components imported`,
        });
      } else {
        toast.error('Import failed', {
          description: result.errors.join('; '),
        });
      }
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Clipboard read failed',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onImport]);

  const openModal = useCallback((mode: 'import' | 'export') => {
    setModalMode(mode);
    setModalOpen(true);
  }, []);

  const handleExportComplete = useCallback((success: boolean, error?: string) => {
    if (success) {
      toast.success('Export completed successfully!');
    } else {
      toast.error('Export failed', {
        description: error || 'Unknown error occurred',
      });
    }
  }, []);

  const handleImportComplete = useCallback((result: any) => {
    onImport(result);
    setModalOpen(false);
  }, [onImport]);

  const hasDesignData = designData && designData.components.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || isProcessing}
                  className={`px-3 ${className}`}
                >
                  <div className="flex items-center gap-1">
                    {hasDesignData ? (
                      <Download className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasDesignData ? 'Export Design' : 'Import Design'}
              </TooltipContent>
            </Tooltip>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Import & Export</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Export Section */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!hasDesignData}>
              <Download className="w-4 h-4 mr-2" />
              Export Design
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleQuickExportJSON} disabled={!hasDesignData}>
                <FileJson className="w-4 h-4 mr-2" />
                Export as JSON
                <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyToClipboard} disabled={!hasDesignData}>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
                <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('export')} disabled={!hasDesignData}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Advanced Export...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Image className="w-4 h-4 mr-2 opacity-50" />
                Export as PNG
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <FileText className="w-4 h-4 mr-2 opacity-50" />
                Export as PDF
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Import Section */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Upload className="w-4 h-4 mr-2" />
              Import Design
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => openModal('import')}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Import from File
                <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportFromClipboard}>
                <Clipboard className="w-4 h-4 mr-2" />
                Import from Clipboard
                <DropdownMenuShortcut>⌘⇧V</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal('import')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Advanced Import...
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Quick Actions */}
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={handleQuickExportJSON}
            disabled={!hasDesignData}
            className="font-medium"
          >
            <Save className="w-4 h-4 mr-2" />
            Quick Save as JSON
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* Design Stats */}
          {hasDesignData && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Components:</span>
                  <span>{designData.components.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connections:</span>
                  <span>{designData.connections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comments:</span>
                  <span>{designData.infoCards?.length || 0}</span>
                </div>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        designData={designData}
        challenge={challenge}
        canvasConfig={canvasConfig}
        onExportComplete={handleExportComplete}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}

// Utility component for rendering export format icons
export function ExportFormatIcon({ format }: { format: ExportFormat }) {
  switch (format) {
    case 'json':
      return <FileJson className="w-4 h-4" />;
    case 'png':
    case 'svg':
      return <Image className="w-4 h-4" />;
    case 'pdf':
      return <FileText className="w-4 h-4" />;
    default:
      return <FileJson className="w-4 h-4" />;
  }
}

// Keyboard shortcuts handler hook
export function useImportExportShortcuts(
  handlers: {
    onQuickExport?: () => void;
    onQuickSave?: () => void;
    onImport?: () => void;
    onCopyToClipboard?: () => void;
    onImportFromClipboard?: () => void;
  }
) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed) return;

      // Prevent default browser shortcuts
      if (event.key === 'e' || event.key === 's' || event.key === 'i') {
        event.preventDefault();
      }

      switch (event.key.toLowerCase()) {
        case 'e':
          if (!event.shiftKey) {
            handlers.onQuickExport?.();
          }
          break;
        case 's':
          if (!event.shiftKey) {
            handlers.onQuickSave?.();
          }
          break;
        case 'i':
          handlers.onImport?.();
          break;
        case 'c':
          if (event.shiftKey) {
            handlers.onCopyToClipboard?.();
          }
          break;
        case 'v':
          if (event.shiftKey) {
            handlers.onImportFromClipboard?.();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}