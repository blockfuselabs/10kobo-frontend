import { expect, test } from '@playwright/test';

test('our own login page: email, code, then into the app', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign out' }).click();

  await page.getByRole('button', { name: 'Get started' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome to 10kobo' })).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/login-email.png' });
  const go = page.getByRole('button', { name: 'Continue' });
  await expect(go).toBeDisabled();

  await page.getByLabel('Email').fill('me@fail.test');
  await go.click();
  await expect(page.locator('form').getByRole('alert')).toContainText('could not send');

  await page.getByLabel('Email').fill('me@example.com');
  await go.click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText('me@example.com')).toBeVisible();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/login-code.png' });

  await page.getByLabel('Code').fill('000000');
  await expect(page.locator('form').getByRole('alert')).toContainText('did not work');
  await page.getByLabel('Code').fill('123456');
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(page.getByLabel('Message')).toBeVisible();
});

test('the Sign in button goes to the same page, and it links home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: '← Back to home' }).click();
  await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible();
});

test('someone already signed in skips the login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});
