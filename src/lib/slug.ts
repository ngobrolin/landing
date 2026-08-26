/**
 * Episode addresses.
 *
 * An episode's slug is **stored data**, not something derived at build time.
 * Titles belong to YouTube and change without warning: retitling a video used
 * to rename its page, dropping the indexed URL with no redirect and nothing
 * erroring anywhere. `src/data/episodes.json` therefore carries a `slug` field,
 * seeded with the address each episode already resolved to, and
 * `scripts/fetch-playlist.ts` carries it across every sync.
 *
 * Deriving from the title is the fallback for a record written before the
 * field existed. Do not re-derive when a slug is stored, anywhere.
 *
 * This module holds no data imports on purpose, so the sync scripts under
 * `scripts/` can share one `slugify` with the site instead of copying it.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Derive the address a brand-new episode gets. Only ever called once per video. */
export function deriveSlug(videoId: string, title: string): string {
  return `${videoId}-${slugify(title)}`;
}

/** The stored slug wins; the derivation is a fallback for legacy records. */
export function resolveSlug(ep: { videoId: string; title: string; slug?: string }): string {
  return ep.slug || deriveSlug(ep.videoId, ep.title);
}
