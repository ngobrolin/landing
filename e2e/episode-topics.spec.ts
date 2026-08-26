import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveSlug } from '../src/lib/slug';

/**
 * Episode pages must link the topics they belong to.
 *
 * Before this, 0 of 178 episode pages linked to any /tags/* URL, so all 36 tag
 * pages sat at exactly 1 inbound link (from /tags alone) and were one hop from
 * a dead end. The tag data was already loaded on the episode page by
 * related.ts and simply never rendered.
 *
 * Both fixtures are DERIVED, never hardcoded. They were two pinned slugs, and
 * regenerating tags.json from its summaries gave the "untagged" one four tags -
 * a test that fails because the data got better. Which episodes carry tags is
 * summary-driven and moves under this suite; that an episode with tags links
 * them and an episode without renders no empty shell does not.
 *
 * Read off disk rather than imported through src/lib/tags: Playwright's loader
 * rejects that module's bare JSON import.
 */

type EpisodeRecord = { videoId: string; title: string; slug?: string };

const episodes: EpisodeRecord[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/episodes.json'), 'utf-8')
);
const tags: Record<string, string[]> = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/tags.json'), 'utf-8')
);

const tagCount = (ep: EpisodeRecord) => (tags[ep.videoId] ?? []).length;

const tagged = episodes.find((ep) => tagCount(ep) > 1);
const untagged = episodes.find((ep) => tagCount(ep) === 0);

if (!tagged) {
  throw new Error('no episode carries more than one tag - tags.json is empty or stale');
}

const TAGGED = `/episodes/${resolveSlug(tagged)}`;
const UNTAGGED = untagged ? `/episodes/${resolveSlug(untagged)}` : null;

test.describe('Episode topics', () => {
  test('a tagged episode links each of its topics', async ({ page }) => {
    await page.goto(TAGGED);

    const topicLinks = page.locator('[data-testid="episode-topics"] a');
    await expect(topicLinks.first()).toBeVisible();
    expect(await topicLinks.count()).toBeGreaterThan(1);

    for (const link of await topicLinks.all()) {
      await expect(link).toHaveAttribute('href', /^\/tags\/[a-z0-9-]+$/);
    }
  });

  test('a topic link actually reaches its tag page', async ({ page }) => {
    await page.goto(TAGGED);

    const first = page.locator('[data-testid="episode-topics"] a').first();
    const label = (await first.textContent())?.trim();
    await first.click();

    await expect(page).toHaveURL(/\/tags\/[a-z0-9-]+\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(label!);
    await expect(page.getByTestId('episode-card').first()).toBeVisible();
  });

  test('an episode with no tags renders no empty topic shell', async ({ page }) => {
    test.skip(UNTAGGED === null, 'every episode currently carries at least one tag');
    await page.goto(UNTAGGED!);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-testid="episode-topics"]')).toHaveCount(0);
  });

  test('every topic link on an episode page resolves', async ({ page, request }) => {
    await page.goto(TAGGED);

    const hrefs = await page
      .locator('[data-testid="episode-topics"] a')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `${href} did not resolve`).toBe(200);
    }
  });
});
