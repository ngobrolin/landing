import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const EPISODES_FILE = join(process.cwd(), 'src/data/episodes.json');
const DIST_DIR = join(process.cwd(), 'dist');

/**
 * getEpisodes() maps and sorts src/data/episodes.json without filtering, so its
 * length is the file's length. Read the JSON directly rather than importing
 * src/lib/episodes.ts: Playwright's loader cannot resolve that module's JSON
 * import (see e2e/transcript-provenance.spec.ts).
 */
function episodeCount(): number {
  return JSON.parse(readFileSync(EPISODES_FILE, 'utf-8')).length;
}

function* htmlFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* htmlFiles(path);
    else if (path.endsWith('.html')) yield path;
  }
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
    for (const file of htmlFiles(DIST_DIR)) {
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
      'Episode, mingguan sejak 2022'
    );

    await expect(page.getByTestId('stat-subscribers')).toHaveText('7.100');
    await expect(page.getByTestId('stat-subscribers-label')).toHaveText(
      'Subscriber kanal'
    );

    await expect(page.getByTestId('stat-age')).toHaveText('88,7%');
    await expect(page.getByTestId('stat-age-label')).toHaveText(
      'Audiens berusia 25-34'
    );

    await expect(page.getByTestId('stat-returning')).toHaveText('37,8%');
    await expect(page.getByTestId('stat-returning-label')).toHaveText(
      'Penonton yang kembali'
    );
  });

  test('supporting figures and a dated attribution are visible', async ({
    page,
  }) => {
    await page.goto('/partners');

    await expect(page.getByTestId('stat-supporting')).toHaveText(
      '87,7% dari Indonesia · 545 jam ditonton per 28 hari · rata-rata 5:58 per tayangan · minat teratas: High-End Computer Aficionados.'
    );

    // Undated, these become the next unverifiable claim within six months.
    await expect(page.getByTestId('stat-attribution')).toContainText(
      'Data kanal YouTube, Agustus 2026.'
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
