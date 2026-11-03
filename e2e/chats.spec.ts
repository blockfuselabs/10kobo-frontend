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

test('renames and deletes a chat from its menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const name = `to delete ${Date.now()}`;
  await page.goto('/');
  await page.getByRole('button', { name: 'New chat' }).click();
  await say(page, name);
  const list = page.getByRole('list', { name: 'Your chats' });
  const row = list.getByRole('listitem').filter({ hasText: name });

  await row.getByRole('button', { name: 'Chat options' }).click();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/chat-menu.png' });
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  const renamed = `${name} renamed`;
  await page.getByLabel('Chat name').fill(renamed);
  await page.getByLabel('Chat name').press('Enter');
  const again = list.getByRole('listitem').filter({ hasText: renamed });
  await expect(again).toBeVisible();

  await again.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByText('Delete this chat?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(again).toBeVisible();

  await again.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(again).toHaveCount(0);
  await expect(page.locator('main p').filter({ hasText: name })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Message')).toBeVisible();
  await expect(list.getByRole('listitem').filter({ hasText: renamed })).toHaveCount(0);
});

test('dark mode can be switched on, and stays after a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByLabel('Message')).toBeVisible();
  const box = await page.getByLabel('Message').evaluate((node) => ({ outline: getComputedStyle(node).outlineStyle }));
  expect(box.outline).toBe('none');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/dark-app.png' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('the message box shows no outline of its own when focused', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Message').focus();
  await page.keyboard.type('x');
  expect(await page.getByLabel('Message').evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none');
});
