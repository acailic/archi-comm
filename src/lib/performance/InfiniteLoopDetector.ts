import { RenderLoopDetectedError } from '@/lib/performance/RenderGuard';

export interface RenderLoopEvent {
  componentName: string;
  componentId?: string;
  timestamp: number;
  renderCount: number;
  sinceFirstRenderMs: number;
  sincePreviousRenderMs: number;
  context?: Record<string, unknown> | undefined;
  snapshotHash?: string;
  stackSnippet?: string;
  memorySample?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
    deltaSinceBaseline?: number;
  } | null;
}

export interface DetectorReport {
  id: string;
  componentName: string;
  timestamp: number;
  severity: 'normal' | 'warning' | 'critical';
  reason?: string;
  metrics: {
    renderCount: number;
    sinceFirstRenderMs: number;
    sincePreviousRenderMs: number;
    circuitBreaker: boolean;
  };
  context?: Record<string, unknown>;
  snapshotHash?: string;
}

export interface DetectorResult {
  shouldOpenCircuitBreaker: boolean;
  shouldThrowSyntheticError: boolean;
  reason?: string;
  isOscillating: boolean;
}

interface ComponentState {
  flagged: boolean;
  circuitBreakerOpenUntil: number | null;
  lastReport: DetectorReport | null;
  suppressedPersistReasons: string[];
}

interface InitialSyncState {
  attempts: number;
  status: 'idle' | 'started' | 'success' | 'failed' | 'timeout';
  lastError?: string;
}

interface RecoveryLogEntry {
  stage: string;
  timestamp: number;
}

interface PersistenceEvent {
  channel: string;
  forced: boolean;
  reason: string;
  timestamp: number;
}

const MAX_HISTORY = 60;
const MAX_RECOVERY_LOG = 25;
const MAX_PERSISTENCE_LOG = 50;

export class InfiniteLoopDetector {
  private static instance: InfiniteLoopDetector;

  private history = new Map<string, RenderLoopEvent[]>();
  private componentState = new Map<string, ComponentState>();
  private recoveryLog: RecoveryLogEntry[] = [];
  private persistenceLog: PersistenceEvent[] = [];
  private initialSyncState = new Map<string, InitialSyncState>();

  static getInstance(): InfiniteLoopDetector {
    if (!InfiniteLoopDetector.instance) {
      InfiniteLoopDetector.instance = new InfiniteLoopDetector();
    }
    return InfiniteLoopDetector.instance;
  }

  /**
   * Backwards-compatible static helper used throughout the codebase before the
   * detector was converted to an instance API. Normalizes the legacy payload
   * shape (which often included prop hashes and partial metrics) into a full
   * RenderLoopEvent before delegating to the singleton instance.
   */
  static recordRender(
    componentKey: string,
    payload: {
      componentName?: string;
      componentId?: string;
      renderCount?: number;
      sinceFirstRenderMs?: number;
      sincePreviousRenderMs?: number;
      timestamp?: number;
      propsHash?: string;
      snapshotHash?: string;
      context?: Record<string, unknown>;
      stackSnippet?: string;
      memorySample?: RenderLoopEvent['memorySample'];
    } & Record<string, unknown>
  ): DetectorResult {
    const detector = InfiniteLoopDetector.getInstance();

    const timestamp = payload.timestamp ?? Date.now();
    const renderCount = payload.renderCount ?? 0;
    const sinceFirstRenderMs = payload.sinceFirstRenderMs ?? 0;
    const sincePreviousRenderMs = payload.sincePreviousRenderMs ?? 0;

    const context: Record<string, unknown> | undefined = (() => {
      const combined: Record<string, unknown> = { ...payload.context };
      if (payload.propsHash) {
        combined.propsHash = payload.propsHash;
      }
      return Object.keys(combined).length > 0 ? combined : undefined;
    })();

    return detector.recordRender({
      componentName: componentKey ?? payload.componentName ?? 'unknown-component',
      componentId: payload.componentId,
      timestamp,
      renderCount,
      sinceFirstRenderMs,
      sincePreviousRenderMs,
      context,
      snapshotHash: payload.snapshotHash ?? payload.propsHash,
      stackSnippet: payload.stackSnippet,
      memorySample: payload.memorySample ?? null,
    });
  }

  reset(): void {
    this.history.clear();
    this.componentState.clear();
    this.recoveryLog = [];
    this.persistenceLog = [];
    this.initialSyncState.clear();
  }

  recordRender(event: RenderLoopEvent): DetectorResult {
    const events = this.history.get(event.componentName) ?? [];
    events.push(event);
    if (events.length > MAX_HISTORY) {
      events.shift();
    }
    this.history.set(event.componentName, events);

    const recent = events.slice(-6);
    const rapidCount = recent.filter(item => item.sincePreviousRenderMs > 0 && item.sincePreviousRenderMs < 8).length;
    const oscillationCount = event.snapshotHash
      ? recent.filter(item => item.snapshotHash === event.snapshotHash).length
      : 0;

    let severity: DetectorReport['severity'] = 'normal';
    let reason: string | undefined;

    if (event.renderCount > 70 || (rapidCount >= 4 && oscillationCount >= 3)) {
      severity = 'critical';
      reason = oscillationCount >= 3 ? 'prop-oscillation' : 'rapid-renders';
    } else if (event.renderCount > 50 || rapidCount >= 3) {
      severity = 'warning';
      reason = rapidCount >= 3 ? 'rapid-renders' : 'high-render-count';
    }

    const state = this.ensureState(event.componentName);
    const now = event.timestamp;
    const circuitBreakerActive = (state.circuitBreakerOpenUntil ?? 0) > now;

    const shouldOpenCircuitBreaker =
      severity === 'critical' ||
      (severity === 'warning' && (rapidCount >= 3 || event.renderCount > 60));

    const shouldThrowSyntheticError = severity === 'critical' && (event.renderCount > 85 || rapidCount >= 5);

    if (severity === 'critical' || shouldOpenCircuitBreaker) {
      state.flagged = true;
    } else if (!circuitBreakerActive) {
      state.flagged = false;
    }

    const report: DetectorReport = {
      id: `${event.componentName}:${now}:${event.renderCount}`,
      componentName: event.componentName,
      timestamp: now,
      severity,
      reason,
      metrics: {
        renderCount: event.renderCount,
        sinceFirstRenderMs: event.sinceFirstRenderMs,
        sincePreviousRenderMs: event.sincePreviousRenderMs,
        circuitBreaker: circuitBreakerActive || shouldOpenCircuitBreaker,
      },
      context: event.context,
      snapshotHash: event.snapshotHash,
    };

    state.lastReport = report;

    return {
      shouldOpenCircuitBreaker,
      shouldThrowSyntheticError,
      reason,
      isOscillating: oscillationCount >= 3,
    };
  }

  markCircuitBreakerOpen(componentName: string, until: number, reason?: string) {
    const state = this.ensureState(componentName);
    state.circuitBreakerOpenUntil = until;
    state.flagged = true;
    const timestamp = Date.now();
    state.lastReport = {
      id: `${componentName}:${timestamp}:${state.lastReport?.metrics.renderCount ?? 0}`,
      componentName,
      timestamp,
      severity: 'critical',
      reason: reason ?? 'circuit-breaker-open',
      metrics: {
        renderCount: state.lastReport?.metrics.renderCount ?? 0,
        sinceFirstRenderMs: state.lastReport?.metrics.sinceFirstRenderMs ?? 0,
        sincePreviousRenderMs: state.lastReport?.metrics.sincePreviousRenderMs ?? 0,
        circuitBreaker: true,
      },
      context: state.lastReport?.context,
      snapshotHash: state.lastReport?.snapshotHash,
    };
  }

  markCircuitBreakerClosed(componentName: string) {
    const state = this.ensureState(componentName);
    state.circuitBreakerOpenUntil = null;
    state.flagged = false;
  }

  noteSyntheticError(componentName: string, error: RenderLoopDetectedError) {
    const state = this.ensureState(componentName);
    state.flagged = true;
    const timestamp = Date.now();
    state.lastReport = {
      id: `${componentName}:${timestamp}:${error.meta.renderCount}`,
      componentName,
      timestamp,
      severity: 'critical',
      reason: 'synthetic-error',
      metrics: {
        renderCount: error.meta.renderCount,
        sinceFirstRenderMs: error.meta.sinceFirstRenderMs,
        sincePreviousRenderMs: error.meta.sincePreviousRenderMs,
        circuitBreaker: true,
      },
      context: error.meta.context,
      snapshotHash: error.meta.propsSnapshot ? JSON.stringify(error.meta.propsSnapshot) : undefined,
    };
  }

  markComponentReset(componentName: string) {
    this.history.delete(componentName);
    const state = this.ensureState(componentName);
    state.flagged = false;
    state.circuitBreakerOpenUntil = null;
  }

  getLatestReport(componentName: string): DetectorReport | null {
    return this.componentState.get(componentName)?.lastReport ?? null;
  }

  isComponentFlagged(componentName: string): boolean {
    const state = this.ensureState(componentName);
    const now = Date.now();
    if ((state.circuitBreakerOpenUntil ?? 0) > now) {
      return true;
    }
    return state.flagged;
  }

  acknowledgeRecovery(componentName: string) {
    const state = this.ensureState(componentName);
    state.flagged = false;
    state.circuitBreakerOpenUntil = null;
  }

  recordRecovery(stage: string) {
    this.recoveryLog.push({ stage, timestamp: Date.now() });
    if (this.recoveryLog.length > MAX_RECOVERY_LOG) {
      this.recoveryLog.shift();
    }
  }

  notePersistence(channel: string, meta: { reason: string; forced: boolean }) {
    this.persistenceLog.push({ channel, forced: meta.forced, reason: meta.reason, timestamp: Date.now() });
    if (this.persistenceLog.length > MAX_PERSISTENCE_LOG) {
      this.persistenceLog.shift();
    }
  }

  markPersistenceSuppressed(channel: string, reason: string) {
    this.persistenceLog.push({ channel, forced: false, reason: `suppressed:${reason}`, timestamp: Date.now() });
    if (this.persistenceLog.length > MAX_PERSISTENCE_LOG) {
      this.persistenceLog.shift();
    }
  }

  noteInitialSyncStart(challengeId: string, attempt: number) {
    this.initialSyncState.set(challengeId, { attempts: attempt, status: 'started' });
  }

  noteInitialSyncSuccess(challengeId: string) {
    const state = this.initialSyncState.get(challengeId) ?? { attempts: 0, status: 'idle' };
    state.status = 'success';
    this.initialSyncState.set(challengeId, state);
  }

  noteInitialSyncFailure(challengeId: string, error: Error) {
    const state = this.initialSyncState.get(challengeId) ?? { attempts: 0, status: 'idle' };
    state.status = 'failed';
    state.lastError = error.message;
    this.initialSyncState.set(challengeId, state);
  }

  noteInitialSyncTimeout(challengeId: string) {
    const state = this.initialSyncState.get(challengeId) ?? { attempts: 0, status: 'idle' };
    state.status = 'timeout';
    this.initialSyncState.set(challengeId, state);
  }

  noteInitialSyncFailureSummary() {
    return this.initialSyncState;
  }

  private ensureState(componentName: string): ComponentState {
    const existing = this.componentState.get(componentName);
    if (existing) {
      return existing;
    }
    const fresh: ComponentState = {
      flagged: false,
      circuitBreakerOpenUntil: null,
      lastReport: null,
      suppressedPersistReasons: [],
    };
    this.componentState.set(componentName, fresh);
    return fresh;
  }
}

export type { RenderLoopEvent as InfiniteLoopEventMetadata };
