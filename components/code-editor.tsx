'use client';

import { Fragment, useState, type ReactNode } from 'react';

// Colours from VS Code's Dark+ theme, so the code reads the way developers are used to.
const COLOUR = {
  comment: '#6A9955',
  string: '#CE9178',
  tag: '#569CD6',
  number: '#B5CEA8',
  keyword: '#569CD6',
  control: '#C586C0',
  call: '#DCDCAA',
  property: '#9CDCFE',
  text: '#D4D4D4',
};
const CONTROL = new Set(['if', 'else', 'return', 'throw', 'await', 'for', 'while', 'import', 'from', 'export']);
const TOKENS =
  /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|(<\/?[A-Za-z][\w-]*|\/?>)|(\b\d+(?:\.\d+)?\b)|\b(const|let|var|async|function|new|true|false|null|typeof|if|else|return|throw|await|for|while|import|from|export)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w-]*)(?=\s*[:=](?!=))/g;

/** A small highlighter for the JavaScript and HTML on this page. Not a full parser, and it does not need to be. */
function highlight(line: string): ReactNode[] {
  if (/^\s*#/.test(line)) return [<span key="c" style={{ color: COLOUR.comment, fontStyle: 'italic' }}>{line}</span>];
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKENS)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(line.slice(last, at));
    const [text, comment, string, tag, number, keyword, call, property] = match;
    const colour = comment ? COLOUR.comment : string ? COLOUR.string : tag ? COLOUR.tag : number ? COLOUR.number : keyword ? (CONTROL.has(keyword) ? COLOUR.control : COLOUR.keyword) : call ? COLOUR.call : property ? COLOUR.property : COLOUR.text;
    parts.push(<span key={at} style={{ color: colour, fontStyle: comment ? 'italic' : undefined }}>{text}</span>);
    last = at + text.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

export interface CodeFile {
  name: string;
  code: string;
}

/** Code in a window that looks like VS Code: tabs for files, line numbers, Dark+ colours and a copy button. */
export function CodeEditor({ files, active, onSelect }: { files: CodeFile[]; active: number; onSelect: (index: number) => void }) {
  const [copied, setCopied] = useState(false);
  const file = files[active];
  const lines = file.code.split('\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(file.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-black/40 bg-[#1E1E1E] text-[#D4D4D4] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
      <div className="flex items-center gap-2 bg-[#323233] px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" aria-hidden />
        <span className="ml-3 truncate text-xs text-[#9D9D9D]">your-shop — {file.name}</span>
      </div>
      <div className="flex items-stretch overflow-x-auto bg-[#252526]" role="tablist" aria-label="Files">
        {files.map((item, index) => (
          <button
            key={item.name}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => onSelect(index)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 border-t-2 px-4 py-2 font-mono text-xs ${index === active ? 'border-[#0078D4] bg-[#1E1E1E] text-white' : 'border-transparent text-[#969696] hover:text-[#CCCCCC]'}`}
          >
            <span className={item.name.endsWith('.html') ? 'text-[#E37933]' : item.name.endsWith('.sh') ? 'text-[#89E051]' : item.name.endsWith('.json') ? 'text-[#CBCB41]' : item.name.endsWith('.ts') ? 'text-[#3178C6]' : 'text-[#CBCB41]'} aria-hidden>{item.name.endsWith('.html') ? '<>' : item.name.endsWith('.sh') ? '$' : item.name.endsWith('.json') ? '{}' : item.name.endsWith('.ts') ? 'TS' : 'JS'}</span>
            {item.name}
          </button>
        ))}
        <button type="button" onClick={() => void copy()} className="ml-auto shrink-0 cursor-pointer px-4 text-xs text-[#9D9D9D] hover:text-white">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${file.name} code`} className="m-0 max-h-[25rem] overflow-auto !rounded-none !border-0 !bg-transparent py-4 font-mono text-[12.5px] leading-[1.35rem] !text-[#D4D4D4]">
        <code className="grid grid-cols-[auto_1fr]">
          {lines.map((line, index) => (
            <Fragment key={index}>
              <span className="select-none pr-5 pl-4 text-right text-[#6E7681]" aria-hidden>{index + 1}</span>
              <span className="pr-6 whitespace-pre">{highlight(line)}</span>
            </Fragment>
          ))}
        </code>
      </pre>
      <div className="flex items-center justify-between bg-[#007ACC] px-4 py-0.5 font-mono text-[11px] text-white">
        <span>{file.name.endsWith('.html') ? 'HTML' : file.name.endsWith('.sh') ? 'Shell' : file.name.endsWith('.json') ? 'JSON' : file.name.endsWith('.ts') ? 'TypeScript' : 'JavaScript'}</span>
        <span>UTF-8 · {lines.length} lines</span>
      </div>
    </div>
  );
}
