import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { THEME_SCRIPT } from '@/lib/theme-script';
import './globals.css';

// Self-hosted so nothing is fetched at build time. Licences are beside the files.
// Inter sets all text and figures. Its basic Latin file has no naira sign, so the extended Latin file follows it;
// Space Grotesk then covers anything still missing, such as some Yoruba letters. Outfit stays as a last fallback.
const inter = localFont({ src: './fonts/Inter-Latin-Variable.woff2', weight: '100 900', variable: '--font-inter', display: 'swap' });
const interExt = localFont({ src: './fonts/Inter-LatinExt-Variable.woff2', weight: '100 900', variable: '--font-inter-ext', display: 'swap' });
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

export const metadata: Metadata = { title: '10kobo', description: 'Naira and stablecoins, both ways. Pay any Nigerian bank, get paid in naira or USDC, and let AI agents pay too.' };
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${interExt.variable} ${sans.variable} ${figures.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
