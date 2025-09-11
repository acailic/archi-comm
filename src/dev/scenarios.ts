// src/dev/scenarios.ts
// Scenario definitions for testing ArchiComm components in isolation using comprehensive mock data
// Provides realistic component scenarios for development and testing purposes, including comprehensive UI component library coverage
// RELEVANT FILES: ./testData.ts, ../components/ChallengeSelection.tsx, ../components/CanvasArea.tsx, ../components/AudioRecording.tsx, ../components/ui/*

import React from 'react';
import { z } from 'zod';
import { ChallengeSelection } from '../components/ChallengeSelection';
import { CanvasArea } from '../components/CanvasArea';
import { AudioRecording } from '../components/AudioRecording';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import type { EnhancedScenarioDefinition, ControlsConfig } from './types';
import { 
  mockChallenges, 
  mockCanvasStates, 
  mockAudioStates,
  mockUIComponentData
} from './testData';

// Button props validation schema
const buttonPropsSchema = z.object({
  variant: z.enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']).optional(),
  size: z.enum(['default', 'sm', 'lg', 'icon']).optional(),
  disabled: z.boolean().optional(),
  asChild: z.boolean().optional(),
  children: z.string().optional(),
});

// Card props validation schema
const cardPropsSchema = z.object({
  className: z.string().optional(),
  children: z.any().optional(),
});

// Input props validation schema
const inputPropsSchema = z.object({
  type: z.enum(['text', 'email', 'password', 'number', 'file', 'tel', 'url']).optional(),
  placeholder: z.string().optional(),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
  defaultValue: z.string().optional(),
});

// Button controls configuration
const buttonControls: ControlsConfig = {
  variant: {
    type: 'select',
    label: 'Variant',
    description: 'Button visual variant',
    defaultValue: 'default',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'destructive', label: 'Destructive' },
      { value: 'outline', label: 'Outline' },
      { value: 'secondary', label: 'Secondary' },
      { value: 'ghost', label: 'Ghost' },
      { value: 'link', label: 'Link' },
    ],
    validation: buttonPropsSchema.shape.variant,
  },
  size: {
    type: 'select',
    label: 'Size',
    description: 'Button size',
    defaultValue: 'default',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'sm', label: 'Small' },
      { value: 'lg', label: 'Large' },
      { value: 'icon', label: 'Icon' },
    ],
    validation: buttonPropsSchema.shape.size,
  },
  disabled: {
    type: 'boolean',
    label: 'Disabled',
    description: 'Disable button interaction',
    defaultValue: false,
    validation: buttonPropsSchema.shape.disabled,
  },
  children: {
    type: 'text',
    label: 'Text Content',
    description: 'Button text content',
    defaultValue: 'Button',
    placeholder: 'Enter button text...',
    validation: buttonPropsSchema.shape.children,
  },
};

// Input controls configuration
const inputControls: ControlsConfig = {
  type: {
    type: 'select',
    label: 'Input Type',
    description: 'HTML input type',
    defaultValue: 'text',
    options: [
      { value: 'text', label: 'Text' },
      { value: 'email', label: 'Email' },
      { value: 'password', label: 'Password' },
      { value: 'number', label: 'Number' },
      { value: 'file', label: 'File' },
      { value: 'tel', label: 'Telephone' },
      { value: 'url', label: 'URL' },
    ],
    validation: inputPropsSchema.shape.type,
  },
  placeholder: {
    type: 'text',
    label: 'Placeholder',
    description: 'Placeholder text',
    defaultValue: '',
    placeholder: 'Enter placeholder...',
    validation: inputPropsSchema.shape.placeholder,
  },
  disabled: {
    type: 'boolean',
    label: 'Disabled',
    description: 'Disable input interaction',
    defaultValue: false,
    validation: inputPropsSchema.shape.disabled,
  },
  required: {
    type: 'boolean',
    label: 'Required',
    description: 'Mark input as required',
    defaultValue: false,
    validation: inputPropsSchema.shape.required,
  },
  defaultValue: {
    type: 'text',
    label: 'Default Value',
    description: 'Default input value',
    defaultValue: '',
    placeholder: 'Enter default value...',
    validation: inputPropsSchema.shape.defaultValue,
  },
};

// Scenario definitions using comprehensive mock data with interactive controls
export const scenarios: EnhancedScenarioDefinition = {
  'Challenge Selection': {
    id: 'challenge-selection',
    name: 'Challenge Selection',
    scenarios: [
      {
        id: 'empty-state',
        name: 'Empty State',
        description: 'No challenges available to display',
        component: () => React.createElement(ChallengeSelection, {
          challenges: [],
          isLoading: false,
          error: null,
          onChallengeSelect: (challengeId: string) => console.log('Selected challenge:', challengeId)
        }),
        documentation: {
          summary: 'Use when there are no challenges to present yet.',
          whenToUse: [
            'Initial load when no data exists',
            'After filters remove all results'
          ],
          whenNotToUse: [
            'While loading; prefer skeletons or loading state'
          ],
          usageExamples: [
            {
              title: 'Simple Empty State',
              description: 'Render an empty state with contextual help.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: "<ChallengeSelection challenges={[]} isLoading={false} error={null} onChallengeSelect={() => {}} />"
              }
            }
          ],
          bestPractices: [
            'Provide a clear call-to-action (e.g., refresh, adjust filters)',
            'Include concise explanatory text'
          ],
          accessibility: {
            aria: ['Role=region with label for context'],
            keyboard: ['Ensure focus management does not trap users'],
            screenReader: ['Announce empty state clearly']
          }
        }
      },
      {
        id: 'loading-state',
        name: 'Loading State',
        description: 'Loading challenges from server',
        component: () => React.createElement(ChallengeSelection, {
          challenges: [],
          isLoading: true,
          error: null,
          onChallengeSelect: (challengeId: string) => console.log('Selected challenge:', challengeId)
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
                code: "<ChallengeSelection challenges={[]} isLoading error={null} onChallengeSelect={() => {}} />"
              }
            }
          ],
          bestPractices: [
            'Avoid content layout shifts by reserving space',
            'Do not block keyboard navigation'
          ],
          performance: { considerations: ['Keep spinners light and idle-friendly'] }
        }
      },
      {
        id: 'populated-state',
        name: 'Populated State',
        description: 'Display list of available challenges with different difficulties',
        component: () => React.createElement(ChallengeSelection, {
          challenges: mockChallenges,
          isLoading: false,
          error: null,
          onChallengeSelect: (challengeId: string) => console.log('Selected challenge:', challengeId)
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
                code: "<ChallengeSelection challenges={mockChallenges} isLoading={false} error={null} onChallengeSelect={id => console.log(id)} />"
              }
            }
          ],
          bestPractices: [
            'Use consistent visual density',
            'Support keyboard selection and focus outlines'
          ]
        }
      },
      {
        id: 'error-state',
        name: 'Error State',
        description: 'Error occurred while loading challenges',
        component: () => React.createElement(ChallengeSelection, {
          challenges: [],
          isLoading: false,
          error: 'Failed to load challenges. Please check your internet connection and try again.',
          onChallengeSelect: (challengeId: string) => console.log('Selected challenge:', challengeId)
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
                code: "<ChallengeSelection challenges={[]} isLoading={false} error=\"Network error\" onChallengeSelect={() => {}} />"
              }
            }
          ],
          bestPractices: [
            'Keep messages actionable and concise',
            'Preserve prior inputs or filters when possible'
          ],
          accessibility: { screenReader: ['Announce errors via aria-live=polite'] }
        }
      },
      {
        id: 'filtered-state',
        name: 'Filtered State',
        description: 'Show only beginner level challenges',
        component: () => React.createElement(ChallengeSelection, {
          challenges: mockChallenges.filter(c => c.difficulty === 'beginner'),
          isLoading: false,
          error: null,
          selectedCategory: 'system-design',
          selectedDifficulty: 'beginner',
          onChallengeSelect: (challengeId: string) => console.log('Selected challenge:', challengeId)
        }),
        documentation: {
          summary: 'Filter controls applied to refine results.',
          patterns: ['Filter chips', 'Clear filters button'],
          bestPractices: [
            'Reflect active filters in UI',
            'Announce filter changes for assistive tech'
          ]
        }
      }
    ]
  },

  'Canvas Area': {
    id: 'canvas-area',
    name: 'Canvas Area',
    scenarios: [
      {
        id: 'empty-canvas',
        name: 'Empty Canvas',
        description: 'Clean canvas with no components or connections',
        component: () => React.createElement(CanvasArea, {
          components: mockCanvasStates.empty.components,
          connections: mockCanvasStates.empty.connections,
          selectedComponent: null,
          isReadOnly: false,
          onComponentAdd: (component: any) => console.log('Added component:', component),
          onComponentUpdate: (id: string, updates: any) => console.log('Updated component:', id, updates),
          onComponentDelete: (id: string) => console.log('Deleted component:', id),
          onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
          onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
          onComponentSelect: (id: string) => console.log('Selected component:', id)
        }),
        documentation: {
          summary: 'Starting point for new designs or templates.',
          usageExamples: [
            {
              title: 'Blank Workspace',
              description: 'Initialize with empty arrays to avoid null checks.',
              complexity: 'beginner',
              snippet: {
                language: 'tsx',
                code: "<CanvasArea components={[]} connections={[]} isReadOnly={false} />"
              }
            }
          ],
          performance: { tips: ['Defer expensive layout ops until first component is added'] }
        }
      },
      {
        id: 'basic-layout',
        name: 'Basic Layout',
        description: 'Simple setup with 2-3 components and connections',
        component: () => React.createElement(CanvasArea, {
          components: mockCanvasStates.basic.components,
          connections: mockCanvasStates.basic.connections,
          selectedComponent: 'comp-1',
          isReadOnly: false,
          onComponentAdd: (component: any) => console.log('Added component:', component),
          onComponentUpdate: (id: string, updates: any) => console.log('Updated component:', id, updates),
          onComponentDelete: (id: string) => console.log('Deleted component:', id),
          onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
          onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
          onComponentSelect: (id: string) => console.log('Selected component:', id)
        }),
        documentation: {
          summary: 'Demonstrates minimal viable architecture and selection.',
          bestPractices: ['Keep naming consistent', 'Limit overlapping edges']
        }
      },
      {
        id: 'complex-layout',
        name: 'Complex Layout',
        description: 'Advanced architecture with 8+ components and multiple connections',
        component: () => React.createElement(CanvasArea, {
          components: mockCanvasStates.complex.components,
          connections: mockCanvasStates.complex.connections,
          selectedComponent: 'api-1',
          isReadOnly: false,
          onComponentAdd: (component: any) => console.log('Added component:', component),
          onComponentUpdate: (id: string, updates: any) => console.log('Updated component:', id, updates),
          onComponentDelete: (id: string) => console.log('Deleted component:', id),
          onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
          onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
          onComponentSelect: (id: string) => console.log('Selected component:', id)
        }),
        documentation: {
          summary: 'Stress test interactions and performance at scale.',
          performance: {
            considerations: ['Batch updates', 'Virtualize rendering where possible'],
            tips: ['Use memoization for node rendering']
          }
        }
      },
      {
        id: 'url-shortener-template',
        name: 'URL Shortener Template',
        description: 'Pre-configured template for URL shortener system design',
        component: () => React.createElement(CanvasArea, {
          components: mockCanvasStates.urlShortener.components,
          connections: mockCanvasStates.urlShortener.connections,
          selectedComponent: null,
          isReadOnly: false,
          templateName: 'URL Shortener',
          onComponentAdd: (component: any) => console.log('Added component:', component),
          onComponentUpdate: (id: string, updates: any) => console.log('Updated component:', id, updates),
          onComponentDelete: (id: string) => console.log('Deleted component:', id),
          onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
          onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
          onComponentSelect: (id: string) => console.log('Selected component:', id)
        })
      },
      {
        id: 'chat-system-template',
        name: 'Chat System Template',
        description: 'Pre-configured template for real-time chat system',
        component: () => React.createElement(CanvasArea, {
          components: mockCanvasStates.chatSystem.components,
          connections: mockCanvasStates.chatSystem.connections,
          selectedComponent: 'ws-1',
          isReadOnly: false,
          templateName: 'Chat System',
          onComponentAdd: (component: any) => console.log('Added component:', component),
          onComponentUpdate: (id: string, updates: any) => console.log('Updated component:', id, updates),
          onComponentDelete: (id: string) => console.log('Deleted component:', id),
          onConnectionAdd: (connection: any) => console.log('Added connection:', connection),
          onConnectionDelete: (id: string) => console.log('Deleted connection:', id),
          onComponentSelect: (id: string) => console.log('Selected component:', id)
        })
      },
      {
        id: 'read-only-mode',
        name: 'Read-Only Mode',
        description: 'Canvas in read-only mode for viewing existing designs',
        component: () => React.createElement(CanvasArea, {
          components: mockCanvasStates.basic.components,
          connections: mockCanvasStates.basic.connections,
          selectedComponent: null,
          isReadOnly: true,
          showGrid: false,
          onComponentSelect: (id: string) => console.log('Viewed component:', id)
        })
      }
    ]
  },

  'Audio Recording': {
    id: 'audio-recording',
    name: 'Audio Recording',
    scenarios: [
      {
        id: 'idle-state',
        name: 'Idle State',
        description: 'Audio recording component ready to start recording',
        component: () => React.createElement(AudioRecording, {
          audioData: mockAudioStates.idle,
          isEnabled: true,
          maxDuration: 300,
          onStartRecording: () => console.log('Started recording'),
          onStopRecording: () => console.log('Stopped recording'),
          onPlayRecording: () => console.log('Playing recording'),
          onPauseRecording: () => console.log('Paused recording'),
          onDeleteRecording: () => console.log('Deleted recording'),
          onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript)
        })
      },
      {
        id: 'recording-state',
        name: 'Recording State',
        description: 'Currently recording audio with live duration updates',
        component: () => React.createElement(AudioRecording, {
          audioData: mockAudioStates.recording,
          isEnabled: true,
          maxDuration: 300,
          showWaveform: true,
          onStartRecording: () => console.log('Started recording'),
          onStopRecording: () => console.log('Stopped recording'),
          onPlayRecording: () => console.log('Playing recording'),
          onPauseRecording: () => console.log('Paused recording'),
          onDeleteRecording: () => console.log('Deleted recording'),
          onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript)
        })
      },
      {
        id: 'playing-state',
        name: 'Playing State',
        description: 'Playing back recorded audio with transcript displayed',
        component: () => React.createElement(AudioRecording, {
          audioData: mockAudioStates.playing,
          isEnabled: true,
          maxDuration: 300,
          showTranscript: true,
          showWaveform: true,
          onStartRecording: () => console.log('Started recording'),
          onStopRecording: () => console.log('Stopped recording'),
          onPlayRecording: () => console.log('Playing recording'),
          onPauseRecording: () => console.log('Paused recording'),
          onDeleteRecording: () => console.log('Deleted recording'),
          onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript)
        })
      },
      {
        id: 'error-state',
        name: 'Error State',
        description: 'Error occurred - microphone access denied',
        component: () => React.createElement(AudioRecording, {
          audioData: mockAudioStates.error,
          isEnabled: false,
          maxDuration: 300,
          onStartRecording: () => console.log('Started recording'),
          onStopRecording: () => console.log('Stopped recording'),
          onPlayRecording: () => console.log('Playing recording'),
          onPauseRecording: () => console.log('Paused recording'),
          onDeleteRecording: () => console.log('Deleted recording'),
          onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript),
          onRetryPermission: () => console.log('Retrying microphone permission')
        })
      },
      {
        id: 'completed-state',
        name: 'Completed State',
        description: 'Recording completed with full transcript available',
        component: () => React.createElement(AudioRecording, {
          audioData: mockAudioStates.completed,
          isEnabled: true,
          maxDuration: 300,
          showTranscript: true,
          showWaveform: true,
          allowDownload: true,
          onStartRecording: () => console.log('Started recording'),
          onStopRecording: () => console.log('Stopped recording'),
          onPlayRecording: () => console.log('Playing recording'),
          onPauseRecording: () => console.log('Paused recording'),
          onDeleteRecording: () => console.log('Deleted recording'),
          onDownloadRecording: () => console.log('Downloaded recording'),
          onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript)
        }),
        documentation: {
          summary: 'Expose transcript and export actions after recording ends.',
          bestPractices: ['Keep actions discoverable', 'Persist transcript for later review'],
          accessibility: { keyboard: ['Provide shortcuts for play/pause and seek'] }
        }
      },
      {
        id: 'disabled-state',
        name: 'Disabled State',
        description: 'Audio recording disabled (e.g., in read-only mode)',
        component: () => React.createElement(AudioRecording, {
          audioData: mockAudioStates.idle,
          isEnabled: false,
          maxDuration: 300,
          disabledMessage: 'Audio recording is disabled in view-only mode',
          onStartRecording: () => console.log('Started recording'),
          onStopRecording: () => console.log('Stopped recording'),
          onPlayRecording: () => console.log('Playing recording'),
          onPauseRecording: () => console.log('Paused recording'),
          onDeleteRecording: () => console.log('Deleted recording'),
          onTranscriptionComplete: (transcript: string) => console.log('Transcript:', transcript)
        }),
        documentation: {
          summary: 'Communicate disabled state with clear messaging.',
          bestPractices: ['Explain why recording is disabled', 'Avoid misleading active affordances']
        }
      }
    ]
  },

  'Component Palette': {
    id: 'component-palette',
    name: 'Component Palette',
    scenarios: [
      {
        id: 'full-palette',
        name: 'Full Palette',
        description: 'Complete component palette with all available components',
        component: () => React.createElement('div', {}, 'Component Palette - Full Palette scenario')
      },
      {
        id: 'filtered-by-category',
        name: 'Filtered by Category',
        description: 'Component palette filtered to show only compute components',
        component: () => React.createElement('div', {}, 'Component Palette - Filtered by Category scenario')
      },
      {
        id: 'search-results',
        name: 'Search Results',
        description: 'Component palette showing search results for "server"',
        component: () => React.createElement('div', {}, 'Component Palette - Search Results scenario')
      },
      {
        id: 'empty-search',
        name: 'Empty Search',
        description: 'No components found for search term',
        component: () => React.createElement('div', {}, 'Component Palette - Empty Search scenario')
      }
    ]
  },

  'Properties Panel': {
    id: 'properties-panel',
    name: 'Properties Panel',
    scenarios: [
      {
        id: 'no-selection',
        name: 'No Selection',
        description: 'Properties panel when no component is selected',
        component: () => React.createElement('div', {}, 'Properties Panel - No Selection scenario')
      },
      {
        id: 'server-properties',
        name: 'Server Properties',
        description: 'Properties panel for selected server component',
        component: () => React.createElement('div', {}, 'Properties Panel - Server Properties scenario')
      },
      {
        id: 'database-properties',
        name: 'Database Properties',
        description: 'Properties panel for selected database component',
        component: () => React.createElement('div', {}, 'Properties Panel - Database Properties scenario')
      },
      {
        id: 'load-balancer-properties',
        name: 'Load Balancer Properties',
        description: 'Properties panel for selected load balancer component',
        component: () => React.createElement('div', {}, 'Properties Panel - Load Balancer Properties scenario')
      }
    ]
  },

  'Design Pattern Selector': {
    id: 'design-pattern-selector',
    name: 'Design Pattern Selector',
    scenarios: [
      {
        id: 'pattern-selection',
        name: 'Pattern Selection',
        description: 'Available design patterns for quick template selection',
        component: () => React.createElement('div', {}, 'Design Pattern Selector - Pattern Selection scenario')
      },
      {
        id: 'pattern-preview',
        name: 'Pattern Preview',
        description: 'Previewing microservices architecture pattern',
        component: () => React.createElement('div', {}, 'Design Pattern Selector - Pattern Preview scenario')
      }
    ]
  },

  // UI Components - Button
  'Button Components': {
    id: 'button-components',
    name: 'Button Components',
    scenarios: [
      {
        id: 'button-playground',
        name: 'Button Playground',
        description: 'Interactive button with all customizable props',
        component: Button,
        controls: buttonControls,
        defaultProps: {
          variant: 'default',
          size: 'default',
          disabled: false,
          children: 'Interactive Button',
        },
        validation: buttonPropsSchema,
        metadata: {
          category: 'ui-components',
          variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
          states: ['default', 'disabled'],
          tags: ['button', 'interactive', 'form'],
          accessibility: true,
        },
        documentation: {
          summary: 'Explore all props, variants, and states of Button.',
          usageExamples: [
            {
              title: 'Primary Action',
              description: 'Use default variant for primary actions.',
              complexity: 'beginner',
              snippet: { language: 'tsx', code: '<Button>Save</Button>' }
            },
            {
              title: 'Destructive Action',
              description: 'Use destructive for irreversible actions.',
              complexity: 'intermediate',
              snippet: { language: 'tsx', code: '<Button variant="destructive">Delete</Button>' }
            }
          ],
          bestPractices: [
            'One primary action per view',
            'Use outline/secondary for less prominent actions'
          ],
          accessibility: {
            aria: ['Ensure accessible name via content'],
            keyboard: ['Enter/Space triggers click'],
          }
        }
      },
      {
        id: 'button-variants',
        name: 'Button Variants',
        description: 'All button variants: default, destructive, outline, secondary, ghost, link',
        component: () => React.createElement('div', { className: 'flex flex-col gap-4 p-4' }, [
          React.createElement('div', { key: 'default', className: 'flex gap-2' }, [
            React.createElement(Button, { key: 'default' }, 'Default'),
            React.createElement(Button, { key: 'destructive', variant: 'destructive' }, 'Destructive'),
            React.createElement(Button, { key: 'outline', variant: 'outline' }, 'Outline')
          ]),
          React.createElement('div', { key: 'secondary', className: 'flex gap-2' }, [
            React.createElement(Button, { key: 'secondary', variant: 'secondary' }, 'Secondary'),
            React.createElement(Button, { key: 'ghost', variant: 'ghost' }, 'Ghost'),
            React.createElement(Button, { key: 'link', variant: 'link' }, 'Link')
          ])
        ]),
        metadata: {
          category: 'ui-components',
          variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
          tags: ['button', 'variants', 'showcase'],
        },
      },
      {
        id: 'button-sizes',
        name: 'Button Sizes',
        description: 'Button sizes: sm, default, lg, icon',
        component: () => React.createElement('div', { className: 'flex items-center gap-4 p-4' }, [
          React.createElement(Button, { key: 'sm', size: 'sm' }, 'Small'),
          React.createElement(Button, { key: 'default' }, 'Default'),
          React.createElement(Button, { key: 'lg', size: 'lg' }, 'Large'),
          React.createElement(Button, { key: 'icon', size: 'icon' }, '🚀')
        ])
      },
      {
        id: 'button-states',
        name: 'Button States',
        description: 'Button in different states: normal, disabled, loading',
        component: () => React.createElement('div', { className: 'flex flex-col gap-4 p-4' }, [
          React.createElement('div', { key: 'normal', className: 'flex gap-2' }, [
            React.createElement(Button, { key: 'normal', onClick: () => console.log('Normal clicked') }, 'Normal Button'),
            React.createElement(Button, { key: 'disabled', disabled: true }, 'Disabled Button')
          ]),
          React.createElement('div', { key: 'variants-disabled', className: 'flex gap-2' }, [
            React.createElement(Button, { key: 'outline-disabled', variant: 'outline', disabled: true }, 'Disabled Outline'),
            React.createElement(Button, { key: 'destructive-disabled', variant: 'destructive', disabled: true }, 'Disabled Destructive')
          ])
        ])
      },
      {
        id: 'button-responsive',
        name: 'Responsive Buttons',
        description: 'Buttons adapting to different screen sizes and contexts',
        component: () => React.createElement('div', { className: 'flex flex-col gap-4 p-4' }, [
          React.createElement('div', { key: 'mobile', className: 'sm:hidden flex flex-col gap-2' }, [
            React.createElement(Button, { key: 'full-width', className: 'w-full' }, 'Full Width Mobile'),
            React.createElement(Button, { key: 'small-mobile', size: 'sm', className: 'w-full' }, 'Small Mobile')
          ]),
          React.createElement('div', { key: 'desktop', className: 'hidden sm:flex gap-2' }, [
            React.createElement(Button, { key: 'desktop-default' }, 'Desktop Button'),
            React.createElement(Button, { key: 'desktop-lg', size: 'lg' }, 'Large Desktop')
          ])
        ])
      }
    ]
  },

  // UI Components - Card
  'Card Components': {
    id: 'card-components',
    name: 'Card Components',
    scenarios: [
      {
        id: 'card-playground',
        name: 'Card Playground',
        description: 'Interactive card with customizable layout and content',
        component: () => React.createElement(Card, {}, [
          React.createElement(CardHeader, { key: 'header' }, [
            React.createElement(CardTitle, { key: 'title' }, 'Interactive Card'),
            React.createElement(CardDescription, { key: 'desc' }, 'This card can be customized using the controls panel')
          ]),
          React.createElement(CardContent, { key: 'content' }, 'Card content area with sample text and information.'),
          React.createElement(CardFooter, { key: 'footer' }, [
            React.createElement(Button, { key: 'btn', size: 'sm' }, 'Primary Action'),
            React.createElement(Button, { key: 'btn2', size: 'sm', variant: 'outline' }, 'Secondary')
          ])
        ]),
        controls: {
          showHeader: {
            type: 'boolean',
            label: 'Show Header',
            description: 'Display card header section',
            defaultValue: true,
          },
          showFooter: {
            type: 'boolean',
            label: 'Show Footer',
            description: 'Display card footer section',
            defaultValue: true,
          },
          title: {
            type: 'text',
            label: 'Card Title',
            description: 'Main card title',
            defaultValue: 'Interactive Card',
            placeholder: 'Enter card title...',
          },
          description: {
            type: 'text',
            label: 'Card Description',
            description: 'Card subtitle/description',
            defaultValue: 'This card can be customized using the controls panel',
            placeholder: 'Enter card description...',
          },
          content: {
            type: 'textarea',
            label: 'Card Content',
            description: 'Main card content',
            defaultValue: 'Card content area with sample text and information.',
            placeholder: 'Enter card content...',
          },
        },
        defaultProps: {
          showHeader: true,
          showFooter: true,
          title: 'Interactive Card',
          description: 'This card can be customized using the controls panel',
          content: 'Card content area with sample text and information.',
        },
        validation: cardPropsSchema,
        metadata: {
          category: 'ui-components',
          tags: ['card', 'container', 'interactive'],
          accessibility: true,
        },
        documentation: {
          summary: 'Compose content areas with header, content, footer blocks.',
          usageExamples: [
            {
              title: 'Basic Layout',
              description: 'Header + content + footer.',
              complexity: 'beginner',
              snippet: { language: 'tsx', code: '<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>Body</CardContent><CardFooter>Actions</CardFooter></Card>' }
            }
          ],
          bestPractices: ['Avoid nesting cards deeply', 'Use concise headings']
        }
      },
      {
        id: 'basic-cards',
        name: 'Basic Cards',
        description: 'Basic card layouts with header, content, and footer',
        component: () => React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 p-4' }, [
          React.createElement(Card, { key: 'simple' }, [
            React.createElement(CardHeader, { key: 'header' }, [
              React.createElement(CardTitle, { key: 'title' }, 'Simple Card'),
              React.createElement(CardDescription, { key: 'desc' }, 'A basic card with title and description')
            ]),
            React.createElement(CardContent, { key: 'content' }, 'This is the card content area.')
          ]),
          React.createElement(Card, { key: 'with-footer' }, [
            React.createElement(CardHeader, { key: 'header' }, [
              React.createElement(CardTitle, { key: 'title' }, 'Card with Footer'),
              React.createElement(CardDescription, { key: 'desc' }, 'This card includes a footer section')
            ]),
            React.createElement(CardContent, { key: 'content' }, 'Content goes here.'),
            React.createElement(CardFooter, { key: 'footer' }, [
              React.createElement(Button, { key: 'btn', size: 'sm' }, 'Action')
            ])
          ])
        ]),
        metadata: {
          category: 'ui-components',
          tags: ['card', 'layout', 'showcase'],
        },
      },
      {
        id: 'card-with-actions',
        name: 'Cards with Actions',
        description: 'Cards containing action buttons and interactive elements',
        component: () => React.createElement('div', { className: 'grid grid-cols-1 gap-4 p-4 max-w-md' }, [
          React.createElement(Card, { key: 'actions' }, [
            React.createElement(CardHeader, { key: 'header' }, [
              React.createElement(CardTitle, { key: 'title' }, mockUIComponentData.cardContent.projects[0].title),
              React.createElement(CardDescription, { key: 'desc' }, mockUIComponentData.cardContent.projects[0].description),
              React.createElement(CardAction, { key: 'action' }, [
                React.createElement(Button, { key: 'btn', variant: 'ghost', size: 'sm' }, '⋯')
              ])
            ]),
            React.createElement(CardContent, { key: 'content' }, [
              React.createElement('div', { key: 'status', className: 'text-sm text-muted-foreground' }, 
                `Status: ${mockUIComponentData.cardContent.projects[0].status}`)
            ]),
            React.createElement(CardFooter, { key: 'footer' }, [
              React.createElement(Button, { key: 'view', variant: 'outline', size: 'sm' }, 'View Details'),
              React.createElement(Button, { key: 'edit', size: 'sm' }, 'Edit')
            ])
          ])
        ])
      },
      {
        id: 'card-empty-states',
        name: 'Empty State Cards',
        description: 'Cards showing empty or placeholder states',
        component: () => React.createElement('div', { className: 'grid grid-cols-1 gap-4 p-4 max-w-md' }, [
          React.createElement(Card, { key: 'empty' }, [
            React.createElement(CardHeader, { key: 'header' }, [
              React.createElement(CardTitle, { key: 'title' }, 'No Projects'),
              React.createElement(CardDescription, { key: 'desc' }, 'You haven\'t created any projects yet')
            ]),
            React.createElement(CardContent, { key: 'content' }, [
              React.createElement('div', { key: 'icon', className: 'flex justify-center text-4xl text-muted-foreground' }, '📁')
            ]),
            React.createElement(CardFooter, { key: 'footer' }, [
              React.createElement(Button, { key: 'create' }, 'Create Project')
            ])
          ])
        ])
      },
      {
        id: 'card-content-types',
        name: 'Different Content Types',
        description: 'Cards with various content: forms, lists, images, data',
        component: () => React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 p-4' }, [
          React.createElement(Card, { key: 'form' }, [
            React.createElement(CardHeader, { key: 'header' }, [
              React.createElement(CardTitle, { key: 'title' }, 'User Settings'),
              React.createElement(CardDescription, { key: 'desc' }, 'Update your account preferences')
            ]),
            React.createElement(CardContent, { key: 'content' }, [
              React.createElement('div', { key: 'form', className: 'space-y-4' }, [
                React.createElement('div', { key: 'name-field' }, [
                  React.createElement('label', { key: 'label', className: 'text-sm font-medium' }, 'Name'),
                  React.createElement(Input, { key: 'input', placeholder: 'Enter your name' })
                ]),
                React.createElement('div', { key: 'email-field' }, [
                  React.createElement('label', { key: 'label', className: 'text-sm font-medium' }, 'Email'),
                  React.createElement(Input, { key: 'input', type: 'email', placeholder: 'Enter your email' })
                ])
              ])
            ]),
            React.createElement(CardFooter, { key: 'footer' }, [
              React.createElement(Button, { key: 'save' }, 'Save Changes')
            ])
          ])
        ])
      }
    ]
  },

  // UI Components - Input
  'Input Components': {
    id: 'input-components',
    name: 'Input Components',
    scenarios: [
      {
        id: 'input-playground',
        name: 'Input Playground',
        description: 'Interactive input with all customizable props',
        component: Input,
        controls: inputControls,
        defaultProps: {
          type: 'text',
          placeholder: 'Enter text...',
          disabled: false,
          required: false,
          defaultValue: '',
        },
        validation: inputPropsSchema,
        metadata: {
          category: 'form-controls',
          variants: ['text', 'email', 'password', 'number', 'file'],
          states: ['default', 'disabled', 'error', 'focused'],
          tags: ['input', 'form', 'interactive'],
          accessibility: true,
        },
        documentation: {
          summary: 'Common text input configurations with validation states.',
          usageExamples: [
            {
              title: 'Required Input',
              description: 'Mark inputs as required and explain errors.',
              complexity: 'beginner',
              snippet: { language: 'tsx', code: '<Input required aria-invalid={true} />' }
            }
          ],
          bestPractices: [
            'Label every input',
            'Use helper text for constraints'
          ],
          accessibility: { aria: ['Associate labels via htmlFor/id'] }
        }
      },
      {
        id: 'input-types',
        name: 'Input Types',
        description: 'Different input types: text, email, password, number',
        component: () => React.createElement('div', { className: 'space-y-4 p-4 max-w-md' }, [
          React.createElement('div', { key: 'text' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Text Input'),
            React.createElement(Input, { key: 'input', type: 'text', placeholder: 'Enter text...' })
          ]),
          React.createElement('div', { key: 'email' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Email Input'),
            React.createElement(Input, { key: 'input', type: 'email', placeholder: 'example@domain.com' })
          ]),
          React.createElement('div', { key: 'password' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Password Input'),
            React.createElement(Input, { key: 'input', type: 'password', placeholder: '••••••••' })
          ]),
          React.createElement('div', { key: 'number' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Number Input'),
            React.createElement(Input, { key: 'input', type: 'number', placeholder: '123' })
          ])
        ]),
        metadata: {
          category: 'form-controls',
          tags: ['input', 'types', 'showcase'],
        },
      },
      {
        id: 'input-states',
        name: 'Input States',
        description: 'Input in different states: default, focused, error, disabled',
        component: () => React.createElement('div', { className: 'space-y-4 p-4 max-w-md' }, [
          React.createElement('div', { key: 'default' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Default State'),
            React.createElement(Input, { key: 'input', placeholder: 'Default input' })
          ]),
          React.createElement('div', { key: 'error' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Error State'),
            React.createElement(Input, { 
              key: 'input', 
              placeholder: 'Input with error',
              'aria-invalid': true,
              defaultValue: 'Invalid input'
            }),
            React.createElement('p', { key: 'error-msg', className: 'text-sm text-destructive mt-1' }, 'This field is required')
          ]),
          React.createElement('div', { key: 'disabled' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Disabled State'),
            React.createElement(Input, { key: 'input', disabled: true, placeholder: 'Disabled input' })
          ])
        ])
      },
      {
        id: 'input-validation',
        name: 'Input with Validation',
        description: 'Inputs with validation messages and states',
        component: () => React.createElement('div', { className: 'space-y-4 p-4 max-w-md' }, [
          React.createElement('div', { key: 'required' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 
              'Required Field *'),
            React.createElement(Input, { 
              key: 'input', 
              placeholder: 'This field is required',
              'aria-invalid': true
            }),
            React.createElement('p', { key: 'help', className: 'text-sm text-destructive mt-1' }, 
              mockUIComponentData.formValidation.required.message)
          ]),
          React.createElement('div', { key: 'success' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Valid Input'),
            React.createElement(Input, { 
              key: 'input', 
              defaultValue: 'valid@example.com',
              className: 'border-green-500 focus-visible:ring-green-500/20'
            }),
            React.createElement('p', { key: 'success-msg', className: 'text-sm text-green-600 mt-1' }, 
              '✓ Email format is valid')
          ])
        ])
      },
      {
        id: 'file-inputs',
        name: 'File Inputs',
        description: 'File upload inputs and their states',
        component: () => React.createElement('div', { className: 'space-y-4 p-4 max-w-md' }, [
          React.createElement('div', { key: 'file' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'File Upload'),
            React.createElement(Input, { key: 'input', type: 'file' })
          ]),
          React.createElement('div', { key: 'multiple' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Multiple Files'),
            React.createElement(Input, { key: 'input', type: 'file', multiple: true })
          ]),
          React.createElement('div', { key: 'accept' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Images Only'),
            React.createElement(Input, { key: 'input', type: 'file', accept: 'image/*' })
          ])
        ])
      }
    ]
  },

  // UI Components - Alert
  'Alert Components': {
    id: 'alert-components',
    name: 'Alert Components',
    scenarios: [
      {
        id: 'alert-playground',
        name: 'Alert Playground',
        description: 'Interactive alert with customizable variant and content',
        component: () => React.createElement(Alert, {}, [
          React.createElement('svg', {
            key: 'icon',
            className: 'size-4',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          }, React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          })),
          React.createElement(AlertTitle, { key: 'title' }, 'Interactive Alert'),
          React.createElement(AlertDescription, { key: 'desc' }, 'This alert can be customized using the controls panel.')
        ]),
        controls: {
          variant: {
            type: 'select',
            label: 'Alert Variant',
            description: 'Visual style variant',
            defaultValue: 'default',
            options: [
              { value: 'default', label: 'Default' },
              { value: 'destructive', label: 'Destructive' },
              { value: 'warning', label: 'Warning' },
            ],
          },
          title: {
            type: 'text',
            label: 'Alert Title',
            description: 'Main alert title',
            defaultValue: 'Interactive Alert',
            placeholder: 'Enter alert title...',
          },
          description: {
            type: 'textarea',
            label: 'Alert Description',
            description: 'Alert content/message',
            defaultValue: 'This alert can be customized using the controls panel.',
            placeholder: 'Enter alert message...',
          },
          showIcon: {
            type: 'boolean',
            label: 'Show Icon',
            description: 'Display alert icon',
            defaultValue: true,
          },
        },
        defaultProps: {
          variant: 'default',
          title: 'Interactive Alert',
          description: 'This alert can be customized using the controls panel.',
          showIcon: true,
        },
        metadata: {
          category: 'feedback',
          variants: ['default', 'destructive', 'warning'],
          tags: ['alert', 'notification', 'feedback', 'interactive'],
          accessibility: true,
        },
        documentation: {
          summary: 'Use alerts to convey status or important information.',
          whenToUse: ['Non-blocking feedback', 'Contextual system messages'],
          usageExamples: [
            {
              title: 'Warning Alert',
              description: 'Cautionary messages without blocking flow.',
              complexity: 'beginner',
              snippet: { language: 'tsx', code: '<Alert variant="warning"><AlertTitle>Heads up</AlertTitle><AlertDescription>Check your inputs.</AlertDescription></Alert>' }
            }
          ],
          bestPractices: ['Avoid overusing destructive styling', 'Keep titles concise'],
          accessibility: { aria: ['Use role="alert" for urgent, aria-live for others'] }
        }
      },
      {
        id: 'alert-variants',
        name: 'Alert Variants',
        description: 'All alert variants: default, destructive, warning',
        component: () => React.createElement('div', { className: 'space-y-4 p-4' }, [
          React.createElement(Alert, { key: 'default' }, [
            React.createElement('svg', {
              key: 'icon',
              className: 'size-4',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            }, React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            })),
            React.createElement(AlertTitle, { key: 'title' }, 'Information'),
            React.createElement(AlertDescription, { key: 'desc' }, 
              'This is a default alert with informational content.')
          ]),
          React.createElement(Alert, { key: 'destructive', variant: 'destructive' }, [
            React.createElement('svg', {
              key: 'icon',
              className: 'size-4',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            }, React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            })),
            React.createElement(AlertTitle, { key: 'title' }, 'Error'),
            React.createElement(AlertDescription, { key: 'desc' }, 
              mockUIComponentData.alerts.error.message)
          ]),
          React.createElement(Alert, { key: 'warning', variant: 'warning' }, [
            React.createElement('svg', {
              key: 'icon',
              className: 'size-4',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            }, React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            })),
            React.createElement(AlertTitle, { key: 'title' }, 'Warning'),
            React.createElement(AlertDescription, { key: 'desc' }, 
              mockUIComponentData.alerts.warning.message)
          ])
        ])
      },
      {
        id: 'alerts-without-icons',
        name: 'Alerts without Icons',
        description: 'Clean alerts without icons for different use cases',
        component: () => React.createElement('div', { className: 'space-y-4 p-4' }, [
          React.createElement(Alert, { key: 'simple' }, [
            React.createElement(AlertTitle, { key: 'title' }, 'System Update Available'),
            React.createElement(AlertDescription, { key: 'desc' }, 
              'A new version is available. Update now to get the latest features.')
          ]),
          React.createElement(Alert, { key: 'destructive', variant: 'destructive' }, [
            React.createElement(AlertTitle, { key: 'title' }, 'Connection Failed'),
            React.createElement(AlertDescription, { key: 'desc' }, 
              'Unable to connect to the server. Please check your internet connection.')
          ])
        ])
      },
      {
        id: 'alert-content-lengths',
        name: 'Different Content Lengths',
        description: 'Alerts with varying content lengths and formatting',
        component: () => React.createElement('div', { className: 'space-y-4 p-4' }, [
          React.createElement(Alert, { key: 'short' }, [
            React.createElement(AlertTitle, { key: 'title' }, 'Saved'),
            React.createElement(AlertDescription, { key: 'desc' }, 'Changes saved successfully.')
          ]),
          React.createElement(Alert, { key: 'long', variant: 'warning' }, [
            React.createElement(AlertTitle, { key: 'title' }, 'Storage Almost Full'),
            React.createElement(AlertDescription, { key: 'desc' }, [
              React.createElement('p', { key: 'p1' }, 
                'Your storage is 85% full. To continue using ArchiComm without interruption, consider:'),
              React.createElement('ul', { key: 'list', className: 'list-disc list-inside mt-2 space-y-1' }, [
                React.createElement('li', { key: 'li1' }, 'Delete unused project files'),
                React.createElement('li', { key: 'li2' }, 'Archive old designs'),
                React.createElement('li', { key: 'li3' }, 'Upgrade to a premium plan for more storage')
              ])
            ])
          ])
        ])
      },
      {
        id: 'alert-responsive',
        name: 'Responsive Alerts',
        description: 'Alerts adapting to different screen sizes',
        component: () => React.createElement('div', { className: 'space-y-4 p-4' }, [
          React.createElement(Alert, { key: 'mobile', className: 'sm:hidden' }, [
            React.createElement(AlertTitle, { key: 'title' }, 'Mobile Alert'),
            React.createElement(AlertDescription, { key: 'desc' }, 'This alert is optimized for mobile screens.')
          ]),
          React.createElement(Alert, { key: 'desktop', className: 'hidden sm:block' }, [
            React.createElement(AlertTitle, { key: 'title' }, 'Desktop Alert'),
            React.createElement(AlertDescription, { key: 'desc' }, 
              'This alert provides more detailed information suitable for desktop viewing.')
          ])
        ]),
        metadata: {
          category: 'feedback',
          variants: ['default', 'destructive', 'warning'],
          tags: ['alert', 'notification', 'showcase'],
        },
      }
    ]
  },

  // UI Component Playground Category
  'UI Component Playground': {
    id: 'ui-component-playground',
    name: 'UI Component Playground',
    scenarios: [
      {
        id: 'button-playground-advanced',
        name: 'Advanced Button Playground',
        description: 'Comprehensive button testing with all variants, sizes, and states',
        component: Button,
        controls: {
          ...buttonControls,
          loading: {
            type: 'boolean',
            label: 'Loading State',
            description: 'Show loading indicator',
            defaultValue: false,
          },
          fullWidth: {
            type: 'boolean',
            label: 'Full Width',
            description: 'Take full container width',
            defaultValue: false,
          },
        },
        defaultProps: {
          variant: 'default',
          size: 'default',
          disabled: false,
          loading: false,
          fullWidth: false,
          children: 'Playground Button',
        },
        validation: buttonPropsSchema,
        themes: [
          { mode: 'light', className: 'bg-white p-4' },
          { mode: 'dark', className: 'bg-gray-900 p-4' },
        ],
        metadata: {
          category: 'ui-components',
          variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
          states: ['default', 'disabled', 'loading'],
          responsive: ['mobile', 'tablet', 'desktop'],
          tags: ['button', 'playground', 'comprehensive', 'interactive'],
          accessibility: true,
          performance: true,
        },
      },
      {
        id: 'form-controls-playground',
        name: 'Form Controls Playground',
        description: 'Interactive form controls with validation and states',
        component: () => React.createElement('div', { className: 'space-y-4 p-4 max-w-md' }, [
          React.createElement('div', { key: 'input-group' }, [
            React.createElement('label', { key: 'label', className: 'block text-sm font-medium mb-1' }, 'Interactive Input'),
            React.createElement(Input, { key: 'input', placeholder: 'Type here...' })
          ]),
          React.createElement(Button, { key: 'button' }, 'Submit Form')
        ]),
        controls: {
          inputType: {
            type: 'select',
            label: 'Input Type',
            defaultValue: 'text',
            options: [
              { value: 'text', label: 'Text' },
              { value: 'email', label: 'Email' },
              { value: 'password', label: 'Password' },
            ],
          },
          inputPlaceholder: {
            type: 'text',
            label: 'Input Placeholder',
            defaultValue: 'Type here...',
          },
          buttonText: {
            type: 'text',
            label: 'Button Text',
            defaultValue: 'Submit Form',
          },
          buttonVariant: {
            type: 'select',
            label: 'Button Variant',
            defaultValue: 'default',
            options: buttonControls.variant.options || [],
          },
        },
        defaultProps: {
          inputType: 'text',
          inputPlaceholder: 'Type here...',
          buttonText: 'Submit Form',
          buttonVariant: 'default',
        },
        metadata: {
          category: 'form-controls',
          tags: ['form', 'input', 'button', 'playground', 'interactive'],
          accessibility: true,
        },
      }
    ]
  }
};

// Helper functions for accessing scenarios
export function getScenariosForComponent(componentName: string): any[] {
  const componentData = scenarios[componentName];
  return componentData ? componentData.scenarios : [];
}

export function getEnhancedScenariosForComponent(componentName: string): any[] {
  const componentData = scenarios[componentName];
  return componentData ? componentData.scenarios : [];
}

export function getInteractiveScenarios(): any[] {
  const interactive: any[] = [];
  Object.values(scenarios).forEach(group => {
    group.scenarios.forEach(scenario => {
      if (scenario.controls) {
        interactive.push(scenario);
      }
    });
  });
  return interactive;
}

export function getScenariosByCategory(category: string): any[] {
  const filtered: any[] = [];
  Object.values(scenarios).forEach(group => {
    group.scenarios.forEach(scenario => {
      if (scenario.metadata?.category === category) {
        filtered.push(scenario);
      }
    });
  });
  return filtered;
}

export function getAvailableComponents(): string[] {
  return Object.keys(scenarios);
}

export function getScenario(componentName: string, scenarioId: string): any | null {
  const componentScenarios = getScenariosForComponent(componentName);
  return componentScenarios.find(scenario => scenario.id === scenarioId) || null;
}
