import type { Episode } from './episodes';

interface Summary {
  brief: string;
  keyPoints: string[];
}

const summaries = import.meta.glob<{ default: Summary }>(
  '../data/summaries/*.json',
  { eager: true }
);

function getKeyPoints(videoId: string): string[] {
  return summaries[`../data/summaries/${videoId}.json`]?.default.keyPoints ?? [];
}

/**
 * The fields Fuse searches.
 *
 * This is the one place that decides what is findable. Adding a field here and
 * to SearchDocument is the whole change - the component reads both and does not
 * name fields itself, so a deeper index (transcript text, chunked and lazily
 * fetched) can be added later without touching the search UI.
 */
export const SEARCH_KEYS = ['title', 'description', 'brief', 'keyPoints'] as const;

export interface SearchDocument {
  /** Maps a hit back to the card Astro already rendered. Not searched. */
  slug: string;
  title: string;
  description: string;
  brief: string;
  /**
   * Summary key points, flattened to one string.
   *
   * These name the concrete things an episode covered - tools, libraries,
   * product names - and none of it was searchable. Flattened rather than kept
   * as an array because Fuse only needs the text, and array syntax in the
   * inlined island is pure payload.
   */
  keyPoints: string;
}

/**
 * Build the search index payload.
 *
 * Ships only the slug plus the searchable fields. The island previously carried
 * thumbnail, publishedAt, episodeNumber and isNew as well - roughly 14KB that
 * nothing ever read, because search re-rendered cards from a JS template
 * instead of filtering the ones already on the page.
 */
export function buildSearchDocuments(episodes: Episode[]): SearchDocument[] {
  return episodes.map((episode) => ({
    slug: episode.slug,
    title: episode.title,
    description: episode.description,
    brief: episode.brief ?? '',
    keyPoints: getKeyPoints(episode.videoId).join(' '),
  }));
}

/**
 * Queries of this length or shorter bypass Fuse entirely.
 *
 * Fuse cannot serve them at either setting. With `minMatchCharLength: 3` the
 * queries "ai", "ui", "ux", "js" and "go" return nothing at all, over an
 * archive that advertises /tags/ai, /tags/ui and /tags/ux as topics. Dropping
 * the option instead returns 178/178 for "ai" and "go", because Indonesian
 * prose is full of them: mulai, berbagai, sebagai, sesuai, bagaimana. That is
 * the same trap scripts/lib/tag-extraction.ts documents.
 */
export const SHORT_QUERY_MAX_LENGTH = 2;

/**
 * The fields a short query is matched against.
 *
 * Deliberately narrower than SEARCH_KEYS: `description` is the YouTube blurb,
 * which is where the Indonesian false positives live, and `brief` is prose
 * from the same family. Titles and key points name things.
 */
export const SHORT_QUERY_KEYS = ['title', 'keyPoints'] as const;

export interface ShortQueryDocument {
  title: string;
  keyPoints: string;
}

export function isShortQuery(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length > 0 && trimmed.length <= SHORT_QUERY_MAX_LENGTH;
}

/**
 * Word-boundary matcher, same rule as scripts/lib/tag-extraction.ts.
 *
 * `\b` is not used because it misbehaves around dotted names ("next.js").
 * Treating [a-z0-9] as the word character class and requiring a non-word
 * character or a string edge on each side expresses the intent directly.
 */
function wordBoundaryPattern(query: string): RegExp {
  const escaped = query.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
}

/** Exact, word-boundary search for queries too short for fuzzy matching. */
export function searchShortQuery<T extends ShortQueryDocument>(
  query: string,
  documents: T[]
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = wordBoundaryPattern(trimmed);
  const inTitle: T[] = [];
  const inKeyPoints: T[] = [];

  for (const doc of documents) {
    if (pattern.test((doc.title ?? '').toLowerCase())) inTitle.push(doc);
    else if (pattern.test((doc.keyPoints ?? '').toLowerCase())) inKeyPoints.push(doc);
  }

  return [...inTitle, ...inKeyPoints];
}
