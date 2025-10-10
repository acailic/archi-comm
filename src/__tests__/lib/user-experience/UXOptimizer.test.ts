import { describe, beforeEach, afterEach, expect, it, vi } from 'vitest';

import { UXOptimizer } from '@/lib/user-experience/UXOptimizer';

const resetOptimizer = () => {
  // @ts-expect-error - accessing private singleton for test isolation
  UXOptimizer.instance = undefined;
};

const createContext = () => ({
  page: 'canvas',
  component: 'toolbar',
  userIntent: 'test',
});

describe('UXOptimizer', () => {
  beforeEach(() => {
    resetOptimizer();
  });

  afterEach(() => {
    resetOptimizer();
  });

  it('recommends tutorials when recent error rate is high', () => {
    const optimizer = UXOptimizer.getInstance();

    for (let i = 0; i < 5; i += 1) {
      optimizer.trackAction({
        type: 'component-add',
        data: {},
        success: false,
        duration: 1200,
        context: createContext(),
      });
    }

    const recommendations = optimizer.getRecommendations();
    const tutorialRecommendation = recommendations.find(rec => rec.type === 'tutorial');

    expect(tutorialRecommendation).toBeDefined();
    expect(tutorialRecommendation?.priority).toBe('high');
  });

  it('suggests advanced features for expert users with advanced mode disabled', () => {
    const optimizer = UXOptimizer.getInstance();

    optimizer.trackAction({
      type: 'initial-action',
      data: {},
      success: true,
      duration: 500,
      context: createContext(),
    });

    const optimizerAny = optimizer as any;
    const behavior = optimizerAny.userBehavior!;
    behavior.skillLevel = 'expert';
    behavior.preferences.advancedFeatures = false;

    const recommendations = optimizer.getRecommendations();
    const advancedModeRecommendation = recommendations.find(rec => rec.title.includes('advanced features'));

    expect(advancedModeRecommendation).toBeDefined();
    expect(advancedModeRecommendation?.type).toBe('feature');
  });

  it('persists preference updates to localStorage with guards', () => {
    const storageProto = Object.getPrototypeOf(window.localStorage);
    const setItemSpy = vi.spyOn(storageProto, 'setItem');
    const optimizer = UXOptimizer.getInstance();

    optimizer.trackAction({
      type: 'seed',
      data: {},
      success: true,
      duration: 200,
      context: createContext(),
    });

    // Trigger shortcut recommendation path to flip preference
    const optimizerAny = optimizer as any;
    optimizerAny.updateUserPreference('shortcuts', false);

    expect(setItemSpy).toHaveBeenCalledWith(
      'archicomm-user-preferences',
      expect.stringContaining('shortcuts'),
    );

    setItemSpy.mockRestore();
  });
});
