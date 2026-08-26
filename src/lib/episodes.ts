import episodesData from '../data/episodes.json';
import { resolveSlug } from './slug';

// Re-exported rather than redefined: `./slug` owns both. `episodes.test.ts`
// imports `slugify` from here, and the pair is retained deliberately as
// coordination insurance for concurrent work on this file — not dead code.
// Do not remove, and do not reintroduce a local copy.
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

/**
 * Format an ISO-8601 duration for display, in Indonesian.
 *
 * Every one of the 178 episodes carries a duration and none of them showed it.
 * The median episode is 85 minutes, so "is this worth my evening" is a real
 * question the cards were refusing to answer.
 */
export function formatDuration(iso: string | undefined | null): string | null {
  if (!iso) return null;

  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso.trim());
  if (!match) return null;

  const [, h, m, sec] = match;
  if (h === undefined && m === undefined && sec === undefined) return null;

  const hours = Number(h ?? 0);
  let minutes = Number(m ?? 0);

  // One real episode ("Ngobrolin Lebaran") is 50 seconds. Showing "0m" reads
  // as missing data, so round any non-zero duration up to a minute.
  if (hours === 0 && minutes === 0) minutes = 1;

  if (hours > 0) return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  return `${minutes}m`;
}

// Boilerplate that opens most YouTube descriptions. 109 of 178 episodes shared
// one identical sentence, so after truncation the card text was the same string
// on 61% of the archive grid.
const BOILERPLATE_LINE =
  /^(?:\s*[\p{Extended_Pictographic}️‍]*\s*)?(?:yuk mari kita diskusi|selasa malam waktunya|jangan lupa (?:like|subscribe)|dapatkan hanya di)\b.*$/iu;

// Sponsor blocks and bare links carry no information about the episode.
const PROMO_LINE = /(?:kode\s*:|diskon|promo|https?:\/\/|\bOFF\b|^\s*[\p{Extended_Pictographic}️‍]+\s*$)/iu;

/**
 * The text a card should show under the title.
 *
 * Prefers the editorial brief. Falls back to the YouTube description with its
 * shared boilerplate, sponsor copy and bare links removed, and returns null
 * rather than an empty string when nothing informative survives - a card with
 * no blurb reads better than a card repeating the same sentence as 75 others.
 */
export function getCardBlurb(
  episode: { brief?: string; description?: string }
): string | null {
  const brief = episode.brief?.trim();
  if (brief) return brief;

  const description = episode.description;
  if (!description) return null;

  const kept = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !BOILERPLATE_LINE.test(line))
    .filter((line) => !PROMO_LINE.test(line))
    .filter((line) => !line.startsWith('#'));

  const text = kept.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
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

/**
 * Slugs of the newest episodes in the archive, for the "BARU" badge.
 *
 * The badge used to be positional (`isNew={index < 2}`), so it marked the first
 * two cards of whatever list it appeared in: /tags/web-components badged two
 * May-2024 episodes as new. Recency belongs to the episode, not to its position
 * in a filtered grid.
 */
const NEW_EPISODE_COUNT = 2;

let _newSlugs: Set<string> | null = null;

export function getNewEpisodeSlugs(): Set<string> {
  if (_newSlugs) return _newSlugs;

  // getEpisodes() is already sorted newest first.
  _newSlugs = new Set(
    getEpisodes()
      .slice(0, NEW_EPISODE_COUNT)
      .map((ep) => ep.slug)
  );
  return _newSlugs;
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


