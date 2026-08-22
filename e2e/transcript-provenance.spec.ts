import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TRANSCRIPTS_DIR = join(process.cwd(), 'src/data/transcripts');
const EPISODES_FILE = join(process.cwd(), 'src/data/episodes.json');

// Mirrors slugify() in src/lib/episodes.ts. Duplicated rather than imported
// because Playwright's loader cannot resolve that module's JSON import.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Find the page path of an episode whose transcript has the given `source`. */
function episodePathWithSource(source: string | undefined): string {
  const episodes: { videoId: string; title: string }[] = JSON.parse(
    readFileSync(EPISODES_FILE, 'utf-8')
  );

  for (const file of readdirSync(TRANSCRIPTS_DIR)) {
    if (!file.endsWith('.json')) continue;

    const transcript = JSON.parse(
      readFileSync(join(TRANSCRIPTS_DIR, file), 'utf-8')
    );
    if (transcript.source !== source) continue;

    const episode = episodes.find((ep) => ep.videoId === transcript.videoId);
    if (episode) {
      return `/episodes/${episode.videoId}-${slugify(episode.title)}`;
    }
  }

  throw new Error(`No episode found with transcript source: ${source}`);
}

test.describe('Transcript provenance', () => {
  test('YouTube auto-generated transcripts are labelled', async ({ page }) => {
    await page.goto(episodePathWithSource('youtube-auto'));

    await expect(page.getByTestId('transcript')).toBeVisible();
    await expect(page.getByTestId('transcript-auto-badge')).toHaveText(
      'otomatis'
    );
  });

  // The 150 whisper-generated transcripts predate the `source` field. Adding it
  // must not change how they render, and must not mislabel them as automatic.
  test('transcripts without a source field still render, unlabelled', async ({
    page,
  }) => {
    await page.goto(episodePathWithSource(undefined));

    const transcript = page.getByTestId('transcript');
    await expect(transcript).toBeVisible();
    await expect(page.getByTestId('transcript-auto-badge')).toHaveCount(0);

    // The transcript body itself renders: timestamped segments and the
    // correction link are present, exactly as before `source` was introduced.
    await expect(transcript.getByText(/^\d+:\d{2}$/).first()).toBeVisible();
    await expect(
      transcript.getByRole('link', { name: 'Bantu Koreksi' })
    ).toBeVisible();
  });
});
