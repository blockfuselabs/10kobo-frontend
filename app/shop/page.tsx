import type { Metadata } from 'next';
import { DemoShop } from '@/components/demo-shop';

export const metadata: Metadata = { title: 'Everyday Supply: 10kobo checkout demo' };

export default function Page() {
  return <DemoShop />;
}
