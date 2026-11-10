import { expect, test } from '@playwright/test';
import { openChat } from './home';

const ID = '11111111-1111-4111-8111-111111111111';
const URL = `http://localhost:3011/pay/${ID}`;
const details = { id: ID, amount_naira: 5000, to: 'Yi**** Di*** Fi*****', bank_name: 'OPay', account_number: '****4108', receives: 'naira', note: 'Generator repair and parts', due_date: '2099-01-31', overdue: false, open: true, paid: false, payment: null, line_items: [{ description: 'Generator repair', amount_naira: 3000 }, { description: 'Parts', amount_naira: 2000 }] };

test('a pay link in the chat becomes a readable card, with a link that opens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route(`**/v1/public/pay-links/${ID}`, (route) => route.fulfill({ json: details }));
  const reply = { id: '33333333-3333-4333-8333-333333333333', role: 'assistant', content: `Your invoice is ready to send.\n\n${URL}`, created_at: new Date().toISOString() };
  let sent = false;
  await page.route(/\/v1\/chat\/messages(\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      sent = true;
      return route.fulfill({ json: { conversation_id: '22222222-2222-4222-8222-222222222222', reply } });
    }
    return sent ? route.fulfill({ json: { messages: [{ id: '44444444-4444-4444-8444-444444444444', role: 'user', content: 'make an invoice', created_at: new Date().toISOString() }, reply] } }) : route.continue();
  });
  await page.goto('/');
  await openChat(page);
  await page.getByLabel('Message').fill('make an invoice');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const card = page.getByRole('region', { name: 'Invoice' });
  await expect(card).toContainText('₦5,000');
  await expect(card).toContainText('Generator repair');
  await expect(card).toContainText('31 January 2099');
  await expect(card).toContainText('****4108');
  await expect(card.getByRole('link', { name: 'Open invoice' })).toHaveAttribute('href', URL);
  await expect(card.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await expect(page.getByText('Your invoice is ready to send.', { exact: true })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/pay-link-card.png' });
});
