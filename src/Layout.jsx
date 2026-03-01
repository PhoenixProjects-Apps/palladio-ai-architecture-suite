import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="text-white font-sans" style={{ backgroundColor: '#0f1117', minHeight: '100vh' }}>
      <style>{`
        body { background-color: #0f1117 !important; margin: 0; }
        * { border-color: rgba(255,255,255,0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        .prose-invert h1, .prose-invert h2, .prose-invert h3 { color: #f9fafb; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
        .prose-invert h1 { font-size: 1.5rem; }
        .prose-invert h2 { font-size: 1.25rem; }
        .prose-invert h3 { font-size: 1.125rem; }
        .prose-invert p, .prose-invert li { color: #d1d5db; line-height: 1.6; }
        .prose-invert ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose-invert ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose-invert strong { color: #f9fafb; font-weight: 600; }
        .prose-invert code { color: #22d3ee; background: rgba(34,211,238,0.1); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; }
        .prose-invert pre { background: #1e293b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
        .prose-invert pre code { background: transparent; padding: 0; color: inherit; }
        .prose-invert blockquote { border-left: 4px solid #374151; padding-left: 1rem; color: #9ca3af; font-style: italic; margin: 1rem 0; }
      `}</style>
      <main className="fixed inset-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}