/**
 * Fetch YouTube playlist data and save to episodes.json
 * 
 * Usage: 
 *   YOUTUBE_API_KEY=your_api_key npx tsx scripts/fetch-playlist.ts
 * 
 * Or set the API key in .env file:
 *   YOUTUBE_API_KEY=your_api_key
 */

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

interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  position: number;
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

async function fetchAllPlaylistItems(): Promise<Episode[]> {
  const episodes: Episode[] = [];
  let pageToken: string | undefined;

  do {
    const data = await fetchPlaylistItems(pageToken);
    
    for (const item of data.items) {
      const { snippet } = item;
      
      // Skip private/deleted videos
      if (snippet.title === 'Private video' || snippet.title === 'Deleted video') {
        continue;
      }

      episodes.push({
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

  return episodes;
}

async function main() {
  if (!API_KEY) {
    console.error('Error: YOUTUBE_API_KEY environment variable is required');
    console.log('\nUsage:');
    console.log('  YOUTUBE_API_KEY=your_api_key npx tsx scripts/fetch-playlist.ts');
    process.exit(1);
  }

  console.log('Fetching playlist items from YouTube...');
  
  try {
    const episodes = await fetchAllPlaylistItems();
    
    const outputPath = new URL('../src/data/episodes.json', import.meta.url);
    const fs = await import('fs');
    
    // Check for new episodes
    let existingVideoIds = new Set<string>();
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as Episode[];
      existingVideoIds = new Set(existing.map(e => e.videoId));
    } catch {
      // No existing file
    }
    
    const newEpisodes = episodes.filter(e => !existingVideoIds.has(e.videoId));
    
    fs.writeFileSync(
      outputPath, 
      JSON.stringify(episodes, null, 2)
    );
    
    console.log(`✓ Saved ${episodes.length} episodes to src/data/episodes.json`);
    
    // Auto-run tag extraction if there are new episodes
    if (newEpisodes.length > 0) {
      console.log(`\n📌 Found ${newEpisodes.length} new episode(s), extracting tags...`);
      const { execSync } = await import('child_process');
      execSync('npx tsx scripts/extract-tags.ts', { 
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
