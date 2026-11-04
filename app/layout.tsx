import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { THEME_SCRIPT } from '@/lib/theme-script';
import './globals.css';

// The same faces as Tokkenly, self-hosted so nothing is fetched at build time.
// Outfit has no naira sign and no Yoruba letters, so those characters come from
// Space Grotesk, which also sets the money figures. Licences are beside the files.
const sans = localFont({ src: './fonts/Outfit-Variable.woff2', weight: '100 900', variable: '--font-outfit', display: 'swap' });
const figures = localFont({ src: './fonts/SpaceGrotesk-Variable.woff2', weight: '300 700', variable: '--font-space-grotesk', display: 'swap' });
const mono = localFont({
  src: [
    { path: './fonts/IBMPlexMono-Regular.woff2', weight: '400' },
    { path: './fonts/IBMPlexMono-Medium.woff2', weight: '500' },
    { path: './fonts/IBMPlexMono-Bold.woff2', weight: '700' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = { title: '10kobo', description: 'Buy airtime and send money by chat.' };
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${figures.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
