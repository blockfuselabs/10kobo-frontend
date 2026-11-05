import { expect, test, type Page, type Route } from '@playwright/test';

const ID = '11111111-1111-4111-8111-111111111111';
const base = { id: ID, amount_naira: 5000, to: 'Ad* Be***', bank_name: 'OPay', account_number: '****4568', note: 'Rent', open: true, paid: false, payment: null };
const payment = { id: 'p1', status: 'awaiting_deposit', pay_from: 'arbitrum', pay_usdc: '3.573829', deposit_address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', deposit_deadline: new Date(Date.now() + 20 * 60_000).toISOString(), failure_reason: null, paid_at: null };

async function serve(page: Page, get: () => object, status = 200) {
  await page.route(`**/v1/public/pay-links/${ID}`, (route: Route) => route.fulfill({ status, json: get() }));
}

test('someone with no account opens a link, chooses a chain, and sees exactly what to send', async ({ page }) => {
  let current: object = base;
  await serve(page, () => current);
  let sent: unknown;
  await page.route(`**/v1/public/pay-links/${ID}/pay`, async (route) => {
    sent = route.request().postDataJSON();
    current = { ...base, payment };
    await route.fulfill({ json: current });
  });
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-amount')).toHaveText('₦5,000');
  await expect(page.getByRole('region', { name: 'Pay this link' })).toContainText('Ad* Be***');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByRole('button', { name: 'Arbitrum' }).click();
  await page.getByLabel(/Your Arbitrum address/).fill('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-open.png' });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('link-usdc')).toHaveText('3.573829');
  await expect(page.getByTestId('link-address')).toHaveText(payment.deposit_address);
  await expect(page.getByRole('timer')).toBeVisible();
  expect(sent).toEqual({ pay_from: 'arbitrum', refund_to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' });
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-waiting.png' });
});

test('it moves on by itself when the money arrives, and stops offering an address', async ({ page }) => {
  let current: object = { ...base, payment };
  await serve(page, () => current);
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-address')).toBeVisible();
  current = { ...base, open: false, paid: true, payment: { ...payment, status: 'paid', deposit_address: null } };
  await expect(page.getByTestId('link-paid')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('link-address')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-paid.png' });
});

test('it says what is wrong: a refused address, a closed link, and a link that does not exist', async ({ page }) => {
  await serve(page, () => base);
  await page.route(`**/v1/public/pay-links/${ID}/pay`, (route) => route.fulfill({ status: 400, json: { code: 'invalid_refund_address', message: 'That is not a valid base address to refund.' } }));
  await page.goto(`/pay/${ID}`);
  await page.getByLabel(/Your Base address/).fill('nope');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('region', { name: 'Pay this link' }).getByRole('alert')).toContainText('not a valid base address');

  await page.unroute(`**/v1/public/pay-links/${ID}`);
  await serve(page, () => ({ ...base, open: false }));
  await page.reload();
  await expect(page.getByRole('region', { name: 'Pay this link' })).toContainText('not open right now');
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);

  await page.unroute(`**/v1/public/pay-links/${ID}`);
  await serve(page, () => ({ code: 'not_found', message: 'none' }), 404);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Pay this link' })).toContainText('does not exist');
});

test('the page fits a phone with no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await serve(page, () => ({ ...base, payment }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-address')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-phone.png' });
});
