import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ngobrolin WEB/);
  });

  test('recent episodes are displayed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Episode Sebelumnya' })).toBeVisible();
    const episodeCards = page.locator('[data-testid="episode-card"]');
    await expect(episodeCards.first()).toBeVisible();
  });

  test('the latest episode is featured once, not repeated in the grid', async ({ page }) => {
    await page.goto('/');
    const latestHref = await page.getByTestId('home-latest-link').getAttribute('href');
    expect(latestHref).toMatch(/^\/episodes\/.+/);

    const cardHrefs = await page
      .getByTestId('episode-card')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? el.querySelector('a')?.getAttribute('href')));
    expect(cardHrefs.length).toBeGreaterThan(0);
    expect(cardHrefs).not.toContain(latestHref);
  });

  test('the latest episode link is named by its title alone', async ({ page }) => {
    await page.goto('/');
    const link = page.getByTestId('home-latest-link');
    const title = (await link.innerText()).trim();
    await expect(link).toHaveAccessibleName(title);
  });

  test('on a phone the latest episode and its action sit in the first viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('home-latest-link')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('home-latest-action')).toBeInViewport({ ratio: 1 });
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
