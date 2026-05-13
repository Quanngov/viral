"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
  className?: string;
};

export function ScriptAssistantMarkdown({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-2 mt-3 border-b border-zinc-200 pb-1 text-base font-bold text-zinc-900 first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-3 border-b border-zinc-200 pb-1 text-base font-bold text-zinc-900 first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-2.5 text-sm font-bold text-zinc-900 first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-zinc-800 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-800 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-zinc-800 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="marker:text-zinc-400">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
          hr: () => <hr className="my-3 border-zinc-200" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-emerald-700 underline decoration-emerald-300/70 underline-offset-2 hover:text-emerald-800"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const inline = !className;
            if (inline) {
              return (
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800">{children}</code>
              );
            }
            return <code className="font-mono text-xs text-zinc-800">{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="mb-2 max-w-full overflow-x-auto rounded-lg bg-zinc-100 p-2 font-mono text-xs text-zinc-800 last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-emerald-300/80 pl-3 text-sm italic text-zinc-700 last:mb-0">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="mb-2 w-full max-w-full overflow-x-auto last:mb-0">
              <table className="min-w-full border-collapse border border-zinc-200 text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-100">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-zinc-200 last:border-b-0">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-zinc-200 px-2 py-1.5 font-semibold text-zinc-800">{children}</th>
          ),
          td: ({ children }) => <td className="border border-zinc-200 px-2 py-1.5 text-zinc-700">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
