import { expect, test, type Locator, type Page } from '@playwright/test';
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

// The whole journey in real Chrome: real model, real backend, real USDC contract on a local chain copy.
const client = createPublicClient({ chain: baseSepolia, transport: http(process.env.E2E_RPC) });
const usdc = (who: string) =>
  client.readContract({
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [who as Address],
  });
const WALLET = process.env.E2E_WALLET!;
const DEAD = '0x000000000000000000000000000000000000dEaD';

async function say(page: Page, text: string) {
  await page.getByLabel('Message').fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(text, { exact: true }).last()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeHidden({ timeout: 90_000 });
}
const lastPlan = (page: Page) => page.getByRole('region', { name: 'Payments to approve' }).last();
const lastSchedule = (page: Page) => page.getByRole('region', { name: 'Scheduled payments to approve' }).last();
const approve = async (card: Locator) => {
  await card.getByLabel('PIN').fill('4829');
  await card.getByRole('button', { name: 'Approve' }).click();
};
async function confirmContact(page: Page) {
  const card = page.getByRole('region', { name: 'Confirm this recipient' }).last();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByLabel('PIN').fill('4829');
  await card.getByRole('button', { name: 'Yes, save' }).click();
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeHidden({ timeout: 90_000 });
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ viewport: { width: 1191, height: 700 } });
  await page.goto('/');
  await expect(page.getByTestId('balance')).toContainText('50.00 USDC', { timeout: 60_000 });
});

test('asks for a PIN first when required', async () => {
  const card = page.getByRole('region', { name: 'Set your PIN' });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByLabel('PIN').fill('4829');
  await card.getByRole('button', { name: 'Save PIN' }).click();
  await expect(card).toBeHidden({ timeout: 20_000 });
});

test('a wrong PIN stops an approval, the right one lets it through', async () => {
  await say(page, `Save Ada's wallet ${DEAD} and send her 2 usdc`);
  const contact = page.getByRole('region', { name: 'Confirm this recipient' }).last();
  await expect(contact).toBeVisible({ timeout: 60_000 });
  await expect(contact.getByRole('button', { name: 'Yes, save' })).toBeDisabled();
  await contact.getByLabel('PIN').fill('0001');
  await contact.getByRole('button', { name: 'Yes, save' }).click();
  await expect(contact.getByRole('alert')).toContainText('PIN is not right', { timeout: 15_000 });
  await contact.getByLabel('PIN').fill('4829');
  await confirmContact(page);
  await expect(lastPlan(page)).toContainText('Ada', { timeout: 60_000 });
});

test('sends USDC by chat: it needs my approval, then really moves', async () => {
  const card = lastPlan(page);
  expect(await usdc(WALLET)).toBe(50_000_000n);
  await approve(card);
  await expect(card).toContainText('Paid', { timeout: 60_000 });
  expect(await usdc(WALLET)).toBe(48_000_000n);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/1-usdc.png' });
});

test('answers a balance question from the chain, with no payment', async () => {
  const before = await page.getByRole('region', { name: 'Payments to approve' }).count();
  await say(page, 'abeg how much do I have left?');
  await expect(page.locator('main')).toContainText('48', { timeout: 10_000 });
  expect(await page.getByRole('region', { name: 'Payments to approve' }).count()).toBe(before);
});

test('schedules airtime for 1 minute later: one approval, then it runs with no signature', async () => {
  await say(page, 'send N300 airtime to 08031234567 in 1 minute, na Obinna number');
  await confirmContact(page);
  const card = lastSchedule(page);
  await expect(card).toContainText('In 1 minute', { timeout: 60_000 });
  await approve(card);
  await expect(card).toContainText('Scheduled', { timeout: 60_000 });
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/2-scheduled.png' });
  const after = await usdc(WALLET);
  await expect(page.locator('main')).toContainText('Sent: ₦300 airtime to Obinna', { timeout: 120_000 });
  expect(await usdc(WALLET)).toBe(after - 200_000n);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/3-sent.png' });
});

test('sets up a monthly payment, shows it, and cancels it', async () => {
  await say(page, 'send Ada 1 usdc every month');
  const card = lastSchedule(page);
  await expect(card).toContainText('Every month on the 28th', { timeout: 60_000 });
  await approve(card);
  await expect(card).toContainText('Scheduled', { timeout: 60_000 });

  await page.getByRole('button', { name: 'Scheduled', exact: true }).click();
  const list = page.getByRole('list', { name: 'Scheduled payments' });
  await expect(list).toContainText('Ada');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/4-list.png' });
  await list.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('No scheduled payments')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
});

test('rejecting moves nothing', async () => {
  const before = await usdc(WALLET);
  await say(page, 'send Ada 1 usdc');
  const card = lastPlan(page);
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByRole('button', { name: 'Reject' }).click();
  await expect(card).toContainText('Rejected', { timeout: 20_000 });
  expect(await usdc(WALLET)).toBe(before);
});

test('does not offer to send more than the wallet holds', async () => {
  const before = await usdc(WALLET);
  await say(page, 'send Ada 300 usdc');
  // The agent may refuse from the balance, or the approval may refuse it. The chain tests cover the second. Either way nothing moves.
  await expect(page.locator('main')).toContainText(/more than your balance|You need 300.00 USDC|only have/i, { timeout: 60_000 });
  expect(await usdc(WALLET)).toBe(before);
});

test('activity and the add-USDC address are there', async () => {
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Activity' })).toContainText('usdc to Ada');
  await expect(page.getByRole('list', { name: 'Activity' })).toContainText('airtime to Obinna');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/5-activity.png' });
  await page.getByRole('button', { name: 'Add USDC', exact: true }).click();
  await expect(page.getByTestId('receive-address')).toContainText(WALLET);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  const box = await page.getByLabel('Message').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});
