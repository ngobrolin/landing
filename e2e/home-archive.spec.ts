import { test, expect } from '@playwright/test';

/**
 * The homepage is the front door to a 178-episode archive, and it used to
 * expose 8 of them (4.5%), zero topic pages, and no search. The eight "topic"
 * names it did show were inert <span> elements, five of which named topics
 * that have no tag page at all.
 *
 * These tests pin the paths INTO the archive, not the copy.
 */
test.describe('Homepage opens onto the archive', () => {
  test('states the scale of the archive', async ({ page }) => {
    await page.goto('/');
    // 178 episodes, every one with a full transcript, is the strongest true
    // sentence this product can say and it appeared nowhere on the site.
    await expect(page.getByTestId('archive-scale')).toBeVisible();
    await expect(page.getByTestId('archive-scale')).toContainText(/\d+ episode/);
    await expect(page.getByTestId('archive-scale')).toContainText(/transkrip/i);
  });

  test('offers search from the front door', async ({ page }) => {
    await page.goto('/');
    const input = page.getByTestId('home-search').locator('input[name="q"]');
    await expect(input).toBeVisible();

    await input.fill('astro');
    await input.press('Enter');

    await expect(page).toHaveURL(/\/episodes\/?\?q=astro/);
    const cards = page.locator('#episodes-grid > a:visible');
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
    await expect.poll(() => cards.count()).toBeLessThan(50);
  });

  test('links into topic pages', async ({ page }) => {
    await page.goto('/');
    const topics = page.getByTestId('home-topics').locator('a[href^="/tags/"]');
    expect(await topics.count()).toBeGreaterThanOrEqual(8);

    // Every homepage topic must resolve. The old inert chips named HTMX, JWT,
    // Elixir, DevOps and Node.js, none of which have a tag page - turning them
    // into links naively would have shipped five 404s from the front door.
    for (const href of await topics.evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!)
    )) {
      expect(href).toMatch(/^\/tags\/[a-z0-9-]+$/);
    }
  });

  test('every homepage topic link resolves', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page
      .getByTestId('home-topics')
      .locator('a[href^="/tags/"]')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!));

    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `${href} did not resolve`).toBe(200);
    }
  });

  test('links into every year of the archive', async ({ page, request }) => {
    await page.goto('/');
    const years = page.getByTestId('home-years').locator('a[href^="/episodes/"]');
    expect(await years.count()).toBeGreaterThanOrEqual(4);

    for (const href of await years.evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!)
    )) {
      expect(href).toMatch(/^\/episodes\/\d{4}$/);
      const res = await request.get(href);
      expect(res.status(), `${href} did not resolve`).toBe(200);
    }
  });

  test('still shows recent episodes and a way to see them all', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('episode-card');
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(page.locator('a[href="/episodes"]').first()).toBeVisible();
  });

  test('offers subscribing without going to another page first', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/subscribe"]').first()).toBeVisible();
  });

  test('the archive paths survive a client-side navigation back home', async ({ page }) => {
    await page.goto('/about');
    await page.locator('nav a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);

    await expect(page.getByTestId('home-topics').locator('a[href^="/tags/"]').first()).toBeVisible();
    await expect(page.getByTestId('home-search').locator('input[name="q"]')).toBeVisible();
  });
});
