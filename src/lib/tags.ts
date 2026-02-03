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
    ui: 'UI',
    ux: 'UX',
    pwa: 'PWA',
    api: 'API',
  };

  if (overrides[tag]) return overrides[tag];

  return tag
    .split('-')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

