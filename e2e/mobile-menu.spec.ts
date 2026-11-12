import { test, expect } from '@playwright/test';

test.describe('Mobile menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('the toggle names the action it will perform', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#mobile-menu-btn');

    await expect(toggle).toHaveAccessibleName('Buka menu');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await expect(toggle).toHaveAccessibleName('Tutup menu');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(toggle).toHaveAccessibleName('Buka menu');
  });

  test('Escape closes the menu and returns focus to the toggle', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#mobile-menu-btn');

    await toggle.click();
    await page.locator('#mobile-menu a').first().focus();
    await page.keyboard.press('Escape');

    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('Escape still closes the menu after a client-side navigation', async ({ page }) => {
    await page.goto('/about');
    await page.evaluate(() => { (window as any).__sameDocument = true; });
    await page.locator('#mobile-menu-btn').click();
    await page.locator('#mobile-menu a[href="/tags"]').click();
    await expect(page).toHaveURL(/\/tags\/?$/);
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);

    const toggle = page.locator('#mobile-menu-btn');
    await toggle.click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(toggle).toHaveAccessibleName('Buka menu');
  });
});
