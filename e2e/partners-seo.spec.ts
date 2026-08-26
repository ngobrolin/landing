import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  PARTNER_CARD_HEIGHT,
  PARTNER_CARD_WIDTH,
} from '../src/lib/partner-card-geometry';

const EPISODES_FILE = join(process.cwd(), 'src/data/episodes.json');
const DIST_DIR = join(process.cwd(), 'dist');
const CARD_PATH = '/partners-og.png';

/**
 * Playwright's loader cannot resolve src/lib's JSON imports (see
 * e2e/transcript-provenance.spec.ts), so read the data file the same way
 * e2e/partners-metrics.spec.ts does.
 */
function episodeData(): Array<{ publishedAt: string }> {
  return JSON.parse(readFileSync(EPISODES_FILE, 'utf-8'));
}

const episodeCount = () => episodeData().length;
const firstEpisodeYear = () =>
  Math.min(...episodeData().map(ep => new Date(ep.publishedAt).getUTCFullYear()));

test.describe('Partners page — what a sponsor searches for', () => {
  test('the title names the show and what it sells', async ({ page }) => {
    await page.goto('/partners');

    const title = await page.title();
    expect(title).toContain('Ngobrolin WEB');
    expect(title).toMatch(/sponsor/i);
    expect(title).toMatch(/iklan/i);

    // "Partnership" alone matched nothing an Indonesian sponsor types.
    expect(title.length).toBeLessThanOrEqual(70);
  });

  test('the meta description states the offer and the derived figures', async ({
    page,
  }) => {
    await page.goto('/partners');

    const description = await page
      .locator('head meta[name="description"]')
      .getAttribute('content');

    expect(description).toBeTruthy();
    expect(description!).toMatch(/sponsor/i);
    expect(description!).toMatch(/iklan/i);
    expect(description!).toContain(String(episodeCount()));
    expect(description!).toContain(String(firstEpisodeYear()));
    expect(description!.length).toBeLessThanOrEqual(160);
  });

  test('there is exactly one h1 and it reads as the sponsorship offer', async ({
    page,
  }) => {
    await page.goto('/partners');

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(/sponsor/i);
    await expect(h1).toContainText(/iklan/i);
    await expect(h1).toContainText('Ngobrolin WEB');
  });

  test('the opening copy covers the phrases a partnerships lead would use', async ({
    page,
  }) => {
    await page.goto('/partners');

    const lead = page.getByTestId('partners-lead');
    await expect(lead).toContainText(/kerja sama/i);
    await expect(lead).toContainText(/media partner/i);
    await expect(lead).toContainText(/podcast developer Indonesia/i);
  });

  test('the JSON-LD WebPage node describes this page, not the site default', async ({
    page,
  }) => {
    await page.goto('/partners');

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const nodes = blocks.flatMap(block => {
      const parsed = JSON.parse(block);
      return Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
    });

    const webPage = nodes.find(node => node['@type'] === 'WebPage');
    expect(webPage).toBeTruthy();
    // Preview and production serve the directory form; match the canonical the
    // page itself declares rather than guessing at the trailing slash.
    const canonical = await page
      .locator('head link[rel="canonical"]')
      .getAttribute('href');
    expect(canonical).toMatch(/^https:\/\/ngobrol\.in\/partners\/?$/);
    expect(webPage.url).toBe(canonical);
    expect(webPage.name).toBe(await page.title());
    expect(webPage.description).toBe(
      await page.locator('head meta[name="description"]').getAttribute('content')
    );
    expect(webPage.primaryImageOfPage.url).toBe(
      `https://ngobrol.in${CARD_PATH}`
    );
    expect(webPage.inLanguage).toBe('id-ID');
  });

  // The captain pasting this URL into WhatsApp or email is the likeliest path
  // to a real sponsor, so the preview has to work as a one-page media kit.
  test('the share card is referenced absolutely and is actually reachable', async ({
    page,
    request,
  }) => {
    await page.goto('/partners');

    for (const selector of [
      'head meta[property="og:image"]',
      'head meta[name="twitter:image"]',
    ]) {
      const value = await page.locator(selector).getAttribute('content');
      expect(value).toBe(`https://ngobrol.in${CARD_PATH}`);
    }

    await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image'
    );
    await expect(
      page.locator('head meta[property="og:image:width"]')
    ).toHaveAttribute('content', String(PARTNER_CARD_WIDTH));
    await expect(
      page.locator('head meta[property="og:image:height"]')
    ).toHaveAttribute('content', String(PARTNER_CARD_HEIGHT));
    await expect(
      page.locator('head meta[property="og:image:alt"]')
    ).not.toHaveAttribute('content', '');

    const response = await request.get(CARD_PATH);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
    expect((await response.body()).byteLength).toBeGreaterThan(1000);
  });

  test('the share card exists in the build output', () => {
    const built = join(DIST_DIR, CARD_PATH.replace(/^\//, ''));
    if (!existsSync(join(DIST_DIR, 'partners', 'index.html'))) {
      throw new Error(
        'No build output for /partners — run "pnpm run build" before this suite.'
      );
    }
    expect(existsSync(built), `${built} is missing from dist/`).toBe(true);
    expect(statSync(built).size).toBeGreaterThan(1000);
  });

  test('the page no longer falls back to the site-wide share image', async ({
    page,
  }) => {
    await page.goto('/partners');

    const og = await page
      .locator('head meta[property="og:image"]')
      .getAttribute('content');
    expect(og).not.toContain('og-image.png');
  });
});

test.describe('Partners page — making contact unmissable', () => {
  test('every call to action reaches the same contact address', async ({
    page,
  }) => {
    await page.goto('/partners');

    const ctas = page.getByTestId('partners-cta');
    await expect(ctas).not.toHaveCount(0);

    const count = await ctas.count();
    for (let i = 0; i < count; i++) {
      await expect(ctas.nth(i)).toHaveAttribute(
        'href',
        /^mailto:rizafahmi@gmail\.com\?subject=/
      );
    }
  });

  test('the address is readable as text, not only as a link target', async ({
    page,
  }) => {
    await page.goto('/partners');

    await expect(page.getByTestId('partners-contact-address')).toContainText(
      'rizafahmi@gmail.com'
    );
  });

  test('a convinced reader finds a CTA right after the packages', async ({
    page,
  }) => {
    await page.goto('/partners');

    await expect(page.getByTestId('partners-packages-cta')).toBeVisible();
  });
});

test.describe('Partners page — findable from the rest of the site', () => {
  for (const path of ['/about', '/subscribe']) {
    test(`${path} links to /partners`, async ({ page }) => {
      await page.goto(path);

      const link = page.locator('main a[href="/partners"]');
      await expect(link).not.toHaveCount(0);
      await expect(link.first()).toBeVisible();
      await expect(link.first()).toContainText(/sponsor|iklan|kerja sama/i);
    });
  }
});
