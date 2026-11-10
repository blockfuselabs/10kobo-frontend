export interface Me {
  id: string;
  email: string | null;
  wallet_address: string | null;
  has_pin: boolean;
  pin_required: boolean;
}

export interface WalletCall {
  to: string;
  data: string;
}

export type PaymentStatus =
  | 'pending' | 'completed' | 'failed' | 'awaiting_signature' | 'funding' | 'funded' | 'paying' | 'returning' | 'returned' | 'needs_support';

export interface NairaDeposit {
  id: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  amount: string;
  amount_naira: number;
  usdc: string;
  rate: string;
  bank_name: string | null;
  account_number: string;
  account_name: string | null;
  expires_at: string;
  user_sent: boolean;
}

export interface DepositTerms {
  rate: number;
  minimum_naira: number;
  maximum_naira: number;
}

export interface WalletSummary {
  address: string | null;
  balance_usdc: string | null;
  balance_naira: string | null;
  limit_used: string;
  limit_left: string;
  naira_per_usdc: number | null;
  deposit_on_the_way?: string | null;
  latest?: ActivityEntry | null;
}

/** What the chain said about a wallet address. It cannot say who owns it. */
export type AddressCheck = 'used' | 'contract' | 'new' | 'unknown';

export interface Receipt {
  reference: string;
  kind: string;
  title: string;
  recipient: string | null;
  recipient_detail: string | null;
  network?: string | null;
  amount: string;
  second_amount: string | null;
  note: string | null;
  completed_at: string;
  tx_hash: string | null;
  /** For USDC sent on to another network: what arrived there, and the transaction that delivered it. */
  received?: string | null;
  delivery_tx_hash?: string | null;
}

export interface ActivityPage {
  activity: ActivityEntry[];
  page: number;
  per_page: number;
  total: number;
}

export interface ActivityEntry {
  id: string;
  has_receipt: boolean;
  kind: 'payment' | 'deposit';
  direction: 'in' | 'out';
  type: string;
  type_label: string;
  created_at: string;
  description: string;
  detail: string | null;
  amount_naira: string | null;
  amount_usdc: string;
  status: string;
  tx_hash: string | null;
}

export interface ActivityFilters {
  direction?: 'in' | 'out' | undefined;
  type?: string | undefined;
  search?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

const activityQuery = (filters: ActivityFilters, page?: number) => {
  const query = new URLSearchParams();
  if (page) query.set('page', String(page));
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  return query.toString();
};

export type InvoiceStatus = 'paid' | 'cancelled' | 'expired' | 'being_paid' | 'overdue' | 'unpaid';

export interface Invoice {
  id: string;
  url: string;
  status: InvoiceStatus;
  amount_naira: number;
  note: string | null;
  due_date: string | null;
  line_items: { description: string; amount_naira: number }[] | null;
  to: string;
  receives: string;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
}

export interface Schedule {
  id: string;
  group_id: string;
  status: 'proposed' | 'awaiting_signature' | 'active' | 'completed' | 'cancelled' | 'failed' | 'rejected' | 'expired';
  route: PlanItem['route'];
  recipient_name: string;
  recipient_detail: string;
  address_check?: AddressCheck | null;
  data_plan: string | null;
  amount: string;
  when: string;
  next_run_at: string | null;
  last_error: string | null;
  last_tx_hash: string | null;
  last_paid_at: string | null;
}

export interface ScheduleGroup {
  group_id: string;
  status: Schedule['status'];
  network?: string;
  items: Schedule[];
  calls: WalletCall[];
}

export interface PlanItem {
  id: string;
  route: 'airtime' | 'data' | 'bank' | 'usdc';
  recipient_name: string;
  recipient_detail: string;
  network?: string | null;
  address_check?: AddressCheck | null;
  /** Set when the USDC goes to another chain: what the receiver should get, as quoted. */
  receiver_gets?: string | null;
  /** USDC, or USDT where the network has no USDC route (Tron, TON). */
  receiver_token?: 'USDC' | 'USDT' | null;
  /** A catch of the network, said before approving, such as "personal wallets only". */
  delivery_caution?: string | null;
  received?: string | null;
  delivery_tx_url?: string | null;
  delivery_seconds?: number | null;
  fee_warning?: boolean;
  data_plan: string | null;
  amount_naira: string;
  amount_usdc: string;
  payment_id?: string | null;
  payment_status: PaymentStatus | null;
  failure_reason: string | null;
  tx_hash: string | null;
  paid_at: string | null;
  refund_tx_hash: string | null;
  simulated: boolean;
}

export interface Plan {
  id: string;
  status: 'proposed' | 'approved' | 'rejected' | 'expired';
  quote_expires_at: string;
  total_naira: string;
  total_usdc: string;
  calls: WalletCall[];
  items: PlanItem[];
}

export interface ContactCard {
  id: string;
  name: string;
  status: 'proposed' | 'confirmed';
  detail: string;
}

export interface Chat {
  id: string;
  title: string;
  updated_at: string;
}

/** A network a deposit can come from, and the tokens it takes. "evm" networks share one refund address. */
export interface DepositNetwork {
  id: string;
  name: string;
  tokens: ('USDC' | 'USDT')[];
  family: string;
}

/** Money from another network on its way to the wallet on Base, through NEAR Intents. */
export interface ChainDeposit {
  id: string;
  status: 'waiting' | 'moving' | 'delivered' | 'refunded' | 'failed' | 'expired';
  pay_from: string;
  network: string;
  token: 'USDC' | 'USDT';
  send: string;
  send_exact: string;
  you_get: string;
  received: string | null;
  deposit_address: string;
  refund_to: string;
  deadline: string;
  created_at: string;
  delivery_tx_url: string | null;
}

/** What the Send page needs: saved recipients by kind, and the networks to choose from. */
export interface SendOptions {
  recipients: { destination_id: string; contact_id: string; name: string; unnamed?: boolean; kind: 'bank' | 'wallet' | 'phone'; detail: string; network: string | null; last_paid_at?: string | null }[];
  networks: { id: string; name: string; token: 'USDC' | 'USDT' }[];
  phone_networks: string[];
}

export interface SendRequest {
  route: 'bank' | 'usdc' | 'airtime' | 'data';
  destination_id?: string | null;
  amount_naira?: number | null;
  amount_usdc?: string | null;
  data_plan_id?: string | null;
  new_recipient?: { name?: string; phone?: string; wallet_address?: string; wallet_chain?: string; bank_name?: string; account_number?: string } | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  notice?: boolean;
  tx_hash?: string | null;
  created_at: string;
  plan: Plan | null;
  contact: ContactCard | null;
  schedule_group: ScheduleGroup | null;
  cancel_schedule: Schedule | null;
  deposit: NairaDeposit | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type GetToken = () => Promise<string | null>;

/** Talks to the backend. Knows nothing about React or which sign-in provider is in use. */
export function createApiClient(baseUrl: string, getToken: GetToken, fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    if (!token) throw new ApiError('Sign in to continue', 401);
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
    }
    if (!response || typeof response.json !== 'function') {
      throw new ApiError('We could not get a response from the server. Please refresh and try again.', 0);
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (body as { message?: unknown } | null)?.message;
      throw new ApiError(typeof message === 'string' ? message : 'Something went wrong. Please try again.', response.status);
    }
    return body as T;
  }

  return {
    me: () => request<Me>('/v1/me'),
    conversations: async () => (await request<{ conversations: Chat[] }>('/v1/chat/messages/conversations')).conversations,
    renameChat: (id: string, title: string) => request<{ ok: boolean }>(`/v1/chat/messages/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    deleteChat: (id: string) => request<{ ok: boolean }>(`/v1/chat/messages/conversations/${id}`, { method: 'DELETE' }),
    messages: async (conversationId?: string) =>
      (await request<{ messages: ChatMessage[] }>(`/v1/chat/messages${conversationId ? `?conversation=${conversationId}` : ''}`)).messages,
    /** Without a chat, this starts a new one. Returns which chat it went into. */
    send: (content: string, conversationId: string | null) =>
      request<{ reply: ChatMessage; conversation_id: string }>('/v1/chat/messages', {
        method: 'POST',
        body: JSON.stringify(conversationId ? { content, conversation_id: conversationId } : { content, new_chat: true }),
      }),
    contactConfirmed: async (contactId: string, conversationId: string | null) =>
      (
        await request<{ reply: ChatMessage }>('/v1/chat/messages/contact-confirmed', {
          method: 'POST',
          body: JSON.stringify(conversationId ? { contact_id: contactId, conversation_id: conversationId } : { contact_id: contactId }),
        })
      ).reply,
    wallet: () => request<WalletSummary>('/v1/wallet'),
    depositTerms: () => request<DepositTerms>('/v1/deposits/terms'),
    currentDeposit: async () => (await request<{ deposit: NairaDeposit | null }>('/v1/deposits/current')).deposit,
    startDeposit: async (amountNaira: number) =>
      (await request<{ deposit: NairaDeposit }>('/v1/deposits', { method: 'POST', body: JSON.stringify({ amount_naira: amountNaira }) })).deposit,
    getDeposit: async (id: string) => (await request<{ deposit: NairaDeposit | null }>(`/v1/deposits/${id}`)).deposit,
    depositSent: (id: string) => request<{ ok: boolean }>(`/v1/deposits/${id}/sent`, { method: 'POST' }),
    closeDeposit: (id: string) => request<{ ok: boolean }>(`/v1/deposits/${id}/close`, { method: 'POST' }),
    chainDeposits: () => request<{ networks: DepositNetwork[]; refund_addresses: Record<string, string>; deposits: ChainDeposit[] }>('/v1/chain-deposits'),
    startChainDeposit: async (body: { pay_from: string; pay_token: 'USDC' | 'USDT'; amount: string; refund_to: string }) =>
      (await request<{ deposit: ChainDeposit }>('/v1/chain-deposits', { method: 'POST', body: JSON.stringify(body) })).deposit,
    getChainDeposit: async (id: string) => (await request<{ deposit: ChainDeposit }>(`/v1/chain-deposits/${id}`)).deposit,
    activity: (page: number, filters: ActivityFilters = {}) => request<ActivityPage>(`/v1/activity?${activityQuery(filters, page)}`),
    /** The filtered list as a spreadsheet file, fetched with the sign-in token. */
    activityFile: async (filters: ActivityFilters = {}): Promise<Blob> => {
      const token = await getToken();
      if (!token) throw new ApiError('Sign in to continue', 401);
      const response = await fetcher(`${baseUrl}/v1/activity/export?${activityQuery(filters)}`, { headers: { authorization: `Bearer ${token}` } }).catch(() => {
        throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
      });
      if (!response.ok) throw new ApiError('We could not make that file. Please try again.', response.status);
      return response.blob();
    },
    receipt: async (kind: 'payment' | 'deposit', id: string) => (await request<{ receipt: Receipt }>(`/v1/receipts/${kind}/${id}`)).receipt,
    schedules: async () => (await request<{ schedules: Schedule[] }>('/v1/schedules')).schedules,
    invoices: async () => (await request<{ invoices: Invoice[] }>('/v1/pay-links')).invoices,
    createInvoice: (body: { amount_naira?: number; bank_name?: string; account_number?: string; to_my_wallet?: boolean; note?: string; due_date?: string; line_items?: { description: string; amount_naira: number }[] }) =>
      request<{ id: string; url: string }>('/v1/pay-links', { method: 'POST', body: JSON.stringify(body) }),
    cancelInvoice: (id: string) => request<Invoice>(`/v1/pay-links/${id}/cancel`, { method: 'POST' }),
    fundPlan: (id: string, txHash: string) =>
      request<Plan>(`/v1/plans/${id}/funding`, { method: 'POST', body: JSON.stringify({ tx_hash: txHash }) }),
    recheckPlan: (id: string) => request<Plan>(`/v1/plans/${id}/recheck`, { method: 'POST' }),
    abandonPlan: (id: string) => request<Plan>(`/v1/plans/${id}/abandon`, { method: 'POST' }),
    approveSchedules: (groupId: string, pin?: string) =>
      request<ScheduleGroup>(`/v1/schedules/groups/${groupId}/approve`, { method: 'POST', body: JSON.stringify(pin ? { pin } : {}) }),
    activateSchedules: (groupId: string, txHash: string) =>
      request<ScheduleGroup>(`/v1/schedules/groups/${groupId}/activate`, { method: 'POST', body: JSON.stringify({ tx_hash: txHash }) }),
    abandonSchedules: (groupId: string) => request<ScheduleGroup>(`/v1/schedules/groups/${groupId}/abandon`, { method: 'POST' }),
    rejectSchedules: (groupId: string) => request<ScheduleGroup>(`/v1/schedules/groups/${groupId}/reject`, { method: 'POST' }),
    cancelSchedule: (id: string) => request<Schedule & { calls: WalletCall[] }>(`/v1/schedules/${id}/cancel`, { method: 'POST' }),
    setPin: (pin: string, currentPin?: string) =>
      request<{ has_pin: boolean }>('/v1/pin', { method: 'POST', body: JSON.stringify({ pin, ...(currentPin ? { current_pin: currentPin } : {}) }) }),
    approvePlan: (id: string, pin?: string) => request<Plan>(`/v1/plans/${id}/approve`, { method: 'POST', body: JSON.stringify(pin ? { pin } : {}) }),
    getPlan: (id: string) => request<Plan>(`/v1/plans/${id}`),
    renameContact: (contactId: string, name: string) => request<void>(`/v1/contacts/${contactId}/rename`, { method: 'POST', body: JSON.stringify({ name }) }),
    sendOptions: () => request<SendOptions>('/v1/send/options'),
    dataPlansFor: async (network: string) => (await request<{ plans: { id: string; label: string; price: string }[] }>(`/v1/send/data-plans?network=${encodeURIComponent(network)}`)).plans,
    prepareSend: async (body: SendRequest) => (await request<{ plan: Plan }>('/v1/send', { method: 'POST', body: JSON.stringify(body) })).plan,
    rejectPlan: (id: string) => request<Plan>(`/v1/plans/${id}/reject`, { method: 'POST' }),
    confirmContact: (id: string, pin?: string) => request<null>(`/v1/contacts/${id}/confirm`, { method: 'POST', body: JSON.stringify(pin ? { pin } : {}) }),
    discardContact: (id: string) => request<null>(`/v1/contacts/${id}/discard`, { method: 'POST' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
