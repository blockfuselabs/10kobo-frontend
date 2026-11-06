import { expect, test, type Page } from '@playwright/test';

const options = {
  recipients: [
    { destination_id: '11111111-1111-4111-8111-000000000001', name: 'Mum', kind: 'bank', detail: 'Ada Bello, OPay ****4568', network: null },
    { destination_id: '11111111-1111-4111-8111-000000000002', name: 'Kc', kind: 'phone', detail: '0803 ***4567 (MTN)', network: 'MTN' },
  ],
  networks: [
    { id: 'base', name: 'Base', token: 'USDC' },
    { id: 'stellar', name: 'Stellar', token: 'USDC' },
    { id: 'tron', name: 'Tron', token: 'USDT' },
  ],
  phone_networks: ['MTN', 'Airtel', 'Glo', '9mobile'],
};
const planFor = (item: object) => ({
  id: '22222222-2222-4222-8222-000000000001', status: 'proposed', quote_expires_at: new Date(Date.now() + 600_000).toISOString(), total_naira: '₦5,000', total_usdc: '3.60 USDC', calls: [],
  items: [{ id: 'i1', route: 'bank', recipient_name: 'Mum', recipient_detail: 'Ada Bello, OPay ****4568', amount_naira: '₦5,000', amount_usdc: '3.60 USDC', data_plan: null, payment_status: null, failure_reason: null, tx_hash: null, paid_at: null, refund_tx_hash: null, simulated: false, ...item }],
});

async function open(page: Page, onSend: (body: Record<string, unknown>) => object | { status: number; message: string }) {
  await page.route('**/v1/send/options', (route) => route.fulfill({ json: options }));
  await page.route('**/v1/send/data-plans*', (route) => route.fulfill({ json: { plans: [{ id: 'mtn-1gb', label: '1GB, 30 days', price: '₦1,000' }] } }));
  await page.route('**/v1/send', (route) => {
    const answer = onSend(route.request().postDataJSON());
    return 'message' in answer ? route.fulfill({ status: answer.status as number, json: { message: answer.message } }) : route.fulfill({ json: { plan: answer } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Send money' }).click();
}

test('sends to a saved bank recipient with a form, and shows the same approval card as the chat', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let sent: Record<string, unknown> | null = null;
  await open(page, (body) => { sent = body; return planFor({}); });
  await expect(page.getByRole('group', { name: 'Who are you sending to?' }).getByRole('button')).toHaveText([/Bank Account/, /Crypto Wallet/, /Airtime & Data/]);
  await expect(page.getByTestId('recipient-picker')).toContainText('Mum');
  await page.getByLabel('Amount in naira').fill('5000');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/send-bank.png' });
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sent).toEqual({ route: 'bank', destination_id: options.recipients[0]!.destination_id, amount_naira: 5000, new_recipient: null });
  const card = page.getByRole('region', { name: 'Payments to approve' });
  await expect(card).toContainText('Mum');
  await expect(card.getByRole('button', { name: 'Approve' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Who are you sending to?' })).toHaveCount(0);
});

test('sends to a new Stellar wallet, choosing the network from the list', async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await open(page, (body) => { sent = body; return planFor({ route: 'usdc', recipient_name: 'Ada', network: 'Stellar' }); });
  await page.getByTestId('send-crypto').click();
  await page.getByTestId('network-picker').click();
  await page.getByRole('option', { name: /Stellar/ }).click();
  await page.getByLabel('Wallet address').fill('GAZ6GHSFCKVVCOECNRJ7XKKP3KPSJ24ZGHJNLF3MPMOYOG2RXFU2Z6OB');
  await page.getByLabel('Name (optional)').fill('Ada');
  await page.getByLabel('Amount in USDC').fill('5');
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sent).toEqual({ route: 'usdc', destination_id: null, amount_usdc: '5', new_recipient: { name: 'Ada', wallet_address: 'GAZ6GHSFCKVVCOECNRJ7XKKP3KPSJ24ZGHJNLF3MPMOYOG2RXFU2Z6OB', wallet_chain: 'Stellar' } });
  await expect(page.getByRole('region', { name: 'Payments to approve' })).toContainText('Ada');
});

test('buys data for a saved phone, with the plans for its network', async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await open(page, (body) => { sent = body; return planFor({ route: 'data', recipient_name: 'Kc', data_plan: '1GB, 30 days' }); });
  await page.getByTestId('send-phone').click();
  await expect(page.getByTestId('recipient-picker')).toContainText('Kc');
  await page.getByRole('group', { name: 'Airtime or data' }).getByRole('button', { name: 'data' }).click();
  await page.getByLabel('Data plan').selectOption('mtn-1gb');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/send-data.png' });
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sent).toEqual({ route: 'data', destination_id: options.recipients[1]!.destination_id, data_plan_id: 'mtn-1gb', new_recipient: null });
});

test('says why a payment was refused, offers to add money, and keeps the form', async ({ page }) => {
  await open(page, () => ({ status: 422, message: 'You need 3.60 USDC but your wallet has 1.00 USDC. Nothing was sent.' }));
  await page.getByLabel('Amount in naira').fill('5000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'wallet has' })).toContainText('You need 3.60 USDC');
  await page.getByRole('button', { name: 'Add money' }).click();
  await expect(page.getByRole('heading', { name: 'Add USDC' })).toBeVisible();
});

test('a new bank recipient picks the bank from a searchable list, or types one that is not listed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let sent: Record<string, unknown> | null = null;
  await open(page, (body) => { sent = body; return planFor({}); });
  await page.getByTestId('recipient-picker').click();
  await page.getByRole('option', { name: 'Someone new' }).click();
  await page.getByTestId('network-picker').click();
  await page.getByLabel('Search banks').fill('palm');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/send-bank-picker.png' });
  await page.getByRole('option', { name: /PalmPay/ }).click();
  await expect(page.getByTestId('network-picker')).toContainText('PalmPay');
  await page.getByTestId('network-picker').click();
  await page.getByLabel('Search banks').fill('Paga');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('network-picker')).toContainText('Paga');
  await page.getByLabel('Account number').fill('0123456789');
  await page.getByLabel('Amount in naira').fill('2000');
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sent).toEqual({ route: 'bank', destination_id: null, amount_naira: 2000, new_recipient: { bank_name: 'Paga', account_number: '0123456789' } });
});

test('with 100 saved people, shows only the 5 most recent, and search finds anyone', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const many = Array.from({ length: 100 }, (_, index) => ({ destination_id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`, name: `Person ${index + 1}`, kind: 'bank', detail: `Bank account ****${String(1000 + index)}`, network: null }));
  await page.route('**/v1/send/options', (route) => route.fulfill({ json: { ...options, recipients: many } }));
  let sent: Record<string, unknown> | null = null;
  await page.route('**/v1/send', (route) => { sent = route.request().postDataJSON(); return route.fulfill({ json: { plan: planFor({ recipient_name: 'Person 73' }) } }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Send money' }).click();
  await expect(page.getByTestId('recipient-picker')).toContainText('Person 1');
  await page.getByTestId('recipient-picker').click();
  // Someone new, then the five most recent, and a note that the rest are a search away.
  await expect(page.getByRole('option')).toHaveCount(6);
  await expect(page.getByRole('listbox')).toContainText('95 more saved. Search to find them.');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/send-recipients.png' });
  await page.getByLabel('Search recipients').fill('person 73');
  await expect(page.getByRole('option')).toHaveCount(2);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('recipient-picker')).toContainText('Person 73');
  await page.getByTestId('recipient-picker').click();
  await page.getByLabel('Search recipients').fill('nobody here');
  await expect(page.getByRole('listbox')).toContainText('Nobody saved called “nobody here”.');
  await page.keyboard.press('Escape');
  await page.getByLabel('Amount in naira').fill('1000');
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(sent).toMatchObject({ route: 'bank', destination_id: many[72]!.destination_id, amount_naira: 1000 });
});

test('wallets saved under their address show short, with network and last paid, and can be named', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const wallets = [
    { destination_id: '11111111-1111-4111-8111-00000000000a', contact_id: '33333333-3333-4333-8333-00000000000a', name: '0x8168C3DC48e2174BeD6110EAFaC20Ed8529f11e2', unnamed: true, kind: 'wallet', detail: '0x8168…11e2', network: 'Base', last_paid_at: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { destination_id: '11111111-1111-4111-8111-00000000000b', contact_id: '33333333-3333-4333-8333-00000000000b', name: 'GAZ6GHSFCKVVCOECNRJ7XKKP3KPSJ24ZGHJNLF3MPMOYOG2RXFU2Z6OB', unnamed: true, kind: 'wallet', detail: 'GAZ6GH…Z6OB', network: 'Stellar', last_paid_at: new Date().toISOString() },
  ];
  let named: unknown = null;
  let current = wallets;
  await page.route('**/v1/send/options', (route) => route.fulfill({ json: { ...options, recipients: current } }));
  await page.route('**/v1/contacts/*/rename', (route) => {
    named = { url: route.request().url(), body: route.request().postDataJSON() };
    current = [{ ...wallets[0]!, name: 'Tolu', unnamed: false }, wallets[1]!];
    return route.fulfill({ status: 204, body: '' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Send money' }).click();
  await page.getByTestId('send-crypto').click();
  const picker = page.getByTestId('recipient-picker');
  await expect(picker).toContainText('0x8168…11e2');
  await expect(picker).toContainText('Base · Last paid 2 days ago');
  await picker.click();
  await expect(page.getByRole('option').nth(2)).toContainText('Stellar · Last paid today');
  await page.getByLabel('Search recipients').fill('stellar');
  await expect(page.getByRole('option')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/send-unnamed.png' });
  await page.getByLabel('Name for this recipient').fill('Tolu');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(picker).toContainText('Tolu');
  await expect(picker).toContainText('Base · 0x8168…11e2 · Last paid 2 days ago');
  await expect(page.getByTestId('name-it')).toHaveCount(0);
  expect(named).toEqual({ url: expect.stringContaining('/v1/contacts/33333333-3333-4333-8333-00000000000a/rename'), body: { name: 'Tolu' } });
});
