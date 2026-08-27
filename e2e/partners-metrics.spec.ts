import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const EPISODES_FILE = join(process.cwd(), 'src/data/episodes.json');
const SUBSCRIBERS_FILE = join(process.cwd(), 'src/data/channel-subscribers.json');
const MEDIA_KIT_FILE = join(process.cwd(), 'src/data/media-kit.json');
const DIST_DIR = join(process.cwd(), 'dist');

/**
 * The stores the page reads, read the same way the unit tests read episodes.json
 * (Playwright's loader cannot resolve the src/lib modules' JSON imports; see
 * e2e/transcript-provenance.spec.ts). Reading the store rather than repeating a
 * literal is the point: a figure hardcoded here would be exactly the second copy
 * this page keeps getting wrong. What is asserted is the id-ID *rendering* of it.
 */
function storedSubscribers(): { count: number; fetchedAt: string } {
  return JSON.parse(readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
}

function mediaKit(): Record<string, number | string> {
  return JSON.parse(readFileSync(MEDIA_KIT_FILE, 'utf-8'));
}

const percent = (value: number) =>
  `${value.toLocaleString('id-ID', { minimumFractionDigits: 1 })}%`;

/**
 * getEpisodes() maps and sorts src/data/episodes.json without filtering, so its
 * length is the file's length. Read the JSON directly rather than importing
 * src/lib/episodes.ts: Playwright's loader cannot resolve that module's JSON
 * import (see e2e/transcript-provenance.spec.ts).
 */
function episodeCount(): number {
  return JSON.parse(readFileSync(EPISODES_FILE, 'utf-8')).length;
}

/**
 * getEpisodes() is sorted newest-first, but taking the minimum year does not
 * depend on that: it is the first year the show aired either way.
 */
function firstEpisodeYear(): number {
  const episodes = JSON.parse(readFileSync(EPISODES_FILE, 'utf-8'));
  return Math.min(
    ...episodes.map((ep: { publishedAt: string }) =>
      new Date(ep.publishedAt).getUTCFullYear()
    )
  );
}

function* htmlFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* htmlFiles(path);
    else if (path.endsWith('.html')) yield path;
  }
}

/**
 * The sweep reads the filesystem, not the server. Playwright reuses an existing
 * dev server locally, so nothing guarantees a build ever ran: fail with the
 * command to run instead of an opaque ENOENT, or a pass against a stale dist
 * that never contained this page.
 */
function builtHtmlFiles(): string[] {
  const partnersPage = join(DIST_DIR, 'partners', 'index.html');
  if (!existsSync(partnersPage)) {
    throw new Error(
      `No build output for /partners at ${partnersPage}. This test sweeps the built site — run "pnpm run build" first.`
    );
  }
  return [...htmlFiles(DIST_DIR)];
}

test.describe('Partners sponsor metrics', () => {
  // The actual defect behind the stale "164+": a hardcoded count drifts away
  // from reality on the one page a sponsor is most likely to check.
  test('episode count is derived, not hardcoded', async ({ page }) => {
    await page.goto('/partners');

    const expected = String(episodeCount());
    await expect(page.getByTestId('stat-episodes')).toHaveText(expected);

    // ...and the same number in the prose, not a second stale literal.
    await expect(page.getByTestId('prose-episode-count')).toHaveText(expected);

    // 164 was the stale value; assert no leftovers anywhere on the page.
    await expect(page.getByText('164')).toHaveCount(0);
  });

  test('the unverifiable per-episode views claim is gone from the build', () => {
    const offenders: string[] = [];
    for (const file of builtHtmlFiles()) {
      const html = readFileSync(file, 'utf-8');
      if (html.includes('1K+') || html.includes('Views/Episode')) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('renders the four sourced tiles', async ({ page }) => {
    await page.goto('/partners');

    await expect(page.getByTestId('stat-tile')).toHaveCount(4);

    await expect(page.getByTestId('stat-episodes-label')).toHaveText(
      `Episode, mingguan sejak ${firstEpisodeYear()}`
    );

    await expect(page.getByTestId('stat-subscribers')).toHaveText(
      storedSubscribers().count.toLocaleString('id-ID')
    );
    await expect(page.getByTestId('stat-subscribers-label')).toHaveText(
      'Subscriber kanal'
    );

    await expect(page.getByTestId('stat-age')).toHaveText(
      percent(mediaKit().age25to34Percent as number)
    );
    await expect(page.getByTestId('stat-age-label')).toHaveText(
      'Audiens berusia 25-34'
    );

    await expect(page.getByTestId('stat-returning')).toHaveText(
      percent(mediaKit().returningViewersPercent as number)
    );
    await expect(page.getByTestId('stat-returning-label')).toHaveText(
      'Penonton yang kembali'
    );
  });

  test('supporting figures and a dated attribution are visible', async ({
    page,
  }) => {
    await page.goto('/partners');

    const kit = mediaKit();
    await expect(page.getByTestId('stat-supporting')).toHaveText(
      `Kanal YouTube: ${percent(kit.fromIndonesiaPercent as number)} dari Indonesia · ` +
        `${(kit.watchHours28d as number).toLocaleString('id-ID')} jam ditonton per 28 hari · ` +
        `rata-rata ${kit.averageViewDuration} per tayangan · ` +
        `minat teratas: ${kit.topInterest}.`
    );

    // Undated, these become the next unverifiable claim within six months. The
    // month is formatted from the stored ISO `capturedAt`, so a refresh moves
    // it without anyone editing prose — and the monthly freshness check reads
    // that same date rather than this rendered sentence.
    await expect(page.getByTestId('stat-attribution')).toContainText(
      new Date(`${kit.capturedAt}T00:00:00Z`).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    );
  });

  // The derived figure has a different provenance from the hand-copied ones,
  // and a sponsor has no way to tell them apart unless the page says so.
  test('the derived subscriber figure carries its own date and says it is automatic', async ({
    page,
  }) => {
    await page.goto('/partners');

    const attribution = page.getByTestId('stat-attribution');
    await expect(attribution).toContainText(/diperbarui otomatis/i);
    await expect(attribution).toContainText(
      new Date(`${storedSubscribers().fetchedAt}T00:00:00Z`).toLocaleDateString(
        'id-ID',
        { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      )
    );
  });

  // The channel carries another show as well; presenting its subscriber and
  // audience figures as Ngobrolin WEB's own would repeat the credibility
  // failure this page is paying down.
  test('channel figures are attributed to the channel, not the show', async ({
    page,
  }) => {
    await page.goto('/partners');

    for (const id of ['stat-subscribers', 'stat-age', 'stat-returning']) {
      const tile = page.getByTestId(id).locator('..');
      await expect(tile.getByTestId('stat-scope')).toHaveText('Kanal YouTube');
    }

    const showTile = page.getByTestId('stat-episodes').locator('..');
    await expect(showTile.getByTestId('stat-scope')).toHaveText(
      'Ngobrolin WEB'
    );

    // The supporting figures are channel-wide too, and a sponsor skims figures
    // rather than the attribution prose that follows them.
    await expect(page.getByTestId('stat-supporting-scope')).toHaveText(
      'Kanal YouTube:'
    );
  });

  // "4+ Tahun" was true only from November 2026; a start year never goes stale.
  test('the consistency card states a derived start year, not a tenure count', async ({
    page,
  }) => {
    await page.goto('/partners');

    const heading = page.getByTestId('consistency-heading');
    await expect(heading).toHaveText(`Konsisten sejak ${firstEpisodeYear()}`);
    await expect(heading).not.toContainText('4+');

    await expect(page.getByTestId('prose-first-year')).toHaveText(
      String(firstEpisodeYear())
    );
  });

  test('excluded media-kit figures are absent', async ({ page }) => {
    await page.goto('/partners');

    const body = page.locator('body');
    // Gender split and average percentage viewed were both ruled out.
    await expect(body).not.toContainText('98,2');
    await expect(body).not.toContainText('10,0%');
    await expect(body).not.toContainText(/laki-laki/i);
  });
});
