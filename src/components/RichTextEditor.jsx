import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Heading2, Link as LinkIcon, Undo, Redo } from 'lucide-react';

// Minimal WYSIWYG for legal/policy page content — headings, bold/italic, lists, links. Stores
// and emits plain HTML (what the public legal pages render via dangerouslySetInnerHTML), not
// Markdown or a JSON doc — simplest round-trip for a field that's just "some formatted text".
function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-primary/10 text-primary' : 'text-neutral-500 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 p-1.5 border-b border-neutral-100 bg-neutral-50 flex-wrap">
        <ToolbarButton title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-neutral-200 mx-1" />
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={15} />
        </ToolbarButton>
      </div>
      {/* No @tailwindcss/typography plugin in this project — styled by hand instead of the
          `prose` class, which would otherwise render unstyled (Tailwind's preflight strips
          default heading/list/link styling). */}
      <EditorContent
        editor={editor}
        className="p-4 min-h-[280px] max-h-[50vh] overflow-y-auto text-sm text-neutral-700
          [&_.ProseMirror]:outline-none
          [&_h2]:text-lg [&_h2]:font-poppins [&_h2]:font-semibold [&_h2]:text-secondary [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:first:mt-0
          [&_p]:mb-3 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1
          [&_a]:text-primary [&_a]:underline
          [&_strong]:font-semibold"
      />
    </div>
  );
}
