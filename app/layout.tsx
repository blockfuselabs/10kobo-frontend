import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist_Mono, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { THEME_SCRIPT } from '@/lib/theme-script';
import './globals.css';

// latin-ext carries the naira sign, so it matches the rest of the text.
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const display = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], variable: '--font-display' });

export const metadata: Metadata = { title: '10kobo', description: 'Buy airtime and send money by chat.' };
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
