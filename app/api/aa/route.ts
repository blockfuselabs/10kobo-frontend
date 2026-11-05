import { DailyGasLimit, sponsorshipRefusal } from '@/lib/sponsorship';

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
// The last step of sponsorship: its answer can be taken to any bundler, so this is what counts as a send.
const SIGNS_SPONSORSHIP = new Set(['pm_getPaymasterData', 'pm_sponsorUserOperation']);
/** Only what wallets need, so this route is not a free way into the upstream for anything else. */
const ALLOWED = new Set([...USER_OP, 'eth_chainId', 'eth_blockNumber', 'eth_call', 'eth_estimateGas', 'eth_feeHistory', 'eth_gasPrice', 'eth_getBalance', 'eth_getBlockByNumber', 'eth_getCode', 'eth_getTransactionCount', 'eth_getTransactionReceipt', 'eth_getUserOperationByHash', 'eth_getUserOperationReceipt', 'eth_maxPriorityFeePerGas', 'eth_supportedEntryPoints']);
const USDC = process.env.USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const SENDS_PER_DAY = 50;
const gasLimit = new DailyGasLimit(SENDS_PER_DAY);

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

/** A refused operation still answers 200, so its reason would otherwise be lost. Method names and error text only. */
function logRefusals(requests: RpcRequest[], answer: string) {
  try {
    const parsed = JSON.parse(answer) as { id?: unknown; error?: { code?: unknown; message?: unknown } } | { id?: unknown; error?: { code?: unknown; message?: unknown } }[];
    for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!item.error) continue;
      const method = requests.find((req) => req.id === item.id)?.method ?? 'unknown';
      console.warn(`Gas route: ${String(method)} refused: ${String(item.error.code)} ${String(item.error.message).slice(0, 300)}`);
    }
  } catch {
    console.warn('Gas route: the answer could not be read');
  }
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
    if (typeof item?.method !== 'string' || !ALLOWED.has(item.method)) return rpcError(item?.id, -32601, 'Method not supported.', 403);
    if (!USER_OP.has(item.method)) continue;
    const operation = Array.isArray(item.params) ? (item.params[0] as { sender?: unknown; callData?: unknown } | undefined) : undefined;
    const refusal = sponsorshipRefusal(operation, USDC);
    if (refusal) return rpcError(item.id, -32602, refusal, 403);
    const sender = operation!.sender as string;
    if (!checked.has(sender)) checked.set(sender, await isOurWallet(sender).catch(() => false));
    if (!checked.get(sender)) return rpcError(item.id, -32602, 'This wallet is not a 10kobo wallet.', 403);
    // Estimates and stub requests repeat freely while one send is prepared.
    if (SIGNS_SPONSORSHIP.has(item.method) && !gasLimit.take(sender)) return rpcError(item.id, -32602, 'This wallet has reached its free sends for today. Please try again tomorrow.', 429);
  }

  try {
    const response = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The parsed copy, so what is forwarded is exactly what was checked.
      body: JSON.stringify(parsed),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const answer = await response.text();
    console.log(`Gas route: ${requests.map((item) => String(item.method)).join(', ')}`);
    logRefusals(requests, answer);
    return new Response(answer, { status: response.status, headers: { 'content-type': 'application/json' } });
  } catch {
    return rpcError(null, -32603, 'The gas service could not be reached. Please try again.', 502);
  }
}
