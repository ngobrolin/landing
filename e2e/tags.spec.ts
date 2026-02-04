import { test, expect } from '@playwright/test';

test.describe('Tags Page', () => {
  test('topik menu link navigates to tags page', async ({ page }) => {
    // Start from homepage
    await page.goto('/');

    // Click on the "Topik" menu link which goes to /tags
    await page.getByRole('link', { name: 'Topik' }).click();

    // Should not be a 404 page
    await expect(page.getByRole('heading', { name: /404/ })).not.toBeVisible();

    // Should be on the tags page
    await expect(page).toHaveURL(/\/tags/);
  });

  test('tags page loads successfully', async ({ page }) => {
    await page.goto('/tags');

    // Should not be a 404 page
    await expect(page.getByRole('heading', { name: /404/ })).not.toBeVisible();

    // Page should have a title
    await expect(page).toHaveTitle(/Topik/);
  });

  test('tags page displays tags', async ({ page }) => {
    await page.goto('/tags');

    // Should not be a 404 page
    await expect(page.getByRole('heading', { name: /404/ })).not.toBeVisible();

    // Should have a main heading about topics/tags
    await expect(page.getByRole('heading', { name: /topik/i })).toBeVisible();
  });
});
