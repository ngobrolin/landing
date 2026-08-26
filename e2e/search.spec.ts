import { test, expect } from '@playwright/test';

/**
 * Search regression guard.
 *
 * Search shipped broken for an unknown period: `SearchEpisodes.astro` assigned
 * `window.Fuse` from a bundled module (deferred) but consumed it from an
 * `is:inline` script (runs during parsing), so `new window.Fuse(...)` threw on
 * every page that had search. The init guard was set *before* the throwing
 * line, which turned a transient ordering bug into a permanent one.
 *
 * These tests assert behaviour, not implementation: typing must actually
 * reduce the result set the visitor can see. A test that only checked the
 * input exists would have passed throughout the outage.
 *
 * `:visible` matters here. Search filters the server-rendered cards in place
 * rather than rebuilding the grid, so non-matches stay in the DOM and only
 * stop being displayed. Counting DOM nodes would always return 178.
 */
test.describe('Episode search', () => {
  test('typing filters the episode grid', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();
    expect(before).toBeGreaterThan(20);

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeLessThan(before);

    expect(errors, `unexpected page errors: ${errors.join(', ')}`).toEqual([]);
  });

  test('result count is announced', async ({ page }) => {
    await page.goto('/episodes');
    await page.fill('#search-input', 'astro');
    await expect(page.locator('#search-results-count')).toBeVisible();
    await expect(page.locator('#search-results-count')).toContainText(/episode ditemukan/);
  });

  test('clearing the query restores every episode in publication order', async ({
    page,
  }) => {
    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();
    const originalOrder = await cards.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-episode-slug'))
    );

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeLessThan(before);

    await page.click('#clear-search');
    await expect.poll(() => cards.count()).toBe(before);
    // Relevance ranking moves the real nodes, so the grid no longer holds
    // publication order by itself - it has to be restored from what was
    // captured at init.
    expect(
      await cards.evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-episode-slug'))
      )
    ).toEqual(originalOrder);
  });

  // Ranking used to be applied with CSS `order`, which reorders what a sighted
  // visitor sees but leaves keyboard and screen-reader users traversing the
  // surviving cards in publication order (WCAG 2.4.3 Focus Order, 1.3.2
  // Meaningful Sequence). Reading the DOM order here is the point: `order`
  // would pass a visual check and fail this one.
  test('ranks the best match first in the DOM, not just visually', async ({
    page,
  }) => {
    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
    await expect.poll(() => cards.count()).toBeLessThan(50);

    const first = cards.first();
    await expect(first).toHaveAttribute('data-episode-slug', /astro/);
    await expect(first).toHaveCSS('order', '0');
  });

  // Fuse cannot serve these at any setting: minMatchCharLength 3 returns
  // nothing, and dropping it returns the whole archive because Indonesian
  // prose is full of "ai" (mulai, berbagai, sebagai). Short queries take a
  // word-boundary path instead.
  test('a two-character query finds episodes without matching the archive', async ({
    page,
  }) => {
    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();

    await page.fill('#search-input', 'ai');
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
    await expect.poll(() => cards.count()).toBeLessThan(before / 2);
    await expect(page.locator('#no-results')).toBeHidden();
  });

  test('a query with no matches shows the empty state', async ({ page }) => {
    await page.goto('/episodes');
    await page.fill('#search-input', 'zzzqqqxxnomatch');
    await expect(page.locator('#no-results')).toBeVisible();
  });

  // The site advertises this URL to Google via a schema.org SearchAction in
  // Layout.astro, so it has to actually work.
  test('the ?q= deep link prefills and filters', async ({ page }) => {
    await page.goto('/episodes/?q=astro');
    await expect(page.locator('#search-input')).toHaveValue('astro');

    const cards = page.locator('#episodes-grid > a:visible');
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
    await expect.poll(() => cards.count()).toBeLessThan(50);
  });

  test('search works on a year page', async ({ page }) => {
    await page.goto('/episodes/2024');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();

    await page.fill('#search-input', 'a');
    await page.fill('#search-input', 'react');
    await expect.poll(() => cards.count()).toBeLessThan(before);
  });

  // AGENTS.md is emphatic about this: ClientRouter is site-wide, and scripts
  // that only bind on first load die after a client-side navigation.
  test('search still works after a client-side navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    await page.locator('nav a[href="/episodes"]').first().click();
    await expect(page).toHaveURL(/\/episodes\/?$/);

    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();
    expect(before).toBeGreaterThan(20);

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeLessThan(before);

    expect(errors, `unexpected page errors: ${errors.join(', ')}`).toEqual([]);
  });
});

test.describe('Search reaches summary key points', () => {
  // Fuse indexed title, description and brief only. Each summary also carries a
  // keyPoints list naming the concrete things an episode actually covered -
  // tools, libraries, product names - and none of it was searchable.
  //
  // "keychron" appears in exactly one episode's keyPoints and nowhere in its
  // title, description or brief, so a hit proves the new field is doing work.
  test('finds an episode by a term that only appears in its key points', async ({
    page,
  }) => {
    await page.goto('/episodes/?q=keychron');

    const cards = page.locator('#episodes-grid > a:visible');
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
    await expect.poll(() => cards.count()).toBeLessThan(10);

    await expect(cards.first()).toHaveAttribute(
      'data-episode-slug',
      /^00ZHWKLlp5g-/
    );
  });
});
