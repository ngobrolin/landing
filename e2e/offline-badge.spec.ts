import { test, expect } from '@playwright/test';

/**
 * The offline badge's script used to be emitted once per card, because it lived
 * inside the repeated component. /episodes renders 178 cards, so the page
 * carried 178 byte-identical copies - about 127KB, a tenth of the page.
 *
 * Worse, every copy called document.querySelectorAll('.offline-badge') and
 * looped over ALL badges, so the work was N squared: a single load of
 * /episodes issued ~15,900 Cache API calls within 3 seconds, heading for
 * 178 x 178 = 31,684.
 */
test.describe('Offline badge runtime', () => {
  test('ships exactly one copy of the script on a 178-card page', async ({ request }) => {
    const html = await (await request.get('/episodes')).text();

    const badges = html.match(/class="offline-badge"/g)?.length ?? 0;
    expect(badges, 'expected a badge per card').toBeGreaterThan(100);

    const runtimes = html.match(/checkOfflineStatus/g)?.length ?? 0;
    expect(runtimes, `script copied ${runtimes} times`).toBe(1);
  });

  test('opens the cache once, not once per badge', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cacheOpens: number }).__cacheOpens = 0;
      const original = caches.open.bind(caches);
      caches.open = (name: string) => {
        (window as unknown as { __cacheOpens: number }).__cacheOpens++;
        return original(name);
      };
    });

    await page.goto('/episodes');
    await page.waitForTimeout(2000);

    const opens = await page.evaluate(
      () => (window as unknown as { __cacheOpens: number }).__cacheOpens
    );
    // One page load should not scale cache work with the number of cards.
    expect(opens, `caches.open() called ${opens} times`).toBeLessThan(5);
  });

  test('badges still render on every card', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('episode-card');
    const badges = page.locator('.offline-badge');
    expect(await badges.count()).toBe(await cards.count());
  });

  test('the runtime survives a client-side navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    await page.locator('nav a[href="/episodes"]').first().click();
    await expect(page).toHaveURL(/\/episodes\/?$/);
    await page.waitForTimeout(500);

    await expect(page.locator('.offline-badge').first()).toBeAttached();
    expect(errors, `page errors: ${errors.join(', ')}`).toEqual([]);
  });
});
