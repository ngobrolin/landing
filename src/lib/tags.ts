import tagsData from '../data/tags.json';
import { getEpisodes, type Episode } from './episodes';

export const TAGS_BY_VIDEO_ID: Record<string, string[]> = tagsData;

export function getEpisodeTags(videoId: string): string[] {
  return TAGS_BY_VIDEO_ID[videoId] || [];
}

export function getAllTagsWithCounts(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();

  for (const episodeTags of Object.values(TAGS_BY_VIDEO_ID)) {
    for (const tag of episodeTags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * How many real episodes carry at least one tag.
 *
 * /tags used to print the SUM OF TAG COUNTS here - "36 topik dari 723 episode"
 * against an archive of 178 - because an episode was counted once per tag it
 * carries. Counting keys in tags.json is not right either: the file holds an
 * "undefined" key, a phantom episode whose tags inflate 8 counts by one each,
 * so a blind key count reports 98 when only 97 are real.
 */
export function getTaggedEpisodeCount(): number {
  const realIds = new Set(getEpisodes().map((ep) => ep.videoId));
  let count = 0;
  for (const videoId of Object.keys(TAGS_BY_VIDEO_ID)) {
    if (realIds.has(videoId) && TAGS_BY_VIDEO_ID[videoId]!.length > 0) count++;
  }
  return count;
}

export function getEpisodesForTag(tag: string): Episode[] {
  const episodes = getEpisodes();
  return episodes.filter((ep) => getEpisodeTags(ep.videoId).includes(tag));
}

export function formatTagLabel(tag: string): string {
  const overrides: Record<string, string> = {
    ai: 'AI',
    'ai-coding': 'AI coding',
    css: 'CSS',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    nextjs: 'Next.js',
    'dev-tools': 'Dev tools',
    'web-components': 'Web Components',
    'state-management': 'State management',
    seo: 'SEO',
    ui: 'UI',
    ux: 'UX',
    pwa: 'PWA',
    api: 'API',
  };

  if (overrides[tag]) return overrides[tag];

  // Sentence case, not title case. The overrides above are mostly sentence
  // case ("Dev tools", "State management", "AI coding") while the fallback
  // used to title-case, so the same grid showed "Dev tools" beside "Build
  // Tools". Proper nouns that need capitals get an override.
  const words = tag.split('-');
  return [
    words[0].slice(0, 1).toUpperCase() + words[0].slice(1),
    ...words.slice(1),
  ].join(' ');
}

