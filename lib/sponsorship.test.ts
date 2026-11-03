import { encodeFunctionData, parseAbi } from 'viem';
import { describe, expect, it } from 'vitest';
import { SPEND_PERMISSION_MANAGER, sponsorshipRefusal } from './sponsorship';

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const SENDER = '0x393eA6fbd50b821CdE7EdC1b936c567dbb15c26d';
const OTHER = '0x000000000000000000000000000000000000dEaD';
const account = parseAbi(['function execute(address target, uint256 value, bytes data)', 'function executeBatch((address target, uint256 value, bytes data)[] calls)']);
const owner = parseAbi(['function addOwnerAddress(address owner)', 'function removeOwnerAtIndex(uint256 index, bytes owner)']);
const batch = (calls: { target: `0x${string}`; value?: bigint; data?: `0x${string}` }[]) =>
  encodeFunctionData({ abi: account, functionName: 'executeBatch', args: [calls.map((call) => ({ target: call.target, value: call.value ?? 0n, data: call.data ?? '0x' }))] });
const add = (who: `0x${string}`) => encodeFunctionData({ abi: owner, functionName: 'addOwnerAddress', args: [who] });

describe('sponsorshipRefusal', () => {
  it('pays for USDC and the permission manager', () => {
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: USDC }, { target: SPEND_PERMISSION_MANAGER }]) }, USDC)).toBeNull();
    expect(sponsorshipRefusal({ sender: SENDER, callData: encodeFunctionData({ abi: account, functionName: 'execute', args: [USDC, 0n, '0x'] }) }, USDC)).toBeNull();
  });

  it('pays for deploying a wallet with no calls', () => {
    expect(sponsorshipRefusal({ sender: SENDER, callData: '0x' }, USDC)).toBeNull();
  });

  it('pays for the wallet adding the manager as its owner, and nothing else on itself', () => {
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: SENDER, data: add(SPEND_PERMISSION_MANAGER) }]) }, USDC)).toBeNull();
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: SENDER, data: add(OTHER) }]) }, USDC)).toMatch(/not allowed/);
    const remove = encodeFunctionData({ abi: owner, functionName: 'removeOwnerAtIndex', args: [0n, '0x'] });
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: SENDER, data: remove }]) }, USDC)).toMatch(/not allowed/);
  });

  it('refuses any other contract, one bad call in a batch, ETH, and what it cannot read', () => {
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: OTHER }]) }, USDC)).toMatch(/not allowed/);
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: USDC }, { target: OTHER }]) }, USDC)).toMatch(/not allowed/);
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: USDC, value: 1n }]) }, USDC)).toMatch(/sends ETH/);
    expect(sponsorshipRefusal({ sender: SENDER, callData: '0xdeadbeef' }, USDC)).toMatch(/could not be read/);
    expect(sponsorshipRefusal({ sender: SENDER, callData: 'nope' }, USDC)).toMatch(/could not be read/);
    expect(sponsorshipRefusal({ callData: '0x' }, USDC)).toMatch(/no sender/);
    expect(sponsorshipRefusal(undefined, USDC)).toMatch(/no sender/);
  });

  it('does not treat another wallet adding the manager as the sender', () => {
    expect(sponsorshipRefusal({ sender: SENDER, callData: batch([{ target: OTHER, data: add(SPEND_PERMISSION_MANAGER) }]) }, USDC)).toMatch(/not allowed/);
  });
});
