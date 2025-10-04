/**
 * ArchiComm Ultra-Optimized Keyboard Shortcuts System
 * Designed for maximum productivity and efficiency
 *
 * Shortcut key assignments (no duplicates):
 * Alt+C: Add component
 * Ctrl+Shift+C: Add comment
 * Alt+N: Add note
 * (see initializeDefaultShortcuts for more)
 */

import { drawingColors } from "@/lib/design/design-system";
import type { DrawingTool } from "@/shared/contracts";
import { useCanvasActions, useCanvasStore } from "@/stores/canvasStore";

// Only canonical modifiers; 'cmd' is normalized to 'meta'
export type KeyModifier = "ctrl" | "meta" | "alt" | "shift";
export type ShortcutCategory =
  | "general"
  | "canvas"
  | "components"
  | "navigation"
  | "project"
  | "system"
  | "tools"
  | "drawing";

export interface ShortcutConfig {
  key: string;
  description: string;
  category: ShortcutCategory;
  action: (event?: KeyboardEvent) => void | Promise<void>;
  modifiers?: KeyModifier[];
  preventDefault?: boolean;
  global?: boolean;
}

export interface ShortcutAction {
  id: string;
  description: string;
  combination: string;
  category: ShortcutCategory;
  action: (event?: KeyboardEvent) => void | Promise<void>;
}

const DEFAULT_DRAWING_TOOL: DrawingTool = "pen";
const DRAWING_COLOR_VALUES = drawingColors.map((color) => color.value);
const canvasActions = useCanvasActions();

const isDrawingModeActive = (): boolean => {
  const state = useCanvasStore.getState();
  return state.canvasMode === "draw" && state.drawingTool !== null;
};

const ensureDrawingMode = (tool?: DrawingTool | null): void => {
  const state = useCanvasStore.getState();
  const desiredTool =
    tool ??
    state.drawingTool ??
    (state.drawingSettings ? state.drawingSettings.tool : null) ??
    DEFAULT_DRAWING_TOOL;

  if (state.canvasMode !== "draw") {
    canvasActions.setCanvasMode("draw");
  }

  canvasActions.setDrawingTool(desiredTool ?? DEFAULT_DRAWING_TOOL);
};

const toggleDrawingMode = (): void => {
  const state = useCanvasStore.getState();
  const hasActiveTool =
    state.canvasMode === "draw" && state.drawingTool !== null;

  if (hasActiveTool) {
    canvasActions.setDrawingTool(null);
    canvasActions.setCanvasMode("select");
    return;
  }

  const previousTool =
    state.drawingTool ??
    (state.drawingSettings ? state.drawingSettings.tool : null) ??
    DEFAULT_DRAWING_TOOL;

  canvasActions.setCanvasMode("draw");
  canvasActions.setDrawingTool(previousTool ?? DEFAULT_DRAWING_TOOL);
};

const adjustDrawingSize = (delta: number): void => {
  if (!isDrawingModeActive()) return;

  const state = useCanvasStore.getState();
  const nextSize = Math.min(20, Math.max(1, state.drawingSize + delta));
  if (nextSize !== state.drawingSize) {
    canvasActions.setDrawingSize(nextSize);
  }
};

const selectDrawingColorByIndex = (index: number): void => {
  const state = useCanvasStore.getState();
  if (state.canvasMode !== "draw") return;

  const palette = DRAWING_COLOR_VALUES;
  if (!palette.length) return;

  const normalizedIndex = Math.max(0, Math.min(index, palette.length - 1));
  const color = palette[normalizedIndex];
  if (color) {
    canvasActions.setDrawingColor(color);
  }
};

const confirmAndClearDrawings = (): void => {
  const state = useCanvasStore.getState();
  if (!state.drawings.length) return;

  if (typeof window === "undefined") {
    canvasActions.clearDrawings();
    return;
  }

  const confirmed = window.confirm(
    `Clear ${state.drawings.length} drawing${
      state.drawings.length === 1 ? "" : "s"
    }? This cannot be undone.`,
  );

  if (confirmed) {
    canvasActions.clearDrawings();
  }
};

export class KeyboardShortcutManager {
  // Map from normalized shortcut key to a single ShortcutConfig handler (no duplicates)
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private isEnabled = true;
  private changeListeners: Set<() => void> = new Set();
  private shortcutsVersion = 0;
  private autoSetup: boolean;

  constructor(options: { autoSetup?: boolean } = { autoSetup: true }) {
    this.autoSetup = options.autoSetup !== false;
    this.handleKeyDown = this.handleKeyDown.bind(this);

    if (
      this.autoSetup &&
      typeof window !== "undefined" &&
      typeof document !== "undefined"
    ) {
      this.initializeDefaultShortcuts();
      this.attachEventListeners();
    }
  }

  /**
   * Register a new keyboard shortcut. Returns an unregister function.
   * Warns if overwriting an existing shortcut in debug mode.
   */
  register(config: ShortcutConfig): () => boolean {
    const shortcutKey = this.generateShortcutKey(config.key, config.modifiers);
    if (this.debugMode && this.shortcuts.has(shortcutKey)) {
      console.warn(`Overwriting existing shortcut for ${shortcutKey}`);
    }
    this.shortcuts.set(shortcutKey, config);
    this.notifyChange();
    // Return unregister function
    return () => this.unregister(config.key, config.modifiers);
  }

  /**
   * Unregister a keyboard shortcut. Returns true if removed, false if not found.
   */
  unregister(key: string, modifiers?: KeyModifier[]): boolean {
    const shortcutKey = this.generateShortcutKey(key, modifiers);
    const removed = this.shortcuts.delete(shortcutKey);
    if (removed) this.notifyChange();
    return removed;
  }

  /**
   * Enable/disable the shortcut system
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Temporarily disable shortcuts (useful when modals/overlays are open)
   */
  private temporarilyDisabled = false;

  temporarilyDisableShortcuts(): void {
    this.temporarilyDisabled = true;
  }

  enableShortcuts(): void {
    this.temporarilyDisabled = false;
  }

  /**
   * Get all shortcuts by category
   */
  getShortcutsByCategory(category: ShortcutCategory): ShortcutConfig[] {
    // Only single ShortcutConfig per key; filter after flattening
    return Array.from(this.shortcuts.values()).filter(
      (shortcut) => shortcut.category === category,
    );
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): ShortcutConfig[] {
    // Only single ShortcutConfig per key
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get current shortcuts version for change tracking
   */
  getShortcutsVersion(): number {
    return this.shortcutsVersion;
  }

  /**
   * Get shortcut by ID
   */
  getShortcut(shortcutId: string): ShortcutAction | null {
    const config = Array.from(this.shortcuts.values()).find(
      (s) => s.description.toLowerCase().replace(/\s+/g, "_") === shortcutId,
    );
    if (!config) return null;

    return {
      id: shortcutId,
      description: config.description,
      combination: this.generateShortcutKey(config.key, config.modifiers),
      category: config.category,
      action: config.action,
    };
  }

  /**
   * Execute shortcut by action
   */
  executeShortcut(shortcut: ShortcutAction, event?: KeyboardEvent): void {
    try {
      shortcut.action(event);
    } catch (error) {
      console.error("Failed to execute shortcut:", error);
    }
  }

  /**
   * Subscribe to shortcut changes
   */
  onShortcutsChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  /**
   * Notify listeners of shortcut changes
   */
  private notifyChange(): void {
    this.shortcutsVersion++;
    this.changeListeners.forEach((callback) => callback());
  }

  /**
   * Debug mode for development
   */
  private debugMode = import.meta.env.DEV;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Handle keyboard events with high performance
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled || this.temporarilyDisabled) return;
    if (event.isComposing) return; // Prevent shortcut execution during IME composition

    const target = event.target as HTMLElement;
    const shortcutKey = this.generateShortcutKeyFromEvent(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    // Allow shortcuts marked as global to fire even inside inputs
    if (
      this.isInputElement(target) &&
      !(shortcut && (shortcut as any).global)
    ) {
      return;
    }

    if (shortcut) {
      if (this.debugMode) {
        console.log(
          `Executing shortcut: ${shortcut.description} (${shortcutKey})`,
        );
      }

      if (shortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Execute with performance monitoring
      try {
        shortcut.action();
      } catch (error) {
        console.error("Shortcut execution error:", error);
      }
    }
  }

  private attachEventListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown, true);
  }

  private detachEventListeners(): void {
    document.removeEventListener("keydown", this.handleKeyDown, true);
  }

  private isInputElement(element: HTMLElement): boolean {
    // If command palette or modal overlays are open, treat as input-like to block canvas shortcuts
    try {
      if (typeof document !== "undefined") {
        const commandPaletteOpen = !!document.querySelector(
          '[data-command-palette-open="true"], [data-command-palette], .command-palette-open',
        );
        const modalOpen = !!document.querySelector(
          '[data-modal-open="true"], .modal-open, dialog[open]',
        );
        if (commandPaletteOpen || modalOpen) {
          return true;
        }
      }
    } catch (e) {
      // ignore DOM access issues
    }

    const tagName = element.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      element.contentEditable === "true" ||
      element.isContentEditable ||
      element.hasAttribute("data-keyboard-ignore") ||
      element.closest("[data-keyboard-ignore]") !== null
    );
  }

  private generateShortcutKey(key: string, modifiers?: KeyModifier[]): string {
    const mods = modifiers?.sort().join("+") || "";
    return mods ? `${mods}+${key.toLowerCase()}` : key.toLowerCase();
  }

  private generateShortcutKeyFromEvent(event: KeyboardEvent): string {
    const modifiers: KeyModifier[] = [];

    if (event.ctrlKey) modifiers.push("ctrl");
    if (event.metaKey) modifiers.push("meta");
    if (event.altKey) modifiers.push("alt");
    if (event.shiftKey) modifiers.push("shift");

    return this.generateShortcutKey(event.key, modifiers);
  }

  private initializeDefaultShortcuts(): void {
    // Helper to determine if focus is on canvas (best-effort)
    const isCanvasFocused = (): boolean => {
      try {
        const canvasRoot = document.querySelector(
          '[data-screen="design-canvas"], #design-canvas, .design-canvas',
        );
        const active = document.activeElement;
        // If there's no active element (rare) or body is active, allow canvas shortcuts
        if (!active || active === document.body) {
          return !!canvasRoot;
        }
        // If the active element is contained within the canvas root, it's focused
        if (canvasRoot && canvasRoot.contains(active)) {
          return true;
        }
        // Otherwise, treat as not focused
        return false;
      } catch (e) {
        return true;
      }
    };

    // General shortcuts
    this.register({
      key: "n",
      modifiers: ["ctrl"],
      description: "Create new project",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:new-project"));
      },
    });

    this.register({
      key: "o",
      modifiers: ["ctrl"],
      description: "Open project",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:open-project"));
      },
    });

    this.register({
      key: "s",
      modifiers: ["ctrl"],
      description: "Save project",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:save-project"));
      },
    });

    this.register({
      key: ",",
      modifiers: ["ctrl"],
      description: "AI Settings",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:ai-settings"));
      },
    });

    // 'Add component': Alt+C, 'Add comment': Ctrl+Shift+C (no conflicts)
    this.register({
      key: "c",
      modifiers: ["alt"],
      description: "Add component",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-component"));
      },
    });

    this.register({
      key: "c",
      modifiers: ["ctrl", "shift"],
      description: "Add comment",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-comment"));
      },
    });

    this.register({
      key: "z",
      modifiers: ["ctrl"],
      description: "Undo",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:undo"));
      },
    });

    this.register({
      key: "y",
      modifiers: ["ctrl"],
      description: "Redo",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:redo"));
      },
    });

    this.register({
      key: "z",
      modifiers: ["ctrl", "shift"],
      description: "Redo",
      category: "general",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:redo"));
      },
    });

    // Canvas shortcuts

    this.register({
      key: "l",
      modifiers: ["alt"],
      description: "Add connection",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-connection"));
      },
    });

    this.register({
      key: "Delete",
      description: "Delete selected",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:delete-selected"));
      },
    });

    this.register({
      key: "a",
      modifiers: ["ctrl"],
      description: "Select all",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:select-all"));
      },
    });

    this.register({
      key: "Escape",
      description: "Clear selection",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:clear-selection"));
      },
    });

    // Quick Add Mode: Slash key opens command palette pre-filled and triggers quick-add overlay
    this.register({
      key: "/",
      description: "Quick add component",
      category: "canvas",
      action: () => {
        // Open command palette with pre-filled search to surface component commands
        try {
          window.dispatchEvent(
            new CustomEvent("command-palette:open", {
              detail: { query: "add " },
            }),
          );
        } catch (e) {
          // ignore
        }
        // Also dispatch the quick-add shortcut event for overlay toggles
        window.dispatchEvent(new CustomEvent("shortcut:quick-add-component"));
      },
      // keep as canvas-level (not global) so it respects modal/command palette state
    });

    // Add Last Component: 'a' (no modifiers) - only when canvas is focused
    // Note: This intentionally registers a context-sensitive shortcut. The action will no-op if canvas is not focused.
    this.register({
      key: "a",
      description: "Add last used component",
      category: "canvas",
      action: () => {
        try {
          if (!isCanvasFocused()) {
            return;
          }
          const last = window.localStorage.getItem(
            "archicomm_last_used_component",
          );
          if (!last) {
            // No last used component recorded; optionally notify listeners
            window.dispatchEvent(
              new CustomEvent("canvas:add-last-component", {
                detail: { componentType: null },
              }),
            );
            return;
          }
          window.dispatchEvent(
            new CustomEvent("canvas:add-last-component", {
              detail: { componentType: last },
            }),
          );
        } catch (e) {
          // ignore errors
        }
      },
    });

    // Comment shortcuts
    this.register({
      key: "c",
      description: "Add comment",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-comment"));
      },
    });

    this.register({
      key: "n",
      modifiers: ["alt"],
      description: "Add note",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-note"));
      },
    });

    this.register({
      key: "l",
      modifiers: ["shift"],
      description: "Add label",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-label"));
      },
    });

    this.register({
      key: "a",
      modifiers: ["shift"],
      description: "Add arrow",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-arrow"));
      },
    });

    this.register({
      key: "h",
      modifiers: ["shift"],
      description: "Add highlight",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:add-highlight"));
      },
    });

    // Component shortcuts
    this.register({
      key: "d",
      modifiers: ["ctrl"],
      description: "Duplicate selected",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:duplicate"));
      },
    });

    this.register({
      key: "g",
      modifiers: ["ctrl"],
      description: "Group selected",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:group"));
      },
    });

    this.register({
      key: "u",
      modifiers: ["ctrl"],
      description: "Ungroup selected",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:ungroup"));
      },
    });

    // Register favorites (keys 1-5) if configured in localStorage
    try {
      const favJson = window.localStorage.getItem(
        "archicomm_favorite_components",
      );
      const favorites: string[] = favJson ? JSON.parse(favJson) : [];
      if (Array.isArray(favorites) && favorites.length > 0) {
        const maxFavorites = Math.min(5, favorites.length);
        for (let i = 0; i < maxFavorites; i += 1) {
          const key = String(i + 1);
          const componentType = favorites[i];
          // Register only if a non-empty string componentType exists
          if (typeof componentType === "string" && componentType.trim()) {
            // Wrap in IIFE to capture variables per iteration
            ((favType: string, favIndex: number, favKey: string) => {
              this.register({
                key: favKey,
                description: `Add favorite component ${favIndex + 1}`,
                category: "canvas",
                action: () => {
                  try {
                    if (!isCanvasFocused()) return;
                    window.dispatchEvent(
                      new CustomEvent("canvas:add-component", {
                        detail: { componentType: favType },
                      }),
                    );
                  } catch (e) {
                    // ignore
                  }
                },
              });
            })(componentType, i, key);
          }
        }
      }
    } catch (e) {
      // ignore malformed favorites
    }

    // Shortcut for toggling patterns panel: Shift+P
    this.register({
      key: "P",
      modifiers: ["shift"],
      description: "Toggle patterns panel",
      category: "navigation",
      action: () => {
        void window.dispatchEvent(
          new CustomEvent("shortcut:toggle-patterns-panel"),
        );
      },
    });

    // Navigation shortcuts
    this.register({
      key: "f",
      modifiers: ["ctrl"],
      description: "Find/Search",
      category: "navigation",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:search"));
      },
    });

    this.register({
      key: "1",
      modifiers: ["ctrl"],
      description: "Switch to Canvas view",
      category: "navigation",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:view-canvas"));
      },
    });

    this.register({
      key: "2",
      modifiers: ["ctrl"],
      description: "Switch to Component palette",
      category: "navigation",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:view-components"));
      },
    });

    this.register({
      key: "3",
      modifiers: ["ctrl"],
      description: "Switch to Project view",
      category: "navigation",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:view-project"));
      },
    });

    // Zoom and pan
    this.register({
      key: "Equal",
      modifiers: ["ctrl"],
      description: "Zoom in",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:zoom-in"));
      },
    });

    this.register({
      key: "Minus",
      modifiers: ["ctrl"],
      description: "Zoom out",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:zoom-out"));
      },
    });

    this.register({
      key: "0",
      modifiers: ["ctrl"],
      description: "Reset zoom",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:zoom-reset"));
      },
    });

    // System shortcuts
    this.register({
      key: "?",
      modifiers: ["shift"],
      description: "Show shortcuts help",
      category: "system",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:show-help"));
      },
    });

    this.register({
      key: "F11",
      description: "Toggle fullscreen",
      category: "system",
      action: () => {
        void window.dispatchEvent(
          new CustomEvent("shortcut:toggle-fullscreen"),
        );
      },
    });

    // Arrow key navigation
    this.register({
      key: "ArrowUp",
      description: "Move up",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:move-up"));
      },
    });

    this.register({
      key: "ArrowDown",
      description: "Move down",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:move-down"));
      },
    });

    this.register({
      key: "ArrowLeft",
      description: "Move left",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:move-left"));
      },
    });

    this.register({
      key: "ArrowRight",
      description: "Move right",
      category: "canvas",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:move-right"));
      },
    });

    // Tool selection shortcuts
    this.register({
      key: "v",
      description: "Select tool",
      category: "tools",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:tool-select"));
      },
    });

    this.register({
      key: "h",
      description: "Pan tool / Highlighter",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) {
          return;
        }

        const state = useCanvasStore.getState();
        if (state.canvasMode === "draw") {
          ensureDrawingMode("highlighter");
          return;
        }

        void window.dispatchEvent(new CustomEvent("shortcut:tool-pan"));
      },
    });

    this.register({
      key: "z",
      description: "Zoom tool",
      category: "tools",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:tool-zoom"));
      },
    });

    this.register({
      key: "a",
      description: "Annotate tool",
      category: "tools",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:tool-annotate"));
      },
    });

    // Drawing shortcuts
    this.register({
      key: "d",
      description: "Toggle drawing mode",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) return;
        toggleDrawingMode();
      },
    });

    this.register({
      key: "p",
      description: "Pen tool",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) return;
        ensureDrawingMode("pen");
      },
    });

    this.register({
      key: "e",
      description: "Eraser tool",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) return;
        ensureDrawingMode("eraser");
      },
    });

    this.register({
      key: "[",
      description: "Decrease brush size",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) return;
        adjustDrawingSize(-1);
      },
    });

    this.register({
      key: "]",
      description: "Increase brush size",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) return;
        adjustDrawingSize(1);
      },
    });

    const drawingColorKeys = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ] as const;
    drawingColorKeys.forEach((key, index) => {
      const colorName = drawingColors[index]?.name ?? "Custom";
      this.register({
        key,
        description: `Quick color: ${colorName}`,
        category: "drawing",
        preventDefault: false,
        action: () => {
          if (!isCanvasFocused()) return;
          selectDrawingColorByIndex(index);
        },
      });
    });

    this.register({
      key: "d",
      modifiers: ["ctrl", "shift"],
      description: "Clear all drawings",
      category: "drawing",
      action: () => {
        if (!isCanvasFocused()) return;
        confirmAndClearDrawings();
      },
    });

    this.register({
      key: "d",
      modifiers: ["meta", "shift"],
      description: "Clear all drawings (Cmd)",
      category: "drawing",
      action: () => {
        if (!isCanvasFocused()) return;
        confirmAndClearDrawings();
      },
    });

    // Escape to exit drawing mode
    this.register({
      key: "Escape",
      description: "Exit drawing mode",
      category: "drawing",
      preventDefault: false,
      action: () => {
        if (!isCanvasFocused()) return;
        const state = useCanvasStore.getState();
        if (state.canvasMode === "draw") {
          canvasActions.setDrawingTool(null);
          canvasActions.setCanvasMode("select");
        }
      },
    });

    // Context menu shortcuts
    this.register({
      key: "F2",
      description: "Edit properties",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:edit-properties"));
      },
    });

    // Note: Duplicate shortcut removed - already defined above as "Duplicate selected"

    this.register({
      key: "c",
      modifiers: ["ctrl"],
      description: "Copy",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:copy"));
      },
    });

    this.register({
      key: "v",
      modifiers: ["ctrl"],
      description: "Paste",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:paste"));
      },
    });

    this.register({
      key: "]",
      modifiers: ["ctrl", "shift"],
      description: "Bring to front",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:bring-to-front"));
      },
    });

    this.register({
      key: "[",
      modifiers: ["ctrl", "shift"],
      description: "Send to back",
      category: "components",
      action: () => {
        void window.dispatchEvent(new CustomEvent("shortcut:send-to-back"));
      },
    });

    this.register({
      key: "F10",
      modifiers: ["shift"],
      description: "Show context menu",
      category: "general",
      action: () => {
        void window.dispatchEvent(
          new CustomEvent("shortcut:show-context-menu"),
        );
      },
    });
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.detachEventListeners();
    this.shortcuts.clear();
    this.changeListeners.clear(); // Clear listeners to prevent memory leaks
  }
}

// React hook for using keyboard shortcuts
import { useEffect, useRef } from "react";

/**
 * React hook for using keyboard shortcuts.
 * Note: The returned manager may be null on first render; consumers should handle this case.
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const managerRef = useRef<KeyboardShortcutManager | null>(
    new KeyboardShortcutManager(),
  );

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    // Register custom shortcuts
    shortcuts.forEach((shortcut) => {
      manager.register(shortcut);
    });

    return () => {
      // Cleanup custom shortcuts
      shortcuts.forEach((shortcut) => {
        manager.unregister(shortcut.key, shortcut.modifiers);
      });
    };
  }, [shortcuts]);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, []);

  return managerRef.current;
};

// Global keyboard shortcut manager instance - lazy singleton
let _globalShortcutManager: KeyboardShortcutManager | null = null;

export const getGlobalShortcutManager = (): KeyboardShortcutManager | null => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  if (!_globalShortcutManager) {
    _globalShortcutManager = new KeyboardShortcutManager();
  }

  return _globalShortcutManager;
};

// Utility functions for formatted shortcut display
export const formatShortcutKey = (
  key: string,
  modifiers?: KeyModifier[],
): string => {
  // Defensive check for navigator
  let isMac = false;
  if (typeof navigator !== "undefined" && navigator.platform) {
    isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  }
  // Only valid KeyModifier keys
  const modifierSymbols: Record<KeyModifier, string> = {
    ctrl: isMac ? "⌃" : "Ctrl",
    meta: isMac ? "⌘" : "Meta",
    alt: isMac ? "⌥" : "Alt",
    shift: isMac ? "⇧" : "Shift",
  };
  const canonicalOrder: KeyModifier[] = ["ctrl", "meta", "alt", "shift"];
  const ordered = modifiers
    ? [...modifiers].sort(
        (a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b),
      )
    : [];
  // Provide fallback for missing modifier keys
  const formattedModifiers =
    ordered.map((mod) => modifierSymbols[mod] ?? mod) || [];
  // Normalize key casing: capitalize first letter, except for special keys
  let formattedKey = key === " " ? "Space" : key;
  if (formattedKey.length === 1) {
    formattedKey = formattedKey.toUpperCase();
  }
  return [...formattedModifiers, formattedKey].join(isMac ? "" : "+");
};

export const getShortcutsByCategory = (
  category: ShortcutCategory,
): ShortcutConfig[] => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.getShortcutsByCategory(category) : [];
};

export const getAllShortcuts = (): ShortcutConfig[] => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.getAllShortcuts() : [];
};

export const getShortcutsVersion = (): number => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.getShortcutsVersion() : 0;
};

export const onShortcutsChange = (callback: () => void): (() => void) => {
  const manager = getGlobalShortcutManager();
  return manager ? manager.onShortcutsChange(callback) : () => false;
};
