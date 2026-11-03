import { sponsorshipRefusal } from '@/lib/sponsorship';

// The bundler and paymaster, reached through our own domain, as Tokkenly does it. Three reasons:
// MTN connections in Nigeria cannot reach Coinbase; the key stays secret on the server rather than in
// Privy's public config; and 10kobo decides what it pays for, which Coinbase's portal cannot express
// for a wallet adding the permission manager as its owner.
//
// To use it: set AA_UPSTREAM_URL, SPONSORSHIP_TOKEN and BACKEND_URL on the server, then point the bundler
// and paymaster URLs in the Privy dashboard at this route.
const MAX_BODY = 256 * 1024;
const TIMEOUT_MS = 20_000;
const SPONSOR = new Set(['pm_getPaymasterStubData', 'pm_getPaymasterData', 'pm_sponsorUserOperation']);
const USER_OP = new Set(['eth_sendUserOperation', 'eth_estimateUserOperationGas', ...SPONSOR]);
const USDC = process.env.USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

interface RpcRequest {
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

const rpcError = (id: unknown, code: number, message: string, status: number) =>
  Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status });

/** An operation must be signed by its wallet, so this limits free gas to wallets of real 10kobo users. */
async function isOurWallet(address: string): Promise<boolean> {
  const response = await fetch(`${process.env.BACKEND_URL}/v1/internal/sponsorship/wallet`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: process.env.SPONSORSHIP_TOKEN, address }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) return false;
  return ((await response.json()) as { known?: boolean }).known === true;
}

export async function POST(request: Request) {
  const upstream = process.env.AA_UPSTREAM_URL;
  if (!upstream || !process.env.BACKEND_URL || !process.env.SPONSORSHIP_TOKEN) return rpcError(null, -32603, 'Sponsorship is not configured.', 503);

  const text = await request.text();
  if (text.length > MAX_BODY) return rpcError(null, -32600, 'Request too large.', 413);
  let parsed: RpcRequest | RpcRequest[];
  try {
    parsed = JSON.parse(text) as RpcRequest | RpcRequest[];
  } catch {
    return rpcError(null, -32700, 'Parse error.', 400);
  }
  const requests = Array.isArray(parsed) ? parsed : [parsed];
  if (requests.length === 0 || requests.length > 20) return rpcError(null, -32600, 'Invalid request.', 400);

  const checked = new Map<string, boolean>();
  for (const item of requests) {
    if (typeof item?.method !== 'string' || !/^(eth|pm)_[A-Za-z]+$/.test(item.method)) return rpcError(item?.id, -32601, 'Method not supported.', 403);
    if (!USER_OP.has(item.method)) continue;
    const operation = Array.isArray(item.params) ? (item.params[0] as { sender?: unknown; callData?: unknown } | undefined) : undefined;
    const refusal = sponsorshipRefusal(operation, USDC);
    if (refusal) return rpcError(item.id, -32602, refusal, 403);
    const sender = operation!.sender as string;
    if (!checked.has(sender)) checked.set(sender, await isOurWallet(sender).catch(() => false));
    if (!checked.get(sender)) return rpcError(item.id, -32602, 'This wallet is not a 10kobo wallet.', 403);
  }

  try {
    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The parsed copy, so what is forwarded is exactly what was checked.
      body: JSON.stringify(parsed),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'content-type': 'application/json' } });
  } catch {
    return rpcError(null, -32603, 'The gas service could not be reached. Please try again.', 502);
  }
}
