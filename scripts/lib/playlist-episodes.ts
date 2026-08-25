/**
 * Pure logic for turning a YouTube playlist into the episode list.
 *
 * Two decisions live here because both have shipped as bugs and both are
 * untestable inside the network code (`scripts/fetch-playlist.ts` needs
 * `YOUTUBE_API_KEY`, a GitHub Actions secret):
 *
 *   1. **Which date is the air date.** A playlist item's `snippet.publishedAt`
 *      is when the video joined the *playlist*, not when it aired. Back-adding
 *      an old episode therefore stamped it with today and floated it to the top
 *      of the site and both feeds. The video's own `snippet.publishedAt` is the
 *      air date; the playlist item's is only a fallback.
 *   2. **One video, one episode.** A video that appears twice in the playlist
 *      used to emit twice, producing two pages on the same slug — slugs are
 *      built from `videoId` in `src/lib/episodes.ts`, so a duplicate id is a
 *      duplicate route.
 */

/** A playlist item, normalised out of the playlistItems API response. */
export interface PlaylistEntry {
  videoId: string;
  title: string;
  description: string;
  /** When the video was added to the playlist — NOT the air date. */
  publishedAt: string;
  thumbnail: string;
  position: number;
}

/** A video, normalised out of the videos API response. */
export interface VideoDetail {
  videoId: string;
  /** ISO 8601 duration from YouTube, e.g. `PT4M13S`. */
  duration: string;
  /** When the video aired. This is the date the site and feeds should use. */
  publishedAt: string;
}

export interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  position: number;
  duration?: string;
}

/** A playlist entry dropped because its video was already claimed. */
export interface DuplicateDrop {
  videoId: string;
  keptPosition: number;
  droppedPosition: number;
}

export interface BuildEpisodesResult {
  episodes: Episode[];
  /** Dropped duplicate entries, so the run can log rather than hide them. */
  duplicates: DuplicateDrop[];
  /** Video ids whose air date had to fall back to the playlist item's date. */
  missingDetails: string[];
}

/** Placeholder titles YouTube returns for videos it will not serve. */
export function isUnavailableVideo(title: string): boolean {
  return title === "Private video" || title === "Deleted video";
}

/**
 * Merge playlist entries with their video details into the episode list.
 *
 * Input order is preserved, so a duplicate-free playlist passes through
 * untouched. When one video appears more than once, the entry with the lowest
 * `position` wins and holds the earlier of the two slots.
 */
export function buildEpisodes(
  entries: readonly PlaylistEntry[],
  details: Readonly<Record<string, VideoDetail | undefined>>,
): BuildEpisodesResult {
  const slots: Array<{ entry: PlaylistEntry } | null> = [];
  const claimed = new Map<string, number>();
  const duplicates: DuplicateDrop[] = [];

  for (const entry of entries) {
    const slot = claimed.get(entry.videoId);

    if (slot === undefined) {
      claimed.set(entry.videoId, slots.length);
      slots.push({ entry });
      continue;
    }

    const kept = slots[slot]!.entry;
    // Lowest position wins, whichever order the two copies arrived in. The
    // winner keeps the earlier slot so surrounding order is undisturbed.
    const winner = entry.position < kept.position ? entry : kept;
    const loser = winner === entry ? kept : entry;
    slots[slot] = { entry: winner };
    duplicates.push({
      videoId: entry.videoId,
      keptPosition: winner.position,
      droppedPosition: loser.position,
    });
  }

  const missingDetails: string[] = [];
  const episodes = slots.filter((s) => s !== null).map(({ entry }) => {
    const detail = details[entry.videoId];

    if (!detail?.publishedAt) {
      missingDetails.push(entry.videoId);
    }

    return {
      videoId: entry.videoId,
      title: entry.title,
      description: entry.description,
      publishedAt: detail?.publishedAt || entry.publishedAt,
      thumbnail: entry.thumbnail,
      position: entry.position,
      duration: detail?.duration,
    };
  });

  return { episodes, duplicates, missingDetails };
}
