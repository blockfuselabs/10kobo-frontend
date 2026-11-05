import type { NextConfig } from 'next';

// A separate folder lets the automated browser tests run beside a normal dev server.
// Only the checkout may be shown inside another website, for the checkout button. Every other page refuses, so the
// signed-in app cannot be hidden inside someone else's page to trick a click.
const noFraming = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  devIndicators: false,
  headers: async () => [{ source: '/:path((?!pay/).*)', headers: noFraming }],
};

export default nextConfig;
