import { defineConfig } from '@playwright/test';

// Real Chrome against a real backend. Start the servers with e2e/run.sh, which uses a separate database.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3011', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  outputDir: '/tmp/10kobo-e2e-results',
});
