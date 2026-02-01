import { test, expect } from '@playwright/test';

test.describe('Comments Section', () => {
  test('comments section is displayed on episode page', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    await expect(page.getByRole('heading', { name: 'Komentar' })).toBeVisible();
  });

  test('utterances widget is loaded', async ({ page }) => {
    // Navigate directly to an episode page to avoid SPA transition timing issues
    await page.goto('/episodes/ZcYNuHirHOA-agentic-ai-ngobrolin-web');

    // Wait for the comments section to be visible
    await expect(page.getByRole('heading', { name: 'Komentar' })).toBeVisible();

    // Wait a bit for the inline script to execute and add the utterances script
    // This is needed because is:inline data-astro-rerun scripts run after the page swap
    await page.waitForTimeout(100);

    // Check that utterances iframe is injected
    const utterancesFrame = page.locator('#comments-wrapper iframe');
    await expect(utterancesFrame).toBeVisible();
    await expect(utterancesFrame).toHaveAttribute('src', /utteranc\.es/);
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
