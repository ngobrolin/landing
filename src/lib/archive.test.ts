import { describe, it, expect } from 'vitest';
import { getArchiveStats, getYearsWithCounts, getTopTags } from './archive';
import { getAvailableYears, getEpisodes, getYearCount } from './episodes';
import { getAllTagsWithCounts } from './tags';

describe('getArchiveStats', () => {
  it('counts every episode', () => {
    expect(getArchiveStats().episodeCount).toBe(getEpisodes().length);
  });

  it('counts transcripts without assuming full coverage', () => {
    const { episodeCount, transcriptCount } = getArchiveStats();
    expect(transcriptCount).toBeGreaterThan(0);
    expect(transcriptCount).toBeLessThanOrEqual(episodeCount);
  });

  it('reports whether every episode is transcribed', () => {
    const stats = getArchiveStats();
    expect(stats.fullyTranscribed).toBe(stats.transcriptCount === stats.episodeCount);
  });

  // Counting files on disk would let a lost transcript be masked by an orphan
  // one belonging to a video no longer in the playlist, and the homepage would
  // still print "semuanya dengan transkrip lengkap". The claim has to be true
  // per episode.
  it('counts transcripts that belong to episodes, not files on disk', () => {
    const modules = import.meta.glob('../data/transcripts/*.json');
    const keys = new Set(Object.keys(modules));
    const covered = getEpisodes().filter((ep) =>
      keys.has(`../data/transcripts/${ep.videoId}.json`)
    ).length;

    expect(getArchiveStats().transcriptCount).toBe(covered);
  });

  it('only claims full transcription when every episode has its own transcript', () => {
    const modules = import.meta.glob('../data/transcripts/*.json');
    const keys = new Set(Object.keys(modules));
    const everyEpisodeCovered = getEpisodes().every((ep) =>
      keys.has(`../data/transcripts/${ep.videoId}.json`)
    );

    expect(getArchiveStats().fullyTranscribed).toBe(everyEpisodeCovered);
  });
});

describe('getYearsWithCounts', () => {
  it('covers every episode exactly once', () => {
    const total = getYearsWithCounts().reduce((sum, y) => sum + y.count, 0);
    expect(total).toBe(getEpisodes().length);
  });

  it('is sorted newest year first', () => {
    const years = getYearsWithCounts().map((y) => y.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('never reports an empty year', () => {
    for (const { year, count } of getYearsWithCounts()) {
      expect(count, `year ${year} is empty`).toBeGreaterThan(0);
    }
  });

  // The tiles link straight to /episodes/<year>, which renders through
  // getEpisodesByYear. Deriving the buckets a second time here is how the two
  // would silently drift apart.
  it('agrees with the year helpers the /episodes/<year> pages use', () => {
    expect(getYearsWithCounts()).toEqual(
      getAvailableYears().map((year) => ({ year, count: getYearCount(year) }))
    );
  });
});

describe('getTopTags', () => {
  it('returns at most the requested number', () => {
    expect(getTopTags(5).length).toBeLessThanOrEqual(5);
    expect(getTopTags(1000).length).toBeLessThanOrEqual(getAllTagsWithCounts().length);
  });

  it('is ordered by episode count, descending', () => {
    const counts = getTopTags(12).map((t) => t.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  // The homepage links these directly. Five of the old inert homepage/about
  // chips named topics with no tag page (HTMX, JWT, Elixir, DevOps, Node.js),
  // so anything surfaced here must correspond to a real /tags/<tag> route.
  it('only returns tags that have a real tag page', () => {
    const real = new Set(getAllTagsWithCounts().map((t) => t.tag));
    for (const { tag } of getTopTags(50)) {
      expect(real.has(tag), `${tag} has no tag page`).toBe(true);
    }
  });

  it('only returns tags that actually have episodes', () => {
    for (const { tag, count } of getTopTags(50)) {
      expect(count, `${tag} has no episodes`).toBeGreaterThan(0);
    }
  });

  it('returns url-safe tag slugs', () => {
    for (const { tag } of getTopTags(50)) {
      expect(tag).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
