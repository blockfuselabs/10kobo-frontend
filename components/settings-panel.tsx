'use client';

import type { ApiClient, Me } from '@/lib/api/client';
import { MerchantKeysDialog } from './merchant-keys';

/** Account details, and the developer tools most people never need. */
export function SettingsPanel({ api, me }: { api: ApiClient; me: Me | null }) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="page-title">Settings</h1>

      <section className="flex flex-col gap-3" aria-labelledby="settings-account">
        <h2 id="settings-account" className="text-lg font-semibold">Account</h2>
        <dl className="flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm">
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--muted)]">Email</dt><dd className="truncate font-medium">{me?.email ?? '…'}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--muted)]">Wallet</dt><dd className="truncate font-mono text-[13px]">{me?.wallet_address ?? 'Being set up…'}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--muted)]">Payment PIN</dt><dd className="font-medium">{me?.has_pin ? 'Set' : 'Not set'}</dd></div>
        </dl>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="settings-developers">
        <div className="flex flex-col gap-0.5">
          <h2 id="settings-developers" className="text-lg font-semibold">Developers</h2>
          <p className="text-sm text-[var(--muted)]">For shops with their own website and a developer. Selling without code? Use Payment links instead.</p>
        </div>
        <MerchantKeysDialog api={api} inline onClose={() => undefined} />
      </section>
    </div>
  );
}
