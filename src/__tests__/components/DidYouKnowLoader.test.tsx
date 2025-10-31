// src/__tests__/components/DidYouKnowLoader.test.tsx
// Unit tests for DidYouKnowLoader to verify fact rotation and UX presentation
// RELEVANT FILES: src/packages/ui/components/loading/DidYouKnowLoader.tsx, src/lib/education/educational-content.ts

import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockGetRandomDidYouKnowFact = vi.fn();

vi.mock('@/lib/education/educational-content', () => ({
  getRandomDidYouKnowFact: mockGetRandomDidYouKnowFact,
}));

// Import after mocks
import { DidYouKnowLoader } from '@/packages/ui/components/loading/DidYouKnowLoader';

describe('DidYouKnowLoader', () => {
  beforeEach(() => {
    mockGetRandomDidYouKnowFact.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips fact rotation when showFacts is false', () => {
    render(<DidYouKnowLoader message="Preparing workspace" showFacts={false} />);

    expect(screen.getByText('Preparing workspace')).toBeInTheDocument();
    expect(mockGetRandomDidYouKnowFact).not.toHaveBeenCalled();
  });

  it('rotates inline facts on the defined interval', async () => {
    const facts = [
      { id: 'fact-1', fact: 'Event-driven architectures decouple services.' },
      { id: 'fact-2', fact: 'Circuit breakers prevent cascading failures.' },
    ];

    mockGetRandomDidYouKnowFact.mockImplementation(() => {
      const fact = facts.shift();
      return fact ?? { id: 'fact-last', fact: 'Resilience patterns keep systems healthy.' };
    });

    render(<DidYouKnowLoader showFacts variant="inline" message="Loading architecture insights" />);

    await waitFor(() =>
      expect(screen.getByText(/Event-driven architectures decouple services/)).toBeInTheDocument(),
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    await waitFor(() =>
      expect(screen.getByText(/Circuit breakers prevent cascading failures/)).toBeInTheDocument(),
    );

    expect(mockGetRandomDidYouKnowFact).toHaveBeenCalledTimes(2);
  });

  it('renders skeleton variant with educational fact', async () => {
    mockGetRandomDidYouKnowFact.mockReturnValue({
      id: 'fact-skeleton',
      fact: 'Latency budgets help prioritize performance work.',
    });

    render(<DidYouKnowLoader variant="skeleton" />);

    await waitFor(() =>
      expect(screen.getByText('Latency budgets help prioritize performance work.')).toBeInTheDocument(),
    );
    expect(mockGetRandomDidYouKnowFact).toHaveBeenCalled();
  });
});
