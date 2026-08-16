import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Type } from
'lucide-react';

interface WysiwygEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export interface WysiwygEditorRef {
  insertText: (text: string) => void;
  focus: () => void;
}

export const WysiwygEditor = forwardRef<WysiwygEditorRef, WysiwygEditorProps>(
  function WysiwygEditor({ content, onChange, placeholder }, ref) {
    const editor = useEditor({
      extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      })],

      content: content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4'
        }
      }
    });

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        if (editor) {
          editor.chain().focus().insertContent(text).run();
        }
      },
      focus: () => {
        if (editor) {
          editor.chain().focus().run();
        }
      }
    }), [editor]);

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
    }, [content, editor]);

    if (!editor) {
      return null;
    }

    const setLink = () => {
      const previousUrl = editor.getAttributes('link').href;
      const url = window.prompt('URL eingeben:', previousUrl);

      if (url === null) {
        return;
      }

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }

      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
      <div data-ev-id="ev_c88682bd72" className="border border-input rounded-lg overflow-hidden bg-background">
        {/* Toolbar */}
        <div data-ev-id="ev_b4f88e988e" className="flex flex-wrap items-center gap-1 p-2 border-b border-input bg-muted/50">
          {/* Text formatting */}
          <button data-ev-id="ev_178bee6b0b"
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('bold') ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Fett">

            <Bold className="w-4 h-4" />
          </button>
          <button data-ev-id="ev_e4f989f8c2"
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('italic') ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Kursiv">

            <Italic className="w-4 h-4" />
          </button>

          <div data-ev-id="ev_9343552cd9" className="w-px h-6 bg-border mx-1" />

          {/* Headings */}
          <button data-ev-id="ev_ce3650b06d"
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('heading', { level: 1 }) ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Überschrift 1">

            <Heading1 className="w-4 h-4" />
          </button>
          <button data-ev-id="ev_02f43673ec"
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('heading', { level: 2 }) ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Überschrift 2">

            <Heading2 className="w-4 h-4" />
          </button>
          <button data-ev-id="ev_cb9d119d40"
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('paragraph') ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Absatz">

            <Type className="w-4 h-4" />
          </button>

          <div data-ev-id="ev_2229747902" className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <button data-ev-id="ev_659593072d"
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('bulletList') ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Aufzählung">

            <List className="w-4 h-4" />
          </button>
          <button data-ev-id="ev_3a2f64f32a"
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('orderedList') ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Nummerierte Liste">

            <ListOrdered className="w-4 h-4" />
          </button>

          <div data-ev-id="ev_1c6c0800ce" className="w-px h-6 bg-border mx-1" />

          {/* Links */}
          <button data-ev-id="ev_da77dd3b10"
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-muted transition-colors ${
          editor.isActive('link') ? 'bg-muted text-primary' : 'text-muted-foreground'}`
          }
          title="Link einfügen">

            <LinkIcon className="w-4 h-4" />
          </button>
          <button data-ev-id="ev_9e6f3e5696"
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
          title="Link entfernen">

            <Unlink className="w-4 h-4" />
          </button>

          <div data-ev-id="ev_21bbfaa5c7" className="flex-1" />

          {/* Undo/Redo */}
          <button data-ev-id="ev_01b26fc9a7"
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
          title="Rückgängig">

            <Undo className="w-4 h-4" />
          </button>
          <button data-ev-id="ev_15346d4b97"
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
          title="Wiederholen">

            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />

        {/* Styles */}
        <style data-ev-id="ev_c5898f5464">{`
          .ProseMirror p.is-editor-empty:first-child::before {
            content: '${placeholder || "Text eingeben..."}'; 
            color: #9ca3af;
            float: left;
            height: 0;
            pointer-events: none;
          }
          .ProseMirror {
            min-height: 200px;
          }
          .ProseMirror h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }
          .ProseMirror h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .ProseMirror h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .ProseMirror p {
            margin-bottom: 0.5rem;
          }
          .ProseMirror ul, .ProseMirror ol {
            padding-left: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .ProseMirror ul {
            list-style-type: disc;
          }
          .ProseMirror ol {
            list-style-type: decimal;
          }
          .ProseMirror a {
            color: var(--color-primary);
            text-decoration: underline;
          }
          .ProseMirror strong {
            font-weight: 700;
          }
          .ProseMirror em {
            font-style: italic;
          }
        `}</style>
      </div>);

  }
);