import { decodeFunctionData, parseAbi, type Address, type Hex } from 'viem';

// What 10kobo pays gas for: reading the operation, because the paymaster signs over exactly these calls.
const ACCOUNT_ABI = parseAbi([
  'function execute(address target, uint256 value, bytes data)',
  'function executeBatch((address target, uint256 value, bytes data)[] calls)',
]);
const OWNER_ABI = parseAbi(['function addOwnerAddress(address owner)']);

export const SPEND_PERMISSION_MANAGER = '0xf85210B21cC50302F477BA56686d2019dC9b67Ad';

interface Call {
  target: Address;
  value: bigint;
  data: Hex;
}

function callsIn(callData: unknown): Call[] | null {
  if (typeof callData !== 'string' || !/^0x([0-9a-fA-F]{2})*$/.test(callData)) return null;
  if (callData === '0x') return [];
  try {
    const decoded = decodeFunctionData({ abi: ACCOUNT_ABI, data: callData as Hex });
    if (decoded.functionName === 'execute') return [{ target: decoded.args[0], value: decoded.args[1], data: decoded.args[2] }];
    return decoded.args[0].map((call) => ({ target: call.target, value: call.value, data: call.data }));
  } catch {
    return null;
  }
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Why this operation does not get free gas, or null when it does. Allowed: USDC, the Spend Permission
 * Manager, and a wallet adding that manager as its owner, which recurring payments need and which
 * nothing else may do. Anything unreadable is refused.
 */
export function sponsorshipRefusal(operation: { sender?: unknown; callData?: unknown } | undefined, usdc: string): string | null {
  const sender = operation?.sender;
  if (typeof sender !== 'string') return 'This action cannot be sponsored: it has no sender.';
  const calls = callsIn(operation?.callData);
  if (!calls) return 'This action cannot be sponsored: its calls could not be read.';
  for (const call of calls) {
    if (call.value !== 0n) return 'This action cannot be sponsored: it sends ETH.';
    if (same(call.target, usdc) || same(call.target, SPEND_PERMISSION_MANAGER)) continue;
    if (same(call.target, sender) && addsManager(call.data)) continue;
    return `This action cannot be sponsored: ${call.target} is not allowed.`;
  }
  return null;
}

function addsManager(data: Hex): boolean {
  try {
    const decoded = decodeFunctionData({ abi: OWNER_ABI, data });
    return decoded.functionName === 'addOwnerAddress' && same(decoded.args[0], SPEND_PERMISSION_MANAGER);
  } catch {
    return false;
  }
}
