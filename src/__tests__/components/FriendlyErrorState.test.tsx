// src/__tests__/components/FriendlyErrorState.test.tsx
// Unit tests for friendly error state variants to ensure UX actions and tracking
// RELEVANT FILES: src/packages/ui/components/errors/FriendlyErrorState.tsx, src/lib/user-experience/UXOptimizer.ts

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const trackActionMock = vi.fn();
const optimizerMock = { trackAction: trackActionMock };

vi.mock('@/lib/user-experience/UXOptimizer', () => ({
  UXOptimizer: {
    getInstance: () => optimizerMock,
  },
}));

import {
  NetworkErrorState,
  ValidationErrorState,
  GenericErrorState,
} from '@/packages/ui/components/errors/FriendlyErrorState';

const expectTrackActionCalledWith = (action: string) => {
  expect(trackActionMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ action }),
    }),
  );
};

describe('FriendlyErrorState variants', () => {
  beforeEach(() => {
    trackActionMock.mockClear();
  });

  it('handles network recovery actions and tracking', () => {
    const onRetry = vi.fn();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<NetworkErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expectTrackActionCalledWith('network-retry');

    fireEvent.click(screen.getByRole('button', { name: 'Work Offline' }));
    expectTrackActionCalledWith('network-offline-mode');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'network:work-offline' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Status' }));
    expectTrackActionCalledWith('network-status-page');
    expect(openSpy).toHaveBeenCalledWith(
      'https://status.archicomm.app',
      '_blank',
      'noopener',
    );

    dispatchSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('surfaces validation errors and kicks off recovery helpers', () => {
    const onFix = vi.fn();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const validationMessages = [
      'Ensure all services publish health checks.',
      'Define clear ingress and egress rules for the VPC.',
      'Cache write path must be idempotent.',
    ];

    render(<ValidationErrorState errors={validationMessages} onFix={onFix} />);

    validationMessages.forEach((message) => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fix Automatically' }));
    expect(onFix).toHaveBeenCalledTimes(1);
    expectTrackActionCalledWith('validation-auto-fix');

    fireEvent.click(screen.getByRole('button', { name: 'Show Examples' }));
    expectTrackActionCalledWith('validation-show-examples');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'docs:open',
        detail: expect.objectContaining({ topic: 'validation-examples' }),
      }),
    );

    dispatchSpy.mockRestore();
  });

  it('exposes recovery utilities within the generic error state', async () => {
    const onReload = vi.fn();
    const onReport = vi.fn();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = (navigator as any).clipboard;
    try {
      Object.assign(navigator as any, { clipboard: { writeText } });
    } catch {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
    }

    const error = new Error('Canvas renderer timed out');
    render(<GenericErrorState onReload={onReload} onReport={onReport} error={error} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expectTrackActionCalledWith('generic-reload');

    fireEvent.click(screen.getByRole('button', { name: 'Report Issue' }));
    expect(onReport).toHaveBeenCalledTimes(1);
    expectTrackActionCalledWith('generic-report');

    fireEvent.click(screen.getByRole('button', { name: 'Copy Error Details' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('Error: Canvas renderer timed out'),
      ),
    );
    expectTrackActionCalledWith('generic-copy-details');

    fireEvent.click(screen.getByRole('button', { name: 'Reset to Last Save' }));
    expectTrackActionCalledWith('generic-reset-last-save');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'app:restore-last-save' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Technical details/i }));
    expect(
      screen.getByText(expect.stringMatching(/Canvas renderer timed out/)),
    ).toBeInTheDocument();

    if (originalClipboard) {
      try {
        Object.assign(navigator as any, { clipboard: originalClipboard });
      } catch {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: originalClipboard,
        });
      }
    } else {
      delete (navigator as any).clipboard;
    }
    dispatchSpy.mockRestore();
  });
});
