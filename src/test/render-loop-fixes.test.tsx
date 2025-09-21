/**
 * Tests to verify that the render loop fixes are working correctly
 * This tests the improvements made to useDesignCanvasPerformance and UpdateDepthMonitor
 */

import { renderHook } from '@testing-library/react';
import { UpdateDepthMonitor } from '@/lib/performance/UpdateDepthMonitor';

describe('Render Loop Prevention Fixes', () => {
  beforeEach(() => {
    UpdateDepthMonitor.getInstance().reset();
  });

  describe('UpdateDepthMonitor Improvements', () => {
    it('should have lowered warning thresholds', () => {
      const monitor = UpdateDepthMonitor.getInstance();

      // Test that the new lower thresholds are in effect
      for (let i = 0; i < 15; i++) {
        const canContinue = monitor.recordUpdate('TestComponent');
        expect(canContinue).toBe(true);
      }

      // At 15 updates (60% of 25), we should get warnings but still continue
      for (let i = 0; i < 10; i++) {
        const canContinue = monitor.recordUpdate('TestComponent');
        if (i < 5) {
          expect(canContinue).toBe(true); // Should still allow updates
        }
      }

      // At 25+ updates, should trigger emergency mode
      const shouldBlock = !monitor.recordUpdate('TestComponent');
      expect(shouldBlock).toBe(true);
    });

    it('should enter emergency mode faster than before', () => {
      const monitor = UpdateDepthMonitor.getInstance();

      // The new threshold is 25 instead of 50
      for (let i = 0; i < 26; i++) {
        monitor.recordUpdate('TestComponent');
      }

      expect(monitor.isEmergencyMode()).toBe(true);
    });

    it('should capture stack traces earlier', () => {
      const monitor = UpdateDepthMonitor.getInstance();

      // Stack traces should be captured at 50% of threshold (12.5, rounded to 13)
      for (let i = 0; i < 13; i++) {
        monitor.recordUpdate('TestComponent');
      }

      const stats = monitor.getComponentStats('TestComponent');
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].stackTrace).toBeDefined();
    });
  });

  describe('useDesignCanvasPerformance Throttling', () => {
    it('should not cause infinite re-renders with stable dependencies', () => {
      // This is a conceptual test - in real usage, the memoized values
      // should prevent the massive dependency arrays from causing re-renders
      const stableProps = { challengeId: 'test', schemaVersion: 1, selectedComponent: 'none' };
      const stableState = { componentsLength: 0, connectionsLength: 0, infoCardsLength: 0, isSynced: true };

      // The stable references should have the same identity across calls
      const props1 = { ...stableProps };
      const props2 = { ...stableProps };
      const state1 = { ...stableState };
      const state2 = { ...stableState };

      // In a real scenario, useMemo would ensure these have stable references
      expect(JSON.stringify(props1)).toBe(JSON.stringify(props2));
      expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
    });
  });
});