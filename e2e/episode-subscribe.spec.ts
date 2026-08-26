import { test, expect } from '@playwright/test';

/**
 * Where each surface makes its ask.
 *
 * The front door wants the lowest-friction action, so the hero keeps the
 * one-click YouTube subscribe link with its confirm dialog. The end of an
 * episode is where podcast intent actually lives, and someone who just
 * finished listening is exactly who wants a choice of platform - so the
 * episode page points at /subscribe and names the platforms rather than
 * being a second YouTube button.
 */
test.describe('Subscribing from an episode page', () => {
  test('offers a choice of platform, not another YouTube button', async ({ page }) => {
    await page.goto('/episodes');
    const href = await page.locator('#episodes-grid > a').first().getAttribute('href');
    await page.goto(href!);

    const cta = page.getByTestId('episode-subscribe');
    await expect(cta).toBeVisible();

    const link = cta.getByRole('link', { name: /langganan/i });
    await expect(link).toHaveAttribute('href', '/subscribe');

    // It has to read as a choice.
    const text = (await cta.textContent()) ?? '';
    expect(text).toMatch(/YouTube/i);
    expect(text).toMatch(/Spotify/i);
    expect(text).toMatch(/podcast/i);
  });

  test('sits after the related episodes, where the episode ends', async ({ page }) => {
    await page.goto('/episodes');
    const href = await page.locator('#episodes-grid > a').first().getAttribute('href');
    await page.goto(href!);

    const order = await page.evaluate(() => {
      const related = document.querySelector('[data-testid="related-episodes"]');
      const subscribe = document.querySelector('[data-testid="episode-subscribe"]');
      if (!related || !subscribe) return null;
      // 4 === Node.DOCUMENT_POSITION_FOLLOWING
      return (related.compareDocumentPosition(subscribe) & 4) === 4;
    });
    expect(order, 'subscribe should follow related episodes').toBe(true);
  });

  test('the homepage keeps the one-click YouTube path', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: 'Subscribe YouTube' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      'https://www.youtube.com/@RizaFahmi?sub_confirmation=1'
    );
  });
});
