import type { Metadata } from 'next';
import { ProductLinkPage } from '@/components/product-link';

export const metadata: Metadata = { title: 'Pay with 10kobo' };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ embed?: string }> }) {
  const { id } = await params;
  // Opened inside a shop's page by checkout.js.
  const embedded = (await searchParams).embed === '1';
  return <ProductLinkPage id={id} embedded={embedded} />;
}
