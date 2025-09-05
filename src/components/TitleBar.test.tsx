import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TitleBar } from './TitleBar';

// Mock the hook used by TitleBar to avoid Tauri dependency in tests
vi.mock('../lib/hooks/useTauri', () => ({
  useWindow: () => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    setTitle: vi.fn(),
    isRunningInTauri: true,
  }),
}));

// Simplify the Button import with a basic stand-in to avoid style deps
vi.mock('./ui/button', () => ({
  Button: (props: any) => <button {...props} />,
}));

describe('TitleBar', () => {
  it('renders title and window controls', async () => {
    render(<TitleBar title="TestApp" showControls />);
    expect(screen.getByText('TestApp')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Minimize'));
    await user.click(screen.getByTitle('Maximize'));
    await user.click(screen.getByTitle('Close'));
  });

  it('does not render when not in Tauri', () => {
    vi.doMock('../lib/hooks/useTauri', () => ({
      useWindow: () => ({
        minimize: vi.fn(), maximize: vi.fn(), close: vi.fn(), setTitle: vi.fn(), isRunningInTauri: false,
      }),
    }));
    // Re-import after doMock to apply the new mock
    const { TitleBar: TitleBarLocal } = require('./TitleBar');
    const { container } = render(<TitleBarLocal title="Hidden" />);
    expect(container.firstChild).toBeNull();
  });
});

