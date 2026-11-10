import { expect, type Page } from '@playwright/test';

// The app opens on the home page. These open the other screens the way a person would from there.

/** A quick action on the home page, found by its title and the line under it. */
export const quickAction = (page: Page, title: string, detail: string) =>
  page.getByRole('button').filter({ hasText: title }).filter({ hasText: detail });

export async function openSend(page: Page) {
  await quickAction(page, 'Send', 'Bank, wallet or phone').click();
}

export async function openDeposit(page: Page) {
  await quickAction(page, 'Deposit', 'Naira or crypto').click();
}

/** Opens a new chat with Ask 10kobo and waits for the message box. */
export async function openChat(page: Page) {
  await page.getByRole('button', { name: 'Ask 10kobo' }).click();
  await expect(page.getByLabel('Message')).toBeVisible();
}
