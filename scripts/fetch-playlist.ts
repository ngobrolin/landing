/**
 * Fetch YouTube playlist data and save to episodes.json
 * 
 * Usage: 
 *   YOUTUBE_API_KEY=your_api_key pnpm exec tsx scripts/fetch-playlist.ts
 * 
 * Or set the API key in .env file:
 *   YOUTUBE_API_KEY=your_api_key
 *
 * Two per-run overrides exist for the refusals in scripts/lib/sync-guards.ts,
 * and each refusal prints its own, verbatim:
 *   ALLOW_SYNC_SHRINK=1     let one run through the sync floor
 *   ALLOW_EMPTY_BASELINE=1  let one run start with no src/data/episodes.json
 */

import {
  buildEpisodes,
  isUnavailableVideo,
  type Episode as BuiltEpisode,
  type PlaylistEntry,
  type VideoDetail,
} from './lib/playlist-episodes';
import { mergeEpisodes, type StoredEpisode } from './lib/episode-merge';
import {
  readBaseline,
  checkBootstrapBaseline,
  checkSyncFloor,
  liveBaselineCount,
  overrideEnabled,
  SHRINK_OVERRIDE_ENV,
  EMPTY_BASELINE_OVERRIDE_ENV,
} from './lib/sync-guards';

const PLAYLIST_ID = 'PLTY2nW4jwtG8Sx2Bw6QShC271PzX31CtT';
const API_KEY = process.env.YOUTUBE_API_KEY;

interface PlaylistItem {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    position: number;
    resourceId: {
      videoId: string;
    };
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      maxres?: { url: string };
    };
  };
}

type Episode = BuiltEpisode & StoredEpisode;

interface VideosApiResponse {
  items: Array<{
    id: string;
    snippet: {
      publishedAt: string;
    };
    contentDetails: {
      duration: string;
    };
  }>;
}

/**
 * Fetch video details from the YouTube Videos API, batched 50 ids per call.
 *
 * `snippet` rides along on the request that already fetches `contentDetails`,
 * so the video's own publish date — the air date — costs no extra quota. See
 * `scripts/lib/playlist-episodes.ts` for why the playlist item's date will not do.
 */
async function fetchVideoDetails(videoIds: string[]): Promise<Record<string, VideoDetail>> {
  const result: Record<string, VideoDetail> = {};
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      id: batch.join(','),
      key: API_KEY!,
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);

    if (!response.ok) {
      throw new Error(`YouTube Videos API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as VideosApiResponse;

    for (const item of data.items) {
      result[item.id] = {
        videoId: item.id,
        duration: item.contentDetails.duration,
        publishedAt: item.snippet.publishedAt,
      };
    }
  }

  return result;
}

async function fetchPlaylistItems(pageToken?: string): Promise<{ items: PlaylistItem[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId: PLAYLIST_ID,
    maxResults: '50',
    key: API_KEY!,
  });
  
  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Page the whole playlist.
 *
 * Videos YouTube will not serve (`Private video` / `Deleted video`) are left
 * out of the entries, but reported rather than swallowed: their episode records
 * are retained by the merge, and the run should say which ones went quiet.
 */
async function fetchAllPlaylistEntries(): Promise<{ entries: PlaylistEntry[]; unavailable: string[] }> {
  const entries: PlaylistEntry[] = [];
  const unavailable: string[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchPlaylistItems(pageToken);

    for (const item of data.items) {
      const { snippet } = item;

      if (isUnavailableVideo(snippet.title)) {
        unavailable.push(snippet.resourceId.videoId);
        continue;
      }

      entries.push({
        videoId: snippet.resourceId.videoId,
        title: snippet.title,
        description: snippet.description.slice(0, 500),
        publishedAt: snippet.publishedAt,
        thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url || '',
        position: snippet.position,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return { entries, unavailable };
}

async function main() {
  if (!API_KEY) {
    console.error('Error: YOUTUBE_API_KEY environment variable is required');
    console.log('\nUsage:');
    console.log('  YOUTUBE_API_KEY=your_api_key pnpm exec tsx scripts/fetch-playlist.ts');
    process.exit(1);
  }

  console.log('Fetching playlist items from YouTube...');

  try {
    const { entries, unavailable } = await fetchAllPlaylistEntries();

    // Fetch video details (duration + the real air date)
    console.log('Fetching video details for duration and publish date...');
    const videoIds = [...new Set(entries.map(e => e.videoId))];
    const videoDetails = await fetchVideoDetails(videoIds);

    const { episodes: episodesWithDuration, duplicates, missingDetails } = buildEpisodes(entries, videoDetails);

    for (const dup of duplicates) {
      console.warn(`⚠ ${dup.videoId} appears more than once in the playlist (positions ${dup.keptPosition} and ${dup.droppedPosition}); dropping ${dup.droppedPosition}.`);
    }

    for (const videoId of missingDetails) {
      console.warn(`⚠ No video detail for ${videoId}; falling back to the playlist item's date, which is when it was added to the playlist, not when it aired.`);
    }

    const outputPath = new URL('../src/data/episodes.json', import.meta.url);
    const fs = await import('fs');

    // The baseline decides every slug. Only a genuinely absent file may start
    // from empty, and only with an explicit opt-in; every other bad state is a
    // refusal. See scripts/lib/sync-guards.ts.
    let rawExisting: string | undefined;
    try {
      rawExisting = fs.readFileSync(outputPath, 'utf-8');
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') {
        console.error(`✗ Refusing to write: could not read src/data/episodes.json — ${(error as Error).message}`);
        console.error('  An unreadable file is not an empty one, and merging against an empty baseline would re-derive every slug from its current title.');
        process.exit(1);
      }
    }

    const baseline = readBaseline(rawExisting);

    if (!baseline.ok) {
      console.error(`✗ Refusing to write: ${baseline.reason}`);
      console.error('  Restore src/data/episodes.json from git and re-run.');
      process.exit(1);
    }

    // An absent file may be a genuine first sync, but far more often it is a
    // deleted one — so it takes an explicit opt-in rather than passing quietly.
    const bootstrap = checkBootstrapBaseline(
      baseline.bootstrap,
      overrideEnabled(process.env[EMPTY_BASELINE_OVERRIDE_ENV]),
    );

    if (!bootstrap.ok) {
      console.error(`✗ Refusing to write: ${bootstrap.reason}`);
      process.exit(1);
    }

    if (bootstrap.overridden) {
      console.log(`\n!!! ${EMPTY_BASELINE_OVERRIDE_ENV} is set: starting from an empty baseline with no src/data/episodes.json.`);
      console.log('!!! Every episode is treated as new and its slug derived from the current YouTube title.\n');
    }

    const existingEpisodes = baseline.episodes as Episode[];
    const existingVideoIds = new Set(existingEpisodes.map(e => e.videoId));

    // Reported once per video, not once per playlist occurrence, and only
    // claiming retention for a video that actually has a record to retain.
    for (const videoId of new Set(unavailable)) {
      if (existingVideoIds.has(videoId)) {
        console.warn(`⚠ ${videoId} is private or deleted on YouTube. Its record is retained; the episode page will have a dead embed.`);
      } else {
        console.warn(`⚠ ${videoId} is private or deleted on YouTube and has no record in src/data/episodes.json, so it does not become an episode.`);
      }
    }

    // A short sync looks exactly like a healthy sync of a smaller playlist, so
    // refuse rather than write it — a shrunken write becomes the next baseline.
    // Measured against live records only: already-retained ones never come back
    // from the sync, so counting them would make the gap grow every run.
    const shrinkOverride = overrideEnabled(process.env[SHRINK_OVERRIDE_ENV]);
    const floor = checkSyncFloor(
      episodesWithDuration.length,
      liveBaselineCount(existingEpisodes),
      { override: shrinkOverride },
    );

    if (!floor.ok) {
      console.error(`✗ Refusing to write src/data/episodes.json: ${floor.reason}`);
      process.exit(1);
    }

    // Merge: new data from YouTube, but the local-only fields — audio metadata
    // and the permanent `slug` — carried across, and any episode the sync no
    // longer returns kept rather than dropped. See scripts/lib/episode-merge.ts.
    const { episodes: mergedEpisodes, retained, reappeared } = mergeEpisodes(
      episodesWithDuration,
      existingEpisodes,
    );

    if (floor.overridden) {
      console.log(`\n!!! ${SHRINK_OVERRIDE_ENV} is set: the sync floor refusal was overridden for this run.`);
      console.log(`!!! ${retained.length} episode(s) are being stamped absentFromPlaylistSince — every record is kept, none is deleted:`);
      for (const ep of retained) {
        console.log(`!!!   ${ep.videoId} — "${ep.title}"`);
      }
      console.log(`!!! Nothing persists the override; the next run is guarded again with no further action.\n`);
    }

    for (const ep of retained) {
      console.warn(`⚠ ${ep.videoId} ("${ep.title}") is no longer in the playlist. Retaining its record — slug, audio metadata and all — and marking it absentFromPlaylistSince ${ep.since}.`);
    }

    for (const videoId of reappeared) {
      console.log(`↩ ${videoId} is back in the playlist; clearing its absentFromPlaylistSince and keeping its original slug.`);
    }

    const newEpisodes = mergedEpisodes.filter(e => !existingVideoIds.has(e.videoId));

    fs.writeFileSync(
      outputPath,
      JSON.stringify(mergedEpisodes, null, 2)
    );

    const stillAbsent = mergedEpisodes.filter(e => e.absentFromPlaylistSince).length;
    console.log(
      `✓ Saved ${mergedEpisodes.length} episodes to src/data/episodes.json` +
      (stillAbsent > 0 ? ` (${stillAbsent} retained but absent from the playlist)` : '')
    );

    // Auto-run tag extraction if there are new episodes
    if (newEpisodes.length > 0) {
      console.log(`\n📌 Found ${newEpisodes.length} new episode(s), extracting tags...`);
      const { execSync } = await import('child_process');
      execSync('pnpm exec tsx scripts/extract-tags.ts', {
        stdio: 'inherit',
        cwd: new URL('..', import.meta.url).pathname
      });
    }
  } catch (error) {
    console.error('Error fetching playlist:', error);
    process.exit(1);
  }
}

main();
