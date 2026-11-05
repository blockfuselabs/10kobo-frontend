import type { Metadata } from 'next';
import { PayLinkPage } from '@/components/pay-link';

export const metadata: Metadata = { title: 'Pay with 10kobo' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayLinkPage id={id} />;
}
