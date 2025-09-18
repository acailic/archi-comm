import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Plus,
  MessageCircle,
  Undo,
  Redo,
  ChevronDown,
  Palette,
  Save,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/components/ui/dialog';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/ui/select';
import { Label } from '@ui/components/ui/label';
import { Separator } from '@ui/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ui/components/ui/collapsible';
import { Slider } from '@ui/components/ui/slider';
import { RichTextEditor } from '@ui/components/ui/rich-text-editor';
import { ColorPicker } from '@ui/components/ui/color-picker';
import { Annotation, AnnotationStyle } from '@/lib/canvas/CanvasAnnotations';
import { useAutoSave } from '@hooks/useAutoSave';
import { useUndoRedo } from '@hooks/useUndoRedo';
import { ANNOTATION_PRESETS, getPresetById } from '@/lib/canvas/annotation-presets';
import { useUXTracker } from '@hooks/useUXTracker';

interface AnnotationEditDialogProps {
  annotation: Annotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (annotation: Annotation) => void;
  onDelete: (annotationId: string) => void;
}

interface Reply {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface DialogState {
  content: string;
  author: string;
  style: AnnotationStyle;
  replies: Reply[];
}

const fontSizes = [
  { label: 'Small', value: 12 },
  { label: 'Medium', value: 14 },
  { label: 'Large', value: 16 },
  { label: 'Extra Large', value: 18 },
];

export const AnnotationEditDialog: React.FC<AnnotationEditDialogProps> = ({
  annotation,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [style, setStyle] = useState<AnnotationStyle>({
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    textColor: '#374151',
    fontSize: 14,
    fontWeight: 'normal',
    opacity: 0.95,
    borderRadius: 8,
    borderWidth: 1,
  });
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // UX Tracking integration
  const { trackDialogAction, trackKeyboardShortcut } = useUXTracker();

  // Auto-save state
  const dialogState = { content, author, style, replies };
  const { isSaving, forceSave } = useAutoSave(
    dialogState,
    async data => {
      if (!annotation) return;
      const updatedAnnotation = {
        ...annotation,
        content: data.content,
        author: data.author,
        style: data.style,
        replies: data.replies.map(reply => ({
          id: reply.id,
          author: reply.author,
          content: reply.content,
          timestamp: reply.timestamp.getTime(),
        })),
      };
      onSave(updatedAnnotation);
    },
    { enabled: isOpen && !!annotation }
  );

  // Undo/Redo functionality
  const {
    currentState: undoRedoState,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    clearHistory,
  } = useUndoRedo<DialogState>(
    { content: '', author: '', style, replies: [] },
    { enableGlobalShortcuts: true }
  );

  // Update local state when undo/redo state changes
  useEffect(() => {
    if (undoRedoState && isOpen) {
      setContent(undoRedoState.content);
      setAuthor(undoRedoState.author);
      setStyle(undoRedoState.style);
      setReplies(undoRedoState.replies);
    }
  }, [undoRedoState, isOpen]);

  // Load annotation data when dialog opens
  useEffect(() => {
    if (annotation && isOpen) {
      const initialContent = annotation.content || '';
      const initialAuthor = annotation.author || '';
      const initialStyle = annotation.style || {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        textColor: '#374151',
        fontSize: 14,
        fontWeight: 'normal',
        opacity: 0.95,
        borderRadius: 8,
        borderWidth: 1,
      };

      setContent(initialContent);
      setAuthor(initialAuthor);
      setStyle(initialStyle);

      // Load replies from annotation replies array
      const annotationReplies =
        annotation.replies?.map(reply => ({
          id: reply.id,
          author: reply.author,
          content: reply.content,
          timestamp: new Date(reply.timestamp),
        })) || [];
      setReplies(annotationReplies);

      // Initialize undo/redo with current state
      const initialState = {
        content: initialContent,
        author: initialAuthor,
        style: initialStyle,
        replies: annotationReplies,
      };
      clearHistory();
      pushState(initialState);
    } else {
      // Reset form when closing
      setContent('');
      setAuthor('');
      setStyle({
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        textColor: '#374151',
        fontSize: 14,
        fontWeight: 'normal',
        opacity: 0.95,
        borderRadius: 8,
        borderWidth: 1,
      });
      setReplies([]);
      setNewReply('');
      setReplyAuthor('');
      setShowAdvancedOptions(false);
    }
  }, [annotation, isOpen, clearHistory, pushState]);

  const handleSave = useCallback(async () => {
    if (!annotation) return;

    const updatedReplies = replies.map(reply => ({
      id: reply.id,
      author: reply.author,
      content: reply.content,
      timestamp: reply.timestamp.getTime(),
    }));

    const updatedAnnotation: Annotation = {
      ...annotation,
      content,
      author,
      replies: updatedReplies,
      style,
    };

    onSave(updatedAnnotation);
    onClose();
  }, [annotation, content, author, style, replies, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (!annotation) return;

    if (confirm('Are you sure you want to delete this annotation?')) {
      onDelete(annotation.id);
      onClose();
    }
  }, [annotation, onDelete, onClose]);

  const handleAddReply = useCallback(() => {
    if (!newReply.trim() || !replyAuthor.trim()) return;

    const reply: Reply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: replyAuthor,
      content: newReply,
      timestamp: new Date(),
    };

    const newReplies = [...replies, reply];
    setReplies(newReplies);
    setNewReply('');
    setReplyAuthor('');

    // Push to undo/redo history
    pushState({ content, author, style, replies: newReplies });
  }, [newReply, replyAuthor, replies, content, author, style, pushState]);

  const handleDeleteReply = useCallback(
    (replyId: string) => {
      const newReplies = replies.filter(reply => reply.id !== replyId);
      setReplies(newReplies);

      // Push to undo/redo history
      pushState({ content, author, style, replies: newReplies });
    },
    [replies, content, author, style, pushState]
  );

  // Handle content changes with undo/redo
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      pushState({ content: newContent, author, style, replies });
    },
    [author, style, replies, pushState]
  );

  const handleAuthorChange = useCallback(
    (newAuthor: string) => {
      setAuthor(newAuthor);
      pushState({ content, author: newAuthor, style, replies });
    },
    [content, style, replies, pushState]
  );

  const handleStyleChange = useCallback(
    (newStyle: Partial<AnnotationStyle>) => {
      const updatedStyle = { ...style, ...newStyle };
      setStyle(updatedStyle);
      pushState({ content, author, style: updatedStyle, replies });
    },
    [content, author, style, replies, pushState]
  );

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = getPresetById(presetId);
      if (preset) {
        setStyle(preset.style);
        pushState({ content, author, style: preset.style, replies });
      }
    },
    [content, author, replies, pushState]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!annotation) return null;

  const isComment = annotation.type === 'comment';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[500px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <MessageCircle className='h-5 w-5' />
              Edit {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
            </div>
            <div className='flex items-center gap-2'>
              {isSaving && (
                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <Clock className='h-3 w-3 animate-pulse' />
                  Saving...
                </div>
              )}
              <Button
                onClick={undo}
                disabled={!canUndo}
                variant='ghost'
                size='sm'
                title='Undo (Ctrl+Z)'
              >
                <Undo className='h-4 w-4' />
              </Button>
              <Button
                onClick={redo}
                disabled={!canRedo}
                variant='ghost'
                size='sm'
                title='Redo (Ctrl+Y)'
              >
                <Redo className='h-4 w-4' />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Content */}
          <div className='space-y-2'>
            <Label htmlFor='content'>Content</Label>
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder={`Enter ${annotation.type} content...`}
            />
          </div>

          {/* Author */}
          <div className='space-y-2'>
            <Label htmlFor='author'>Author</Label>
            <Input
              id='author'
              value={author}
              onChange={e => handleAuthorChange(e.target.value)}
              placeholder='Enter author name...'
            />
          </div>

          {/* Style Presets */}
          <div className='space-y-2'>
            <Label>Style Presets</Label>
            <div className='grid grid-cols-3 gap-2'>
              {ANNOTATION_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  variant='outline'
                  size='sm'
                  className='h-auto p-2 flex flex-col items-center gap-1'
                  style={{
                    backgroundColor: preset.style.backgroundColor,
                    borderColor: preset.style.borderColor,
                    color: preset.style.textColor,
                  }}
                >
                  <span className='font-medium text-xs'>{preset.name}</span>
                  <span className='text-xs opacity-75'>
                    {preset.description.split(' ').slice(0, 2).join(' ')}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Basic Style Options */}
          <div className='grid grid-cols-2 gap-4'>
            {/* Color Picker */}
            <div className='space-y-2'>
              <Label>Background Color</Label>
              <ColorPicker
                value={style.backgroundColor}
                onChange={color =>
                  handleStyleChange({ backgroundColor: color, borderColor: color })
                }
              />
            </div>

            {/* Font Size */}
            <div className='space-y-2'>
              <Label>Font Size</Label>
              <Select
                value={style.fontSize.toString()}
                onValueChange={value => handleStyleChange({ fontSize: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map(size => (
                    <SelectItem key={size.value} value={size.value.toString()}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
            <CollapsibleTrigger asChild>
              <Button variant='ghost' size='sm' className='w-full justify-between'>
                <div className='flex items-center gap-2'>
                  <Palette className='h-4 w-4' />
                  Advanced Styling
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                {/* Font Weight */}
                <div className='space-y-2'>
                  <Label>Font Weight</Label>
                  <Select
                    value={style.fontWeight}
                    onValueChange={(value: 'normal' | 'bold') =>
                      handleStyleChange({ fontWeight: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='normal'>Normal</SelectItem>
                      <SelectItem value='bold'>Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Text Color */}
                <div className='space-y-2'>
                  <Label>Text Color</Label>
                  <ColorPicker
                    value={style.textColor}
                    onChange={color => handleStyleChange({ textColor: color })}
                  />
                </div>
              </div>

              {/* Opacity */}
              <div className='space-y-2'>
                <Label>Opacity: {Math.round(style.opacity * 100)}%</Label>
                <Slider
                  value={[style.opacity * 100]}
                  onValueChange={([value]) => handleStyleChange({ opacity: value / 100 })}
                  max={100}
                  min={10}
                  step={5}
                  className='w-full'
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Preview */}
          <div className='space-y-2'>
            <Label>Preview</Label>
            <div
              className='p-3 rounded border min-h-[60px] flex items-center'
              style={{
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
                color: style.textColor,
                fontSize: `${style.fontSize}px`,
                fontWeight: style.fontWeight,
                opacity: style.opacity,
                borderRadius: `${style.borderRadius}px`,
                borderWidth: `${style.borderWidth}px`,
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    content ||
                    `Sample ${annotation.type} with <strong>rich text</strong> formatting`,
                }}
              />
            </div>
          </div>

          {/* Replies section for comments */}
          {isComment && (
            <>
              <Separator />
              <div className='space-y-3'>
                <Label className='text-base font-semibold'>Replies ({replies.length})</Label>

                {/* Existing replies */}
                {replies.length > 0 && (
                  <div className='space-y-2 max-h-32 overflow-y-auto'>
                    {replies.map(reply => (
                      <div key={reply.id} className='bg-gray-50 p-2 rounded text-sm'>
                        <div className='flex justify-between items-start'>
                          <div className='flex-1'>
                            <div className='font-semibold text-gray-900'>{reply.author}</div>
                            <div className='text-gray-700 mt-1'>{reply.content}</div>
                            <div className='text-xs text-gray-500 mt-1'>
                              {reply.timestamp.toLocaleDateString()}{' '}
                              {reply.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDeleteReply(reply.id)}
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0'
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new reply */}
                <div className='space-y-2'>
                  <div className='grid grid-cols-3 gap-2'>
                    <Input
                      placeholder='Your name'
                      value={replyAuthor}
                      onChange={e => setReplyAuthor(e.target.value)}
                    />
                    <Input
                      placeholder='Your reply'
                      value={newReply}
                      onChange={e => setNewReply(e.target.value)}
                      className='col-span-2'
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddReply();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleAddReply}
                    disabled={!newReply.trim() || !replyAuthor.trim()}
                    size='sm'
                    variant='outline'
                    className='w-full'
                  >
                    <Plus className='h-4 w-4 mr-2' />
                    Add Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className='flex justify-between'>
          <Button onClick={handleDelete} variant='destructive' size='sm'>
            <Trash2 className='h-4 w-4 mr-2' />
            Delete
          </Button>
          <div className='space-x-2'>
            <Button onClick={onClose} variant='outline'>
              Cancel
            </Button>
            <Button onClick={forceSave} variant='ghost' title='Force save now'>
              <Save className='h-4 w-4 mr-2' />
              Save Now
            </Button>
            <Button onClick={handleSave}>Save & Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
