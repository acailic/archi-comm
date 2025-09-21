import React from 'react';
import { z } from 'zod';
import { Button } from '@ui/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@ui/components/ui/card';
import { Input } from '@ui/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@ui/components/ui/alert';
import type { ControlsConfig } from '../types';
import { mockUIComponentData } from '../testData';

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

export const uiComponentScenarios = {
  // UI Components - Button
  'Button Components': {
    id: 'button-components',
    name: 'Button Components',
    scenarios: [
      {
        id: 'button-playground',
        name: 'Button Playground',
        description: 'Interactive button with all customizable props',
        component: () => React.createElement(Button, { children: 'Interactive Button' }),
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
              snippet: { language: 'tsx', code: '<Button>Save</Button>' },
            },
            {
              title: 'Destructive Action',
              description: 'Use destructive for irreversible actions.',
              complexity: 'intermediate',
              snippet: { language: 'tsx', code: '<Button variant="destructive">Delete</Button>' },
            },
          ],
          bestPractices: [
            'One primary action per view',
            'Use outline/secondary for less prominent actions',
          ],
          accessibility: {
            aria: ['Ensure accessible name via content'],
            keyboard: ['Enter/Space triggers click'],
          },
        },
      },
      {
        id: 'button-variants',
        name: 'Button Variants',
        description: 'All button variants: default, destructive, outline, secondary, ghost, link',
        component: () =>
          React.createElement('div', { className: 'flex flex-col gap-4 p-4' }, [
            React.createElement('div', { key: 'default', className: 'flex gap-2' }, [
              React.createElement(Button, { key: 'default' }, 'Default'),
              React.createElement(
                Button,
                { key: 'destructive', variant: 'destructive' },
                'Destructive'
              ),
              React.createElement(Button, { key: 'outline', variant: 'outline' }, 'Outline'),
            ]),
            React.createElement('div', { key: 'secondary', className: 'flex gap-2' }, [
              React.createElement(Button, { key: 'secondary', variant: 'secondary' }, 'Secondary'),
              React.createElement(Button, { key: 'ghost', variant: 'ghost' }, 'Ghost'),
              React.createElement(Button, { key: 'link', variant: 'link' }, 'Link'),
            ]),
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
        component: () =>
          React.createElement('div', { className: 'flex items-center gap-4 p-4' }, [
            React.createElement(Button, { key: 'sm', size: 'sm' }, 'Small'),
            React.createElement(Button, { key: 'default' }, 'Default'),
            React.createElement(Button, { key: 'lg', size: 'lg' }, 'Large'),
            React.createElement(Button, { key: 'icon', size: 'icon' }, '🚀'),
          ]),
      },
      {
        id: 'button-states',
        name: 'Button States',
        description: 'Button in different states: normal, disabled, loading',
        component: () =>
          React.createElement('div', { className: 'flex flex-col gap-4 p-4' }, [
            React.createElement('div', { key: 'normal', className: 'flex gap-2' }, [
              React.createElement(
                Button,
                { key: 'normal', onClick: () => console.log('Normal clicked') },
                'Normal Button'
              ),
              React.createElement(Button, { key: 'disabled', disabled: true }, 'Disabled Button'),
            ]),
            React.createElement('div', { key: 'variants-disabled', className: 'flex gap-2' }, [
              React.createElement(
                Button,
                { key: 'outline-disabled', variant: 'outline', disabled: true },
                'Disabled Outline'
              ),
              React.createElement(
                Button,
                { key: 'destructive-disabled', variant: 'destructive', disabled: true },
                'Disabled Destructive'
              ),
            ]),
          ]),
      },
      {
        id: 'button-responsive',
        name: 'Responsive Buttons',
        description: 'Buttons adapting to different screen sizes and contexts',
        component: () =>
          React.createElement('div', { className: 'flex flex-col gap-4 p-4' }, [
            React.createElement(
              'div',
              { key: 'mobile', className: 'sm:hidden flex flex-col gap-2' },
              [
                React.createElement(
                  Button,
                  { key: 'full-width', className: 'w-full' },
                  'Full Width Mobile'
                ),
                React.createElement(
                  Button,
                  { key: 'small-mobile', size: 'sm', className: 'w-full' },
                  'Small Mobile'
                ),
              ]
            ),
            React.createElement('div', { key: 'desktop', className: 'hidden sm:flex gap-2' }, [
              React.createElement(Button, { key: 'desktop-default' }, 'Desktop Button'),
              React.createElement(Button, { key: 'desktop-lg', size: 'lg' }, 'Large Desktop'),
            ]),
          ]),
      },
    ],
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
        component: () =>
          React.createElement(Card, {}, [
            React.createElement(CardHeader, { key: 'header' }, [
              React.createElement(CardTitle, { key: 'title' }, 'Interactive Card'),
              React.createElement(
                CardDescription,
                { key: 'desc' },
                'This card can be customized using the controls panel'
              ),
            ]),
            React.createElement(
              CardContent,
              { key: 'content' },
              'Card content area with sample text and information.'
            ),
            React.createElement(CardFooter, { key: 'footer' }, [
              React.createElement(Button, { key: 'btn', size: 'sm' }, 'Primary Action'),
              React.createElement(
                Button,
                { key: 'btn2', size: 'sm', variant: 'outline' },
                'Secondary'
              ),
            ]),
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
              snippet: {
                language: 'tsx',
                code: '<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>Body</CardContent><CardFooter>Actions</CardFooter></Card>',
              },
            },
          ],
          bestPractices: ['Avoid nesting cards deeply', 'Use concise headings'],
        },
      },
      // Additional card scenarios would continue here...
    ],
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
        component: () => React.createElement(Input, { placeholder: 'Enter text...' }),
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
              snippet: { language: 'tsx', code: '<Input required aria-invalid={true} />' },
            },
          ],
          bestPractices: ['Label every input', 'Use helper text for constraints'],
          accessibility: { aria: ['Associate labels via htmlFor/id'] },
        },
      },
      // Additional input scenarios would continue here...
    ],
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
        component: () =>
          React.createElement(Alert, {}, [
            React.createElement(
              'svg',
              {
                key: 'icon',
                className: 'size-4',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
              },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
              })
            ),
            React.createElement(AlertTitle, { key: 'title' }, 'Interactive Alert'),
            React.createElement(
              AlertDescription,
              { key: 'desc' },
              'This alert can be customized using the controls panel.'
            ),
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
              snippet: {
                language: 'tsx',
                code: '<Alert variant="warning"><AlertTitle>Heads up</AlertTitle><AlertDescription>Check your inputs.</AlertDescription></Alert>',
              },
            },
          ],
          bestPractices: ['Avoid overusing destructive styling', 'Keep titles concise'],
          accessibility: { aria: ['Use role="alert" for urgent, aria-live for others'] },
        },
      },
      // Additional alert scenarios would continue here...
    ],
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
        component: () => React.createElement(Button, { children: 'Playground Button' }),
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
        component: () =>
          React.createElement('div', { className: 'space-y-4 p-4 max-w-md' }, [
            React.createElement('div', { key: 'input-group' }, [
              React.createElement(
                'label',
                { key: 'label', className: 'block text-sm font-medium mb-1' },
                'Interactive Input'
              ),
              React.createElement(Input, { key: 'input', placeholder: 'Type here...' }),
            ]),
            React.createElement(Button, { key: 'button' }, 'Submit Form'),
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
      },
    ],
  },
};