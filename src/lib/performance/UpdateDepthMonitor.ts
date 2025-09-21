// Enhanced monitoring utility for detecting maximum update depth issues
// Provides runtime detection, prevention, and recovery for setState-in-render cycles
// RELEVANT FILES: InfiniteLoopDetector.ts, RenderGuard.ts, RenderLoopDiagnostics.ts

import { RenderLoopDiagnostics } from '../debug/RenderLoopDiagnostics';

interface UpdateDepthEntry {
  componentName: string;
  updateCount: number;
  lastUpdate: number;
  stackTrace?: string;
  propsHash?: string;
}

interface UpdateDepthConfig {
  maxUpdatesPerComponent: number;
  maxUpdatesPerSecond: number;
  timeWindowMs: number;
  enableStackTraces: boolean;
  enableAutoRecovery: boolean;
}

class UpdateDepthMonitor {
  private static instance: UpdateDepthMonitor | null = null;
  private updateCounts = new Map<string, UpdateDepthEntry>();
  private config: UpdateDepthConfig = {
    maxUpdatesPerComponent: 25,
    maxUpdatesPerSecond: 60,
    timeWindowMs: 1000,
    enableStackTraces: true,
    enableAutoRecovery: true,
  };

  private emergencyMode = false;
  private emergencyStartTime = 0;
  private totalUpdatesInWindow = 0;
  private windowStartTime = Date.now();

  static getInstance(): UpdateDepthMonitor {
    if (!UpdateDepthMonitor.instance) {
      UpdateDepthMonitor.instance = new UpdateDepthMonitor();
    }
    return UpdateDepthMonitor.instance;
  }

  configure(config: Partial<UpdateDepthConfig>) {
    this.config = { ...this.config, ...config };
  }

  recordUpdate(componentName: string, propsHash?: string): boolean {
    const now = Date.now();
    this.cleanupOldEntries(now);
    this.updateGlobalWindow(now);

    const key = `${componentName}${propsHash ? `:${propsHash}` : ''}`;
    const existing = this.updateCounts.get(key);

    if (existing) {
      existing.updateCount++;
      existing.lastUpdate = now;
      if (this.config.enableStackTraces && existing.updateCount > this.config.maxUpdatesPerComponent * 0.5) {
        existing.stackTrace = this.captureStackTrace();
      }
    } else {
      this.updateCounts.set(key, {
        componentName,
        updateCount: 1,
        lastUpdate: now,
        propsHash,
        stackTrace: this.config.enableStackTraces ? this.captureStackTrace() : undefined,
      });
    }

    return this.checkThresholds(key, now);
  }

  private cleanupOldEntries(now: number) {
    const cutoff = now - this.config.timeWindowMs;
    for (const [key, entry] of this.updateCounts) {
      if (entry.lastUpdate < cutoff) {
        this.updateCounts.delete(key);
      }
    }
  }

  private updateGlobalWindow(now: number) {
    if (now - this.windowStartTime > this.config.timeWindowMs) {
      this.totalUpdatesInWindow = 0;
      this.windowStartTime = now;
    }
    this.totalUpdatesInWindow++;
  }

  private checkThresholds(key: string, now: number): boolean {
    const entry = this.updateCounts.get(key);
    if (!entry) return true;

    const componentThresholdExceeded = entry.updateCount > this.config.maxUpdatesPerComponent;
    const globalThresholdExceeded = this.totalUpdatesInWindow > this.config.maxUpdatesPerSecond;

    if (componentThresholdExceeded || globalThresholdExceeded) {
      this.handleThresholdExceeded(entry, componentThresholdExceeded, globalThresholdExceeded, now);
      return false;
    }

    if (entry.updateCount > this.config.maxUpdatesPerComponent * 0.6) {
      this.recordWarning(entry);
    }

    return true;
  }

  private handleThresholdExceeded(
    entry: UpdateDepthEntry,
    componentExceeded: boolean,
    globalExceeded: boolean,
    now: number
  ) {
    const diagnostics = RenderLoopDiagnostics.getInstance();

    if (componentExceeded) {
      diagnostics.recordStabilityWarning(
        entry.componentName,
        `Update depth exceeded: ${entry.updateCount} updates in ${this.config.timeWindowMs}ms`
      );
    }

    if (globalExceeded) {
      diagnostics.recordStabilityWarning(
        'UpdateDepthMonitor',
        `Global update rate exceeded: ${this.totalUpdatesInWindow} updates/sec`
      );
    }

    console.error('React update depth threshold exceeded', {
      component: entry.componentName,
      updateCount: entry.updateCount,
      timeWindow: this.config.timeWindowMs,
      stackTrace: entry.stackTrace,
      propsHash: entry.propsHash,
      componentThreshold: componentExceeded,
      globalThreshold: globalExceeded,
    });

    if (this.config.enableAutoRecovery && !this.emergencyMode) {
      this.activateEmergencyMode(now);
    }
  }

  private recordWarning(entry: UpdateDepthEntry) {
    RenderLoopDiagnostics.getInstance().recordStabilityWarning(
      entry.componentName,
      `Approaching update limit: ${entry.updateCount}/${this.config.maxUpdatesPerComponent}`
    );
  }

  private activateEmergencyMode(now: number) {
    this.emergencyMode = true;
    this.emergencyStartTime = now;

    console.warn('UpdateDepthMonitor: Activated emergency mode - throttling updates');
    RenderLoopDiagnostics.getInstance().recordStabilityWarning(
      'UpdateDepthMonitor',
      'Emergency mode activated to prevent infinite loops'
    );

    setTimeout(() => {
      this.deactivateEmergencyMode();
    }, 5000);
  }

  private deactivateEmergencyMode() {
    this.emergencyMode = false;
    this.emergencyStartTime = 0;
    this.updateCounts.clear();
    this.totalUpdatesInWindow = 0;
    this.windowStartTime = Date.now();

    console.info('UpdateDepthMonitor: Emergency mode deactivated');
    RenderLoopDiagnostics.getInstance().recordStabilityWarning(
      'UpdateDepthMonitor',
      'Emergency mode deactivated - normal operation resumed'
    );
  }

  private captureStackTrace(): string {
    const stack = new Error().stack;
    return stack?.split('\n').slice(2, 8).join('\n') || 'Stack trace unavailable';
  }

  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  getComponentStats(componentName: string): UpdateDepthEntry[] {
    return Array.from(this.updateCounts.entries())
      .filter(([key, entry]) => entry.componentName === componentName)
      .map(([, entry]) => entry);
  }

  getAllStats(): Map<string, UpdateDepthEntry> {
    return new Map(this.updateCounts);
  }

  reset() {
    this.updateCounts.clear();
    this.totalUpdatesInWindow = 0;
    this.windowStartTime = Date.now();
    this.emergencyMode = false;
    this.emergencyStartTime = 0;
  }
}

export { UpdateDepthMonitor, type UpdateDepthConfig, type UpdateDepthEntry };