import { expect, test } from '@playwright/test';

const TOKEN = process.env.E2E_ADMIN_TOKEN ?? 'admin-token-for-browser-tests-01';

test('the admin page needs the token, then pauses and resumes', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Admin token').fill('wrong-token-wrong-token-wrong-token');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByText('Not allowed')).toBeVisible();

  await page.getByLabel('Admin token').fill(TOKEN);
  await page.getByRole('button', { name: 'Open' }).click();
  const row = page.getByRole('region', { name: 'Pause switches' }).getByRole('listitem').filter({ hasText: 'airtime' });
  await expect(row).toContainText('running');
  await row.getByRole('button', { name: 'Pause' }).click();
  await expect(row).toContainText('PAUSED');
  await row.getByRole('button', { name: 'Resume' }).click();
  await expect(row).toContainText('running');
});
