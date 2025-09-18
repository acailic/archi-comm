// Test suite for update depth prevention system
// Tests monitoring, guards, recovery, and edge cases for maximum update depth issues
// RELEVANT FILES: UpdateDepthMonitor.ts, StateUpdateGuard.ts, EmergencyRecovery.ts

import React, { useState, useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { UpdateDepthMonitor } from '../../lib/performance/UpdateDepthMonitor';
import { wrapSetStateWithGuard, createEmergencyBreaker } from '../../lib/performance/StateUpdateGuard';
import { EmergencyRecovery, useEmergencyRecovery } from '../../lib/performance/EmergencyRecovery';
import { ComponentLifecycleTracker } from '../../lib/performance/ComponentLifecycleTracker';

describe('Update Depth Prevention System', () => {
  let monitor: UpdateDepthMonitor;
  let recovery: EmergencyRecovery;
  let tracker: ComponentLifecycleTracker;

  beforeEach(() => {
    monitor = UpdateDepthMonitor.getInstance();
    recovery = EmergencyRecovery.getInstance();
    tracker = ComponentLifecycleTracker.getInstance();

    // Reset all systems
    monitor.reset();
    recovery.reset();
    tracker.reset();

    // Configure monitor for testing
    monitor.configure({
      maxUpdatesPerComponent: 5,
      maxUpdatesPerSecond: 10,
      timeWindowMs: 1000,
      enableStackTraces: true,
      enableAutoRecovery: true,
    });
  });

  afterEach(() => {
    monitor.reset();
    recovery.reset();
    tracker.reset();
  });

  describe('UpdateDepthMonitor', () => {
    test('should allow normal update patterns', () => {
      const result1 = monitor.recordUpdate('TestComponent');
      const result2 = monitor.recordUpdate('TestComponent');
      const result3 = monitor.recordUpdate('TestComponent');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    test('should detect update depth exceeded', () => {
      // Exceed the component threshold
      for (let i = 0; i < 6; i++) {
        monitor.recordUpdate('TestComponent');
      }

      const result = monitor.recordUpdate('TestComponent');
      expect(result).toBe(false);
    });

    test('should activate emergency mode on threshold exceeded', () => {
      expect(monitor.isEmergencyMode()).toBe(false);

      // Trigger emergency mode
      for (let i = 0; i < 12; i++) {
        monitor.recordUpdate('TestComponent');
      }

      expect(monitor.isEmergencyMode()).toBe(true);
    });

    test('should track component-specific statistics', () => {
      monitor.recordUpdate('Component1', 'props1');
      monitor.recordUpdate('Component1', 'props2');
      monitor.recordUpdate('Component2', 'props1');

      const stats1 = monitor.getComponentStats('Component1');
      const stats2 = monitor.getComponentStats('Component2');

      expect(stats1).toHaveLength(2);
      expect(stats2).toHaveLength(1);
    });
  });

  describe('StateUpdateGuard', () => {
    test('should allow normal state updates', () => {
      let value = 'initial';
      const setValue = jest.fn((newValue: string) => {
        value = newValue;
      });

      const guardedSetter = wrapSetStateWithGuard(setValue, {
        componentName: 'TestComponent',
        stateName: 'testState',
        enableDeduplication: true,
        enableThrottling: false,
      });

      const result = guardedSetter('updated');

      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(setValue).toHaveBeenCalledWith('updated');
    });

    test('should deduplicate identical updates', () => {
      let value = 'initial';
      const setValue = jest.fn((newValue: string) => {
        value = newValue;
      });

      const guardedSetter = wrapSetStateWithGuard(setValue, {
        componentName: 'TestComponent',
        stateName: 'testState',
        enableDeduplication: true,
        enableThrottling: false,
      });

      const result1 = guardedSetter('same');
      const result2 = guardedSetter('same'); // Should be deduplicated

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.reason).toContain('Duplicate');
      expect(setValue).toHaveBeenCalledTimes(1);
    });

    test('should throttle rapid updates', async () => {
      let value = 0;
      const setValue = jest.fn((newValue: number) => {
        value = newValue;
      });

      const guardedSetter = wrapSetStateWithGuard(setValue, {
        componentName: 'TestComponent',
        stateName: 'counter',
        enableThrottling: true,
        maxUpdatesPerSecond: 2,
      });

      // Fire rapid updates
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(guardedSetter(i));
      }

      // Some should be throttled
      const throttledResults = results.filter(r => r.reason?.includes('throttled'));
      expect(throttledResults.length).toBeGreaterThan(0);

      // Wait for throttled updates to complete
      await waitFor(() => {
        expect(setValue).toHaveBeenCalledTimes(5);
      }, { timeout: 2000 });
    });

    test('should block updates during emergency mode', () => {
      // Activate emergency mode
      monitor.configure({ maxUpdatesPerComponent: 1 });
      monitor.recordUpdate('TestComponent');
      monitor.recordUpdate('TestComponent'); // Should trigger emergency

      const setValue = jest.fn();
      const guardedSetter = wrapSetStateWithGuard(setValue, {
        componentName: 'TestComponent',
        stateName: 'testState',
      });

      const result = guardedSetter('blocked');

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('Emergency mode');
    });
  });

  describe('EmergencyBreaker', () => {
    test('should allow operations under normal conditions', () => {
      const breaker = createEmergencyBreaker('TestComponent', 3);

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.isTripped()).toBe(false);
    });

    test('should trip after max failures', () => {
      const breaker = createEmergencyBreaker('TestComponent', 2);

      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(true);

      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(false);
      expect(breaker.isTripped()).toBe(true);
    });

    test('should reset after success', () => {
      const breaker = createEmergencyBreaker('TestComponent', 2);

      breaker.recordFailure();
      breaker.recordSuccess();

      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    // Test component that simulates update loops
    const ProblematicComponent: React.FC<{ triggerLoop?: boolean }> = ({ triggerLoop = false }) => {
      const [count, setCount] = useState(0);
      const { triggerRecovery } = useEmergencyRecovery('ProblematicComponent');

      const guardedSetCount = wrapSetStateWithGuard(setCount, {
        componentName: 'ProblematicComponent',
        stateName: 'count',
        enableDeduplication: true,
        enableThrottling: true,
        maxUpdatesPerSecond: 5,
      });

      useEffect(() => {
        if (triggerLoop) {
          // This would normally cause an infinite loop
          const result = guardedSetCount(count + 1);

          if (!result.success && result.blocked) {
            // Trigger emergency recovery
            triggerRecovery('update-depth', { count, lastAttempt: result });
          }
        }
      }, [count, triggerLoop, guardedSetCount, triggerRecovery]);

      return <div data-testid="count">{count}</div>;
    };

    test('should prevent infinite update loops', async () => {
      const { getByTestId, rerender } = render(<ProblematicComponent />);

      expect(getByTestId('count')).toHaveTextContent('0');

      // Trigger the loop
      rerender(<ProblematicComponent triggerLoop={true} />);

      // Wait for guards to kick in
      await waitFor(() => {
        const count = parseInt(getByTestId('count').textContent || '0');
        expect(count).toBeLessThan(10); // Should be prevented from going too high
      });
    });

    test('should recover from emergency situations', async () => {
      // Simulate emergency state
      for (let i = 0; i < 15; i++) {
        monitor.recordUpdate('RecoveryTestComponent');
      }

      expect(monitor.isEmergencyMode()).toBe(true);

      // Wait for emergency mode to deactivate
      await waitFor(() => {
        expect(monitor.isEmergencyMode()).toBe(false);
      }, { timeout: 6000 });
    });

    test('should track component lifecycle correctly', async () => {
      const TestComponent: React.FC = () => {
        const [value, setValue] = useState('initial');

        useEffect(() => {
          setValue('mounted');
        }, []);

        return <div>{value}</div>;
      };

      const { unmount } = render(<TestComponent />);

      await waitFor(() => {
        const metrics = tracker.getComponentMetrics('TestComponent');
        expect(metrics?.mountTime).toBeGreaterThan(0);
        expect(metrics?.renderCount).toBeGreaterThan(0);
      });

      unmount();

      // Verify unmount was tracked
      // Note: This requires the component to use useLifecycleTracking hook
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent updates safely', async () => {
      const setValue = jest.fn();
      const guardedSetter = wrapSetStateWithGuard(setValue, {
        componentName: 'ConcurrentTest',
        stateName: 'value',
        enableThrottling: true,
        maxUpdatesPerSecond: 3,
      });

      // Fire concurrent updates
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(guardedSetter(`value-${i}`))
      );

      const results = await Promise.all(promises);

      // Should have handled all updates without throwing
      expect(results).toHaveLength(10);
      expect(results.every(r => typeof r === 'object')).toBe(true);
    });

    test('should handle component names with special characters', () => {
      const result = monitor.recordUpdate('Component[0].Item-1');
      expect(result).toBe(true);

      const stats = monitor.getComponentStats('Component[0].Item-1');
      expect(stats).toHaveLength(1);
    });

    test('should handle undefined/null values gracefully', () => {
      const setValue = jest.fn();
      const guardedSetter = wrapSetStateWithGuard(setValue, {
        componentName: 'TestComponent',
        stateName: 'testState',
      });

      const result1 = guardedSetter(undefined as any);
      const result2 = guardedSetter(null as any);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(setValue).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Impact', () => {
    test('should not significantly impact normal operations', () => {
      const start = performance.now();

      // Simulate normal component lifecycle
      for (let i = 0; i < 100; i++) {
        monitor.recordUpdate(`Component${i % 10}`);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete quickly (less than 10ms for 100 operations)
      expect(duration).toBeLessThan(10);
    });

    test('should clean up old data automatically', async () => {
      // Add many old entries
      for (let i = 0; i < 50; i++) {
        monitor.recordUpdate(`OldComponent${i}`);
      }

      const initialStats = monitor.getAllStats();
      const initialSize = initialStats.size;

      // Wait for cleanup (UpdateDepthMonitor should clean up old entries)
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than timeWindowMs

      // Add new entry to trigger cleanup
      monitor.recordUpdate('NewComponent');

      const finalStats = monitor.getAllStats();
      expect(finalStats.size).toBeLessThanOrEqual(initialSize);
    });
  });
});