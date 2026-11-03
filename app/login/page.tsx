import type { Metadata } from 'next';
import { ClientApp } from '@/components/client-app';

export const metadata: Metadata = { title: 'Log in to 10kobo' };

export default function Page() {
  return <ClientApp page="login" />;
}
