import React from 'react';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';
import { loadTiptapReact, loadTiptapStarterKit, loadTiptapExtensions } from '@/lib/lazy-imports/tiptap-loader';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

type LoadedTiptap = {
  useEditor: any;
  EditorContent: any;
  StarterKit: any;
  TextStyle: any;
  Color: any;
  ListItem: any;
};

function TiptapEditor(
  {
    mods,
    value,
    onChange,
    placeholder,
    className,
    onFocus,
    onBlur,
  }: RichTextEditorProps & { mods: LoadedTiptap },
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { useEditor, EditorContent, StarterKit, TextStyle, Color, ListItem } = mods;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      TextStyle,
      Color,
      ListItem.configure({ HTMLAttributes: { class: 'leading-normal' } }),
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
          '[&_li]:leading-relaxed'
        ),
      },
    },
  });

  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

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

  return (
    <div
      ref={ref}
      className={cn(
        'border border-input bg-input-background rounded-md focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        className
      )}
    >
      <div className='border-b border-input px-3 py-2 flex items-center gap-1'>
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
      </div>
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

const TiptapEditorForward = React.forwardRef<HTMLDivElement, RichTextEditorProps & { mods: LoadedTiptap }>(TiptapEditor);

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    { value, onChange, placeholder = 'Write your annotation...', className, onFocus, onBlur },
    ref
  ) => {
    const [mods, setMods] = React.useState<LoadedTiptap | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const [{ useEditor, EditorContent }, StarterKit, exts] = await Promise.all([
            loadTiptapReact(),
            loadTiptapStarterKit(),
            loadTiptapExtensions(),
          ]);
          if (!cancelled) {
            setMods({
              useEditor,
              EditorContent,
              StarterKit: StarterKit.default || StarterKit,
              TextStyle: exts.TextStyle,
              Color: exts.Color,
              ListItem: exts.ListItem,
            });
          }
        } catch (e: any) {
          if (!cancelled) setError(e?.message || 'Failed to load editor');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    if (error) return <div className={cn('text-xs text-destructive', className)}>Failed to load editor</div>;
    if (!mods) return <div className={cn('text-xs text-muted-foreground', className)}>Loading editor...</div>;
    return (
      <TiptapEditorForward
        ref={ref}
        mods={mods}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };
