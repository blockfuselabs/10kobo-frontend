import { defineConfig } from 'vitest/config';

// Browser tests in e2e/ run with Playwright, not here.
export default defineConfig({ test: { exclude: ['e2e/**', 'node_modules/**', '.next/**', '.next-e2e/**'] } });
