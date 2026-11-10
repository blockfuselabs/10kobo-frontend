import { expect, test } from '@playwright/test';
import { openDeposit } from './home';

const SHOTS = '/tmp/10kobo-e2e-results';
const base = {
  id: '11111111-1111-4111-8111-111111111111',
  amount: '₦2,000',
  amount_naira: 2000,
  usdc: '1.44 USDC',
  rate: '1387.77',
  bank_name: 'Safehaven Microfinance Bank',
  account_number: '6010681891',
  account_name: 'Switchlabsltd Checkout',
  user_sent: false,
};

for (const size of [{ width: 1191, height: 575 }, { width: 390, height: 760 }]) {
  test(`a deposit shows a countdown and then each step, at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    let state: Record<string, unknown> | null = null;
    await page.route('**/v1/deposits/terms', (route) => route.fulfill({ json: { rate: 1387.77, minimum_naira: 1500, maximum_naira: 500000 } }));
    await page.route('**/v1/deposits/current', (route) => route.fulfill({ json: { deposit: state } }));
    await page.route('**/v1/deposits', (route) => {
      state = { ...base, status: 'waiting', expires_at: new Date(Date.now() + 30 * 60_000).toISOString() };
      return route.fulfill({ json: { deposit: state } });
    });

    await page.goto('/');
    await openDeposit(page);
    const amount = page.getByLabel('Amount in naira');
    await amount.fill('1000');
    await expect(page.getByText('Enter between ₦1,500 and ₦500,000.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get bank account' })).toBeDisabled();
    await amount.fill('2000');
    await expect(page.getByText(/You get about 1\.44 USDC/)).toBeVisible();
    await page.getByRole('button', { name: 'Get bank account' }).click();

    await expect(page.getByTestId('deposit-account')).toHaveText('6010681891');
    await expect(page.getByTestId('deposit-amount')).toHaveText('₦2,000');
    const first = await page.getByTestId('deposit-timer').textContent();
    expect(first).toMatch(/^(30:00|29:5\d)$/);
    await expect(page.getByTestId('deposit-timer')).not.toHaveText(first!, { timeout: 3000 });
    await expect(page.getByRole('list', { name: 'Progress' })).toContainText('Waiting for your transfer');
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(scroll, 'no sideways scrolling').toBe(true);
    await page.screenshot({ path: `${SHOTS}/deposit-waiting-${size.width}.png` });

    await page.route(`**/v1/deposits/${base.id}/sent`, (route) => {
      state = { ...state!, user_sent: true };
      return route.fulfill({ json: { ok: true } });
    });
    await page.getByRole('button', { name: 'I have sent the money' }).click();
    await expect(page.getByTestId('deposit-coming')).toContainText('Your ₦2,000 is on its way');
    await expect(page.getByRole('list', { name: 'Progress' })).toContainText('Confirming your transfer');
    await expect(page.getByTestId('deposit-account')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show account details' }).click();
    await expect(page.getByTestId('deposit-account')).toHaveText('6010681891');
    await page.screenshot({ path: `${SHOTS}/deposit-coming-${size.width}.png` });

    state = { ...state!, status: 'processing' };
    await expect(page.getByTestId('deposit-coming')).toContainText('We have your naira', { timeout: 8000 });
    await expect(page.getByTestId('deposit-timer')).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/deposit-processing-${size.width}.png` });

    state = { ...state!, status: 'completed' };
    await expect(page.getByText('About 1.44 USDC added to your wallet.')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Make a new deposit' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/deposit-done-${size.width}.png` });
  });

  test(`an expired deposit warns against paying, at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.route('**/v1/deposits/terms', (route) => route.fulfill({ json: { rate: 1387.77, minimum_naira: 1500, maximum_naira: 500000 } }));
    await page.route('**/v1/deposits/current', (route) =>
      route.fulfill({ json: { deposit: { ...base, status: 'waiting', expires_at: new Date(Date.now() - 1000).toISOString() } } }),
    );
    await page.goto('/');
    await openDeposit(page);
    await expect(page.getByText('This account has expired')).toBeVisible();
    await expect(page.getByTestId('deposit-account')).toHaveCount(0);
  });

  test(`a deposit card in the chat counts down and updates by itself, at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    let deposit: Record<string, unknown> = { ...base, status: 'waiting', expires_at: new Date(Date.now() + 30 * 60_000).toISOString() };
    const message = { id: 'a1', role: 'assistant', content: 'The card has the account to pay into and the time left.', notice: false, tx_hash: null, created_at: new Date().toISOString(), plan: null, schedule_group: null, cancel_schedule: null, contact: null };
    await page.route('**/v1/chat/messages/conversations', (route) => route.fulfill({ json: { conversations: [{ id: 'c1', title: 'deposit', updated_at: new Date().toISOString() }] } }));
    await page.route('**/v1/chat/messages*', (route) =>
      route.request().method() === 'GET' ? route.fulfill({ json: { messages: [{ ...message, deposit }] } }) : route.fallback(),
    );
    await page.route(`**/v1/deposits/${base.id}`, (route) => route.fulfill({ json: { deposit } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Ask 10kobo' }).click();
    if (size.width < 768) await page.getByRole('button', { name: /▾/ }).click();
    await page.getByRole('list', { name: 'Your chats' }).getByRole('button', { name: 'deposit' }).click();
    const card = page.getByRole('region', { name: 'Deposit card' });
    await expect(card.getByTestId('deposit-account')).toHaveText('6010681891');
    await expect(card.getByTestId('deposit-timer')).toHaveText(/^(30:00|29:5\d)$/);
    await expect(card.getByRole('button', { name: 'Cancel deposit' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/deposit-chat-${size.width}.png` });
    deposit = { ...deposit, status: 'completed' };
    await expect(card.getByText('About 1.44 USDC added to your wallet.')).toBeVisible({ timeout: 8000 });
    await expect(card.getByRole('button', { name: 'Make a new deposit' })).toHaveCount(0);
  });
}
