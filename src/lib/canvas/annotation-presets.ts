// src/lib/canvas/annotation-presets.ts
// Annotation style presets and configuration
// Defines default styles, sizes, and colors for different annotation types
// RELEVANT FILES: src/shared/contracts/index.ts, src/lib/design/canvas-colors.ts, src/packages/ui/components/canvas/AnnotationToolbar.tsx

import { StickyNote, MessageSquare, Highlighter, Tag, ArrowRight } from 'lucide-react';
import type { Annotation } from '@shared/contracts';
import type { LucideIcon } from 'lucide-react';

export interface AnnotationPreset {
  id: string;
  name: string;
  type: Annotation['type'];
  icon: LucideIcon;
  defaultStyle: Record<string, any>;
  defaultSize: { width: number; height: number };
  description: string;
}

// Annotation color palettes
export const ANNOTATION_COLORS = {
  note: ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#e9d5ff'], // yellow, blue, green, pink, purple
  highlight: [
    'rgba(254, 243, 199, 0.3)', // yellow
    'rgba(219, 234, 254, 0.3)', // blue
    'rgba(220, 252, 231, 0.3)', // green
    'rgba(252, 231, 243, 0.3)', // pink
    'rgba(233, 213, 255, 0.3)', // purple
  ],
  comment: ['#ffffff', '#f3f4f6', '#dbeafe'], // white, gray, light blue
} as const;

// Annotation presets
export const ANNOTATION_PRESETS: AnnotationPreset[] = [
  {
    id: 'sticky-note',
    name: 'Sticky Note',
    type: 'note',
    icon: StickyNote,
    defaultStyle: {
      backgroundColor: '#fef3c7',
      color: '#78350f',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      padding: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    defaultSize: { width: 200, height: 150 },
    description: 'A sticky note for quick ideas and reminders',
  },
  {
    id: 'comment',
    name: 'Comment',
    type: 'comment',
    icon: MessageSquare,
    defaultStyle: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)',
      padding: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    defaultSize: { width: 250, height: 100 },
    description: 'A comment for discussions and feedback',
  },
  {
    id: 'highlight-area',
    name: 'Highlight Area',
    type: 'highlight',
    icon: Highlighter,
    defaultStyle: {
      backgroundColor: 'rgba(254, 243, 199, 0.3)',
      border: '2px dashed #fbbf24',
      borderRadius: '4px',
      pointerEvents: 'none',
    },
    defaultSize: { width: 300, height: 200 },
    description: 'Highlight an area of interest on the canvas',
  },
  {
    id: 'label',
    name: 'Label',
    type: 'label',
    icon: Tag,
    defaultStyle: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '6px 12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: '600',
      lineHeight: '1',
      whiteSpace: 'nowrap',
    },
    defaultSize: { width: 150, height: 32 },
    description: 'A compact label for tagging and organizing',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    type: 'arrow',
    icon: ArrowRight,
    defaultStyle: {
      stroke: '#3b82f6',
      strokeWidth: '2',
      fill: 'none',
      markerEnd: 'url(#arrowhead)',
    },
    defaultSize: { width: 150, height: 2 },
    description: 'An arrow to show direction or flow',
  },
];

// Helper functions
export function getPresetById(id: string): AnnotationPreset | undefined {
  return ANNOTATION_PRESETS.find((preset) => preset.id === id);
}

export function getPresetsByType(type: Annotation['type']): AnnotationPreset[] {
  return ANNOTATION_PRESETS.filter((preset) => preset.type === type);
}

export function createAnnotationFromPreset(
  preset: AnnotationPreset,
  position: { x: number; y: number }
): Omit<Annotation, 'id' | 'timestamp'> {
  return {
    type: preset.type,
    content: '',
    x: position.x,
    y: position.y,
    width: preset.defaultSize.width,
    height: preset.defaultSize.height,
    style: preset.defaultStyle,
    visible: true,
    zIndex: 0,
  };
}

// Get default color for annotation type
export function getDefaultColorForType(type: Annotation['type']): string {
  switch (type) {
    case 'note':
      return ANNOTATION_COLORS.note[0];
    case 'highlight':
      return ANNOTATION_COLORS.highlight[0];
    case 'comment':
      return ANNOTATION_COLORS.comment[0];
    case 'label':
      return '#ffffff';
    case 'arrow':
      return '#3b82f6';
    default:
      return '#ffffff';
  }
}
