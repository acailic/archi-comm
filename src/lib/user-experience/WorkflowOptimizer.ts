

export interface WorkflowAction {
  type: string;
  timestamp: number;
  duration: number;
  context: string;
  metadata?: Record<string, any>;
  success: boolean;
  userId?: string;
  sessionId: string;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  actions: string[];
  frequency: number;
  averageDuration: number;
  successRate: number;
  commonVariations: string[][];
  contexts: string[];
  lastSeen: number;
  confidence: number;
  category: 'design' | 'annotation' | 'review' | 'export' | 'navigation' | 'collaboration';
}

export interface WorkflowOptimization {
  patternId: string;
  type: 'shortcut' | 'automation' | 'reorder' | 'merge' | 'split' | 'skip';
  title: string;
  description: string;
  estimatedTimeSaving: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  implementation: string[];
  prerequisites?: string[];
  confidence: number;
  category: WorkflowPattern['category'];
}

export type WorkflowRecommendationType =
  | 'workflow_optimization'
  | 'help_suggestion'
  | 'workflow_improvement';

export interface WorkflowRecommendation {
  type: WorkflowRecommendationType;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionText?: string;
  duration: 'persistent' | 'transient';
  metadata: Record<string, unknown>;
}

export interface WorkflowEfficiencyMetrics {
  patternId: string;
  averageCompletionTime: number;
  successRate: number;
  abandonmentRate: number;
  retryRate: number;
  userSatisfactionScore: number;
  bottleneckSteps: string[];
  optimizationOpportunities: number;
}

export interface UserStrugglePoint {
  action: string;
  context: string;
  frequency: number;
  averageAttempts: number;
  commonFailureReasons: string[];
  suggestedImprovements: string[];
  priority: 'high' | 'medium' | 'low';
}

export class WorkflowOptimizer {
  private static instance: WorkflowOptimizer | null = null;

  private actionHistory: WorkflowAction[] = [];
  private detectedPatterns: Map<string, WorkflowPattern> = new Map();
  private optimizations: WorkflowOptimization[] = [];
  private efficiencyMetrics: Map<string, WorkflowEfficiencyMetrics> = new Map();
  private userStrugglePoints: Map<string, UserStrugglePoint> = new Map();
  private intervals: Array<ReturnType<typeof setInterval>> = [];
  private patternDetectionInterval: ReturnType<typeof setInterval> | null = null;

  private readonly maxHistorySize = 5000;
  private readonly patternDetectionWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly minPatternFrequency = 3;

  private sessionId: string = this.generateSessionId();
  private currentSequence: WorkflowAction[] = [];
  private sequenceTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.loadStoredData();
    this.startPatternDetection();
  }

  public static getInstance(): WorkflowOptimizer {
    if (!WorkflowOptimizer.instance) {
      WorkflowOptimizer.instance = new WorkflowOptimizer();
    }
    return WorkflowOptimizer.instance;
  }

  public static getExistingInstance(): WorkflowOptimizer | null {
    return WorkflowOptimizer.instance;
  }

  public dispose(): void {
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals = [];

    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }

    this.patternDetectionInterval = null;
  }

  private registerInterval(intervalId: ReturnType<typeof setInterval>): ReturnType<typeof setInterval> {
    this.intervals.push(intervalId);
    return intervalId;
  }

  // Action tracking
  public trackAction(
    type: string,
    duration: number = 0,
    success: boolean = true,
    context: string = '',
    metadata?: Record<string, any>
  ): void {
    const action: WorkflowAction = {
      type,
      timestamp: Date.now(),
      duration,
      context,
      metadata,
      success,
      sessionId: this.sessionId,
    };

    this.actionHistory.push(action);
    this.currentSequence.push(action);

    // Trim history if too large
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
    }

    // Track struggle points
    if (!success) {
      this.trackStrugglePoint(type, context);
    }

    // Reset sequence timeout
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }

    // End sequence after 5 minutes of inactivity
    this.sequenceTimeout = setTimeout(
      () => {
        this.processSequence();
      },
      5 * 60 * 1000
    );

    // Trigger immediate analysis for certain action types
    if (this.isCompletionAction(type)) {
      this.processSequence();
    }

    // Save data periodically
    if (this.actionHistory.length % 50 === 0) {
      this.saveData();
    }
  }

  // Pattern detection and analysis
  public analyzeWorkflow(actions: WorkflowAction[]): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = [];
    const sequences = this.extractSequences(actions);

    // Group similar sequences
    const sequenceGroups = this.groupSimilarSequences(sequences);

    sequenceGroups.forEach((group, index) => {
      if (group.length >= this.minPatternFrequency) {
        const pattern = this.createPatternFromSequences(group, `pattern_${index}`);
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  public getOptimizationSuggestions(patternId?: string): WorkflowOptimization[] {
    if (patternId) {
      return this.optimizations.filter(opt => opt.patternId === patternId);
    }

    return [...this.optimizations].sort((a, b) => {
      // Sort by estimated time saving and confidence
      const scoreA = a.estimatedTimeSaving * a.confidence;
      const scoreB = b.estimatedTimeSaving * b.confidence;
      return scoreB - scoreA;
    });
  }

  public generateRecommendations(): WorkflowRecommendation[] {
    const recommendations: WorkflowRecommendation[] = [];

    // Workflow optimization recommendations
    const topOptimizations = this.getOptimizationSuggestions().slice(0, 5);
    topOptimizations.forEach(opt => {
      recommendations.push({
        type: 'workflow_optimization',
        priority: opt.estimatedTimeSaving > 10000 ? 'high' : 'medium',
        title: opt.title,
        description: opt.description,
        actionText: 'Optimize Workflow',
        duration: 'persistent',
        metadata: {
          optimizationType: opt.type,
          category: opt.category,
          timeSaving: opt.estimatedTimeSaving,
          implementation: opt.implementation,
        },
      });
    });

    // Struggle point recommendations
    const topStrugglePoints = Array.from(this.userStrugglePoints.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    topStrugglePoints.forEach(struggle => {
      recommendations.push({
        type: 'help_suggestion',
        priority: struggle.priority,
        title: `Help with ${struggle.action}`,
        description: `You've had ${struggle.frequency} difficulties with this action. Here are some tips.`,
        actionText: 'Get Help',
        duration: 'persistent',
        metadata: {
          action: struggle.action,
          context: struggle.context,
          improvements: struggle.suggestedImprovements,
        },
      });
    });

    // Efficiency improvement recommendations
    const inefficientPatterns = Array.from(this.detectedPatterns.values())
      .filter(pattern => pattern.successRate < 0.8 || pattern.averageDuration > 30000)
      .slice(0, 3);

    inefficientPatterns.forEach(pattern => {
      recommendations.push({
        type: 'workflow_improvement',
        priority: 'medium',
        title: `Improve "${pattern.name}" efficiency`,
        description: `This workflow could be optimized for better performance.`,
        actionText: 'View Suggestions',
        duration: 'persistent',
        metadata: {
          patternId: pattern.id,
          currentEfficiency: pattern.successRate,
          averageDuration: pattern.averageDuration,
        },
      });
    });

    return recommendations;
  }

  // Metrics and analytics
  public getWorkflowEfficiencyMetrics(patternId?: string): WorkflowEfficiencyMetrics[] {
    if (patternId) {
      const metrics = this.efficiencyMetrics.get(patternId);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.efficiencyMetrics.values());
  }

  public getUserStrugglePoints(): UserStrugglePoint[] {
    return Array.from(this.userStrugglePoints.values()).sort((a, b) => b.frequency - a.frequency);
  }

  public getWorkflowPatterns(category?: WorkflowPattern['category']): WorkflowPattern[] {
    const patterns = Array.from(this.detectedPatterns.values());

    if (category) {
      return patterns.filter(p => p.category === category);
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  public getWorkflowInsights(): {
    totalWorkflows: number;
    averageEfficiency: number;
    topBottlenecks: string[];
    improvementOpportunities: number;
    timeSavingPotential: number;
  } {
    const patterns = Array.from(this.detectedPatterns.values());
    const optimizations = this.getOptimizationSuggestions();

    const totalWorkflows = patterns.length;
    const averageEfficiency =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length
        : 1;

    const bottleneckMap = new Map<string, number>();
    Array.from(this.efficiencyMetrics.values()).forEach(metrics => {
      metrics.bottleneckSteps.forEach(step => {
        bottleneckMap.set(step, (bottleneckMap.get(step) || 0) + 1);
      });
    });

    const topBottlenecks = Array.from(bottleneckMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([step]) => step);

    const timeSavingPotential = optimizations.reduce(
      (sum, opt) => sum + opt.estimatedTimeSaving,
      0
    );

    return {
      totalWorkflows,
      averageEfficiency,
      topBottlenecks,
      improvementOpportunities: optimizations.length,
      timeSavingPotential,
    };
  }

  // Private implementation methods
  private processSequence(): void {
    if (this.currentSequence.length < 2) {
      this.currentSequence = [];
      return;
    }

    // Detect patterns in the current sequence
    const patterns = this.analyzeWorkflow(this.currentSequence);
    patterns.forEach(pattern => {
      this.updateOrCreatePattern(pattern);
    });

    // Generate optimizations for detected patterns
    patterns.forEach(pattern => {
      const optimizations = this.generateOptimizationsForPattern(pattern);
      optimizations.forEach(opt => {
        if (
          !this.optimizations.find(
            existing => existing.patternId === opt.patternId && existing.type === opt.type
          )
        ) {
          this.optimizations.push(opt);
        }
      });
    });

    // Calculate efficiency metrics
    patterns.forEach(pattern => {
      const metrics = this.calculateEfficiencyMetrics(pattern);
      this.efficiencyMetrics.set(pattern.id, metrics);
    });

    // Clear current sequence
    this.currentSequence = [];

    // Save data
    this.saveData();

  }

  private extractSequences(actions: WorkflowAction[]): WorkflowAction[][] {
    const sequences: WorkflowAction[][] = [];
    let currentSequence: WorkflowAction[] = [];
    let lastTimestamp = 0;

    actions.forEach(action => {
      // Start new sequence if there's a gap > 5 minutes
      if (lastTimestamp > 0 && action.timestamp - lastTimestamp > 5 * 60 * 1000) {
        if (currentSequence.length >= 2) {
          sequences.push([...currentSequence]);
        }
        currentSequence = [];
      }

      currentSequence.push(action);
      lastTimestamp = action.timestamp;
    });

    // Add final sequence
    if (currentSequence.length >= 2) {
      sequences.push(currentSequence);
    }

    return sequences;
  }

  private groupSimilarSequences(sequences: WorkflowAction[][]): WorkflowAction[][][] {
    const groups: WorkflowAction[][][] = [];

    sequences.forEach(sequence => {
      const sequenceSignature = sequence.map(a => a.type).join('->');

      // Find existing group with similar signature
      let foundGroup = false;
      for (const group of groups) {
        const groupSignature = group[0].map(a => a.type).join('->');

        if (this.calculateSequenceSimilarity(sequenceSignature, groupSignature) > 0.8) {
          group.push(sequence);
          foundGroup = true;
          break;
        }
      }

      // Create new group if no similar one found
      if (!foundGroup) {
        groups.push([sequence]);
      }
    });

    return groups;
  }

  private calculateSequenceSimilarity(seq1: string, seq2: string): number {
    const actions1 = seq1.split('->');
    const actions2 = seq2.split('->');

    const longer = actions1.length > actions2.length ? actions1 : actions2;
    const shorter = actions1.length > actions2.length ? actions2 : actions1;

    if (longer.length === 0) return 1.0;

    let matches = 0;
    shorter.forEach((action, index) => {
      if (longer[index] === action) matches++;
    });

    return matches / longer.length;
  }

  private createPatternFromSequences(
    sequences: WorkflowAction[][],
    patternId: string
  ): WorkflowPattern {
    const firstSequence = sequences[0];
    const actions = firstSequence.map(a => a.type);

    const totalDuration = sequences.reduce(
      (sum, seq) => sum + seq.reduce((seqSum, action) => seqSum + action.duration, 0),
      0
    );

    const successfulSequences = sequences.filter(seq => seq.every(action => action.success));

    const contexts = [...new Set(sequences.flatMap(seq => seq.map(a => a.context).filter(c => c)))];

    const variations = sequences
      .map(seq => seq.map(a => a.type))
      .filter(variation => !this.arraysEqual(variation, actions));

    return {
      id: patternId,
      name: this.generatePatternName(actions),
      actions,
      frequency: sequences.length,
      averageDuration: totalDuration / sequences.length,
      successRate: successfulSequences.length / sequences.length,
      commonVariations: variations,
      contexts,
      lastSeen: Date.now(),
      confidence: Math.min(sequences.length / 10, 1.0), // Max confidence at 10+ occurrences
      category: this.categorizePattern(actions, contexts),
    };
  }

  private generateOptimizationsForPattern(pattern: WorkflowPattern): WorkflowOptimization[] {
    const optimizations: WorkflowOptimization[] = [];

    // Shortcut opportunities
    if (pattern.frequency >= 5 && pattern.averageDuration > 5000) {
      optimizations.push({
        patternId: pattern.id,
        type: 'shortcut',
        title: `Add keyboard shortcut for "${pattern.name}"`,
        description: `This workflow is performed ${pattern.frequency} times. A keyboard shortcut could save time.`,
        estimatedTimeSaving: pattern.averageDuration * 0.6 * pattern.frequency,
        difficultyLevel: 'medium',
        implementation: ['Create custom keyboard shortcut', 'Train users on new shortcut'],
        confidence: pattern.confidence,
        category: pattern.category,
      });
    }

    // Automation opportunities
    if (pattern.actions.length >= 4 && pattern.frequency >= 10) {
      optimizations.push({
        patternId: pattern.id,
        type: 'automation',
        title: `Automate "${pattern.name}" workflow`,
        description: `This ${pattern.actions.length}-step workflow could be automated to save time.`,
        estimatedTimeSaving: pattern.averageDuration * 0.8 * pattern.frequency,
        difficultyLevel: 'hard',
        implementation: ['Develop automation script', 'Add automation trigger button'],
        confidence: pattern.confidence * 0.8, // Lower confidence for automation
        category: pattern.category,
      });
    }

    // Reorder optimization
    if (pattern.successRate < 0.9 && pattern.commonVariations.length > 0) {
      optimizations.push({
        patternId: pattern.id,
        type: 'reorder',
        title: `Optimize step order for "${pattern.name}"`,
        description: `Reordering steps could improve success rate from ${Math.round(pattern.successRate * 100)}%.`,
        estimatedTimeSaving: pattern.averageDuration * 0.2 * pattern.frequency,
        difficultyLevel: 'easy',
        implementation: ['Analyze successful variations', 'Update UI flow'],
        confidence: pattern.confidence,
        category: pattern.category,
      });
    }

    return optimizations;
  }

  private calculateEfficiencyMetrics(pattern: WorkflowPattern): WorkflowEfficiencyMetrics {
    const relevantActions = this.actionHistory.filter(
      action =>
        pattern.actions.includes(action.type) &&
        action.timestamp > Date.now() - this.patternDetectionWindow
    );

    if (relevantActions.length === 0) {
      return {
        patternId: pattern.id,
        averageCompletionTime: pattern.averageDuration,
        successRate: pattern.successRate,
        abandonmentRate: 1 - pattern.successRate,
        retryRate: 0,
        userSatisfactionScore: Math.max(0.1, pattern.successRate - 0.1),
        bottleneckSteps: [],
        optimizationOpportunities: 0,
      };
    }

    const completions = this.extractSequences(relevantActions).filter(seq => 
      seq.length >= pattern.actions.length &&
      pattern.actions.every(action => seq.some(seqAction => seqAction.type === action))
    );

    const averageCompletionTime =
      completions.length > 0
        ? completions.reduce(
            (sum, seq) => sum + seq.reduce((seqSum, a) => seqSum + a.duration, 0),
            0
          ) / completions.length
        : pattern.averageDuration;

    const successfulCompletions = completions.filter(seq => seq.every(a => a.success));
    const successRate =
      completions.length > 0
        ? successfulCompletions.length / completions.length
        : pattern.successRate;

    // Calculate bottleneck steps (steps with highest failure rate)
    const stepFailures = new Map<string, number>();
    const stepAttempts = new Map<string, number>();

    relevantActions.forEach(action => {
      stepAttempts.set(action.type, (stepAttempts.get(action.type) || 0) + 1);
      if (!action.success) {
        stepFailures.set(action.type, (stepFailures.get(action.type) || 0) + 1);
      }
    });

    const bottleneckSteps = Array.from(stepFailures.entries())
      .map(([step, failures]) => ({
        step,
        failureRate: failures / (stepAttempts.get(step) || 1),
      }))
      .filter(({ failureRate }) => failureRate > 0.2)
      .sort((a, b) => b.failureRate - a.failureRate)
      .map(({ step }) => step);

    return {
      patternId: pattern.id,
      averageCompletionTime,
      successRate,
      abandonmentRate: 1 - successRate,
      retryRate: this.calculateRetryRate(pattern.actions),
      userSatisfactionScore: Math.max(0.1, successRate - 0.1), // Rough estimation
      bottleneckSteps,
      optimizationOpportunities: this.getOptimizationSuggestions(pattern.id).length,
    };
  }

  private trackStrugglePoint(action: string, context: string): void {
    const key = `${action}_${context}`;
    let struggle = this.userStrugglePoints.get(key);

    if (!struggle) {
      struggle = {
        action,
        context,
        frequency: 0,
        averageAttempts: 1,
        commonFailureReasons: [],
        suggestedImprovements: [],
        priority: 'low',
      };
    }

    struggle.frequency++;

    // Update priority based on frequency
    if (struggle.frequency >= 10) {
      struggle.priority = 'high';
    } else if (struggle.frequency >= 5) {
      struggle.priority = 'medium';
    }

    // Generate contextual improvements
    struggle.suggestedImprovements = this.generateImprovementSuggestions(action, context);

    this.userStrugglePoints.set(key, struggle);
  }

  private generateImprovementSuggestions(action: string, context: string): string[] {
    const suggestions: string[] = [];

    // Context-aware suggestions
    if (context.includes('canvas')) {
      suggestions.push('Try using the grid snap feature for precise positioning');
      suggestions.push('Use keyboard shortcuts for faster canvas navigation');
    }

    if (context.includes('annotation')) {
      suggestions.push('Use annotation presets for consistent styling');
      suggestions.push('Try the quick annotation toolbar for faster access');
    }

    if (action.includes('selection') || action.includes('select')) {
      suggestions.push('Try click and drag selection for multiple items');
      suggestions.push('Use Ctrl+A to select all items');
    }

    // Generic suggestions
    suggestions.push('Check the help documentation for detailed guidance');
    suggestions.push('Consider using keyboard shortcuts for efficiency');

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  private updateOrCreatePattern(newPattern: WorkflowPattern): void {
    const existingPattern = this.detectedPatterns.get(newPattern.id);

    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency += newPattern.frequency;
      existingPattern.averageDuration =
        (existingPattern.averageDuration + newPattern.averageDuration) / 2;
      existingPattern.successRate = (existingPattern.successRate + newPattern.successRate) / 2;
      existingPattern.lastSeen = newPattern.lastSeen;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1.0);

      // Merge variations and contexts
      existingPattern.commonVariations = [
        ...existingPattern.commonVariations,
        ...newPattern.commonVariations,
      ].slice(0, 10); // Keep top 10 variations

      existingPattern.contexts = [
        ...new Set([...existingPattern.contexts, ...newPattern.contexts]),
      ];
    } else {
      // Create new pattern
      this.detectedPatterns.set(newPattern.id, newPattern);
    }
  }

  private calculateRetryRate(actions: string[]): number {
    const recentActions = this.actionHistory
      .filter(a => a.timestamp > Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      .filter(a => actions.includes(a.type));

    if (recentActions.length === 0) return 0;

    const retries = recentActions.filter((action, index) => {
      const nextAction = recentActions[index + 1];
      return nextAction && nextAction.type === action.type && !action.success;
    });

    return retries.length / recentActions.length;
  }

  // Utility methods
  private isCompletionAction(actionType: string): boolean {
    const completionActions = ['save', 'export', 'publish', 'submit', 'complete', 'finish'];
    return completionActions.some(completion => actionType.toLowerCase().includes(completion));
  }

  private generatePatternName(actions: string[]): string {
    if (actions.length <= 3) {
      return actions.join(' → ');
    }
    return `${actions[0]} → ... → ${actions[actions.length - 1]} (${actions.length} steps)`;
  }

  private categorizePattern(actions: string[], contexts: string[]): WorkflowPattern['category'] {
    const actionStr = actions.join(' ').toLowerCase();
    const contextStr = contexts.join(' ').toLowerCase();

    if (
      actionStr.includes('design') ||
      actionStr.includes('draw') ||
      actionStr.includes('create')
    ) {
      return 'design';
    }
    if (
      actionStr.includes('annotate') ||
      actionStr.includes('comment') ||
      actionStr.includes('note')
    ) {
      return 'annotation';
    }
    if (
      actionStr.includes('review') ||
      actionStr.includes('approve') ||
      actionStr.includes('feedback')
    ) {
      return 'review';
    }
    if (
      actionStr.includes('export') ||
      actionStr.includes('save') ||
      actionStr.includes('publish')
    ) {
      return 'export';
    }
    if (actionStr.includes('navigate') || actionStr.includes('zoom') || actionStr.includes('pan')) {
      return 'navigation';
    }
    if (
      contextStr.includes('collaboration') ||
      actionStr.includes('share') ||
      actionStr.includes('invite')
    ) {
      return 'collaboration';
    }

    return 'design'; // Default category
  }

  private arraysEqual(arr1: any[], arr2: any[]): boolean {
    return arr1.length === arr2.length && arr1.every((val, index) => val === arr2[index]);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPatternDetection(): void {
    if (this.patternDetectionInterval) {
      return;
    }

    const intervalId = this.registerInterval(
      setInterval(() => {
        if (this.actionHistory.length >= 10) {
          const patterns = this.analyzeWorkflow(this.actionHistory);
          patterns.forEach(pattern => this.updateOrCreatePattern(pattern));
        }
      }, 5 * 60 * 1000)
    );

    this.patternDetectionInterval = intervalId;
  }

  private loadStoredData(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedActions = window.localStorage.getItem('archicomm_workflow_actions');
      if (storedActions) {
        this.actionHistory = JSON.parse(storedActions);
      }

      const storedPatterns = window.localStorage.getItem('archicomm_workflow_patterns');
      if (storedPatterns) {
        const patterns = JSON.parse(storedPatterns);
        this.detectedPatterns = new Map(patterns);
      }

      const storedOptimizations = window.localStorage.getItem('archicomm_workflow_optimizations');
      if (storedOptimizations) {
        this.optimizations = JSON.parse(storedOptimizations);
      }

      const storedStruggles = window.localStorage.getItem('archicomm_workflow_struggles');
      if (storedStruggles) {
        const struggles = JSON.parse(storedStruggles);
        this.userStrugglePoints = new Map(struggles);
      }
    } catch (error) {
      console.error('Failed to load workflow data:', error);
    }
  }

  private saveData(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem('archicomm_workflow_actions', JSON.stringify(this.actionHistory));
      window.localStorage.setItem(
        'archicomm_workflow_patterns',
        JSON.stringify(Array.from(this.detectedPatterns.entries()))
      );
      window.localStorage.setItem('archicomm_workflow_optimizations', JSON.stringify(this.optimizations));
      window.localStorage.setItem(
        'archicomm_workflow_struggles',
        JSON.stringify(Array.from(this.userStrugglePoints.entries()))
      );
    } catch (error) {
      console.error('Failed to save workflow data:', error);
    }
  }
}

export default WorkflowOptimizer;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    WorkflowOptimizer.getExistingInstance()?.dispose();
  });
}
