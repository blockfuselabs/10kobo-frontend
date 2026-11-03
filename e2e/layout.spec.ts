import { expect, test, type Page } from '@playwright/test';

async function boxFullyVisible(page: Page) {
  const box = await page.getByLabel('Message').boundingBox();
  const send = await page.getByRole('button', { name: /send/i }).boundingBox();
  const height = page.viewportSize()!.height;
  expect(box, 'message box exists').not.toBeNull();
  expect(box!.y + box!.height, 'box bottom inside the window').toBeLessThanOrEqual(height);
  expect(send!.y + send!.height, 'send bottom inside the window').toBeLessThanOrEqual(height);
  const scrolled = await page.evaluate(() => ({
    pageCanScroll: document.documentElement.scrollHeight > window.innerHeight,
    top: window.scrollY,
    body: document.body.scrollHeight,
    inner: window.innerHeight,
  }));
  return scrolled;
}

for (const size of [
  { width: 1366, height: 768 },
  { width: 1191, height: 575 },
  { width: 390, height: 760 },
]) {
  test(`message box stays on screen at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByLabel('Message')).toBeVisible();
    console.log('empty chat', await boxFullyVisible(page));
    for (let i = 0; i < 5; i += 1) {
      // Unique per run, because this database keeps messages between runs.
      const text = `hello ${size.width} ${i} ${Date.now()}`;
      await page.getByLabel('Message').fill(text);
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page.getByText(text, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sending…' })).toBeHidden({ timeout: 60_000 });
    }
    const after = await boxFullyVisible(page);
    console.log('long chat', after);
    await page.screenshot({ path: `/tmp/10kobo-e2e-results/layout-${size.width}.png` });
    expect(after.pageCanScroll, 'the page itself should not scroll').toBe(false);
  });
}

test('a message shows once while it is sending, even when the reply is slow', async ({ page }) => {
  await page.route('**/v1/chat/messages*', async (route) => {
    if (route.request().method() === 'POST') {
      // The server saves the message at once, then takes its time, the way a slow model does.
      const response = await route.fetch();
      await new Promise((done) => setTimeout(done, 14_000));
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.goto('/');
  const text = `only once ${Date.now()}`;
  await page.getByLabel('Message').fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  for (let second = 0; second < 13; second += 1) {
    await page.waitForTimeout(1000);
    expect(await page.getByText(text, { exact: true }).count()).toBe(1);
  }
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeHidden({ timeout: 30_000 });
  expect(await page.getByText(text, { exact: true }).count()).toBe(1);
});
