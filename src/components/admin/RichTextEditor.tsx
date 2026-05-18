import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write product description...',
  minHeight = 180,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url) exec('createLink', url);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-himalayan/30 focus-within:border-himalayan">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-2">
        <button type="button" onClick={() => exec('bold')} className="p-2 rounded-lg hover:bg-white text-charcoal" title="Bold">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => exec('italic')} className="p-2 rounded-lg hover:bg-white text-charcoal" title="Italic">
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => exec('insertUnorderedList')} className="p-2 rounded-lg hover:bg-white text-charcoal" title="Bullet list">
          <List size={16} />
        </button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="p-2 rounded-lg hover:bg-white text-charcoal" title="Numbered list">
          <ListOrdered size={16} />
        </button>
        <button type="button" onClick={addLink} className="p-2 rounded-lg hover:bg-white text-charcoal" title="Add link">
          <Link2 size={16} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="px-4 py-3 text-charcoal outline-none prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        style={{ minHeight }}
      />
    </div>
  );
}
