import type { ReactNode } from 'react';
import { useTheme } from '@/lib/theme';

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  );
}

export const HomeIcon = () => <Icon><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" /></Icon>;
export const ChatIcon = () => <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.4A8 8 0 1 1 21 12Z" /></Icon>;
export const CalendarIcon = () => <Icon><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></Icon>;
export const InvoiceIcon = () => <Icon><path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v15.5l-2.5-1.5-2.5 1.5-2-1.5-2 1.5-2.5-1.5L5 20.5V5a1.5 1.5 0 0 1 1.5-1.5Z" /><path d="M9 8.5h6M9 12h6" /></Icon>;
export const ActivityIcon = () => <Icon><path d="M3 12h4l3-7 4 14 3-7h4" /></Icon>;
export const PlusIcon = () => <Icon><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></Icon>;
export const SendIcon = () => <Icon><path d="M12 19V5M6 11l6-6 6 6" /></Icon>;
export const CopyIcon = () => <Icon size={14}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" /><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" /></Icon>;
export const CheckIcon = () => <Icon size={14}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const BankIcon = () => <Icon><path d="M3.5 9.5 12 4l8.5 5.5" /><path d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5" /><path d="M3.5 20h17" /></Icon>;
export const WalletIcon = () => <Icon><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16.5" height="11.5" rx="2.5" /><path d="M16.5 13.75h.01" /></Icon>;
export const NetworksIcon = () => <Icon><circle cx="6" cy="6.5" r="2.5" /><circle cx="18" cy="6.5" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.3 7.6 10.8 16M15.7 7.6 13.2 16M8.5 6.5h7" /></Icon>;
export const PersonIcon = () => <Icon><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Icon>;
export const LockIcon = () => <Icon><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></Icon>;
export const PhoneIcon = () => <Icon><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17.5h2" /></Icon>;
export const PencilIcon = () => <Icon><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Icon>;
export const ArrowInIcon = () => <Icon size={16}><path d="M17 7 7 17M7 8v9h9" /></Icon>;
export const ArrowOutIcon = () => <Icon size={16}><path d="M7 17 17 7M8 7h9v9" /></Icon>;
export const DownloadIcon = () => <Icon size={16}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Icon>;
export const SearchIcon = () => <Icon size={16}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></Icon>;
export const SunIcon = () => <Icon><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Icon>;
export const MoonIcon = () => <Icon><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></Icon>;
export const DotsIcon = () => <Icon><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></Icon>;
export const TrashIcon = () => <Icon size={16}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></Icon>;
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

/** Switches between light and dark, and remembers the choice in this browser. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button onClick={toggle} aria-label={label} title={label} className={`grid cursor-pointer place-items-center rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] ${className}`}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
