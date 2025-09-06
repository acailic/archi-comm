import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MessageSquare, 
  StickyNote, 
  Tag, 
  ArrowRight, 
  Highlighter,
  Move,
  X,
  GripHorizontal
} from 'lucide-react';

interface CommentToolbarProps {
  visible: boolean;
  onToggle: () => void;
  selectedTool?: string;
  onToolSelect: (tool: string) => void;
}

export const CommentToolbar: React.FC<CommentToolbarProps> = ({
  visible,
  onToggle,
  selectedTool,
  onToolSelect
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleToolClick = useCallback((tool: string, eventName: string) => {
    onToolSelect(tool);
    // Dispatch CustomEvent for keyboard shortcuts integration
    window.dispatchEvent(new CustomEvent(eventName));
  }, [onToolSelect]);

  if (!visible) {
    return (
      <div className="fixed top-4 right-20 z-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border p-2 select-none"
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Drag handle and close button */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b">
          <div className="drag-handle flex items-center cursor-grab active:cursor-grabbing">
            <GripHorizontal className="h-4 w-4 text-gray-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">Comments</span>
          </div>
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Annotation tools */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleToolClick('comment', 'shortcut:add-comment')}
                variant={selectedTool === 'comment' ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Comment (C)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleToolClick('note', 'shortcut:add-note')}
                variant={selectedTool === 'note' ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
              >
                <StickyNote className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Note (Alt+N)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleToolClick('label', 'shortcut:add-label')}
                variant={selectedTool === 'label' ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
              >
                <Tag className="h-4 w-4 mr-2" />
                Add Label
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Label (Shift+L)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleToolClick('arrow', 'shortcut:add-arrow')}
                variant={selectedTool === 'arrow' ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Add Arrow
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Arrow (Shift+A)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleToolClick('highlight', 'shortcut:add-highlight')}
                variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
              >
                <Highlighter className="h-4 w-4 mr-2" />
                Add Highlight
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Highlight (Shift+H)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};