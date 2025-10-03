/**
 * src/packages/ui/components/canvas/AnnotationToolbar.tsx
 * Toolbar for selecting annotation tools on the canvas
 * Provides easy access to comment, note, label, arrow, and highlight tools
 * RELEVANT FILES: CanvasAnnotations.ts, CanvasAnnotationOverlay.tsx, DesignCanvas.tsx
 */

import React, { useCallback, useMemo } from 'react';
import { MessageSquare, FileText, Tag, ArrowRight, Highlighter, X } from 'lucide-react';
import { cn } from '@core/utils';

export type AnnotationTool = 'comment' | 'note' | 'label' | 'arrow' | 'highlight' | null;

export interface AnnotationToolbarProps {
  selectedTool: AnnotationTool;
  onToolSelect: (tool: AnnotationTool) => void;
  annotationCount?: number;
  className?: string;
}

interface ToolOption {
  id: AnnotationTool;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
  hoverBg: string;
  activeBg: string;
  description: string;
  shortcut: string;
}

const toolOptions: ToolOption[] = [
  {
    id: 'comment',
    label: 'Comment',
    icon: MessageSquare,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    hoverBg: 'hover:bg-amber-100',
    activeBg: 'bg-amber-200',
    description: 'Add a sticky note comment',
    shortcut: 'C',
  },
  {
    id: 'note',
    label: 'Note',
    icon: FileText,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100',
    activeBg: 'bg-blue-200',
    description: 'Add a note annotation',
    shortcut: 'N',
  },
  {
    id: 'label',
    label: 'Label',
    icon: Tag,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    hoverBg: 'hover:bg-green-100',
    activeBg: 'bg-green-200',
    description: 'Add a label tag',
    shortcut: 'L',
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: ArrowRight,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    hoverBg: 'hover:bg-gray-100',
    activeBg: 'bg-gray-200',
    description: 'Draw an arrow with optional label',
    shortcut: 'A',
  },
  {
    id: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    hoverBg: 'hover:bg-yellow-100',
    activeBg: 'bg-yellow-200',
    description: 'Highlight an area',
    shortcut: 'H',
  },
];

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  selectedTool,
  onToolSelect,
  annotationCount = 0,
  className,
}) => {
  const handleToolClick = useCallback((tool: AnnotationTool) => {
    // Toggle off if clicking the same tool
    onToolSelect(selectedTool === tool ? null : tool);
  }, [selectedTool, onToolSelect]);

  const handleClearSelection = useCallback(() => {
    onToolSelect(null);
  }, [onToolSelect]);

  const containerStyle = useMemo(() => ({
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05)',
  }), []);

  return (
    <div
      className={cn(
        'annotation-toolbar',
        'flex items-center gap-1 p-2',
        'bg-white border border-gray-200 rounded-lg',
        className
      )}
      style={containerStyle}
      role="toolbar"
      aria-label="Annotation tools"
    >
      {/* Tool buttons */}
      {toolOptions.map((tool) => {
        const Icon = tool.icon;
        const isActive = selectedTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              'relative flex items-center justify-center',
              'w-10 h-10 rounded-md',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              tool.bgColor,
              tool.hoverBg,
              isActive ? tool.activeBg : '',
              isActive ? 'ring-2 ring-blue-500' : ''
            )}
            title={`${tool.description} (${tool.shortcut})`}
            aria-label={tool.label}
            aria-pressed={isActive}
          >
            <Icon
              size={20}
              className={cn(
                tool.color,
                'transition-transform duration-200',
                isActive ? 'scale-110' : ''
              )}
            />
            {isActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
            )}
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-8 bg-gray-300 mx-1" />

      {/* Clear selection button */}
      <button
        onClick={handleClearSelection}
        disabled={!selectedTool}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-md',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          selectedTool
            ? 'bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        )}
        title="Clear selection (Esc)"
        aria-label="Clear annotation tool selection"
      >
        <X size={20} />
      </button>

      {/* Annotation count badge */}
      {annotationCount > 0 && (
        <>
          <div className="w-px h-8 bg-gray-300 mx-1" />
          <div
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md"
            title={`${annotationCount} annotation${annotationCount !== 1 ? 's' : ''}`}
          >
            <span className="text-xs font-medium text-gray-600">
              {annotationCount}
            </span>
            <MessageSquare size={14} className="text-gray-500" />
          </div>
        </>
      )}
    </div>
  );
};

export default AnnotationToolbar;
