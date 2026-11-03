import type { ReactNode } from 'react';

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  );
}

export const ChatIcon = () => <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.4A8 8 0 1 1 21 12Z" /></Icon>;
export const CalendarIcon = () => <Icon><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></Icon>;
export const ActivityIcon = () => <Icon><path d="M3 12h4l3-7 4 14 3-7h4" /></Icon>;
export const PlusIcon = () => <Icon><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></Icon>;
export const SendIcon = () => <Icon><path d="M12 19V5M6 11l6-6 6 6" /></Icon>;
export const CopyIcon = () => <Icon size={14}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" /><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" /></Icon>;
export const CheckIcon = () => <Icon size={14}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const SignOutIcon = () => <Icon size={16}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" /></Icon>;

/** The mark: a coin with the kobo sign. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M11 8.5v15M21 8.5l-7.5 7.5 7.5 7.5" fill="none" stroke="var(--accent-text)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
