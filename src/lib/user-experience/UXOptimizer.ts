/**
 * ArchiComm UX Optimizer
 * Advanced user experience optimization system for maximum productivity
 */

import { PerformanceMonitor } from '../performance/PerformanceOptimizer';

export interface UXMetrics {
  taskCompletionTime: number;
  errorRate: number;
  userSatisfactionScore: number;
  featureUsageFrequency: Record<string, number>;
  sessionDuration: number;
  interactionDepth: number;
}

export interface UserBehaviorPattern {
  userId: string;
  sessionId: string;
  actions: UserAction[];
  preferences: UserPreferences;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  workflowPatterns: WorkflowPattern[];
}

export interface UserAction {
  type: string;
  timestamp: number;
  data: any;
  duration?: number;
  success: boolean;
  context: ActionContext;
}

export interface ActionContext {
  page: string;
  component: string;
  previousAction?: string;
  userIntent: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  shortcuts: boolean;
  animations: boolean;
  autoSave: boolean;
  gridSnapping: boolean;
  tooltips: boolean;
  advancedFeatures: boolean;
}

export interface WorkflowPattern {
  name: string;
  frequency: number;
  steps: string[];
  averageTime: number;
  successRate: number;
}

export class UXOptimizer {
  private static instance: UXOptimizer;
  private performanceMonitor: PerformanceMonitor;
  private userBehavior: UserBehaviorPattern | null = null;
  private metrics: UXMetrics;
  private adaptations: Map<string, UXAdaptation> = new Map();
  private observers: Set<UXObserver> = new Set();

  static getInstance(): UXOptimizer {
    if (!UXOptimizer.instance) {
      UXOptimizer.instance = new UXOptimizer();
    }
    return UXOptimizer.instance;
  }

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.metrics = this.initializeMetrics();
    this.setupBehaviorTracking();
    this.loadUserPreferences();
  }

  /**
   * Track user action for behavior analysis
   */
  trackAction(action: Omit<UserAction, 'timestamp'>): void {
    const trackedAction: UserAction = {
      ...action,
      timestamp: Date.now()
    };

    if (!this.userBehavior) {
      this.initializeUserBehavior();
    }

    this.userBehavior!.actions.push(trackedAction);
    this.updateMetrics(trackedAction);
    this.analyzeAndAdapt(trackedAction);

    // Limit action history to prevent memory issues
    if (this.userBehavior!.actions.length > 1000) {
      this.userBehavior!.actions = this.userBehavior!.actions.slice(-500);
    }
  }

  /**
   * Get personalized recommendations
   */
  getRecommendations(): UXRecommendation[] {
    const recommendations: UXRecommendation[] = [];

    if (!this.userBehavior) return recommendations;

    // Analyze usage patterns
    const recentActions = this.userBehavior.actions.slice(-50);
    const errorActions = recentActions.filter(a => !a.success);
    const frequentActions = this.getFrequentActions(recentActions);

    // High error rate recommendation
    if (errorActions.length > recentActions.length * 0.2) {
      recommendations.push({
        type: 'tutorial',
        priority: 'high',
        title: 'Need help with this feature?',
        description: 'We noticed you might be having trouble. Would you like a quick tutorial?',
        action: () => this.showContextualHelp(errorActions[0].context.component)
      });
    }

    // Keyboard shortcuts recommendation
    if (frequentActions.length > 0 && !this.userBehavior.preferences.shortcuts) {
      recommendations.push({
        type: 'feature',
        priority: 'medium',
        title: 'Speed up your workflow',
        description: `Use Ctrl+${this.getShortcutForAction(frequentActions[0])} for faster access`,
        action: () => this.enableShortcuts()
      });
    }

    // Advanced features recommendation
    if (this.userBehavior.skillLevel === 'expert' && !this.userBehavior.preferences.advancedFeatures) {
      recommendations.push({
        type: 'feature',
        priority: 'low',
        title: 'Unlock advanced features',
        description: 'You seem experienced! Enable advanced mode for more tools.',
        action: () => this.enableAdvancedFeatures()
      });
    }

    return recommendations;
  }

  /**
   * Optimize interface based on user behavior
   */
  optimizeInterface(): void {
    if (!this.userBehavior) return;

    const adaptations: UXAdaptation[] = [];

    // Analyze workflow patterns
    const patterns = this.analyzeWorkflowPatterns();
    
    // Customize toolbar based on usage
    const toolbarAdaptation = this.optimizeToolbar(patterns);
    if (toolbarAdaptation) {
      adaptations.push(toolbarAdaptation);
    }

    // Adjust animation speed based on preferences
    const animationAdaptation = this.optimizeAnimations();
    if (animationAdaptation) {
      adaptations.push(animationAdaptation);
    }

    // Optimize layout for screen size and usage
    const layoutAdaptation = this.optimizeLayout();
    if (layoutAdaptation) {
      adaptations.push(layoutAdaptation);
    }

    // Apply adaptations
    adaptations.forEach(adaptation => {
      this.adaptations.set(adaptation.id, adaptation);
      this.applyAdaptation(adaptation);
    });

    this.notifyObservers('interface-optimized', adaptations);
  }

  /**
   * Measure user satisfaction
   */
  measureSatisfaction(): number {
    if (!this.userBehavior) return 0.5;

    const recentActions = this.userBehavior.actions.slice(-100);
    const successRate = recentActions.filter(a => a.success).length / recentActions.length;
    const avgCompletionTime = this.calculateAverageCompletionTime(recentActions);
    const expectedTime = 5000; // 5 seconds baseline

    // Calculate satisfaction based on success rate and efficiency
    const efficiencyScore = Math.min(expectedTime / avgCompletionTime, 1);
    const satisfactionScore = (successRate * 0.6) + (efficiencyScore * 0.4);

    this.metrics.userSatisfactionScore = satisfactionScore;
    return satisfactionScore;
  }

  /**
   * Get success rate from recent user actions
   */
  getSuccessRate(): number {
    if (!this.userBehavior) return 0.5;

    const recentActions = this.userBehavior.actions.slice(-100);
    if (recentActions.length === 0) return 0.5;

    const successfulActions = recentActions.filter(a => a.success);
    return successfulActions.length / recentActions.length;
  }

  /**
   * Get current user's skill level
   */
  getSkillLevel(): string {
    if (!this.userBehavior) return 'intermediate';
    return this.userBehavior.skillLevel || 'intermediate';
  }

  /**
   * Provide contextual help
   */
  showContextualHelp(component: string): void {
    const helpContent = this.getHelpContent(component);
    if (helpContent) {
      this.notifyObservers('show-help', { component, content: helpContent });
    }
  }

  /**
   * Enable smart defaults based on user behavior
   */
  enableSmartDefaults(): void {
    if (!this.userBehavior) return;

    const smartDefaults: Record<string, any> = {};

    // Auto-save preference based on save frequency
    const saveActions = this.userBehavior.actions.filter(a => a.type === 'save');
    if (saveActions.length > 10) {
      const avgTimeBetweenSaves = this.calculateAverageTimeBetween(saveActions);
      if (avgTimeBetweenSaves < 300000) { // Less than 5 minutes
        smartDefaults.autoSave = true;
      }
    }

    // Grid snapping based on precision needs
    const moveActions = this.userBehavior.actions.filter(a => a.type === 'move-component');
    const preciseMovements = moveActions.filter(a => 
      a.data.deltaX < 5 && a.data.deltaY < 5
    ).length;
    
    if (preciseMovements > moveActions.length * 0.7) {
      smartDefaults.gridSnapping = true;
    }

    // Apply smart defaults
    Object.entries(smartDefaults).forEach(([key, value]) => {
      this.updateUserPreference(key, value);
    });
  }

  private initializeMetrics(): UXMetrics {
    return {
      taskCompletionTime: 0,
      errorRate: 0,
      userSatisfactionScore: 0.5,
      featureUsageFrequency: {},
      sessionDuration: 0,
      interactionDepth: 0
    };
  }

  private initializeUserBehavior(): void {
    this.userBehavior = {
      userId: this.generateUserId(),
      sessionId: this.generateSessionId(),
      actions: [],
      preferences: this.getDefaultPreferences(),
      skillLevel: 'intermediate',
      workflowPatterns: []
    };
  }

  private setupBehaviorTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackAction({
          type: 'session-pause',
          data: { timestamp: Date.now() },
          success: true,
          context: {
            page: window.location.pathname,
            component: 'system',
            userIntent: 'pause'
          }
        });
      } else {
        this.trackAction({
          type: 'session-resume',
          data: { timestamp: Date.now() },
          success: true,
          context: {
            page: window.location.pathname,
            component: 'system',
            userIntent: 'resume'
          }
        });
      }
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackAction({
        type: 'error',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno
        },
        success: false,
        context: {
          page: window.location.pathname,
          component: 'system',
          userIntent: 'unknown'
        }
      });
    });
  }

  private updateMetrics(action: UserAction): void {
    // Update feature usage frequency
    if (this.metrics.featureUsageFrequency[action.type]) {
      this.metrics.featureUsageFrequency[action.type]++;
    } else {
      this.metrics.featureUsageFrequency[action.type] = 1;
    }

    // Update error rate
    if (!this.userBehavior) return;
    
    const recentActions = this.userBehavior.actions.slice(-100);
    const errors = recentActions.filter(a => !a.success).length;
    this.metrics.errorRate = errors / recentActions.length;

    // Update task completion time
    if (action.duration) {
      this.metrics.taskCompletionTime = 
        (this.metrics.taskCompletionTime + action.duration) / 2;
    }
  }

  private analyzeAndAdapt(action: UserAction): void {
    // Detect user skill level based on actions
    this.detectSkillLevel(action);

    // Look for workflow patterns
    this.detectWorkflowPatterns();

    // Adjust interface if needed
    if (this.shouldOptimize()) {
      this.optimizeInterface();
    }
  }

  private detectSkillLevel(action: UserAction): void {
    if (!this.userBehavior) return;

    const recentActions = this.userBehavior.actions.slice(-20);
    const successRate = recentActions.filter(a => a.success).length / recentActions.length;
    const advancedFeatureUsage = recentActions.filter(a => 
      ['group', 'ungroup', 'clone', 'batch-edit'].includes(a.type)
    ).length;

    if (successRate > 0.9 && advancedFeatureUsage > 5) {
      this.userBehavior.skillLevel = 'expert';
    } else if (successRate > 0.8 && advancedFeatureUsage > 2) {
      this.userBehavior.skillLevel = 'advanced';
    } else if (successRate > 0.6) {
      this.userBehavior.skillLevel = 'intermediate';
    } else {
      this.userBehavior.skillLevel = 'beginner';
    }
  }

  private detectWorkflowPatterns(): void {
    if (!this.userBehavior) return;

    const actions = this.userBehavior.actions.slice(-50);
    const patterns = this.findSequentialPatterns(actions);
    
    patterns.forEach(pattern => {
      const existingPattern = this.userBehavior!.workflowPatterns.find(p => p.name === pattern.name);
      if (existingPattern) {
        existingPattern.frequency++;
      } else {
        this.userBehavior!.workflowPatterns.push(pattern);
      }
    });
  }

  private findSequentialPatterns(actions: UserAction[]): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = [];
    const minPatternLength = 3;
    const maxPatternLength = 8;

    for (let length = minPatternLength; length <= maxPatternLength; length++) {
      for (let i = 0; i <= actions.length - length; i++) {
        const sequence = actions.slice(i, i + length);
        const patternName = sequence.map(a => a.type).join('-');
        
        if (this.isValidPattern(sequence)) {
          patterns.push({
            name: patternName,
            frequency: 1,
            steps: sequence.map(a => a.type),
            averageTime: this.calculateSequenceTime(sequence),
            successRate: sequence.every(a => a.success) ? 1 : 0
          });
        }
      }
    }

    return patterns;
  }

  private isValidPattern(sequence: UserAction[]): boolean {
    // Pattern should have meaningful progression
    const uniqueActions = new Set(sequence.map(a => a.type));
    return uniqueActions.size > 1 && uniqueActions.size < sequence.length;
  }

  private optimizeToolbar(patterns: WorkflowPattern[]): UXAdaptation | null {
    if (patterns.length === 0) return null;

    const mostFrequentActions = patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8)
      .flatMap(p => p.steps)
      .filter((action, index, arr) => arr.indexOf(action) === index);

    return {
      id: 'toolbar-optimization',
      type: 'layout',
      priority: 'medium',
      description: 'Optimize toolbar based on usage patterns',
      data: {
        prioritizedActions: mostFrequentActions
      }
    };
  }

  private optimizeAnimations(): UXAdaptation | null {
    if (!this.userBehavior) return null;

    const performanceScore = this.performanceMonitor.getCurrentFPS();
    const userPreference = this.userBehavior.preferences.animations;

    if (performanceScore < 30 && userPreference) {
      return {
        id: 'animation-optimization',
        type: 'performance',
        priority: 'high',
        description: 'Reduce animations for better performance',
        data: {
          reduceAnimations: true,
          animationDuration: 150
        }
      };
    }

    return null;
  }

  private optimizeLayout(): UXAdaptation | null {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (screenWidth < 1200) {
      return {
        id: 'layout-optimization',
        type: 'responsive',
        priority: 'medium',
        description: 'Optimize layout for smaller screens',
        data: {
          compactMode: true,
          collapsePanels: true
        }
      };
    }

    return null;
  }

  private shouldOptimize(): boolean {
    if (!this.userBehavior) return false;
    
    const actionCount = this.userBehavior.actions.length;
    return actionCount > 0 && actionCount % 50 === 0; // Optimize every 50 actions
  }

  private applyAdaptation(adaptation: UXAdaptation): void {
    this.notifyObservers('adaptation-applied', adaptation);
  }

  private getFrequentActions(actions: UserAction[]): string[] {
    const frequency: Record<string, number> = {};
    
    actions.forEach(action => {
      frequency[action.type] = (frequency[action.type] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action]) => action);
  }

  private calculateAverageCompletionTime(actions: UserAction[]): number {
    const durations = actions.filter(a => a.duration).map(a => a.duration!);
    return durations.length > 0 ? 
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }

  private calculateAverageTimeBetween(actions: UserAction[]): number {
    if (actions.length < 2) return 0;
    
    let totalTime = 0;
    for (let i = 1; i < actions.length; i++) {
      totalTime += actions[i].timestamp - actions[i - 1].timestamp;
    }
    
    return totalTime / (actions.length - 1);
  }

  private calculateSequenceTime(sequence: UserAction[]): number {
    if (sequence.length < 2) return 0;
    return sequence[sequence.length - 1].timestamp - sequence[0].timestamp;
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      shortcuts: true,
      animations: true,
      autoSave: false,
      gridSnapping: false,
      tooltips: true,
      advancedFeatures: false
    };
  }

  private loadUserPreferences(): void {
    const stored = localStorage.getItem('archicomm-user-preferences');
    if (stored && this.userBehavior) {
      this.userBehavior.preferences = { ...this.userBehavior.preferences, ...JSON.parse(stored) };
    }
  }

  private updateUserPreference(key: string, value: any): void {
    if (!this.userBehavior) return;
    
    this.userBehavior.preferences = { ...this.userBehavior.preferences, [key]: value };
    localStorage.setItem('archicomm-user-preferences', JSON.stringify(this.userBehavior.preferences));
  }

  private getShortcutForAction(action: string): string {
    const shortcuts: Record<string, string> = {
      'save': 'S',
      'copy': 'C',
      'paste': 'V',
      'delete': 'Del',
      'undo': 'Z'
    };
    return shortcuts[action] || '?';
  }

  private enableShortcuts(): void {
    this.updateUserPreference('shortcuts', true);
  }

  private enableAdvancedFeatures(): void {
    this.updateUserPreference('advancedFeatures', true);
  }

  private getHelpContent(component: string): string | null {
    const helpTexts: Record<string, string> = {
      'canvas': 'Double-click to add components. Drag to connect them.',
      'toolbar': 'Use these tools to enhance your architecture diagram.',
      'component-palette': 'Drag components from here onto the canvas.'
    };
    return helpTexts[component] || null;
  }

  private notifyObservers(event: string, data: any): void {
    this.observers.forEach(observer => observer(event, data));
  }

  addObserver(observer: UXObserver): void {
    this.observers.add(observer);
  }

  removeObserver(observer: UXObserver): void {
    this.observers.delete(observer);
  }

  analyzeWorkflowPatterns(): WorkflowPattern[] {
    return this.userBehavior?.workflowPatterns || [];
  }
}

export interface UXAdaptation {
  id: string;
  type: 'layout' | 'performance' | 'feature' | 'responsive';
  priority: 'low' | 'medium' | 'high';
  description: string;
  data: any;
}

export interface UXRecommendation {
  type: 'tutorial' | 'feature' | 'shortcut' | 'workflow';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: () => void;
}

export type UXObserver = (event: string, data: any) => void;

// React hook for UX optimization
import { useEffect, useCallback } from 'react';

export const useUXOptimizer = () => {
  const uxOptimizer = UXOptimizer.getInstance();

  const trackAction = useCallback((action: Omit<UserAction, 'timestamp'>) => {
    uxOptimizer.trackAction(action);
  }, [uxOptimizer]);

  const getRecommendations = useCallback(() => {
    return uxOptimizer.getRecommendations();
  }, [uxOptimizer]);

  const measureSatisfaction = useCallback(() => {
    return uxOptimizer.measureSatisfaction();
  }, [uxOptimizer]);

  useEffect(() => {
    // Enable smart defaults on component mount
    uxOptimizer.enableSmartDefaults();
  }, [uxOptimizer]);

  const getSuccessRate = useCallback(() => {
    return uxOptimizer.getSuccessRate();
  }, [uxOptimizer]);

  const getSkillLevel = useCallback(() => {
    return uxOptimizer.getSkillLevel();
  }, [uxOptimizer]);

  return {
    trackAction,
    getRecommendations,
    measureSatisfaction,
    getSuccessRate,
    getSkillLevel,
    optimizer: uxOptimizer
  };
};