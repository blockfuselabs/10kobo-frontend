import type { Metadata } from 'next';
import { AgentDashboard } from '@/components/agent-dashboard';

export const metadata: Metadata = { title: '10kobo agent' };

export default function Page() {
  return <AgentDashboard />;
}
