// src/components/ui/ResizablePanel.tsx
// Resizable panel component for creating adjustable sidebars
// Provides drag handles and smooth resizing functionality
// RELEVANT FILES: DesignCanvas.tsx, AssignmentPanel.tsx, PropertiesPanel.tsx

import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  side: 'left' | 'right';
  className?: string;
}

export function ResizablePanel({
  children,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 600,
  side,
  className,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    
    const mouseMoveHandler = (e: MouseEvent) => {
      const deltaX = side === 'left' ? e.clientX - startX.current : startX.current - e.clientX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + deltaX));
      setWidth(newWidth);
    };
    
    const mouseUpHandler = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // Restore text selection and cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.body.classList.remove('resizing-panel');
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    // Add visual feedback to body
    document.body.classList.add('resizing-panel');
  }, [width, side, minWidth, maxWidth]);


  return (
    <div
      ref={panelRef}
      className={cn('relative flex-shrink-0', className)}
      style={{ width: `${width}px` }}
    >
      {children}
      
      {/* Resize Handle */}
      <div
        className={cn(
          'resize-handle absolute top-0 bottom-0 w-2 cursor-col-resize group z-20',
          'hover:bg-primary/10 active:bg-primary/20 transition-all duration-200',
          isResizing && 'bg-primary/20 w-3',
          side === 'left' ? '-right-1' : '-left-1'
        )}
        onMouseDown={handleMouseDown}
        title={`Resize ${side} panel`}
      >
        {/* Visual indicator line */}
        <div
          className={cn(
            'resize-indicator absolute top-1/2 -translate-y-1/2 w-0.5 h-12 bg-border/40 rounded-full transition-all duration-200',
            'group-hover:bg-primary/70 group-hover:h-16 group-hover:w-1',
            isResizing && 'bg-primary w-1 h-20',
            side === 'left' ? 'right-0.75' : 'left-0.75'
          )}
        />
        
        {/* Dotted grip pattern */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 transition-all duration-200',
            'group-hover:opacity-60 group-active:opacity-80',
            isResizing && 'opacity-80',
            side === 'left' ? 'right-0.25' : 'left-0.25'
          )}
        >
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
        </div>
      </div>
    </div>
  );
}