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
import { shortcutBus } from "@/lib/events/shortcutBus";
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

export type ShortcutScope = "global" | "canvas" | "input-safe";

interface NormalizedShortcutConfig extends ShortcutConfig {
  scope: ShortcutScope;
}

type ShortcutBroadcastMessage =
  | {
      type: "status";
      tabId: string;
      active: boolean;
    }
  | {
      type: "status-request";
      tabId: string;
    };

export interface ShortcutConfig {
  key: string;
  description: string;
  category: ShortcutCategory;
  action: (event?: KeyboardEvent) => void | Promise<void>;
  modifiers?: KeyModifier[];
  preventDefault?: boolean;
  scope?: ShortcutScope;
  /**
   * @deprecated Use `scope` instead.
   */
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

const emitShortcut = (topic: string, detail?: any): void => {
  shortcutBus.emit(topic, detail);
};

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
    announceModeChange("draw");
  }

  canvasActions.setDrawingTool(desiredTool ?? DEFAULT_DRAWING_TOOL);
};

const announceModeChange = (mode: string): void => {
  shortcutBus.emit("canvas:mode-changed", { mode, source: "shortcut" });
};

const enterDrawMode = (): void => {
  const state = useCanvasStore.getState();
  const desiredTool =
    state.drawingTool ??
    (state.drawingSettings ? state.drawingSettings.tool : null) ??
    DEFAULT_DRAWING_TOOL;

  const modeChanged = state.canvasMode !== "draw";
  canvasActions.setCanvasMode("draw");
  canvasActions.setDrawingTool(desiredTool ?? DEFAULT_DRAWING_TOOL);
  if (modeChanged) {
    announceModeChange("draw");
  }
};

const enterAnnotationMode = (): void => {
  const state = useCanvasStore.getState();
  const modeChanged = state.canvasMode !== "annotation";
  canvasActions.setDrawingTool(null);
  canvasActions.setCanvasMode("annotation");
  if (modeChanged) {
    announceModeChange("annotation");
  }
};

const exitToSelectMode = (): void => {
  const state = useCanvasStore.getState();
  const modeChanged = state.canvasMode !== "select";
  canvasActions.setDrawingTool(null);
  canvasActions.setCanvasMode("select");
  if (modeChanged) {
    announceModeChange("select");
  }
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
  private shortcuts: Map<string, NormalizedShortcutConfig> = new Map();
  private isEnabled = true;
  private changeListeners: Set<() => void> = new Set();
  private shortcutsVersion = 0;
  private autoSetup: boolean;
  private crossTabEnabled = true;
  private broadcastChannel?: BroadcastChannel;
  private readonly tabId: string;
  private isActiveTab = true;
  private activeTabId?: string;
  private broadcastHandlersAttached = false;

  constructor(options: { autoSetup?: boolean } = { autoSetup: true }) {
    this.autoSetup = options.autoSetup !== false;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.tabId = `shortcut-tab-${Math.random().toString(36).slice(2, 10)}`;

    if (
      this.autoSetup &&
      typeof window !== "undefined" &&
      typeof document !== "undefined"
    ) {
      this.initializeDefaultShortcuts();
      this.attachEventListeners();
      this.setupCrossTabChannel();
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
    const normalizedScope: ShortcutScope =
      config.scope ?? (config.global ? "global" : "canvas");
    const normalizedConfig: NormalizedShortcutConfig = {
      ...config,
      scope: normalizedScope,
    };
    this.detectModifierOverlap(shortcutKey, normalizedConfig);
    this.shortcuts.set(shortcutKey, normalizedConfig);
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

  setCrossTabEnabled(enabled: boolean): void {
    if (this.crossTabEnabled === enabled) {
      return;
    }
    this.crossTabEnabled = enabled;
    if (enabled) {
      this.setupCrossTabChannel();
    } else {
      this.teardownCrossTabChannel();
    }
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
    if (this.crossTabEnabled && !this.isActiveTab) return;
    if (event.isComposing) return; // Prevent shortcut execution during IME composition

    const target =
      (event.target as HTMLElement | null | undefined) ?? document.body;
    const shortcutKey = this.generateShortcutKeyFromEvent(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (!shortcut) {
      return;
    }

    if (!this.scopeAllowsExecution(shortcut.scope, target)) {
      return;
    }

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
      shortcut.action(event);
    } catch (error) {
      console.error("Shortcut execution error:", error);
    }
  }

  private attachEventListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown, true);
    this.setupCrossTabChannel();
  }

  private detachEventListeners(): void {
    document.removeEventListener("keydown", this.handleKeyDown, true);
  }

  private hasGlobalShortcutBlockers(): boolean {
    try {
      if (typeof document === "undefined") {
        return false;
      }
      const commandPaletteOpen = !!document.querySelector(
        '[data-command-palette-open="true"], [data-command-palette], .command-palette-open',
      );
      const modalOpen = !!document.querySelector(
        '[data-modal-open="true"], .modal-open, dialog[open]',
      );
      return commandPaletteOpen || modalOpen;
    } catch {
      return false;
    }
  }

  private isKeyboardIgnoredElement(element: HTMLElement): boolean {
    return (
      element.hasAttribute("data-keyboard-ignore") ||
      element.closest("[data-keyboard-ignore]") !== null
    );
  }

  private isFormControlElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select";
  }

  private isEditableElement(element: HTMLElement): boolean {
    return element.contentEditable === "true" || element.isContentEditable;
  }

  private isTextEntryElement(element: HTMLElement): boolean {
    if (this.isEditableElement(element)) {
      return true;
    }

    if (!this.isFormControlElement(element)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === "textarea") {
      return true;
    }

    if (tagName === "input") {
      const input = element as HTMLInputElement;
      const inputType = (input.type ?? "text").toLowerCase();
      const nonTextTypes = new Set([
        "button",
        "checkbox",
        "radio",
        "range",
        "color",
        "file",
        "reset",
        "submit",
        "image",
        "date",
        "datetime-local",
        "month",
        "time",
        "week",
        "number",
      ]);
      return !nonTextTypes.has(inputType);
    }

    return false;
  }

  private scopeAllowsExecution(
    scope: ShortcutScope,
    element: HTMLElement,
  ): boolean {
    if (scope === "global") {
      return true;
    }

    if (this.hasGlobalShortcutBlockers()) {
      return false;
    }

    if (this.isKeyboardIgnoredElement(element)) {
      return false;
    }

    if (scope === "canvas") {
      return !this.isFormControlElement(element) && !this.isEditableElement(element);
    }

    if (scope === "input-safe") {
      return !this.isTextEntryElement(element);
    }

    return true;
  }

  private isInputElement(element: HTMLElement): boolean {
    return !this.scopeAllowsExecution("canvas", element);
  }

  private registerPlatformShortcut(
    config: ShortcutConfig & { modifiers: KeyModifier[] },
  ): void {
    const includesCtrl = config.modifiers.includes("ctrl");
    const includesMeta = config.modifiers.includes("meta");

    if (!includesCtrl && !includesMeta) {
      this.register(config);
      return;
    }

    const baseModifiers = config.modifiers.filter(
      (modifier) => modifier !== "ctrl" && modifier !== "meta",
    );

    const combos: KeyModifier[][] = [];

    if (includesCtrl || !includesMeta) {
      combos.push([...baseModifiers, "ctrl"]);
    }

    if (includesMeta || includesCtrl) {
      combos.push([...baseModifiers, "meta"]);
    }

    const seen = new Set<string>();

    combos.forEach((combo) => {
      const normalized = [...combo].sort() as KeyModifier[];
      const comboKey = this.generateShortcutKey(config.key, normalized);
      if (seen.has(comboKey)) {
        return;
      }
      seen.add(comboKey);
      this.register({ ...config, modifiers: normalized });
    });
  }

  private setupCrossTabChannel(): void {
    if (!this.crossTabEnabled) {
      return;
    }

    if (this.broadcastChannel) {
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      this.isActiveTab = true;
      return;
    }

    this.broadcastChannel = new BroadcastChannel(
      "archicomm-shortcut-coordination",
    );
    this.broadcastChannel.addEventListener(
      "message",
      this.handleBroadcastMessage,
    );

    if (!this.broadcastHandlersAttached) {
      window.addEventListener("focus", this.handleWindowFocus, true);
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      window.addEventListener("pagehide", this.handlePageHide);
      window.addEventListener("beforeunload", this.handleBeforeUnload);
      this.broadcastHandlersAttached = true;
    }

    this.isActiveTab = this.isDocumentVisible();
    this.activeTabId = this.isActiveTab ? this.tabId : undefined;
    this.sendStatus(this.isActiveTab);
    this.requestStatus();
  }

  private teardownCrossTabChannel(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.removeEventListener(
        "message",
        this.handleBroadcastMessage,
      );
      this.broadcastChannel.close();
      this.broadcastChannel = undefined;
    }

    if (this.broadcastHandlersAttached) {
      window.removeEventListener("focus", this.handleWindowFocus, true);
      if (typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          this.handleVisibilityChange,
        );
      }
      window.removeEventListener("pagehide", this.handlePageHide);
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
      this.broadcastHandlersAttached = false;
    }

    this.isActiveTab = true;
    this.activeTabId = undefined;
  }

  private handleBroadcastMessage = (
    event: MessageEvent<ShortcutBroadcastMessage>,
  ) => {
    if (!this.crossTabEnabled) {
      return;
    }

    const message = event.data;
    if (!message || message.tabId === this.tabId) {
      return;
    }

    if (message.type === "status-request") {
      this.sendStatus(this.isActiveTab);
      return;
    }

    if (message.type === "status") {
      if (message.active) {
        this.isActiveTab = false;
        this.activeTabId = message.tabId;
      } else if (this.activeTabId === message.tabId) {
        this.activeTabId = undefined;
        if (this.isDocumentVisible()) {
          this.claimActiveTab();
        }
      }
    }
  };

  private handleWindowFocus = () => {
    if (!this.crossTabEnabled) {
      return;
    }
    this.claimActiveTab();
  };

  private handleVisibilityChange = () => {
    if (!this.crossTabEnabled || typeof document === "undefined") {
      return;
    }
    if (document.hidden) {
      this.surrenderActiveTab();
    } else {
      this.claimActiveTab();
    }
  };

  private handlePageHide = () => {
    if (!this.crossTabEnabled) {
      return;
    }
    this.surrenderActiveTab();
  };

  private handleBeforeUnload = () => {
    if (!this.crossTabEnabled) {
      return;
    }
    this.surrenderActiveTab();
  };

  private claimActiveTab(): void {
    if (!this.crossTabEnabled) {
      return;
    }
    if (!this.isDocumentVisible()) {
      return;
    }
    if (this.isActiveTab) {
      this.sendStatus(true);
      return;
    }

    this.isActiveTab = true;
    this.activeTabId = this.tabId;
    this.sendStatus(true);
  }

  private surrenderActiveTab(): void {
    if (!this.crossTabEnabled) {
      return;
    }
    if (!this.isActiveTab) {
      return;
    }

    this.isActiveTab = false;
    if (this.activeTabId === this.tabId) {
      this.activeTabId = undefined;
    }
    this.sendStatus(false);
  }

  private sendStatus(active: boolean): void {
    if (!this.crossTabEnabled || !this.broadcastChannel) {
      return;
    }
    this.broadcastChannel.postMessage({
      type: "status",
      tabId: this.tabId,
      active,
    });
  }

  private requestStatus(): void {
    if (!this.crossTabEnabled || !this.broadcastChannel) {
      return;
    }
    this.broadcastChannel.postMessage({
      type: "status-request",
      tabId: this.tabId,
    });
  }

  private isDocumentVisible(): boolean {
    if (typeof document === "undefined") {
      return true;
    }
    return !document.hidden;
  }

  private generateShortcutKey(key: string, modifiers?: KeyModifier[]): string {
    const mods = modifiers?.sort().join("+") || "";
    return mods ? `${mods}+${key.toLowerCase()}` : key.toLowerCase();
  }

  private getBaseKey(key: string): string {
    return key.toLowerCase();
  }

  private detectModifierOverlap(
    shortcutKey: string,
    config: NormalizedShortcutConfig,
  ): void {
    const hasModifiers = !!config.modifiers?.length;
    const baseKey = this.getBaseKey(config.key);

    this.shortcuts.forEach((existingConfig, existingKey) => {
      if (existingKey === shortcutKey) {
        return;
      }

      if (this.getBaseKey(existingConfig.key) !== baseKey) {
        return;
      }

      const existingHasModifiers = !!existingConfig.modifiers?.length;
      const involvesModifierOverlap =
        hasModifiers !== existingHasModifiers &&
        (!hasModifiers || !existingHasModifiers);

      if (!involvesModifierOverlap) {
        return;
      }

      if (existingConfig.category !== config.category) {
        return;
      }

      if (this.debugMode) {
        console.warn(
          `[KeyboardShortcuts] Potential modifier overlap detected for key "${config.key}" in category "${config.category}". Consider remapping or scoping shortcuts to avoid conflicts.`,
        );
      }
    });
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

    const shouldBlockForActiveInput = (): boolean => {
      try {
        if (typeof document === "undefined") {
          return false;
        }
        const activeElement = document.activeElement as HTMLElement | null;
        if (!activeElement) {
          return false;
        }
        return this.isInputElement(activeElement);
      } catch (_error) {
        return false;
      }
    };

    const withCanvasFocus = (
      handler: ShortcutConfig["action"],
    ): ShortcutConfig["action"] => {
      return (event?: KeyboardEvent) => {
        if (!isCanvasFocused()) {
          return;
        }
        if (shouldBlockForActiveInput()) {
          return;
        }
        handler(event);
      };
    };

    // General shortcuts
    this.registerPlatformShortcut({
      key: "n",
      modifiers: ["ctrl"],
      description: "Create new project",
      category: "general",
      scope: "global",
      action: () => {
        emitShortcut("shortcut:new-project");
      },
    });

    this.registerPlatformShortcut({
      key: "o",
      modifiers: ["ctrl"],
      description: "Open project",
      category: "general",
      scope: "global",
      action: () => {
        emitShortcut("shortcut:open-project");
      },
    });

    this.registerPlatformShortcut({
      key: "s",
      modifiers: ["ctrl"],
      description: "Save project",
      category: "general",
      scope: "global",
      action: () => {
        emitShortcut("shortcut:save-project");
      },
    });

    this.registerPlatformShortcut({
      key: ",",
      modifiers: ["ctrl"],
      description: "AI Settings",
      category: "general",
      scope: "global",
      action: () => {
        emitShortcut("shortcut:ai-settings");
      },
    });

    // 'Add component': Alt+C, 'Add comment': Ctrl+Shift+C (no conflicts)
    this.register({
      key: "c",
      modifiers: ["alt"],
      description: "Add component",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-component");
      },
    });

    this.register({
      key: "c",
      modifiers: ["ctrl", "shift"],
      description: "Add comment",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-comment");
      },
    });

    this.registerPlatformShortcut({
      key: "z",
      modifiers: ["ctrl"],
      description: "Undo",
      category: "general",
      action: () => {
        emitShortcut("shortcut:undo");
      },
    });

    this.register({
      key: "y",
      modifiers: ["ctrl"],
      description: "Redo",
      category: "general",
      action: () => {
        emitShortcut("shortcut:redo");
      },
    });

    this.registerPlatformShortcut({
      key: "z",
      modifiers: ["ctrl", "shift"],
      description: "Redo",
      category: "general",
      action: () => {
        emitShortcut("shortcut:redo");
      },
    });

    // Canvas shortcuts

    this.register({
      key: "l",
      modifiers: ["alt"],
      description: "Add connection",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-connection");
      },
    });

    this.register({
      key: "Delete",
      description: "Delete selected",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:delete-selected");
      },
    });

    this.registerPlatformShortcut({
      key: "a",
      modifiers: ["ctrl"],
      description: "Select all",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:select-all");
      },
    });

    this.register({
      key: "Escape",
      description: "Clear selection",
      category: "canvas",
      action: withCanvasFocus((event) => {
        event?.preventDefault?.();
        exitToSelectMode();
        emitShortcut("shortcut:clear-selection");
      }),
    });

    // Quick Add Mode: Slash key opens command palette pre-filled and triggers quick-add overlay
    this.register({
      key: "/",
      description: "Quick add component",
      category: "canvas",
      action: () => {
        // Open command palette with pre-filled search to surface component commands
        try {
          emitShortcut("command-palette:open", { query: "add " });
        } catch (e) {
          // ignore
        }
        // Also dispatch the quick-add shortcut event for overlay toggles
        emitShortcut("shortcut:quick-add-component");
      },
      // keep as canvas-level (not global) so it respects modal/command palette state
    });

    // Add Last Component: Alt+A - only when canvas is focused
    // Note: This intentionally registers a context-sensitive shortcut. The action will no-op if canvas is not focused.
    this.register({
      key: "a",
      modifiers: ["alt"],
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
            emitShortcut("canvas:add-last-component", { componentType: null });
            return;
          }
          emitShortcut("canvas:add-last-component", { componentType: last });
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
      action: withCanvasFocus(() => {
        emitShortcut("shortcut:add-comment");
      }),
    });

    this.register({
      key: "n",
      modifiers: ["alt"],
      description: "Add note",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-note");
      },
    });

    this.register({
      key: "l",
      modifiers: ["shift"],
      description: "Add label",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-label");
      },
    });

    this.register({
      key: "a",
      modifiers: ["shift"],
      description: "Add arrow",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-arrow");
      },
    });

    this.register({
      key: "h",
      modifiers: ["shift"],
      description: "Add highlight",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:add-highlight");
      },
    });

    // Component shortcuts
    this.registerPlatformShortcut({
      key: "d",
      modifiers: ["ctrl"],
      description: "Duplicate selected",
      category: "components",
      action: () => {
        emitShortcut("shortcut:duplicate");
      },
    });

    this.registerPlatformShortcut({
      key: "g",
      modifiers: ["ctrl"],
      description: "Group selected",
      category: "components",
      action: () => {
        emitShortcut("shortcut:group");
      },
    });

    this.registerPlatformShortcut({
      key: "g",
      modifiers: ["ctrl", "shift"],
      description: "Ungroup selected",
      category: "components",
      action: () => {
        emitShortcut("shortcut:ungroup");
      },
    });

    // Locking shortcuts
    this.registerPlatformShortcut({
      key: "l",
      modifiers: ["ctrl", "alt"],
      description: "Lock selected components",
      category: "components",
      action: () => {
        emitShortcut("shortcut:lock-components");
      },
    });

    this.registerPlatformShortcut({
      key: "l",
      modifiers: ["ctrl", "alt", "shift"],
      description: "Unlock selected components",
      category: "components",
      action: () => {
        emitShortcut("shortcut:unlock-components");
      },
    });

    // Alignment shortcuts
    this.register({
      key: "ArrowLeft",
      modifiers: ["ctrl", "shift"],
      description: "Align selected components to the left",
      category: "components",
      action: () => {
        emitShortcut("shortcut:align-left");
      },
    });

    this.register({
      key: "ArrowRight",
      modifiers: ["ctrl", "shift"],
      description: "Align selected components to the right",
      category: "components",
      action: () => {
        emitShortcut("shortcut:align-right");
      },
    });

    this.register({
      key: "ArrowUp",
      modifiers: ["ctrl", "shift"],
      description: "Align selected components to the top",
      category: "components",
      action: () => {
        emitShortcut("shortcut:align-top");
      },
    });

    this.register({
      key: "ArrowDown",
      modifiers: ["ctrl", "shift"],
      description: "Align selected components to the bottom",
      category: "components",
      action: () => {
        emitShortcut("shortcut:align-bottom");
      },
    });

    // Zoom to selection
    this.registerPlatformShortcut({
      key: "2",
      modifiers: ["ctrl"],
      description: "Zoom to fit selected components",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:zoom-to-selection");
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
                    emitShortcut("canvas:add-component", {
                      componentType: favType,
                    });
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
        emitShortcut("shortcut:toggle-patterns-panel");
      },
    });

    // Navigation shortcuts
    this.register({
      key: "f",
      modifiers: ["ctrl"],
      description: "Find/Search",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:search");
      },
    });

    this.register({
      key: "g",
      modifiers: ["ctrl"],
      description: "Find next result",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:search-next");
      },
    });

    this.register({
      key: "g",
      modifiers: ["ctrl", "shift"],
      description: "Find previous result",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:search-prev");
      },
    });

    // Frame shortcuts
    this.register({
      key: "f",
      modifiers: ["ctrl", "shift"],
      description: "Create frame from selection",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:create-frame");
      },
    });

    // AI shortcuts
    this.register({
      key: "i",
      modifiers: ["ctrl", "shift"],
      description: "Toggle AI assistant",
      category: "tools",
      action: () => {
        emitShortcut("shortcut:toggle-ai-assistant");
      },
    });

    this.register({
      key: "t",
      modifiers: ["ctrl", "shift"],
      description: "Text to diagram",
      category: "tools",
      action: () => {
        emitShortcut("shortcut:text-to-diagram");
      },
    });

    // Presentation shortcuts
    this.register({
      key: "p",
      modifiers: ["ctrl", "shift"],
      description: "Presentation mode",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:presentation-mode");
      },
    });

    // Template shortcuts
    this.register({
      key: "l",
      modifiers: ["ctrl", "shift"],
      description: "Open template library",
      category: "tools",
      action: () => {
        emitShortcut("shortcut:template-library");
      },
    });

    this.register({
      key: "1",
      modifiers: ["ctrl"],
      description: "Switch to Canvas view",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:view-canvas");
      },
    });

    this.registerPlatformShortcut({
      key: "3",
      modifiers: ["ctrl"],
      description: "Switch to Component palette",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:view-components");
      },
    });

    this.registerPlatformShortcut({
      key: "4",
      modifiers: ["ctrl"],
      description: "Switch to Project view",
      category: "navigation",
      action: () => {
        emitShortcut("shortcut:view-project");
      },
    });

    // Zoom and pan
    this.registerPlatformShortcut({
      key: "Equal",
      modifiers: ["ctrl"],
      description: "Zoom in",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:zoom-in");
      },
    });

    this.registerPlatformShortcut({
      key: "Minus",
      modifiers: ["ctrl"],
      description: "Zoom out",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:zoom-out");
      },
    });

    this.registerPlatformShortcut({
      key: "0",
      modifiers: ["ctrl"],
      description: "Reset zoom",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:zoom-reset");
      },
    });

    // System shortcuts
    this.register({
      key: "?",
      modifiers: ["shift"],
      description: "Show shortcuts help",
      category: "system",
      scope: "input-safe",
      action: () => {
        emitShortcut("shortcut:show-help");
      },
    });

    this.register({
      key: "F11",
      description: "Toggle fullscreen",
      category: "system",
      scope: "global",
      action: () => {
        emitShortcut("shortcut:toggle-fullscreen");
      },
    });

    // Arrow key navigation
    this.register({
      key: "ArrowUp",
      description: "Move up",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:move-up");
      },
    });

    this.register({
      key: "ArrowDown",
      description: "Move down",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:move-down");
      },
    });

    this.register({
      key: "ArrowLeft",
      description: "Move left",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:move-left");
      },
    });

    this.register({
      key: "ArrowRight",
      description: "Move right",
      category: "canvas",
      action: () => {
        emitShortcut("shortcut:move-right");
      },
    });

    // Tool selection shortcuts
    this.register({
      key: "v",
      description: "Select tool",
      category: "tools",
      action: withCanvasFocus((event) => {
        event?.preventDefault?.();
        exitToSelectMode();
        emitShortcut("shortcut:tool-select");
      }),
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

        emitShortcut("shortcut:tool-pan");
      },
    });

    this.register({
      key: "z",
      description: "Zoom tool",
      category: "tools",
      action: withCanvasFocus(() => {
        emitShortcut("shortcut:tool-zoom");
      }),
    });

    this.register({
      key: "a",
      description: "Annotate tool",
      category: "tools",
      action: withCanvasFocus((event) => {
        event?.preventDefault?.();
        enterAnnotationMode();
        emitShortcut("shortcut:tool-annotate");
      }),
    });

    // Drawing shortcuts
    this.register({
      key: "d",
      description: "Enter drawing mode",
      category: "drawing",
      preventDefault: false,
      action: withCanvasFocus((event) => {
        event?.preventDefault?.();
        enterDrawMode();
      }),
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

    this.registerPlatformShortcut({
      key: "d",
      modifiers: ["ctrl", "shift"],
      description: "Clear all drawings",
      category: "drawing",
      action: () => {
        if (!isCanvasFocused()) return;
        confirmAndClearDrawings();
      },
    });

    // Escape to exit drawing mode
    // Context menu shortcuts
    this.register({
      key: "F2",
      description: "Edit properties",
      category: "components",
      action: () => {
        emitShortcut("shortcut:edit-properties");
      },
    });

    // Note: Duplicate shortcut removed - already defined above as "Duplicate selected"

    this.registerPlatformShortcut({
      key: "c",
      modifiers: ["ctrl"],
      description: "Copy",
      category: "components",
      action: () => {
        emitShortcut("shortcut:copy");
      },
    });

    this.registerPlatformShortcut({
      key: "v",
      modifiers: ["ctrl"],
      description: "Paste",
      category: "components",
      action: () => {
        emitShortcut("shortcut:paste");
      },
    });

    this.registerPlatformShortcut({
      key: "]",
      modifiers: ["ctrl", "shift"],
      description: "Bring to front",
      category: "components",
      action: () => {
        emitShortcut("shortcut:bring-to-front");
      },
    });

    this.registerPlatformShortcut({
      key: "[",
      modifiers: ["ctrl", "shift"],
      description: "Send to back",
      category: "components",
      action: () => {
        emitShortcut("shortcut:send-to-back");
      },
    });

    this.register({
      key: "F10",
      modifiers: ["shift"],
      description: "Show context menu",
      category: "general",
      action: () => {
        emitShortcut("shortcut:show-context-menu");
      },
    });
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.detachEventListeners();
    this.teardownCrossTabChannel();
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
