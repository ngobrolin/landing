import { describe, it, expect } from 'vitest';
import {
  slugify,
  getEpisodes,
  getEpisodeBySlug,
  getEpisodeByVideoId,
} from './episodes';

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('replaces multiple spaces with single dash', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('collapses multiple dashes into one', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Episode 123')).toBe('episode-123');
  });
});

describe('getEpisodes', () => {
  it('returns an array', () => {
    const episodes = getEpisodes();
    expect(Array.isArray(episodes)).toBe(true);
  });

  it('each episode has slug and episodeNumber', () => {
    const episodes = getEpisodes();
    for (const ep of episodes) {
      expect(ep).toHaveProperty('slug');
      expect(ep).toHaveProperty('episodeNumber');
      expect(typeof ep.slug).toBe('string');
      expect(typeof ep.episodeNumber).toBe('number');
    }
  });

  it('is sorted by date descending', () => {
    const episodes = getEpisodes();
    for (let i = 1; i < episodes.length; i++) {
      const prevDate = new Date(episodes[i - 1].publishedAt).getTime();
      const currDate = new Date(episodes[i].publishedAt).getTime();
      expect(prevDate).toBeGreaterThanOrEqual(currDate);
    }
  });

  it('transforms YouTube thumbnails to WebP', () => {
    const episodes = getEpisodes();
    for (const ep of episodes) {
      if (ep.thumbnail.includes('i.ytimg.com')) {
        expect(ep.thumbnail).toMatch(/https:\/\/i\.ytimg\.com\/vi_webp\/.*\/hqdefault\.webp/);
      }
    }
  });
});

describe('getEpisodeBySlug', () => {
  it('finds episode by slug', () => {
    const episodes = getEpisodes();
    if (episodes.length > 0) {
      const firstEp = episodes[0];
      const found = getEpisodeBySlug(firstEp.slug);
      expect(found).toBeDefined();
      expect(found?.videoId).toBe(firstEp.videoId);
    }
  });

  it('returns undefined for non-existent slug', () => {
    const found = getEpisodeBySlug('non-existent-slug-12345');
    expect(found).toBeUndefined();
  });
});

describe('getEpisodeByVideoId', () => {
  it('finds episode by videoId', () => {
    const episodes = getEpisodes();
    if (episodes.length > 0) {
      const firstEp = episodes[0];
      const found = getEpisodeByVideoId(firstEp.videoId);
      expect(found).toBeDefined();
      expect(found?.slug).toBe(firstEp.slug);
    }
  });

  it('returns undefined for non-existent videoId', () => {
    const found = getEpisodeByVideoId('non-existent-video-id');
    expect(found).toBeUndefined();
  });
});


