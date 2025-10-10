import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowOptimizer } from '@/lib/user-experience/WorkflowOptimizer';

const resetWorkflowOptimizer = () => {
  // @ts-expect-error accessing singleton for test isolation
  WorkflowOptimizer.instance = null;
};

describe('WorkflowOptimizer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetWorkflowOptimizer();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetWorkflowOptimizer();
  });

  it('returns rich workflow recommendations with metadata', () => {
    const optimizer = WorkflowOptimizer.getInstance();
    const optimizerAny = optimizer as any;

    optimizerAny.optimizations = [
      {
        patternId: 'pattern-1',
        type: 'shortcut',
        title: 'Add shortcut for deployment',
        description: 'Reduce deployment workflow time.',
        estimatedTimeSaving: 15000,
        difficultyLevel: 'easy',
        implementation: ['Define shortcut', 'Document usage'],
        confidence: 0.8,
        category: 'design',
      },
    ];

    optimizerAny.userStrugglePoints = new Map([
      [
        'struggle-1',
        {
          action: 'connect-components',
          context: 'canvas',
          frequency: 4,
          averageAttempts: 2,
          commonFailureReasons: ['confusing UI'],
          suggestedImprovements: ['Show tutorial'],
          priority: 'high',
        },
      ],
    ]);

    optimizerAny.detectedPatterns = new Map([
      [
        'pattern-1',
        {
          id: 'pattern-1',
          name: 'Lengthy review',
          actions: ['review-start', 'review-complete'],
          frequency: 6,
          averageDuration: 40000,
          successRate: 0.6,
          commonVariations: [],
          contexts: ['review'],
          lastSeen: Date.now(),
          confidence: 0.7,
          category: 'review',
        },
      ],
    ]);

    const recommendations = optimizer.generateRecommendations();

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map(rec => rec.type)).toEqual(
      expect.arrayContaining([
        'workflow_optimization',
        'help_suggestion',
        'workflow_improvement',
      ]),
    );

    const optimizationRec = recommendations.find(rec => rec.type === 'workflow_optimization');
    expect(optimizationRec?.metadata.optimizationType).toBe('shortcut');
  });

  it('manages interval lifecycle via dispose', () => {
    const optimizer = WorkflowOptimizer.getInstance();
    const optimizerAny = optimizer as any;

    expect(optimizerAny.intervals.length).toBeGreaterThan(0);

    optimizer.dispose();

    expect(optimizerAny.intervals.length).toBe(0);
    expect(optimizerAny.patternDetectionInterval).toBeNull();
  });

  it('avoids scheduling duplicate pattern detection intervals', () => {
    const optimizer = WorkflowOptimizer.getInstance();
    const optimizerAny = optimizer as any;

    optimizerAny.intervals = [];
    optimizerAny.patternDetectionInterval = null;

    optimizerAny.startPatternDetection();
    expect(optimizerAny.intervals.length).toBe(1);

    optimizerAny.startPatternDetection();
    expect(optimizerAny.intervals.length).toBe(1);
  });
});
