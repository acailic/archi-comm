/**
 * src/packages/ui/components/canvas/index.ts
 * Central export file for canvas UI components
 * Makes imports cleaner and easier to manage
 * RELEVANT FILES: DesignCanvas.tsx, AnnotationToolbar.tsx, AnnotationSidebar.tsx, CanvasToolbar.tsx
 */

export { AnnotationToolbar } from './AnnotationToolbar';
export type { AnnotationToolbarProps, AnnotationTool } from './AnnotationToolbar';

export { AnnotationSidebar } from './AnnotationSidebar';
export type { AnnotationSidebarProps, Annotation, AnnotationType } from './AnnotationSidebar';

export { KeyboardShortcutsReference } from './KeyboardShortcutsReference';
export type { KeyboardShortcutsReferenceProps } from './KeyboardShortcutsReference';

export { CanvasToolbar } from './CanvasToolbar';

export { QuickConnectOverlay } from './QuickConnectOverlay';

export { CanvasOnboardingTour } from './CanvasOnboardingTour';

export { CanvasContextualHelp } from './CanvasContextualHelp';

export { ConnectionTemplatePanel } from './ConnectionTemplatePanel';

export { OverlayPortal } from './OverlayPortal';
