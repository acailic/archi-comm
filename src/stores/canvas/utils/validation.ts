// src/stores/canvas/utils/validation.ts
// Canvas data validation utilities
// Validates components, connections, and infoCards for consistency
// RELEVANT FILES: ../slices/coreSlice.ts, ../@shared/contracts.ts, ../../../features/canvas/types.ts

import type { Connection, DesignComponent, InfoCard } from '@/shared/contracts';

// State validation functions
export function validateCanvasData(data: {
  components?: DesignComponent[];
  connections?: Connection[];
  infoCards?: InfoCard[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate components
  if (data.components) {
    const componentIds = new Set<string>();
    for (const component of data.components) {
      if (!component.id || typeof component.id !== 'string') {
        errors.push(`Invalid component ID: ${component.id}`);
      }
      if (componentIds.has(component.id)) {
        errors.push(`Duplicate component ID: ${component.id}`);
      }
      componentIds.add(component.id);

      if (typeof component.x !== 'number' || typeof component.y !== 'number') {
        errors.push(`Invalid position for component ${component.id}`);
      }
    }
  }

  // Validate connections
  if (data.connections && data.components) {
    const componentIds = new Set(data.components.map(c => c.id));
    for (const connection of data.connections) {
      if (!componentIds.has(connection.from)) {
        errors.push(`Connection references non-existent component: ${connection.from}`);
      }
      if (!componentIds.has(connection.to)) {
        errors.push(`Connection references non-existent component: ${connection.to}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Enhanced deep equality comparison with performance optimizations
export function deepEqual(a: any, b: any): boolean {
  // Fast path: reference equality
  if (a === b) return true;

  // Fast path: null/undefined checks
  if (a == null || b == null) return false;

  // Fast path: type mismatch
  if (typeof a !== typeof b) return false;

  // Fast path: primitive types
  if (typeof a !== 'object') return false;

  // Array comparison with size optimization
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;

    // Fast path: different lengths
    if (a.length !== b.length) return false;

    // For large arrays, check first/last elements first
    if (a.length > 10) {
      if (!deepEqual(a[0], b[0]) || !deepEqual(a[a.length - 1], b[b.length - 1])) {
        return false;
      }
    }

    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Object comparison
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  // Fast path: different key counts
  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => deepEqual(a[key], b[key]));
}