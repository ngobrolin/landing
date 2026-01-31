import episodesData from '../data/episodes.json';

export interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  slug: string;
  episodeNumber: number;
  brief?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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
      slug: `${ep.videoId}-${slugify(ep.title)}`,
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


