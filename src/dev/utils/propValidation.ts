// src/dev/utils/propValidation.ts
// Utility functions for prop validation and control generation in the scenario system
// Provides validation, type inference, and prop management utilities for interactive controls
// RELEVANT FILES: src/dev/types.ts, src/dev/components/PropControls.tsx, src/components/ui/button.tsx

import { z } from 'zod';
import {
  ControlsConfig,
  ControlDefinition,
  ValidationResult,
  PropChangeEvent,
  ControlType,
} from '../types';

/**
 * Validates a prop value against its control definition
 * Returns validation result with success/error status and messages
 */
export async function validatePropChange(
  propName: string,
  value: any,
  control: ControlDefinition
): Promise<ValidationResult> {
  try {
    // If no validation schema is provided, consider it valid
    if (!control.validation) {
      return {
        isValid: true,
        errors: [],
        value,
      };
    }

    // Perform Zod validation
    const result = control.validation.safeParse(value);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
        value: result.data,
      };
    } else {
      return {
        isValid: false,
        errors: result.error.errors.map(err => 
          `${propName}: ${err.message}`
        ),
        value,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [`${propName}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`],
      value,
    };
  }
}

/**
 * Validates multiple props at once
 * Returns a map of prop names to their validation results
 */
export async function validateProps(
  props: Record<string, any>,
  controls: ControlsConfig
): Promise<Record<string, ValidationResult>> {
  const results: Record<string, ValidationResult> = {};
  
  const validationPromises = Object.entries(props).map(async ([propName, value]) => {
    const control = controls[propName];
    if (control) {
      const result = await validatePropChange(propName, value, control);
      results[propName] = result;
    }
  });

  await Promise.all(validationPromises);
  return results;
}

/**
 * Formats validation errors into user-friendly messages
 * Takes validation results and returns formatted error strings
 */
export function formatValidationErrors(
  validationResults: Record<string, ValidationResult>
): string[] {
  const errors: string[] = [];
  
  Object.entries(validationResults).forEach(([propName, result]) => {
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  });
  
  return errors;
}

/**
 * Gets validation schema from scenario metadata or control definition
 * Extracts Zod schema for prop validation
 */
export function getValidationSchema(
  propName: string,
  control: ControlDefinition
): z.ZodSchema<any> | null {
  return control.validation || null;
}

/**
 * Merges user-provided props with default props
 * Handles prop precedence and type coercion
 */
export function mergePropsWithDefaults(
  userProps: Record<string, any>,
  defaultProps: Record<string, any>
): Record<string, any> {
  return {
    ...defaultProps,
    ...userProps,
  };
}

/**
 * Infers appropriate control type from prop value or type
 * Automatically determines the best control type for a prop
 */
export function inferControlType(
  propName: string,
  value: any,
  options?: any[]
): ControlType {
  // Check if options are provided (enum/select)
  if (options && Array.isArray(options) && options.length > 0) {
    return 'select';
  }

  // Infer from prop name patterns
  if (propName.toLowerCase().includes('color')) return 'color';
  if (propName.toLowerCase().includes('date')) return 'date';
  if (propName.toLowerCase().includes('time')) return 'time';
  if (propName.toLowerCase().includes('email')) return 'email';
  if (propName.toLowerCase().includes('url') || propName.toLowerCase().includes('link')) return 'url';
  if (propName.toLowerCase().includes('description') || propName.toLowerCase().includes('content')) {
    return 'textarea';
  }

  // Infer from value type
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Check string content patterns
    if (value.match(/^\d+$/)) return 'number';
    if (value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) return 'email';
    if (value.match(/^https?:\/\//)) return 'url';
    if (value.length > 50) return 'textarea';
    return 'text';
  }

  // Default to text for unknown types
  return 'text';
}

/**
 * Generates control configuration from component props
 * Automatically creates controls based on prop analysis
 */
export function generateControlsFromProps(
  props: Record<string, any>,
  overrides?: Partial<ControlsConfig>
): ControlsConfig {
  const controls: ControlsConfig = {};

  Object.entries(props).forEach(([propName, value]) => {
    // Skip if override is provided
    if (overrides?.[propName]) {
      controls[propName] = overrides[propName];
      return;
    }

    const controlType = inferControlType(propName, value);
    
    controls[propName] = {
      type: controlType,
      label: formatLabel(propName),
      description: `Control for ${propName} property`,
      defaultValue: value,
      ...(controlType === 'number' && {
        min: 0,
        max: 100,
        step: 1,
      }),
      ...(controlType === 'text' && {
        placeholder: `Enter ${propName}...`,
      }),
      ...(controlType === 'textarea' && {
        placeholder: `Enter ${propName}...`,
      }),
    };
  });

  return controls;
}

/**
 * Formats a prop name into a human-readable label
 * Converts camelCase/snake_case to Title Case
 */
export function formatLabel(propName: string): string {
  return propName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();
}

/**
 * Gets default value for a control type
 * Provides sensible defaults based on control type
 */
export function getDefaultValue(controlType: ControlType, control?: ControlDefinition): any {
  if (control?.defaultValue !== undefined) {
    return control.defaultValue;
  }

  switch (controlType) {
    case 'boolean':
      return false;
    case 'number':
    case 'range':
      return control?.min || 0;
    case 'color':
      return '#000000';
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'time':
      return '12:00';
    case 'email':
      return '';
    case 'url':
      return 'https://';
    case 'select':
      return control?.options?.[0]?.value || '';
    case 'text':
    case 'textarea':
    default:
      return '';
  }
}

/**
 * Validates that all required props have values
 * Returns validation errors for missing required props
 */
export function validateRequiredProps(
  props: Record<string, any>,
  controls: ControlsConfig
): string[] {
  const errors: string[] = [];
  
  Object.entries(controls).forEach(([propName, control]) => {
    if (control.required && (props[propName] === undefined || props[propName] === '')) {
      errors.push(`${formatLabel(propName)} is required`);
    }
  });
  
  return errors;
}

/**
 * Cleans and normalizes prop values based on their control types
 * Ensures proper type conversion and validation
 */
export function normalizeProps(
  props: Record<string, any>,
  controls: ControlsConfig
): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  Object.entries(props).forEach(([propName, value]) => {
    const control = controls[propName];
    if (!control) {
      normalized[propName] = value;
      return;
    }

    switch (control.type) {
      case 'number':
      case 'range':
        normalized[propName] = typeof value === 'number' ? value : Number(value) || 0;
        break;
      case 'boolean':
        normalized[propName] = Boolean(value);
        break;
      case 'select':
        // Ensure the value is one of the valid options
        const validOptions = control.options?.map(opt => opt.value) || [];
        normalized[propName] = validOptions.includes(value) ? value : validOptions[0];
        break;
      default:
        normalized[propName] = String(value || '');
    }
  });
  
  return normalized;
}

/**
 * Extracts control constraints (min, max, options) from control definition
 * Returns constraint information for UI validation
 */
export function getControlConstraints(control: ControlDefinition): {
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
  required?: boolean;
} {
  return {
    min: control.min,
    max: control.max,
    step: control.step,
    options: control.options,
    required: control.required,
  };
}

/**
 * Debounced validation function for real-time prop validation
 * Prevents excessive validation calls during rapid user input
 */
export function createDebouncedValidator(
  callback: (result: ValidationResult) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return async (propName: string, value: any, control: ControlDefinition) => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(async () => {
      const result = await validatePropChange(propName, value, control);
      callback(result);
    }, delay);
  };
}

/**
 * Creates a prop change event with validation
 * Standardized event creation for prop updates
 */
export function createPropChangeEvent(
  scenarioId: string,
  propName: string,
  newValue: any,
  oldValue: any,
  validationResult: ValidationResult
): PropChangeEvent {
  return {
    scenarioId,
    propName,
    newValue,
    oldValue,
    isValid: validationResult.isValid,
    validationErrors: validationResult.errors,
  };
}

/**
 * Error handling utility for validation operations
 * Provides consistent error handling across validation functions
 */
export function handleValidationError(
  error: unknown,
  propName: string,
  context: string = 'validation'
): ValidationResult {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  
  console.error(`Validation error for ${propName} during ${context}:`, error);
  
  return {
    isValid: false,
    errors: [`${propName}: ${message}`],
    value: undefined,
  };
}