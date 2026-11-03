import { expect, test } from '@playwright/test';

const say = async (page: import('@playwright/test').Page, text: string) => {
  await page.getByLabel('Message').fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sending…' })).toBeHidden({ timeout: 60_000 });
};

test('starts new chats, lists them, and goes back to an old one', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const first = `first chat ${Date.now()}`;
  const second = `second chat ${Date.now()}`;
  await page.goto('/');
  const list = page.getByRole('list', { name: 'Your chats' });

  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await say(page, first);
  await expect(list.getByRole('button', { name: first })).toBeVisible();

  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText(first, { exact: true }).locator('visible=true')).toHaveCount(1);
  await say(page, second);
  await expect(list.getByRole('button').first()).toHaveText(second);
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/chats.png' });

  await list.getByRole('button', { name: first }).click();
  await expect(page.locator('main p').filter({ hasText: second })).toHaveCount(0);
  await page.reload();
  await expect(list.getByRole('button').first()).toBeVisible();
});

test('the chat list opens on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/');
  await page.getByRole('button', { name: /▾/ }).click();
  await expect(page.getByRole('list', { name: 'Your chats' })).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/chats-phone.png' });
  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
});
