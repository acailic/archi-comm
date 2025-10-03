/**
 * File: src/packages/ui/components/canvas/CanvasContextualHelp.tsx
 * Purpose: Context-aware tips and suggestions based on user actions
 * Why: Helps users discover features and best practices at the right moment
 * Related: canvasStore.ts, DesignCanvasCore.tsx, useQuickConnect.ts, feature-flags.ts
 */

import { Lightbulb, X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { isFeatureEnabled } from "../../../../lib/config/feature-flags";
import { cx } from "../../../../lib/design/design-system";
import {
  useCanvasActions,
  useCanvasStore,
} from "../../../../stores/canvasStore";

interface HelpTip {
  id: string;
  title: string;
  message: string;
  trigger:
    | "component-added"
    | "connection-created"
    | "selection-changed"
    | "mode-changed"
    | "idle";
  condition?: (state: any) => boolean;
  priority: number; // Higher = more important
}

const helpTips: HelpTip[] = [
  {
    id: "first-component",
    title: "Great start! 🎉",
    message:
      "You added your first component. Try dragging from the connection handles to link it to other components.",
    trigger: "component-added",
    condition: (state) => state.components.length === 1,
    priority: 10,
  },
  {
    id: "multiple-components",
    title: "Ready to connect?",
    message:
      "You have multiple components. Press Q to enter Quick Connect mode for faster linking.",
    trigger: "component-added",
    condition: (state) =>
      state.components.length >= 2 && state.connections.length === 0,
    priority: 8,
  },
  {
    id: "first-connection",
    title: "Excellent! 🔗",
    message:
      "You created your first connection. Double-click the connection line to add a label or change its properties.",
    trigger: "connection-created",
    condition: (state) => state.connections.length === 1,
    priority: 9,
  },
  {
    id: "quick-connect-tip",
    title: "Quick Connect Mode",
    message:
      "Click a source component, then click a target component to create a connection. Press ESC to exit.",
    trigger: "mode-changed",
    condition: (state) => state.canvasMode === "quick-connect",
    priority: 10,
  },
  {
    id: "pan-mode-tip",
    title: "Pan Mode",
    message:
      "Hold Space to temporarily enable pan mode, or click and drag to move around the canvas.",
    trigger: "mode-changed",
    condition: (state) => state.canvasMode === "pan",
    priority: 7,
  },
  {
    id: "annotation-tip",
    title: "Annotation Mode",
    message:
      "Click anywhere on the canvas to add notes and documentation to your diagram.",
    trigger: "mode-changed",
    condition: (state) => state.canvasMode === "annotation",
    priority: 7,
  },
  {
    id: "keyboard-shortcuts",
    title: "Pro Tip: Keyboard Shortcuts ⌨️",
    message:
      "Press ? to see all keyboard shortcuts. Use V for Select, Q for Quick Connect, and Space for Pan.",
    trigger: "idle",
    condition: (state) => state.components.length >= 3,
    priority: 5,
  },
  {
    id: "grid-snap",
    title: "Align Components Perfectly",
    message:
      "Enable snap-to-grid in the toolbar to automatically align components for a cleaner diagram.",
    trigger: "component-added",
    condition: (state) => state.components.length >= 5 && !state.snapToGrid,
    priority: 6,
  },
  {
    id: "properties-panel",
    title: "Customize Components",
    message:
      "Select a component and check the properties panel to customize colors, labels, and more.",
    trigger: "selection-changed",
    condition: (state) => state.selectedComponent !== null,
    priority: 7,
  },
];

const CanvasContextualHelpComponent = () => {
  // Early return if feature is disabled
  if (!isFeatureEnabled("contextualHelp")) {
    return null;
  }

  const [activeTip, setActiveTip] = useState<HelpTip | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  // Use individual selectors instead of object selector to prevent re-renders
  const components = useCanvasStore((state) => state.components);
  const connections = useCanvasStore((state) => state.connections);
  const canvasMode = useCanvasStore((state) => state.canvasMode);
  const selectedComponent = useCanvasStore((state) => state.selectedComponent);
  const snapToGrid = useCanvasStore((state) => state.snapToGrid);
  const dismissedStoreTips = useCanvasStore((state) => state.dismissedTips);

  const actions = useCanvasActions();

  // Merge local and store dismissed tips
  useEffect(() => {
    setDismissedTips((prev) => [...new Set([...prev, ...dismissedStoreTips])]);
  }, [dismissedStoreTips]);

  // Check for applicable tips when state changes
  useEffect(() => {
    const state = {
      components,
      connections,
      canvasMode,
      selectedComponent,
      snapToGrid,
    };

    // Find the highest priority applicable tip
    const applicableTips = helpTips
      .filter((tip) => !dismissedTips.includes(tip.id))
      .filter((tip) => !tip.condition || tip.condition(state))
      .sort((a, b) => b.priority - a.priority);

    if (applicableTips.length > 0 && !activeTip) {
      // Delay showing tip to avoid interrupting user flow
      const timer = setTimeout(() => {
        setActiveTip(applicableTips[0]);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    components.length,
    connections.length,
    canvasMode,
    selectedComponent,
    snapToGrid,
    dismissedTips,
  ]); // Removed activeTip from deps

  const handleDismiss = () => {
    if (activeTip) {
      const newDismissed = [...dismissedTips, activeTip.id];
      setDismissedTips(newDismissed);
      actions.dismissTip(activeTip.id);
      setActiveTip(null);
    }
  };

  if (!activeTip) {
    return null;
  }

  return (
    <div
      className={cx(
        "fixed bottom-8 right-8 z-[var(--z-tooltip)]",
        "max-w-sm bg-white rounded-lg shadow-xl border-2 border-blue-500",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
    >
      {/* Header with icon */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 mb-1">{activeTip.title}</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {activeTip.message}
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Tip {dismissedTips.length + 1} •{" "}
          {helpTips.length - dismissedTips.length} remaining
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export const CanvasContextualHelp = memo(CanvasContextualHelpComponent);
