import { expect, test } from '@playwright/test';

const ID = '11111111-1111-4111-8111-111111111111';
const link = { id: ID, merchant: 'Everyday Supply', return_url: 'http://localhost:3011/shop?order=order-1', amount_naira: 1400, to: 'Yi**** Di***', bank_name: 'OPay', account_number: '****4108', receives: 'naira', note: 'Everyday Supply order-1', line_items: [{ description: 'Studio headphones', amount_naira: 900 }], open: true, paid: false, payment: null };

const PAID = { ...link, open: false, paid: true, payment: { id: 'p', status: 'paid', pay_from: 'near', pay_token: 'USDC', pay_usdc: '1.0', deposit_address: null, deposit_deadline: null, failure_reason: null, paid_at: new Date().toISOString(), links: [] } };
const outsideShop = (id = ID) => `<html><body><h1>Some other shop</h1><script src="http://localhost:3011/checkout.js" data-invoice="${id}"></script></body></html>`;

test('the button opens 10kobo checkout over the shop page, and Esc or the close button shuts it', async ({ page }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: link }));
  await page.setContent(outsideShop());
  await page.getByRole('button', { name: /Pay with crypto/ }).click();
  const box = page.getByRole('dialog', { name: '10kobo checkout' });
  await expect(box).toBeVisible();
  const checkout = page.frameLocator('iframe[title="10kobo checkout"]');
  await expect(checkout.getByTestId('link-payee')).toHaveText('Pay Everyday Supply');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/checkout-popup.png' });
  // The box fits the checkout: wider than before, and no taller than what it shows.
  await expect.poll(async () => (await page.locator('iframe[title="10kobo checkout"]').boundingBox())!.width).toBeGreaterThan(540);
  // As tall as the checkout, except that a long one stops inside the window, with a margin, and scrolls in the box.
  const inner = await checkout.locator('main').evaluate((element) => element.getBoundingClientRect().height);
  const room = page.viewportSize()!.height - 32;
  await expect.poll(async () => Math.abs((await page.locator('iframe[title="10kobo checkout"]').boundingBox())!.height - Math.min(inner, room))).toBeLessThan(4);
  await checkout.getByTestId('link-payee').click();
  await page.keyboard.press('Escape');
  await expect(box).toHaveCount(0);
  await page.getByRole('button', { name: /Pay with crypto/ }).click();
  await page.getByRole('button', { name: 'Close checkout' }).click();
  await expect(box).toHaveCount(0);
  expect(await page.evaluate(() => { try { (window as unknown as { TenKobo: { open: (id: string) => void } }).TenKobo.open('javascript:alert(1)'); return 'opened'; } catch { return 'refused'; } })).toBe('refused');
});

test('the shop page hears at once when the payment is done, and Done closes the box', async ({ page }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: PAID }));
  await page.setContent('<html><body><script src="http://localhost:3011/checkout.js"></script></body></html>');
  await page.waitForFunction(() => Boolean((window as unknown as { TenKobo?: unknown }).TenKobo));
  await page.evaluate((id) => {
    const w = window as unknown as { TenKobo: { open: (id: string, options: object) => void }; heard: string[] };
    w.heard = [];
    w.TenKobo.open(id, { onPaid: () => w.heard.push('paid'), onClose: (result: { paid: boolean }) => w.heard.push(`closed ${result.paid}`) });
  }, ID);
  await expect.poll(() => page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual(['paid']);
  await page.frameLocator('iframe[title="10kobo checkout"]').getByTestId('link-done').click();
  await expect(page.getByRole('dialog', { name: '10kobo checkout' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual(['paid', 'closed true']);
});

test('a message pretending to be the checkout is ignored', async ({ page }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: link }));
  await page.setContent('<html><body><script src="http://localhost:3011/checkout.js"></script></body></html>');
  await page.waitForFunction(() => Boolean((window as unknown as { TenKobo?: unknown }).TenKobo));
  await page.evaluate((id) => {
    const w = window as unknown as { TenKobo: { open: (id: string, options: object) => void }; heard: string[] };
    w.heard = [];
    w.TenKobo.open(id, { onPaid: () => w.heard.push('paid') });
    window.postMessage({ source: '10kobo', type: 'status', invoice: id, status: 'paid' }, '*');
  }, ID);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual([]);
});

test('a shop can still ask for a new tab instead', async ({ page, context }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: link }));
  await page.setContent('<html><body><script src="http://localhost:3011/checkout.js"></script></body></html>');
  await page.waitForFunction(() => Boolean((window as unknown as { TenKobo?: unknown }).TenKobo));
  const [tab] = await Promise.all([context.waitForEvent('page'), page.evaluate((id) => (window as unknown as { TenKobo: { open: (id: string, options: object) => void } }).TenKobo.open(id, { mode: 'tab' }), ID)]);
  expect(tab.url()).toBe(`http://localhost:3011/pay/${ID}`);
  expect(await tab.evaluate(() => window.opener)).toBeNull();
});

test('only the checkout may be shown inside another website', async ({ request }) => {
  expect((await request.get('/')).headers()['x-frame-options']).toBe('DENY');
  expect((await request.get('/agent')).headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect((await request.get(`/pay/${ID}`)).headers()['x-frame-options']).toBeUndefined();
});

test('opened as a plain page, a paid checkout offers a link back to the shop', async ({ page }) => {
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: PAID }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-return')).toHaveText('Back to Everyday Supply');
  await expect(page.getByTestId('link-return')).toHaveAttribute('href', 'http://localhost:3011/shop?order=order-1');
});

test('the demo shop makes the order on its server, opens checkout over the page, and shows paid with the signed notice', async ({ page }) => {
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
  await page.getByRole('button', { name: 'One more Essential sunglasses' }).click();
  await expect(page.getByTestId('shop-total')).toHaveText('₦1,600');
  await page.getByRole('button', { name: 'One less Essential sunglasses' }).click();
  await page.waitForFunction(() => Boolean((window as unknown as { TenKobo?: unknown }).TenKobo));
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: link }));
  await page.getByRole('button', { name: /Checkout with 10kobo/ }).click();
  await expect(page.frameLocator('iframe[title="10kobo checkout"]').getByTestId('link-payee')).toHaveText('Pay Everyday Supply');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/shop-popup.png' });
  await page.getByRole('button', { name: 'Close checkout' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('Not paid');
  await expect(page.getByTestId('order-closed')).toHaveText('You closed the checkout before paying. Nothing was charged.');
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/shop-not-paid.png' });
  expect(basket).toEqual({ items: { headphones: 1, backpack: 1, sunglasses: 1 } });
  status = 'paid';
  await expect(page.getByTestId('order-status')).toHaveText('Paid', { timeout: 10_000 });
  await expect(page.getByTestId('order-notice')).toContainText('received and checked: invoice.paid');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/shop-paid.png' });
});
