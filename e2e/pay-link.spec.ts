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
  await expect(page.getByTestId('link-route')).toContainText('It is not the receiver');
  await expect(page.getByRole('timer')).toBeVisible();
  expect(sent).toEqual({ pay_from: 'arbitrum', pay_token: 'USDC', refund_to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' });
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

test('works as an invoice: items and due date show, and it offers USDT only where it can be used', async ({ page }) => {
  let sent: unknown;
  await serve(page, () => ({ ...base, due_date: '2099-01-31', overdue: false, line_items: [{ description: 'Generator repair', amount_naira: 3000 }, { description: 'Parts', amount_naira: 2000 }] }));
  await page.route(`**/v1/public/pay-links/${ID}/pay`, async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { ...base, payment: { ...payment, pay_from: 'solana', pay_token: 'USDT' } } });
  });
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('line-items')).toContainText('Generator repair');
  await expect(page.getByTestId('line-items')).toContainText('₦3,000');
  await expect(page.getByTestId('due-date')).toContainText('2099');
  await expect(page.getByRole('button', { name: 'USDT' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Solana' }).click();
  await page.getByRole('button', { name: 'USDT' }).click();
  await page.getByLabel(/Your Solana address/).fill('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('region', { name: 'Pay this link' })).toContainText('Send exactly, in USDT');
  expect(sent).toMatchObject({ pay_from: 'solana', pay_token: 'USDT' });
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-invoice.png' });
});

test('someone with only naira can pay an invoice that pays out USDC, by bank transfer', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const wallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const usdcLink = { ...base, to: wallet, bank_name: 'Base', account_number: null, receives: 'USDC on Base', naira_available: true };
  let current: object = usdcLink;
  let sent: unknown = null;
  await serve(page, () => current);
  await page.route(`**/v1/public/pay-links/${ID}/pay`, async (route) => {
    sent = route.request().postDataJSON();
    current = { ...usdcLink, payment: { id: 'n1', status: 'awaiting_deposit', pay_from: 'naira', pay_token: 'USDC', pay_usdc: '3.602305', receiver_gets_usdc: '3.60', deposit_address: null, deposit_deadline: new Date(Date.now() + 30 * 60_000).toISOString(), failure_reason: null, paid_at: null, links: [], naira_account: { bank_name: 'Safehaven', account_number: '6010681891', account_name: '10kobo Customer', amount_naira: 5000 } } };
    return route.fulfill({ json: current });
  });
  await page.goto(`/pay/${ID}`);
  // Bank transfer is the first choice and already picked, with no chains to puzzle over.
  await expect(page.getByTestId('method-bank')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Solana' })).toHaveCount(0);
  await expect(page.getByTestId('naira-note')).toContainText('becomes USDC and goes to');
  await expect(page.getByLabel(/for any refund/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sent).toEqual({ pay_from: 'naira' });
  await expect(page.getByTestId('naira-amount')).toHaveText('₦5,000');
  await expect(page.getByTestId('naira-account')).toHaveText('6010681891');
  await expect(page.getByTestId('naira-account-name')).toHaveText('10kobo Customer');
  await expect(page.getByTestId('link-route')).toContainText(`about 3.60 USDC goes to ${wallet} on Base`);
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Copy' }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('5000');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-naira.png' });
  current = { ...usdcLink, payment: { ...(current as { payment: object }).payment, status: 'processing', naira_account: null, deposit_deadline: null } };
  await expect(page.getByTestId('link-progress')).toHaveText('Your transfer arrived. The USDC is on its way to the receiver.', { timeout: 10_000 });
});

test('naira is not offered when the receiver gets naira', async ({ page }) => {
  await serve(page, () => ({ ...base, naira_available: false }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByRole('button', { name: 'Base', exact: true })).toBeVisible();
  await expect(page.getByTestId('method-bank')).toHaveCount(0);
  await expect(page.getByText('How do you want to pay?')).toHaveCount(0);
});

test('a payer who picks crypto gets the chains and a refund address, and can switch back to bank transfer', async ({ page }) => {
  await serve(page, () => ({ ...base, to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', bank_name: 'Base', account_number: null, receives: 'USDC on Base', naira_available: true }));
  await page.goto(`/pay/${ID}`);
  await page.getByTestId('method-crypto').click();
  await expect(page.getByTestId('naira-note')).toHaveCount(0);
  await page.getByRole('button', { name: 'NEAR' }).click();
  await expect(page.getByLabel(/Your NEAR address, for any refund/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'USDT', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-crypto-choice.png' });
  await page.getByTestId('method-bank').click();
  await expect(page.getByTestId('naira-note')).toBeVisible();
  await expect(page.getByLabel(/for any refund/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
});

test('a cancelled invoice says so and offers nothing to pay', async ({ page }) => {
  await serve(page, () => ({ ...base, open: false, cancelled: true }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByText('This invoice was cancelled.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
});

test('when the time runs out it says Expired and takes the address away', async ({ page }) => {
  let current: object = { ...base, payment: { ...payment, deposit_deadline: new Date(Date.now() + 1500).toISOString() } };
  await serve(page, () => current);
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-address')).toBeVisible();
  current = { ...base, open: true, payment: { ...payment, status: 'checking', deposit_address: null, deposit_deadline: null, failure_reason: null } };
  await expect(page.getByTestId('link-address')).toHaveCount(0, { timeout: 10_000 });
  // While a last-moment payment is looked for, nothing invites a second one.
  await expect(page.getByTestId('link-progress')).toContainText('Please do not send again');
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  current = { ...base, open: true, payment: { ...payment, status: 'expired', deposit_address: null, deposit_deadline: null, failure_reason: 'No payment arrived in time.' } };
  await expect(page.getByTestId('link-last-try')).toContainText('has expired. Do not send to it.');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('an invoice paid out in USDC on Base says where it goes, with no bank in sight', async ({ page }) => {
  const wallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  await serve(page, () => ({ ...base, to: wallet, bank_name: 'Base', account_number: null, receives: 'USDC on Base', payment: { ...payment, receiver_gets_usdc: '3.33' } }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByText(`paid as USDC on Base`)).toBeVisible();
  await expect(page.getByTestId('link-route')).toContainText(`about 3.33 USDC goes on to ${wallet} on Base`);
  await expect(page.getByText('account above')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-usdc.png' });
});

test('shows proof links once paid, and says plainly when USDC goes to NEAR', async ({ page }) => {
  await serve(page, () => ({ ...base, to: 'ada.near', account_number: null, receives: 'USDC on NEAR', open: false, paid: true, payment: { ...payment, status: 'paid', deposit_address: null, links: [{ label: 'NEAR Intents settlement', url: 'https://nearblocks.io/txns/abc' }] } }));
  await page.goto(`/pay/${ID}`);
  await expect(page.getByTestId('link-paid')).toContainText('The USDC went to ada.near on NEAR');
  await expect(page.getByRole('link', { name: 'NEAR Intents settlement' })).toHaveAttribute('href', 'https://nearblocks.io/txns/abc');
});

test('a payer can pay from Tron, in USDT, which is the only choice there', async ({ page }) => {
  await serve(page, () => base);
  let sent: unknown;
  await page.route(`**/v1/public/pay-links/${ID}/pay`, async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { ...base, payment: { ...payment, pay_from: 'tron', pay_token: 'USDT', deposit_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' } } });
  });
  await page.goto(`/pay/${ID}`);
  for (const name of ['Tron', 'BNB Chain', 'Polygon', 'TON', 'Sui', 'Aptos', 'Gnosis', 'Monad']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stellar', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tron', exact: true }).click();
  await expect(page.getByTestId('usdt-only')).toHaveText('From Tron, you pay in USDT.');
  await expect(page.getByRole('button', { name: 'USDC', exact: true })).toHaveCount(0);
  await page.getByLabel(/Your Tron address/).fill('TJRabPrwbZy45sbavfcjinPJC18kjpRTv8');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-tron.png' });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect.poll(() => sent).toEqual({ pay_from: 'tron', pay_token: 'USDT', refund_to: 'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8' });
  await expect(page.getByTestId('link-address')).toHaveText('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  await expect(page.getByRole('region', { name: 'Pay this link' })).toContainText('Send only USDT, only on Tron');
});
