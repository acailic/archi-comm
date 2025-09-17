/**
 * Shallow equality for arrays of objects (by reference)
 * Returns true if both arrays are the same length and each element is ===
 */
export function shallowEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
/**
 * Core utility helpers shared across packages
 * Provides helper functions for styling, id generation, and safe function wrapping
 */

import { type ClassValue, clsx } from 'clsx';
import { nanoid } from 'nanoid';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for conditionally joining CSS class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simple unique ID generator
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${nanoid(10)}`;
}

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends AnyFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null) return obj;

  // Handle array case
  if (Array.isArray(obj)) {
    const arrayClone = obj.map((item: unknown) => {
      if (item && typeof item === 'object') {
        return deepClone(item as Record<string, unknown>);
      }
      return item as unknown;
    });
    return arrayClone as unknown as T;
  }

  // Handle object case
  const clonedObj = {} as T;
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      clonedObj[key as keyof T] = deepClone(value as Record<string, unknown>) as T[keyof T];
    } else {
      clonedObj[key as keyof T] = value as T[keyof T];
    }
  });

  return clonedObj;
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual<T extends object>(a: T, b: T): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => deepEqual(a[key] as object, b[key] as object));
}

/**
 * Format a number to have leading zeros
 */
export function padNumber(num: number, size = 2): string {
  return String(num).padStart(size, '0');
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  // Validate input: ensure bytes is a finite number greater than zero
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Clamp index to prevent out-of-bounds array access
  const clampedIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm))} ${sizes[clampedIndex]}`;
}

/**
 * Ensure a value is within bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert angle to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to angle
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Calculate distance between two points using Point interface
 */
export function pointDistance(p1: Point, p2: Point): number {
  return distance(p1.x, p1.y, p2.x, p2.y);
}

/**
 * Get intersection point of two lines
 */
export function lineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): Point | null {
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * Get intersection point of two lines using Point interface
 */
export function lineIntersectionFromPoints(
  start1: Point,
  end1: Point,
  start2: Point,
  end2: Point
): Point | null {
  return lineIntersection(start1.x, start1.y, end1.x, end1.y, start2.x, start2.y, end2.x, end2.y);
}
