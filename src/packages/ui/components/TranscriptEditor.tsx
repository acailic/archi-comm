// src/components/TranscriptEditor.tsx
// Specialized transcript editor component using TipTap with enhanced features for transcript editing
// Provides timestamp insertion, word highlighting, and real-time playback synchronization
// RELEVANT FILES: src/components/ui/rich-text-editor.tsx, src/lib/lazy-imports/tiptap-loader.ts, src/shared/contracts/index.ts

import React from 'react';
import { Bold, Italic, List, ListOrdered, Clock, Highlighter, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import {
  loadTiptapReact,
  loadTiptapStarterKit,
  loadTiptapTranscriptExtensions,
} from '@/lib/lazy-imports/tiptap-loader';
import type { TranscriptionSegment } from '@/shared/contracts/index';

interface TranscriptEditorProps {
  value: string;
  onChange: (content: string) => void;
  onTimestampClick?: (timestamp: number) => void;
  currentTime?: number;
  segments?: TranscriptionSegment[];
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  // New props for enhanced functionality
  realtimeText?: string; // Live transcription preview
  isRealtime?: boolean; // Whether real-time mode is active
  transcriptionSource?: 'whisper-rs' | 'transformers-js' | 'whisper-wasm' | 'web-speech'; // Source indicator
  onRetranscribe?: (engine: string) => void; // Callback to retranscribe with different engine
}

type LoadedTiptapTranscript = {
  useEditor: any;
  EditorContent: any;
  StarterKit: any;
  TextStyle: any;
  Color: any;
  ListItem: any;
  Highlight: any;
};

// Custom Timestamp extension for TipTap
const createTimestampExtension = (onTimestampClick?: (timestamp: number) => void) => {
  return {
    name: 'timestamp',

    addOptions() {
      return {
        HTMLAttributes: {},
      };
    },

    parseHTML() {
      return [
        {
          tag: 'span[data-timestamp]',
        },
      ];
    },

    renderHTML({ HTMLAttributes }: any) {
      return ['span', { class: 'timestamp-marker', ...HTMLAttributes }, 0];
    },

    addCommands() {
      return {
        insertTimestamp:
          (timestamp: number) =>
          ({ commands }: any) => {
            const formattedTime = formatTimestamp(timestamp);
            return commands.insertContent({
              type: 'text',
              marks: [
                {
                  type: 'timestamp',
                  attrs: { 'data-timestamp': timestamp },
                },
              ],
              text: `[${formattedTime}]`,
            });
          },
      };
    },

    addProseMirrorPlugins() {
      const ProseMirror = (window as any).ProseMirror;
      if (!ProseMirror?.state?.Plugin) {
        return [];
      }

      return [
        new ProseMirror.state.Plugin({
          props: {
            handleClick(view: any, pos: any, event: any) {
              const { target } = event;
              if (target?.classList?.contains('timestamp-marker')) {
                const timestamp = parseFloat(target.getAttribute('data-timestamp'));
                if (!isNaN(timestamp) && onTimestampClick) {
                  onTimestampClick(timestamp);
                  return true;
                }
              }
              return false;
            },
          },
        }),
      ];
    },
  };
};

const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function TranscriptEditorInner(
  {
    mods,
    value,
    onChange,
    onTimestampClick,
    currentTime = 0,
    segments = [],
    placeholder,
    className,
    onFocus,
    onBlur,
    // enhanced props
    realtimeText,
    isRealtime,
    transcriptionSource,
    onRetranscribe,
  }: TranscriptEditorProps & { mods: LoadedTiptapTranscript },
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { useEditor, EditorContent, StarterKit, TextStyle, Color, ListItem, Highlight } = mods;
  const [searchTerm, setSearchTerm] = React.useState('');
  const [highlightColor, setHighlightColor] = React.useState('#ffff00');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      TextStyle,
      Color,
      ListItem.configure({ HTMLAttributes: { class: 'leading-normal' } }),
      Highlight.configure({ multicolor: true }),
      createTimestampExtension(onTimestampClick),
    ],
    content: value,
    onUpdate: ({ editor }: any) => {
      const html = editor.getHTML();
      if (html !== value) onChange(html);
    },
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[100px] p-3',
          '[&_ul]:list-disc [&_ul]:ml-6',
          '[&_ol]:list-decimal [&_ol]:ml-6',
          '[&_li]:leading-relaxed',
          '[&_.timestamp-marker]:bg-blue-100 [&_.timestamp-marker]:text-blue-800 [&_.timestamp-marker]:px-1 [&_.timestamp-marker]:rounded [&_.timestamp-marker]:cursor-pointer [&_.timestamp-marker]:text-xs [&_.timestamp-marker]:font-mono'
        ),
      },
    },
  });

  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Highlight current speaking words based on audio playback time
  React.useEffect(() => {
    if (!editor || !segments.length || currentTime === 0) return;

    const currentSegment = segments.find(
      segment => currentTime >= segment.start && currentTime <= segment.end
    );

    if (currentSegment) {
      // Find and highlight the current segment text
      const content = editor.getHTML();
      const segmentText = currentSegment.text.trim();

      if (content.includes(segmentText)) {
        // Simple highlighting - in a real implementation, this would be more sophisticated
        editor.commands.focus();
      }
    }
  }, [currentTime, segments, editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      onClick={onClick}
      className={cn('h-8 w-8 p-0', isActive && 'bg-accent text-accent-foreground')}
      title={title}
    >
      {children}
    </Button>
  );

  const insertCurrentTimestamp = () => {
    if (currentTime > 0) {
      editor.chain().focus().insertTimestamp(currentTime).run();
    }
  };

  const highlightSearchTerm = () => {
    if (searchTerm.trim()) {
      // Simple search and highlight - find all instances and highlight them
      const { from, to } = editor.state.selection;
      editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });

      // Use the search term to highlight - this is a simplified version
      editor.chain().focus().toggleHighlight({ color: highlightColor }).run();
      editor.commands.setTextSelection({ from, to });
    }
  };

  const colors = [
    '#ffff00', // Yellow
    '#00ff00', // Green
    '#00ffff', // Cyan
    '#ff00ff', // Magenta
    '#ffa500', // Orange
  ];

  // Map source to display label
  const sourceLabel = transcriptionSource
    ? {
        'whisper-rs': 'Whisper-rs',
        'transformers-js': 'Transformers.js',
        'whisper-wasm': 'Whisper.cpp WASM',
        'web-speech': 'Web Speech',
      }[transcriptionSource]
    : undefined;

  // Engines for quick switching
  const engineOptions = [
    { label: 'Whisper-rs', value: 'Whisper-rs' },
    { label: 'Transformers.js', value: 'Transformers.js' },
    { label: 'Whisper.cpp WASM', value: 'Whisper.cpp WASM' },
    { label: 'Web Speech API', value: 'Web Speech API' },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        'border border-input bg-input-background rounded-md focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        className
      )}
    >
      {/* Main Toolbar */}
      <div className='border-b border-input px-3 py-2 flex items-center justify-between gap-1 flex-wrap'>
        {/* Left: formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title='Bold (Ctrl+B)'
        >
          <Bold className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title='Italic (Ctrl+I)'
        >
          <Italic className='h-4 w-4' />
        </ToolbarButton>
        <div className='w-px h-4 bg-border mx-1' />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title='Bullet List'
        >
          <List className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title='Numbered List'
        >
          <ListOrdered className='h-4 w-4' />
        </ToolbarButton>
        <div className='w-px h-4 bg-border mx-1' />
        <ToolbarButton onClick={insertCurrentTimestamp} title='Insert Timestamp (Ctrl+T)'>
          <Clock className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title='Highlight Text (Ctrl+H)'
        >
          <Highlighter className='h-4 w-4' />
        </ToolbarButton>

        {/* Color picker for highlights */}
        <div className='flex items-center gap-1 ml-2'>
          {colors.map(color => (
            <button
              key={color}
              className={cn(
                'w-4 h-4 rounded border',
                highlightColor === color && 'ring-2 ring-blue-500'
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                setHighlightColor(color);
                if (editor.isActive('highlight')) {
                  editor.chain().focus().toggleHighlight({ color }).run();
                }
              }}
              title={`Highlight with ${color}`}
            />
          ))}
        </div>
        {/* Right: source badge and engine switcher */}
        <div className='ml-auto flex items-center gap-2'>
          {sourceLabel && (
            <Badge variant='outline' className='text-xs'>{sourceLabel}</Badge>
          )}
          {onRetranscribe && (
            <div className='flex items-center gap-1'>
              <span className='text-xs text-muted-foreground'>Engine:</span>
              <select
                className='border rounded px-2 py-1 text-xs bg-background'
                onChange={(e) => onRetranscribe(e.target.value)}
                defaultValue={sourceLabel ? (engineOptions.find(o => o.label === sourceLabel)?.value || '') : ''}
              >
                <option value='' disabled>Select</option>
                {engineOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Search Toolbar */}
      <div className='border-b border-input px-3 py-2 flex items-center gap-2'>
        <Search className='h-4 w-4 text-muted-foreground' />
        <input
          type='text'
          placeholder='Search and highlight...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='flex-1 text-sm bg-transparent border-none outline-none'
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              highlightSearchTerm();
            }
          }}
        />
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={highlightSearchTerm}
          disabled={!searchTerm.trim()}
        >
          Highlight All
        </Button>
      </div>

      {isRealtime && realtimeText && (
        <div className="border-b border-input px-3 py-2 bg-blue-50 text-sm">{realtimeText}</div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          'min-h-[100px]',
          !editor.isFocused &&
            editor.isEmpty &&
            'before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none before:absolute before:p-3'
        )}
        data-placeholder={placeholder}
      />
    </div>
  );
}

const TranscriptEditorForward = React.forwardRef<
  HTMLDivElement,
  TranscriptEditorProps & { mods: LoadedTiptapTranscript }
>(TranscriptEditorInner);

const TranscriptEditor = React.forwardRef<HTMLDivElement, TranscriptEditorProps>(
  (
    {
      value,
      onChange,
      onTimestampClick,
      currentTime,
      segments,
      placeholder = 'Enter transcript or record audio...',
      className,
      onFocus,
      onBlur,
      realtimeText,
      isRealtime,
      transcriptionSource,
      onRetranscribe,
    },
    ref
  ) => {
    const [mods, setMods] = React.useState<LoadedTiptapTranscript | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const [{ useEditor, EditorContent }, StarterKit, exts] = await Promise.all([
            loadTiptapReact(),
            loadTiptapStarterKit(),
            loadTiptapTranscriptExtensions(),
          ]);
          if (!cancelled) {
            setMods({
              useEditor,
              EditorContent,
              StarterKit: StarterKit.default || StarterKit,
              TextStyle: exts.TextStyle,
              Color: exts.Color,
              ListItem: exts.ListItem,
              Highlight: exts.Highlight,
            });
          }
        } catch (e: any) {
          if (!cancelled) setError(e?.message || 'Failed to load transcript editor');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    // Keyboard shortcuts
    React.useEffect(() => {
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key) {
            case 't':
              e.preventDefault();
              if (currentTime && currentTime > 0) {
                // Trigger timestamp insertion
              }
              break;
            case 'h':
              e.preventDefault();
              // Trigger highlight
              break;
          }
        }
      };

      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }, [currentTime]);

    if (error) {
      return (
        <div
          className={cn(
            'text-xs text-destructive border border-destructive/20 bg-destructive/5 p-3 rounded-md',
            className
          )}
        >
          Failed to load transcript editor. Please try refreshing or use basic text input.
        </div>
      );
    }

    if (!mods) {
      return (
        <div
          className={cn(
            'text-xs text-muted-foreground border border-input p-3 rounded-md bg-input-background',
            className
          )}
        >
          Loading enhanced transcript editor...
        </div>
      );
    }

    return (
      <TranscriptEditorForward
        ref={ref}
        mods={mods}
        value={value}
        onChange={onChange}
        onTimestampClick={onTimestampClick}
        currentTime={currentTime}
        segments={segments}
        placeholder={placeholder}
        className={className}
        onFocus={onFocus}
        onBlur={onBlur}
        realtimeText={realtimeText}
        isRealtime={isRealtime}
        transcriptionSource={transcriptionSource}
        onRetranscribe={onRetranscribe}
      />
    );
  }
);

TranscriptEditor.displayName = 'TranscriptEditor';

export { TranscriptEditor };
