import type { NextConfig } from 'next';

// A separate folder lets the automated browser tests run beside a normal dev server.
const nextConfig: NextConfig = { distDir: process.env.NEXT_DIST_DIR ?? '.next', devIndicators: false };

export default nextConfig;
