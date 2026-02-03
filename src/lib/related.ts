import type { Episode } from './episodes';
import { TAGS_BY_VIDEO_ID, getEpisodeTags } from './tags';

export { getEpisodeTags } from './tags';

const STOPWORDS = new Set([
  // Indonesian
  'dan', 'yang', 'dengan', 'di', 'ke', 'dari', 'untuk', 'pada', 'ini', 'itu', 'atau', 'juga',
  'kami', 'kita', 'kalian', 'anda', 'dalam', 'sebagai', 'jadi', 'agar', 'bisa', 'lebih',
  // Common show words
  'ngobrolin', 'web', 'episode', 'ep', 'feat', 'bareng', 'bersama',
  // English
  'the', 'and', 'with', 'from', 'for', 'to', 'in', 'on', 'of', 'a', 'an',
]);

// Calculate IDF (Inverse Document Frequency) for each tag
function calculateIDF(): Record<string, number> {
  const tagCounts: Record<string, number> = {};
  const totalDocs = Object.keys(TAGS_BY_VIDEO_ID).length;

  for (const videoTags of Object.values(TAGS_BY_VIDEO_ID)) {
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

function tokenize(text: string): Set<string> {
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .filter((t) => !STOPWORDS.has(t));

  return new Set(tokens);
}

function textSimilarity(a: Episode, b: Episode): number {
  const aText = `${a.title} ${a.brief ?? ''}`;
  const bText = `${b.title} ${b.brief ?? ''}`;

  const aTokens = tokenize(aText);
  const bTokens = tokenize(bText);

  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) intersection++;
  }

  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
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
    tagScore: calculateSimilarity(currentEpisode.videoId, episode.videoId),
    textScore: textSimilarity(currentEpisode, episode),
  }));

  // Sort by tag similarity (best signal), then title/brief similarity, then date (newer first).
  scored.sort((a, b) => {
    if (b.tagScore !== a.tagScore) return b.tagScore - a.tagScore;
    if (b.textScore !== a.textScore) return b.textScore - a.textScore;
    return (
      new Date(b.episode.publishedAt).getTime() -
      new Date(a.episode.publishedAt).getTime()
    );
  });

  const top = scored.slice(0, limit).map((s) => s.episode);

  // If everything is a "0 match", fall back to the most recent episodes.
  const hasAnySignal = scored.some((s) => s.tagScore > 0 || s.textScore > 0);
  if (!hasAnySignal) {
    return candidates
      .slice()
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, limit);
  }

  return top;
}
