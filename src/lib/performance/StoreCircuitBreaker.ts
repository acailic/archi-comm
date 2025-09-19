import { InfiniteLoopDetector } from './InfiniteLoopDetector';

export interface StoreCircuitBreakerOptions {
  name: string;
  /** Sliding window in milliseconds used to evaluate update frequency. */
  windowMs?: number;
  /** Number of updates within the window that triggers a warning. */
  warningThreshold?: number;
  /** Number of updates within the window that trips the breaker. */
  errorThreshold?: number;
  /** Cooldown duration (ms) while the breaker remains open. */
  cooldownMs?: number;
  /** Minimum interval (ms) between warning logs. */
  warningIntervalMs?: number;
  /** Optional identifier forwarded to the InfiniteLoopDetector. */
  componentId?: string;
  /** Callback fired whenever the breaker opens. */
  onTrip?: (snapshot: StoreCircuitBreakerSnapshot) => void;
  /** Callback fired whenever the breaker fully resets (closes). */
  onReset?: (snapshot: StoreCircuitBreakerSnapshot) => void;
}

export interface StoreCircuitBreakerRecordMeta {
  action: string;
  changed: boolean;
  timestamp?: number;
  payloadSize?: number;
  payloadHash?: string;
  context?: Record<string, unknown>;
}

export interface StoreCircuitBreakerSnapshot {
  name: string;
  open: boolean;
  openUntil: number | null;
  reason?: string;
  totalUpdates: number;
  updatesInWindow: number;
  windowMs: number;
  lastAction?: string;
  lastActionAt?: number;
  blockedActions: number;
  warningCount: number;
}

const DEFAULT_OPTIONS: Required<
  Pick<
    StoreCircuitBreakerOptions,
    'windowMs' | 'warningThreshold' | 'errorThreshold' | 'cooldownMs' | 'warningIntervalMs'
  >
> = {
  windowMs: 200,
  warningThreshold: 10,
  errorThreshold: 15,
  cooldownMs: 2500,
  warningIntervalMs: 750,
};

const now = () => Date.now();

type NormalizedStoreOptions = StoreCircuitBreakerOptions &
  Required<
    Pick<
      StoreCircuitBreakerOptions,
      'windowMs' | 'warningThreshold' | 'errorThreshold' | 'cooldownMs' | 'warningIntervalMs'
    >
  >;

type SnapshotListener = (snapshot: StoreCircuitBreakerSnapshot) => void;

export class StoreCircuitBreaker {
  private readonly detector = InfiniteLoopDetector.getInstance();
  private readonly options: NormalizedStoreOptions;

  private readonly updates: number[] = [];
  private listeners = new Set<SnapshotListener>();

  private totalUpdates = 0;
  private firstUpdateAt: number | null = null;
  private lastUpdateAt: number | null = null;
  private openUntil = 0;
  private lastReason: string | null = null;
  private lastAction: string | null = null;
  private lastActionAt = 0;
  private warningCount = 0;
  private lastWarningAt = 0;
  private blockedActions = 0;

  constructor(options: StoreCircuitBreakerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get name(): string {
    return this.options.name;
  }

  isOpen(): boolean {
    return this.openUntil > now();
  }

  getSnapshot(): StoreCircuitBreakerSnapshot {
    const open = this.isOpen();
    return {
      name: this.options.name,
      open,
      openUntil: open ? this.openUntil : null,
      reason: open ? this.lastReason ?? undefined : undefined,
      totalUpdates: this.totalUpdates,
      updatesInWindow: this.updates.length,
      windowMs: this.options.windowMs,
      lastAction: this.lastAction ?? undefined,
      lastActionAt: this.lastActionAt || undefined,
      blockedActions: this.blockedActions,
      warningCount: this.warningCount,
    };
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  shouldAllow(action: string): boolean {
    const timestamp = now();

    if (this.openUntil > 0 && this.openUntil <= timestamp) {
      this.closeCircuitBreaker('cooldown-expired');
    }

    if (this.openUntil > timestamp) {
      this.blockedActions += 1;
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[StoreCircuitBreaker:${this.options.name}] Blocking action`, {
          action,
          openUntil: this.openUntil,
          remainingMs: this.openUntil - timestamp,
          reason: this.lastReason,
        });
      }
      this.emit();
      return false;
    }

    return true;
  }

  record(meta: StoreCircuitBreakerRecordMeta): void {
    const timestamp = meta.timestamp ?? now();
    this.lastAction = meta.action;
    this.lastActionAt = timestamp;

    if (!meta.changed) {
      this.emit();
      return;
    }

    this.totalUpdates += 1;
    if (this.firstUpdateAt == null) {
      this.firstUpdateAt = timestamp;
    }

    this.pruneOld(timestamp);
    this.updates.push(timestamp);

    const updatesInWindow = this.updates.length;

    const context: Record<string, unknown> | undefined = meta.context
      ? { ...meta.context, action: meta.action, payloadSize: meta.payloadSize }
      : { action: meta.action, payloadSize: meta.payloadSize };

    this.detector.recordRender({
      componentName: `Store:${this.options.name}`,
      componentId: this.options.componentId,
      timestamp,
      renderCount: updatesInWindow,
      sinceFirstRenderMs: this.firstUpdateAt ? timestamp - this.firstUpdateAt : 0,
      sincePreviousRenderMs: this.lastUpdateAt ? timestamp - this.lastUpdateAt : 0,
      context,
      snapshotHash: meta.payloadHash,
    });

    this.lastUpdateAt = timestamp;

    const shouldWarn =
      updatesInWindow >= this.options.warningThreshold &&
      timestamp - this.lastWarningAt >= this.options.warningIntervalMs;

    if (shouldWarn) {
      this.warningCount += 1;
      this.lastWarningAt = timestamp;
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[StoreCircuitBreaker:${this.options.name}] Elevated update rate`, {
          updatesInWindow,
          windowMs: this.options.windowMs,
          action: meta.action,
          payloadSize: meta.payloadSize,
          context: meta.context,
        });
      }
    }

    if (updatesInWindow >= this.options.errorThreshold) {
      this.trip('update-threshold', meta, updatesInWindow);
    } else {
      this.emit();
    }
  }

  forceTrip(reason: string, meta: Partial<StoreCircuitBreakerRecordMeta> = {}): void {
    this.trip(reason, { action: meta.action ?? 'forceTrip', changed: true, ...meta }, this.updates.length);
  }

  reset(reason?: string): void {
    this.updates.length = 0;
    this.totalUpdates = 0;
    this.firstUpdateAt = null;
    this.lastUpdateAt = null;
    this.lastAction = null;
    this.lastActionAt = 0;
    this.warningCount = 0;
    this.lastWarningAt = 0;
    this.blockedActions = 0;
    this.closeCircuitBreaker(reason ?? 'manual-reset');
  }

  private trip(reason: string, meta: StoreCircuitBreakerRecordMeta, updatesInWindow: number): void {
    const timestamp = meta.timestamp ?? now();
    this.openUntil = timestamp + this.options.cooldownMs;
    this.lastReason = reason;

    if (process.env.NODE_ENV === 'development') {
      console.error(`[StoreCircuitBreaker:${this.options.name}] Circuit breaker tripped`, {
        reason,
        action: meta.action,
        updatesInWindow,
        windowMs: this.options.windowMs,
        cooldownMs: this.options.cooldownMs,
        context: meta.context,
      });
    }

    this.detector.markCircuitBreakerOpen(`Store:${this.options.name}`, this.openUntil, reason);
    this.emit();
    this.options.onTrip?.(this.getSnapshot());
  }

  private closeCircuitBreaker(reason: string): void {
    const wasOpen = this.isOpen();
    this.openUntil = 0;
    this.lastReason = null;
    this.detector.markCircuitBreakerClosed(`Store:${this.options.name}`);

    if (wasOpen && process.env.NODE_ENV === 'development') {
      console.info(`[StoreCircuitBreaker:${this.options.name}] Circuit breaker closed`, { reason });
    }

    this.emit();
    this.options.onReset?.(this.getSnapshot());
  }

  private pruneOld(timestamp: number) {
    const windowStart = timestamp - this.options.windowMs;
    while (this.updates.length > 0 && this.updates[0] < windowStart) {
      this.updates.shift();
    }
  }

  private emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[StoreCircuitBreaker] Listener threw', error);
      }
    }
  }
}
