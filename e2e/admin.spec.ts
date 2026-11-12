import { expect, test } from '@playwright/test';

const TOKEN = process.env.E2E_ADMIN_TOKEN ?? 'admin-token-for-browser-tests-01';

test('the back office needs the token, shows each section, then pauses and resumes', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Admin token').fill('wrong-token-wrong-token-wrong-token');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByText('That admin token is not right.')).toBeVisible();

  await page.getByLabel('Admin token').fill(TOKEN);
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Payments delivered')).toBeVisible();

  const go = (name: string) => page.getByRole('complementary').getByRole('button', { name, exact: true }).click();
  await go('Users');
  await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeVisible();
  await go('Payments');
  await expect(page.getByRole('columnheader', { name: 'Transaction' })).toBeVisible();
  await go('Merchants');
  await expect(page.getByRole('heading', { name: 'Merchant keys' })).toBeVisible();

  await go('Controls');
  page.on('dialog', (dialog) => void dialog.accept());
  const row = page.getByRole('listitem').filter({ hasText: 'airtime' });
  await expect(row).toContainText('Running');
  await row.getByRole('button', { name: 'Pause' }).click();
  await expect(row).toContainText('Paused');
  await row.getByRole('button', { name: 'Resume' }).click();
  await expect(row).toContainText('Running');
});
