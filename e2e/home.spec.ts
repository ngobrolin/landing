import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ngobrolin WEB/);
  });

  test('recent episodes are displayed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Episode Terbaru' })).toBeVisible();
    const episodeCards = page.locator('[data-testid="episode-card"]');
    await expect(episodeCards.first()).toBeVisible();
  });

  test('navigation elements exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Lihat Semua Episode' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subscribe YouTube' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lihat semua/ })).toBeVisible();
  });

  test('hero section displays correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ngobrolin WEB', exact: true })).toBeVisible();
    await expect(page.getByText('Video podcast seputar web development dalam Bahasa Indonesia.')).toBeVisible();
  });
});
