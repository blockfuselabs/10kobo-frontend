import type { ReactNode } from 'react';

/** The top of every card: its icon in a lime circle, a title, one line on what it is, and room for a badge. */
export function CardHeader({ Icon, title, children, aside }: { Icon: () => ReactNode; title: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--line)] pb-3.5">
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pop)] text-[#111]"><Icon /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold">{title}</p>
        {children && <div className="text-sm text-[var(--muted)]">{children}</div>}
      </div>
      {aside}
    </div>
  );
}
