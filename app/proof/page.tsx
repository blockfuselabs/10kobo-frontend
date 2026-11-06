import type { Metadata } from 'next';
import { ProofPage } from '@/components/proof-page';

export const metadata: Metadata = {
  title: 'Proof: real payments made with 10kobo',
  description: 'Real payments with real money on mainnet: bank payouts, naira in, AI agent payments and sends across networks, each with its transaction.',
};

export default function Page() {
  return <ProofPage />;
}
