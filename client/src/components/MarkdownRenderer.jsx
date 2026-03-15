import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Link } from 'react-router-dom';

function preprocessMentions(text) {
  if (!text) return '';
  return text.replace(/@\[([^\]]+)\]\((\d+)\)/g, '[@$1](/user/$2)');
}

function CustomLink({ href, children, ...props }) {
  if (href && href.startsWith('/user/')) {
    return (
      <Link to={href} className="text-indigo-600 hover:underline font-medium">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline" {...props}>
      {children}
    </a>
  );
}

export default function MarkdownRenderer({ content, className = '' }) {
  const processed = preprocessMentions(content);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: CustomLink,
          code({ inline, className: codeClassName, children, ...props }) {
            if (inline) {
              return (
                <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-2">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
