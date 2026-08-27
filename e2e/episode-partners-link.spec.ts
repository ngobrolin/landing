import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * The path from an episode to /partners.
 *
 * /partners is the page a sponsor is sent to, and for a long time every
 * episode page - the site's highest-value content - linked it zero times: the
 * only inbound links anywhere were the nav and the footer. That is both an
 * internal-link signal problem and a wasted moment - someone who just finished
 * an 85-minute episode about web development is exactly the person who might
 * think "I could advertise here", and that intent exists precisely once.
 *
 * These assert the RULE, not a snapshot:
 *   - every episode page carries the link (derived from episodes.json, so a new
 *     episode is covered the day it lands - never a hardcoded count or slug),
 *   - the subscribe CTA stays the dominant ask on the page.
 * Neither goes red because the archive grew.
 */

const EPISODES_FILE = join(process.cwd(), 'src/data/episodes.json');
const DIST_DIR = join(process.cwd(), 'dist');

/**
 * Playwright's loader cannot resolve src/lib's JSON imports (see
 * e2e/transcript-provenance.spec.ts), so read the data file directly, the same
 * way e2e/partners-seo.spec.ts does.
 */
function episodeSlugs(): string[] {
  const episodes: Array<{ slug?: string }> = JSON.parse(
    readFileSync(EPISODES_FILE, 'utf-8')
  );
  return episodes.map(ep => ep.slug).filter((s): s is string => Boolean(s));
}

test.describe('Every episode page reaches /partners', () => {
  test('the whole built archive carries the link, not just a sampled page', () => {
    const slugs = episodeSlugs();
    expect(slugs.length, 'no episodes to check').toBeGreaterThan(0);

    if (!existsSync(join(DIST_DIR, 'episodes'))) {
      throw new Error(
        'No build output for /episodes — run "pnpm run build" before this suite.'
      );
    }

    const missing: string[] = [];
    for (const slug of slugs) {
      const page = join(DIST_DIR, 'episodes', slug, 'index.html');
      if (!existsSync(page)) {
        missing.push(`${slug} (no page built)`);
        continue;
      }
      const html = readFileSync(page, 'utf-8');
      // Anchored on the test id rather than on href="/partners" alone: the
      // site-wide nav and footer already carry that href on every page, so a
      // bare href check would pass with the in-content link deleted.
      const link = html.match(
        /<a\b[^>]*data-testid="episode-partners-link"[^>]*>/
      );
      if (!link) {
        missing.push(`${slug} (no partners link)`);
        continue;
      }
      if (!/href="\/partners"/.test(link[0])) {
        missing.push(`${slug} (partners link points elsewhere)`);
      }
    }

    expect(
      missing,
      `episode pages with no in-content path to /partners:\n${missing.join('\n')}`
    ).toEqual([]);
  });

  test('the link is measurable, like the two asks either side of it', async ({
    page,
  }) => {
    await page.goto('/episodes');
    const href = await page
      .locator('#episodes-grid > a')
      .first()
      .getAttribute('href');
    await page.goto(href!);

    const link = page.getByTestId('episode-partners-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/partners');
    await expect(link).toHaveAttribute('data-analytics-event', 'cta_click');

    // If nobody clicks it, that has to be knowable - so the props have to carry
    // the same shape the subscribe CTA and the discussions link carry.
    const raw = await link.getAttribute('data-analytics-props');
    const props = JSON.parse(raw!);
    expect(props.location).toBe('episode_page');
    expect(props.videoId).toBeTruthy();
    expect(props.cta).toBe('partners');
  });

  test('it stays quieter than the subscribe CTA', async ({ page }) => {
    await page.goto('/episodes');
    const href = await page
      .locator('#episodes-grid > a')
      .first()
      .getAttribute('href');
    await page.goto(href!);

    const subscribe = page
      .getByTestId('episode-subscribe')
      .getByRole('link', { name: /langganan/i });
    const partners = page.getByTestId('episode-partners-link');

    // The captain ruled /subscribe should be prominent here. A sponsor link and
    // a subscribe link serve two different audiences on one page, and two loud
    // asks side by side make both weaker - so this one is a line of text, not a
    // second button. Compare the rendered result rather than the class list:
    // unlayered CSS beats @layer utilities regardless of specificity.
    const weight = (locator: typeof partners) =>
      locator.evaluate(el => {
        const style = getComputedStyle(el);
        return {
          fontSize: parseFloat(style.fontSize),
          background: style.backgroundColor,
          area: el.getBoundingClientRect().width * el.getBoundingClientRect().height,
        };
      });

    const loud = await weight(subscribe);
    const quiet = await weight(partners);

    expect(quiet.fontSize).toBeLessThan(loud.fontSize);
    expect(quiet.area).toBeLessThan(loud.area);
    // Transparent: no filled pill competing with the subscribe button.
    expect(quiet.background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);

    // And it is outside the subscribe card, so it cannot dilute it.
    const inside = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="episode-subscribe"]');
      const link = document.querySelector('[data-testid="episode-partners-link"]');
      return Boolean(card && link && card.contains(link));
    });
    expect(inside, 'partners link must not sit inside the subscribe card').toBe(
      false
    );
  });
});
