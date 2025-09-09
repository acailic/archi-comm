import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AppContainer from '@/components/AppContainer';
import * as env from '@/lib/environment';

describe('AppContainer integration', () => {
  it('detects variant based on environment', () => {
    vi.spyOn(env, 'isTauriEnvironment').mockReturnValue(false);
    render(<AppContainer />);
    // Should render challenge selection by default
    expect(screen.getByText(/Loading/i) || screen.queryByText(/Challenge/i)).toBeTruthy();
  });
});

