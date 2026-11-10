'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiClient, DepositNetwork, Plan, SendOptions, SendRequest, WalletSummary } from '@/lib/api/client';
import { CardHeader } from './card-header';
import { PlanApprovalCard } from './cards';
import { BankIcon, PhoneIcon, WalletIcon } from './icons';
import { NetworkPicker } from './network-picker';
import { NEW_RECIPIENT, RecipientPicker } from './recipient-picker';

const WAYS = [
  { id: 'bank', title: 'Bank Account', detail: 'Naira to any Nigerian bank', Icon: BankIcon },
  { id: 'crypto', title: 'Crypto Wallet', detail: 'USDC or USDT on 16 networks', Icon: WalletIcon },
  { id: 'phone', title: 'Airtime & Data', detail: 'MTN, Airtel, Glo, 9mobile', Icon: PhoneIcon },
] as const;
type Way = (typeof WAYS)[number]['id'];

/** Banks most people here use, offered as suggestions. Any bank's name can still be typed. */
export const BANKS = ['OPay', 'PalmPay', 'Moniepoint', 'Kuda', 'GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Fidelity Bank', 'Union Bank', 'Stanbic IBTC', 'Sterling Bank', 'Wema Bank', 'FCMB', 'Ecobank', 'Polaris Bank', 'Keystone Bank'];

const KIND_OF: Record<Way, 'bank' | 'wallet' | 'phone'> = { bank: 'bank', crypto: 'wallet', phone: 'phone' };
const NEW = NEW_RECIPIENT;

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      {children}
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

/** A saved wallet with no name is hard to recognise, so the page offers to name it. Only the label changes. */
function NameIt({ contactId, kind, api, onSaved }: { contactId: string; kind: string; api: ApiClient; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.renameContact(contactId, name.trim());
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not save the name.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="inset flex flex-col gap-2 p-3" data-testid="name-it">
      <p className="text-sm">This {kind === 'wallet' ? 'wallet' : 'recipient'} has no name yet. <span className="text-[var(--muted)]">Give it one so you can find it later.</span></p>
      <div className="flex gap-2">
        <input className="field min-w-0 flex-1 bg-[var(--surface)]" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ada (Stellar)" aria-label="Name for this recipient" maxLength={60} />
        <button type="button" className="btn-secondary shrink-0" disabled={busy || !name.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save name'}</button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** Sending without the chat: the same payments, rules and approval card, chosen with a form. */
const QUICK: Record<Way, readonly number[]> = { bank: [1000, 5000, 10000, 20000], crypto: [5, 10, 50, 100], phone: [100, 200, 500, 1000] };

/** A rough figure while typing. The approval card shows the exact amount before anything moves. */
function estimate(way: Way, amount: string, rate: number | null | undefined): string | null {
  const value = Number(amount);
  if (!rate || !value || value <= 0) return null;
  if (way === 'crypto') return `About ₦${Math.round(value * rate).toLocaleString('en-NG')}`;
  return `About $${(value / rate).toFixed(2)} from your balance, at ₦${rate.toLocaleString('en-NG', { maximumFractionDigits: 2 })} per $1`;
}

export function SendPanel({ api, onChanged, onAddMoney, initialWay = 'bank', summary = null }: { api: ApiClient; onChanged: () => void; onAddMoney: () => void; initialWay?: Way; summary?: WalletSummary | null }) {
  const [way, setWay] = useState<Way>(initialWay);
  const [options, setOptions] = useState<SendOptions | null>(null);
  const [recipient, setRecipient] = useState<string>(NEW);
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [chain, setChain] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneNetwork, setPhoneNetwork] = useState('');
  const [what, setWhat] = useState<'airtime' | 'data'>('airtime');
  const [dataPlans, setDataPlans] = useState<{ id: string; label: string; price: string }[]>([]);
  const [dataPlan, setDataPlan] = useState('');
  const [amount, setAmount] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.sendOptions().then(setOptions).catch(() => setError('We could not load your recipients. Please try again.'));
  }, [api]);

  const saved = (options?.recipients ?? []).filter((item) => item.kind === KIND_OF[way]);
  const chosen = saved.find((item) => item.destination_id === recipient) ?? null;
  // A saved phone already knows its network; a new one is chosen by hand.
  const network = chosen?.kind === 'phone' ? (chosen.network ?? '') : phoneNetwork;

  useEffect(() => {
    setDataPlan('');
    if (way !== 'phone' || what !== 'data' || !network) return setDataPlans([]);
    api.dataPlansFor(network).then(setDataPlans).catch(() => setDataPlans([]));
  }, [api, way, what, network]);

  // A saved recipient is the usual case, so the first one is picked; "Someone new" is one choice away.
  useEffect(() => {
    const first = (options?.recipients ?? []).find((item) => item.kind === KIND_OF[way]);
    setRecipient(first?.destination_id ?? NEW);
  }, [options, way]);

  const switchWay = (next: Way) => {
    setWay(next);
    setAmount('');
    setError(null);
  };

  const networks: DepositNetwork[] = (options?.networks ?? []).map((item) => ({ id: item.id, name: item.name, tokens: [item.token], family: '' }));
  const chainName = networks.find((item) => item.id === chain)?.name;

  const request = (): SendRequest | null => {
    const isNew = recipient === NEW;
    if (way === 'bank') {
      if (isNew && (!bankName.trim() || !/^\d{10}$/.test(accountNumber))) return null;
      const naira = Number(amount);
      if (!Number.isInteger(naira) || naira <= 0) return null;
      return { route: 'bank', destination_id: isNew ? null : recipient, amount_naira: naira, new_recipient: isNew ? { name: name.trim() || undefined, bank_name: bankName.trim(), account_number: accountNumber } : null };
    }
    if (way === 'crypto') {
      if (isNew && (!chain || walletAddress.trim().length < 20)) return null;
      if (!/^\d{1,9}(\.\d{1,6})?$/.test(amount)) return null;
      return { route: 'usdc', destination_id: isNew ? null : recipient, amount_usdc: amount, new_recipient: isNew ? { name: name.trim() || undefined, wallet_address: walletAddress.trim(), wallet_chain: chainName } : null };
    }
    if (isNew && !/^0\d{10}$/.test(phone.replace(/\s/g, ''))) return null;
    const fresh = isNew ? { name: name.trim() || undefined, phone: phone.replace(/\s/g, '') } : null;
    if (what === 'data') return dataPlan ? { route: 'data', destination_id: isNew ? null : recipient, data_plan_id: dataPlan, new_recipient: fresh } : null;
    const naira = Number(amount);
    return Number.isInteger(naira) && naira > 0 ? { route: 'airtime', destination_id: isNew ? null : recipient, amount_naira: naira, new_recipient: fresh } : null;
  };
  const ready = request();

  const prepare = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      setPlan(await api.prepareSend(ready));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not prepare this payment. Nothing was sent.');
    } finally {
      setBusy(false);
    }
  };

  const refresh = useCallback(async () => {
    if (!plan) return;
    setPlan(await api.getPlan(plan.id));
    onChanged();
  }, [api, plan, onChanged]);

  const startOver = () => {
    setPlan(null);
    setAmount('');
    setRecipient(NEW);
    setName('');
    setAccountNumber('');
    setWalletAddress('');
    setPhone('');
    api.sendOptions().then(setOptions).catch(() => undefined);
  };

  const current = WAYS.find((item) => item.id === way)!;

  return (
    <section className="flex flex-col gap-4" aria-label="Send money">
      <div className="product-page-heading"><span className="product-eyebrow">MOVE YOUR MONEY</span><h1 className="page-title">Send</h1><p>Choose where it goes. Review the recipient and quote before you approve.</p></div>
      {!plan && (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Who are you sending to?">
          {WAYS.map((item) => {
            const on = way === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => switchWay(item.id)}
                className={`relative flex flex-col gap-2 rounded-2xl border bg-[var(--surface)] p-3 text-left transition-all sm:gap-3 sm:p-4 ${on ? 'border-[var(--foreground)] shadow-md ring-1 ring-[var(--foreground)]' : 'border-[var(--line)] hover:-translate-y-0.5 hover:shadow-sm'}`}
                data-testid={`send-${item.id}`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-full ${on ? 'bg-[var(--pop)] text-[#111]' : 'bg-[var(--surface-2)]'}`}>
                  <item.Icon />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold sm:text-base">{item.title}</span>
                  <span className="hidden text-xs text-[var(--muted)] sm:block">{item.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {plan ? (
        <div className="flex flex-col gap-3">
          <PlanApprovalCard plan={plan} api={api} onChange={refresh} />
          {plan.status !== 'proposed' && <button className="btn-secondary self-start" onClick={startOver}>Send another</button>}
          {plan.status === 'proposed' && <button className="self-start text-sm text-[var(--muted)] underline underline-offset-2" onClick={() => setPlan(null)}>Change the details</button>}
        </div>
      ) : (
        <form className="panel" onSubmit={(event) => { event.preventDefault(); if (ready && !busy) void prepare(); }}>
          <CardHeader Icon={current.Icon} title={way === 'bank' ? 'Send to a Bank Account' : way === 'crypto' ? 'Send to a Crypto Wallet' : 'Buy Airtime or Data'}>
            {way === 'bank' ? 'Paid in naira from your USDC. The bank’s name for the account shows before you approve.' : way === 'crypto' ? 'From your wallet on Base to any of 16 networks.' : 'Paid from your USDC, delivered in seconds.'}
          </CardHeader>

          {saved.length > 0 && <RecipientPicker recipients={saved} value={recipient} onChange={setRecipient} />}
          {chosen?.unnamed && <NameIt key={chosen.contact_id} contactId={chosen.contact_id} kind={chosen.kind} api={api} onSaved={() => api.sendOptions().then(setOptions).catch(() => undefined)} />}

          {recipient === NEW && way === 'bank' && (
            <>
              <NetworkPicker
                label="Bank"
                networks={BANKS.map((bank) => ({ id: bank, name: bank, tokens: [], family: '' }))}
                value={bankName}
                onChange={setBankName}
                placeholder="Choose a bank"
                searchLabel="Search banks"
                empty={(query) => `No bank called “${query}”.`}
                allowTyped
              />
              <Field label="Account number">
                <input className="field" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" autoComplete="off" name="send-account" />
              </Field>
            </>
          )}

          {recipient === NEW && way === 'crypto' && (
            <>
              <NetworkPicker label="Network" networks={networks} value={chain} onChange={setChain} loading={!options && !error} empty={(query) => `No network called “${query}”.`} />
              <Field label="Wallet address" hint="Copy it in full. Crypto sent to a wrong address or network cannot be returned.">
                <input className="field font-mono text-sm" value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} placeholder={chain === 'near' ? 'name.near' : chain === 'tron' ? 'T…' : chain === 'stellar' ? 'G…' : '0x…'} autoComplete="off" spellCheck={false} name="send-wallet" />
              </Field>
            </>
          )}

          {recipient === NEW && way === 'phone' && (
            <>
              <Field label="Phone number">
                <input className="field" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="080…" autoComplete="off" name="send-phone" />
              </Field>
              <Field label="Network">
                <select className="field" value={phoneNetwork} onChange={(event) => setPhoneNetwork(event.target.value)} name="send-phone-network" aria-label="Phone network">
                  <option value="" disabled>Choose a network</option>
                  {(options?.phone_networks ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </>
          )}

          {recipient === NEW && (
            <Field label="Name (optional)" hint="Saved with the details once you approve, so next time you just pick them.">
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mum" autoComplete="off" name="send-name" />
            </Field>
          )}

          {way === 'phone' && (
            <div className="flex flex-col gap-1 text-sm">
              <span id="send-what">Airtime or data</span>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--surface-2)] p-1" role="group" aria-labelledby="send-what">
                {(['airtime', 'data'] as const).map((item) => (
                  <button key={item} type="button" aria-pressed={what === item} onClick={() => setWhat(item)} className={`rounded-xl py-2 font-medium capitalize ${what === item ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>{item}</button>
                ))}
              </div>
            </div>
          )}

          {way === 'phone' && what === 'data' ? (
            <Field label="Data plan">
              <select className="field" value={dataPlan} onChange={(event) => setDataPlan(event.target.value)} disabled={!network} name="send-data-plan" aria-label="Data plan">
                <option value="" disabled>{network ? 'Choose a plan' : 'Choose the network first'}</option>
                {dataPlans.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.price}</option>)}
              </select>
            </Field>
          ) : (
            <div className="flex flex-col gap-2">
              <Field label={way === 'crypto' ? 'Amount in USDC' : 'Amount in naira'}>
                <input className="field text-lg font-medium" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(way === 'crypto' ? /[^\d.]/g : /\D/g, ''))} placeholder={way === 'crypto' ? 'e.g. 10' : 'e.g. 5000'} autoComplete="off" name="send-amount" />
              </Field>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
                {QUICK[way].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${amount === String(value) ? 'border-[var(--foreground)] bg-[var(--surface-2)]' : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                  >
                    {way === 'crypto' ? `${value} USDC` : `₦${value.toLocaleString('en-NG')}`}
                  </button>
                ))}
              </div>
              {(estimate(way, amount, summary?.naira_per_usdc) || summary?.limit_left) && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]" data-testid="send-estimate">
                  <span>{estimate(way, amount, summary?.naira_per_usdc) ?? 'Type an amount to see what it costs'}</span>
                  {summary?.limit_left && <span>Left to send today: {summary.limit_left.replace(/\.\d+$/, '')}</span>}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}{/need .* but your wallet has/i.test(error) && <> <button type="button" className="font-medium underline underline-offset-2" onClick={onAddMoney}>Add money</button></>}</p>}
          <button className="btn-primary w-full" disabled={!ready || busy}>{busy ? 'Checking…' : 'Continue'}</button>
          <p className="text-center text-xs text-[var(--muted)]">Nothing is sent until you check the details and approve.</p>
        </form>
      )}
    </section>
  );
}
