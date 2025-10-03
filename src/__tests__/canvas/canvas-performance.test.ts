import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { resetTestStores } from '../../test/react-testing-utils';
import {
  generateComponents,
  generateConnections,
  measureTime,
  expectWithinBudget,
} from './test-helpers';
import type { DesignComponent, Connection } from '../../shared/contracts';

const PERFORMANCE_BUDGETS = {
  components_100: 50,
  components_200: 100,
  components_500: 250,
  selector: 10,
  update: 30,
  connections_200: 50,
};

describe('Canvas Performance Benchmarks', () => {
  beforeEach(() => {
    resetTestStores();
    vi.clearAllMocks();
  });

  describe('Large Dataset Initialization', () => {
    const cases = [
      { count: 100, budget: PERFORMANCE_BUDGETS.components_100 },
      { count: 200, budget: PERFORMANCE_BUDGETS.components_200 },
      { count: 500, budget: PERFORMANCE_BUDGETS.components_500 },
    ];

    test.each(cases)('should set $count components within budget', ({ count, budget }) => {
      const components = generateComponents(count);
      const duration = measureTime(() => {
        act(() => {
          useCanvasStore.getState().setComponents(components);
        });
      });

      expectWithinBudget(duration, budget, `${count} components initialization`);
      expect(useCanvasStore.getState().components).toHaveLength(count);
    });
  });

  describe('Bulk Updates', () => {
    const updateCases = [
      { count: 100, budget: PERFORMANCE_BUDGETS.update },
      { count: 200, budget: PERFORMANCE_BUDGETS.update * 2 },
    ];

    test.each(updateCases)('should update $count components within budget', ({ count, budget }) => {
      const components = generateComponents(count);
      act(() => {
        useCanvasStore.getState().setComponents(components);
      });

      const duration = measureTime(() => {
        act(() => {
          useCanvasStore.getState().updateComponents((current: DesignComponent[]) =>
            current.map((component, index) =>
              index === 0 ? { ...component, x: component.x + 10 } : component,
            ),
          );
        });
      });

      expectWithinBudget(duration, budget, `${count} components update`);
      expect(useCanvasStore.getState().components[0].x).toBe(components[0].x + 10);
    });
  });

  describe('Connection Throughput', () => {
    it('should add 200 connections within budget', () => {
      const components = generateComponents(200);
      const connections = generateConnections(components, 200);
      act(() => {
        useCanvasStore.getState().setComponents(components);
      });

      const duration = measureTime(() => {
        act(() => {
          useCanvasStore.getState().setConnections(connections);
        });
      });

      expectWithinBudget(duration, PERFORMANCE_BUDGETS.connections_200, '200 connections');
      expect(useCanvasStore.getState().connections).toHaveLength(200);
    });
  });

  describe('Selectors', () => {
    it('should read store slices within budget', () => {
      const components = generateComponents(150);
      act(() => {
        useCanvasStore.getState().setComponents(components);
      });

      const duration = measureTime(() => {
        const servers = useCanvasStore.getState().components.filter((component) => component.type === 'server');
        expect(servers.length).toBeGreaterThanOrEqual(0);
      });

      expectWithinBudget(duration, PERFORMANCE_BUDGETS.selector, 'component selector');
    });
  });
});
