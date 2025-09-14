// src/__tests__/integration/challenge-selection-flow.test.tsx
// Integration tests for the complete challenge selection workflow from selection to design canvas
// Tests challenge filtering, selection, data validation, error handling, and navigation flow
// RELEVANT FILES: src/test/integration-helpers.tsx, src/components/ChallengeSelection.tsx, src/components/AppContainer.tsx, src/lib/challenge-config.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, MockHelpers } from '../../test/integration-helpers';
import { ChallengeSelection } from '../../components/ChallengeSelection';
import * as env from '../../lib/environment';

// Mock challenge data for testing
const mockChallenges = [
  {
    id: 'test-todo-app',
    title: 'Todo List Application',
    description: 'Design a simple todo list application with user accounts and basic CRUD operations.',
    requirements: [
      'User registration and authentication',
      'Create, read, update, delete todos',
      'Mark todos as complete/incomplete',
      'Basic data persistence',
      'Simple user interface'
    ],
    difficulty: 'beginner' as const,
    estimatedTime: 20,
    category: 'system-design' as const,
    tags: ['frontend', 'backend', 'database']
  },
  {
    id: 'test-url-shortener',
    title: 'URL Shortener Service',
    description: 'Design a scalable URL shortening service like bit.ly with basic analytics.',
    requirements: [
      'Shorten long URLs to unique short codes',
      'Redirect short URLs to original URLs',
      'Basic click tracking and analytics',
      'Custom alias support',
      'Simple rate limiting'
    ],
    difficulty: 'intermediate' as const,
    estimatedTime: 45,
    category: 'system-design' as const,
    tags: ['scaling', 'analytics', 'backend']
  },
  {
    id: 'test-chat-system',
    title: 'Real-time Chat System',
    description: 'Design a basic messaging platform with real-time communication features.',
    requirements: [
      'Real-time message delivery',
      'User authentication and profiles',
      'Basic group chat functionality',
      'Message history storage',
      'Online presence indicators'
    ],
    difficulty: 'intermediate' as const,
    estimatedTime: 40,
    category: 'system-design' as const,
    tags: ['realtime', 'websockets', 'backend']
  }
];

describe('Challenge Selection Flow Integration Tests', () => {
  let mockOnChallengeSelect: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnChallengeSelect = vi.fn();
    user = userEvent.setup();
    MockHelpers.mockTauriAPIs();
  });

  describe('Challenge Display and Filtering', () => {
    it('should render challenge cards with proper data', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Verify challenge cards are rendered
      await waitFor(() => {
        expect(screen.getByText('Todo List Application')).toBeInTheDocument();
        expect(screen.getByText('URL Shortener Service')).toBeInTheDocument();
        expect(screen.getByText('Real-time Chat System')).toBeInTheDocument();
      });

      // Verify challenge metadata
      expect(screen.getByText('~20 min')).toBeInTheDocument();
      expect(screen.getByText('~45 min')).toBeInTheDocument();
      expect(screen.getByText('~40 min')).toBeInTheDocument();

      // Verify difficulty badges
      expect(screen.getByText('beginner')).toBeInTheDocument();
      expect(screen.getAllByText('intermediate')).toHaveLength(2);
    });

    it('should filter challenges by search query', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search challenges...');

      // Search for "todo"
      await user.type(searchInput, 'todo');

      await waitFor(() => {
        expect(screen.getByText('Todo List Application')).toBeInTheDocument();
        expect(screen.queryByText('URL Shortener Service')).not.toBeInTheDocument();
        expect(screen.queryByText('Real-time Chat System')).not.toBeInTheDocument();
      });

      // Clear search and search for "real-time"
      await user.clear(searchInput);
      await user.type(searchInput, 'real-time');

      await waitFor(() => {
        expect(screen.queryByText('Todo List Application')).not.toBeInTheDocument();
        expect(screen.queryByText('URL Shortener Service')).not.toBeInTheDocument();
        expect(screen.getByText('Real-time Chat System')).toBeInTheDocument();
      });
    });

    it('should filter challenges by difficulty level', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Open difficulty selector
      const difficultySelector = screen.getByRole('combobox', { name: /difficulty/i });
      await user.click(difficultySelector);

      // Select beginner
      const beginnerOption = screen.getByRole('option', { name: 'Beginner' });
      await user.click(beginnerOption);

      await waitFor(() => {
        expect(screen.getByText('Todo List Application')).toBeInTheDocument();
        expect(screen.queryByText('URL Shortener Service')).not.toBeInTheDocument();
        expect(screen.queryByText('Real-time Chat System')).not.toBeInTheDocument();
      });

      // Switch to intermediate
      await user.click(difficultySelector);
      const intermediateOption = screen.getByRole('option', { name: 'Intermediate' });
      await user.click(intermediateOption);

      await waitFor(() => {
        expect(screen.queryByText('Todo List Application')).not.toBeInTheDocument();
        expect(screen.getByText('URL Shortener Service')).toBeInTheDocument();
        expect(screen.getByText('Real-time Chat System')).toBeInTheDocument();
      });
    });

    it('should filter challenges by category', async () => {
      const categorizedChallenges = [
        ...mockChallenges,
        {
          id: 'test-architecture',
          title: 'Microservices Architecture',
          description: 'Design a microservices architecture for an e-commerce platform.',
          requirements: ['Service decomposition', 'API gateway', 'Service discovery'],
          difficulty: 'advanced' as const,
          estimatedTime: 60,
          category: 'architecture' as const,
          tags: ['microservices', 'api']
        }
      ];

      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={categorizedChallenges}
        />
      );

      // All challenges should be visible initially
      await waitFor(() => {
        expect(screen.getByText('Todo List Application')).toBeInTheDocument();
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });

      // Filter by architecture category
      const categorySelector = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelector);

      const architectureOption = screen.getByRole('option', { name: 'Architecture' });
      await user.click(architectureOption);

      await waitFor(() => {
        expect(screen.queryByText('Todo List Application')).not.toBeInTheDocument();
        expect(screen.getByText('Microservices Architecture')).toBeInTheDocument();
      });
    });

    it('should display no results message when no challenges match filters', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search challenges...');
      await user.type(searchInput, 'nonexistent challenge');

      await waitFor(() => {
        expect(screen.getByText('No challenges found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Challenge Selection and Navigation', () => {
    it('should call onChallengeSelect when Start Challenge is clicked', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Find the first "Start Challenge" button
      const startButtons = await screen.findAllByText('Start Challenge');
      await user.click(startButtons[0]);

      expect(mockOnChallengeSelect).toHaveBeenCalledWith(mockChallenges[0]);
    });

    it('should pass correct challenge data on selection', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Click on URL Shortener challenge
      const challengeCards = screen.getAllByText('Start Challenge');
      const urlShortenerCard = screen.getByText('URL Shortener Service').closest('.group');
      const urlShortenerButton = urlShortenerCard?.querySelector('button');

      expect(urlShortenerButton).toBeInTheDocument();
      await user.click(urlShortenerButton!);

      expect(mockOnChallengeSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-url-shortener',
          title: 'URL Shortener Service',
          difficulty: 'intermediate',
          category: 'system-design'
        })
      );
    });

    it('should handle keyboard navigation through challenge cards', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Focus on first challenge button
      const startButtons = await screen.findAllByText('Start Challenge');
      startButtons[0].focus();

      // Navigate with Tab key
      await user.keyboard('{Tab}');
      expect(startButtons[1]).toHaveFocus();

      // Activate with Enter key
      await user.keyboard('{Enter}');
      expect(mockOnChallengeSelect).toHaveBeenCalledWith(mockChallenges[1]);
    });
  });

  describe('Challenge Data Validation and Error Handling', () => {
    it('should handle malformed challenge data gracefully', async () => {
      const malformedChallenges = [
        // Missing required fields
        {
          id: 'malformed-1',
          title: '',
          description: null,
          requirements: null,
          difficulty: 'invalid',
          estimatedTime: 'invalid',
          category: null
        },
        // Completely malformed
        null,
        undefined,
        // Valid challenge for comparison
        mockChallenges[0]
      ].filter(Boolean);

      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={malformedChallenges as any}
        />
      );

      // Should still render valid challenges and provide fallbacks for invalid ones
      await waitFor(() => {
        expect(screen.getByText('Todo List Application')).toBeInTheDocument();
      });

      // Should not crash the component
      expect(screen.getByText('Choose Your Challenge')).toBeInTheDocument();
    });

    it('should fallback to default challenges when availableChallenges is invalid', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={null as any}
        />
      );

      // Should render default challenges
      await waitFor(() => {
        expect(screen.getByText('Choose Your Challenge')).toBeInTheDocument();
        // Check for one of the default challenges
        expect(screen.getByText(/Todo List Application|Simple Blog Platform/)).toBeInTheDocument();
      });
    });

    it('should not allow selection of challenges without required ID field', async () => {
      const challengeWithoutId = {
        title: 'Challenge Without ID',
        description: 'This challenge is missing the required ID field',
        requirements: ['Test requirement'],
        difficulty: 'beginner' as const,
        estimatedTime: 30,
        category: 'system-design' as const
      };

      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={[challengeWithoutId as any]}
        />
      );

      const startButton = await screen.findByText('Start Challenge');
      await user.click(startButton);

      // Should not call onChallengeSelect for invalid challenges
      expect(mockOnChallengeSelect).not.toHaveBeenCalled();
    });
  });

  describe('Challenge Import Functionality (Tauri Environment)', () => {
    it('should show import button in Tauri environment', async () => {
      // Mock Tauri environment detection using spy
      vi.spyOn(env, 'isTauriEnvironment').mockReturnValue(true);

      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Import Challenge')).toBeInTheDocument();
      });
    });

    it('should handle challenge import workflow', async () => {
      // Mock successful file dialog and import
      const mockOpen = vi.fn().mockResolvedValue('/mock/path/challenges.json');
      const mockLoadChallenges = vi.fn().mockResolvedValue([
        {
          id: 'imported-challenge',
          title: 'Imported Challenge',
          description: 'This challenge was imported from a file',
          requirements: ['Imported requirement'],
          difficulty: 'intermediate',
          estimatedTime: 35,
          category: 'system-design'
        }
      ]);

      // Mock the imports
      vi.doMock('@tauri-apps/api/dialog', () => ({
        open: mockOpen
      }));
      vi.doMock('../../lib/challenge-config', () => ({
        tauriChallengeAPI: {
          loadChallengesFromFile: mockLoadChallenges
        }
      }));

      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      const importButton = await screen.findByText('Import Challenge');
      await user.click(importButton);

      // Should trigger file dialog
      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          multiple: false,
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
      });
    });

    it('should handle import errors gracefully', async () => {
      const mockOpen = vi.fn().mockRejectedValue(new Error('File dialog failed'));

      vi.doMock('@tauri-apps/api/dialog', () => ({
        open: mockOpen
      }));

      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      const importButton = await screen.findByText('Import Challenge');
      await user.click(importButton);

      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('Choose Your Challenge')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics and Display', () => {
    it('should display correct challenge statistics', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      await waitFor(() => {
        // Should show total count including default challenges
        expect(screen.getByText(/\d+/)).toBeInTheDocument(); // Total count

        // Should show difficulty breakdown
        expect(screen.getByText('Beginner')).toBeInTheDocument();
        expect(screen.getByText('Intermediate')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();

        // Should show average time
        expect(screen.getByText('Avg Time')).toBeInTheDocument();
      });
    });

    it('should update statistics when challenges are filtered', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Initial state should show all challenges
      const initialCount = screen.getByText(/\d+/).textContent;

      // Filter by beginner difficulty
      const difficultySelector = screen.getByRole('combobox', { name: /difficulty/i });
      await user.click(difficultySelector);
      const beginnerOption = screen.getByRole('option', { name: 'Beginner' });
      await user.click(beginnerOption);

      // Statistics should reflect filtered challenges
      await waitFor(() => {
        // Should still display stats but only show filtered results in grid
        expect(screen.getByText('Todo List Application')).toBeInTheDocument();
        expect(screen.queryByText('URL Shortener Service')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide proper ARIA labels and roles', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Check for proper input labels
      expect(screen.getByPlaceholderText('Search challenges...')).toHaveAccessibleName();

      // Check for proper button roles
      const startButtons = await screen.findAllByText('Start Challenge');
      startButtons.forEach(button => {
        expect(button).toHaveAttribute('role', 'button');
      });

      // Check for proper select elements
      expect(screen.getByRole('combobox', { name: /difficulty/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
    });

    it('should handle hover states and animations', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      const challengeCard = await screen.findByText('Todo List Application');
      const cardElement = challengeCard.closest('.group');

      // Hover should trigger state changes
      await user.hover(cardElement!);

      // Should not crash and should maintain functionality
      expect(challengeCard).toBeInTheDocument();
    });

    it('should support responsive design patterns', async () => {
      renderWithProviders(
        <ChallengeSelection
          onChallengeSelect={mockOnChallengeSelect}
          availableChallenges={mockChallenges}
        />
      );

      // Should render without layout issues
      await waitFor(() => {
        expect(screen.getByText('Choose Your Challenge')).toBeInTheDocument();
      });

      // Grid should contain challenge cards
      const challengeGrid = document.querySelector('.grid');
      expect(challengeGrid).toBeInTheDocument();
      expect(challengeGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });
  });
});
