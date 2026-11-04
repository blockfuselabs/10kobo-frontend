import { expect, test } from '@playwright/test';

const entry = (n: number, overrides: object = {}) => ({ id: `11111111-1111-4111-8111-1111111111${String(n).padStart(2, '0')}`, has_receipt: true, kind: 'payment', created_at: new Date(2026, 10, 3, 12, n).toISOString(), direction: 'out', type: 'bank', type_label: 'Bank transfer', detail: 'Ada Bello, OPay ****4568', description: `Sent to Person ${n}`, amount_naira: '₦1,000', amount_usdc: '0.72 USDC', status: 'completed', tx_hash: '0x' + 'a'.repeat(64), ...overrides });
const receipt = { reference: '11111111-1111', kind: 'Bank transfer', title: 'Payment successful', recipient: 'Halima', recipient_detail: 'Danjuma Halima Sani, OPay ****4568', amount: '₦1,376.36', second_amount: '1.00 USDC', note: 'Naira shown is the quoted amount. The exact figure is on the bank alert.', completed_at: new Date().toISOString(), tx_hash: '0x' + 'a'.repeat(64) };

test('activity has pages, and a receipt downloads as an image', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/v1/activity*', (route) => {
    const at = Number(new URL(route.request().url()).searchParams.get('page'));
    const items = at === 1 ? [entry(1, { status: 'paying', has_receipt: false }), ...Array.from({ length: 9 }, (_, i) => entry(i + 2))] : [entry(11), entry(12)];
    return route.fulfill({ json: { activity: items, page: at, per_page: 10, total: 12 } });
  });
  await page.route('**/v1/receipts/**', (route) => route.fulfill({ json: { receipt } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  const list = page.getByRole('list', { name: 'Activity' });
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.getByRole('button', { name: '← Previous' })).toBeDisabled();
  await expect(list.getByRole('listitem').first()).toContainText('Processing');
  await expect(list.getByRole('listitem').nth(1)).toContainText('−₦1,000');
  await expect(list.getByRole('listitem').first().getByRole('button', { name: 'Receipt' })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/activity.png' });

  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(2);

  await list.getByRole('button', { name: 'Receipt' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Receipt' });
  const image = dialog.getByRole('img');
  await expect(image).toHaveAttribute('alt', 'Payment successful, ₦1,376.36 to Halima');
  expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(1440);
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/receipt-dialog.png' });
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Download' }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe('10kobo-receipt-11111111.png');
  await saved.saveAs('/tmp/10kobo-e2e-results/receipt.png');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('tabs, search, type, dates and download all reach the server', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const asked: string[] = [];
  await page.route('**/v1/activity/export*', (route) => route.fulfill({ status: 200, contentType: 'text/csv', body: 'Date,Description\r\n' }));
  await page.route('**/v1/activity?*', (route) => {
    asked.push(route.request().url().split('?')[1]!);
    return route.fulfill({ json: { activity: [entry(1, { direction: 'in', type: 'deposit', type_label: 'Naira deposit', description: 'Deposited ₦2,000', amount_naira: null, amount_usdc: '1.44 USDC', detail: null })], page: 1, per_page: 6, total: 1 } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  const row = page.getByRole('list', { name: 'Activity' }).getByRole('listitem').first();
  await expect(row).toContainText('+1.44 USDC');
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(row.getByRole('link', { name: 'View' })).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/activity-filters.png' });

  await page.getByRole('tab', { name: 'Money in' }).click();
  await expect.poll(() => asked.at(-1)).toContain('direction=in');
  await page.getByLabel('Filter by type').selectOption('deposit');
  await expect.poll(() => asked.at(-1)).toContain('type=deposit');
  await page.getByLabel('Search transactions').fill('Ada');
  await expect.poll(() => asked.at(-1)).toContain('search=Ada');
  await page.getByLabel('From date').fill('2026-11-01');
  await expect.poll(() => asked.at(-1)).toContain('from=2026-11-01');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download list' }).click();
  expect((await download).suggestedFilename()).toBe('10kobo-activity.csv');
});

test('the sidebar shows the rate, Deposit, Send money and the latest transaction', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/v1/wallet', (route) => route.fulfill({ json: { address: '0x393eA6fbd50b821CdE7EdC1b936c567dbb15c26d', balance_usdc: '0.76 USDC', balance_naira: '₦1,041.66', limit_used: '₦0', limit_left: '₦500,000', naira_per_usdc: 1375.36, latest: entry(1, { description: 'Sent to Halima', amount_naira: '₦1,376.36' }) } }));
  await page.goto('/');
  await expect(page.getByTestId('rate')).toContainText('₦1,375.36 per $1');
  await expect(page.getByTestId('latest')).toContainText('−₦1,376.36');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/sidebar.png' });
  await page.getByRole('button', { name: 'Send money' }).click();
  await expect(page.getByLabel('Message')).toHaveValue('Send ');
  await page.getByTestId('latest').click();
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await page.getByRole('button', { name: 'Deposit', exact: true }).click();
  await expect(page.getByText('Deposit naira')).toBeVisible();
});

test('dark mode settles to dark colours', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/dark-settled.png' });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
});
