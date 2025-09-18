// src/components/ImportExportModal.tsx
// Modal component for importing and exporting designs with drag-and-drop support
// Provides comprehensive UI for file handling, validation, and format options
// RELEVANT FILES: DesignCanvas.tsx, DesignSerializer.ts, ImportExportDropdown.tsx

import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/components/ui/dialog';
import { Button } from '@ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/ui/tabs';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';
import { Textarea } from '@ui/components/ui/textarea';
import { Switch } from '@ui/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/ui/select';
import { Alert, AlertDescription } from '@ui/components/ui/alert';
import { Badge } from '@ui/components/ui/badge';
import { Progress } from '@ui/components/ui/progress';
import {
  Upload,
  Download,
  FileJson,
  Image,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  File,
  Zap,
} from 'lucide-react';
import type { Challenge, DesignData } from '@/shared/contracts';
import type {
  ExportOptions,
  ImportOptions,
  ImportResult,
  ImportConflict,
  ExportFormat,
  CanvasConfig,
} from '@/lib/import-export/types';
import { DesignSerializer } from '@/lib/import-export/DesignSerializer';
import { basicDesign, complexDesign, queueCheatsheetDesign } from '@/lib/import-export/sampleDesigns';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  // Export props
  designData?: DesignData;
  challenge?: Challenge;
  canvasConfig?: CanvasConfig;
  onExportComplete?: (success: boolean, error?: string) => void;
  // Import props
  onImportComplete?: (result: ImportResult) => void;
}

export function ImportExportModal({
  isOpen,
  onClose,
  mode,
  designData,
  challenge,
  canvasConfig,
  onExportComplete,
  onImportComplete,
}: ImportExportModalProps) {
  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: true,
    includeChallenge: true,
    includeAnalytics: true,
    includeCanvas: true,
    compressData: false,
    filename: challenge?.title ? `${challenge.title}-design` : 'archicomm-design',
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    mode: 'replace',
    handleConflicts: 'auto',
    preserveIds: false,
    preservePositions: true,
    validateComponents: true,
    importCanvas: true,
    importAnalytics: true,
  });
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([]);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const serializer = useRef(new DesignSerializer());

  // Handle drag and drop events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && mode === 'import') {
      handleFileSelection(files[0]);
    }
  }, [mode]);

  const handleFileSelection = useCallback(async (file: File) => {
    setError(null);
    setSuccess(null);

    // Validate file
    if (!DesignSerializer.validateFileExtension(file)) {
      setError('Invalid file type. Please select a JSON or .archicomm file.');
      return;
    }

    if (!DesignSerializer.validateFileSize(file)) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setImportFile(file);

    // Preview file content
    try {
      const content = await DesignSerializer.readFile(file);
      const parsed = JSON.parse(content);
      setImportPreview({
        filename: file.name,
        size: file.size,
        components: parsed.design?.components?.length || 0,
        connections: parsed.design?.connections?.length || 0,
        hasChallenge: !!parsed.challenge,
        formatVersion: parsed.formatVersion,
      });
    } catch (err) {
      setError('Failed to read file content. Please check the file format.');
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [handleFileSelection]);

  const handleExport = useCallback(async () => {
    if (!designData) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    try {
      setProgress(25);

      const options: ExportOptions = {
        ...exportOptions,
        format: exportFormat,
      };

      setProgress(50);

      const content = await serializer.current.exportDesign(
        designData,
        challenge,
        canvasConfig,
        options
      );

      setProgress(75);

      const filename = `${options.filename || 'design'}.${exportFormat === 'json' ? 'json' : exportFormat}`;

      await DesignSerializer.downloadFile(content, filename, 'application/json');

      setProgress(100);
      setSuccess(`Design exported successfully as ${filename}`);
      onExportComplete?.(true);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      onExportComplete?.(false, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [designData, challenge, canvasConfig, exportOptions, exportFormat, onExportComplete, onClose]);

  const handleImport = useCallback(async () => {
    if (!importFile) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    try {
      setProgress(25);

      const content = await DesignSerializer.readFile(importFile);

      setProgress(50);

      const result = await serializer.current.importDesign(content, importOptions);

      setProgress(75);

      if (!result.success) {
        setError(result.errors.join('; '));
        return;
      }

      if (result.conflicts.length > 0 && importOptions.handleConflicts === 'prompt') {
        setImportConflicts(result.conflicts);
        setProgress(0);
        return;
      }

      setProgress(100);
      setSuccess(
        `Design imported successfully! ${result.statistics.componentsImported} components, ${result.statistics.connectionsImported} connections`
      );

      onImportComplete?.(result);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [importFile, importOptions, onImportComplete, onClose]);

  const resolveConflicts = useCallback(() => {
    // Auto-resolve conflicts and retry import
    setImportOptions(prev => ({ ...prev, handleConflicts: 'auto' }));
    setImportConflicts([]);
    handleImport();
  }, [handleImport]);

  const resetModal = useCallback(() => {
    setImportFile(null);
    setImportPreview(null);
    setImportConflicts([]);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'export' ? (
              <>
                <Download className="w-5 h-5" />
                Export Design
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Import Design
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export'
              ? 'Export your design with comprehensive metadata and analytics'
              : 'Import a design from a JSON file with validation and conflict resolution'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={mode} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export" disabled={mode === 'import'}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" disabled={mode === 'export'}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="templates" disabled={mode === 'export'}>
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="grid gap-4">
              {/* Export Format */}
              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(value: ExportFormat) => {
                    setExportFormat(value);
                    setExportOptions(prev => ({ ...prev, format: value }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        JSON (Recommended)
                      </div>
                    </SelectItem>
                    <SelectItem value="png" disabled>
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        PNG Image (Coming Soon)
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf" disabled>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF Document (Coming Soon)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filename */}
              <div className="space-y-2">
                <Label htmlFor="filename">Filename</Label>
                <Input
                  id="filename"
                  value={exportOptions.filename}
                  onChange={(e) =>
                    setExportOptions(prev => ({ ...prev, filename: e.target.value }))
                  }
                  placeholder="Enter filename (without extension)"
                />
              </div>

              {/* Export Options */}
              <div className="space-y-3">
                <Label>Include in Export</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={exportOptions.includeMetadata}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includeMetadata: checked }))
                      }
                    />
                    <Label className="text-sm">Metadata</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={exportOptions.includeChallenge}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includeChallenge: checked }))
                      }
                    />
                    <Label className="text-sm">Challenge Info</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={exportOptions.includeAnalytics}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includeAnalytics: checked }))
                      }
                    />
                    <Label className="text-sm">Analytics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={exportOptions.includeCanvas}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includeCanvas: checked }))
                      }
                    />
                    <Label className="text-sm">Canvas Settings</Label>
                  </div>
                </div>
              </div>

              {/* Design Summary */}
              {designData && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Design Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Components:</span>
                      <span className="ml-1 font-medium">{designData.components.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Connections:</span>
                      <span className="ml-1 font-medium">{designData.connections.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Comments:</span>
                      <span className="ml-1 font-medium">{designData.infoCards?.length || 0}</span>
                    </div>
                  </div>
                  {challenge && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-muted-foreground text-sm">Challenge:</span>
                      <span className="ml-1 font-medium text-sm">{challenge.title}</span>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleExport} disabled={isProcessing || !designData} className="w-full">
                {isProcessing ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Design
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            {/* File Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {importFile ? (
                <div className="space-y-2">
                  <File className="w-8 h-8 mx-auto text-primary" />
                  <p className="font-medium">{importFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setImportFile(null)}>
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Drop your design file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (JSON, .archicomm files)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.archicomm"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* File Preview */}
            {importPreview && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Import Preview</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Components: {importPreview.components}</div>
                  <div>Connections: {importPreview.connections}</div>
                  <div>Format: {importPreview.formatVersion}</div>
                  <div>
                    Challenge: {importPreview.hasChallenge ? '✓ Included' : '✗ Not included'}
                  </div>
                </div>
              </div>
            )}

            {/* Import Options */}
            {importFile && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Import Mode</Label>
                  <Select
                    value={importOptions.mode}
                    onValueChange={(value: 'replace' | 'merge' | 'append') =>
                      setImportOptions(prev => ({ ...prev, mode: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replace">Replace Current Design</SelectItem>
                      <SelectItem value="merge">Merge with Current Design</SelectItem>
                      <SelectItem value="append">Append to Current Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={importOptions.preservePositions}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ ...prev, preservePositions: checked }))
                      }
                    />
                    <Label className="text-sm">Preserve Positions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={importOptions.validateComponents}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ ...prev, validateComponents: checked }))
                      }
                    />
                    <Label className="text-sm">Validate Components</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={importOptions.importCanvas}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ ...prev, importCanvas: checked }))
                      }
                    />
                    <Label className="text-sm">Import Canvas Settings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={importOptions.importAnalytics}
                      onCheckedChange={(checked) =>
                        setImportOptions(prev => ({ ...prev, importAnalytics: checked }))
                      }
                    />
                    <Label className="text-sm">Import Analytics</Label>
                  </div>
                </div>

                <Button onClick={handleImport} disabled={isProcessing} className="w-full">
                  {isProcessing ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Design
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Conflict Resolution */}
            {importConflicts.length > 0 && (
              <div className="space-y-3">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Found {importConflicts.length} conflicts that need resolution.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {importConflicts.map((conflict, index) => (
                    <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <div className="font-medium">{conflict.description}</div>
                      <div className="text-muted-foreground">
                        Suggested: {conflict.suggestedResolution}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={resolveConflicts} variant="outline">
                    Auto-resolve Conflicts
                  </Button>
                  <Button onClick={() => setImportConflicts([])} variant="ghost">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Pre-built Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose from our collection of architecture templates to get started quickly.
                </p>
              </div>

              <div className="grid gap-3">
                {/* Basic Microservices Template */}
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                     onClick={() => {
                       const result = {
                         success: true,
                         data: basicDesign,
                         statistics: {
                           componentsImported: basicDesign.components.length,
                           connectionsImported: basicDesign.connections.length,
                           infoCardsImported: basicDesign.infoCards?.length || 0,
                         },
                         conflicts: [],
                         errors: [],
                       };
                       onImportComplete?.(result);
                       onClose();
                     }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">Basic Microservices</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Simple microservices architecture with API gateway, services, and database
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{basicDesign.components.length} components</span>
                        <span>{basicDesign.connections.length} connections</span>
                        <Badge variant="outline" className="text-xs">Basic</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Complex E-commerce Template */}
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                     onClick={() => {
                       const result = {
                         success: true,
                         data: complexDesign,
                         statistics: {
                           componentsImported: complexDesign.components.length,
                           connectionsImported: complexDesign.connections.length,
                           infoCardsImported: complexDesign.infoCards?.length || 0,
                         },
                         conflicts: [],
                         errors: [],
                       };
                       onImportComplete?.(result);
                       onClose();
                     }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">E-commerce Platform</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete e-commerce architecture with caching, monitoring, and scaling
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{complexDesign.components.length} components</span>
                        <span>{complexDesign.connections.length} connections</span>
                        <Badge variant="outline" className="text-xs">Advanced</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queue System Cheatsheet Template */}
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                     onClick={() => {
                       const result = {
                         success: true,
                         data: queueCheatsheetDesign,
                         statistics: {
                           componentsImported: queueCheatsheetDesign.components.length,
                           connectionsImported: queueCheatsheetDesign.connections.length,
                           infoCardsImported: queueCheatsheetDesign.infoCards?.length || 0,
                         },
                         conflicts: [],
                         errors: [],
                       };
                       onImportComplete?.(result);
                       onClose();
                     }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">Queue System Cheatsheet</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comprehensive message queue architecture with producers, consumers, and best practices
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{queueCheatsheetDesign.components.length} components</span>
                        <span>{queueCheatsheetDesign.connections.length} connections</span>
                        <Badge variant="outline" className="text-xs">Educational</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {progress < 50 ? 'Processing...' : progress < 100 ? 'Almost done...' : 'Complete!'}
            </p>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            {success ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}