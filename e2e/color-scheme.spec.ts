import { test, expect, type Page } from '@playwright/test';

const pageGround = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const storedScheme = (page: Page) =>
  page.evaluate(() => localStorage.getItem('color-scheme'));

test.describe('Color scheme', () => {
  test('follows the system preference when nothing is pinned', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const light = await pageGround(page);
    await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Ganti ke tema gelap');

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => pageGround(page)).not.toBe(light);
    await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Ganti ke tema terang');
    expect(await storedScheme(page)).toBeNull();
  });

  test('the toggle pins the opposite scheme across reloads and client-side navigation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const light = await pageGround(page);

    await page.getByTestId('theme-toggle').click();
    await expect.poll(() => pageGround(page)).not.toBe(light);
    const dark = await pageGround(page);
    expect(await storedScheme(page)).toBe('dark');

    await page.reload();
    expect(await pageGround(page)).toBe(dark);

    await page.evaluate(() => {
      (window as unknown as { __hardLoadMarker: boolean }).__hardLoadMarker = true;
    });
    await page.locator('header nav a[href="/about/"]').first().click();
    await expect(page).toHaveURL(/\/about\/$/);
    expect(
      await page.evaluate(() => (window as unknown as { __hardLoadMarker?: boolean }).__hardLoadMarker)
    ).toBe(true);
    expect(await pageGround(page)).toBe(dark);
    await expect(page.getByTestId('theme-toggle')).toHaveAccessibleName('Ganti ke tema terang');
  });

  test('toggling back to what the system shows unpins instead of pinning', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const toggle = page.getByTestId('theme-toggle');

    await toggle.click();
    expect(await storedScheme(page)).toBe('dark');
    await toggle.click();
    expect(await storedScheme(page)).toBeNull();

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(toggle).toHaveAccessibleName('Ganti ke tema terang');
  });

  test('a pinned scheme holds when the system preference changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.getByTestId('theme-toggle').click();
    const light = await pageGround(page);
    expect(await storedScheme(page)).toBe('light');

    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await pageGround(page)).toBe(light);
    expect(await storedScheme(page)).toBe('light');
  });
});
