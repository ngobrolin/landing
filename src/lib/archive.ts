import { getAvailableYears, getEpisodes, getYearCount } from './episodes';
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
  /** Episodes that have a transcript of their own, not transcript files on disk. */
  transcriptCount: number;
  /** True when every episode has a transcript, which is the claim worth making. */
  fullyTranscribed: boolean;
}

// Globbed lazily at module load, same as the other transcript readers. Only the
// key set is used here, so this never holds transcript bodies.
const transcriptKeys = new Set(
  Object.keys(import.meta.glob('../data/transcripts/*.json'))
);

function hasTranscript(videoId: string): boolean {
  return transcriptKeys.has(`../data/transcripts/${videoId}.json`);
}

let _stats: ArchiveStats | null = null;

export function getArchiveStats(): ArchiveStats {
  if (_stats) return _stats;

  // Counting files would let a lost transcript be masked by an orphan one left
  // behind by a video that is no longer in the playlist, and the homepage would
  // still claim "semuanya dengan transkrip lengkap". Presence is per episode.
  const episodes = getEpisodes();
  const transcriptCount = episodes.filter((ep) => hasTranscript(ep.videoId)).length;

  _stats = {
    episodeCount: episodes.length,
    transcriptCount,
    fullyTranscribed: transcriptCount === episodes.length,
  };
  return _stats;
}

export interface YearCount {
  year: number;
  count: number;
}

let _years: YearCount[] | null = null;

/**
 * Year tiles for the homepage.
 *
 * Reads through getAvailableYears/getYearCount rather than re-deriving the
 * buckets, so a tile can never disagree with the /episodes/<year> page it
 * links to. getAvailableYears is already sorted newest first.
 */
export function getYearsWithCounts(): YearCount[] {
  if (_years) return _years;

  _years = getAvailableYears().map((year) => ({ year, count: getYearCount(year) }));

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
