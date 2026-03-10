import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { Components } from 'react-markdown';

// Minimal zinc-based theme for syntax highlighting
const zincTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#a1a1aa', // zinc-400
    fontSize: '0.8125rem',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  'pre[class*="language-"]': {
    color: '#a1a1aa',
    fontSize: '0.8125rem',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    margin: 0,
    padding: '0.75rem',
    overflow: 'auto',
    background: 'transparent',
  },
  comment: { color: '#52525b' },     // zinc-600
  prolog: { color: '#52525b' },
  doctype: { color: '#52525b' },
  cdata: { color: '#52525b' },
  punctuation: { color: '#71717a' }, // zinc-500
  property: { color: '#a1a1aa' },    // zinc-400
  tag: { color: '#d4d4d8' },        // zinc-300
  boolean: { color: '#d4d4d8' },
  number: { color: '#d4d4d8' },
  constant: { color: '#d4d4d8' },
  symbol: { color: '#d4d4d8' },
  selector: { color: '#a1a1aa' },
  'attr-name': { color: '#a1a1aa' },
  string: { color: '#a1a1aa' },
  char: { color: '#a1a1aa' },
  builtin: { color: '#a1a1aa' },
  operator: { color: '#71717a' },
  entity: { color: '#a1a1aa' },
  url: { color: '#71717a' },
  keyword: { color: '#d4d4d8' },
  regex: { color: '#a1a1aa' },
  important: { color: '#d4d4d8', fontWeight: 'bold' },
  atrule: { color: '#a1a1aa' },
  'attr-value': { color: '#a1a1aa' },
  function: { color: '#d4d4d8' },
  'class-name': { color: '#d4d4d8' },
};

// Light theme variant
const zincThemeLight: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#52525b', // zinc-600
    fontSize: '0.8125rem',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  'pre[class*="language-"]': {
    color: '#52525b',
    fontSize: '0.8125rem',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    margin: 0,
    padding: '0.75rem',
    overflow: 'auto',
    background: 'transparent',
  },
  comment: { color: '#a1a1aa' },     // zinc-400
  prolog: { color: '#a1a1aa' },
  doctype: { color: '#a1a1aa' },
  cdata: { color: '#a1a1aa' },
  punctuation: { color: '#71717a' }, // zinc-500
  property: { color: '#52525b' },
  tag: { color: '#3f3f46' },        // zinc-700
  boolean: { color: '#3f3f46' },
  number: { color: '#3f3f46' },
  constant: { color: '#3f3f46' },
  symbol: { color: '#3f3f46' },
  selector: { color: '#52525b' },
  'attr-name': { color: '#52525b' },
  string: { color: '#52525b' },
  char: { color: '#52525b' },
  builtin: { color: '#52525b' },
  operator: { color: '#71717a' },
  entity: { color: '#52525b' },
  url: { color: '#71717a' },
  keyword: { color: '#3f3f46' },
  regex: { color: '#52525b' },
  important: { color: '#3f3f46', fontWeight: 'bold' },
  atrule: { color: '#52525b' },
  'attr-value': { color: '#52525b' },
  function: { color: '#3f3f46' },
  'class-name': { color: '#3f3f46' },
};

interface MarkdownContentProps {
  children: string;
  className?: string;
}

export function MarkdownContent({ children, className = '' }: MarkdownContentProps) {
  // Detect dark mode
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const components: Components = {
    // Code blocks and inline code
    code({ className: codeClassName, children: codeChildren, ...props }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const isInline = !match && !codeClassName;

      if (isInline) {
        return (
          <code
            className="px-1 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
            {...props}
          >
            {codeChildren}
          </code>
        );
      }

      const language = match ? match[1] : '';
      return (
        <SyntaxHighlighter
          style={isDark ? zincTheme : zincThemeLight}
          language={language}
          PreTag="div"
          customStyle={{
            background: 'transparent',
            margin: 0,
            padding: '0.75rem',
            borderRadius: 0,
          }}
        >
          {String(codeChildren).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    },
    // Wrap code blocks in a styled container
    pre({ children: preChildren }) {
      return (
        <pre className="my-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-auto">
          {preChildren}
        </pre>
      );
    },
    // Links
    a({ href, children: linkChildren }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {linkChildren}
        </a>
      );
    },
    // Headers - kept small since these are comments/descriptions
    h1({ children: h }) {
      return <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3 mb-1">{h}</h1>;
    },
    h2({ children: h }) {
      return <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-3 mb-1">{h}</h2>;
    },
    h3({ children: h }) {
      return <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-2 mb-1">{h}</h3>;
    },
    h4({ children: h }) {
      return <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-2 mb-1">{h}</h4>;
    },
    // Paragraphs
    p({ children: pChildren }) {
      return <p className="my-1">{pChildren}</p>;
    },
    // Lists
    ul({ children: ulChildren }) {
      return <ul className="list-disc pl-5 my-1 space-y-0.5">{ulChildren}</ul>;
    },
    ol({ children: olChildren }) {
      return <ol className="list-decimal pl-5 my-1 space-y-0.5">{olChildren}</ol>;
    },
    li({ children: liChildren }) {
      return <li className="text-sm">{liChildren}</li>;
    },
    // Blockquote
    blockquote({ children: bqChildren }) {
      return (
        <blockquote className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 my-2 text-zinc-500 dark:text-zinc-400">
          {bqChildren}
        </blockquote>
      );
    },
    // Horizontal rule
    hr() {
      return <hr className="border-zinc-200 dark:border-zinc-700 my-3" />;
    },
    // Table
    table({ children: tChildren }) {
      return (
        <div className="overflow-auto my-2">
          <table className="w-full text-sm border-collapse border border-zinc-200 dark:border-zinc-700">{tChildren}</table>
        </div>
      );
    },
    thead({ children: thChildren }) {
      return <thead className="bg-zinc-100 dark:bg-zinc-800">{thChildren}</thead>;
    },
    th({ children: thChildren }) {
      return <th className="px-2 py-1 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">{thChildren}</th>;
    },
    td({ children: tdChildren }) {
      return <td className="px-2 py-1 text-sm border border-zinc-200 dark:border-zinc-700">{tdChildren}</td>;
    },
    // Strikethrough (from GFM)
    del({ children: delChildren }) {
      return <del className="text-zinc-400 dark:text-zinc-500">{delChildren}</del>;
    },
    // Strong / emphasis
    strong({ children: strongChildren }) {
      return <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{strongChildren}</strong>;
    },
    em({ children: emChildren }) {
      return <em className="italic">{emChildren}</em>;
    },
  };

  return (
    <div className={`markdown-content text-sm text-zinc-600 dark:text-zinc-400 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
