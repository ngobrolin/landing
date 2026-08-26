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
