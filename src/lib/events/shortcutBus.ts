import { APP_EVENT, type AppEventName, validateAppEvent } from "@/lib/events/appEvents";

type EventHandler = (detail?: unknown) => void;

const KNOWN_TOPICS = new Set<AppEventName>(
  Object.values(APP_EVENT) as AppEventName[],
);

const MAX_DEV_LISTENERS = 25;
const isDev = process.env.NODE_ENV !== "production";

class ShortcutBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on(topic: string, handler: EventHandler): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }

    const handlers = this.listeners.get(topic)!;
    handlers.add(handler);

    if (isDev && handlers.size > MAX_DEV_LISTENERS) {
      console.warn(
        `[shortcutBus] Topic "${topic}" has ${handlers.size} listeners; possible leak?`,
      );
    }

    return () => this.off(topic, handler);
  }

  off(topic: string, handler: EventHandler): void {
    const handlers = this.listeners.get(topic);
    if (!handlers) {
      if (isDev) {
        console.warn(
          `[shortcutBus] Attempted to remove listener for missing topic "${topic}"`,
        );
      }
      return;
    }

    handlers.delete(handler);

    if (handlers.size === 0) {
      this.listeners.delete(topic);
    }
  }

  emit(topic: string, detail?: unknown): void {
    const handlers = this.listeners.get(topic);
    if (!handlers) {
      if (isDev) {
        console.warn(
          `[shortcutBus] Emitting "${topic}" without listeners; check registration flow.`,
        );
      }
      return;
    }

    if (isDev && KNOWN_TOPICS.has(topic as AppEventName)) {
      validateAppEvent(topic as AppEventName, detail);
    }

    handlers.forEach((handler) => {
      try {
        handler(detail);
      } catch (error) {
        console.error(`Error in event handler for ${topic}:`, error);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }

  getListenerCount(topic?: string): number {
    if (typeof topic === "string") {
      return this.listeners.get(topic)?.size ?? 0;
    }

    let total = 0;
    this.listeners.forEach((handlers) => {
      total += handlers.size;
    });
    return total;
  }

  listTopics(): string[] {
    return Array.from(this.listeners.keys()).sort();
  }
}

export const shortcutBus = new ShortcutBus();

export type ShortcutBusHandler = EventHandler;
