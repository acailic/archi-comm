import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, MessageCircle } from 'lucide-react';
import { Annotation, AnnotationType, AnnotationStyle } from '@/lib/canvas/CanvasAnnotations';

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

const colorOptions = [
  { label: 'Yellow', value: '#fef3c7', border: '#f59e0b' },
  { label: 'Blue', value: '#dbeafe', border: '#3b82f6' },
  { label: 'Green', value: '#dcfce7', border: '#22c55e' },
  { label: 'Red', value: '#fee2e2', border: '#ef4444' },
  { label: 'Purple', value: '#ede9fe', border: '#8b5cf6' },
  { label: 'Pink', value: '#fce7f3', border: '#ec4899' },
  { label: 'Gray', value: '#f3f4f6', border: '#6b7280' },
];

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
  onDelete
}) => {
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [fontSize, setFontSize] = useState(14);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');

  // Load annotation data when dialog opens
  useEffect(() => {
    if (annotation && isOpen) {
      setContent(annotation.content || '');
      setAuthor(annotation.author || '');
      
      // Find matching color option
      const colorOption = colorOptions.find(
        option => option.value === annotation.style?.backgroundColor
      );
      if (colorOption) {
        setSelectedColor(colorOption);
      }
      
      setFontSize(annotation.style?.fontSize || 14);
      
      // Load replies from annotation replies array
      const annotationReplies = annotation.replies?.map(reply => ({
        id: reply.id,
        author: reply.author,
        content: reply.content,
        timestamp: new Date(reply.timestamp)
      })) || [];
      setReplies(annotationReplies);
    } else {
      // Reset form when closing
      setContent('');
      setAuthor('');
      setSelectedColor(colorOptions[0]);
      setFontSize(14);
      setReplies([]);
      setNewReply('');
      setReplyAuthor('');
    }
  }, [annotation, isOpen]);

  const handleSave = useCallback(() => {
    if (!annotation) return;

    const updatedReplies = replies.map(reply => ({
      id: reply.id,
      author: reply.author,
      content: reply.content,
      timestamp: reply.timestamp.getTime()
    }));

    const updatedAnnotation: Annotation = {
      ...annotation,
      content,
      author,
      replies: updatedReplies,
      style: {
        ...annotation.style,
        backgroundColor: selectedColor.value,
        borderColor: selectedColor.border,
        fontSize
      }
    };

    onSave(updatedAnnotation);
    onClose();
  }, [annotation, content, author, selectedColor, fontSize, replies, onSave, onClose]);

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
      timestamp: new Date()
    };

    setReplies(prev => [...prev, reply]);
    setNewReply('');
    setReplyAuthor('');
  }, [newReply, replyAuthor]);

  const handleDeleteReply = useCallback((replyId: string) => {
    setReplies(prev => prev.filter(reply => reply.id !== replyId));
  }, []);

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
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Edit {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Enter ${annotation.type} content...`}
              rows={3}
            />
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter author name..."
            />
          </div>

          {/* Style options */}
          <div className="grid grid-cols-2 gap-4">
            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded border-2 ${
                      selectedColor.value === color.value
                        ? 'border-gray-900 ring-2 ring-gray-300'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value.toString()}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="p-3 rounded border min-h-[50px] flex items-center"
              style={{
                backgroundColor: selectedColor.value,
                borderColor: selectedColor.border,
                fontSize: `${fontSize}px`
              }}
            >
              {content || `Sample ${annotation.type} text`}
            </div>
          </div>

          {/* Replies section for comments */}
          {isComment && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold">Replies ({replies.length})</Label>
                
                {/* Existing replies */}
                {replies.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {replies.map((reply) => (
                      <div key={reply.id} className="bg-gray-50 p-2 rounded text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{reply.author}</div>
                            <div className="text-gray-700 mt-1">{reply.content}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {reply.timestamp.toLocaleDateString()} {reply.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDeleteReply(reply.id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new reply */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Your name"
                      value={replyAuthor}
                      onChange={(e) => setReplyAuthor(e.target.value)}
                    />
                    <Input
                      placeholder="Your reply"
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      className="col-span-2"
                      onKeyDown={(e) => {
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
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            onClick={handleDelete}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="space-x-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};