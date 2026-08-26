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

/**
 * The index is fetched, not inlined.
 *
 * It used to be serialised into the HTML of /episodes and all five year pages -
 * ~500KB of render-blocking JSON shipped to every visitor whether or not they
 * ever typed. Moving it behind a fetch is only safe if the input degrades
 * honestly, because this branch exists precisely because search once failed in
 * silence.
 */
test.describe('Out-of-line search index', () => {
  // The service worker now answers /search-index.json itself (see public/sw.js),
  // and Playwright's page.route cannot intercept a request a service worker
  // makes. These tests are about how the *page* behaves when the index does not
  // arrive, so they take the service worker out of the picture; the offline
  // test at the bottom of this file covers the service worker's own path.
  test.use({ serviceWorkers: 'block' });

  test('/episodes no longer inlines the index', async ({ page, request }) => {
    const html = await (await request.get('/episodes')).text();

    // "keychron" appears only in one episode's keyPoints, so its absence from
    // the HTML proves the key-points payload is not riding along.
    expect(html.toLowerCase()).not.toContain('keychron');

    await page.goto('/episodes');
    await expect(page.locator('script#episodes-data')).toHaveCount(0);
  });

  test('the index is served as its own JSON file', async ({ request }) => {
    const response = await request.get('/search-index.json');
    expect(response.status()).toBe(200);

    const documents = await response.json();
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBeGreaterThan(150);
    expect(Object.keys(documents[0]).sort()).toEqual([
      'brief',
      'description',
      'keyPoints',
      'slug',
      'title',
    ]);
  });

  test('search filters once the fetched index lands', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeLessThan(before);
    await expect(page.locator('#search-results-count')).toContainText(
      /\d+ episode ditemukan$/
    );

    expect(errors, `unexpected page errors: ${errors.join(', ')}`).toEqual([]);
  });

  // A slow index must not swallow a query typed before it resolves. The
  // module-load race was the same bug in a different place; do not regress it.
  test('a query typed before a slow index resolves is still applied', async ({
    page,
  }) => {
    await page.route('**/search-index.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();

    await page.fill('#search-input', 'astro');

    // Something visible has to happen immediately - a dead-looking input is
    // exactly the failure mode this branch was opened to remove.
    await expect(page.locator('#search-results-count')).toContainText(
      /Menyiapkan pencarian/
    );

    await expect.poll(() => cards.count(), { timeout: 15000 }).toBeLessThan(before);
  });

  test('a failed index still filters by title and says so', async ({ page }) => {
    await page.route('**/search-index.json', (route) =>
      route.fulfill({ status: 404, body: 'not found' })
    );

    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();

    await page.fill('#search-input', 'react');

    await expect(page.locator('#search-results-count')).toBeVisible();
    await expect(page.locator('#search-results-count')).toContainText(
      /indeks pencarian gagal dimuat/
    );
    await expect.poll(() => cards.count()).toBeLessThan(before);
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
  });

  test('an unparseable index degrades the same way', async ({ page }) => {
    await page.route('**/search-index.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ this is not json',
      })
    );

    await page.goto('/episodes');
    await page.fill('#search-input', 'zzzqqqxxnomatch');

    // Even with nothing found, the visitor is told why - an empty state alone
    // would read as "no such episode" when it means "no index".
    await expect(page.locator('#search-results-count')).toContainText(
      /indeks pencarian gagal dimuat/
    );
  });

  // One file for the whole archive means the browser keeps it across a
  // client-side navigation instead of paying for it again per page.
  test('the index is fetched once across a client-side navigation', async ({
    page,
  }) => {
    const fetches: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/search-index.json')) fetches.push(request.url());
    });

    await page.goto('/episodes');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeLessThan(before);

    await page.locator('header a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.locator('nav a[href="/episodes"]').first().click();
    await expect(page).toHaveURL(/\/episodes\/?$/);

    await page.fill('#search-input', 'astro');
    await expect.poll(() => cards.count()).toBeLessThan(before);

    expect(fetches.length, `fetched ${fetches.length} times`).toBe(1);
  });

  // A year page renders its own subset of the grid, so it must search that
  // subset - not every document in the shared file.
  test('a year page searches only the episodes it rendered', async ({ page }) => {
    await page.goto('/episodes/2024');
    const cards = page.locator('#episodes-grid > a:visible');
    const before = await cards.count();
    expect(before).toBeGreaterThan(0);

    await page.fill('#search-input', 'react');
    await expect.poll(() => cards.count()).toBeLessThan(before);
    await expect.poll(() => cards.count()).toBeGreaterThan(0);
  });
});

// Search used to work offline for free: the index was inlined into the page
// HTML, which the service worker's pages cache already held. Serving it
// separately means the service worker has to hold it deliberately, or moving
// the index out of line silently downgrades every offline visitor to
// title-only matching.
test('the search index stays available offline once fetched', async ({
  page,
  context,
}) => {
  await page.goto('/episodes');
  await page.evaluate(() => navigator.serviceWorker.ready);

  // A second online visit, because the worker claims the page only after its
  // subresources have already been fetched - so the search module itself is
  // not in the cache until a load that the worker actually controls.
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);

  const cards = page.locator('#episodes-grid > a:visible');
  const before = await cards.count();

  await page.fill('#search-input', 'astro');
  await expect.poll(() => cards.count()).toBeLessThan(before);

  await context.setOffline(true);
  await page.reload();

  await page.fill('#search-input', 'keychron');
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  await expect.poll(() => cards.count()).toBeLessThan(10);

  // A cached index is the full index, so a key-points-only term still hits and
  // the count carries no failure note.
  await expect(page.locator('#search-results-count')).toContainText(
    /\d+ episode ditemukan$/
  );

  await context.setOffline(false);
});
