import { RenderLoopDiagnostics } from './RenderLoopDiagnostics';
import { InfiniteLoopDetector } from '../performance/InfiniteLoopDetector';

export interface RenderLogEntry {
  id: string;
  componentName: string;
  timestamp: number;
  renderCount: number;
  renderDuration?: number;
  triggerReason: string;
  propChanges: PropChange[];
  stateChanges: StateChange[];
  contextChanges: ContextChange[];
  hookDependencyChanges: HookDependencyChange[];
  performanceMetrics: PerformanceMetrics;
  renderPhase: 'mount' | 'update' | 'unmount';
  callbackExecutions: CallbackExecution[];
  renderOptimizations: RenderOptimization[];
}

export interface PropChange {
  propName: string;
  oldValue: any;
  newValue: any;
  changeType: 'primitive' | 'object' | 'array' | 'function';
  isDeepChange: boolean;
  changeSize: number;
}

export interface StateChange {
  stateName: string;
  oldValue: any;
  newValue: any;
  changeSource: string;
  actionType?: string;
}

export interface ContextChange {
  contextName: string;
  oldValue: any;
  newValue: any;
  providerComponent: string;
}

export interface HookDependencyChange {
  hookName: string;
  dependencyIndex: number;
  oldValue: any;
  newValue: any;
  hookType: 'useMemo' | 'useCallback' | 'useEffect' | 'custom';
}

export interface PerformanceMetrics {
  renderDuration: number;
  componentUpdateTime: number;
  diffTime: number;
  reconciliationTime: number;
  memoryUsage?: number;
  memoryDelta?: number;
}

export interface CallbackExecution {
  callbackName: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  lastExecuted: number;
}

export interface RenderOptimization {
  type: 'memo' | 'useMemo' | 'useCallback' | 'shallow-equal' | 'deep-equal';
  status: 'hit' | 'miss' | 'skip';
  reason?: string;
  costSaved?: number;
}

export interface RenderAnalysisReport {
  componentName: string;
  timeRange: { start: number; end: number };
  totalRenders: number;
  averageRenderTime: number;
  slowestRender: RenderLogEntry;
  fastestRender: RenderLogEntry;
  renderFrequency: number;
  commonTriggers: { reason: string; count: number }[];
  performanceIssues: PerformanceIssue[];
  optimizationSuggestions: OptimizationSuggestion[];
  renderPatterns: RenderPattern[];
}

export interface PerformanceIssue {
  type: 'slow-render' | 'frequent-render' | 'memory-leak' | 'prop-drilling' | 'callback-instability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  occurrences: number;
  impact: string;
  firstDetected: number;
  lastDetected: number;
}

export interface OptimizationSuggestion {
  type: 'memoization' | 'callback-stability' | 'prop-optimization' | 'state-structure' | 'component-splitting';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImpact: string;
  implementation: string;
  codeExample?: string;
}

export interface RenderPattern {
  name: string;
  description: string;
  frequency: number;
  examples: RenderLogEntry[];
  isProblematic: boolean;
}

interface ComponentRenderState {
  renderCount: number;
  lastRenderTime: number;
  renderHistory: RenderLogEntry[];
  performanceMetrics: {
    totalRenderTime: number;
    averageRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
  };
  triggerPatterns: Map<string, number>;
  propStability: Map<string, { stable: number; unstable: number }>;
  memoryBaseline?: number;
}

export class RenderDebugLogger {
  private static instance: RenderDebugLogger;
  private componentStates = new Map<string, ComponentRenderState>();
  private globalRenderLog: RenderLogEntry[] = [];
  private isEnabled = import.meta.env.DEV;
  private maxLogEntries = 500;
  private maxComponentHistory = 50;

  static getInstance(): RenderDebugLogger {
    if (!RenderDebugLogger.instance) {
      RenderDebugLogger.instance = new RenderDebugLogger();
    }
    return RenderDebugLogger.instance;
  }

  logRender(entry: Partial<RenderLogEntry> & { componentName: string }): void {
    if (!this.isEnabled) return;

    const completeEntry: RenderLogEntry = {
      id: `${entry.componentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      renderCount: 0,
      triggerReason: 'unknown',
      propChanges: [],
      stateChanges: [],
      contextChanges: [],
      hookDependencyChanges: [],
      performanceMetrics: {
        renderDuration: 0,
        componentUpdateTime: 0,
        diffTime: 0,
        reconciliationTime: 0,
      },
      renderPhase: 'update',
      callbackExecutions: [],
      renderOptimizations: [],
      ...entry,
    };

    // Update component state
    const componentState = this.getOrCreateComponentState(entry.componentName);
    componentState.renderCount += 1;
    componentState.lastRenderTime = completeEntry.timestamp;
    completeEntry.renderCount = componentState.renderCount;

    // Add to component history
    componentState.renderHistory.push(completeEntry);
    if (componentState.renderHistory.length > this.maxComponentHistory) {
      componentState.renderHistory.shift();
    }

    // Update performance metrics
    if (completeEntry.performanceMetrics.renderDuration > 0) {
      componentState.performanceMetrics.totalRenderTime += completeEntry.performanceMetrics.renderDuration;
      componentState.performanceMetrics.averageRenderTime =
        componentState.performanceMetrics.totalRenderTime / componentState.renderCount;
      componentState.performanceMetrics.maxRenderTime = Math.max(
        componentState.performanceMetrics.maxRenderTime,
        completeEntry.performanceMetrics.renderDuration
      );
      componentState.performanceMetrics.minRenderTime = Math.min(
        componentState.performanceMetrics.minRenderTime || Infinity,
        completeEntry.performanceMetrics.renderDuration
      );
    }

    // Track trigger patterns
    componentState.triggerPatterns.set(
      completeEntry.triggerReason,
      (componentState.triggerPatterns.get(completeEntry.triggerReason) || 0) + 1
    );

    // Track prop stability
    completeEntry.propChanges.forEach(propChange => {
      const stability = componentState.propStability.get(propChange.propName) || { stable: 0, unstable: 0 };
      if (propChange.oldValue === propChange.newValue) {
        stability.stable += 1;
      } else {
        stability.unstable += 1;
      }
      componentState.propStability.set(propChange.propName, stability);
    });

    // Add to global log
    this.globalRenderLog.push(completeEntry);
    if (this.globalRenderLog.length > this.maxLogEntries) {
      this.globalRenderLog.shift();
    }

    // Analyze and report issues
    this.analyzeRenderEntry(completeEntry, componentState);

    // Report to diagnostics
    RenderLoopDiagnostics.getInstance().record('render-debug-log', {
      componentName: entry.componentName,
      entry: completeEntry,
      componentMetrics: {
        renderCount: componentState.renderCount,
        averageRenderTime: componentState.performanceMetrics.averageRenderTime,
        triggerPatterns: Object.fromEntries(componentState.triggerPatterns),
      },
    });
  }

  analyzeComponent(componentName: string): RenderAnalysisReport | null {
    const componentState = this.componentStates.get(componentName);
    if (!componentState || componentState.renderHistory.length === 0) {
      return null;
    }

    const history = componentState.renderHistory;
    const timeRange = {
      start: history[0].timestamp,
      end: history[history.length - 1].timestamp,
    };

    const slowestRender = history.reduce((slowest, current) =>
      current.performanceMetrics.renderDuration > slowest.performanceMetrics.renderDuration ? current : slowest
    );

    const fastestRender = history.reduce((fastest, current) =>
      current.performanceMetrics.renderDuration < fastest.performanceMetrics.renderDuration ? current : fastest
    );

    const commonTriggers = Array.from(componentState.triggerPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    const performanceIssues = this.detectPerformanceIssues(componentName, componentState);
    const optimizationSuggestions = this.generateOptimizationSuggestions(componentName, componentState);
    const renderPatterns = this.detectRenderPatterns(componentName, componentState);

    return {
      componentName,
      timeRange,
      totalRenders: componentState.renderCount,
      averageRenderTime: componentState.performanceMetrics.averageRenderTime,
      slowestRender,
      fastestRender,
      renderFrequency: componentState.renderCount / ((timeRange.end - timeRange.start) / 1000),
      commonTriggers,
      performanceIssues,
      optimizationSuggestions,
      renderPatterns,
    };
  }

  generateReport(componentName?: string): string {
    if (componentName) {
      const analysis = this.analyzeComponent(componentName);
      if (!analysis) {
        return `No render data available for component: ${componentName}`;
      }
      return this.formatComponentReport(analysis);
    }

    // Generate global report
    const components = Array.from(this.componentStates.keys()).map(name => ({
      name,
      analysis: this.analyzeComponent(name)!,
    })).filter(({ analysis }) => analysis);

    return this.formatGlobalReport(components);
  }

  queryRenders(filters: {
    componentName?: string;
    timeRange?: { start: number; end: number };
    triggerReason?: string;
    minRenderTime?: number;
    hasPerformanceIssues?: boolean;
  }): RenderLogEntry[] {
    let results = this.globalRenderLog;

    if (filters.componentName) {
      results = results.filter(entry => entry.componentName === filters.componentName);
    }

    if (filters.timeRange) {
      results = results.filter(
        entry => entry.timestamp >= filters.timeRange!.start && entry.timestamp <= filters.timeRange!.end
      );
    }

    if (filters.triggerReason) {
      results = results.filter(entry => entry.triggerReason.includes(filters.triggerReason!));
    }

    if (filters.minRenderTime) {
      results = results.filter(entry => entry.performanceMetrics.renderDuration >= filters.minRenderTime!);
    }

    if (filters.hasPerformanceIssues) {
      results = results.filter(entry =>
        entry.performanceMetrics.renderDuration > 16 ||
        entry.propChanges.length > 10 ||
        entry.callbackExecutions.some(cb => cb.executionCount > 5)
      );
    }

    return results;
  }

  exportData(): string {
    const exportData = {
      timestamp: Date.now(),
      totalComponents: this.componentStates.size,
      totalRenders: this.globalRenderLog.length,
      componentAnalyses: Array.from(this.componentStates.keys()).map(name => this.analyzeComponent(name)),
      globalRenderLog: this.globalRenderLog,
      performanceSummary: this.generatePerformanceSummary(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  reset(componentName?: string): void {
    if (componentName) {
      this.componentStates.delete(componentName);
      this.globalRenderLog = this.globalRenderLog.filter(entry => entry.componentName !== componentName);
    } else {
      this.componentStates.clear();
      this.globalRenderLog = [];
    }
  }

  private getOrCreateComponentState(componentName: string): ComponentRenderState {
    let state = this.componentStates.get(componentName);
    if (!state) {
      state = {
        renderCount: 0,
        lastRenderTime: 0,
        renderHistory: [],
        performanceMetrics: {
          totalRenderTime: 0,
          averageRenderTime: 0,
          maxRenderTime: 0,
          minRenderTime: 0,
        },
        triggerPatterns: new Map(),
        propStability: new Map(),
      };
      this.componentStates.set(componentName, state);
    }
    return state;
  }

  private analyzeRenderEntry(entry: RenderLogEntry, componentState: ComponentRenderState): void {
    // Detect performance issues
    if (entry.performanceMetrics.renderDuration > 16) {
      console.warn(`[RenderDebugLogger] Slow render detected for ${entry.componentName}:`, {
        renderDuration: `${entry.performanceMetrics.renderDuration.toFixed(2)}ms`,
        renderCount: entry.renderCount,
        triggerReason: entry.triggerReason,
        propChanges: entry.propChanges.length,
        suggestion: 'Consider memoization or prop optimization',
      });
    }

    // Detect frequent renders
    const recentRenders = componentState.renderHistory.slice(-5);
    if (recentRenders.length >= 5) {
      const avgInterval = recentRenders.reduce((sum, render, index) => {
        if (index === 0) return sum;
        return sum + (render.timestamp - recentRenders[index - 1].timestamp);
      }, 0) / (recentRenders.length - 1);

      if (avgInterval < 50) {
        console.warn(`[RenderDebugLogger] Frequent renders detected for ${entry.componentName}:`, {
          averageInterval: `${avgInterval.toFixed(2)}ms`,
          recentRenders: recentRenders.length,
          suggestion: 'Consider debouncing updates or optimizing dependencies',
        });
      }
    }

    // Detect prop instability
    const unstableProps = entry.propChanges.filter(change =>
      change.changeType === 'function' || change.changeType === 'object'
    );
    if (unstableProps.length > 3) {
      console.warn(`[RenderDebugLogger] Prop instability detected for ${entry.componentName}:`, {
        unstableProps: unstableProps.map(p => p.propName),
        suggestion: 'Consider memoizing objects and callbacks passed as props',
      });
    }
  }

  private detectPerformanceIssues(componentName: string, state: ComponentRenderState): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Slow render detection
    if (state.performanceMetrics.averageRenderTime > 10) {
      issues.push({
        type: 'slow-render',
        severity: state.performanceMetrics.averageRenderTime > 30 ? 'high' : 'medium',
        description: `Average render time is ${state.performanceMetrics.averageRenderTime.toFixed(2)}ms`,
        occurrences: state.renderCount,
        impact: 'Affects user experience and app responsiveness',
        firstDetected: state.renderHistory[0]?.timestamp || 0,
        lastDetected: state.lastRenderTime,
      });
    }

    // Frequent render detection
    const renderFrequency = state.renderCount / ((state.lastRenderTime - (state.renderHistory[0]?.timestamp || 0)) / 1000);
    if (renderFrequency > 10) {
      issues.push({
        type: 'frequent-render',
        severity: renderFrequency > 30 ? 'high' : 'medium',
        description: `Component renders ${renderFrequency.toFixed(1)} times per second`,
        occurrences: state.renderCount,
        impact: 'High CPU usage and potential performance degradation',
        firstDetected: state.renderHistory[0]?.timestamp || 0,
        lastDetected: state.lastRenderTime,
      });
    }

    return issues;
  }

  private generateOptimizationSuggestions(componentName: string, state: ComponentRenderState): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Memoization suggestions
    if (state.performanceMetrics.averageRenderTime > 5) {
      suggestions.push({
        type: 'memoization',
        priority: 'high',
        description: 'Wrap component with React.memo to prevent unnecessary re-renders',
        expectedImpact: 'Could reduce render frequency by 30-60%',
        implementation: 'Use React.memo with custom comparison function if needed',
        codeExample: `export const ${componentName} = React.memo(${componentName}Component, (prev, next) => {\n  // Custom comparison logic\n  return shallowEqual(prev, next);\n});`,
      });
    }

    // Callback stability suggestions
    const unstableCallbacks = Array.from(state.propStability.entries())
      .filter(([, stats]) => stats.unstable > stats.stable * 0.5)
      .map(([prop]) => prop)
      .filter(prop => prop.includes('on') || prop.includes('handle'));

    if (unstableCallbacks.length > 0) {
      suggestions.push({
        type: 'callback-stability',
        priority: 'medium',
        description: `Unstable callback props detected: ${unstableCallbacks.join(', ')}`,
        expectedImpact: 'Could prevent child component re-renders',
        implementation: 'Use useCallback to memoize callback functions',
        codeExample: `const handleClick = useCallback((id) => {\n  // callback logic\n}, [dependency1, dependency2]);`,
      });
    }

    return suggestions;
  }

  private detectRenderPatterns(componentName: string, state: ComponentRenderState): RenderPattern[] {
    const patterns: RenderPattern[] = [];

    // Oscillation pattern
    const triggerCounts = Array.from(state.triggerPatterns.entries());
    const dominantTriggers = triggerCounts.filter(([, count]) => count > state.renderCount * 0.3);

    if (dominantTriggers.length === 1) {
      patterns.push({
        name: 'Single Trigger Dominance',
        description: `${dominantTriggers[0][1]} out of ${state.renderCount} renders caused by ${dominantTriggers[0][0]}`,
        frequency: dominantTriggers[0][1],
        examples: state.renderHistory.filter(entry => entry.triggerReason === dominantTriggers[0][0]).slice(0, 3),
        isProblematic: dominantTriggers[0][1] > state.renderCount * 0.7,
      });
    }

    return patterns;
  }

  private formatComponentReport(analysis: RenderAnalysisReport): string {
    return `
=== Render Analysis Report for ${analysis.componentName} ===

Performance Overview:
- Total Renders: ${analysis.totalRenders}
- Average Render Time: ${analysis.averageRenderTime.toFixed(2)}ms
- Render Frequency: ${analysis.renderFrequency.toFixed(2)} renders/second
- Time Range: ${new Date(analysis.timeRange.start).toISOString()} to ${new Date(analysis.timeRange.end).toISOString()}

Performance Issues (${analysis.performanceIssues.length}):
${analysis.performanceIssues.map(issue => `- [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description}`).join('\n')}

Optimization Suggestions (${analysis.optimizationSuggestions.length}):
${analysis.optimizationSuggestions.map(suggestion => `- [${suggestion.priority.toUpperCase()}] ${suggestion.type}: ${suggestion.description}`).join('\n')}

Common Render Triggers:
${analysis.commonTriggers.map(trigger => `- ${trigger.reason}: ${trigger.count} times`).join('\n')}

Render Patterns:
${analysis.renderPatterns.map(pattern => `- ${pattern.name}: ${pattern.description} ${pattern.isProblematic ? '⚠️' : '✅'}`).join('\n')}
`;
  }

  private formatGlobalReport(components: { name: string; analysis: RenderAnalysisReport }[]): string {
    const totalRenders = components.reduce((sum, { analysis }) => sum + analysis.totalRenders, 0);
    const avgRenderTime = components.reduce((sum, { analysis }) => sum + analysis.averageRenderTime, 0) / components.length;
    const totalIssues = components.reduce((sum, { analysis }) => sum + analysis.performanceIssues.length, 0);

    return `
=== Global Render Debug Report ===

Overview:
- Total Components: ${components.length}
- Total Renders: ${totalRenders}
- Average Render Time: ${avgRenderTime.toFixed(2)}ms
- Performance Issues: ${totalIssues}

Top Performance Issues:
${components
  .filter(({ analysis }) => analysis.performanceIssues.length > 0)
  .sort((a, b) => b.analysis.performanceIssues.length - a.analysis.performanceIssues.length)
  .slice(0, 5)
  .map(({ name, analysis }) => `- ${name}: ${analysis.performanceIssues.length} issues, ${analysis.averageRenderTime.toFixed(2)}ms avg`)
  .join('\n')}

Most Frequent Renderers:
${components
  .sort((a, b) => b.analysis.totalRenders - a.analysis.totalRenders)
  .slice(0, 5)
  .map(({ name, analysis }) => `- ${name}: ${analysis.totalRenders} renders, ${analysis.renderFrequency.toFixed(2)} renders/sec`)
  .join('\n')}

Slowest Components:
${components
  .sort((a, b) => b.analysis.averageRenderTime - a.analysis.averageRenderTime)
  .slice(0, 5)
  .map(({ name, analysis }) => `- ${name}: ${analysis.averageRenderTime.toFixed(2)}ms avg, ${analysis.totalRenders} renders`)
  .join('\n')}
`;
  }

  private generatePerformanceSummary() {
    const totalRenders = this.globalRenderLog.length;
    const totalComponents = this.componentStates.size;
    const averageRenderTime = this.globalRenderLog.reduce((sum, entry) => sum + entry.performanceMetrics.renderDuration, 0) / totalRenders;

    return {
      totalRenders,
      totalComponents,
      averageRenderTime,
      slowRenders: this.globalRenderLog.filter(entry => entry.performanceMetrics.renderDuration > 16).length,
      frequentComponents: Array.from(this.componentStates.entries())
        .filter(([, state]) => state.renderCount > 50)
        .length,
    };
  }
}

// Global instance for easy access
export const renderDebugLogger = RenderDebugLogger.getInstance();
