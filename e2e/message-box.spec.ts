import { expect, test } from '@playwright/test';

const LONG = 'make an invoice to my client for generator repair 3000 and parts 2000, due 2027-01-31, pay to opay 8031234568 and please add a note that it covers the visit on Tuesday as well';

test('a long message wraps instead of sliding sideways, and Enter sends while Shift+Enter makes a new line', async ({ page }) => {
  await page.goto('/');
  const box = page.getByLabel('Message');
  await expect(box).toBeVisible();
  const oneLine = (await box.boundingBox())!.height;

  await box.fill(LONG);
  await expect.poll(async () => (await box.boundingBox())!.height).toBeGreaterThan(oneLine);
  expect(await box.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/message-box-long.png' });

  await box.fill('first line');
  await box.press('Shift+Enter');
  await box.pressSequentially('second line');
  await expect(box).toHaveValue('first line\nsecond line');
  await box.fill('');
  await expect.poll(async () => (await box.boundingBox())!.height).toBe(oneLine);

  const sent: string[] = [];
  await page.route(/\/v1\/chat\/messages(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    sent.push((route.request().postDataJSON() as { content: string }).content);
    return route.fulfill({ status: 500, json: { message: 'stopped by the test' } });
  });
  await box.fill('send this');
  await box.press('Enter');
  await expect.poll(() => sent).toEqual(['send this']);
});

test('a message can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const text = 'copy me to the clipboard';
  const message = { id: '44444444-4444-4444-8444-444444444444', role: 'user', content: text, created_at: new Date().toISOString() };
  let sent = false;
  await page.route(/\/v1\/chat\/messages(\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      sent = true;
      return route.fulfill({ json: { conversation_id: '22222222-2222-4222-8222-222222222222', reply: message } });
    }
    return sent ? route.fulfill({ json: { messages: [message] } }) : route.continue();
  });
  await page.goto('/');
  await page.getByLabel('Message').fill(text);
  await page.getByLabel('Message').press('Enter');
  const bubble = page.getByText(text, { exact: true });
  await expect(bubble).toBeVisible();
  // The bubble shown while sending is replaced by the saved message, which has the copy button.
  await expect(page.getByRole('button', { name: 'Copy this text' })).toHaveCount(1);
  await bubble.selectText();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/message-selected.png' });
  await bubble.hover();
  await page.getByRole('button', { name: 'Copy this text' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
});

test('a long address with no spaces stays inside its bubble', async ({ page }) => {
  const text = 'send 0.5 usdc to this address GAZ6GHSFCKVVCOECNRJ7XKKP3KPSJ24ZGHJNLF3MPMOYOG2RXFU2Z6Q5ABCDEFGHIJKLMNOP';
  const message = { id: '55555555-5555-4555-8555-555555555555', role: 'user', content: text, created_at: new Date().toISOString() };
  let sent = false;
  await page.route(/\/v1\/chat\/messages(\?.*)?$/, async (route) => {
    if (route.request().method() === 'POST') {
      sent = true;
      return route.fulfill({ json: { conversation_id: '22222222-2222-4222-8222-222222222222', reply: message } });
    }
    return sent ? route.fulfill({ json: { messages: [message] } }) : route.continue();
  });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await page.getByLabel('Message').fill(text);
  await page.getByLabel('Message').press('Enter');
  const bubble = page.getByText(text, { exact: true });
  await expect(bubble).toBeVisible();
  expect(await bubble.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/message-long-address.png' });
});
