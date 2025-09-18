// src/features/canvas/components/InfoCard.tsx
// Info card component for adding comments and annotations to the canvas
// Provides editable text content with styling options for user notes
// RELEVANT FILES: ReactFlowCanvas.tsx, CustomNode.tsx, shared/contracts/index.ts

import { Node, NodeProps } from '@xyflow/react';
import { memo, useCallback, useRef, useState } from 'react';
import { 
  MessageSquare, 
  Edit3, 
  Check, 
  X, 
  Trash2
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@ui/components/ui/context-menu';
import { Button } from '@ui/components/ui/button';
import { Textarea } from '@ui/components/ui/textarea';
import { cx } from '@/lib/design/design-system';

// Define the info card data type for React Flow
export interface InfoCardData extends Record<string, unknown> {
  id: string;
  content: string;
  color?: 'yellow' | 'blue' | 'green' | 'red' | 'purple';
  isEditing?: boolean;
  onContentChange: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onStartEdit?: (id: string) => void;
  onFinishEdit?: (id: string) => void;
  onColorChange?: (id: string, color: string) => void;
}

// Custom node type for info cards
export type InfoCardNode = Node<InfoCardData>;

const colorStyles = {
  yellow: {
    bg: 'bg-yellow-100/90',
    border: 'border-yellow-300',
    header: 'bg-yellow-200/80',
    text: 'text-yellow-900',
    accent: 'text-yellow-600'
  },
  blue: {
    bg: 'bg-blue-100/90',
    border: 'border-blue-300',
    header: 'bg-blue-200/80',
    text: 'text-blue-900',
    accent: 'text-blue-600'
  },
  green: {
    bg: 'bg-green-100/90',
    border: 'border-green-300',
    header: 'bg-green-200/80',
    text: 'text-green-900',
    accent: 'text-green-600'
  },
  red: {
    bg: 'bg-red-100/90',
    border: 'border-red-300',
    header: 'bg-red-200/80',
    text: 'text-red-900',
    accent: 'text-red-600'
  },
  purple: {
    bg: 'bg-purple-100/90',
    border: 'border-purple-300',
    header: 'bg-purple-200/80',
    text: 'text-purple-900',
    accent: 'text-purple-600'
  }
};

function InfoCardInner({ data, selected }: NodeProps) {
  const cardData = data as unknown as InfoCardData;
  const {
    id,
    content,
    color = 'yellow',
    isEditing = false,
    onContentChange,
    onDelete,
    onStartEdit,
    onFinishEdit,
    onColorChange,
  } = cardData;

  const [editContent, setEditContent] = useState(content);
  const [localIsEditing, setLocalIsEditing] = useState(isEditing);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Sync local editing state with prop
  React.useEffect(() => {
    setLocalIsEditing(isEditing);
  }, [isEditing]);
  
  // Update edit content when content changes
  React.useEffect(() => {
    setEditContent(content);
  }, [content]);
  
  const colorStyle = colorStyles[color];

  const handleStartEdit = useCallback(() => {
    setEditContent(content);
    setLocalIsEditing(true);
    onStartEdit?.(id);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  }, [content, id, onStartEdit]);

  const handleSave = useCallback(() => {
    onContentChange(id, editContent);
    setLocalIsEditing(false);
    onFinishEdit?.(id);
  }, [id, editContent, onContentChange, onFinishEdit]);

  const handleCancel = useCallback(() => {
    setEditContent(content);
    setLocalIsEditing(false);
    onFinishEdit?.(id);
  }, [content, id, onFinishEdit]);

  const handleColorChange = useCallback((newColor: string) => {
    onColorChange?.(id, newColor);
  }, [id, onColorChange]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cx(
            'w-64 min-h-32 rounded-lg border-2 shadow-lg backdrop-blur-sm transition-all duration-200 canvas-info-card',
            colorStyle.bg,
            colorStyle.border,
            selected ? 'ring-2 ring-primary/50 shadow-xl' : 'hover:shadow-xl'
          )}
        >
          {/* Header */}
          <div className={cx(
            'flex items-center justify-between px-3 py-2 rounded-t-md border-b',
            colorStyle.header,
            colorStyle.border
          )}>
            <div className="flex items-center gap-2">
              <MessageSquare className={cx('w-4 h-4', colorStyle.accent)} />
              <span className={cx('text-sm font-medium', colorStyle.text)}>
                Note
              </span>
            </div>
            
            {!localIsEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="h-6 w-6 p-0 hover:bg-black/10"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="p-3">
            {localIsEditing ? (
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Add your comment..."
                  className={cx(
                    'min-h-20 resize-none border-none bg-transparent p-0 focus:ring-0',
                    colorStyle.text
                  )}
                />
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-6 px-2 text-xs hover:bg-black/10"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="h-6 px-2 text-xs hover:bg-black/10"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className={cx(
                  'text-sm leading-relaxed min-h-16 whitespace-pre-wrap cursor-pointer',
                  colorStyle.text,
                  content ? '' : 'text-muted-foreground italic'
                )}
                onClick={handleStartEdit}
              >
                {content || 'Click to add a comment...'}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleStartEdit}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Comment
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleColorChange('yellow')}>
          <div className="w-4 h-4 mr-2 rounded bg-yellow-200 border border-yellow-300" />
          Yellow
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleColorChange('blue')}>
          <div className="w-4 h-4 mr-2 rounded bg-blue-200 border border-blue-300" />
          Blue
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleColorChange('green')}>
          <div className="w-4 h-4 mr-2 rounded bg-green-200 border border-green-300" />
          Green
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleColorChange('red')}>
          <div className="w-4 h-4 mr-2 rounded bg-red-200 border border-red-300" />
          Red
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleColorChange('purple')}>
          <div className="w-4 h-4 mr-2 rounded bg-purple-200 border border-purple-300" />
          Purple
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete?.(id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Comment
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const InfoCard = memo(InfoCardInner);
