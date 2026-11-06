import { Fragment, type ReactNode } from 'react';

/** **bold** inside a line. Everything else stays plain text, so nothing in a message can become a link or markup. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    /^\*\*[^*\n]+\*\*$/.test(part) ? <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>,
  );
}

type Block = { kind: 'text'; lines: string[] } | { kind: 'steps'; items: string[]; start: number } | { kind: 'points'; items: string[] };

/**
 * An assistant reply with just enough shape to read: lines starting "1." become numbered steps, lines starting "- "
 * become points, and **words** are bold. Plain text otherwise.
 */
export function RichText({ text }: { text: string }) {
  const blocks: Block[] = [];
  for (const line of text.split('\n')) {
    const step = /^\s*(\d{1,2})[.)]\s+(.*)$/.exec(line);
    const point = /^\s*[-•]\s+(.*)$/.exec(line);
    const last = blocks.at(-1);
    if (step) {
      if (last?.kind === 'steps') last.items.push(step[2]!);
      else blocks.push({ kind: 'steps', items: [step[2]!], start: Number(step[1]) });
    } else if (point) {
      if (last?.kind === 'points') last.items.push(point[1]!);
      else blocks.push({ kind: 'points', items: [point[1]!] });
    } else if (last?.kind === 'text') last.lines.push(line);
    else blocks.push({ kind: 'text', lines: [line] });
  }
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        if (block.kind === 'steps') {
          return (
            <ol key={index} start={block.start} className="flex list-decimal flex-col gap-1 pl-5 marker:font-semibold">
              {block.items.map((item, at) => <li key={at}>{inline(item)}</li>)}
            </ol>
          );
        }
        if (block.kind === 'points') {
          return (
            <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
              {block.items.map((item, at) => <li key={at}>{inline(item)}</li>)}
            </ul>
          );
        }
        const body = block.lines.join('\n').replace(/^\n+|\n+$/g, '');
        return body ? <span key={index} className="block whitespace-pre-wrap">{inline(body)}</span> : null;
      })}
    </div>
  );
}

/** The same text without the ** marks, for copying. */
export const plainText = (text: string) => text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
