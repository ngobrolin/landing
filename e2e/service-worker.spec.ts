import { test, expect } from '@playwright/test';

test.describe('Service Worker', () => {
  test.beforeEach(async ({ page }) => {
    // Visit homepage to register SW
    await page.goto('/');
    // Wait for SW registration
    await page.waitForFunction(() => {
      return navigator.serviceWorker.controller !== null;
    }, { timeout: 5000 });
  });

  test('registers service worker on first visit', async ({ page }) => {
    const swActive = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null;
    });
    expect(swActive).toBe(true);
  });

  test('caches visited episode pages', async ({ page }) => {
    // Visit an episode
    await page.goto('/episodes/');
    const firstEpisodeLink = page.locator('a[href^="/episodes/"]').first();
    await firstEpisodeLink.click();

    // Wait for page load
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();

    // Check cache contains the page
    const cachedPages = await page.evaluate(async () => {
      const cache = await caches.open('ngobrol-pages-v1');
      const keys = await cache.keys();
      return keys.map(req => req.url);
    });

    const hasCachedEpisode = cachedPages.some(url =>
      url.includes('/episodes/') && url.startsWith('http')
    );
    expect(hasCachedEpisode).toBe(true);
  });

  test('serves cached content when offline', async ({ page }) => {
    // First, visit and cache an episode
    await page.goto('/episodes/');
    const firstEpisodeLink = page.locator('a[href^="/episodes/"]').first();
    await firstEpisodeLink.click();
    await page.waitForLoadState('networkidle');

    // Get the episode URL
    const episodeUrl = page.url();
    const episodeTitle = await page.locator('h1').textContent();

    // Go offline
    await page.context().setOffline(true);

    // Navigate to same episode (should serve from cache)
    await page.goto(episodeUrl);

    // Should show content from cache
    await expect(page.locator('h1')).toBeVisible();
    const cachedTitle = await page.locator('h1').textContent();
    expect(cachedTitle).toBe(episodeTitle);

    // Transcript should be visible
    await expect(page.locator('[data-transcript]').or(page.locator('text=Transkrip'))).toBeVisible();

    // Restore online
    await page.context().setOffline(false);
  });

  test('shows offline page when accessing uncached content offline', async ({ page }) => {
    // Go to homepage first (to register SW)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);

    // Try to access an uncached episode
    await page.goto('/episodes/some-uncached-episode-12345');

    // Should show offline page
    await expect(page.locator('text=Kamu sedang offline')).toBeVisible();
    await expect(page.locator('#cached-list')).toBeVisible();

    // Restore online
    await page.context().setOffline(false);
  });

  test('offline page lists cached episodes', async ({ page }) => {
    // Visit and cache an episode
    await page.goto('/episodes/');
    const firstEpisodeLink = page.locator('a[href^="/episodes/"]').first();
    await firstEpisodeLink.click();
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);

    // Go directly to offline page (simulating offline navigation)
    await page.goto('/offline.html');

    // Should show offline page
    await expect(page.locator('text=Kamu sedang offline')).toBeVisible();
    await expect(page.locator('#cached-list')).toBeVisible();

    // Should have at least one cached episode
    const listItems = page.locator('#cached-list li');
    await expect(listItems).toHaveCount(1); // At least the episode we just visited

    // Restore online
    await page.context().setOffline(false);
  });

  test('caches static assets', async ({ page }) => {
    // Visit homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check static cache has assets
    const staticCacheSize = await page.evaluate(async () => {
      const cache = await caches.open('ngobrol-static-v1');
      const keys = await cache.keys();
      return keys.length;
    });

    // Should have cached at least offline.html and favicon.svg
    expect(staticCacheSize).toBeGreaterThanOrEqual(1);
  });

  test('works with view transitions', async ({ page }) => {
    // Start at episodes list
    await page.goto('/episodes/');
    await page.waitForLoadState('networkidle');

    // Click first episode (triggers view transition)
    const firstEpisodeLink = page.locator('a[href^="/episodes/"]').first();
    await firstEpisodeLink.click();

    // Wait for transition to complete
    await page.waitForLoadState('networkidle');

    // SW should still be active
    const swActive = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null;
    });
    expect(swActive).toBe(true);

    // Page should have loaded successfully
    await expect(page.locator('h1')).toBeVisible();
  });
});
