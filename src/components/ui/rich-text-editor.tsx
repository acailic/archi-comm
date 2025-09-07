import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder = "Write your annotation...", className, onFocus, onBlur }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        TextStyle,
        Color,
        ListItem.configure({
          HTMLAttributes: {
            class: "leading-normal",
          },
        }),
      ],
      content: value,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        if (html !== value) {
          onChange(html);
        }
      },
      onFocus: () => {
        onFocus?.();
      },
      onBlur: () => {
        onBlur?.();
      },
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm max-w-none focus:outline-none",
            "min-h-[100px] p-3",
            "[&_ul]:list-disc [&_ul]:ml-6",
            "[&_ol]:list-decimal [&_ol]:ml-6",
            "[&_li]:leading-relaxed",
          ),
        },
      },
    });

    // Update editor content when value prop changes externally
    React.useEffect(() => {
      if (editor && editor.getHTML() !== value) {
        editor.commands.setContent(value);
      }
    }, [value, editor]);

    if (!editor) {
      return null;
    }

    const ToolbarButton = ({ 
      onClick, 
      isActive, 
      children, 
      title 
    }: {
      onClick: () => void;
      isActive?: boolean;
      children: React.ReactNode;
      title: string;
    }) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          "h-8 w-8 p-0",
          isActive && "bg-accent text-accent-foreground"
        )}
        title={title}
      >
        {children}
      </Button>
    );

    return (
      <div 
        ref={ref}
        className={cn(
          "border border-input bg-input-background rounded-md focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          className
        )}
      >
        <div className="border-b border-input px-3 py-2 flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <EditorContent 
          editor={editor}
          className={cn(
            "min-h-[100px]",
            !editor.isFocused && editor.isEmpty && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none before:absolute before:p-3"
          )}
          data-placeholder={placeholder}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };