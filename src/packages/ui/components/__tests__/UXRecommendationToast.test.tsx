// src/packages/ui/components/__tests__/UXRecommendationToast.test.tsx
// Unit tests for UXRecommendationToast component  
// Tests toast display logic, Sonner API usage, and recommendation mapping
// RELEVANT FILES: UXRecommendationToast.tsx, useUXOptimizer.ts, WorkflowOptimizer.ts, useUXTracker.ts

import { describe, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';

// Mock dependencies
const mockTrackAction = vi.fn();
const mockTrackDialogAction = vi.fn();
const mockGetRecommendations = vi.fn();
const mockWorkflowOptimizer = {
  generateRecommendations: vi.fn(),
  trackAction: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: vi.fn(() => 'toast-id'),
}));

vi.mock('@/lib/user-experience/UXOptimizer', () => ({
  useUXOptimizer: () => ({
    getRecommendations: mockGetRecommendations,
    trackAction: mockTrackAction,
  }),
}));

vi.mock('@/lib/user-experience/WorkflowOptimizer', () => ({
  default: {
    getInstance: () => mockWorkflowOptimizer,
  },
}));

vi.mock('@/shared/hooks/common/useUXTracker', () => ({
  useUXTracker: () => ({
    trackDialogAction: mockTrackDialogAction,
  }),
}));

// Import after mocking
import { UXRecommendationToast } from '../UXRecommendationToast';

describe('UXRecommendationToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecommendations.mockReturnValue([]);
    mockWorkflowOptimizer.generateRecommendations.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Toast API Usage', () => {
    it('should use toast() for default recommendations', () => {
      const mockToast = vi.mocked(toast);
      const mockToastSuccess = vi.fn(() => 'success-id');
      const mockToastError = vi.fn(() => 'error-id');
      
      mockToast.success = mockToastSuccess;
      mockToast.error = mockToastError;

      mockGetRecommendations.mockReturnValue([
        {
          type: 'tutorial',
          priority: 'low',
          title: 'Test Tip',
          description: 'Test description',
          action: vi.fn(),
        },
      ]);

      const { rerender } = renderHook(() => <UXRecommendationToast />);
      
      // Trigger recommendation display
      rerender();

      // Should use default toast() for 'tip' type (maps from tutorial)
      expect(mockToast).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 5000,
          dismissible: true,
        })
      );
    });

    it('should use toast.success for optimization recommendations', () => {
      const mockToast = vi.mocked(toast);
      const mockToastSuccess = vi.fn(() => 'success-id');
      mockToast.success = mockToastSuccess;

      mockGetRecommendations.mockReturnValue([
        {
          type: 'feature', // maps to 'optimization'
          priority: 'medium',
          title: 'Test Optimization',
          description: 'Test optimization description',
          action: vi.fn(),
        },
      ]);

      const { rerender } = renderHook(() => <UXRecommendationToast />);
      rerender();

      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 5000,
          dismissible: true,
        })
      );
    });

    it('should use toast.error for warning recommendations', () => {
      const mockToast = vi.mocked(toast);
      const mockToastError = vi.fn(() => 'error-id');
      mockToast.error = mockToastError;

      mockGetRecommendations.mockReturnValue([
        {
          type: 'workflow', // maps to 'warning'
          priority: 'high',
          title: 'Test Warning',
          description: 'Test warning description',
          action: vi.fn(),
        },
      ]);

      const { rerender } = renderHook(() => <UXRecommendationToast />);
      rerender();

      expect(mockToastError).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 8000, // high priority gets longer duration
          dismissible: true,
        })
      );
    });

    it('should handle missing toast methods gracefully', () => {
      const mockToast = vi.mocked(toast);
      // Remove success method to test fallback
      delete (mockToast as any).success;

      mockGetRecommendations.mockReturnValue([
        {
          type: 'feature', // maps to optimization -> success
          priority: 'medium',
          title: 'Test Recommendation',
          description: 'Test description',
        },
      ]);

      expect(() => {
        const { rerender } = renderHook(() => <UXRecommendationToast />);
        rerender();
      }).not.toThrow();

      // Should fall back to default toast()
      expect(mockToast).toHaveBeenCalled();
    });
  });

  describe('Toast Type Mapping', () => {
    it('should map recommendation types to correct toast appearances', () => {
      // Test the getToastAppearance logic indirectly through component behavior
      const recommendations = [
        { type: 'tutorial', expectedToast: 'default' },  // tip -> default
        { type: 'shortcut', expectedToast: 'default' },  // shortcut -> default  
        { type: 'feature', expectedToast: 'success' },   // optimization -> success
        { type: 'workflow', expectedToast: 'error' },    // warning -> error
      ];

      recommendations.forEach(({ type, expectedToast }) => {
        vi.clearAllMocks();
        
        mockGetRecommendations.mockReturnValue([
          {
            type,
            priority: 'medium',
            title: `Test ${type}`,
            description: 'Test description',
          },
        ]);

        const { rerender } = renderHook(() => <UXRecommendationToast />);
        rerender();

        if (expectedToast === 'success') {
          expect(vi.mocked(toast).success).toHaveBeenCalled();
        } else if (expectedToast === 'error') {
          expect(vi.mocked(toast).error).toHaveBeenCalled();
        } else {
          expect(vi.mocked(toast)).toHaveBeenCalled();
        }
      });
    });

    it('should decouple toast appearance from priority', () => {
      // Same type should get same appearance regardless of priority
      const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      priorities.forEach((priority) => {
        vi.clearAllMocks();
        const mockToastSuccess = vi.fn(() => 'success-id');
        vi.mocked(toast).success = mockToastSuccess;

        mockGetRecommendations.mockReturnValue([
          {
            type: 'feature', // always maps to optimization -> success
            priority,
            title: `Test ${priority} Priority`,
            description: 'Test description',
          },
        ]);

        const { rerender } = renderHook(() => <UXRecommendationToast />);
        rerender();

        expect(mockToastSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Stable ID Generation', () => {
    it('should generate consistent IDs for same recommendations', () => {
      const recommendation = {
        type: 'tutorial',
        priority: 'medium' as const,
        title: 'Test Recommendation',
        description: 'Test description',
      };

      // Mock displayedRecommendations to capture generated IDs
      let capturedId: string;
      const originalAdd = Set.prototype.add;
      vi.spyOn(Set.prototype, 'add').mockImplementation(function(this: Set<any>, value: any) {
        if (typeof value === 'string' && value.startsWith('ux-')) {
          capturedId = value;
        }
        return originalAdd.call(this, value);
      });

      mockGetRecommendations.mockReturnValue([recommendation]);

      const { rerender } = renderHook(() => <UXRecommendationToast />);
      rerender();

      const firstId = capturedId!;

      // Clear and render again with same recommendation
      vi.clearAllMocks();
      mockGetRecommendations.mockReturnValue([recommendation]);
      
      rerender();
      
      const secondId = capturedId!;

      expect(firstId).toBe(secondId);
      expect(firstId).toMatch(/^ux-[a-z0-9]+$/);

      Set.prototype.add = originalAdd;
    });
  });

  describe('Dismissal Logic', () => {
    it('should use refined dismissal keys with source and category', () => {
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      mockGetRecommendations.mockReturnValue([
        {
          type: 'tutorial',
          priority: 'medium',
          title: 'Test Recommendation',
          description: 'Test description',
        },
      ]);

      const { rerender } = renderHook(() => <UXRecommendationToast />);
      rerender();

      // Should store dismissal with source-type-category pattern
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'archicomm.dismissed-recommendation-types',
        expect.stringMatching(/ux-tip-tutorial/)
      );
    });
  });
});