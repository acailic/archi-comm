import { UXOptimizer } from '../user-experience/UXOptimizer';
import { getGlobalShortcutManager, ShortcutAction, ShortcutCategory } from './KeyboardShortcuts';

export interface ShortcutUsageMetrics {
  shortcutId: string;
  totalUsageCount: number;
  successfulUsageCount: number;
  failedUsageCount: number;
  averageTimeSaved: number;
  lastUsedAt: number;
  discoveredAt: number;
  adoptionRate: number;
  retentionScore: number;
}

export interface ActionTrackingData {
  actionType: string;
  timestamp: number;
  isManual: boolean;
  hasAvailableShortcut: boolean;
  availableShortcutId?: string;
  executionTime: number;
  context: string;
}

export interface LearningRecommendation {
  type: 'discover' | 'practice' | 'custom' | 'workflow';
  shortcutId?: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  potentialTimeSaving: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: ShortcutCategory;
  context: string;
  actionRequired?: string;
}

export interface LearningProgress {
  userId: string;
  totalShortcutsLearned: number;
  totalTimeSaved: number;
  learningStreak: number;
  lastLearningDate: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredLearningStyle: 'progressive' | 'contextual' | 'practice';
  completedChallenges: string[];
}

export interface WorkflowPattern {
  id: string;
  name: string;
  actions: string[];
  frequency: number;
  averageExecutionTime: number;
  shortcutOpportunities: string[];
  efficiencyScore: number;
}

export class ShortcutLearningSystem {
  private static instance: ShortcutLearningSystem | null = null;

  private shortcutMetrics: Map<string, ShortcutUsageMetrics> = new Map();
  private actionTracking: ActionTrackingData[] = [];
  private workflowPatterns: Map<string, WorkflowPattern> = new Map();
  private learningProgress: LearningProgress;

  private readonly storageKeys = {
    metrics: 'archicomm_shortcut_metrics',
    actions: 'archicomm_action_tracking',
    workflows: 'archicomm_workflow_patterns',
    progress: 'archicomm_learning_progress',
  };

  private readonly maxActionHistory = 1000;
  private readonly learningThresholds = {
    discoveryUsage: 3,
    adoptionRate: 0.6,
    retentionDays: 7,
    expertUsage: 50,
  };

  private constructor() {
    this.loadStoredData();
    this.initializeLearningProgress();
    this.setupShortcutTracking();
  }

  public static getInstance(): ShortcutLearningSystem {
    if (!ShortcutLearningSystem.instance) {
      ShortcutLearningSystem.instance = new ShortcutLearningSystem();
    }
    return ShortcutLearningSystem.instance;
  }

  // Core tracking methods
  public trackShortcutUsage(
    shortcutId: string,
    success: boolean,
    timeSaved: number = 0,
    context: string = ''
  ): void {
    const now = Date.now();
    let metrics = this.shortcutMetrics.get(shortcutId);

    if (!metrics) {
      metrics = {
        shortcutId,
        totalUsageCount: 0,
        successfulUsageCount: 0,
        failedUsageCount: 0,
        averageTimeSaved: 0,
        lastUsedAt: now,
        discoveredAt: now,
        adoptionRate: 0,
        retentionScore: 0,
      };
    }

    // Update metrics
    metrics.totalUsageCount++;
    metrics.lastUsedAt = now;

    if (success) {
      metrics.successfulUsageCount++;
      if (timeSaved > 0) {
        metrics.averageTimeSaved =
          (metrics.averageTimeSaved * (metrics.successfulUsageCount - 1) + timeSaved) /
          metrics.successfulUsageCount;
      }
    } else {
      metrics.failedUsageCount++;
    }

    // Calculate adoption rate
    metrics.adoptionRate = metrics.successfulUsageCount / metrics.totalUsageCount;

    // Calculate retention score based on usage frequency over time
    const daysSinceDiscovery = (now - metrics.discoveredAt) / (1000 * 60 * 60 * 24);
    if (daysSinceDiscovery > 0) {
      const expectedUsage = daysSinceDiscovery * 0.5; // Expected usage frequency
      metrics.retentionScore = Math.min(metrics.totalUsageCount / expectedUsage, 1);
    }

    this.shortcutMetrics.set(shortcutId, metrics);

    // Track with UXOptimizer
    UXOptimizer.getInstance().trackAction('shortcut_usage', {
      shortcutId,
      success,
      timeSaved,
      context,
      adoptionRate: metrics.adoptionRate,
    });

    // Update learning progress
    this.updateLearningProgress();
    this.saveData();
  }

  public trackManualAction(actionType: string, executionTime: number, context: string = ''): void {
    const shortcutManager = getGlobalShortcutManager();
    if (!shortcutManager) return;

    const availableShortcut = this.findShortcutForAction(actionType);

    const trackingData: ActionTrackingData = {
      actionType,
      timestamp: Date.now(),
      isManual: true,
      hasAvailableShortcut: !!availableShortcut,
      availableShortcutId: availableShortcut?.id,
      executionTime,
      context,
    };

    this.actionTracking.push(trackingData);

    // Trim history if too long
    if (this.actionTracking.length > this.maxActionHistory) {
      this.actionTracking = this.actionTracking.slice(-this.maxActionHistory);
    }

    // Generate learning recommendation if frequently performed manually
    if (availableShortcut) {
      this.checkForLearningOpportunity(actionType, availableShortcut.id);
    }

    // Track workflow patterns
    this.updateWorkflowPatterns(actionType, executionTime);

    // Track with UXOptimizer
    UXOptimizer.getInstance().trackAction('manual_action', {
      actionType,
      executionTime,
      hasShortcut: !!availableShortcut,
      context,
    });

    this.saveData();
  }

  // Learning recommendation generation
  public getLearningRecommendations(): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    // Discover new shortcuts
    recommendations.push(...this.generateDiscoveryRecommendations());

    // Practice struggling shortcuts
    recommendations.push(...this.generatePracticeRecommendations());

    // Custom workflow shortcuts
    recommendations.push(...this.generateCustomShortcutRecommendations());

    // Workflow optimization
    recommendations.push(...this.generateWorkflowOptimizationRecommendations());

    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (
        priorityWeight[b.priority] - priorityWeight[a.priority] ||
        b.potentialTimeSaving - a.potentialTimeSaving
      );
    });
  }

  private generateDiscoveryRecommendations(): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];
    const shortcutManager = getGlobalShortcutManager();
    if (!shortcutManager) return recommendations;

    const allShortcuts = shortcutManager.getAllShortcuts();

    // Find frequently performed manual actions with available shortcuts
    const actionFrequency = new Map<string, number>();
    const recentActions = this.actionTracking.filter(
      action => action.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    recentActions.forEach(action => {
      if (action.isManual && action.hasAvailableShortcut) {
        actionFrequency.set(action.actionType, (actionFrequency.get(action.actionType) || 0) + 1);
      }
    });

    actionFrequency.forEach((frequency, actionType) => {
      if (frequency >= 5) {
        // Performed at least 5 times manually
        const shortcut = allShortcuts.find(s => this.matchesAction(s, actionType));
        if (shortcut && !this.shortcutMetrics.has(shortcut.id)) {
          const avgExecutionTime = this.getAverageExecutionTime(actionType);
          const potentialSaving = Math.max(avgExecutionTime - 500, 100); // Assume shortcut saves at least 100ms

          recommendations.push({
            type: 'discover',
            shortcutId: shortcut.id,
            title: `Learn ${shortcut.description}`,
            description: `You've performed this action ${frequency} times manually. Save time with ${shortcut.combination}.`,
            priority: frequency > 10 ? 'high' : 'medium',
            potentialTimeSaving: potentialSaving * frequency,
            difficulty: 'easy',
            category: shortcut.category,
            context: `Frequently used action: ${actionType}`,
          });
        }
      }
    });

    return recommendations;
  }

  private generatePracticeRecommendations(): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];
    const shortcutManager = getGlobalShortcutManager();
    if (!shortcutManager) return recommendations;

    this.shortcutMetrics.forEach((metrics, shortcutId) => {
      const shortcut = shortcutManager.getShortcut(shortcutId);
      if (!shortcut) return;

      // Low adoption rate - needs practice
      if (
        metrics.adoptionRate < this.learningThresholds.adoptionRate &&
        metrics.totalUsageCount >= 3
      ) {
        recommendations.push({
          type: 'practice',
          shortcutId,
          title: `Practice ${shortcut.description}`,
          description: `You're struggling with this shortcut (${Math.round(metrics.adoptionRate * 100)}% success rate). Practice makes perfect!`,
          priority: 'medium',
          potentialTimeSaving: metrics.averageTimeSaved * 10,
          difficulty: 'medium',
          category: shortcut.category,
          context: 'Low success rate',
          actionRequired: 'Complete practice exercises',
        });
      }

      // Low retention - re-learning needed
      const daysSinceLastUse = (Date.now() - metrics.lastUsedAt) / (1000 * 60 * 60 * 24);
      if (
        metrics.retentionScore < 0.3 &&
        daysSinceLastUse > this.learningThresholds.retentionDays
      ) {
        recommendations.push({
          type: 'practice',
          shortcutId,
          title: `Refresh ${shortcut.description}`,
          description: `You haven't used this shortcut in ${Math.round(daysSinceLastUse)} days. Time for a refresher!`,
          priority: 'low',
          potentialTimeSaving: metrics.averageTimeSaved * 5,
          difficulty: 'easy',
          category: shortcut.category,
          context: 'Unused shortcut',
        });
      }
    });

    return recommendations;
  }

  private generateCustomShortcutRecommendations(): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    // Analyze workflow patterns for custom shortcut opportunities
    this.workflowPatterns.forEach((pattern, patternId) => {
      if (
        pattern.frequency > 10 &&
        pattern.shortcutOpportunities.length === 0 &&
        pattern.averageExecutionTime > 2000
      ) {
        recommendations.push({
          type: 'custom',
          title: `Create custom shortcut for "${pattern.name}"`,
          description: `You perform this ${pattern.actions.length}-step workflow ${pattern.frequency} times. A custom shortcut could save significant time.`,
          priority: 'high',
          potentialTimeSaving: (pattern.averageExecutionTime - 500) * pattern.frequency,
          difficulty: 'medium',
          category: 'workflow' as ShortcutCategory,
          context: `Workflow: ${pattern.name}`,
          actionRequired: 'Set up custom shortcut',
        });
      }
    });

    return recommendations;
  }

  private generateWorkflowOptimizationRecommendations(): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    // Find inefficient workflows that could be optimized with existing shortcuts
    this.workflowPatterns.forEach((pattern, patternId) => {
      if (pattern.efficiencyScore < 0.6 && pattern.shortcutOpportunities.length > 0) {
        const totalPotentialSaving = pattern.shortcutOpportunities.reduce((sum, shortcutId) => {
          const metrics = this.shortcutMetrics.get(shortcutId);
          return sum + (metrics?.averageTimeSaved || 1000);
        }, 0);

        recommendations.push({
          type: 'workflow',
          title: `Optimize "${pattern.name}" workflow`,
          description: `This workflow has ${pattern.shortcutOpportunities.length} shortcut opportunities that could improve efficiency by ${Math.round((1 - pattern.efficiencyScore) * 100)}%.`,
          priority: 'medium',
          potentialTimeSaving: totalPotentialSaving * pattern.frequency,
          difficulty: 'medium',
          category: 'workflow' as ShortcutCategory,
          context: `Inefficient workflow: ${pattern.name}`,
        });
      }
    });

    return recommendations;
  }

  // Analytics and reporting
  public getShortcutAnalytics(shortcutId?: string): ShortcutUsageMetrics[] {
    if (shortcutId) {
      const metrics = this.shortcutMetrics.get(shortcutId);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.shortcutMetrics.values()).sort(
      (a, b) => b.totalUsageCount - a.totalUsageCount
    );
  }

  public getLearningProgress(): LearningProgress {
    return { ...this.learningProgress };
  }

  public getWorkflowPatterns(): WorkflowPattern[] {
    return Array.from(this.workflowPatterns.values()).sort((a, b) => b.frequency - a.frequency);
  }

  public getEfficiencyMetrics(): {
    totalTimeSaved: number;
    totalShortcutsUsed: number;
    averageAdoptionRate: number;
    topPerformingShortcuts: ShortcutUsageMetrics[];
    learningTrends: any;
  } {
    const metrics = Array.from(this.shortcutMetrics.values());
    const totalTimeSaved = metrics.reduce(
      (sum, m) => sum + m.averageTimeSaved * m.successfulUsageCount,
      0
    );
    const totalShortcutsUsed = metrics.reduce((sum, m) => sum + m.totalUsageCount, 0);
    const averageAdoptionRate =
      metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.adoptionRate, 0) / metrics.length : 0;

    const topPerformingShortcuts = metrics
      .filter(m => m.totalUsageCount >= 5)
      .sort(
        (a, b) =>
          b.averageTimeSaved * b.successfulUsageCount - a.averageTimeSaved * a.successfulUsageCount
      )
      .slice(0, 10);

    return {
      totalTimeSaved,
      totalShortcutsUsed,
      averageAdoptionRate,
      topPerformingShortcuts,
      learningTrends: this.calculateLearningTrends(),
    };
  }

  // Configuration and preferences
  public setLearningPreferences(preferences: Partial<LearningProgress>): void {
    Object.assign(this.learningProgress, preferences);
    this.saveData();
  }

  public exportLearningData(): any {
    return {
      metrics: Array.from(this.shortcutMetrics.entries()),
      progress: this.learningProgress,
      workflows: Array.from(this.workflowPatterns.entries()),
      timestamp: Date.now(),
    };
  }

  public importLearningData(data: any): boolean {
    try {
      if (data.metrics) {
        this.shortcutMetrics = new Map(data.metrics);
      }
      if (data.progress) {
        this.learningProgress = { ...this.learningProgress, ...data.progress };
      }
      if (data.workflows) {
        this.workflowPatterns = new Map(data.workflows);
      }
      this.saveData();
      return true;
    } catch (error) {
      console.error('Failed to import learning data:', error);
      return false;
    }
  }

  // Private helper methods
  private setupShortcutTracking(): void {
    // Hook into KeyboardShortcutManager to track usage automatically
    const shortcutManager = getGlobalShortcutManager();
    if (!shortcutManager) return;

    // Override the execute method to track usage
    const originalExecute = shortcutManager.executeShortcut?.bind(shortcutManager);
    if (originalExecute) {
      (shortcutManager as any).executeShortcut = (
        shortcut: ShortcutAction,
        event: KeyboardEvent
      ) => {
        const startTime = performance.now();

        try {
          const result = originalExecute(shortcut, event);
          const executionTime = performance.now() - startTime;
          this.trackShortcutUsage(shortcut.id, true, Math.max(1000 - executionTime, 0));
          return result;
        } catch (error) {
          const executionTime = performance.now() - startTime;
          this.trackShortcutUsage(shortcut.id, false, 0);
          throw error;
        }
      };
    }
  }

  private findShortcutForAction(actionType: string): ShortcutAction | null {
    const shortcutManager = getGlobalShortcutManager();
    if (!shortcutManager) return null;

    return (
      shortcutManager
        .getAllShortcuts()
        .find(shortcut => this.matchesAction(shortcut, actionType)) || null
    );
  }

  private matchesAction(shortcut: ShortcutAction, actionType: string): boolean {
    const normalizedAction = actionType.toLowerCase().replace(/[_\s-]/g, '');
    const normalizedShortcut = (shortcut.description + ' ' + shortcut.id)
      .toLowerCase()
      .replace(/[_\s-]/g, '');

    return (
      normalizedShortcut.includes(normalizedAction) ||
      normalizedAction.includes(normalizedShortcut.split(' ')[0])
    );
  }

  private getAverageExecutionTime(actionType: string): number {
    const relevantActions = this.actionTracking.filter(
      action => action.actionType === actionType && action.isManual
    );

    if (relevantActions.length === 0) return 2000; // Default assumption

    return (
      relevantActions.reduce((sum, action) => sum + action.executionTime, 0) /
      relevantActions.length
    );
  }

  private checkForLearningOpportunity(actionType: string, shortcutId: string): void {
    const recentActions = this.actionTracking.filter(
      action =>
        action.actionType === actionType && action.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    if (recentActions >= 3) {
      // Trigger learning recommendation through UXOptimizer
      UXOptimizer.getInstance().notifyObservers('show-help', {
        componentId: 'shortcut-learning',
        shortcutId,
        actionType,
        frequency: recentActions,
      });
    }
  }

  private updateWorkflowPatterns(actionType: string, executionTime: number): void {
    // Simple pattern detection - could be enhanced with more sophisticated analysis
    const recentActions = this.actionTracking
      .filter(action => action.timestamp > Date.now() - 5 * 60 * 1000) // Last 5 minutes
      .map(action => action.actionType);

    if (recentActions.length >= 3) {
      const patternId = recentActions.slice(-3).join('-');
      let pattern = this.workflowPatterns.get(patternId);

      if (!pattern) {
        pattern = {
          id: patternId,
          name: recentActions.slice(-3).join(' → '),
          actions: recentActions.slice(-3),
          frequency: 0,
          averageExecutionTime: 0,
          shortcutOpportunities: [],
          efficiencyScore: 1.0,
        };
      }

      pattern.frequency++;
      pattern.averageExecutionTime =
        (pattern.averageExecutionTime * (pattern.frequency - 1) + executionTime) /
        pattern.frequency;

      // Calculate efficiency score and shortcut opportunities
      pattern.shortcutOpportunities = pattern.actions
        .map(action => this.findShortcutForAction(action))
        .filter(shortcut => shortcut !== null)
        .map(shortcut => shortcut!.id);

      pattern.efficiencyScore = pattern.shortcutOpportunities.length / pattern.actions.length;

      this.workflowPatterns.set(patternId, pattern);
    }
  }

  private updateLearningProgress(): void {
    const metrics = Array.from(this.shortcutMetrics.values());

    this.learningProgress.totalShortcutsLearned = metrics.filter(
      m => m.totalUsageCount >= this.learningThresholds.discoveryUsage
    ).length;

    this.learningProgress.totalTimeSaved = metrics.reduce(
      (sum, m) => sum + m.averageTimeSaved * m.successfulUsageCount,
      0
    );

    // Update skill level based on usage patterns
    const expertShortcuts = metrics.filter(
      m => m.totalUsageCount >= this.learningThresholds.expertUsage
    ).length;
    const adoptedShortcuts = metrics.filter(
      m => m.adoptionRate >= this.learningThresholds.adoptionRate
    ).length;

    if (expertShortcuts >= 10 && adoptedShortcuts >= 15) {
      this.learningProgress.skillLevel = 'advanced';
    } else if (adoptedShortcuts >= 8) {
      this.learningProgress.skillLevel = 'intermediate';
    } else {
      this.learningProgress.skillLevel = 'beginner';
    }

    // Update learning streak
    const today = new Date().toDateString();
    const lastLearningDate = new Date(this.learningProgress.lastLearningDate).toDateString();

    if (today !== lastLearningDate) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      if (lastLearningDate === yesterday) {
        this.learningProgress.learningStreak++;
      } else {
        this.learningProgress.learningStreak = 1;
      }
      this.learningProgress.lastLearningDate = Date.now();
    }
  }

  private calculateLearningTrends(): any {
    // Simple trend calculation - could be enhanced with more sophisticated analysis
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentMetrics = Array.from(this.shortcutMetrics.values()).filter(
      m => m.lastUsedAt > thirtyDaysAgo
    );

    return {
      recentlyUsedShortcuts: recentMetrics.length,
      averageSuccessRate:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.adoptionRate, 0) / recentMetrics.length
          : 0,
      trendDirection:
        recentMetrics.length > this.shortcutMetrics.size * 0.7 ? 'increasing' : 'decreasing',
    };
  }

  private initializeLearningProgress(): void {
    const stored = localStorage.getItem(this.storageKeys.progress);

    this.learningProgress = stored
      ? JSON.parse(stored)
      : {
          userId: 'anonymous',
          totalShortcutsLearned: 0,
          totalTimeSaved: 0,
          learningStreak: 0,
          lastLearningDate: Date.now(),
          skillLevel: 'beginner' as const,
          preferredLearningStyle: 'contextual' as const,
          completedChallenges: [],
        };
  }

  private loadStoredData(): void {
    try {
      // Load metrics
      const metricsData = localStorage.getItem(this.storageKeys.metrics);
      if (metricsData) {
        const parsed = JSON.parse(metricsData);
        this.shortcutMetrics = new Map(parsed);
      }

      // Load action tracking
      const actionsData = localStorage.getItem(this.storageKeys.actions);
      if (actionsData) {
        this.actionTracking = JSON.parse(actionsData);
      }

      // Load workflow patterns
      const workflowsData = localStorage.getItem(this.storageKeys.workflows);
      if (workflowsData) {
        const parsed = JSON.parse(workflowsData);
        this.workflowPatterns = new Map(parsed);
      }
    } catch (error) {
      console.error('Failed to load shortcut learning data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(
        this.storageKeys.metrics,
        JSON.stringify(Array.from(this.shortcutMetrics.entries()))
      );
      localStorage.setItem(this.storageKeys.actions, JSON.stringify(this.actionTracking));
      localStorage.setItem(
        this.storageKeys.workflows,
        JSON.stringify(Array.from(this.workflowPatterns.entries()))
      );
      localStorage.setItem(this.storageKeys.progress, JSON.stringify(this.learningProgress));
    } catch (error) {
      console.error('Failed to save shortcut learning data:', error);
    }
  }
}

export default ShortcutLearningSystem;
