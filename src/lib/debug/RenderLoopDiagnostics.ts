interface DiagnosticEvent {
  type: string;
  timestamp: number;
  payload: unknown;
}

const MAX_EVENTS = 200;

export class RenderLoopDiagnostics {
  private static instance: RenderLoopDiagnostics;

  static getInstance(): RenderLoopDiagnostics {
    if (!RenderLoopDiagnostics.instance) {
      RenderLoopDiagnostics.instance = new RenderLoopDiagnostics();
    }
    return RenderLoopDiagnostics.instance;
  }

  private events: DiagnosticEvent[] = [];

  reset(): void {
    this.events = [];
  }

  getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }

  recordOscillation(componentName: string, payload: unknown) {
    this.record('oscillation', { componentName, ...payload });
  }

  recordCircuitBreaker(componentName: string, payload: unknown) {
    this.record('circuit-breaker', { componentName, ...payload });
  }

  recordSyntheticError(componentName: string, error: Error) {
    this.record('synthetic-error', { componentName, message: error.message, stack: error.stack });
  }

  recordDesignFlush(payload: unknown) {
    this.record('design-flush', payload);
  }

  recordStabilityWarning(componentName: string, report: unknown) {
    this.record('stability-warning', { componentName, report });
  }

  recordMemorySpike(componentName: string, payload: unknown) {
    this.record('memory-spike', { componentName, ...payload });
  }

  recordResume(componentName: string) {
    this.record('manual-resume', { componentName });
  }

  recordRecoveryStrategy(componentName: string, payload: unknown) {
    this.record('recovery-strategy', { componentName, ...payload });
  }

  recordAutoSaveSuppressed(payload: unknown) {
    this.record('autosave-suppressed', payload);
  }

  recordPersistenceFailure(payload: unknown) {
    this.record('persistence-failure', payload);
  }

  recordInitialSync(payload: unknown) {
    this.record('initial-sync', payload);
  }

  recordBoundaryCapture(componentName: string, payload: unknown) {
    this.record('boundary-capture', { componentName, ...payload });
  }

  recordRecoveryAttempt(componentName: string, payload: unknown) {
    this.record('recovery-attempt', { componentName, ...payload });
  }

  recordRecoveryFailure(componentName: string, payload: unknown) {
    this.record('recovery-failure', { componentName, ...payload });
  }

  recordCanvasLayerCorrelation(components: string[], payload: unknown) {
    this.record('canvas-layer-correlation', { components, ...payload });
  }

  recordCanvasLayerInteraction(fromLayer: string, toLayer: string, payload: unknown) {
    this.record('canvas-layer-interaction', { fromLayer, toLayer, ...payload });
  }

  recordRenderSnapshotAnalysis(componentName: string, payload: unknown) {
    this.record('render-snapshot-analysis', { componentName, ...payload });
  }

  exportDiagnosticData() {
    const data = {
      timestamp: Date.now(),
      events: this.getEvents(),
      summary: this.generateSummary(),
    };
    return JSON.stringify(data, null, 2);
  }

  generateSummary() {
    const eventsByType = new Map<string, number>();
    const componentsByEvent = new Map<string, Set<string>>();

    this.events.forEach(event => {
      eventsByType.set(event.type, (eventsByType.get(event.type) || 0) + 1);

      const payload = event.payload as any;
      if (payload?.componentName) {
        if (!componentsByEvent.has(event.type)) {
          componentsByEvent.set(event.type, new Set());
        }
        componentsByEvent.get(event.type)!.add(payload.componentName);
      }
    });

    return {
      totalEvents: this.events.length,
      eventsByType: Object.fromEntries(eventsByType),
      componentsByEvent: Object.fromEntries(
        Array.from(componentsByEvent.entries()).map(([type, components]) => [
          type,
          Array.from(components)
        ])
      ),
      timeRange: this.events.length > 0 ? {
        start: this.events[0].timestamp,
        end: this.events[this.events.length - 1].timestamp,
        duration: this.events[this.events.length - 1].timestamp - this.events[0].timestamp,
      } : null,
    };
  }

  private record(type: string, payload: unknown) {
    if (import.meta.env.PROD) {
      return;
    }

    this.events.push({ type, timestamp: Date.now(), payload });
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }

    // Only log critical events in development to reduce console noise
    if (import.meta.env.DEV && ['circuit-breaker', 'synthetic-error'].includes(type)) {
      // eslint-disable-next-line no-console
      console.debug(`[RenderDiagnostics:${type}]`, payload);
    }
  }
}
