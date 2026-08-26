/**
 * Pure merge step of the playlist sync, kept out of `scripts/fetch-playlist.ts`
 * because that script needs `YOUTUBE_API_KEY` (a GitHub Actions secret) and so
 * cannot run — or be tested — locally.
 *
 * The merge decides what survives a sync, and the answer is: everything.
 *
 * Audio metadata survives because it lives nowhere else. `slug` survives for a
 * sharper reason: it is an episode's permanent address, and YouTube retitles
 * are routine (see `src/lib/slug.ts`). And the *record itself* survives even
 * when the sync stops returning its video at all — a video made private, or
 * pulled from the playlist, used to take its whole record with it, silently
 * dropping the episode from the podcast feed (`getPodcastEpisodes()` needs all
 * three audio fields and drops a partial entry without a word) and freeing its
 * slug to be re-derived from a new title if it ever came back.
 *
 * Retention is marked, not hidden: `absentFromPlaylistSince` stamps the sync
 * that first missed the video and is cleared when it returns. The field is
 * optional, exactly as `source` is on transcripts — nothing reads it, so a
 * record written before it existed behaves identically.
 */

import { deriveSlug, resolveSlug } from "../../src/lib/slug";
import type { Episode } from "./playlist-episodes";

/** An episode as it comes back from the playlist sync — no local fields yet. */
export type SyncedEpisode = Episode;

/** An episode as `src/data/episodes.json` holds it, with the local-only fields. */
export interface StoredEpisode extends SyncedEpisode {
  slug?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
  /**
   * ISO timestamp of the first sync that did not return this video, present
   * only while it is missing. Absent means live — including on every record
   * written before this field existed.
   */
  absentFromPlaylistSince?: string;
}

/** A record kept despite the sync no longer returning its video. */
export interface RetainedEpisode {
  videoId: string;
  title: string;
  since: string;
}

export interface MergeResult {
  episodes: StoredEpisode[];
  /** Newly absent this run — the sync should say so out loud. */
  retained: RetainedEpisode[];
  /** Video ids that were absent and came back this run. */
  reappeared: string[];
}

export interface MergeOptions {
  /** Timestamp to stamp a newly absent record with. Injected so tests are pure. */
  syncedAt?: string;
}

/**
 * Take every field from the fresh sync, carry the local-only fields across from
 * the existing record, and keep any existing record the sync did not return.
 *
 * A video absent from `existing` is new, and only then is its slug computed —
 * which is why a reappearing episode keeps its original address rather than
 * being treated as a brand-new video with a brand-new slug.
 *
 * Retained records are appended after the live ones in their existing relative
 * order. Nothing downstream depends on array order (`src/lib/episodes.ts` sorts
 * by `publishedAt`), and grouping them makes a retention obvious in the diff.
 */
export function mergeEpisodes(
  synced: readonly SyncedEpisode[],
  existing: readonly StoredEpisode[],
  options: MergeOptions = {},
): MergeResult {
  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const byVideoId = new Map(existing.map((ep) => [ep.videoId, ep]));
  const syncedIds = new Set(synced.map((ep) => ep.videoId));
  const reappeared: string[] = [];

  const live = synced.map((ep) => {
    const previous = byVideoId.get(ep.videoId);

    if (previous?.absentFromPlaylistSince) {
      reappeared.push(ep.videoId);
    }

    return {
      ...ep,
      slug: previous?.slug || deriveSlug(ep.videoId, ep.title),
      audioUrl: previous?.audioUrl,
      audioDuration: previous?.audioDuration,
      audioFileSize: previous?.audioFileSize,
      // Cleared, not carried: the video is back in the playlist.
      absentFromPlaylistSince: undefined,
    };
  });

  const retained: RetainedEpisode[] = [];
  const kept = existing
    .filter((ep) => !syncedIds.has(ep.videoId))
    .map((ep) => {
      // Stamp only the first sync that misses it, so the field records when the
      // episode went away rather than the date of the most recent run.
      const since = ep.absentFromPlaylistSince ?? syncedAt;

      if (!ep.absentFromPlaylistSince) {
        retained.push({ videoId: ep.videoId, title: ep.title, since });
      }

      return { ...ep, slug: resolveSlug(ep), absentFromPlaylistSince: since };
    });

  return { episodes: [...live, ...kept], retained, reappeared };
}
