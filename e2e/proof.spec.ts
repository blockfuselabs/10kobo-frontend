import { expect, test } from '@playwright/test';

for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`the proof page lists every real payment with links to check it, at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/proof');
    await expect(page.getByRole('heading', { name: 'Real payments, with proof.' })).toBeVisible();
    await expect(page.getByTestId('proof-row')).toHaveCount(24);
    // Every link goes to a public block explorer, and nothing names a person.
    const links = await page.locator('a[target="_blank"]').evaluateAll((items) => items.map((item) => (item as HTMLAnchorElement).href));
    expect(links.length).toBeGreaterThan(24);
    for (const url of links) expect(url).toMatch(/^https:\/\/(basescan\.org|nearblocks\.io|arbiscan\.io|stellar\.expert)\//);
    await expect(page.locator('body')).not.toContainText(/@|\b\d{10}\b/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/10kobo-e2e-results/proof-${size.width}.png`, fullPage: true });
  });
}

test('the landing page shows real payments and links to the rest', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign out' }).click();
  const proof = page.locator('section').filter({ has: page.getByRole('heading', { name: /Don’t take our word\./ }) });
  await expect(proof.getByRole('heading', { level: 3 })).toHaveCount(3);
  await expect(proof).toContainText('An AI agent paid a Nigerian bank');
  await expect(proof).toContainText('Base to Stellar in 40 seconds');
  await proof.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/10kobo-e2e-results/landing-proof.png' });
  await proof.getByRole('link', { name: /See the payment records/ }).click();
  await expect(page).toHaveURL(/\/proof$/);
});

for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`the landing page tells the whole story: both ways, people, businesses, agents and shops, at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Naira and\s*stablecoins,\s*both ways\./);
    for (const heading of [/Your money\. More possibilities\./, /A payment link\./, /Build the agent\./, /From intention/, /Don’t take our word\./, /16 networks\./]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
    await expect(page.locator('#networks')).toContainText('Stellar');
    await expect(page.locator('#developers')).toContainText('"pay_from": "near"');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/10kobo-e2e-results/landing-${size.width}.png`, fullPage: true });
  });
}
