import { test, expect } from '@playwright/test';

/**
 * Structural accessibility and language consistency.
 *
 * All checked mechanically across the built site before this: no skip link on
 * any of 227 pages; every card-grid page jumped h1 -> h3 because EpisodeCard
 * hardcodes h3; aria-current appeared only on the year tabs, never on the main
 * nav; and a lang="id" site rendered "Home / Episodes" breadcrumbs.
 */

const PAGES = ['/', '/episodes', '/episodes/2024', '/tags', '/tags/astro', '/about'];

test.describe('Skip link', () => {
  for (const path of PAGES) {
    test(`${path} offers a skip link that reaches main`, async ({ page }) => {
      await page.goto(path);

      const skip = page.locator('a[href="#main-content"]').first();
      await expect(skip).toBeAttached();

      // Visible only once focused - it must not be permanently hidden.
      await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();

      await expect(page.locator('#main-content')).toBeAttached();

      // Activating it must MOVE focus, not merely scroll. Asserting only that
      // the target is attached passes even when <main> is unfocusable, which
      // is how a skip link that never moved the reading cursor shipped.
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
    });
  }
});

test.describe('Heading order', () => {
  for (const path of PAGES) {
    test(`${path} has one h1 and no skipped heading level`, async ({ page }) => {
      await page.goto(path);

      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));

      expect(levels.filter((l) => l === 1).length, 'exactly one h1').toBe(1);

      let previous = 0;
      for (const level of levels) {
        if (previous !== 0) {
          expect(
            level - previous,
            `${path} jumps h${previous} -> h${level}`
          ).toBeLessThanOrEqual(1);
        }
        previous = level;
      }
    });
  }
});

test.describe('Current page is marked in the main navigation', () => {
  /**
   * Derived from the header itself, not from a list of pages I remembered to
   * wire up. The hand-written list is how /subscribe shipped as the one
   * destination with no aria-current anywhere in its nav: the link existed, the
   * spec never named it, and the suite stayed green.
   *
   * Expected value follows the same rule Layout.astro encodes - "page" on the
   * link's own target, "true" on an ancestor of the current path, absent
   * otherwise - so any header link added later that is never passed through
   * currentMarker() fails here.
   */
  const PATHS = [
    '/',
    '/episodes',
    '/tags',
    '/partners',
    '/about',
    '/subscribe',
    '/episodes/2024',
    '/tags/astro',
  ];

  const expectedMarker = (href: string, path: string): string | null => {
    if (href === path) return 'page';
    if (href !== '/' && path.startsWith(`${href}/`)) return 'true';
    return null;
  };

  for (const path of PATHS) {
    test(`${path} marks every header destination correctly`, async ({ page }) => {
      await page.goto(path);

      const links = await page
        .locator('header a[href^="/"]')
        .evaluateAll((els) =>
          els.map((e) => ({
            href: (e as HTMLAnchorElement).getAttribute('href')!,
            marker: e.getAttribute('aria-current'),
          }))
        );

      expect(links.length, 'no internal header links found').toBeGreaterThan(0);

      for (const { href, marker } of links) {
        expect(marker, `${path}: ${href} is marked ${marker}`).toBe(
          expectedMarker(href, path)
        );
      }
    });
  }

  test('the current destination is reachable by its accessible name', async ({
    page,
  }) => {
    for (const [path, label] of [
      ['/episodes', 'Episode'],
      ['/tags', 'Topik'],
      ['/about', 'Tentang'],
      ['/subscribe', 'Langganan'],
    ] as const) {
      await page.goto(path);
      const link = page
        .locator('header')
        .getByRole('link', { name: label, exact: true })
        .first();
      await expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  // A descendant is not the current page. /episodes/2024 and /tags/<tag> are
  // reached from the nav link but are not the link's own target, so announcing
  // "current page" on a link that navigates away is a lie. These pages were
  // untested, which is why aria-current="page" leaked onto them.
  for (const [path, label] of [
    ['/episodes/2024', 'Episode'],
    ['/tags/astro', 'Topik'],
  ] as const) {
    test(`${path} marks "${label}" as an ancestor, not as the page`, async ({
      page,
    }) => {
      await page.goto(path);
      const link = page
        .locator('header')
        .getByRole('link', { name: label, exact: true })
        .first();
      await expect(link).toHaveAttribute('aria-current', 'true');
    });
  }

  test('an episode page marks the section without claiming to be it', async ({
    page,
  }) => {
    await page.goto('/episodes');
    const href = await page.locator('#episodes-grid > a').first().getAttribute('href');
    await page.goto(href!);

    const link = page
      .locator('header')
      .getByRole('link', { name: 'Episode', exact: true })
      .first();
    await expect(link).toHaveAttribute('aria-current', 'true');
  });

  test('a nav item that is not the current page carries no aria-current', async ({ page }) => {
    await page.goto('/about');
    const link = page
      .locator('header')
      .getByRole('link', { name: 'Episode', exact: true })
      .first();
    await expect(link).not.toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Interface language', () => {
  test('the episode breadcrumb is in Indonesian', async ({ page }) => {
    await page.goto('/episodes');
    const href = await page.locator('#episodes-grid > a').first().getAttribute('href');
    await page.goto(href!);

    const crumbs = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(crumbs).toBeVisible();
    const text = (await crumbs.textContent()) ?? '';
    expect(text).not.toMatch(/\bHome\b|\bEpisodes\b/);
    expect(text).toMatch(/Beranda/);
  });

  test('tag tiles do not use an English plural', async ({ page }) => {
    await page.goto('/tags');
    const text = (await page.locator('main').textContent()) ?? '';
    expect(text).not.toMatch(/\d+ episodes\b/);
  });
});
