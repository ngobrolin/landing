/**
 * Detect episodes published to the channel but never added to the playlist the
 * site builds from, and raise a GitHub issue about them.
 *
 * Usage:
 *   YOUTUBE_API_KEY=your_api_key npx tsx scripts/check-playlist-drift.ts
 *
 * Add GITHUB_TOKEN and GITHUB_REPOSITORY (both provided by GitHub Actions) to
 * open/update/close the alert issue. Without them the check just prints its
 * findings, which is what you want when running it locally.
 *
 * Exit codes:
 *   0 — the check ran (whether or not it found missing episodes; the issue is
 *       the alert, so a drift finding does not paint the workflow red)
 *   1 — the check itself broke (bad key, API failure). A red run means "this
 *       check is not working", never "an episode is missing".
 */

import {
  DEFAULT_WINDOW_DAYS,
  ISSUE_TITLE,
  detectConventionDrift,
  findMissingEpisodes,
  formatIssueBody,
  playlistUrl,
  watchUrl,
  type ChannelVideo,
  type ConventionDrift,
} from "./lib/playlist-drift";

const PLAYLIST_ID = "PLTY2nW4jwtG8Sx2Bw6QShC271PzX31CtT";
const API_KEY = process.env.YOUTUBE_API_KEY;
const WINDOW_DAYS = Number(process.env.DRIFT_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);
/** How many recent playlist entries to sample when checking the title rule. */
const CONVENTION_SAMPLE_SIZE = 10;
/** Safety stop so a mis-ordered uploads playlist cannot page forever. */
const MAX_UPLOAD_PAGES = 10;

interface PlaylistItemsResponse {
  items: Array<{
    snippet: {
      title: string;
      resourceId: { videoId: string };
    };
    contentDetails?: {
      videoId: string;
      videoPublishedAt?: string;
    };
  }>;
  nextPageToken?: string;
}

async function youtube<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, key: API_KEY! });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);

  if (!response.ok) {
    throw new Error(`YouTube API error (${endpoint}): ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

/** The channel that owns the playlist, so no channel ID is hard-coded here. */
async function fetchChannelId(): Promise<string> {
  const data = await youtube<{ items: Array<{ snippet: { channelId: string } }> }>("playlists", {
    part: "snippet",
    id: PLAYLIST_ID,
  });

  const channelId = data.items[0]?.snippet.channelId;
  if (!channelId) {
    throw new Error(`Playlist ${PLAYLIST_ID} not found or has no channel`);
  }

  return channelId;
}

function toVideo(item: PlaylistItemsResponse["items"][number]): ChannelVideo {
  return {
    videoId: item.contentDetails?.videoId ?? item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.contentDetails?.videoPublishedAt ?? "",
  };
}

async function fetchPlaylistPage(playlistId: string, pageToken?: string) {
  return youtube<PlaylistItemsResponse>("playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: "50",
    ...(pageToken ? { pageToken } : {}),
  });
}

/** Every video in the playlist. Small (a few hundred), so page it all. */
async function fetchAllPlaylistVideos(playlistId: string): Promise<ChannelVideo[]> {
  const videos: ChannelVideo[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchPlaylistPage(playlistId, pageToken);
    videos.push(...data.items.map(toVideo));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return videos;
}

/**
 * Recent channel uploads. The uploads playlist is newest-first, so stop once a
 * whole page falls outside the window rather than walking the full history.
 */
async function fetchRecentUploads(uploadsPlaylistId: string, cutoff: number): Promise<ChannelVideo[]> {
  const videos: ChannelVideo[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const data = await fetchPlaylistPage(uploadsPlaylistId, pageToken);
    const page = data.items.map(toVideo);
    videos.push(...page);
    pages += 1;

    const allOlder = page.every((video) => {
      const published = new Date(video.publishedAt).getTime();
      return Number.isNaN(published) || published < cutoff;
    });
    if (allOlder) break;

    pageToken = data.nextPageToken;
  } while (pageToken && pages < MAX_UPLOAD_PAGES);

  return videos;
}

interface Issue {
  number: number;
  state: string;
}

async function github<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error (${path}): ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

/** The one open alert issue, if any. Keyed on the stable title so re-runs
 * update it instead of spamming duplicates. */
async function findExistingIssue(repo: string): Promise<Issue | null> {
  const issues = await github<Array<Issue & { title: string; pull_request?: unknown }>>(
    `/repos/${repo}/issues?state=open&per_page=100`,
  );

  return issues.find((issue) => !issue.pull_request && issue.title === ISSUE_TITLE) ?? null;
}

async function syncIssue(repo: string, body: string | null): Promise<void> {
  const existing = await findExistingIssue(repo);

  if (body === null) {
    if (existing) {
      await github(`/repos/${repo}/issues/${existing.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed", state_reason: "completed" }),
      });
      console.log(`✓ Closed issue #${existing.number} — nothing missing any more`);
    }
    return;
  }

  if (existing) {
    await github(`/repos/${repo}/issues/${existing.number}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    console.log(`✓ Updated issue #${existing.number}`);
    return;
  }

  const created = await github<Issue & { html_url: string }>(`/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: ISSUE_TITLE, body }),
  });
  console.log(`✓ Opened issue ${created.html_url}`);
}

function report(missing: ChannelVideo[], drift: ConventionDrift | null): void {
  if (missing.length === 0) {
    console.log(`✓ No episodes missing from the playlist in the last ${WINDOW_DAYS} days`);
  } else {
    console.log(`✗ ${missing.length} episode(s) published but missing from ${playlistUrl(PLAYLIST_ID)}:`);
    for (const video of missing) {
      console.log(`  - ${video.title} (${video.publishedAt.slice(0, 10)}) ${watchUrl(video.videoId)}`);
    }
  }

  if (drift) {
    console.log(
      `! Title convention may have drifted: only ${drift.matched}/${drift.sampled} recent playlist entries match the rule`,
    );
  }
}

async function main() {
  if (!API_KEY) {
    console.error("Error: YOUTUBE_API_KEY environment variable is required");
    console.log("\nUsage:");
    console.log("  YOUTUBE_API_KEY=your_api_key npx tsx scripts/check-playlist-drift.ts");
    process.exit(1);
  }

  const now = new Date();
  const cutoff = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const channelId = await fetchChannelId();
  // Every channel's uploads live in a playlist whose ID is its channel ID with
  // the `UC` prefix swapped for `UU`.
  const uploadsPlaylistId = `UU${channelId.slice(2)}`;

  const [playlistVideos, uploads] = await Promise.all([
    fetchAllPlaylistVideos(PLAYLIST_ID),
    fetchRecentUploads(uploadsPlaylistId, cutoff),
  ]);

  console.log(`Playlist has ${playlistVideos.length} videos; checked ${uploads.length} recent uploads`);

  const playlistVideoIds = new Set(playlistVideos.map((video) => video.videoId));
  const missing = findMissingEpisodes(uploads, playlistVideoIds, { now, windowDays: WINDOW_DAYS });

  const recentPlaylistTitles = [...playlistVideos]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, CONVENTION_SAMPLE_SIZE)
    .map((video) => video.title);
  const drift = detectConventionDrift(recentPlaylistTitles);

  report(missing, drift);

  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo) {
    console.log("(no GITHUB_TOKEN/GITHUB_REPOSITORY — skipping issue sync)");
    return;
  }

  const body =
    missing.length > 0 || drift
      ? formatIssueBody(missing, drift, { playlistId: PLAYLIST_ID, windowDays: WINDOW_DAYS })
      : null;

  await syncIssue(repo, body);
}

main().catch((error) => {
  console.error("Playlist drift check failed:", error);
  process.exit(1);
});
