/**
 * Pure logic for the playlist drift check.
 *
 * The site builds from a single YouTube playlist. If an episode is published to
 * the channel but never added to that playlist, the site and the podcast RSS
 * feed silently stop updating — nothing downstream reports a problem. This
 * module decides what counts as an episode, what counts as missing, and how the
 * resulting alert reads. I/O lives in `scripts/check-playlist-drift.ts`.
 */

/**
 * The single place the episode naming rule lives.
 *
 * Episodes carry the show name after a dash: `<topic> - Ngobrolin WEB`. Real
 * playlist titles show the convention is looser than that in practice, so the
 * rule is deliberately tolerant of what actually occurs:
 *
 *   - trailing episode numbers  — `Ngobrolin Linter - Ngobrolin WEB ep51`
 *   - trailing guest handles    — `Ngobrolin PHP - Ngobrolin WEB & @sandhikagalihWPU`
 *   - typos in the show name    — `Optimasi Performa JS - Ngborlin WEB`
 *
 * Requiring the dash is what keeps clips and shorts out — they mention the show
 * without that separator. Erring loose is deliberate: a false alert costs a
 * glance, and the miss this check exists for cost eleven days. `detectConventionDrift`
 * watches for the rule going stale, since a convention is not a guarantee.
 */
export const EPISODE_TITLE_PATTERN = /[-\u2013\u2014]\s*ng[a-z]*lin\s+web\b/i;

export const DEFAULT_WINDOW_DAYS = 60;

/** Stable title so re-runs update one issue instead of opening duplicates. */
export const ISSUE_TITLE = "Episodes published but missing from the YouTube playlist";

export interface ChannelVideo {
  videoId: string;
  title: string;
  /** ISO 8601 timestamp of when the video was published to the channel. */
  publishedAt: string;
}

export interface ConventionDrift {
  matched: number;
  sampled: number;
}

export interface FindMissingOptions {
  now?: Date;
  windowDays?: number;
}

export function isEpisodeTitle(title: string): boolean {
  return EPISODE_TITLE_PATTERN.test(title);
}

/**
 * Channel videos that look like episodes, were published inside the window, and
 * are not in the playlist. Newest first.
 */
export function findMissingEpisodes(
  channelVideos: readonly ChannelVideo[],
  playlistVideoIds: ReadonlySet<string>,
  options: FindMissingOptions = {},
): ChannelVideo[] {
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

  return channelVideos
    .filter((video) => {
      if (!isEpisodeTitle(video.title)) return false;
      if (playlistVideoIds.has(video.videoId)) return false;

      const publishedAt = new Date(video.publishedAt).getTime();
      if (Number.isNaN(publishedAt)) return false;
      // Scheduled/premiering uploads are not late yet.
      if (publishedAt > now.getTime()) return false;

      return publishedAt >= cutoff;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Guards the title rule against silent drift.
 *
 * Entries already in the playlist are known-good episodes. If most of the
 * recent ones stop matching `EPISODE_TITLE_PATTERN`, the convention has changed
 * and this check would quietly match nothing — which looks exactly like "all
 * good". Returns null while the rule still holds.
 */
export function detectConventionDrift(
  recentPlaylistTitles: readonly string[],
): ConventionDrift | null {
  if (recentPlaylistTitles.length === 0) return null;

  const matched = recentPlaylistTitles.filter(isEpisodeTitle).length;
  // A majority still matching means the odd one-off title, not a renamed show.
  if (matched * 2 > recentPlaylistTitles.length) return null;

  return { matched, sampled: recentPlaylistTitles.length };
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function playlistUrl(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

export function formatIssueBody(
  missing: readonly ChannelVideo[],
  drift: ConventionDrift | null,
  context: { playlistId: string; windowDays: number },
): string {
  const lines: string[] = [];

  if (missing.length > 0) {
    lines.push(
      `${missing.length} episode(s) published to the channel in the last ${context.windowDays} days are **not in the playlist the site builds from**.`,
      "",
      "Until they are added, they will not appear on ngobrol.in and will not show up in the podcast RSS feed.",
      "",
    );

    for (const video of missing) {
      const published = video.publishedAt.slice(0, 10);
      lines.push(`- **${video.title}** — published ${published} — ${watchUrl(video.videoId)}`);
    }

    lines.push(
      "",
      "### How to fix",
      "",
      `This check is read-only: the API key it uses cannot add videos to a playlist, so it **cannot** fix this for you. Add each video above to [the playlist](${playlistUrl(context.playlistId)}) manually in the YouTube UI, then re-run the \`Fetch YouTube Playlist\` workflow (or wait for its next scheduled run) to pull it into \`src/data/episodes.json\`.`,
      "",
      "This issue closes itself on the next run once the playlist is complete.",
    );
  }

  if (drift) {
    if (lines.length > 0) lines.push("", "---", "");
    lines.push(
      "### Episode title convention may have drifted",
      "",
      `Only ${drift.matched} of the ${drift.sampled} most recent playlist entries match the episode title rule (\`${EPISODE_TITLE_PATTERN}\`).`,
      "",
      "Those entries are known-good episodes, so the rule — not the data — is probably stale. While it is stale this check can silently match nothing and report all-clear. Update `EPISODE_TITLE_PATTERN` in `scripts/lib/playlist-drift.ts`.",
    );
  }

  return lines.join("\n");
}
