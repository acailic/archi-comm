import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationToolbar } from '../../packages/ui/components/canvas/AnnotationToolbar';
import type { AnnotationTool } from '../../packages/ui/components/canvas/AnnotationToolbar';
import { expectButtonActive, expectButtonAccessible } from './test-helpers';

describe('AnnotationToolbar', () => {
  const mockOnToolSelect = vi.fn();

  const renderToolbar = (selectedTool: AnnotationTool = null, count?: number) =>
    render(
      <AnnotationToolbar
        selectedTool={selectedTool}
        onToolSelect={mockOnToolSelect}
        annotationCount={count}
      />,
    );

  const expectBadgeVisible = (count: number) => {
    expect(screen.getByText(count.toString())).toBeInTheDocument();
  };

  const expectBadgeHidden = () => {
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should expose toolbar landmark and buttons', () => {
      renderToolbar();

      expect(screen.getByRole('toolbar', { name: 'Annotation tools' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Comment' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear annotation tool selection/i })).toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    const toolScenarios = [
      { tool: 'comment', label: 'Comment', activeClass: 'bg-amber-200' },
      { tool: 'note', label: 'Note', activeClass: 'bg-blue-200' },
      { tool: 'label', label: 'Label', activeClass: 'bg-green-200' },
      { tool: 'arrow', label: 'Arrow', activeClass: 'bg-gray-200' },
      { tool: 'highlight', label: 'Highlight', activeClass: 'bg-yellow-200' },
    ] as const;

    test.each(toolScenarios)('should call onToolSelect with "%s" when %s clicked', ({ tool, label }) => {
      renderToolbar();

      fireEvent.click(screen.getByRole('button', { name: label }));

      expect(mockOnToolSelect).toHaveBeenCalledWith(tool);
      expect(mockOnToolSelect).toHaveBeenCalledTimes(1);
    });

    test.each(toolScenarios)('should show active state for %s tool', ({ tool, label, activeClass }) => {
      renderToolbar(tool);

      const button = screen.getByRole('button', { name: label });
      expectButtonActive(button, { activeClass });
    });

    it('should toggle off current tool when clicked again', () => {
      renderToolbar('comment');

      const commentButton = screen.getByRole('button', { name: 'Comment' });
      fireEvent.click(commentButton);

      expect(mockOnToolSelect).toHaveBeenCalledWith(null);
    });

    it('should only mark one tool as active at a time', () => {
      renderToolbar('comment');

      expect(screen.getByRole('button', { name: 'Comment' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Note' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Clear Selection', () => {
    it('should clear selection when button clicked', () => {
      renderToolbar('label');

      fireEvent.click(screen.getByRole('button', { name: /clear annotation tool selection/i }));
      expect(mockOnToolSelect).toHaveBeenCalledWith(null);
    });

    it('should disable clear button when no tool selected', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /clear annotation tool selection/i })).toBeDisabled();
    });
  });

  describe('Annotation Count Badge', () => {
    it('should hide badge when count is zero', () => {
      renderToolbar(null, 0);
      expectBadgeHidden();
    });

    it('should display badge with correct count when annotations exist', () => {
      renderToolbar(null, 5);
      expectBadgeVisible(5);
      expect(screen.getByTitle('5 annotations')).toBeInTheDocument();
    });

    it('should use singular tooltip when count is one', () => {
      renderToolbar(null, 1);
      expectBadgeVisible(1);
      expect(screen.getByTitle('1 annotation')).toBeInTheDocument();
    });

    it('should support large counts', () => {
      const LARGE_COUNT = 9999;
      renderToolbar(null, LARGE_COUNT);
      expectBadgeVisible(LARGE_COUNT);
    });
  });

  describe('Accessibility', () => {
    const accessibilityScenarios = [
      { label: 'Comment', title: 'Add a sticky note comment (C)' },
      { label: 'Note', title: 'Add a note annotation (N)' },
      { label: 'Label', title: 'Add a label tag (L)' },
      { label: 'Arrow', title: 'Draw an arrow with optional label (A)' },
      { label: 'Highlight', title: 'Highlight an area (H)' },
    ];

    test.each(accessibilityScenarios)('should provide aria-label and title for %s button', ({ label, title }) => {
      renderToolbar();
      const button = screen.getByRole('button', { name: label });
      expectButtonAccessible(button, label, title);
    });
  });

  describe('Visual Styling', () => {
    const visualScenarios = [
      { label: 'Comment', inactiveClass: 'bg-amber-50' },
      { label: 'Note', inactiveClass: 'bg-blue-50' },
      { label: 'Label', inactiveClass: 'bg-green-50' },
      { label: 'Arrow', inactiveClass: 'bg-gray-50' },
      { label: 'Highlight', inactiveClass: 'bg-yellow-50' },
    ];

    test.each(visualScenarios)('should apply color scheme for %s button', ({ label, inactiveClass }) => {
      renderToolbar();
      expect(screen.getByRole('button', { name: label })).toHaveClass(inactiveClass);
    });
  });

  describe('Edge Cases', () => {
    it('should not change tool when toolbar re-renders with same selection', () => {
      const { rerender } = renderToolbar('note');
      rerender(
        <AnnotationToolbar selectedTool="note" onToolSelect={mockOnToolSelect} annotationCount={0} />,
      );

      expect(screen.getByRole('button', { name: 'Note' })).toHaveAttribute('aria-pressed', 'true');
      expect(mockOnToolSelect).not.toHaveBeenCalled();
    });
  });
});
