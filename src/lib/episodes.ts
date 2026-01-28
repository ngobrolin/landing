import episodesData from '../data/episodes.json';

export interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  slug: string;
  episodeNumber: number;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

let _cache: Episode[] | null = null;

export function getEpisodes(): Episode[] {
  if (_cache) return _cache;

  _cache = episodesData
    .map((ep) => ({
      ...ep,
      slug: `${ep.videoId}-${slugify(ep.title)}`,
      episodeNumber: 0, // placeholder, set after sorting
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


