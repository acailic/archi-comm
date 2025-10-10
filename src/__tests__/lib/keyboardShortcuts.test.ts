import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { KeyboardShortcutManager } from "@/lib/shortcuts/KeyboardShortcuts";

class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();

  private listeners = new Map<string, Set<(event: MessageEvent<unknown>) => void>>();

  constructor(private readonly name: string) {
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: unknown): void {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    peers.forEach((peer) => {
      if (peer === this) return;
      peer.dispatchMessage(data);
    });
  }

  addEventListener(
    type: string,
    handler: (event: MessageEvent<unknown>) => void,
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(
    type: string,
    handler: (event: MessageEvent<unknown>) => void,
  ): void {
    this.listeners.get(type)?.delete(handler);
  }

  close(): void {
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
    this.listeners.clear();
  }

  private dispatchMessage(data: unknown): void {
    const handlers = this.listeners.get("message");
    if (!handlers) return;
    const event = { data } as MessageEvent<unknown>;
    handlers.forEach((handler) => handler(event));
  }

  static reset(): void {
    this.channels.clear();
  }
}

const originalBroadcastChannel = globalThis.BroadcastChannel;

describe("KeyboardShortcutManager default shortcuts", () => {
  let manager: KeyboardShortcutManager;
  let hiddenDescriptor: PropertyDescriptor | undefined;

  beforeAll(() => {
    (globalThis as any).BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
  });

  beforeEach(() => {
    hiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });

    document.body.innerHTML = `
      <div id="design-canvas" tabIndex="-1"></div>
      <input id="outside" />
      <button id="aux-button"></button>
    `;
    manager = new KeyboardShortcutManager();
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = "";
    MockBroadcastChannel.reset();
    vi.restoreAllMocks();
    if (hiddenDescriptor) {
      Object.defineProperty(document, "hidden", hiddenDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (document as any).hidden;
    }
  });

  afterAll(() => {
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
  });

  it("requires canvas focus for bare-letter shortcuts", () => {
    const handler = vi.fn();
    window.addEventListener("shortcut:tool-select", handler);

    const outside = document.getElementById("outside") as HTMLInputElement;
    outside.focus();

    outside.dispatchEvent(new KeyboardEvent("keydown", { key: "v", bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    const canvas = document.getElementById("design-canvas") as HTMLElement;
    canvas.focus();

    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "v", bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener("shortcut:tool-select", handler);
  });

  it("supports meta variants alongside ctrl combinations", () => {
    const handler = vi.fn();
    window.addEventListener("shortcut:duplicate", handler);

    const canvas = document.getElementById("design-canvas") as HTMLElement;
    canvas.focus();

    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true }),
    );

    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", metaKey: true, bubbles: true }),
    );

    expect(handler).toHaveBeenCalledTimes(2);

    window.removeEventListener("shortcut:duplicate", handler);
  });

  it("warns when registering overlapping modifier combinations", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    manager.setDebugMode(true);

    const noop = vi.fn();

    manager.register({
      key: "c",
      description: "base",
      category: "canvas",
      action: noop,
    });

    manager.register({
      key: "c",
      modifiers: ["ctrl"],
      description: "with modifiers",
      category: "canvas",
      action: noop,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Potential modifier overlap detected"),
    );
  });

  it("respects shortcut scopes for focused elements", () => {
    const canvasSpy = vi.fn();
    const globalSpy = vi.fn();
    const inputSafeSpy = vi.fn();

    manager.register({
      key: "F6",
      description: "canvas scoped",
      category: "general",
      action: canvasSpy,
    });

    manager.register({
      key: "F7",
      description: "global scoped",
      category: "general",
      scope: "global",
      action: globalSpy,
    });

    manager.register({
      key: "F8",
      description: "input safe scoped",
      category: "general",
      scope: "input-safe",
      action: inputSafeSpy,
    });

    const input = document.getElementById("outside") as HTMLInputElement;
    const button = document.getElementById("aux-button") as HTMLButtonElement;
    const canvas = document.getElementById("design-canvas") as HTMLElement;

    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "F7", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "F8", bubbles: true }));

    expect(canvasSpy).not.toHaveBeenCalled();
    expect(globalSpy).toHaveBeenCalledTimes(1);
    expect(inputSafeSpy).not.toHaveBeenCalled();

    button.focus();
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "F8", bubbles: true }));
    expect(inputSafeSpy).toHaveBeenCalledTimes(1);

    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", bubbles: true }));
    expect(canvasSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts from background tabs when coordination is enabled", () => {
    const activeSpy = vi.fn();
    const passiveSpy = vi.fn();

    manager.register({
      key: "F9",
      description: "active-tab shortcut",
      category: "general",
      action: activeSpy,
    });

    // Simulate a background tab by toggling document.hidden during construction
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    const managerB = new KeyboardShortcutManager();
    managerB.register({
      key: "F9",
      description: "background shortcut",
      category: "general",
      action: passiveSpy,
    });

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "F9", bubbles: true }));

    expect(activeSpy).toHaveBeenCalledTimes(1);
    expect(passiveSpy).toHaveBeenCalledTimes(0);

    managerB.destroy();
  });
});
