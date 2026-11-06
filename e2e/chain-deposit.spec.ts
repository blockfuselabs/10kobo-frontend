import { expect, test } from '@playwright/test';

const networks = [
  { id: 'tron', name: 'Tron', tokens: ['USDT'], family: 'tron' },
  { id: 'bsc', name: 'BNB Chain', tokens: ['USDC', 'USDT'], family: 'evm' },
  { id: 'polygon', name: 'Polygon', tokens: ['USDC'], family: 'evm' },
];
const MY_EVM = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

test('a deposit from Tron gives a one-time address, then shows the USDC arriving, and remembers refund addresses', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  let deposit: Record<string, unknown> | null = null;
  let sent: unknown = null;
  await page.route('**/v1/chain-deposits', (route) => {
    if (route.request().method() === 'POST') {
      sent = route.request().postDataJSON();
      deposit = { id: '99999999-9999-4999-8999-999999999999', status: 'waiting', pay_from: 'tron', network: 'Tron', token: 'USDT', send: '20.00', send_exact: '20.000000', you_get: '19.12 USDC', received: null, deposit_address: 'TDepositAddressXXXXXXXXXXXXXXXXXXX', refund_to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', deadline: new Date(Date.now() + 30 * 60_000).toISOString(), created_at: new Date().toISOString(), delivery_tx_url: null };
      return route.fulfill({ json: { deposit } });
    }
    return route.fulfill({ json: { networks, refund_addresses: { evm: MY_EVM }, deposits: [] } });
  });
  await page.route('**/v1/chain-deposits/*', (route) => route.fulfill({ json: { deposit } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add USDC', exact: true }).click();
  const box = page.getByRole('region', { name: 'Deposit from another network' }).or(page.locator('[aria-label="Deposit from another network"]'));

  // A 0x network fills in the saved 0x refund address by itself.
  await box.getByRole('button', { name: 'Polygon' }).click();
  await expect(box.getByLabel(/Your Polygon address/)).toHaveValue(MY_EVM);
  await expect(box).toContainText('Saved from last time.');
  await box.getByRole('button', { name: 'BNB Chain' }).click();
  await expect(box.getByLabel(/Your BNB Chain address/)).toHaveValue(MY_EVM);

  // Tron has only USDT and no saved address yet.
  await box.getByRole('button', { name: 'Tron' }).click();
  await expect(box).toContainText('From Tron, you send USDT.');
  await expect(box.getByLabel(/Your Tron address/)).toHaveValue('');
  await box.getByLabel(/Amount in USDT/).fill('20');
  await box.getByLabel(/Your Tron address/).fill('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  await box.getByRole('button', { name: 'Get deposit address' }).click();
  expect(sent).toEqual({ pay_from: 'tron', pay_token: 'USDT', amount: '20', refund_to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' });
  await expect(page.getByTestId('chain-deposit-amount')).toHaveText('20.00 USDT');
  await expect(page.getByTestId('chain-deposit-address')).toHaveText('TDepositAddressXXXXXXXXXXXXXXXXXXX');
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByTestId('chain-deposit')).toContainText('You get about 19.12 USDC in your wallet on Base.');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/chain-deposit-waiting.png', fullPage: true });

  deposit = { ...deposit!, status: 'delivered', received: '19.12 USDC', delivery_tx_url: 'https://basescan.org/tx/0xabc' };
  await expect(page.getByTestId('chain-deposit-status')).toHaveText('Done. The USDC is in your wallet. 19.12 USDC added.', { timeout: 10_000 });
  await expect(page.getByRole('link', { name: 'See it on Base' })).toHaveAttribute('href', 'https://basescan.org/tx/0xabc');
});

test('a refused deposit says why, and nothing is shown to send to', async ({ page }) => {
  await page.route('**/v1/chain-deposits', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 422, json: { message: 'Deposits from BNB Chain start at $1,000 for the moment. Nothing was set up.' } })
      : route.fulfill({ json: { networks, refund_addresses: {}, deposits: [] } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Add USDC', exact: true }).click();
  await page.getByRole('button', { name: 'BNB Chain' }).click();
  await page.getByLabel(/Amount in USDC/).fill('5');
  await page.getByLabel(/Your BNB Chain address/).fill(MY_EVM);
  await page.getByRole('button', { name: 'Get deposit address' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'BNB Chain' })).toHaveText('Deposits from BNB Chain start at $1,000 for the moment. Nothing was set up.');
  await expect(page.getByTestId('chain-deposit-address')).toHaveCount(0);
});
