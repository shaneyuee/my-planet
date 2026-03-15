export default function MarkdownToolbar({ textareaRef, value, onChange }) {
  const insertMarkdown = (before, after = '', placeholder = '') => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const newText = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + selected.length;
      textarea.setSelectionRange(
        start + before.length,
        cursorPos
      );
    }, 0);
  };

  const buttons = [
    { label: 'B', title: '粗体', action: () => insertMarkdown('**', '**', '粗体文字') },
    { label: 'I', title: '斜体', action: () => insertMarkdown('*', '*', '斜体文字') },
    { label: 'H', title: '标题', action: () => insertMarkdown('## ', '', '标题') },
    { label: '<>', title: '行内代码', action: () => insertMarkdown('`', '`', 'code') },
    { label: '```', title: '代码块', action: () => insertMarkdown('```\n', '\n```', '代码') },
    { label: '- ', title: '列表', action: () => insertMarkdown('- ', '', '列表项') },
    { label: '>', title: '引用', action: () => insertMarkdown('> ', '', '引用文字') },
    { label: '🔗', title: '链接', action: () => insertMarkdown('[', '](url)', '链接文字') },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-1.5 bg-gray-50 border border-b-0 border-gray-300 rounded-t-lg">
      {buttons.map((btn) => (
        <button
          key={btn.title}
          type="button"
          onClick={btn.action}
          title={btn.title}
          className="px-2 py-1 text-xs font-mono text-gray-600 hover:bg-gray-200 rounded transition-colors min-w-[28px]"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
