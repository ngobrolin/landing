import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transcriptsDir = join(__dirname, '..', '..', '..', '..', 'src', 'data', 'transcripts');
const episodesPath = join(__dirname, '..', '..', '..', '..', 'src', 'data', 'episodes.json');
const ideasPath = join(__dirname, '..', '..', '..', '..', 'src', 'data', 'ideas.json');

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface Transcript {
  videoId: string;
  language: string;
  generatedAt: string;
  segments: Segment[];
}

interface EpisodeData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
}

interface Idea {
  idea: string;
  category: 'product' | 'startup' | 'content';
}

interface EpisodeIdeas {
  videoId: string;
  title: string;
  ideas: Idea[];
}

const episodes: EpisodeData[] = JSON.parse(readFileSync(episodesPath, 'utf-8'));
const episodeMap = new Map(episodes.map(ep => [ep.videoId, ep]));

const existing: EpisodeIdeas[] = existsSync(ideasPath)
  ? JSON.parse(readFileSync(ideasPath, 'utf-8'))
  : [];
const existingIds = new Set(existing.map(e => e.videoId));

const transcriptFiles = readdirSync(transcriptsDir).filter(f => f.endsWith('.json'));

const newEntries: EpisodeIdeas[] = [];

for (const file of transcriptFiles) {
  const videoId = file.replace('.json', '');
  if (existingIds.has(videoId)) continue;

  const transcript: Transcript = JSON.parse(readFileSync(join(transcriptsDir, file), 'utf-8'));
  const fullText = transcript.segments.map(s => s.text).join(' ');
  const episode = episodeMap.get(videoId);
  const title = episode?.title ?? videoId;

  console.log(`\n=== ${title} (${videoId}) ===`);
  console.log(`Transcript length: ${fullText.length} chars`);
  console.log(`Preview: ${fullText.slice(0, 300)}...`);

  newEntries.push({
    videoId,
    title,
    ideas: [],
  });
}

if (newEntries.length === 0) {
  console.log('\nAll episodes already have entries in ideas.json');
} else {
  const merged = [...existing, ...newEntries];
  writeFileSync(ideasPath, JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${merged.length} entries to ideas.json (${newEntries.length} new)`);
  console.log('Ideas arrays are empty — the agent should fill them in by analyzing transcripts.');
}
