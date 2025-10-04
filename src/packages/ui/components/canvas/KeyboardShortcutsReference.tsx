/**
 * src/packages/ui/components/canvas/KeyboardShortcutsReference.tsx
 * Modal dialog showing all available keyboard shortcuts for the canvas
 * Helps users discover and learn keyboard shortcuts
 * RELEVANT FILES: useCanvasKeyboardShortcuts.ts, DesignCanvas.tsx
 */

import { getAllShortcuts } from "@/shared/hooks/canvas/useCanvasKeyboardShortcuts";
import { cn } from "@core/utils";
import { Keyboard, X } from "lucide-react";
import React, { useMemo, useRef, useEffect, useState } from "react";

export interface KeyboardShortcutsReferenceProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
  highlightShortcuts?: string[];
}

export const KeyboardShortcutsReference: React.FC<
  KeyboardShortcutsReferenceProps
> = ({ isOpen, onClose, initialSection, highlightShortcuts = [] }) => {
  const shortcuts = useMemo(() => getAllShortcuts(), []);
  const [selectedSection, setSelectedSection] = useState<string | undefined>(initialSection);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, typeof shortcuts> = {};
    shortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });
    return groups;
  }, [shortcuts]);

  // Scroll to section when initialSection changes
  useEffect(() => {
    if (initialSection && sectionRefs.current[initialSection]) {
      sectionRefs.current[initialSection]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setSelectedSection(initialSection);
    }
  }, [initialSection]);

  const quickComponentShortcuts = useMemo(
    () => [
      { description: "Quick add component (opens overlay)", keys: "/" },
      { description: "Add last used component", keys: "A" },
      { description: "Add favorite component (if configured)", keys: "1-5" },
      {
        description: "Add via command palette",
        keys: "Cmd+K",
        note: "Then type component name",
      },
    ],
    [],
  );

  const architecturePatternShortcuts = useMemo(
    () => [
      { description: "Toggle patterns panel", keys: "Shift+P" },
      {
        description: "Drag preset card onto canvas to place it precisely",
        keys: "Drag",
      },
    ],
    [],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-[var(--z-sidebar)] bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Keyboard size={24} className="text-blue-600" />
              </div>
              <div>
                <h2
                  id="shortcuts-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-600">
                  Quick reference for canvas operations
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
              )}
              aria-label="Close shortcuts reference"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="sticky top-[73px] z-[var(--z-sidebar)] bg-gray-50 border-b border-gray-200 px-6 py-2 overflow-x-auto">
          <div className="flex gap-2">
            {Object.keys(groupedShortcuts).map((category) => (
              <button
                key={category}
                onClick={() => {
                  sectionRefs.current[category]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                  setSelectedSection(category);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                  selectedSection === category
                    ? "bg-blue-100 text-blue-700"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedShortcuts).map(
              ([category, categoryShortcuts]) => (
                <div
                  key={category}
                  className="space-y-3"
                  ref={(el) => { sectionRefs.current[category] = el; }}
                >
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => {
                      const isHighlighted = highlightShortcuts.includes(shortcut.action);
                      return (
                        <div
                          key={`${shortcut.action}-${index}`}
                          className={cn(
                            "flex items-center justify-between gap-4 rounded p-2",
                            isHighlighted && "bg-amber-50 border border-amber-200"
                          )}
                        >
                          <span className="text-sm text-gray-700">
                            {shortcut.description}
                            {isHighlighted && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-200 text-amber-900 rounded">
                                Featured
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {shortcut.keys.split("+").map((key, i, arr) => (
                              <React.Fragment key={i}>
                                <kbd
                                  className={cn(
                                    "px-2 py-1 min-w-[2rem] text-center",
                                    "text-xs font-mono font-semibold",
                                    "bg-gray-100 border border-gray-300 rounded",
                                    "shadow-sm",
                                  )}
                                >
                                  {key}
                                </kbd>
                                {i < arr.length - 1 && (
                                  <span className="text-gray-400 text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {category === "Connections" && (
                    <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-3 text-xs text-blue-900 shadow-sm">
                      <p className="font-semibold">Connection Tips</p>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>
                          Drag from any connection handle to start creating a
                          link between components.
                        </li>
                        <li>
                          Apply templates in the connection editor to instantly
                          set protocols, labels, and styles.
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              ),
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Quick Component Addition
              </h3>
              <div className="space-y-2">
                {quickComponentShortcuts.map((shortcut, index) => (
                  <div
                    key={`quick-add-${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-gray-700">
                      {shortcut.description}
                      {shortcut.note && (
                        <span className="block text-xs text-gray-500">
                          {shortcut.note}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {shortcut.keys.split("+").map((key, i, arr) => (
                        <React.Fragment key={`${key}-${i}`}>
                          <kbd
                            className={cn(
                              "px-2 py-1 min-w-[2rem] text-center",
                              "text-xs font-mono font-semibold",
                              "bg-gray-100 border border-gray-300 rounded",
                              "shadow-sm",
                            )}
                          >
                            {key}
                          </kbd>
                          {i < arr.length - 1 && (
                            <span className="text-gray-400 text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
                  Visual Preview
                </p>
                <div className="mt-2 aspect-[4/3] w-full rounded-md border border-blue-100 bg-white/80 text-[11px] text-blue-600 flex items-center justify-center">
                  Quick Add overlay preview
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Architecture Patterns
              </h3>
              <div className="space-y-2">
                {architecturePatternShortcuts.map((shortcut, index) => (
                  <div
                    key={`patterns-${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-gray-700">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {shortcut.keys.split("+").map((key, i, arr) => (
                        <React.Fragment key={`${key}-${i}`}>
                          <kbd
                            className={cn(
                              "px-2 py-1 min-w-[2rem] text-center",
                              "text-xs font-mono font-semibold",
                              "bg-gray-100 border border-gray-300 rounded",
                              "shadow-sm",
                            )}
                          >
                            {key}
                          </kbd>
                          {i < arr.length - 1 && (
                            <span className="text-gray-400 text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Tip
                </p>
                <p className="mt-2 text-sm text-amber-800">
                  Drag presets from the Patterns panel or use Shift+P to open it
                  quickly, then drop them where you want on the canvas.
                </p>
              </div>
            </div>
          </div>

          {/* Tips section */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              💡 Pro Tips
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>
                • Hover over toolbar buttons to see their keyboard shortcuts
              </li>
              <li>
                • Use{" "}
                <kbd className="px-1 bg-white border border-blue-300 rounded text-xs">
                  Shift
                </kbd>{" "}
                + arrow keys to pan around the canvas
              </li>
              <li>
                • Hold{" "}
                <kbd className="px-1 bg-white border border-blue-300 rounded text-xs">
                  Space
                </kbd>{" "}
                and drag to pan without shortcuts
              </li>
              <li>
                • Press{" "}
                <kbd className="px-1 bg-white border border-blue-300 rounded text-xs">
                  ?
                </kbd>{" "}
                or{" "}
                <kbd className="px-1 bg-white border border-blue-300 rounded text-xs">
                  /
                </kbd>{" "}
                anytime to view this reference
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Press{" "}
              <kbd className="px-1 bg-white border border-gray-300 rounded text-xs">
                Esc
              </kbd>{" "}
              to close
            </p>
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-2 bg-blue-600 text-white rounded-md",
                "text-sm font-medium transition-colors",
                "hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              )}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to open shortcuts modal with optional section
export const openShortcutsModal = (section?: string) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('open-keyboard-shortcuts', {
      detail: { section },
    })
  );
};

export default KeyboardShortcutsReference;
