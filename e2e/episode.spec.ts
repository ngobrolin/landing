import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { resolveSlug } from '../src/lib/slug';
import { dropRepeatedCues, getDeck, offeredTerms, termCandidates } from '../src/lib/transcript-view';

const TRANSCRIPTS_DIR = join(process.cwd(), 'src/data/transcripts');
const EPISODES_FILE = join(process.cwd(), 'src/data/episodes.json');

/** Find the page path of an episode that has a transcript. */
function episodePathWithTranscript(): string {
  const episodes: { videoId: string; title: string; slug?: string }[] =
    JSON.parse(readFileSync(EPISODES_FILE, 'utf-8'));

  for (const file of readdirSync(TRANSCRIPTS_DIR)) {
    if (!file.endsWith('.json')) continue;

    const transcript = JSON.parse(
      readFileSync(join(TRANSCRIPTS_DIR, file), 'utf-8')
    );

    const episode = episodes.find((ep) => ep.videoId === transcript.videoId);
    if (episode) {
      return `/episodes/${resolveSlug(episode)}`;
    }
  }

  throw new Error('No episode found with a transcript');
}

/** The first episode whose transcript offers search terms, with the term the page should list first. */
function episodeWithTerms(): { path: string; term: string; count: number } {
  const episodes: { videoId: string; title: string; slug?: string }[] =
    JSON.parse(readFileSync(EPISODES_FILE, 'utf-8'));

  for (const episode of episodes) {
    const read = (dir: string) => {
      try {
        return JSON.parse(readFileSync(join(process.cwd(), 'src/data', dir, `${episode.videoId}.json`), 'utf-8'));
      } catch {
        return null;
      }
    };
    const transcript = read('transcripts');
    const summary = read('summaries');
    if (!transcript || !summary) continue;

    const terms = offeredTerms(
      dropRepeatedCues(transcript.segments),
      termCandidates({ keyPoints: summary.keyPoints, brief: summary.brief }),
    );
    if (terms.length >= 3) {
      return { path: `/episodes/${resolveSlug(episode)}`, term: terms[0].term, count: terms[0].count };
    }
  }

  throw new Error('No episode offers search terms');
}

/** The first episode whose summary yields a deck, with the sentence the page should show. */
function episodeWithDeck(): { path: string; deck: string } {
  const episodes: { videoId: string; title: string; slug?: string }[] =
    JSON.parse(readFileSync(EPISODES_FILE, 'utf-8'));

  for (const episode of episodes) {
    try {
      const summary = JSON.parse(
        readFileSync(join(process.cwd(), 'src/data/summaries', `${episode.videoId}.json`), 'utf-8'),
      );
      const deck = getDeck(summary.brief);
      if (deck) return { path: `/episodes/${resolveSlug(episode)}`, deck };
    } catch {
      continue;
    }
  }

  throw new Error('No episode has a summary with a deck');
}

test.describe('Episode Page', () => {
  test('episode page loads when clicking an episode', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();
    await expect(page).toHaveURL(/\/episodes\/.+/);
    // A summary's seoTitle ends " | Ngobrolin WEB"; the composed title ends " - Ngobrolin WEB".
    await expect(page).toHaveTitle(/Ngobrolin WEB/);
  });

  test('episode details are shown', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('lite-youtube')).toBeVisible();
  });

  test('episode page has breadcrumb navigation', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();
    await expect(page).toHaveURL(/\/episodes\/.+/);

    // Breadcrumb is Indonesian now: this is a lang="id" site that shipped
    // "Home / Episodes".
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'Beranda' })).toBeVisible();
    await expect(crumbs.getByRole('link', { name: 'Episode' })).toBeVisible();
  });

  test('episode page shows episode number badge', async ({ page }) => {
    await page.goto('/');
    const firstEpisode = page.locator('[data-testid="episode-card"]').first();
    await firstEpisode.click();

    // Target the badge itself rather than any text that looks like it - the
    // breadcrumb also ends in "EP <n>".
    const badge = page.getByTestId('episode-number-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/^EP \d+$/);
  });

  test('transcript search filters segments in real-time', async ({ page }) => {
    await page.goto(episodePathWithTranscript());

    const transcript = page.getByTestId('transcript');
    await expect(transcript).toBeVisible();

    const searchInput = transcript.locator('#transcript-search-input');
    await expect(searchInput).toBeVisible();

    // Type a query
    await searchInput.fill('web');
    const statusText = transcript.locator('#transcript-search-status');
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText(/Ditemukan \d+ segmen/);

    // Clear search
    const clearBtn = transcript.locator('#transcript-search-clear');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(statusText).toBeHidden();
  });

  test('the transcript opens on a search, not on its first minutes', async ({ page }) => {
    await page.goto(episodePathWithTranscript());

    const transcript = page.getByTestId('transcript');
    await expect(transcript.locator('#transcript-details')).not.toHaveAttribute('open', '');
    await expect(transcript.locator('[data-transcript-jump] .timestamp-seek-btn').first()).toBeVisible();
    await expect(transcript.locator('[data-transcript-result]')).toHaveCount(0);
  });

  test('a search result carries a timecode and its surrounding lines', async ({ page }) => {
    const { path, term } = episodeWithTerms();
    await page.goto(path);

    const transcript = page.getByTestId('transcript');
    await transcript.locator('#transcript-search-input').fill(term);

    const first = transcript.locator('[data-transcript-result]').first();
    await expect(first.locator('.timestamp-seek-btn')).toHaveAttribute('data-seek-time', /^\d/);
    await expect(first.locator('mark').first()).toHaveText(new RegExp(term, 'i'));
    await expect(transcript.locator('[data-transcript-jump]')).toBeHidden();
  });

  test('an offered term returns exactly the count shown beside it', async ({ page }) => {
    const { path, term, count } = episodeWithTerms();
    await page.goto(path);

    const transcript = page.getByTestId('transcript');
    const offered = transcript.getByTestId('transcript-terms').locator('[data-term]').first();
    await expect(offered).toHaveText(term);
    await expect(transcript.locator('[data-term-count]').first()).toHaveText(String(count));

    await offered.click();
    await expect(transcript.locator('#transcript-search-input')).toHaveValue(term);
    await expect(transcript.locator('#transcript-search-status')).toContainText(`Ditemukan ${count} segmen`);
    await expect(transcript.locator('[data-transcript-result]')).toHaveCount(Math.min(count, 30));
  });

  test('a search with no match says so and lists nothing', async ({ page }) => {
    await page.goto(episodePathWithTranscript());

    const transcript = page.getByTestId('transcript');
    await transcript.locator('#transcript-search-input').fill('zzqx');
    await expect(transcript.locator('#transcript-search-status')).toContainText('Tidak ditemukan');
    await expect(transcript.locator('[data-transcript-result]')).toHaveCount(0);
  });

  test('key points lead and the full brief waits behind a fold', async ({ page }) => {
    const { path, deck } = episodeWithDeck();
    await page.goto(path);

    await expect(page.getByTestId('episode-deck')).toHaveText(deck);
    await expect(page.getByTestId('episode-key-points').locator('li').first()).toBeVisible();

    const brief = page.getByTestId('episode-brief');
    await expect(brief.locator('p')).toBeHidden();
    await brief.locator('summary').click();
    await expect(brief.locator('p')).toBeVisible();
  });

  test('related episodes are plain links that resolve', async ({ page, request }) => {
    await page.goto(episodePathWithTranscript());

    const hrefs = await page
      .getByTestId('related-episodes')
      .getByTestId('related-episode')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.length).toBeLessThanOrEqual(6);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/episodes\/.+\/$/);
      expect((await request.get(href)).status(), `${href} did not resolve`).toBe(200);
    }
  });

  test('with the player on screen, a timestamp seeks the video', async ({ page }) => {
    // Tall enough that the player and the transcript share the viewport.
    await page.setViewportSize({ width: 1280, height: 2400 });
    await page.goto(episodePathWithTranscript());

    const transcript = page.getByTestId('transcript');
    const seekBtn = transcript.locator('.timestamp-seek-btn').first();
    await expect(seekBtn).toBeVisible();
    await expect(seekBtn).toHaveAttribute('data-seek-time');

    // The embed is told to start at that time; `enablejsapi=1` alone is there from load.
    const seconds = await seekBtn.getAttribute('data-seek-time');
    await seekBtn.click();
    const ytEmbed = page.locator('lite-youtube');
    await expect(ytEmbed).toHaveAttribute('params', new RegExp(`autoplay=1&start=${seconds}$`));
  });
});
