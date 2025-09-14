/**
 * src/__tests__/useDesignValidation.test.tsx
 * Unit tests for the useDesignValidation React hook
 * Tests hook behavior, memoization, error handling, and edge cases
 * RELEVANT FILES: src/hooks/useDesignValidation.ts, src/lib/design-comparison.ts, src/shared/contracts/index.ts
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { useDesignValidation } from '../hooks/useDesignValidation';
import * as designComparison from '../lib/design-comparison';
import type { ExtendedChallenge } from '../lib/challenge-config';
import type { DesignData } from '@/shared/contracts';

// Mock the design comparison module
jest.mock('../lib/design-comparison', () => ({
  compareDesigns: jest.fn()
}));

const mockCompareDesigns = designComparison.compareDesigns as jest.MockedFunction<typeof designComparison.compareDesigns>;

describe('useDesignValidation', () => {
  // Mock design data
  const mockDesignData: DesignData = {
    components: [
      {
        id: 'comp1',
        type: 'server',
        label: 'Web Server',
        x: 100,
        y: 100
      },
      {
        id: 'comp2',
        type: 'database',
        label: 'Database',
        x: 200,
        y: 100
      }
    ],
    connections: [
      {
        id: 'conn1',
        from: 'comp1',
        to: 'comp2',
        label: 'Query',
        type: 'sync'
      }
    ],
    layers: [],
    metadata: {}
  };

  // Mock challenge with template
  const mockChallengeWithTemplate: ExtendedChallenge = {
    id: 'test-challenge',
    title: 'Test Challenge',
    description: 'A test challenge',
    requirements: ['Requirement 1', 'Requirement 2'],
    difficulty: 'beginner',
    estimatedTime: 30,
    category: 'system-design',
    architectureTemplate: {
      name: 'Test Template',
      description: 'Template for testing',
      components: [
        {
          type: 'server',
          label: 'Web Server',
          description: 'Main server'
        },
        {
          type: 'database',
          label: 'Database',
          description: 'Main database'
        }
      ],
      connections: [
        {
          from: 'Web Server',
          to: 'Database',
          label: 'Query',
          type: 'sync'
        }
      ]
    }
  };

  // Mock challenge without template
  const mockChallengeWithoutTemplate: ExtendedChallenge = {
    id: 'test-challenge-no-template',
    title: 'Test Challenge Without Template',
    description: 'A test challenge without template',
    requirements: ['Requirement 1'],
    difficulty: 'beginner',
    estimatedTime: 30,
    category: 'system-design'
  };

  // Mock validation result
  const mockValidationResult = {
    score: 85,
    maxScore: 100,
    percentage: 85,
    componentMatches: [
      {
        templateComponent: 'Web Server',
        userComponent: 'Web Server',
        matched: true,
        reason: 'Exact match'
      },
      {
        templateComponent: 'Database',
        userComponent: 'Database',
        matched: true,
        reason: 'Exact match'
      }
    ],
    connectionMatches: [
      {
        expected: 'Web Server → Database',
        found: true,
        reason: 'Connection found'
      }
    ],
    feedback: [
      {
        category: 'architecture' as const,
        type: 'missing' as const,
        message: 'Great job! Your design matches the template well.',
        suggestion: 'Consider adding monitoring for production readiness'
      }
    ],
    missingComponents: [],
    extraComponents: [],
    incorrectConnections: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCompareDesigns.mockReturnValue(mockValidationResult);
  });

  describe('Basic Hook Behavior', () => {
    it('should return validation result when design data and challenge with template are provided', () => {
      const { result } = renderHook(() =>
        useDesignValidation({
          designData: mockDesignData,
          challenge: mockChallengeWithTemplate
        })
      );

      expect(result.current.validationResult).toEqual(mockValidationResult);
      expect(result.current.isValidationAvailable).toBe(true);
      expect(result.current.hasTemplate).toBe(true);
      expect(mockCompareDesigns).toHaveBeenCalledWith(
        mockDesignData,
        mockChallengeWithTemplate.architectureTemplate
      );
    });

    it('should return null validation result when no design data is provided', () => {
      const { result } = renderHook(() =>
        useDesignValidation({
          designData: null,
          challenge: mockChallengeWithTemplate
        })
      );

      expect(result.current.validationResult).toBeNull();
      expect(result.current.isValidationAvailable).toBe(false);
      expect(result.current.hasTemplate).toBe(true);
      expect(mockCompareDesigns).not.toHaveBeenCalled();
    });

    it('should return null validation result when no challenge is provided', () => {
      const { result } = renderHook(() =>
        useDesignValidation({
          designData: mockDesignData,
          challenge: null
        })
      );

      expect(result.current.validationResult).toBeNull();
      expect(result.current.isValidationAvailable).toBe(false);
      expect(result.current.hasTemplate).toBe(false);
      expect(mockCompareDesigns).not.toHaveBeenCalled();
    });

    it('should return null validation result when challenge has no template', () => {
      const { result } = renderHook(() =>
        useDesignValidation({
          designData: mockDesignData,
          challenge: mockChallengeWithoutTemplate
        })
      );

      expect(result.current.validationResult).toBeNull();
      expect(result.current.isValidationAvailable).toBe(false);
      expect(result.current.hasTemplate).toBe(false);
      expect(mockCompareDesigns).not.toHaveBeenCalled();
    });
  });

  describe('Empty Design Handling', () => {
    it('should return null when design has no components', () => {
      const emptyDesignData: DesignData = {
        components: [],
        connections: [],
        layers: [],
        metadata: {}
      };

      const { result } = renderHook(() =>
        useDesignValidation({
          designData: emptyDesignData,
          challenge: mockChallengeWithTemplate
        })
      );

      expect(result.current.validationResult).toBeNull();
      expect(result.current.isValidationAvailable).toBe(false);
      expect(result.current.hasTemplate).toBe(true);
      expect(mockCompareDesigns).not.toHaveBeenCalled();
    });

    it('should work with design that has components but no connections', () => {
      const noConnectionsDesignData: DesignData = {
        components: [
          {
            id: 'comp1',
            type: 'server',
            label: 'Web Server',
            x: 100,
            y: 100
          }
        ],
        connections: [],
        layers: [],
        metadata: {}
      };

      const { result } = renderHook(() =>
        useDesignValidation({
          designData: noConnectionsDesignData,
          challenge: mockChallengeWithTemplate
        })
      );

      expect(result.current.validationResult).toEqual(mockValidationResult);
      expect(result.current.isValidationAvailable).toBe(true);
      expect(mockCompareDesigns).toHaveBeenCalledWith(
        noConnectionsDesignData,
        mockChallengeWithTemplate.architectureTemplate
      );
    });
  });

  describe('Memoization', () => {
    it('should memoize validation result and not recalculate on re-render', () => {
      const { result, rerender } = renderHook(() =>
        useDesignValidation({
          designData: mockDesignData,
          challenge: mockChallengeWithTemplate
        })
      );

      const firstResult = result.current.validationResult;

      // Re-render with same props
      rerender();

      const secondResult = result.current.validationResult;

      expect(firstResult).toBe(secondResult); // Same object reference
      expect(mockCompareDesigns).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should recalculate when design data changes', () => {
      const initialProps = {
        designData: mockDesignData,
        challenge: mockChallengeWithTemplate
      };

      const { result, rerender } = renderHook(
        (props) => useDesignValidation(props),
        { initialProps }
      );

      expect(mockCompareDesigns).toHaveBeenCalledTimes(1);

      // Change design data
      const newDesignData: DesignData = {
        ...mockDesignData,
        components: [
          ...mockDesignData.components,
          {
            id: 'comp3',
            type: 'cache',
            label: 'Cache',
            x: 300,
            y: 100
          }
        ]
      };

      rerender({
        designData: newDesignData,
        challenge: mockChallengeWithTemplate
      });

      expect(mockCompareDesigns).toHaveBeenCalledTimes(2);
      expect(mockCompareDesigns).toHaveBeenLastCalledWith(
        newDesignData,
        mockChallengeWithTemplate.architectureTemplate
      );
    });

    it('should recalculate when challenge changes', () => {
      const initialProps = {
        designData: mockDesignData,
        challenge: mockChallengeWithTemplate
      };

      const { result, rerender } = renderHook(
        (props) => useDesignValidation(props),
        { initialProps }
      );

      expect(mockCompareDesigns).toHaveBeenCalledTimes(1);

      // Change challenge
      const newChallenge: ExtendedChallenge = {
        ...mockChallengeWithTemplate,
        id: 'different-challenge',
        architectureTemplate: {
          name: 'Different Template',
          description: 'Different template',
          components: [
            {
              type: 'api-gateway',
              label: 'API Gateway',
              description: 'Gateway'
            }
          ],
          connections: []
        }
      };

      rerender({
        designData: mockDesignData,
        challenge: newChallenge
      });

      expect(mockCompareDesigns).toHaveBeenCalledTimes(2);
      expect(mockCompareDesigns).toHaveBeenLastCalledWith(
        mockDesignData,
        newChallenge.architectureTemplate
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in compareDesigns gracefully', () => {
      // Mock compareDesigns to throw an error
      mockCompareDesigns.mockImplementation(() => {
        throw new Error('Comparison failed');
      });

      // Mock console.error to avoid cluttering test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useDesignValidation({
          designData: mockDesignData,
          challenge: mockChallengeWithTemplate
        })
      );

      expect(result.current.validationResult).toBeNull();
      expect(result.current.isValidationAvailable).toBe(false);
      expect(result.current.hasTemplate).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Design validation failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should recover from errors when inputs change', () => {
      // First call throws error
      mockCompareDesigns
        .mockImplementationOnce(() => {
          throw new Error('First call failed');
        })
        .mockReturnValueOnce(mockValidationResult);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result, rerender } = renderHook(
        (props) => useDesignValidation(props),
        {
          initialProps: {
            designData: mockDesignData,
            challenge: mockChallengeWithTemplate
          }
        }
      );

      // First render should handle error
      expect(result.current.validationResult).toBeNull();

      // Change props to trigger re-calculation
      const newDesignData = { ...mockDesignData };
      rerender({
        designData: newDesignData,
        challenge: mockChallengeWithTemplate
      });

      // Second render should succeed
      expect(result.current.validationResult).toEqual(mockValidationResult);
      expect(result.current.isValidationAvailable).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Hook Integration', () => {
    // Test component to verify hook integration
    const TestComponent: React.FC<{
      designData: DesignData | null;
      challenge: ExtendedChallenge | null;
    }> = ({ designData, challenge }) => {
      const { validationResult, isValidationAvailable, hasTemplate } = useDesignValidation({
        designData,
        challenge
      });

      return (
        <div data-testid="test-component">
          <div data-testid="has-template">{hasTemplate ? 'yes' : 'no'}</div>
          <div data-testid="validation-available">{isValidationAvailable ? 'yes' : 'no'}</div>
          <div data-testid="validation-score">
            {validationResult?.score ?? 'no-score'}
          </div>
        </div>
      );
    };

    it('should work correctly when used in a React component', () => {
      const { getByTestId } = render(
        <TestComponent
          designData={mockDesignData}
          challenge={mockChallengeWithTemplate}
        />
      );

      expect(getByTestId('has-template')).toHaveTextContent('yes');
      expect(getByTestId('validation-available')).toHaveTextContent('yes');
      expect(getByTestId('validation-score')).toHaveTextContent('85');
    });

    it('should update when props change in component', () => {
      const { getByTestId, rerender } = render(
        <TestComponent
          designData={mockDesignData}
          challenge={mockChallengeWithTemplate}
        />
      );

      expect(getByTestId('validation-available')).toHaveTextContent('yes');

      // Change to challenge without template
      rerender(
        <TestComponent
          designData={mockDesignData}
          challenge={mockChallengeWithoutTemplate}
        />
      );

      expect(getByTestId('has-template')).toHaveTextContent('no');
      expect(getByTestId('validation-available')).toHaveTextContent('no');
      expect(getByTestId('validation-score')).toHaveTextContent('no-score');
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-computations', () => {
      const { result, rerender } = renderHook(() =>
        useDesignValidation({
          designData: mockDesignData,
          challenge: mockChallengeWithTemplate
        })
      );

      // Multiple re-renders with same props
      for (let i = 0; i < 5; i++) {
        rerender();
      }

      // Should only call compareDesigns once
      expect(mockCompareDesigns).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid prop changes efficiently', () => {
      const { rerender } = renderHook(
        (props) => useDesignValidation(props),
        {
          initialProps: {
            designData: mockDesignData,
            challenge: mockChallengeWithTemplate
          }
        }
      );

      // Rapid changes
      for (let i = 0; i < 10; i++) {
        const modifiedDesign = {
          ...mockDesignData,
          metadata: { lastModified: `timestamp-${i}` }
        };

        rerender({
          designData: modifiedDesign,
          challenge: mockChallengeWithTemplate
        });
      }

      // Should call compareDesigns for each change
      expect(mockCompareDesigns).toHaveBeenCalledTimes(11); // Initial + 10 changes
    });
  });
});