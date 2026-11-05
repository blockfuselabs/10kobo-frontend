import { expect, test } from '@playwright/test';

const ID = '11111111-1111-4111-8111-111111111111';
const link = { id: ID, merchant: 'Mama Put Kitchen', return_url: 'http://localhost:3011/shop?order=order-1', amount_naira: 1400, to: 'Yi**** Di***', bank_name: 'OPay', account_number: '****4108', receives: 'naira', note: 'Mama Put Kitchen order-1', line_items: [{ description: 'Jollof rice and chicken', amount_naira: 900 }], open: true, paid: false, payment: null };

test('a shop puts the button on any page with one line, and it opens 10kobo checkout in a new tab', async ({ page, context }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: link }));
  await page.setContent(`<html><body><h1>Some other shop</h1><script src="http://localhost:3011/checkout.js" data-invoice="${ID}"></script></body></html>`);
  const button = page.getByRole('button', { name: /Pay with crypto/ });
  await expect(button).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/checkout-button.png' });
  const [checkout] = await Promise.all([context.waitForEvent('page'), button.click()]);
  await checkout.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: link }));
  await expect(checkout).toHaveURL(`http://localhost:3011/pay/${ID}`);
  expect(await checkout.evaluate(() => window.opener)).toBeNull();
  await expect(checkout.getByTestId('link-payee')).toHaveText('Pay Mama Put Kitchen');

  expect(await page.evaluate(() => { try { (window as unknown as { TenKobo: { open: (id: string) => void } }).TenKobo.open('javascript:alert(1)'); return 'opened'; } catch { return 'refused'; } })).toBe('refused');
});

test('once paid, the checkout offers a way back to the shop', async ({ page }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: { ...link, open: false, paid: true, payment: { id: 'p', status: 'paid', pay_from: 'near', pay_token: 'USDC', pay_usdc: '1.0', deposit_address: null, deposit_deadline: null, failure_reason: null, paid_at: new Date().toISOString(), links: [] } } }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-return')).toHaveText('Back to Mama Put Kitchen');
  await expect(page.getByTestId('link-return')).toHaveAttribute('href', 'http://localhost:3011/shop?order=order-1');
});

test('the demo shop makes the order on its server, opens checkout, and shows paid with the signed notice', async ({ page, context }) => {
  let status = 'unpaid';
  let basket: unknown = null;
  await page.route('**/shop/api/order*', async (route) => {
    if (route.request().method() === 'POST') {
      basket = route.request().postDataJSON();
      return route.fulfill({ json: { order: 'order-1', invoice_id: ID } });
    }
    return route.fulfill({ json: { status, amount_naira: 1400, order: 'order-1', notice: status === 'paid' ? { type: 'invoice.paid', at: new Date().toISOString() } : null } });
  });
  await page.goto('/shop');
  await expect(page.getByTestId('shop-total')).toHaveText('₦1,400');
  await page.getByRole('button', { name: 'One more Zobo drink' }).click();
  await expect(page.getByTestId('shop-total')).toHaveText('₦1,600');
  await page.getByRole('button', { name: 'One less Zobo drink' }).click();
  await page.waitForFunction(() => Boolean((window as unknown as { TenKobo?: unknown }).TenKobo));
  const [checkout] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: /Pay with crypto/ }).click()]);
  expect(checkout.url()).toBe(`http://localhost:3011/pay/${ID}`);
  expect(basket).toEqual({ items: { jollof: 1, puff: 1, zobo: 1 } });
  await expect(page.getByTestId('order-status')).toHaveText('Waiting for payment');
  status = 'paid';
  await expect(page.getByTestId('order-status')).toHaveText('Paid', { timeout: 10_000 });
  await expect(page.getByTestId('order-notice')).toContainText('received and checked: invoice.paid');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/shop-paid.png' });
});
