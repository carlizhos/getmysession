import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
} from 'lucide-react';

interface MiniEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault(); // Prevent focus loss from contentEditable
      onClick();
    }}
    title={title}
    className={cn(
      'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
      'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
      'dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700',
      active && 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
    )}
  >
    {children}
  </button>
);

const Separator = () => (
  <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
);

const MiniEditor = ({ content, onChange, className }: MiniEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Sync state after command
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Convert plain text with newlines to basic HTML for initial load
  const getInitialHtml = useCallback(() => {
    if (content.startsWith('<')) return content; // Already HTML
    return content
      .split('\n\n')
      .map((paragraph) => {
        const lines = paragraph.split('\n').join('<br>');
        return `<p>${lines}</p>`;
      })
      .join('');
  }, [content]);

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <ToolbarButton onClick={() => exec('bold')} title="Negrita (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Cursiva (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Subrayado (Ctrl+U)">
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec('formatBlock', '<h2>')} title="Título">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', '<h3>')} title="Subtítulo">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', '<p>')} title="Párrafo">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Lista con viñetas">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Lista numerada">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec('justifyCenter')} title="Centrar">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('removeFormat')} title="Limpiar formato">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec('undo')} title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('redo')} title="Rehacer (Ctrl+Y)">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: getInitialHtml() }}
        className={cn(
          'min-h-[300px] max-h-[500px] overflow-y-auto p-4 text-sm outline-none',
          'bg-white dark:bg-slate-900/40',
          'prose prose-sm dark:prose-invert max-w-none',
          // Refined typography for the editor
          'prose-headings:text-primary prose-headings:font-semibold',
          'prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2',
          'prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1',
          'prose-p:my-1 prose-p:leading-relaxed',
          'prose-li:my-0.5',
          'prose-strong:text-foreground',
          'focus:ring-2 focus:ring-primary/20 focus:ring-inset transition-shadow',
        )}
      />
    </div>
  );
};

export default MiniEditor;
