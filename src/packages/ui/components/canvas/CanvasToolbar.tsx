/**
 * File: src/packages/ui/components/canvas/CanvasToolbar.tsx
 * Purpose: Comprehensive toolbar for canvas with mode toggles, view controls, and actions
 * Why: Provides easy access to all canvas features and modes in one place
 * Related: canvasStore.ts, useQuickConnect.ts, DesignCanvasCore.tsx
 */

import {
  Grid3x3,
  Hand,
  Layers,
  Link2,
  Magnet,
  Map,
  Maximize2,
  MessageSquare,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Zap,
} from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import { cx } from "../../../../lib/design/design-system";
import type { CanvasMode } from "../../../../stores/canvasStore";
import {
  useCanvasActions,
  useCanvasStore,
} from "../../../../stores/canvasStore";

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
  className?: string;
}

/**
 * Main toolbar for canvas operations
 */
const CanvasToolbarComponent: React.FC<CanvasToolbarProps> = ({
  onFitView,
  onAutoLayout,
  onToggleSettings,
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

  const [quickAddActive, setQuickAddActive] = useState(false);
  const [showQuickAddHint, setShowQuickAddHint] = useState(false);

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

  return (
    <div
      className={cx(
        "flex items-center gap-2 p-2 bg-white border-2 border-gray-900 rounded-lg shadow-lg",
        className,
      )}
    >
      {/* Mode toggles */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
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
      </div>

      {/* View controls */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
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
      </div>

      {/* Animation controls */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
        <ToolbarButton
          icon={animationsEnabled ? Play : Pause}
          label="Animations"
          active={animationsEnabled}
          onClick={toggleAnimations}
          tooltip={
            animationsEnabled ? "Disable animations" : "Enable animations"
          }
        />
      </div>

      {/* Layout actions */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
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
      </div>

      {/* Settings */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={Settings}
          label="Settings"
          onClick={onToggleSettings}
          tooltip="Canvas settings"
        />
      </div>
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
}

function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  onClick,
  tooltip,
  disabled = false,
  indicator,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cx(
        "relative group flex items-center justify-center",
        "w-9 h-9 rounded-md",
        "transition-all duration-200",
        "border-2",
        active
          ? "bg-blue-500 border-blue-600 text-white shadow-md"
          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:shadow-md",
      )}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className="w-5 h-5" />
      {indicator}

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
