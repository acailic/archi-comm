import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import AppContainer from '@ui/components/AppContainer';
import * as env from '@/lib/environment';
import { renderWithProviders } from '@/test/integration-helpers';

describe('AppContainer integration', () => {
  beforeEach(() => {
    // Default to web unless overridden in test
    vi.spyOn(env, 'isTauriEnvironment').mockReturnValue(false);
    (import.meta as any).env = (import.meta as any).env || {};
  });

  it('renders basic variant (web) and shows challenge selection', async () => {
    (import.meta as any).env.VITE_APP_VARIANT = 'basic';
    renderWithProviders(<AppContainer />);

    await waitFor(() => {
      // Welcome overlay may show first; simulate skip if present
      const skip = screen.queryByText('Skip Tutorial');
      if (skip) {
        (skip as HTMLButtonElement).click();
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Choose Your Challenge')).toBeInTheDocument();
    });
  });

  it('navigates full workflow in complex (tauri) variant', async () => {
    vi.spyOn(env, 'isTauriEnvironment').mockReturnValue(true);
    (import.meta as any).env.VITE_APP_VARIANT = 'complex';
    renderWithProviders(<AppContainer />);

    // Dismiss welcome overlay
    const skip = await screen.findByText('Skip Tutorial');
    skip.click();

    // Select first available challenge
    const startButtons = await screen.findAllByText('Start Challenge');
    startButtons[0].click();

    // Should navigate to design canvas
    await waitFor(() => {
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    });

    // Move to audio via workflow helpers (simulated Continue)
    const continueBtn = screen.queryByTestId('continue-to-recording');
    if (continueBtn) {
      (continueBtn as HTMLButtonElement).click();
    }

    await waitFor(() => {
      expect(screen.getByTestId('audio-recording')).toBeInTheDocument();
    });
  });

  it('respects safe variant flags (minimal features)', async () => {
    (import.meta as any).env.VITE_APP_VARIANT = 'safe';
    renderWithProviders(<AppContainer />);

    // Dismiss welcome if present
    const skip = screen.queryByText('Skip Tutorial');
    if (skip) (skip as HTMLButtonElement).click();

    // Should still allow selecting a challenge
    const start = await screen.findAllByText('Start Challenge');
    expect(start.length).toBeGreaterThan(0);
  });
});
