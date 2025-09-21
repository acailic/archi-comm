/**
 * Profiler Orchestrator - Centralized performance profiling coordination
 * Integrates React Profiler with ComponentOptimizer for automated performance analysis
 */

import { ReactProfilerIntegration, ProfilerMetrics } from './ReactProfilerIntegration';
import { ComponentOptimizer, OptimizationInsight } from './ComponentOptimizer';

export interface ProfilingSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  componentsTracked: string[];
  metrics: Record<string, ProfilerMetrics[]>;
  insights: Record<string, OptimizationInsight[]>;
  summary: ProfilingSummary;
}

export interface ProfilingSummary {
  totalComponents: number;
  criticalComponents: string[];
  slowComponents: string[];
  frequentlyUpdatingComponents: string[];
  averageRenderTime: number;
  totalRenderTime: number;
  slowRenderCount: number;
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'memoization' | 'virtualization' | 'context-split' | 'prop-stability' | 'lazy-loading';
  priority: 'low' | 'medium' | 'high' | 'critical';
  componentIds: string[];
  message: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface ProfilingConfig {
  duration?: number; // in milliseconds, default 10000 (10 seconds)
  targetComponents?: string[]; // if specified, only track these components
  slowRenderThreshold?: number; // default 16ms
  enableContinuousMonitoring?: boolean;
  generateRecommendations?: boolean;
}

class ProfilerOrchestrator {
  private static instance: ProfilerOrchestrator | null = null;
  private reactProfiler = ReactProfilerIntegration.getInstance();
  private componentOptimizer = ComponentOptimizer.getInstance();
  private performanceOptimizer = PerformanceOptimizer.getInstance();

  private activeSessions = new Map<string, ProfilingSession>();
  private continuousMonitoringEnabled = false;
  private sessionCounter = 0;

  static getInstance(): ProfilerOrchestrator {
    if (!ProfilerOrchestrator.instance) {
      ProfilerOrchestrator.instance = new ProfilerOrchestrator();
    }
    return ProfilerOrchestrator.instance;
  }

  /**
   * Starts an automated profiling session to identify performance offenders
   */
  async startProfilingSession(config: ProfilingConfig = {}): Promise<ProfilingSession> {
    const sessionId = `session-${++this.sessionCounter}-${Date.now()}`;
    const duration = config.duration || 10000;
    const slowRenderThreshold = config.slowRenderThreshold || 16;

    // Initialize session
    const session: ProfilingSession = {
      id: sessionId,
      startTime: Date.now(),
      componentsTracked: config.targetComponents || [],
      metrics: {},
      insights: {},
      summary: this.createEmptySummary(),
    };

    this.activeSessions.set(sessionId, session);

    // Start batch measurement
    const finishMeasurement = this.reactProfiler.startBatchMeasurement();

    // If targeting specific components, enable their tracking
    if (config.targetComponents) {
      config.targetComponents.forEach(componentId => {
        this.reactProfiler.setComponentTracking(componentId, true);
      });
    }

    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, duration));

    // Stop measurement and collect results
    const metrics = await finishMeasurement();
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.metrics = metrics;

    // Generate insights for each component
    Object.keys(metrics).forEach(componentId => {
      session.insights[componentId] = this.componentOptimizer.getInsights(componentId);
    });

    // Generate summary and recommendations
    session.summary = this.generateProfilingSummary(session, slowRenderThreshold);

    if (config.generateRecommendations !== false) {
      session.summary.recommendations = this.generateOptimizationRecommendations(session);
    }

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Enables continuous monitoring for real-time performance insights
   */
  enableContinuousMonitoring(config: Partial<ProfilingConfig> = {}): void {
    if (this.continuousMonitoringEnabled) {
      return;
    }

    this.continuousMonitoringEnabled = true;
    const slowRenderThreshold = config.slowRenderThreshold || 16;

    // Set up periodic analysis
    const analysisInterval = setInterval(() => {
      if (!this.continuousMonitoringEnabled) {
        clearInterval(analysisInterval);
        return;
      }

      this.performContinuousAnalysis(slowRenderThreshold);
    }, 5000); // Analyze every 5 seconds

    // Clean up on disable
    const cleanup = () => {
      this.continuousMonitoringEnabled = false;
      clearInterval(analysisInterval);
    };

    // Store cleanup function
    (this as any)._continuousCleanup = cleanup;
  }

  /**
   * Disables continuous monitoring
   */
  disableContinuousMonitoring(): void {
    this.continuousMonitoringEnabled = false;
    if ((this as any)._continuousCleanup) {
      (this as any)._continuousCleanup();
    }
  }

  /**
   * Gets the latest profiling insights for development dashboard
   */
  getLatestInsights(): {
    activeSession: ProfilingSession | null;
    recentSessions: ProfilingSession[];
    continuousMonitoring: boolean;
    overallRecommendations: OptimizationRecommendation[];
  } {
    const sessions = Array.from(this.activeSessions.values())
      .sort((a, b) => b.startTime - a.startTime);

    const activeSession = sessions.find(s => !s.endTime) || null;
    const recentSessions = sessions.filter(s => s.endTime).slice(0, 5);

    // Generate overall recommendations from recent sessions
    const overallRecommendations = this.generateOverallRecommendations(recentSessions);

    return {
      activeSession,
      recentSessions,
      continuousMonitoring: this.continuousMonitoringEnabled,
      overallRecommendations,
    };
  }

  /**
   * Exports detailed profiling data for analysis
   */
  exportProfilingData(sessionId?: string): string {
    if (sessionId) {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      return JSON.stringify(session, null, 2);
    }

    // Export all sessions
    const exportData = {
      timestamp: new Date().toISOString(),
      sessions: Array.from(this.activeSessions.values()),
      systemInfo: {
        userAgent: navigator.userAgent,
        memory: (performance as any).memory,
        timing: performance.timing,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Gets performance offenders from the latest profiling session
   */
  getPerformanceOffenders(): {
    critical: string[];
    slow: string[];
    frequentUpdaters: string[];
    memoryHeavy: string[];
  } {
    const latestSession = Array.from(this.activeSessions.values())
      .sort((a, b) => b.startTime - a.startTime)[0];

    if (!latestSession) {
      return { critical: [], slow: [], frequentUpdaters: [], memoryHeavy: [] };
    }

    return {
      critical: latestSession.summary.criticalComponents,
      slow: latestSession.summary.slowComponents,
      frequentUpdaters: latestSession.summary.frequentlyUpdatingComponents,
      memoryHeavy: this.identifyMemoryHeavyComponents(latestSession),
    };
  }

  /**
   * Automatically starts profiling when performance issues are detected
   */
  enableAutoProfilingOnIssues(): void {
    // Monitor performance optimizer events
    this.performanceOptimizer.onPerformanceIssue((issue) => {
      if (!import.meta.env.DEV) return;

      console.warn('🚨 Performance issue detected, starting automated profiling...', issue);

      this.startProfilingSession({
        duration: 15000, // 15 seconds
        slowRenderThreshold: 12, // Lower threshold for issue detection
        generateRecommendations: true,
      }).then(session => {
        console.log('📊 Automated profiling completed:', session.summary);
      });
    });
  }

  private createEmptySummary(): ProfilingSummary {
    return {
      totalComponents: 0,
      criticalComponents: [],
      slowComponents: [],
      frequentlyUpdatingComponents: [],
      averageRenderTime: 0,
      totalRenderTime: 0,
      slowRenderCount: 0,
      recommendations: [],
    };
  }

  private generateProfilingSummary(session: ProfilingSession, slowRenderThreshold: number): ProfilingSummary {
    const metrics = session.metrics;
    const componentIds = Object.keys(metrics);

    let totalRenderTime = 0;
    let totalRenders = 0;
    let slowRenderCount = 0;
    const criticalComponents: string[] = [];
    const slowComponents: string[] = [];
    const frequentlyUpdatingComponents: string[] = [];

    componentIds.forEach(componentId => {
      const componentMetrics = metrics[componentId];
      const insights = session.insights[componentId] || [];

      // Calculate component stats
      const renderTimes = componentMetrics.map(m => m.actualDuration);
      const avgDuration = renderTimes.reduce((sum, t) => sum + t, 0) / renderTimes.length;
      const maxDuration = Math.max(...renderTimes);
      const updateCount = componentMetrics.filter(m => m.phase === 'update').length;
      const mountCount = componentMetrics.filter(m => m.phase === 'mount').length;

      totalRenderTime += renderTimes.reduce((sum, t) => sum + t, 0);
      totalRenders += renderTimes.length;
      slowRenderCount += renderTimes.filter(t => t > slowRenderThreshold).length;

      // Classify components
      if (insights.some(i => i.severity === 'critical') || avgDuration > slowRenderThreshold * 2) {
        criticalComponents.push(componentId);
      } else if (avgDuration > slowRenderThreshold || maxDuration > slowRenderThreshold * 1.5) {
        slowComponents.push(componentId);
      }

      if (updateCount > mountCount * 3 && componentMetrics.length > 10) {
        frequentlyUpdatingComponents.push(componentId);
      }
    });

    return {
      totalComponents: componentIds.length,
      criticalComponents,
      slowComponents,
      frequentlyUpdatingComponents,
      averageRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
      totalRenderTime,
      slowRenderCount,
      recommendations: [],
    };
  }

  private generateOptimizationRecommendations(session: ProfilingSession): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const { summary } = session;

    // Critical components need immediate attention
    if (summary.criticalComponents.length > 0) {
      recommendations.push({
        type: 'memoization',
        priority: 'critical',
        componentIds: summary.criticalComponents,
        message: `${summary.criticalComponents.length} components have critical performance issues`,
        estimatedImpact: 'high',
        implementationComplexity: 'medium',
      });
    }

    // Slow components benefit from memoization
    if (summary.slowComponents.length > 0) {
      recommendations.push({
        type: 'memoization',
        priority: 'high',
        componentIds: summary.slowComponents,
        message: `${summary.slowComponents.length} components render slowly and may benefit from memoization`,
        estimatedImpact: 'medium',
        implementationComplexity: 'low',
      });
    }

    // Frequently updating components need prop stability
    if (summary.frequentlyUpdatingComponents.length > 0) {
      recommendations.push({
        type: 'prop-stability',
        priority: 'high',
        componentIds: summary.frequentlyUpdatingComponents,
        message: `${summary.frequentlyUpdatingComponents.length} components update frequently - check prop stability`,
        estimatedImpact: 'high',
        implementationComplexity: 'medium',
      });
    }

    // Large lists/grids need virtualization
    const virtualizationCandidates = this.identifyVirtualizationCandidates(session);
    if (virtualizationCandidates.length > 0) {
      recommendations.push({
        type: 'virtualization',
        priority: 'medium',
        componentIds: virtualizationCandidates,
        message: `${virtualizationCandidates.length} components may benefit from virtualization`,
        estimatedImpact: 'high',
        implementationComplexity: 'high',
      });
    }

    // Context splitting recommendations
    const contextSplitCandidates = this.identifyContextSplitCandidates(session);
    if (contextSplitCandidates.length > 0) {
      recommendations.push({
        type: 'context-split',
        priority: 'medium',
        componentIds: contextSplitCandidates,
        message: `${contextSplitCandidates.length} components may benefit from context splitting`,
        estimatedImpact: 'medium',
        implementationComplexity: 'high',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generateOverallRecommendations(recentSessions: ProfilingSession[]): OptimizationRecommendation[] {
    if (recentSessions.length === 0) return [];

    // Aggregate recommendations from recent sessions
    const aggregatedRecommendations = new Map<string, OptimizationRecommendation>();

    recentSessions.forEach(session => {
      session.summary.recommendations.forEach(rec => {
        const key = `${rec.type}-${rec.componentIds.sort().join(',')}`;
        if (aggregatedRecommendations.has(key)) {
          // Increase priority if seen multiple times
          const existing = aggregatedRecommendations.get(key)!;
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          const newPriorityLevel = Math.min(4, priorityOrder[existing.priority] + 1);
          const priorityKeys = ['', 'low', 'medium', 'high', 'critical'];
          existing.priority = priorityKeys[newPriorityLevel] as any;
        } else {
          aggregatedRecommendations.set(key, { ...rec });
        }
      });
    });

    return Array.from(aggregatedRecommendations.values());
  }

  private identifyVirtualizationCandidates(session: ProfilingSession): string[] {
    // Identify components that render many items and might benefit from virtualization
    const candidates: string[] = [];

    Object.entries(session.metrics).forEach(([componentId, metrics]) => {
      const hasLongRenderTimes = metrics.some(m => m.actualDuration > 32);
      const rendersManyItems = componentId.toLowerCase().includes('list') ||
                              componentId.toLowerCase().includes('grid') ||
                              componentId.toLowerCase().includes('palette');

      if (hasLongRenderTimes && rendersManyItems) {
        candidates.push(componentId);
      }
    });

    return candidates;
  }

  private identifyContextSplitCandidates(session: ProfilingSession): string[] {
    // Identify components that might benefit from context splitting
    const candidates: string[] = [];

    Object.entries(session.insights).forEach(([componentId, insights]) => {
      const hasFrequentUpdates = insights.some(i =>
        i.message.includes('updates frequently') ||
        i.message.includes('changing inputs')
      );

      if (hasFrequentUpdates && componentId.toLowerCase().includes('context')) {
        candidates.push(componentId);
      }
    });

    return candidates;
  }

  private identifyMemoryHeavyComponents(session: ProfilingSession): string[] {
    // This would need integration with memory profiling tools
    // For now, return components with long base durations
    const candidates: string[] = [];

    Object.entries(session.metrics).forEach(([componentId, metrics]) => {
      const avgBaseDuration = metrics.reduce((sum, m) => sum + m.baseDuration, 0) / metrics.length;
      if (avgBaseDuration > 50) { // Arbitrary threshold
        candidates.push(componentId);
      }
    });

    return candidates;
  }

  private performContinuousAnalysis(slowRenderThreshold: number): void {
    // Get current performance state
    const recentMetrics = this.reactProfiler.getAllMetrics();
    const componentIds = Object.keys(recentMetrics);

    if (componentIds.length === 0) return;

    // Check for performance degradation
    const performanceIssues: string[] = [];

    componentIds.forEach(componentId => {
      const metrics = recentMetrics[componentId];
      const recentRenders = metrics.slice(-5);

      if (recentRenders.length > 0) {
        const avgDuration = recentRenders.reduce((sum, m) => sum + m.actualDuration, 0) / recentRenders.length;

        if (avgDuration > slowRenderThreshold * 1.5) {
          performanceIssues.push(componentId);
        }
      }
    });

    // Log performance issues in development
    if (performanceIssues.length > 0 && import.meta.env.DEV) {
      console.warn(`🚨 Continuous monitoring detected performance issues in: ${performanceIssues.join(', ')}`);
    }
  }

  /**
   * Clear all profiling data
   */
  reset(): void {
    this.activeSessions.clear();
    this.reactProfiler.reset();
    this.componentOptimizer.reset();
    this.sessionCounter = 0;
  }
}

// Singleton instance
export const profilerOrchestrator = ProfilerOrchestrator.getInstance();

// Development tools integration
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__PROFILER_ORCHESTRATOR__ = {
    getInstance: () => ProfilerOrchestrator.getInstance(),
    startSession: (config?: ProfilingConfig) => ProfilerOrchestrator.getInstance().startProfilingSession(config),
    getInsights: () => ProfilerOrchestrator.getInstance().getLatestInsights(),
    getOffenders: () => ProfilerOrchestrator.getInstance().getPerformanceOffenders(),
    exportData: () => ProfilerOrchestrator.getInstance().exportProfilingData(),
    reset: () => ProfilerOrchestrator.getInstance().reset(),
  };
}

export default ProfilerOrchestrator;