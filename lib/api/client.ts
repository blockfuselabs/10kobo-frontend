export interface Me {
  id: string;
  email: string | null;
  wallet_address: string | null;
}

export interface PlanItem {
  id: string;
  route: 'airtime' | 'data' | 'bank' | 'usdc';
  recipient_name: string;
  recipient_detail: string;
  data_plan: string | null;
  amount_naira: string;
  amount_usdc: string;
  payment_status: 'pending' | 'completed' | 'failed' | null;
  failure_reason: string | null;
}

export interface Plan {
  id: string;
  status: 'proposed' | 'approved' | 'rejected' | 'expired';
  quote_expires_at: string;
  total_naira: string;
  total_usdc: string;
  items: PlanItem[];
}

export interface ContactCard {
  id: string;
  name: string;
  status: 'proposed' | 'confirmed';
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  plan: Plan | null;
  contact: ContactCard | null;
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
    messages: async () => (await request<{ messages: ChatMessage[] }>('/v1/chat/messages')).messages,
    send: async (content: string) =>
      (await request<{ reply: ChatMessage }>('/v1/chat/messages', { method: 'POST', body: JSON.stringify({ content }) })).reply,
    contactConfirmed: async (contactId: string) =>
      (
        await request<{ reply: ChatMessage }>('/v1/chat/messages/contact-confirmed', {
          method: 'POST',
          body: JSON.stringify({ contact_id: contactId }),
        })
      ).reply,
    approvePlan: (id: string) => request<Plan>(`/v1/plans/${id}/approve`, { method: 'POST' }),
    rejectPlan: (id: string) => request<Plan>(`/v1/plans/${id}/reject`, { method: 'POST' }),
    confirmContact: (id: string) => request<null>(`/v1/contacts/${id}/confirm`, { method: 'POST' }),
    discardContact: (id: string) => request<null>(`/v1/contacts/${id}/discard`, { method: 'POST' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
