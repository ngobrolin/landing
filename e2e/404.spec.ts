import { test, expect } from '@playwright/test';

test.describe('404 Page', () => {
  test('404 page loads successfully', async ({ page }) => {
    await page.goto('/404');
    await expect(page).toHaveTitle(/404/);
  });

  test('404 heading does not overflow on mobile', async ({ page }) => {
    // Set mobile viewport (iPhone SE size - common small mobile)
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/404');

    const h1 = page.getByRole('heading', { name: '404' });
    await expect(h1).toBeVisible();

    // Check that the 404 heading doesn't cause horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // The scroll width should not exceed viewport width (no horizontal scroll)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('404 page elements are visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/404');

    // Check all key elements are visible on mobile
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Balik ke Home' })).toBeVisible();
  });

  test('404 phrase text is displayed', async ({ page }) => {
    await page.goto('/404');

    // The phrase should be loaded (not "Loading...")
    const phraseElement = page.locator('#phrase-404');
    await expect(phraseElement).not.toHaveText('Loading...');
  });

  test('404 page works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/404');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Balik ke Home' })).toBeVisible();
  });
});
