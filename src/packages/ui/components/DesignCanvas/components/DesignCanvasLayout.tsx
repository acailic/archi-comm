import React from 'react';

import { ResizablePanel } from '@ui/components/ui/ResizablePanel';

interface DesignCanvasLayoutProps {
  header: React.ReactNode;
  assignmentPanel: React.ReactNode;
  canvas: React.ReactNode;
  propertiesPanel: React.ReactNode;
  statusBar: React.ReactNode;
  overlays?: React.ReactNode;
  annotationToolbar?: React.ReactNode;
  annotationSidebar?: React.ReactNode;
}

export const DesignCanvasLayout: React.FC<DesignCanvasLayoutProps> = React.memo(
  ({ header, assignmentPanel, canvas, propertiesPanel, statusBar, overlays, annotationToolbar, annotationSidebar }) => {
    return (
      <div className='h-screen flex flex-col'>
        {header}

        <div className='flex-1 flex overflow-hidden'>
          <ResizablePanel
            side='left'
            defaultWidth={320}
            minWidth={200}
            maxWidth={500}
            className='border-r border-border/20 bg-card'
          >
            {assignmentPanel}
          </ResizablePanel>

          <div className='flex-1 relative overflow-hidden'>
            {canvas}

            {/* Annotation toolbar floating in top-right corner of canvas */}
            {annotationToolbar && (
              <div className='absolute top-4 right-4 z-[var(--z-toolbar)] shadow-lg'>
                {annotationToolbar}
              </div>
            )}
          </div>

          {/* Annotation sidebar - conditional render */}
          {annotationSidebar && (
            <ResizablePanel
              side='right'
              defaultWidth={280}
              minWidth={200}
              maxWidth={400}
              className='border-l border-border/20 bg-card'
            >
              {annotationSidebar}
            </ResizablePanel>
          )}

          <ResizablePanel
            side='right'
            defaultWidth={320}
            minWidth={250}
            maxWidth={600}
            className='border-l border-border/20 bg-card'
          >
            {propertiesPanel}
          </ResizablePanel>
        </div>

        {statusBar}

        {overlays}
      </div>
    );
  }
);

DesignCanvasLayout.displayName = 'DesignCanvasLayout';
