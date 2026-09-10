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

    // Breadcrumb is Indonesian now: this is a lang="id" site that shipped
    // "Home / Episodes".
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'Beranda' })).toBeVisible();
    await expect(crumbs.getByRole('link', { name: 'Episode' })).toBeVisible();
  });

  test('episode page shows episode number badge', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    // Target the badge itself rather than any text that looks like it - the
    // breadcrumb also ends in "EP <n>".
    const badge = page.getByTestId('episode-number-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/^EP \d+$/);
  });

  test('transcript search filters segments in real-time', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    const transcript = page.getByTestId('transcript');
    await expect(transcript).toBeVisible();

    const searchInput = transcript.locator('#transcript-search-input');
    await expect(searchInput).toBeVisible();

    // Type a query
    await searchInput.fill('web');
    const statusText = transcript.locator('#transcript-search-status');
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText(/Ditemukan \d+ segmen/);

    // Clear search
    const clearBtn = transcript.locator('#transcript-search-clear');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(statusText).toBeHidden();
  });

  test('transcript timestamps have seek buttons', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    const transcript = page.getByTestId('transcript');
    const seekBtn = transcript.locator('.timestamp-seek-btn').first();
    await expect(seekBtn).toBeVisible();
    await expect(seekBtn).toHaveAttribute('data-seek-time');

    // Clicking timestamp triggers seeking
    await seekBtn.click();
    const ytEmbed = page.locator('lite-youtube');
    await expect(ytEmbed).toHaveAttribute('params', /enablejsapi=1/);
  });
});
