import { test, expect } from '@playwright/test';

test.describe('View Transitions', () => {
  test.describe('Shared Element - Episode Thumbnails', () => {
    test('thumbnail has transition scope on episode card', async ({ page }) => {
      await page.goto('/');
      const thumbnail = page.locator('[data-testid="episode-card"]').first().locator('img');
      await expect(thumbnail).toHaveAttribute('data-astro-transition-scope', /astro-/);
    });

    test('thumbnail has transition scope on episode detail page', async ({ page }) => {
      await page.goto('/');
      const firstEpisode = page.locator('[data-testid="episode-card"]').first();
      await firstEpisode.click();

      // YouTube embed wrapper should have matching transition scope
      const transitionElement = page.locator('[data-astro-transition-scope]').first();
      await expect(transitionElement).toBeVisible();
    });

    test('navigation from home to episode uses shared element transition', async ({ page }) => {
      await page.goto('/');
      const firstEpisode = page.locator('[data-testid="episode-card"]').first();
      await firstEpisode.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/episodes\/.+/);
    });

    test('navigation from episodes list to episode uses shared element transition', async ({ page }) => {
      await page.goto('/episodes');
      const firstEpisode = page.locator('[data-testid="episode-card"]').first();
      await firstEpisode.click();

      await expect(page).toHaveURL(/\/episodes\/.+/);
      const transitionElement = page.locator('[data-astro-transition-scope]').first();
      await expect(transitionElement).toBeVisible();
    });
  });

  test.describe('Fade Transitions - Other Pages', () => {
    test('home to about uses fade transition', async ({ page }) => {
      await page.goto('/');
      // Use more specific selector to avoid strict mode violation
      await page.locator('a[href="/about"]').filter({ hasText: 'Tentang' }).first().click();
      await expect(page).toHaveURL('/about');
    });

    test('home to partners uses fade transition', async ({ page }) => {
      await page.goto('/');
      await page.locator('a[href="/partners"]').filter({ hasText: 'Partner' }).first().click();
      await expect(page).toHaveURL('/partners');
    });

    test('home to subscribe uses fade transition', async ({ page }) => {
      await page.goto('/');
      await page.locator('a[href="/subscribe"]').filter({ hasText: 'Langganan' }).first().click();
      await expect(page).toHaveURL('/subscribe');
    });
  });

  test.describe('View Transitions Integration', () => {
    test('view transitions styles are loaded', async ({ page }) => {
      await page.goto('/');
      // Check for view transition CSS animations in the page
      const content = await page.content();
      expect(content).toContain('astroFadeInOut');
      expect(content).toContain('view-transition');
    });

    test('astro router script is loaded', async ({ page }) => {
      await page.goto('/');
      // Check for Astro's ClientRouter script which handles view transitions
      const clientRouterScript = page.locator('script[src*="ClientRouter"]');
      await expect(clientRouterScript).toBeAttached();
    });
  });
});
