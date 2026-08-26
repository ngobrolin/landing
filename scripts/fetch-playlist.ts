/**
 * Fetch YouTube playlist data and save to episodes.json
 * 
 * Usage: 
 *   YOUTUBE_API_KEY=your_api_key pnpm exec tsx scripts/fetch-playlist.ts
 * 
 * Or set the API key in .env file:
 *   YOUTUBE_API_KEY=your_api_key
 */

import {
  buildEpisodes,
  isUnavailableVideo,
  type Episode as BuiltEpisode,
  type PlaylistEntry,
  type VideoDetail,
} from './lib/playlist-episodes';
import { mergeEpisodes, type StoredEpisode } from './lib/episode-merge';

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

async function fetchAllPlaylistEntries(): Promise<PlaylistEntry[]> {
  const entries: PlaylistEntry[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchPlaylistItems(pageToken);

    for (const item of data.items) {
      const { snippet } = item;

      // Skip private/deleted videos
      if (isUnavailableVideo(snippet.title)) {
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

  return entries;
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
    const entries = await fetchAllPlaylistEntries();

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

    // Check for new episodes and preserve existing metadata (like audioUrl)
    let existingEpisodes: Episode[] = [];
    try {
      existingEpisodes = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as Episode[];
    } catch {
      // No existing file
    }

    const existingVideoIds = new Set(existingEpisodes.map(e => e.videoId));

    // Merge: new data from YouTube, but the local-only fields — audio metadata
    // and the permanent `slug` — carried across. See scripts/lib/episode-merge.ts.
    const mergedEpisodes = mergeEpisodes(episodesWithDuration, existingEpisodes);

    const newEpisodes = mergedEpisodes.filter(e => !existingVideoIds.has(e.videoId));

    fs.writeFileSync(
      outputPath,
      JSON.stringify(mergedEpisodes, null, 2)
    );

    console.log(`✓ Saved ${mergedEpisodes.length} episodes to src/data/episodes.json`);

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
