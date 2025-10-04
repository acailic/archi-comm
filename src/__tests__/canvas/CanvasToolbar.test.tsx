import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithAppProviders, resetTestStores } from '../../test/react-testing-utils';
import { CanvasToolbar } from '../../packages/ui/components/canvas/CanvasToolbar';
import { useCanvasStore } from '../../stores/canvasStore';
import { expectButtonActive, expectButtonInactive, expectButtonAccessible } from './test-helpers';

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;

describe('CanvasToolbar', () => {
  const mockOnFitView = vi.fn();
  const mockOnAutoLayout = vi.fn();
  const mockOnToggleSettings = vi.fn();

  beforeEach(() => {
    resetTestStores();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render primary toolbar buttons', () => {
      renderWithAppProviders(<CanvasToolbar />);

      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /animations/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });
  });

  describe('Mode Toggle Interactions', () => {
    const modeScenarios = [
      { mode: 'select', label: /select/i, aria: 'Select (V)' },
      { mode: 'quick-connect', label: /quick connect/i, aria: 'Quick Connect (Q)' },
      { mode: 'pan', label: /pan/i, aria: 'Pan (Space)' },
      { mode: 'annotation', label: /annotate/i, aria: 'Annotate (A)' },
    ] as const;

    test.each(modeScenarios)('should set canvas mode to %s when button clicked', ({ mode, label }) => {
      renderWithAppProviders(<CanvasToolbar />);

      const button = screen.getByRole('button', { name: label });
      fireEvent.click(button);

      expect(useCanvasStore.getState().canvasMode).toBe(mode);
    });

    test.each(modeScenarios)('should show active state when mode is %s', ({ mode, label }) => {
      useCanvasStore.getState().setCanvasMode(mode);
      renderWithAppProviders(<CanvasToolbar />);

      const button = screen.getByRole('button', { name: label });
      expectButtonActive(button);
    });

    it('should clear quick connect state when switching away from quick-connect', () => {
      useCanvasStore.getState().setCanvasMode('quick-connect');
      useCanvasStore.getState().setQuickConnectSource('comp-1');

      renderWithAppProviders(<CanvasToolbar />);
      const selectButton = screen.getByRole('button', { name: /select/i });
      fireEvent.click(selectButton);

      expect(useCanvasStore.getState().quickConnectSource).toBeNull();
    });
  });

  describe('View Control Interactions', () => {
    const viewControls: Array<{
      name: string;
      label: RegExp;
      aria: string;
      toggle: () => void;
      selector: (state: CanvasStoreState) => boolean;
    }> = [
      {
        name: 'grid',
        label: /grid/i,
        aria: 'Grid',
        toggle: () => useCanvasStore.getState().toggleGrid(),
        selector: (state) => state.gridEnabled,
      },
      {
        name: 'snap',
        label: /snap/i,
        aria: 'Snap',
        toggle: () => useCanvasStore.getState().toggleSnapToGrid(),
        selector: (state) => state.snapToGrid,
      },
      {
        name: 'minimap',
        label: /minimap/i,
        aria: 'Minimap',
        toggle: () => useCanvasStore.getState().toggleMinimap(),
        selector: (state) => state.showMinimap,
      },
    ];

    test.each(viewControls)('should toggle %s when button clicked', ({ label, toggle, selector }) => {
      const initial = selector(useCanvasStore.getState());
      renderWithAppProviders(<CanvasToolbar />);

      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(selector(useCanvasStore.getState())).toBe(!initial);

      toggle();
    });

    test.each(viewControls)('should show active state when %s is enabled', ({ label, toggle, selector }) => {
      const state = useCanvasStore.getState();
      if (!selector(state)) {
        toggle();
      }

      renderWithAppProviders(<CanvasToolbar />);

      const button = screen.getByRole('button', { name: label });
      expectButtonActive(button);
    });

    test.each(viewControls)('should show inactive state when %s is disabled', ({ label, toggle, selector }) => {
      const state = useCanvasStore.getState();
      if (selector(state)) {
        toggle();
      }

      renderWithAppProviders(<CanvasToolbar />);

      const button = screen.getByRole('button', { name: label });
      expectButtonInactive(button);
    });
  });

  describe('Animation Control', () => {
    it('should toggle animations when button clicked', () => {
      const initial = useCanvasStore.getState().animationsEnabled;
      renderWithAppProviders(<CanvasToolbar />);

      fireEvent.click(screen.getByRole('button', { name: /animations/i }));
      expect(useCanvasStore.getState().animationsEnabled).toBe(!initial);
    });

    it('should show correct visual state based on store value', () => {
      if (!useCanvasStore.getState().animationsEnabled) {
        useCanvasStore.getState().toggleAnimations();
      }

      renderWithAppProviders(<CanvasToolbar />);

      expectButtonActive(screen.getByRole('button', { name: /animations/i }));

      useCanvasStore.getState().toggleAnimations();
      renderWithAppProviders(<CanvasToolbar />);

      expectButtonInactive(screen.getByRole('button', { name: /animations/i }));
    });
  });

  describe('Action Buttons', () => {
    it('should call onFitView when Fit View button clicked', () => {
      renderWithAppProviders(<CanvasToolbar onFitView={mockOnFitView} />);
      fireEvent.click(screen.getByRole('button', { name: /fit view/i }));
      expect(mockOnFitView).toHaveBeenCalledTimes(1);
    });

    it('should call onAutoLayout when Auto Layout button clicked', () => {
      renderWithAppProviders(<CanvasToolbar onAutoLayout={mockOnAutoLayout} />);
      fireEvent.click(screen.getByRole('button', { name: /auto layout/i }));
      expect(mockOnAutoLayout).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleSettings when Settings button clicked', () => {
      renderWithAppProviders(<CanvasToolbar onToggleSettings={mockOnToggleSettings} />);
      fireEvent.click(screen.getByRole('button', { name: /settings/i }));
      expect(mockOnToggleSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Primary Action Styling', () => {
    it('should render Quick Add with primary action styling', () => {
      renderWithAppProviders(<CanvasToolbar />);
      const quickAddButton = screen.getByRole('button', { name: /quick add/i });

      // Check that button has primary action classes
      expect(quickAddButton).toHaveClass('w-11', 'h-11', 'shadow-lg');
    });

    it('should render Quick Connect with primary action styling', () => {
      renderWithAppProviders(<CanvasToolbar />);
      const quickConnectButton = screen.getByRole('button', { name: /quick connect/i });

      // Check that button has primary action classes
      expect(quickConnectButton).toHaveClass('w-11', 'h-11', 'shadow-lg');
    });

    it('should display keyboard shortcut badges on primary actions', () => {
      renderWithAppProviders(<CanvasToolbar />);
      const quickAddButton = screen.getByRole('button', { name: /quick add/i });
      const quickConnectButton = screen.getByRole('button', { name: /quick connect/i });

      // Check for shortcut badges
      expect(quickAddButton.querySelector('span')).toHaveTextContent('/');
      expect(quickConnectButton.querySelector('span')).toHaveTextContent('Q');
    });
  });

  describe('Section Help Buttons', () => {
    const mockOnShowHelp = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render help buttons in toolbar sections', () => {
      renderWithAppProviders(<CanvasToolbar onShowHelp={mockOnShowHelp} />);

      // Look for help buttons by their aria-label pattern
      const helpButtons = screen.getAllByRole('button', { name: /show help for/i });
      expect(helpButtons.length).toBeGreaterThan(0);
    });

    it('should call onShowHelp with section name when help button clicked', () => {
      renderWithAppProviders(<CanvasToolbar onShowHelp={mockOnShowHelp} />);

      const canvasModesHelp = screen.getByRole('button', { name: /show help for canvas modes/i });
      fireEvent.click(canvasModesHelp);

      expect(mockOnShowHelp).toHaveBeenCalledWith('Canvas Modes');
    });

    it('should dispatch custom event when no onShowHelp handler provided', () => {
      const eventSpy = vi.fn();
      window.addEventListener('open-keyboard-shortcuts', eventSpy);

      renderWithAppProviders(<CanvasToolbar />);
      const helpButton = screen.getAllByRole('button', { name: /show help for/i })[0];
      fireEvent.click(helpButton);

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('open-keyboard-shortcuts', eventSpy);
    });
  });

  describe('Keyboard Shortcuts Hint', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should show shortcuts hint on first visit', () => {
      renderWithAppProviders(<CanvasToolbar />);

      // Check for hint text
      expect(screen.getByText(/press/i)).toBeInTheDocument();
      expect(screen.getByText(/to see all shortcuts/i)).toBeInTheDocument();
    });

    it('should auto-dismiss shortcuts hint after timeout', async () => {
      vi.useFakeTimers();
      renderWithAppProviders(<CanvasToolbar />);

      expect(screen.getByText(/to see all shortcuts/i)).toBeInTheDocument();

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      await vi.waitFor(() => {
        expect(screen.queryByText(/to see all shortcuts/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should not show hint if previously dismissed', () => {
      localStorage.setItem('archicomm_shortcuts_hint_dismissed', '1');

      renderWithAppProviders(<CanvasToolbar />);

      expect(screen.queryByText(/to see all shortcuts/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const accessibilityScenarios: Array<{ label: RegExp; aria: string; title?: string }> = [
      { label: /select/i, aria: 'Select (V)', title: 'Select mode - Click to select components' },
      { label: /quick connect/i, aria: 'Quick Connect (Q)', title: 'Quick connect - Click source, then target' },
      { label: /pan/i, aria: 'Pan (Space)', title: 'Pan mode - Drag to move canvas' },
      { label: /annotate/i, aria: 'Annotate (A)', title: 'Annotation mode - Add notes to canvas' },
      { label: /grid/i, aria: 'Grid', title: 'Toggle grid visibility' },
      { label: /snap/i, aria: 'Snap', title: 'Snap components to grid' },
      { label: /minimap/i, aria: 'Minimap', title: 'Toggle minimap' },
      { label: /animations/i, aria: 'Animations' },
    ];

    test.each(accessibilityScenarios)('should provide accessible metadata for %s button', ({ label, aria, title }) => {
      renderWithAppProviders(<CanvasToolbar />);
      const button = screen.getByRole('button', { name: label });
      expectButtonAccessible(button, aria, title);
    });
  });

  describe('Integration with Store', () => {
    it('should reflect existing store preferences', () => {
      useCanvasStore.setState({
        canvasMode: 'pan',
        gridEnabled: true,
        animationsEnabled: true,
      });

      renderWithAppProviders(<CanvasToolbar />);

      expectButtonActive(screen.getByRole('button', { name: /pan/i }));
      expectButtonActive(screen.getByRole('button', { name: /grid/i }));
      expectButtonActive(screen.getByRole('button', { name: /animations/i }));
    });
  });

  describe('Edge Cases', () => {
    it('should remain in mode when clicking active button repeatedly', () => {
      renderWithAppProviders(<CanvasToolbar />);

      const selectButton = screen.getByRole('button', { name: /select/i });
      fireEvent.click(selectButton);
      fireEvent.click(selectButton);

      expect(useCanvasStore.getState().canvasMode).toBe('select');
    });
  });
});
