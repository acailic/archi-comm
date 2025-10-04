/**
 * File: src/packages/ui/components/canvas/CanvasToolbar.tsx
 * Purpose: Comprehensive toolbar for canvas with mode toggles, view controls, and actions
 * Why: Provides easy access to all canvas features and modes in one place
 * Related: canvasStore.ts, useQuickConnect.ts, DesignCanvasCore.tsx
 */

import * as Popover from "@radix-ui/react-popover";
import {
  CheckCircle,
  Download,
  FileJson,
  Grid3x3,
  Hand,
  HelpCircle,
  Image,
  Layers,
  Link2,
  Magnet,
  Map,
  Maximize2,
  MessageSquare,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Settings,
  Target,
  Zap,
} from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import {
  cx,
  primaryAction,
  sectionDivider,
  toolbarSectionBg,
} from "../../../../lib/design/design-system";
import type { CanvasMode } from "../../../../stores/canvasStore";
import {
  useCanvasActions,
  useCanvasDrawings,
  useCanvasStore,
  useDrawingColor,
  useDrawingSettings,
  useDrawingSize,
  useDrawingTool,
} from "../../../../stores/canvasStore";
import { useAppStore } from "../../../../stores/SimpleAppStore";
import { DrawingToolbar } from "./DrawingToolbar";
import { openShortcutsModal } from "./KeyboardShortcutsReference";

/**
 * Quick add toolbar support:
 * - keep button state synced with the overlay
 * - provide a shortcut-dispatching entry point
 * - surface an onboarding hint until first use
 */
const QUICK_ADD_STORAGE_KEY = "archicomm_quick_add_used";

interface CanvasToolbarProps {
  onFitView?: () => void;
  onAutoLayout?: () => void;
  onToggleSettings?: () => void;
  onQuickValidate?: () => void;
  onSelfAssessment?: () => void;
  onExportJSON?: () => void;
  onExportPNG?: () => void;
  onExportWithNotes?: () => void;
  onShowHelp?: (section?: string) => void;
  className?: string;
}

/**
 * Main toolbar for canvas operations
 */
const CanvasToolbarComponent: React.FC<CanvasToolbarProps> = ({
  onFitView,
  onAutoLayout,
  onToggleSettings,
  onQuickValidate,
  onSelfAssessment,
  onExportJSON,
  onExportPNG,
  onExportWithNotes,
  onShowHelp,
  className,
}) => {
  // Get actions from the store - these are stable references
  const actions = useCanvasActions();

  // Use individual selectors to avoid creating new objects on every render
  // This prevents infinite re-render loops caused by referential inequality
  const canvasMode = useCanvasStore((state) => state.canvasMode);
  const gridEnabled = useCanvasStore((state) => state.gridEnabled);
  const snapToGrid = useCanvasStore((state) => state.snapToGrid);
  const showMinimap = useCanvasStore((state) => state.showMinimap);
  const animationsEnabled = useCanvasStore((state) => state.animationsEnabled);
  const currentScreen = useCanvasStore(
    (state) =>
      (
        state as typeof state & {
          currentScreen?: string;
        }
      ).currentScreen,
  );
  const isDesignCanvas =
    currentScreen === undefined ? true : currentScreen === "design-canvas";

  // Drawing state
  const drawingTool = useDrawingTool();
  const drawingColor = useDrawingColor();
  const drawingSize = useDrawingSize();
  const drawingSettings = useDrawingSettings();
  const drawings = useCanvasDrawings();

  const [quickAddActive, setQuickAddActive] = useState(false);
  const [showQuickAddHint, setShowQuickAddHint] = useState(false);
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);

  const markQuickAddUsed = useCallback(() => {
    setShowQuickAddHint(false);
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(QUICK_ADD_STORAGE_KEY, "1");
    } catch {
      // Ignore storage write errors
    }
  }, []);

  // Show onboarding indicator until the user triggers quick add at least once
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const used = window.localStorage.getItem(QUICK_ADD_STORAGE_KEY);
      if (!used) {
        setShowQuickAddHint(true);
      }
    } catch {
      setShowQuickAddHint(false);
    }
  }, []);

  // Show shortcuts hint on first visit
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const SHORTCUTS_HINT_KEY = "archicomm_shortcuts_hint_dismissed";
      const dismissed = window.localStorage.getItem(SHORTCUTS_HINT_KEY);
      if (!dismissed) {
        setShowShortcutsHint(true);
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
          setShowShortcutsHint(false);
          window.localStorage.setItem(SHORTCUTS_HINT_KEY, "1");
        }, 5000);
        return () => clearTimeout(timer);
      }
    } catch {
      setShowShortcutsHint(false);
    }
  }, []);

  // Keep toolbar state aligned with quick add overlay visibility and shortcuts
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shortcutListener = (_event: Event) => {
      setQuickAddActive((prev) => {
        const next = !prev;
        if (!prev) {
          markQuickAddUsed();
        }
        return next;
      });
    };

    const openListener = (_event: Event) => {
      markQuickAddUsed();
      setQuickAddActive(true);
    };

    const closeListener = (_event: Event) => {
      setQuickAddActive(false);
    };

    const stateListener = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      if (detail && typeof detail.active === "boolean") {
        if (detail.active) {
          markQuickAddUsed();
        }
        setQuickAddActive(detail.active);
      }
    };

    window.addEventListener("shortcut:quick-add-component", shortcutListener);
    window.addEventListener("quick-add-overlay:open", openListener);
    window.addEventListener("quick-add-overlay:opened", openListener);
    window.addEventListener("quick-add-overlay:close", closeListener);
    window.addEventListener("quick-add-overlay:closed", closeListener);
    window.addEventListener("quick-add-overlay:state", stateListener);

    return () => {
      window.removeEventListener(
        "shortcut:quick-add-component",
        shortcutListener,
      );
      window.removeEventListener("quick-add-overlay:open", openListener);
      window.removeEventListener("quick-add-overlay:opened", openListener);
      window.removeEventListener("quick-add-overlay:close", closeListener);
      window.removeEventListener("quick-add-overlay:closed", closeListener);
      window.removeEventListener("quick-add-overlay:state", stateListener);
    };
  }, [markQuickAddUsed]);

  // Ensure stale active state is cleared when leaving the design canvas view
  useEffect(() => {
    if (!isDesignCanvas) {
      setQuickAddActive(false);
    }
  }, [isDesignCanvas]);

  // Wrap actions in useCallback to ensure stable references
  const setCanvasMode = useCallback(
    (mode: CanvasMode) => {
      actions.setCanvasMode(mode);
    },
    [actions],
  );

  const toggleGrid = useCallback(() => {
    actions.toggleGrid();
  }, [actions]);

  const toggleSnapToGrid = useCallback(() => {
    actions.toggleSnapToGrid();
  }, [actions]);

  const toggleMinimap = useCallback(() => {
    actions.toggleMinimap();
  }, [actions]);

  const toggleAnimations = useCallback(() => {
    actions.toggleAnimations();
  }, [actions]);

  const handleQuickAddClick = useCallback(() => {
    if (!isDesignCanvas || typeof window === "undefined") {
      return;
    }

    markQuickAddUsed();
    window.dispatchEvent(
      new CustomEvent("shortcut:quick-add-component", {
        detail: { source: "canvas-toolbar" },
      }),
    );
  }, [isDesignCanvas, markQuickAddUsed]);

  const handleUndo = useCallback(() => {
    useCanvasStore.temporal.getState().undo();
  }, []);

  // Drawing callbacks
  const handleDrawingToolSelect = useCallback(
    (tool: typeof drawingTool) => {
      actions.setDrawingTool(tool);
    },
    [actions],
  );

  const handleDrawingColorChange = useCallback(
    (color: string) => {
      actions.setDrawingColor(color);
    },
    [actions],
  );

  const handleDrawingSizeChange = useCallback(
    (size: number) => {
      actions.setDrawingSize(size);
    },
    [actions],
  );

  const handleClearAllDrawings = useCallback(() => {
    actions.clearDrawings();
  }, [actions]);

  // Session progress indicators
  const isDesignDone = useAppStore((s) => s.completedPhases.has("design"));
  const isRecordingDone = useAppStore((s) =>
    s.completedPhases.has("recording"),
  );
  const isReviewDone = useAppStore((s) => s.completedPhases.has("review"));
  const skippedRecording = useAppStore((s) => s.skippedPhases.has("recording"));
  const skippedReview = useAppStore((s) => s.skippedPhases.has("review"));

  return (
    <div
      className={cx(
        "flex items-center gap-2 p-2 bg-white border-2 border-gray-900 rounded-lg shadow-lg",
        className,
      )}
    >
      {/* Mode toggles */}
      <div
        className={cx(
          "flex items-center gap-1 px-2 py-1 rounded-md",
          toolbarSectionBg.modes,
        )}
      >
        <ToolbarButton
          icon={MousePointer2}
          label="Select (V)"
          active={canvasMode === "select"}
          onClick={() => setCanvasMode("select")}
          tooltip="Select mode - Click to select components"
        />
        {isDesignCanvas && (
          <ToolbarButton
            icon={Zap}
            label="Quick Add (/)"
            active={quickAddActive}
            onClick={handleQuickAddClick}
            tooltip="Quick add component - Press / to open"
            variant="primary"
            shortcutBadge="/"
            indicator={
              showQuickAddHint ? (
                <span className="pointer-events-none absolute top-1 right-1 flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.85)]" />
                </span>
              ) : undefined
            }
          />
        )}
        <ToolbarButton
          icon={Link2}
          label="Quick Connect (Q)"
          active={canvasMode === "quick-connect"}
          onClick={() => setCanvasMode("quick-connect")}
          tooltip="Quick connect - Click source, then target"
          variant="primary"
          shortcutBadge="Q"
        />
        <ToolbarButton
          icon={Hand}
          label="Pan (Space)"
          active={canvasMode === "pan"}
          onClick={() => setCanvasMode("pan")}
          tooltip="Pan mode - Drag to move canvas"
        />
        <ToolbarButton
          icon={MessageSquare}
          label="Annotate (A)"
          active={canvasMode === "annotation"}
          onClick={() => setCanvasMode("annotation")}
          tooltip="Annotation mode - Add notes to canvas"
        />
        <Popover.Root>
          <Popover.Trigger asChild>
            <ToolbarButton
              icon={Pencil}
              label="Draw (D)"
              active={canvasMode === "draw" || drawingTool !== null}
              onClick={() => {
                if (drawingTool === null) {
                  actions.setDrawingTool("pen");
                } else {
                  actions.setDrawingTool(null);
                }
              }}
              tooltip="Drawing mode - Draw on canvas"
            />
          </Popover.Trigger>
          {(canvasMode === "draw" || drawingTool !== null) && (
            <Popover.Content
              className="z-50 mb-2"
              sideOffset={8}
              align="center"
            >
              <DrawingToolbar
                selectedTool={drawingTool}
                onToolSelect={handleDrawingToolSelect}
                color={drawingColor}
                onColorChange={handleDrawingColorChange}
                size={drawingSize}
                onSizeChange={handleDrawingSizeChange}
                strokeCount={drawings.length}
                onClearAll={handleClearAllDrawings}
              />
            </Popover.Content>
          )}
        </Popover.Root>
        <SectionHelpButton section="Canvas Modes" onShowHelp={onShowHelp} />
      </div>

      <SectionDivider />

      {/* View controls */}
      <div
        className={cx(
          "flex items-center gap-1 px-2 py-1 rounded-md",
          toolbarSectionBg.view,
        )}
      >
        <ToolbarButton
          icon={Grid3x3}
          label="Grid"
          active={gridEnabled}
          onClick={toggleGrid}
          tooltip="Toggle grid visibility"
        />
        <ToolbarButton
          icon={Magnet}
          label="Snap"
          active={snapToGrid}
          onClick={toggleSnapToGrid}
          tooltip="Snap components to grid"
        />
        <ToolbarButton
          icon={Map}
          label="Minimap"
          active={showMinimap}
          onClick={toggleMinimap}
          tooltip="Toggle minimap"
        />
        <SectionHelpButton section="View" onShowHelp={onShowHelp} />
      </div>

      <SectionDivider />

      {/* Animation controls */}
      <div
        className={cx(
          "flex items-center gap-1 px-2 py-1 rounded-md",
          toolbarSectionBg.animation,
        )}
      >
        <ToolbarButton
          icon={animationsEnabled ? Play : Pause}
          label="Animations"
          active={animationsEnabled}
          onClick={toggleAnimations}
          tooltip={
            animationsEnabled ? "Disable animations" : "Enable animations"
          }
        />
        <SectionHelpButton section="Animation" onShowHelp={onShowHelp} />
      </div>

      <SectionDivider />

      {/* Layout actions */}
      <div
        className={cx(
          "flex items-center gap-1 px-2 py-1 rounded-md",
          toolbarSectionBg.layout,
        )}
      >
        <ToolbarButton
          icon={RotateCcw}
          label="Undo"
          onClick={handleUndo}
          tooltip="Undo last action (Ctrl+Z)"
        />
        <ToolbarButton
          icon={Maximize2}
          label="Fit View"
          onClick={onFitView}
          tooltip="Fit all components in view"
        />
        <ToolbarButton
          icon={Layers}
          label="Auto Layout"
          onClick={onAutoLayout}
          tooltip="Automatically arrange components"
        />
        <SectionHelpButton section="Layout" onShowHelp={onShowHelp} />
      </div>

      <SectionDivider />

      {/* Validation & Assessment */}
      {isDesignCanvas && (
        <>
          <div
            className={cx(
              "flex items-center gap-1 px-2 py-1 rounded-md",
              toolbarSectionBg.validation,
            )}
          >
            <ToolbarButton
              icon={Target}
              label="Quick Validate"
              onClick={onQuickValidate}
              tooltip="Quick validation of design"
            />
            <ToolbarButton
              icon={CheckCircle}
              label="Self-Assessment"
              onClick={onSelfAssessment}
              tooltip="Open self-assessment overlay"
            />
            <SectionHelpButton section="Validation" onShowHelp={onShowHelp} />
          </div>

          <SectionDivider />
        </>
      )}

      {/* Export Options */}
      {isDesignCanvas && (
        <>
          <div
            className={cx(
              "flex items-center gap-1 px-2 py-1 rounded-md",
              toolbarSectionBg.export,
            )}
          >
            <ToolbarButton
              icon={FileJson}
              label="Export JSON"
              onClick={onExportJSON}
              tooltip="Export design as JSON"
            />
            <ToolbarButton
              icon={Image}
              label="Export PNG"
              onClick={onExportPNG}
              tooltip="Export design as PNG"
            />
            <ToolbarButton
              icon={Download}
              label="Export with Notes"
              onClick={onExportWithNotes}
              tooltip="Export design with annotations"
            />
            <SectionHelpButton section="Export" onShowHelp={onShowHelp} />
          </div>

          <SectionDivider />
        </>
      )}

      {/* Session Progress Indicator */}
      {isDesignCanvas && (
        <>
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-xs font-medium text-gray-600">Session:</span>
            <div className="flex items-center gap-1">
              <SessionPhaseIndicator
                label="Design"
                completed={isDesignDone}
                skipped={false}
              />
              <span className="text-gray-400">|</span>
              <SessionPhaseIndicator
                label="Recording"
                completed={isRecordingDone}
                skipped={skippedRecording}
              />
              <span className="text-gray-400">|</span>
              <SessionPhaseIndicator
                label="Review"
                completed={isReviewDone}
                skipped={skippedReview}
              />
            </div>
          </div>

          <SectionDivider />
        </>
      )}

      {/* Settings */}
      <div
        className={cx(
          "flex items-center gap-1 px-2 py-1 rounded-md",
          toolbarSectionBg.settings,
        )}
      >
        <ToolbarButton
          icon={Settings}
          label="Settings"
          onClick={onToggleSettings}
          tooltip="Canvas settings"
        />
        <SectionHelpButton section="Settings" onShowHelp={onShowHelp} />
      </div>

      {/* Shortcuts hint */}
      {showShortcutsHint && (
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 z-[var(--z-tooltip)]">
          Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded mx-1">?</kbd>{" "}
          to see all shortcuts
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rotate-45" />
        </div>
      )}
    </div>
  );
};

export const CanvasToolbar = memo(CanvasToolbarComponent);

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
  disabled?: boolean;
  indicator?: ReactNode;
  variant?: "default" | "primary";
  shortcutBadge?: string;
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
  tooltip,
  disabled = false,
  indicator,
  variant = "default",
  shortcutBadge,
}: ToolbarButtonProps) {
  const isPrimary = variant === "primary";
  const isActive = Boolean(active);
  const ariaPressed =
    typeof active === "boolean" && !isPrimary ? active : undefined;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cx(
        "relative group flex items-center justify-center",
        "rounded-md",
        "transition-all duration-200",
        "border-2",
        isPrimary ? primaryAction.base : "w-9 h-9",
        isPrimary && isActive && primaryAction.gradient,
        isPrimary && primaryAction.hover,
        isPrimary && primaryAction.active,
        isActive && !isPrimary
          ? "bg-blue-500 border-blue-600 text-white shadow-md"
          : !isActive &&
              "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400",
        isActive && isPrimary && "border-blue-700 text-white shadow-xl",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:shadow-md",
      )}
      aria-label={label}
      aria-pressed={ariaPressed}
    >
      <Icon className={cx(isPrimary ? "w-6 h-6" : "w-5 h-5")} />
      {indicator}

      {/* Keyboard shortcut badge */}
      {shortcutBadge && (
        <span className="absolute -bottom-1 -right-1 px-1 py-0.5 text-[9px] font-bold bg-white/90 text-blue-600 border border-blue-200 rounded shadow-sm">
          {shortcutBadge}
        </span>
      )}

      {/* Tooltip on hover */}
      {tooltip && (
        <div
          className={cx(
            "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
            "px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "pointer-events-none z-[var(--z-tooltip)]",
          )}
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      )}
    </button>
  );
}

/**
 * Section divider component for visual separation
 */
function SectionDivider() {
  return <div className={sectionDivider} aria-hidden="true" />;
}

/**
 * Section help button component
 */
interface SectionHelpButtonProps {
  section: string;
  onShowHelp?: (section: string) => void;
}

function SectionHelpButton({ section, onShowHelp }: SectionHelpButtonProps) {
  const handleClick = useCallback(() => {
    if (onShowHelp) {
      onShowHelp(section);
    } else {
      openShortcutsModal(section);
    }
  }, [section, onShowHelp]);

  return (
    <button
      onClick={handleClick}
      className={cx(
        "w-6 h-6 rounded-full flex items-center justify-center",
        "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
        "transition-colors duration-200",
      )}
      title={`Help for ${section}`}
      aria-label={`Show help for ${section}`}
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}

/**
 * Session phase indicator component
 * Shows the completion status of each phase in the session
 */
interface SessionPhaseIndicatorProps {
  label: string;
  completed: boolean;
  skipped: boolean;
}

function SessionPhaseIndicator({
  label,
  completed,
  skipped,
}: SessionPhaseIndicatorProps) {
  return (
    <div
      className={cx(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        completed && "bg-green-100 text-green-800",
        skipped && "bg-gray-200 text-gray-600 line-through",
        !completed && !skipped && "bg-gray-100 text-gray-500",
      )}
      title={
        completed
          ? `${label} completed`
          : skipped
            ? `${label} skipped`
            : `${label} not started`
      }
    >
      {completed && <CheckCircle className="w-3 h-3" />}
      {skipped && (
        <span className="w-3 h-3 flex items-center justify-center">−</span>
      )}
      <span>{label}</span>
    </div>
  );
}
