import type { Metadata } from 'next';
import { DocsPage } from '@/components/docs-page';

export const metadata: Metadata = {
  title: '10kobo docs',
  description: 'Pay any Nigerian bank account with USDC: x402 for AI agents, HTTP API, MCP, payment links, checkout and webhooks.',
};

export default function Page() {
  return <DocsPage />;
}
