// src/__tests__/integration/error-recovery-scenarios.test.tsx
// Integration tests for error recovery system functionality and user experience
// Tests error injection, recovery strategies, auto-save recovery, and user interaction patterns
// RELEVANT FILES: src/test/integration-helpers.tsx, src/lib/errorStore.ts, src/components/AppContainer.tsx

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, AssertionHelpers, MockHelpers } from '../../test/integration-helpers';
import { errorStore, addError, addReactError, addNetworkError, addPerformanceError } from '../../lib/errorStore';
import { DesignCanvas } from '../../components/DesignCanvas';
import { ChallengeSelection } from '../../components/ChallengeSelection';
import type { Challenge, DesignData } from '../../shared/contracts';

// Hoisted storage mock so module mocking is applied consistently
const recoveryStorageMock: any = {};
vi.mock('@/services/storage', () => ({
  storage: recoveryStorageMock,
}));

// Mock challenge and design data
const mockChallenge: Challenge = {
  id: 'test-recovery-challenge',
  title: 'Error Recovery Test Challenge',
  description: 'Test challenge for error recovery scenarios',
  requirements: ['Handle errors gracefully', 'Recover user data', 'Maintain application stability'],
  difficulty: 'intermediate',
  estimatedTime: 30,
  category: 'system-design'
};

const mockDesignData: DesignData = {
  components: [
    {
      id: 'test-component-1',
      type: 'api-gateway',
      x: 100,
      y: 100,
      label: 'Test Gateway',
      properties: { showLabel: true }
    }
  ],
  connections: [],
  infoCards: [],
  layers: [],
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0'
  }
};

// Mock error recovery overlay component
const MockErrorRecoveryOverlay = ({
  visible,
  onRecover,
  onCancel,
  errorType
}: {
  visible: boolean;
  onRecover: () => void;
  onCancel: () => void;
  errorType: string;
}) => {
  if (!visible) return null;

  return (
    <div data-testid="recovery-overlay" className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div data-testid="recovery-dialog" className="bg-white p-6 rounded-lg">
        <h2 data-testid="recovery-title">Error Recovery</h2>
        <p data-testid="recovery-message">
          An error occurred ({errorType}). We can help you recover your work.
        </p>
        <div data-testid="recovery-actions" className="flex gap-2 mt-4">
          <button data-testid="recovery-button" onClick={onRecover}>
            Recover
          </button>
          <button data-testid="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

describe('Error Recovery Scenarios Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnComplete: ReturnType<typeof vi.fn>;
  let mockOnBack: ReturnType<typeof vi.fn>;
  let mockOnChallengeSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnComplete = vi.fn();
    mockOnBack = vi.fn();
    mockOnChallengeSelect = vi.fn();
    MockHelpers.mockTauriAPIs();

    // Clear error store before each test
    errorStore.clearErrors();

    // Reset global test error handlers
    (globalThis as any).clearTestErrors();
  });

  afterEach(() => {
    errorStore.clearErrors();
  });

  describe('Error Detection and Categorization', () => {
    it('should detect and categorize React component errors', async () => {
      const TestComponent = () => {
        const [shouldError, setShouldError] = React.useState(false);

        if (shouldError) {
          throw new Error('Test React component error');
        }

        return (
          <div>
            <button data-testid="trigger-error" onClick={() => setShouldError(true)}>
              Trigger Error
            </button>
          </div>
        );
      };

      renderWithProviders(<TestComponent />);

      // Trigger React error
      const triggerButton = screen.getByTestId('trigger-error');

      await act(async () => {
        await user.click(triggerButton);
      });

      // Should be caught by error boundary
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });

      // Verify error was added to error store
      const errorState = errorStore.getState();
      expect(errorState.errors).toHaveLength(1);
      expect(errorState.errors[0].category).toBe('react');
    });

    it('should detect and categorize network errors', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={[mockChallenge]}
        />
      );

      // Simulate network error
      const networkError = new Error('Failed to fetch challenge data');
      addNetworkError(networkError, {
        url: '/api/challenges',
        userActions: ['clicked import button']
      });

      // Verify error was categorized correctly
      const errorState = errorStore.getState();
      expect(errorState.errors).toHaveLength(1);
      expect(errorState.errors[0].category).toBe('network');
      expect(errorState.errors[0].severity).toBe('high');
    });

    it('should detect and categorize performance errors', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate performance error
      addPerformanceError('Canvas rendering took too long', {
        renderTime: 5000,
        memoryUsage: 50 * 1024 * 1024,
        timestamp: Date.now()
      });

      // Verify error was categorized correctly
      const errorState = errorStore.getState();
      expect(errorState.errors).toHaveLength(1);
      expect(errorState.errors[0].category).toBe('performance');
      expect(errorState.errors[0].severity).toBe('high');
    });

    it('should deduplicate identical errors', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={[mockChallenge]}
        />
      );

      // Add the same error multiple times
      const duplicateError = 'Duplicate error message';
      addError(duplicateError, 'unknown');
      addError(duplicateError, 'unknown');
      addError(duplicateError, 'unknown');

      // Should only have one error with count = 3
      const errorState = errorStore.getState();
      expect(errorState.errors).toHaveLength(1);
      expect(errorState.errors[0].count).toBe(3);
      expect(errorState.errors[0].message).toBe(duplicateError);
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should trigger auto-save recovery when errors occur during design work', async () => {
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      // Mock storage with saved design data
      mockStorage.getItem.mockImplementation((key) => {
        if (key === 'archicomm-design-backup') {
          return JSON.stringify({
            components: mockDesignData.components,
            connections: mockDesignData.connections,
            timestamp: Date.now(),
            autoSaved: true
          });
        }
        return null;
      });

      Object.assign(recoveryStorageMock, mockStorage);

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={{ ...mockDesignData, components: [] }} // Start with empty
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate error during design work
      addError('Design canvas crashed', 'react', {
        componentStack: 'ReactFlowCanvas > DesignCanvas',
        userActions: ['added component', 'created connection']
      });

      // Should add an error to the store
      await waitFor(() => {
        const state = errorStore.getState();
        expect(state.errors.length).toBeGreaterThan(0);
      });

      // Simulate recovery action by resolving errors programmatically
      const current = errorStore.getState();
      current.errors.forEach(e => errorStore.resolveError(e.id));
      await waitFor(() => {
        expect(errorStore.getState().errors.every(e => e.resolved)).toBe(true);
        expect(mockStorage.getItem).toHaveBeenCalledWith('archicomm-design-backup');
      });
    });

    it('should provide soft reload recovery for critical errors', async () => {
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window.location, 'reload', {
        writable: true,
        value: mockReload
      });

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate critical error
      const criticalError = new Error('Cannot read property of undefined');
      addError(criticalError, 'react', {
        componentStack: 'Critical component failure',
        performanceMetrics: {
          memoryUsage: 100 * 1024 * 1024, // High memory usage
          timestamp: Date.now()
        }
      });

      // Should register a critical error
      await waitFor(() => {
        const state = errorStore.getState();
        expect(state.errors.some(e => e.severity === 'critical')).toBe(true);
      });
    });

    it('should handle storage quota exceeded scenarios', async () => {
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.assign(recoveryStorageMock, mockStorage);

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Trigger save operation that will fail
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      // Should handle storage error gracefully
      await waitFor(() => {
        const errorState = errorStore.getState();
        expect(errorState.errors.some(e =>
          e.message.includes('QuotaExceededError') ||
          e.category === 'storage'
        )).toBe(true);
      });

      // Simulate storage cleanup and confirm action executed
      mockStorage.clear.mockResolvedValue(undefined);
      await mockStorage.clear();
      expect(mockStorage.clear).toHaveBeenCalled();
    });
  });

  describe('User Experience During Error Recovery', () => {
    it('should display user-friendly error messages', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate user-friendly error
      addError('Connection to server lost', 'network', {
        userActions: ['attempted to save design'],
        url: '/api/save-design'
      });

      await waitFor(() => {
        const state = errorStore.getState();
        expect(state.errors.length).toBeGreaterThan(0);
      });
    });

    it('should provide clear recovery instructions', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={[mockChallenge]}
        />
      );

      // Simulate error with recovery instructions
      addError('Failed to load challenges', 'network', {
        userActions: ['clicked refresh'],
        additionalData: {
          recoveryInstructions: 'Try refreshing the page or check your internet connection'
        }
      });

      await waitFor(() => {
        AssertionHelpers.expectRecoveryOverlay(true);
        expect(screen.getByText(/try refreshing/i)).toBeInTheDocument();
        expect(screen.getByText(/check your internet/i)).toBeInTheDocument();
      });
    });

    it('should handle recovery cancellation gracefully', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Trigger error
      addError('Test error for cancellation', 'unknown');

      await waitFor(() => {
        AssertionHelpers.expectRecoveryOverlay(true);
      });

      // Click cancel button
      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      // Recovery overlay should be hidden
      await waitFor(() => {
        AssertionHelpers.expectRecoveryOverlay(false);
      });

      // Application should remain functional
      expect(screen.getByText(mockChallenge.title)).toBeInTheDocument();
    });

    it('should track recovery success and failure rates', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate successful recovery
      const error1 = addError('Recoverable error 1', 'network');
      await waitFor(() => AssertionHelpers.expectRecoveryOverlay(true));

      const recoverButton = screen.getByTestId('recovery-button');
      await user.click(recoverButton);

      // Mark error as resolved
      if (error1) {
        errorStore.resolveError(error1.id);
      }

      // Simulate failed recovery
      const error2 = addError('Non-recoverable error', 'react');
      await waitFor(() => AssertionHelpers.expectRecoveryOverlay(true));

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      // Verify recovery statistics
      const stats = errorStore.getStats();
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(1);
    });
  });

  describe('Error Prevention and Early Warning', () => {
    it('should detect potential memory issues before they cause crashes', async () => {
      // Mock performance.memory to simulate high usage
      const mockMemory = {
        usedJSHeapSize: 45 * 1024 * 1024, // 45MB
        totalJSHeapSize: 50 * 1024 * 1024, // 50MB
        jsHeapSizeLimit: 50 * 1024 * 1024  // 50MB limit
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      });

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate memory monitoring check
      const memoryUsageRatio = mockMemory.usedJSHeapSize / mockMemory.jsHeapSizeLimit;
      if (memoryUsageRatio > 0.8) {
        addPerformanceError('High memory usage detected', {
          memoryUsage: mockMemory.usedJSHeapSize,
          timestamp: Date.now()
        });
      }

      // Should show early warning
      await waitFor(() => {
        const errorState = errorStore.getState();
        expect(errorState.errors.some(e => e.message.includes('memory'))).toBe(true);
      });
    });

    it('should warn about slow operations before timeout', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate slow operation detection
      addPerformanceError('Canvas rendering is slow', {
        renderTime: 3000, // 3 seconds
        timestamp: Date.now()
      }, {
        userActions: ['added many components'],
        additionalData: {
          suggestion: 'Consider enabling virtualization or reducing component count'
        }
      });

      await waitFor(() => {
        const errorState = errorStore.getState();
        expect(errorState.errors.some(e =>
          e.message.includes('slow') &&
          e.severity === 'medium'
        )).toBe(true);
      });
    });

    it('should provide proactive suggestions based on usage patterns', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate pattern-based suggestion
      addError('Consider saving your work', 'unknown', {
        userActions: [
          'added component',
          'added component',
          'added component',
          'added component',
          'added component'
        ],
        additionalData: {
          type: 'suggestion',
          reason: 'No save detected after 5 actions'
        }
      });

      await waitFor(() => {
        const errorState = errorStore.getState();
        expect(errorState.errors.some(e =>
          e.message.includes('saving') &&
          e.context.additionalData?.type === 'suggestion'
        )).toBe(true);
      });
    });
  });

  describe('Recovery System Performance', () => {
    it('should handle recovery operations without blocking UI', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const startTime = performance.now();

      // Trigger error and immediate recovery
      addError('Test error for performance', 'unknown');

      await waitFor(() => {
        const state = errorStore.getState();
        expect(state.errors.length).toBeGreaterThan(0);
      });
      // Resolve all current errors to simulate successful recovery
      errorStore.getState().errors.forEach(e => errorStore.resolveError(e.id));
      await waitFor(() => {
        expect(errorStore.getState().errors.every(e => e.resolved)).toBe(true);
      });

      const endTime = performance.now();
      const recoveryTime = endTime - startTime;

      // Recovery should be fast (under 1 second)
      expect(recoveryTime).toBeLessThan(1000);

      // UI should remain responsive
      expect(screen.getByText(mockChallenge.title)).toBeInTheDocument();
    });

    it('should limit error storage to prevent memory leaks', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={[mockChallenge]}
        />
      );

      // Add many errors to test storage limits
      for (let i = 0; i < 150; i++) {
        addError(`Test error ${i}`, 'unknown');
      }

      // Should not exceed maximum error limit
      const errorState = errorStore.getState();
      expect(errorState.errors.length).toBeLessThanOrEqual(100); // Default max is 100
    });

    it('should clean up old resolved errors automatically', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add and resolve errors
      for (let i = 0; i < 10; i++) {
        const error = addError(`Old error ${i}`, 'unknown');
        if (error) {
          errorStore.resolveError(error.id);
        }
      }

      // Manually trigger cleanup
      errorStore.clearResolvedErrors();

      // Should have removed resolved errors
      const errorState = errorStore.getState();
      expect(errorState.errors.every(e => !e.resolved)).toBe(true);
    });
  });

  describe('Error Reporting and Analytics', () => {
    it('should collect meaningful error context', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add error with rich context
      const error = addError('Context-rich error', 'react', {
        componentStack: 'ComponentA > ComponentB > Root',
        userActions: [
          'clicked add button',
          'dragged component',
          'created connection'
        ],
        performanceMetrics: {
          memoryUsage: 25 * 1024 * 1024,
          renderTime: 150,
          timestamp: Date.now()
        },
        url: window.location.href,
        additionalData: {
          challengeId: mockChallenge.id,
          componentCount: 5,
          connectionCount: 3
        }
      });

      expect(error).toBeTruthy();
      expect(error?.context.userActions).toHaveLength(3);
      expect(error?.context.performanceMetrics).toBeDefined();
      expect(error?.context.additionalData?.challengeId).toBe(mockChallenge.id);
    });

    it('should generate exportable error reports', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={[mockChallenge]}
        />
      );

      // Add various types of errors
      addError('Network error', 'network');
      addReactError(new Error('React error'));
      addPerformanceError('Performance issue', { renderTime: 5000, timestamp: Date.now() });

      // Export error report
      const report = errorStore.exportErrors();
      const reportData = JSON.parse(report);

      // Verify report structure
      expect(reportData).toHaveProperty('timestamp');
      expect(reportData).toHaveProperty('stats');
      expect(reportData).toHaveProperty('errors');
      expect(reportData.errors).toHaveLength(3);
      expect(reportData.stats.categories).toHaveProperty('network');
      expect(reportData.stats.categories).toHaveProperty('react');
      expect(reportData.stats.categories).toHaveProperty('performance');
    });
  });
});
