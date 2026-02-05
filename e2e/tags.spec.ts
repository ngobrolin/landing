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

  test('clicking a tag navigates to tag page with filtered episodes', async ({ page }) => {
    await page.goto('/tags');

    // Click on the first tag link
    const firstTag = page.locator('a[href^="/tags/"]').first();
    const tagText = await firstTag.locator('div').first().textContent();
    await firstTag.click();

    // Should navigate to the tag page
    await expect(page).toHaveURL(/\/tags\/[a-z-]+/);

    // Should show the tag name as heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(tagText?.trim() || '');

    // Should have episode cards
    await expect(page.getByTestId('episode-card').first()).toBeVisible();

    // Should have back link to all topics
    await expect(page.getByRole('link', { name: /Semua Topik/i })).toBeVisible();
  });
});
