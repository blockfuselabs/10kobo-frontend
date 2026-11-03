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
}

export interface Receipt {
  reference: string;
  kind: string;
  title: string;
  recipient: string | null;
  recipient_detail: string | null;
  amount: string;
  second_amount: string | null;
  note: string | null;
  completed_at: string;
  tx_hash: string | null;
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
  created_at: string;
  description: string;
  amount_naira: string | null;
  amount_usdc: string;
  status: string;
  tx_hash: string | null;
}

export interface Schedule {
  id: string;
  group_id: string;
  status: 'proposed' | 'awaiting_signature' | 'active' | 'completed' | 'cancelled' | 'failed' | 'rejected' | 'expired';
  route: PlanItem['route'];
  recipient_name: string;
  recipient_detail: string;
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
  items: Schedule[];
  calls: WalletCall[];
}

export interface PlanItem {
  id: string;
  route: 'airtime' | 'data' | 'bank' | 'usdc';
  recipient_name: string;
  recipient_detail: string;
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
    activity: (page: number) => request<ActivityPage>(`/v1/activity?page=${page}`),
    receipt: async (kind: 'payment' | 'deposit', id: string) => (await request<{ receipt: Receipt }>(`/v1/receipts/${kind}/${id}`)).receipt,
    schedules: async () => (await request<{ schedules: Schedule[] }>('/v1/schedules')).schedules,
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
    rejectPlan: (id: string) => request<Plan>(`/v1/plans/${id}/reject`, { method: 'POST' }),
    confirmContact: (id: string, pin?: string) => request<null>(`/v1/contacts/${id}/confirm`, { method: 'POST', body: JSON.stringify(pin ? { pin } : {}) }),
    discardContact: (id: string) => request<null>(`/v1/contacts/${id}/discard`, { method: 'POST' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
