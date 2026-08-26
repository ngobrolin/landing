/**
 * Pure merge step of the playlist sync, kept out of `scripts/fetch-playlist.ts`
 * because that script needs `YOUTUBE_API_KEY` (a GitHub Actions secret) and so
 * cannot run — or be tested — locally.
 *
 * The merge decides what survives a sync. Audio metadata does, because it lives
 * nowhere else. `slug` does too, and for a sharper reason: it is an episode's
 * permanent address, and YouTube retitles are routine. See `src/lib/slug.ts`.
 */

import { deriveSlug } from "../../src/lib/slug";

/** An episode as it comes back from the playlist sync — no local fields yet. */
export interface SyncedEpisode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  position: number;
  duration?: string;
}

/** An episode as `src/data/episodes.json` holds it, with the local-only fields. */
export interface StoredEpisode extends SyncedEpisode {
  slug?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
}

/**
 * Take every field from the fresh sync, then carry the local-only fields
 * across from the existing record. A video absent from `existing` is new, and
 * only then is its slug computed.
 */
export function mergeEpisodes(
  synced: readonly SyncedEpisode[],
  existing: readonly StoredEpisode[],
): StoredEpisode[] {
  const byVideoId = new Map(existing.map((ep) => [ep.videoId, ep]));

  return synced.map((ep) => {
    const previous = byVideoId.get(ep.videoId);

    return {
      ...ep,
      slug: previous?.slug || deriveSlug(ep.videoId, ep.title),
      audioUrl: previous?.audioUrl,
      audioDuration: previous?.audioDuration,
      audioFileSize: previous?.audioFileSize,
    };
  });
}
