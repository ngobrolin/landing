import { test, expect } from '@playwright/test';

test.describe('Comments Section', () => {
  test('comments section is displayed on episode page', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    await expect(page.getByRole('heading', { name: 'Komentar' })).toBeVisible();
  });

  test('utterances script is loaded', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    // Check that utterances script is present and properly configured
    const utterancesScript = page.locator('script[src="https://utteranc.es/client.js"]');
    await expect(utterancesScript).toBeAttached();
    await expect(utterancesScript).toHaveAttribute('repo', 'ngobrolin/landing');
  });

  test('comments section appears before navigation', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    // Comments section should be visible
    const commentsSection = page.getByRole('heading', { name: 'Komentar' });
    await expect(commentsSection).toBeVisible();

    // Navigation should appear after comments (use "Episode Sebelumnya" since first episode doesn't have "Episode Selanjutnya")
    const navText = page.getByText('Episode Sebelumnya');
    const commentsBox = await commentsSection.boundingBox();
    const navBox = await navText.boundingBox();
    expect(commentsBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(commentsBox!.y).toBeLessThan(navBox!.y);
  });
});
