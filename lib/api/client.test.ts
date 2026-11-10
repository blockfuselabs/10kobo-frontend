import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('createApiClient', () => {
  it('sends the token and returns the reply', async () => {
    const reply = { id: '1', role: 'assistant', content: 'ok', created_at: 'now' };
    const fetcher = vi.fn(async () => json(201, { reply }));
    const api = createApiClient('http://api.test', async () => 'token-1', fetcher as unknown as typeof fetch);

    await expect(api.send('hello', null)).resolves.toEqual({ reply });

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/v1/chat/messages');
    expect(init.headers).toMatchObject({ authorization: 'Bearer token-1' });
    expect(init.body).toBe(JSON.stringify({ content: 'hello', new_chat: true }));
  });

  it('accepts an empty success response', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const api = createApiClient('http://api.test', async () => 't', fetcher as unknown as typeof fetch);
    await expect(api.confirmContact('c1')).resolves.toBeNull();
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/v1/contacts/c1/confirm');
    expect(init.method).toBe('POST');
  });

  it('does not call the server without a token', async () => {
    const fetcher = vi.fn();
    const api = createApiClient('http://api.test', async () => null, fetcher as unknown as typeof fetch);
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows the server message on failure', async () => {
    const fetcher = vi.fn(async () => json(400, { message: 'A message needs 1 to 2000 characters' }));
    const api = createApiClient('http://api.test', async () => 't', fetcher as unknown as typeof fetch);
    await expect(api.send('', null)).rejects.toThrow('A message needs 1 to 2000 characters');
  });

  it('gives a plain error when the network fails', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const api = createApiClient('http://api.test', async () => 't', fetcher as unknown as typeof fetch);
    const failure = await api.me().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(0);
  });
  it('reports a missing transport response without exposing a JavaScript error', async () => {
    const fetcher = vi.fn(async () => undefined);
    const api = createApiClient('http://api.test', async () => 't', fetcher as unknown as typeof fetch);
    await expect(api.me()).rejects.toMatchObject({ status: 0, message: 'We could not get a response from the server. Please refresh and try again.' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

});
