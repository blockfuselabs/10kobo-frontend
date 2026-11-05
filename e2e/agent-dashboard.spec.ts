import { expect, test, type Page } from '@playwright/test';

const setup = { real: false, budget_usdc: '2', busy: false, scenarios: [{ name: 'normal', title: 'Normal invoice', summary: 'Should pay.', invoice: 'INVOICE 1' }, { name: 'wrong-name', title: 'Wrong name', summary: 'Should refuse.', invoice: 'INVOICE 2' }] };
const started = { type: 'started', budget: '2', keyless: true };

async function mock(page: Page, base: object, run: object) {
  await page.route('**/v1/demo-agent/scenarios', (route) => route.fulfill({ json: base }));
  await page.route('**/v1/demo-agent/runs', (route) => route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', status: 'running', started_at: new Date().toISOString(), events: [started], real: (base as { real: boolean }).real } }));
  await page.route('**/v1/demo-agent/runs/*', (route) => route.fulfill({ json: run }));
}

test('shows each step the agent reports, hides account numbers, and says test mode plainly', async ({ page }) => {
  await mock(page, setup, {
    id: '11111111-1111-4111-8111-111111111111', status: 'finished', real: false, started_at: new Date().toISOString(),
    events: [started, { type: 'quote', amount: '₦1,400', name: 'Ad* Be***', bank: 'OPay', account: '****4568', usdc: '1.02' }, { type: 'thinking', text: 'Paying OPay 8031234568.' }, { type: 'sending', usdc: '1.02', to: '0xabc' }, { type: 'result', outcome: 'paid', reason: 'Paid account 8031234568.', receipt: { paid: '₦1,400', to: 'Ad* Be***, OPay ****4568', funded_with: '1.02 USDC' }, transactions: ['simulated'], at: new Date().toISOString() }],
  });
  await page.goto('/agent');
  await expect(page.getByTestId('money-mode')).toHaveText('Test mode. No real money');
  await page.getByRole('button', { name: 'Run agent' }).click();
  const result = page.getByTestId('result');
  await expect(result).toContainText('Test: would have paid ₦1,400');
  await expect(page.getByTestId('timeline')).toContainText('Would sign 1.02 USDC');
  await expect(page.locator('main')).not.toContainText('8031234568');
  await expect(page.locator('main')).toContainText('******4568');
  await expect(page.getByRole('link', { name: 'View on NEAR' })).toHaveCount(0);
});

test('shows a refusal plainly, with the reason', async ({ page }) => {
  await mock(page, setup, { id: '11111111-1111-4111-8111-111111111111', status: 'finished', real: false, started_at: new Date().toISOString(), events: [started, { type: 'result', outcome: 'refused', reason: 'The name does not match.', receipt: null, transactions: [], at: new Date().toISOString() }] });
  await page.goto('/agent');
  await page.getByRole('button', { name: 'Wrong name' }).click();
  await expect(page.getByTestId('invoice')).toHaveText('INVOICE 2');
  await page.getByRole('button', { name: 'Run agent' }).click();
  await expect(page.getByTestId('result')).toContainText('Refused. Nothing was sent.');
  await expect(page.getByTestId('result')).toContainText('The name does not match.');
});

test('asks before spending real money, and sends nothing if declined', async ({ page }) => {
  let started_ = 0;
  await page.route('**/v1/demo-agent/scenarios', (route) => route.fulfill({ json: { ...setup, real: true } }));
  await page.route('**/v1/demo-agent/runs', (route) => {
    started_ += 1;
    return route.fulfill({ json: { id: '11111111-1111-4111-8111-111111111111', status: 'finished', real: true, started_at: new Date().toISOString(), events: [] } });
  });
  page.on('dialog', (dialog) => void dialog.dismiss());
  await page.goto('/agent');
  await expect(page.getByTestId('money-mode')).toHaveText('Real money');
  await page.getByRole('button', { name: 'Run agent' }).click();
  await page.waitForTimeout(300);
  expect(started_).toBe(0);
});

test('says so when the agent is switched off here', async ({ page }) => {
  await page.route('**/v1/demo-agent/scenarios', (route) => route.fulfill({ status: 403, json: { message: 'no' } }));
  await page.goto('/agent');
  await expect(page.getByRole('region', { name: 'What the agent is doing' }).getByRole('alert')).toContainText('switched off');
});
