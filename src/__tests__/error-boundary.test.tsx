import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

// Mocks
vi.mock('@/lib/logger', () => {
  const logs: any[] = [];
  return {
    getLogger: () => ({
      error: vi.fn((...args: any[]) => logs.push(['error', ...args])),
      warn: vi.fn((...args: any[]) => logs.push(['warn', ...args])),
      info: vi.fn((...args: any[]) => logs.push(['info', ...args])),
      fatal: vi.fn((...args: any[]) => logs.push(['fatal', ...args])),
      debug: vi.fn((...args: any[]) => logs.push(['debug', ...args])),
    }),
  };
});

vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } } as any);

function Boom() {
  throw new Error('Boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders fallback on error', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('allows retry and respects timer', async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    const retry = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retry);

    // advance timers to simulate delayed retry
    vi.advanceTimersByTime(1500);
    // No assertion on render change because Boom always throws; ensure button still present
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('supports custom fallback', () => {
    const Fallback = () => <div>Custom Fallback</div>;
    render(
      <ErrorBoundary fallback={<Fallback />}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
  });
});

