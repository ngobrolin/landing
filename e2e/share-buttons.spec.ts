import { test, expect } from '@playwright/test';

test.describe('Share Buttons', () => {
  test('share button works after client-side navigation', async ({ page }) => {
    await page.addInitScript(() => {
      window.__openedUrls = [];
      window.open = (url) => {
        window.__openedUrls.push(String(url));
        return null;
      };
    });

    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();
    await expect(page).toHaveURL(/\/episodes\/.+/);

    const shareContainer = page.locator('[data-share-buttons]');
    await expect(shareContainer).toBeVisible();

    const waButton = shareContainer.locator('[data-platform="wa"]').first();
    await waButton.click();

    await page.waitForFunction(() => window.__openedUrls?.length > 0);
    const openedUrls = await page.evaluate(() => window.__openedUrls);
    expect(openedUrls[0]).toContain('wa.me');
  });
});
