import episodesData from '../data/episodes.json';
import { resolveSlug } from './slug';

// Retained deliberately as coordination insurance for concurrent work on this
// file — not dead code. Do not remove.
export { slugify, resolveSlug } from './slug';

export interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  slug: string;
  episodeNumber: number;
  brief?: string;
  duration?: string;  // NEW: ISO 8601 format, e.g., "PT4M13S"
}

interface Summary {
  brief: string;
  keyPoints: string[];
}

// Cache summaries at module load time for performance
const _summariesCache = import.meta.glob('../data/summaries/*.json', { eager: true });

export function getBrief(videoId: string): string | undefined {
  const key = `../data/summaries/${videoId}.json`;
  const module = _summariesCache[key] as { default: Summary } | undefined;
  return module?.default.brief;
}

let _cache: Episode[] | null = null;

export function getEpisodes(): Episode[] {
  if (_cache) return _cache;

  _cache = episodesData
    .map((ep) => ({
      ...ep,
      slug: resolveSlug(ep),
      thumbnail: ep.thumbnail.includes('i.ytimg.com')
        ? `https://i.ytimg.com/vi_webp/${ep.videoId}/hqdefault.webp`
        : ep.thumbnail,
      description: `${ep.description}\n\nKunjungi https://ngobrol.in untuk catatan, tautan dan informasi topik lainnya.`,
      episodeNumber: 0, // placeholder, set after sorting
      brief: getBrief(ep.videoId),
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map((ep, idx, arr) => ({
      ...ep,
      episodeNumber: arr.length - idx,
    }));

  return _cache;
}

export function getEpisodeBySlug(slug: string): Episode | undefined {
  const episodes = getEpisodes();
  return episodes.find(ep => ep.slug === slug);
}

export function getEpisodeByVideoId(videoId: string): Episode | undefined {
  const episodes = getEpisodes();
  return episodes.find(ep => ep.videoId === videoId);
}

// Cache for year-based queries
let _episodesByYearCache: Map<number, Episode[]> | null = null;

export function getEpisodesByYear(year: number): Episode[] {
  const episodes = getEpisodes();

  // Initialize cache if needed
  if (!_episodesByYearCache) {
    _episodesByYearCache = new Map();

    // Group episodes by year
    for (const ep of episodes) {
      const epYear = new Date(ep.publishedAt).getUTCFullYear();
      if (!_episodesByYearCache.has(epYear)) {
        _episodesByYearCache.set(epYear, []);
      }
      _episodesByYearCache.get(epYear)!.push(ep);
    }
  }

  return _episodesByYearCache.get(year) || [];
}

export function getAvailableYears(): number[] {
  const episodes = getEpisodes();
  const years = new Set<number>();

  for (const ep of episodes) {
    const year = new Date(ep.publishedAt).getUTCFullYear();
    years.add(year);
  }

  return Array.from(years).sort((a, b) => b - a);
}

export function getYearCount(year: number): number {
  return getEpisodesByYear(year).length;
}


