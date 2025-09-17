// src/components/DesignCanvas.tsx
// Re-export from the refactored DesignCanvas module
// Maintains backward compatibility with existing imports
// RELEVANT FILES: DesignCanvas/index.tsx, DesignCanvas/DesignCanvasCore.tsx, DesignCanvas/DesignCanvasHeader.tsx, DesignCanvas/hooks/

export { default as DesignCanvas } from './DesignCanvas/index';
export type { DesignCanvasProps } from './DesignCanvas/index';
