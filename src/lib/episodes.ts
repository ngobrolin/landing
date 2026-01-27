import episodesData from '../data/episodes.json';

export interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  position: number;
  slug: string;
  episodeNumber: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function getEpisodes(): Episode[] {
  return episodesData
    .map((ep, index) => ({
      ...ep,
      slug: `${ep.videoId}-${slugify(ep.title)}`,
      episodeNumber: episodesData.length - index
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getEpisodeBySlug(slug: string): Episode | undefined {
  const episodes = getEpisodes();
  return episodes.find(ep => ep.slug === slug);
}

export function getEpisodeByVideoId(videoId: string): Episode | undefined {
  const episodes = getEpisodes();
  return episodes.find(ep => ep.videoId === videoId);
}

export function getRecentEpisodes(count: number = 8): Episode[] {
  return getEpisodes().slice(0, count);
}
