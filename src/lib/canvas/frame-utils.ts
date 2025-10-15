// src/lib/canvas/frame-utils.ts
// Frame management utilities for canvas organization
// WHY: Provides core frame operations like bounds calculation, nesting validation, and component membership
// RELEVANT FILES: src/shared/contracts/index.ts, src/stores/canvasOrganizationStore.ts, src/packages/canvas/hooks/useFrameManagement.ts

import type { CanvasFrame, DesignComponent } from '@/shared/contracts';

/**
 * Calculate the bounding box that contains all given components
 * with optional padding
 */
export const calculateFrameBounds = (
  components: DesignComponent[],
  padding: number = 20
): { x: number; y: number; width: number; height: number } => {
  if (components.length === 0) {
    return { x: 0, y: 0, width: 200, height: 200 };
  }

  // Calculate bounds considering component dimensions
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  components.forEach((component) => {
    const compWidth = component.width || 120; // Default component width
    const compHeight = component.height || 60; // Default component height

    minX = Math.min(minX, component.x);
    minY = Math.min(minY, component.y);
    maxX = Math.max(maxX, component.x + compWidth);
    maxY = Math.max(maxY, component.y + compHeight);
  });

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
};

/**
 * Check if a component is within frame boundaries
 */
export const isComponentInFrame = (
  component: DesignComponent,
  frame: CanvasFrame,
  tolerance: number = 0
): boolean => {
  const compWidth = component.width || 120;
  const compHeight = component.height || 60;

  const compRight = component.x + compWidth;
  const compBottom = component.y + compHeight;
  const frameRight = frame.x + frame.width;
  const frameBottom = frame.y + frame.height;

  return (
    component.x >= frame.x - tolerance &&
    component.y >= frame.y - tolerance &&
    compRight <= frameRight + tolerance &&
    compBottom <= frameBottom + tolerance
  );
};

/**
 * Get all components within a frame
 */
export const getFrameComponents = (
  frame: CanvasFrame,
  allComponents: DesignComponent[],
  tolerance: number = 5
): DesignComponent[] => {
  return allComponents.filter((component) =>
    isComponentInFrame(component, frame, tolerance)
  );
};

/**
 * Validate that frames don't create circular references
 * Returns true if nesting is valid, false if circular reference detected
 */
export const validateFrameNesting = (
  frameId: string,
  parentFrameId: string | undefined,
  allFrames: CanvasFrame[],
  maxDepth: number = 5
): { valid: boolean; reason?: string } => {
  if (!parentFrameId) {
    return { valid: true };
  }

  if (frameId === parentFrameId) {
    return { valid: false, reason: 'Frame cannot be its own parent' };
  }

  // Build parent chain
  const parentChain: string[] = [];
  let currentParentId: string | undefined = parentFrameId;
  let depth = 0;

  while (currentParentId && depth < maxDepth + 1) {
    if (currentParentId === frameId) {
      return { valid: false, reason: 'Circular reference detected' };
    }

    parentChain.push(currentParentId);
    const parentFrame = allFrames.find((f) => f.id === currentParentId);

    if (!parentFrame) {
      return { valid: false, reason: 'Parent frame not found' };
    }

    currentParentId = parentFrame.parentFrameId;
    depth++;
  }

  if (depth > maxDepth) {
    return { valid: false, reason: `Maximum nesting depth (${maxDepth}) exceeded` };
  }

  return { valid: true };
};

/**
 * Optimize frame layout to fit contents with padding
 */
export const optimizeFrameLayout = (
  frame: CanvasFrame,
  components: DesignComponent[],
  padding: number = 20
): Partial<CanvasFrame> => {
  const frameComponents = components.filter((comp) =>
    isComponentInFrame(comp, frame, 100)
  );

  if (frameComponents.length === 0) {
    return frame;
  }

  const optimalBounds = calculateFrameBounds(frameComponents, padding);

  return {
    ...frame,
    ...optimalBounds,
  };
};

/**
 * Merge multiple frames into one
 */
export const mergeFrames = (
  frames: CanvasFrame[],
  newName: string,
  allComponents: DesignComponent[]
): CanvasFrame => {
  if (frames.length === 0) {
    throw new Error('Cannot merge zero frames');
  }

  // Collect all components from all frames
  const allFrameComponents: DesignComponent[] = [];
  frames.forEach((frame) => {
    const frameComps = getFrameComponents(frame, allComponents);
    allFrameComponents.push(...frameComps);
  });

  // Calculate bounds for merged frame
  const bounds = calculateFrameBounds(allFrameComponents, 20);

  // Use properties from first frame as base
  const baseFrame = frames[0];

  return {
    id: `frame-${Date.now()}`,
    name: newName,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    color: baseFrame.color,
    locked: false,
    collapsed: false,
    componentIds: allFrameComponents.map((c) => c.id),
  };
};

/**
 * Split frame into multiple frames (not implemented - placeholder)
 */
export const splitFrame = (
  frame: CanvasFrame,
  splitConfig: {
    direction: 'horizontal' | 'vertical';
    count: number;
  }
): CanvasFrame[] => {
  // Placeholder for future implementation
  console.warn('splitFrame not yet implemented');
  return [frame];
};

/**
 * Export frame as image data URL (canvas-based rendering)
 * Returns a promise that resolves to a data URL
 */
export const exportFrameAsImage = async (
  frame: CanvasFrame,
  components: DesignComponent[],
  scale: number = 2
): Promise<string> => {
  // This is a simplified placeholder
  // Real implementation would require canvas rendering
  return new Promise((resolve) => {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = frame.width * scale;
    canvas.height = frame.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw frame border
    ctx.strokeStyle = frame.color || '#3b82f6';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Convert to data URL
    resolve(canvas.toDataURL('image/png'));
  });
};

/**
 * Get frame hierarchy (parent-child tree)
 */
export const getFrameHierarchy = (
  frames: CanvasFrame[]
): Map<string, CanvasFrame[]> => {
  const hierarchy = new Map<string, CanvasFrame[]>();

  // Group frames by parent
  frames.forEach((frame) => {
    const parentId = frame.parentFrameId || 'root';
    if (!hierarchy.has(parentId)) {
      hierarchy.set(parentId, []);
    }
    hierarchy.get(parentId)!.push(frame);
  });

  return hierarchy;
};

/**
 * Get all ancestor frames for a given frame
 */
export const getFrameAncestors = (
  frameId: string,
  allFrames: CanvasFrame[]
): CanvasFrame[] => {
  const ancestors: CanvasFrame[] = [];
  const frame = allFrames.find((f) => f.id === frameId);

  if (!frame || !frame.parentFrameId) {
    return ancestors;
  }

  let currentParentId: string | undefined = frame.parentFrameId;
  while (currentParentId) {
    const parentFrame = allFrames.find((f) => f.id === currentParentId);
    if (!parentFrame) break;

    ancestors.push(parentFrame);
    currentParentId = parentFrame.parentFrameId;
  }

  return ancestors;
};

/**
 * Get all descendant frames for a given frame
 */
export const getFrameDescendants = (
  frameId: string,
  allFrames: CanvasFrame[]
): CanvasFrame[] => {
  const descendants: CanvasFrame[] = [];
  const hierarchy = getFrameHierarchy(allFrames);

  const collectDescendants = (parentId: string) => {
    const children = hierarchy.get(parentId) || [];
    children.forEach((child) => {
      descendants.push(child);
      collectDescendants(child.id);
    });
  };

  collectDescendants(frameId);
  return descendants;
};

/**
 * Check if frame overlaps with another frame
 */
export const framesOverlap = (
  frame1: CanvasFrame,
  frame2: CanvasFrame
): boolean => {
  const frame1Right = frame1.x + frame1.width;
  const frame1Bottom = frame1.y + frame1.height;
  const frame2Right = frame2.x + frame2.width;
  const frame2Bottom = frame2.y + frame2.height;

  return !(
    frame1Right < frame2.x ||
    frame1.x > frame2Right ||
    frame1Bottom < frame2.y ||
    frame1.y > frame2Bottom
  );
};

/**
 * Find frames that overlap with a given frame
 */
export const findOverlappingFrames = (
  frame: CanvasFrame,
  allFrames: CanvasFrame[]
): CanvasFrame[] => {
  return allFrames.filter(
    (other) => other.id !== frame.id && framesOverlap(frame, other)
  );
};
