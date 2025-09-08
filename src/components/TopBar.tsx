import * as React from 'react';
import { Button } from './ui/button';
import { SmartTooltip } from './ui/SmartTooltip';
import { cx, designSystem, getElevation } from '../lib/design-system';
import { ArrowLeft, Zap, Image, Download, Save } from 'lucide-react';

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
