import React from 'react';
import { ChallengeSelection } from '@ui/components/ChallengeSelection';
import { mockChallenges } from '../testData';

export const challengeSelectionScenarios = {
  'Challenge Selection': {
    id: 'challenge-selection',
    name: 'Challenge Selection',
    scenarios: [
      {
        id: 'empty-state',
        name: 'Empty State',
        description: 'No challenges available to display',
        component: () =>
          React.createElement(ChallengeSelection, {
            availableChallenges: [],
            onChallengeSelect: (challenge: any) =>
              console.log('Selected challenge:', challenge),
          }),
        documentation: {
          summary: 'Use when there are no challenges to present yet.',
          whenToUse: ['Initial load when no data exists', 'After filters remove all results'],
          whenNotToUse: ['While loading; prefer skeletons or loading state'],
          usageExamples: [
            {
              title: 'Simple Empty State',
              description: 'Render an empty state with contextual help.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: '<ChallengeSelection challenges={[]} isLoading={false} error={null} onChallengeSelect={() => {}} />',
              },
            },
          ],
          bestPractices: [
            'Provide a clear call-to-action (e.g., refresh, adjust filters)',
            'Include concise explanatory text',
          ],
          accessibility: {
            aria: ['Role=region with label for context'],
            keyboard: ['Ensure focus management does not trap users'],
            screenReader: ['Announce empty state clearly'],
          },
        },
      },
      {
        id: 'loading-state',
        name: 'Loading State',
        description: 'Loading challenges from server',
        component: () =>
          React.createElement(ChallengeSelection, {
            availableChallenges: [],
            onChallengeSelect: (challenge: any) =>
              console.log('Selected challenge:', challenge),
          }),
        documentation: {
          summary: 'Displays skeletons or spinners while fetching challenges.',
          whenToUse: ['Fetching data asynchronously'],
          usageExamples: [
            {
              title: 'Loading Indicator',
              description: 'Show a non-blocking loading state.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: '<ChallengeSelection challenges={[]} isLoading error={null} onChallengeSelect={() => {}} />',
              },
            },
          ],
          bestPractices: [
            'Avoid content layout shifts by reserving space',
            'Do not block keyboard navigation',
          ],
          performance: { considerations: ['Keep spinners light and idle-friendly'] },
        },
      },
      {
        id: 'populated-state',
        name: 'Populated State',
        description: 'Display list of available challenges with different difficulties',
        component: () =>
          React.createElement(ChallengeSelection, {
            availableChallenges: mockChallenges,
            onChallengeSelect: (challenge: any) =>
              console.log('Selected challenge:', challenge),
          }),
        documentation: {
          summary: 'List of challenges with filtering and selection.',
          usageExamples: [
            {
              title: 'Basic List',
              description: 'Show challenges with click handlers.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: '<ChallengeSelection challenges={mockChallenges} isLoading={false} error={null} onChallengeSelect={id => console.log(id)} />',
              },
            },
          ],
          bestPractices: [
            'Use consistent visual density',
            'Support keyboard selection and focus outlines',
          ],
        },
      },
      {
        id: 'error-state',
        name: 'Error State',
        description: 'Error occurred while loading challenges',
        component: () =>
          React.createElement(ChallengeSelection, {
            availableChallenges: [],
            onChallengeSelect: (challenge: any) =>
              console.log('Selected challenge:', challenge),
          }),
        documentation: {
          summary: 'Friendly error with guidance and retry affordance.',
          usageExamples: [
            {
              title: 'Inline Error',
              description: 'Render a retry button with error context.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: '<ChallengeSelection challenges={[]} isLoading={false} error="Network error" onChallengeSelect={() => {}} />',
              },
            },
          ],
          bestPractices: [
            'Keep messages actionable and concise',
            'Preserve prior inputs or filters when possible',
          ],
          accessibility: { screenReader: ['Announce errors via aria-live=polite'] },
        },
      },
      {
        id: 'filtered-state',
        name: 'Filtered State',
        description: 'Show only beginner level challenges',
        component: () =>
          React.createElement(ChallengeSelection, {
            availableChallenges: mockChallenges.filter(c => c.difficulty === 'beginner'),
            onChallengeSelect: (challenge: any) =>
              console.log('Selected challenge:', challenge),
          }),
        documentation: {
          summary: 'Filter controls applied to refine results.',
          patterns: ['Filter chips', 'Clear filters button'],
          bestPractices: [
            'Reflect active filters in UI',
            'Announce filter changes for assistive tech',
          ],
        },
      },
    ],
  },
};