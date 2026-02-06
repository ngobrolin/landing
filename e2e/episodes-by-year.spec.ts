import { test, expect } from '@playwright/test';

test.describe('Episodes by Year', () => {
  test('main episodes page shows year tabs', async ({ page }) => {
    await page.goto('/episodes');

    // Should have "Semua" tab in the year navigation
    const yearTabs = page.locator('nav[aria-label="Navigasi tahun"] a');
    await expect(yearTabs.first()).toBeVisible();
    await expect(yearTabs.filter({ hasText: 'Semua' })).toBeVisible();

    // Should have at least one year tab
    await expect(yearTabs.nth(1)).toBeVisible();
  });

  test('main episodes page shows latest 25 episodes', async ({ page }) => {
    await page.goto('/episodes');

    const episodeCards = page.locator('[data-testid="episode-card"]');
    const count = await episodeCards.count();

    // Should show exactly 25 latest episodes (main page limit)
    expect(count).toBe(25);
  });

  test('clicking year tab navigates to year page', async ({ page }) => {
    await page.goto('/episodes');

    // Click the first year tab (not "Semua")
    const yearTabs = page.locator('nav[aria-label="Navigasi tahun"] a');
    const firstYearTab = yearTabs.nth(1);
    const yearText = await firstYearTab.textContent();

    await firstYearTab.click();

    // Should navigate to year page
    await expect(page).toHaveURL(/\/episodes\/\d{4}/);

    // Should show the year in the heading
    await expect(page.getByRole('heading', { name: `Episode ${yearText}` })).toBeVisible();
  });

  test('year page shows only episodes from that year', async ({ page }) => {
    // Go to 2025 page (assuming it has episodes)
    await page.goto('/episodes/2025');

    // All episodes should be from 2025
    const episodeCards = page.locator('[data-testid="episode-card"]');
    const count = await episodeCards.count();

    for (let i = 0; i < count; i++) {
      const card = episodeCards.nth(i);
      const dateText = await card.locator('p.text-gray-400').first().textContent();
      expect(dateText).toContain('2025');
    }
  });

  test('year page has correct active tab', async ({ page }) => {
    await page.goto('/episodes/2025');

    // 2025 tab in the year navigation should have aria-current="page"
    const tab2025 = page.locator('nav[aria-label="Navigasi tahun"]').getByRole('link', { name: '2025' });
    await expect(tab2025).toHaveAttribute('aria-current', 'page');
  });

  test('invalid year returns 404', async ({ page }) => {
    const response = await page.goto('/episodes/9999');
    expect(response?.status()).toBe(404);
  });

  test('non-numeric year returns 404', async ({ page }) => {
    const response = await page.goto('/episodes/abc');
    expect(response?.status()).toBe(404);
  });

  test('search on year page only searches that year', async ({ page }) => {
    await page.goto('/episodes/2025');

    // Enter search term
    const searchInput = page.getByLabel('Cari episode');
    await searchInput.fill('AI');

    // Wait for search results
    await page.waitForTimeout(300);

    // All results should be from 2025
    const resultsCount = await page.locator('#episodes-grid a').count();
    if (resultsCount > 0) {
      const cards = page.locator('[data-testid="episode-card"]');
      for (let i = 0; i < Math.min(resultsCount, 3); i++) {
        const dateText = await cards.nth(i).locator('p.text-gray-400').first().textContent();
        expect(dateText).toContain('2025');
      }
    }
  });
});
