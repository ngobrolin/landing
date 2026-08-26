import { getEpisodes } from './episodes';
import { getAllTagsWithCounts } from './tags';

/**
 * Archive-level facts the front door needs.
 *
 * The homepage used to expose 8 of 178 episodes and say nothing about the
 * depth behind them. Every number here is derived, never written down: a
 * hardcoded count is exactly how /partners came to advertise "164+" against a
 * real 178, and /tags to advertise 723.
 */

export interface ArchiveStats {
  episodeCount: number;
  transcriptCount: number;
  /** True when every episode has a transcript, which is the claim worth making. */
  fullyTranscribed: boolean;
}

// Eagerly globbed at module load, same as the other transcript readers. Only
// the key count is used here, so this never holds transcript bodies.
const transcriptKeys = Object.keys(
  import.meta.glob('../data/transcripts/*.json')
);

let _stats: ArchiveStats | null = null;

export function getArchiveStats(): ArchiveStats {
  if (_stats) return _stats;

  const episodeCount = getEpisodes().length;
  const transcriptCount = transcriptKeys.length;

  _stats = {
    episodeCount,
    transcriptCount,
    fullyTranscribed: transcriptCount === episodeCount,
  };
  return _stats;
}

export interface YearCount {
  year: number;
  count: number;
}

let _years: YearCount[] | null = null;

export function getYearsWithCounts(): YearCount[] {
  if (_years) return _years;

  const counts = new Map<number, number>();
  for (const ep of getEpisodes()) {
    const year = new Date(ep.publishedAt).getUTCFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  _years = Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  return _years;
}

/**
 * The busiest topics, for surfacing as entry points.
 *
 * Reads through getAllTagsWithCounts so a tag can only appear here if it has a
 * real /tags/<tag> route behind it. The old homepage listed HTMX, JWT and
 * others as topics; none of them has a tag page, so linking those labels
 * directly would have shipped 404s from the front door.
 */
export function getTopTags(limit: number): Array<{ tag: string; count: number }> {
  return getAllTagsWithCounts()
    .filter(({ count }) => count > 0)
    .slice(0, limit);
}
