import type { Episode } from './episodes';
import tagsData from '../data/tags.json';

const tags: Record<string, string[]> = tagsData;

// Calculate IDF (Inverse Document Frequency) for each tag
function calculateIDF(): Record<string, number> {
  const tagCounts: Record<string, number> = {};
  const totalDocs = Object.keys(tags).length;

  for (const videoTags of Object.values(tags)) {
    for (const tag of videoTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const idf: Record<string, number> = {};
  for (const [tag, count] of Object.entries(tagCounts)) {
    // Higher IDF = rarer tag = more valuable for similarity
    idf[tag] = Math.log(totalDocs / count) + 1;
  }

  return idf;
}

const idfScores = calculateIDF();

export function getEpisodeTags(videoId: string): string[] {
  return tags[videoId] || [];
}

export function calculateSimilarity(videoId1: string, videoId2: string): number {
  const tags1 = new Set(getEpisodeTags(videoId1));
  const tags2 = new Set(getEpisodeTags(videoId2));

  if (tags1.size === 0 || tags2.size === 0) {
    return 0;
  }

  let score = 0;
  for (const tag of tags1) {
    if (tags2.has(tag)) {
      // Weight shared tags by their IDF (rarer = more valuable)
      score += idfScores[tag] || 1;
    }
  }

  // Normalize by the size of smaller set to favor more specific matches
  const minSize = Math.min(tags1.size, tags2.size);
  return score / minSize;
}

export function getRelatedEpisodes(
  currentEpisode: Episode,
  allEpisodes: Episode[],
  limit = 3
): Episode[] {
  const candidates = allEpisodes.filter(
    (ep) => ep.videoId !== currentEpisode.videoId
  );

  const scored = candidates.map((episode) => ({
    episode,
    score: calculateSimilarity(currentEpisode.videoId, episode.videoId),
  }));

  // Sort by score descending, then by date (newer first) as tiebreaker
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.episode.publishedAt).getTime() - new Date(a.episode.publishedAt).getTime();
  });

  // Only return episodes with some similarity
  return scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.episode);
}
