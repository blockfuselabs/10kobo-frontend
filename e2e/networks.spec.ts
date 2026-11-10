import { expect, test } from '@playwright/test';
import { openChat } from './home';

// The approval for a send to a network that receives USDT and has a catch, as the backend presents it.
const item = {
  id: '66666666-6666-4666-8666-666666666666', route: 'usdc', recipient_name: 'Ada', recipient_detail: 'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8',
  network: 'Tron', address_check: null, receiver_gets: '0.48 USDT', receiver_token: 'USDT', delivery_caution: 'Tron has no USDC here, so the receiver gets USDT.',
  delivery_seconds: 40, fee_warning: false, data_plan: null, amount_naira: '₦700', amount_usdc: '0.50 USDC', payment_status: null, failure_reason: null,
  tx_hash: null, paid_at: null, refund_tx_hash: null, simulated: false,
};
const plan = { id: '77777777-7777-4777-8777-777777777777', status: 'proposed', quote_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), total_naira: '₦700', total_usdc: '0.50 USDC', calls: [], items: [item] };

test('a send to Tron says the receiver gets USDT, and why, before it is approved', async ({ page }) => {
  const reply = { id: '88888888-8888-4888-8888-888888888888', role: 'assistant', content: 'Here is the payment to approve.', created_at: new Date().toISOString(), plan, contact: null, schedule_group: null, cancel_schedule: null, deposit: null };
  let sent = false;
  await page.route(/\/v1\/chat\/messages(\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      sent = true;
      return route.fulfill({ json: { conversation_id: '22222222-2222-4222-8222-222222222222', reply } });
    }
    return sent ? route.fulfill({ json: { messages: [reply] } }) : route.continue();
  });
  await page.goto('/');
  await openChat(page);
  await page.getByLabel('Message').fill('send 0.5 usdc to TJRabPrwbZy45sbavfcjinPJC18kjpRTv8');
  await page.getByLabel('Message').press('Enter');
  const card = page.getByRole('region', { name: 'Payments to approve' });
  await expect(card.getByTestId('network')).toHaveText('Network: Tron');
  await expect(card.getByTestId('receiver-gets')).toContainText('0.48 USDT');
  await expect(card.getByTestId('delivery-caution')).toHaveText('Tron has no USDC here, so the receiver gets USDT.');
  await expect(card).toContainText('The receiver must accept USDT on Tron.');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/send-to-tron.png' });
});
