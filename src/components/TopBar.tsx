import * as React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { SmartTooltip } from './ui/SmartTooltip';
import { Minimap, ViewportInfo } from './Minimap';
import { cx, designSystem, getElevation } from '../lib/design-system';
import { ArrowLeft, Zap, Image, Download, Save } from 'lucide-react';

interface GridConfigTopBar {
  visible: boolean;
  spacing: number;
  snapToGrid: boolean;
}

export interface TopBarProps {
  // Navigation
  onBack: () => void;
  challengeTitle: string;
  challengeDescription?: string;

  // Status
  componentCount: number;
  connectionCount: number;
  designComplexity?: number;
  isSaving?: boolean;

  // Performance
  performanceModeEnabled: boolean;
  onTogglePerformanceMode: () => void;

  // Hints
  showHints: boolean;
  onToggleHints: () => void;

  // Grid
  gridConfig: GridConfigTopBar;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onGridSpacingChange: (value: string) => void;

  // Minimap
  showMinimap: boolean;
  onToggleMinimap: () => void;
  viewportInfo: ViewportInfo | null;
  canvasExtents: { width: number; height: number } | null;
  onMinimapPan: (x: number, y: number) => void;
  onMinimapZoom: (zoom: number, centerX?: number, centerY?: number) => void;
  // Data for minimap rendering
  components: any[];
  connections: any[];
  layers: any[];

  // Actions
  onSave: () => void;
  onExportJSON: () => void;
  onExportPNG: () => void;
  isExporting?: boolean;
  onContinue: () => void;
  canContinue: boolean;
}

export function TopBar(props: TopBarProps) {
  const {
    onBack,
    challengeTitle,
    challengeDescription,
    componentCount,
    connectionCount,
    designComplexity,
    isSaving,
    performanceModeEnabled,
    onTogglePerformanceMode,
    showHints,
    onToggleHints,
    gridConfig,
    onToggleGrid,
    onToggleSnapToGrid,
    onGridSpacingChange,
    showMinimap,
    onToggleMinimap,
    viewportInfo,
    canvasExtents,
    onMinimapPan,
    onMinimapZoom,
    components,
    connections,
    layers,
    onSave,
    onExportJSON,
    onExportPNG,
    isExporting,
    onContinue,
    canContinue,
  } = props;

  return (
    <div
      className={cx(
        'sticky top-0 z-30',
        'px-4 py-3 border-b',
        'bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-[var(--glass-blur)]',
        getElevation(2)
      )}
      data-testid="canvas-toolbar"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left cluster: Back + Title */}
        <div className="flex items-center gap-4 min-w-0">
          <SmartTooltip content="Return to challenge selection" contextualHelp="Choose a different challenge or modify challenge requirements" shortcut="Alt+1">
            <Button variant="ghost" size="sm" onClick={onBack} aria-label="Return to challenge selection">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </SmartTooltip>
          <div className="min-w-0">
            <h2 className={cx('truncate', 'font-semibold', designSystem.typography.lg)} title={challengeTitle}>
              {challengeTitle}
            </h2>
            {challengeDescription && (
              <p className="text-xs text-muted-foreground truncate" title={challengeDescription}>
                {challengeDescription}
              </p>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5" aria-live="polite">
              Components: {componentCount} • Connections: {connectionCount}
              {isSaving && <span className="ml-2 text-blue-600">• Saving…</span>}
              {designComplexity !== undefined && designComplexity > 70 && (
                <span className="ml-2 text-amber-600">• Large design</span>
              )}
            </div>
          </div>
        </div>

        {/* Right cluster: Tools */}
        <div className="flex items-center gap-2" role="toolbar" aria-label="Canvas tools">
          {/* Performance mode */}
          <SmartTooltip
            content={performanceModeEnabled ? 'Disable performance optimizations' : 'Enable performance mode for large designs'}
            contextualHelp="Performance mode optimizes rendering for designs with many components by reducing animation quality and enabling object pooling"
          >
            <Button variant="ghost" size="sm" onClick={onTogglePerformanceMode}>
              <Zap className="mr-2 h-4 w-4" />
              {performanceModeEnabled ? 'Performance: ON' : 'Performance: OFF'}
            </Button>
          </SmartTooltip>

          {/* Hints toggle */}
          <SmartTooltip
            content={showHints ? 'Hide solution hints and guidance' : 'Show architectural guidance and best practices'}
            contextualHelp="Solution hints provide context-aware suggestions for architecture patterns and best practices"
            shortcut="?"
          >
            <Button variant="outline" size="sm" onClick={onToggleHints} aria-pressed={showHints}>
              {showHints ? 'Hide Hints' : 'Show Hints'}
            </Button>
          </SmartTooltip>

          {/* Grid controls */}
          <div className="hidden md:flex items-center gap-2 pl-2 ml-2 border-l border-border/30">
            <SmartTooltip content={gridConfig.visible ? 'Hide grid overlay' : 'Show grid overlay'}>
              <Button variant={gridConfig.visible ? 'default' : 'outline'} size="sm" onClick={onToggleGrid} aria-pressed={gridConfig.visible}>
                Grid
              </Button>
            </SmartTooltip>
            <SmartTooltip content="Enable snap-to-grid for precise placement">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" className="accent-primary" checked={gridConfig.snapToGrid} onChange={onToggleSnapToGrid} />
                Snap
              </label>
            </SmartTooltip>
            <SmartTooltip content="Adjust grid spacing for different layout precision">
              <Select value={gridConfig.spacing.toString()} onValueChange={onGridSpacingChange}>
                <SelectTrigger className="h-8 w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                </SelectContent>
              </Select>
            </SmartTooltip>
          </div>

          {/* Minimap */}
          <div className="pl-2 ml-2 border-l border-border/30">
            <SmartTooltip content={showMinimap ? 'Hide minimap overview' : 'Show minimap overview'} contextualHelp="Minimap provides a bird's-eye view of your entire canvas with viewport navigation and zoom controls">
              <Popover open={showMinimap} onOpenChange={() => onToggleMinimap()}>
                <PopoverTrigger asChild>
                  <Button variant={showMinimap ? 'default' : 'outline'} size="sm" aria-pressed={showMinimap}>
                    Minimap
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[300px]">
                  {!viewportInfo ? (
                    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Preparing minimap...</div>
                  ) : (
                    <Minimap
                      components={components as any}
                      connections={connections as any}
                      layers={layers as any}
                      viewport={viewportInfo}
                      canvasExtents={canvasExtents || { width: 0, height: 0 }}
                      onPanTo={onMinimapPan}
                      onZoomTo={onMinimapZoom}
                    />
                  )}
                </PopoverContent>
              </Popover>
            </SmartTooltip>
          </div>

          {/* Save/Export */}
          <div className="pl-2 ml-2 border-l border-border/30 flex items-center gap-2">
            <SmartTooltip content="Save current design progress" shortcut="Ctrl+S">
              <Button variant="outline" size="icon" onClick={onSave} aria-label="Save design">
                <Save className="w-4 h-4" />
              </Button>
            </SmartTooltip>
            <SmartTooltip content="Export design as JSON file" shortcut="Ctrl+E">
              <Button variant="outline" size="icon" onClick={onExportJSON} aria-label="Export JSON">
                <Download className="w-4 h-4" />
              </Button>
            </SmartTooltip>
            <SmartTooltip content="Export design as PNG image" shortcut="Ctrl+Shift+E">
              <Button variant="outline" size="icon" onClick={onExportPNG} disabled={!!isExporting} aria-label="Export PNG">
                <Image className="w-4 h-4" />
              </Button>
            </SmartTooltip>
          </div>

          {/* Continue */}
          <SmartTooltip content={canContinue ? 'Proceed to recording' : 'Add components to continue'}>
            <Button onClick={onContinue} disabled={!canContinue || !!isExporting}>
              {isExporting ? 'Exporting...' : 'Continue'}
            </Button>
          </SmartTooltip>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
