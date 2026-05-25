import { test, expect } from '@playwright/test';

test.describe('Episode Page', () => {
  test('episode page loads when clicking an episode', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();
    await expect(page).toHaveURL(/\/episodes\/.+/);
    await expect(page).toHaveTitle(/- Ngobrolin WEB/);
  });

  test('episode details are shown', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('lite-youtube')).toBeVisible();
  });

  test('episode page has breadcrumb navigation', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();
    await expect(page).toHaveURL(/\/episodes\/.+/);

    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Episodes' })).toBeVisible();
  });

  test('episode page shows episode number badge', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    await expect(page.getByText(/^EP \d+$/)).toBeVisible();
  });
});
