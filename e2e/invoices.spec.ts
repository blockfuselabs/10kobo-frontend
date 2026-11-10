import { expect, test } from '@playwright/test';

const now = new Date().toISOString();
const invoice = (id: string, extra: object) => ({ id, url: `http://localhost:3011/pay/${id}`, amount_naira: 5000, note: 'Generator repair', due_date: null, line_items: null, to: 'Ada Bello', receives: 'naira, OPay ****4108', created_at: now, expires_at: now, paid_at: null, status: 'unpaid', ...extra });

test('lists every invoice with its status, filters them, copies a link and cancels one', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1280, height: 900 });
  let list = [
    invoice('11111111-1111-4111-8111-111111111111', { note: 'Generator repair', due_date: '2026-12-01', line_items: [{ description: 'Repair', amount_naira: 3000 }, { description: 'Parts', amount_naira: 2000 }] }),
    invoice('22222222-2222-4222-8222-222222222222', { note: 'Old job', status: 'overdue', due_date: '2026-10-01', amount_naira: 2000 }),
    invoice('33333333-3333-4333-8333-333333333333', { note: 'Finished job', status: 'paid', paid_at: now }),
    invoice('44444444-4444-4444-8444-444444444444', { note: 'Being paid job', status: 'being_paid' }),
  ];
  const cancelled: string[] = [];
  await page.route('**/v1/pay-links', (route) => route.fulfill({ json: { invoices: list } }));
  await page.route('**/v1/pay-links/*/cancel', (route) => {
    const id = route.request().url().split('/').at(-2)!;
    cancelled.push(id);
    list = list.map((item) => (item.id === id ? { ...item, status: 'cancelled' } : item));
    return route.fulfill({ json: list.find((item) => item.id === id) });
  });

  await page.goto('/');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Invoices' }).click();
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  await expect(page.getByTestId('invoice-summary')).toHaveText('3 waiting to be paid, ₦12,000 in all.');
  const rows = page.getByRole('list', { name: 'Invoices' }).getByRole('listitem').filter({ has: page.getByTestId('invoice-status') });
  await expect(rows).toHaveCount(4);
  await expect(rows.filter({ hasText: 'Old job' }).getByTestId('invoice-status')).toHaveText('Overdue');
  // Each invoice is one line; opening it shows the details and what can be done.
  const expand = (row: import('@playwright/test').Locator) => row.locator('button[aria-expanded]').click();
  await expand(rows.filter({ hasText: 'Being paid job' }));
  await expect(rows.filter({ hasText: 'Being paid job' })).toContainText('cannot be cancelled');
  await expect(rows.filter({ hasText: 'Being paid job' }).getByRole('button', { name: 'Cancel invoice' })).toHaveCount(0);
  await expand(rows.filter({ hasText: 'Finished job' }));
  await expect(rows.filter({ hasText: 'Finished job' }).getByRole('button', { name: 'Copy link' })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/invoices.png' });

  await page.getByRole('button', { name: 'Paid', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole('button', { name: 'All', exact: true }).click();

  const first = rows.filter({ hasText: 'Generator repair' });
  await expand(first);
  await first.getByRole('button', { name: 'Copy link' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://localhost:3011/pay/11111111-1111-4111-8111-111111111111');
  await first.getByRole('button', { name: 'Cancel invoice' }).click();
  await first.getByRole('button', { name: 'Keep it' }).click();
  expect(cancelled).toEqual([]);
  await first.getByRole('button', { name: 'Cancel invoice' }).click();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/invoices-confirm.png' });
  await first.getByRole('button', { name: 'Yes, cancel it' }).click();
  await expect(first.getByTestId('invoice-status')).toHaveText('Cancelled');
  expect(cancelled).toEqual(['11111111-1111-4111-8111-111111111111']);
  await expect(page.getByTestId('invoice-summary')).toHaveText('2 waiting to be paid, ₦7,000 in all.');
});

test('a phone shows the Invoices tab without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.route('**/v1/pay-links', (route) => route.fulfill({ json: { invoices: [invoice('11111111-1111-4111-8111-111111111111', { to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', receives: 'USDC on Base' })] } }));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Invoices' }).click();
  await expect(page.getByTestId('invoice-status')).toHaveText('Unpaid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/invoices-phone.png' });
});

test('many invoices come five to a page, and a filter starts again on page one', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const many = Array.from({ length: 23 }, (_, n) =>
    invoice(`00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, { note: `Job ${n + 1}`, status: n < 3 ? 'paid' : 'unpaid', paid_at: n < 3 ? now : null }),
  );
  await page.route('**/v1/pay-links', (route) => route.fulfill({ json: { invoices: many } }));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Invoices' }).click();
  const rows = page.getByRole('list', { name: 'Invoices' }).getByRole('listitem').filter({ has: page.getByTestId('invoice-status') });
  const pages = page.getByRole('navigation', { name: 'Invoice pages' });
  await expect(rows).toHaveCount(5);
  await expect(page.getByTestId('invoice-page')).toHaveText('1–5 of 23');
  await expect(pages.getByRole('button', { name: 'Previous' })).toBeDisabled();
  for (let n = 0; n < 4; n++) await pages.getByRole('button', { name: 'Next' }).click();
  await expect(rows).toHaveCount(3);
  await expect(page.getByTestId('invoice-page')).toHaveText('21–23 of 23');
  await expect(pages.getByRole('button', { name: 'Next' })).toBeDisabled();
  await page.getByRole('button', { name: 'Paid', exact: true }).click();
  await expect(rows).toHaveCount(3);
  // One page: the count shows, with nothing to page through.
  await expect(page.getByTestId('invoice-page')).toHaveText('1–3 of 3');
  await expect(pages.getByRole('button')).toHaveCount(0);
});
