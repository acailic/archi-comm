/**
 * src/lib/utils/id.ts
 * Centralized ID generation utility for the application
 * Uses crypto.randomUUID when available, with deterministic fallback for tests
 * RELEVANT FILES: canvasStore.ts, any file that needs unique IDs
 */

// Module-scoped counter for deterministic fallback
let idCounter = 0;
const startTime = Date.now();

/**
 * Generates a unique ID using crypto.randomUUID if available
 * Falls back to timestamp + counter for environments without crypto
 *
 * For tests, you can stub this function to return predictable values
 */
export function newId(prefix = ''): string {
  // Use crypto.randomUUID if available (modern browsers and Node 16.7+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return prefix ? `${prefix}-${crypto.randomUUID()}` : crypto.randomUUID();
  }

  // Fallback: timestamp + incrementing counter
  idCounter += 1;
  const timestamp = Date.now() - startTime;
  const id = `${timestamp}-${idCounter}-${Math.random().toString(36).substring(2, 9)}`;

  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Reset the counter (useful for testing)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Generate a component ID
 */
export function newComponentId(): string {
  return newId('component');
}

/**
 * Generate a connection ID
 */
export function newConnectionId(): string {
  return newId('connection');
}

/**
 * Generate a group ID
 */
export function newGroupId(): string {
  return newId('group');
}

/**
 * Generate an annotation ID
 */
export function newAnnotationId(): string {
  return newId('annotation');
}
