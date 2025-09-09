/**
 * Annotation Style Presets Module
 * Provides predefined style presets for annotations with consistent themes
 */

import { AnnotationStyle, createAnnotationStyle } from './CanvasAnnotations';

export interface AnnotationPreset {
  id: string;
  name: string;
  description: string;
  style: AnnotationStyle;
}

/**
 * Predefined annotation style presets
 */
export const ANNOTATION_PRESETS: AnnotationPreset[] = [
  {
    id: 'success',
    name: 'Success',
    description: 'Green theme for positive feedback and approvals',
    style: createAnnotationStyle({
      backgroundColor: '#d1fae5',
      borderColor: '#10b981',
      textColor: '#047857',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.95,
    }),
  },
  {
    id: 'warning',
    name: 'Warning',
    description: 'Yellow/orange theme for cautions and attention',
    style: createAnnotationStyle({
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      textColor: '#92400e',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.95,
    }),
  },
  {
    id: 'error',
    name: 'Error',
    description: 'Red theme for errors and critical issues',
    style: createAnnotationStyle({
      backgroundColor: '#fecaca',
      borderColor: '#ef4444',
      textColor: '#b91c1c',
      fontSize: 14,
      fontWeight: 'bold',
      opacity: 0.95,
    }),
  },
  {
    id: 'info',
    name: 'Info',
    description: 'Blue theme for informational content',
    style: createAnnotationStyle({
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6',
      textColor: '#1d4ed8',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.95,
    }),
  },
  {
    id: 'note',
    name: 'Note',
    description: 'Gray theme for general notes and comments',
    style: createAnnotationStyle({
      backgroundColor: '#f3f4f6',
      borderColor: '#6b7280',
      textColor: '#374151',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.95,
    }),
  },
  {
    id: 'highlight',
    name: 'Highlight',
    description: 'Bright yellow for emphasizing important content',
    style: createAnnotationStyle({
      backgroundColor: '#fef08a',
      borderColor: '#eab308',
      textColor: '#a16207',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.8,
    }),
  },
  {
    id: 'urgent',
    name: 'Urgent',
    description: 'High-visibility theme for urgent items',
    style: createAnnotationStyle({
      backgroundColor: '#fde68a',
      borderColor: '#f59e0b',
      textColor: '#92400e',
      fontSize: 15,
      fontWeight: 'bold',
      opacity: 1.0,
      borderWidth: 2,
    }),
  },
  {
    id: 'review',
    name: 'Review',
    description: 'Purple theme for items pending review',
    style: createAnnotationStyle({
      backgroundColor: '#ede9fe',
      borderColor: '#8b5cf6',
      textColor: '#7c3aed',
      fontSize: 14,
      fontWeight: 'normal',
      opacity: 0.95,
    }),
  },
];

/**
 * Get a preset by its ID
 */
export const getPresetById = (id: string): AnnotationPreset | undefined => {
  return ANNOTATION_PRESETS.find(preset => preset.id === id);
};

/**
 * Get all available presets
 */
export const getAllPresets = (): AnnotationPreset[] => {
  return [...ANNOTATION_PRESETS];
};

/**
 * Create a custom preset from style properties
 */
export const createCustomPreset = (
  id: string,
  name: string,
  description: string,
  style: Partial<AnnotationStyle>
): AnnotationPreset => {
  return {
    id,
    name,
    description,
    style: createAnnotationStyle(style),
  };
};

/**
 * Get preset names for UI dropdowns
 */
export const getPresetNames = (): Array<{ id: string; name: string; description: string }> => {
  return ANNOTATION_PRESETS.map(({ id, name, description }) => ({ id, name, description }));
};

/**
 * Check if a preset exists
 */
export const presetExists = (id: string): boolean => {
  return ANNOTATION_PRESETS.some(preset => preset.id === id);
};

/**
 * Get the default preset (info theme)
 */
export const getDefaultPreset = (): AnnotationPreset => {
  return getPresetById('info') || ANNOTATION_PRESETS[0];
};

/**
 * Get presets by category/theme
 */
export const getPresetsByCategory = (
  category: 'status' | 'priority' | 'general'
): AnnotationPreset[] => {
  const categories: Record<string, string[]> = {
    status: ['success', 'warning', 'error', 'info'],
    priority: ['urgent', 'highlight', 'note'],
    general: ['note', 'review', 'info'],
  };

  const presetIds = categories[category] || [];
  return presetIds.map(id => getPresetById(id)).filter(Boolean) as AnnotationPreset[];
};
