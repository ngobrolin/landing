import { describe, it, expect } from 'vitest';
import {
  slugify,
  getBrief,
  getEpisodes,
  getEpisodeBySlug,
  getEpisodeByVideoId,
  getEpisodesByYear,
  getAvailableYears,
  getYearCount,
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

describe('getBrief', () => {
  const existingVideoIds = ['x1jm57leZW0', 'Tkh8-LleLws', 'ZcYNuHirHOA'];
  const nonExistentVideoId = 'non-existent-video-id-12345';

  it('returns brief string when summary exists', () => {
    const brief = getBrief(existingVideoIds[0]);
    expect(brief).toBeDefined();
    expect(typeof brief).toBe('string');
    expect(brief?.length).toBeGreaterThan(0);
  });

  it('returns undefined when summary does not exist', () => {
    const brief = getBrief(nonExistentVideoId);
    expect(brief).toBeUndefined();
  });

  it('returns consistent brief for same videoId', () => {
    const brief1 = getBrief(existingVideoIds[0]);
    const brief2 = getBrief(existingVideoIds[0]);
    expect(brief1).toBe(brief2);
  });

  it('returns different briefs for different videoIds', () => {
    const brief1 = getBrief(existingVideoIds[0]);
    const brief2 = getBrief(existingVideoIds[1]);
    // Briefs should be different (unless they coincidentally have the same content)
    expect(brief1).not.toBe(brief2);
  });

  it('handles empty videoId gracefully', () => {
    const brief = getBrief('');
    expect(brief).toBeUndefined();
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

  it('populates brief field for episodes with summaries', () => {
    const episodes = getEpisodes();
    const episodesWithSummaries = ['x1jm57leZW0', 'Tkh8-LleLws', 'ZcYNuHirHOA'];

    for (const videoId of episodesWithSummaries) {
      const episode = episodes.find(ep => ep.videoId === videoId);
      expect(episode).toBeDefined();
      expect(episode?.brief).toBeDefined();
      expect(typeof episode?.brief).toBe('string');
      expect(episode?.brief?.length).toBeGreaterThan(0);
    }
  });

  it('does not populate brief for episodes without summaries', () => {
    const episodes = getEpisodes();
    // Find an episode that definitely doesn't have a summary
    const episodeWithoutSummary = episodes.find(ep => !ep.brief);

    // At least one episode should not have a summary (or all have summaries, which is also valid)
    if (episodeWithoutSummary) {
      expect(episodeWithoutSummary.brief).toBeUndefined();
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

describe('getEpisodesByYear', () => {
  it('should return episodes from a specific year', () => {
    const episodes = getEpisodesByYear(2026);
    expect(Array.isArray(episodes)).toBe(true);
    episodes.forEach(ep => {
      expect(ep.publishedAt).toMatch(/^2026-/);
    });
  });

  it('should return episodes sorted by published date descending', () => {
    const episodes = getEpisodesByYear(2025);
    for (let i = 0; i < episodes.length - 1; i++) {
      const current = new Date(episodes[i].publishedAt).getTime();
      const next = new Date(episodes[i + 1].publishedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('should return empty array for year with no episodes', () => {
    const episodes = getEpisodesByYear(2020);
    expect(episodes).toEqual([]);
  });
});

describe('getAvailableYears', () => {
  it('should return array of years with episodes', () => {
    const years = getAvailableYears();
    expect(Array.isArray(years)).toBe(true);
    expect(years.length).toBeGreaterThan(0);
  });

  it('should return years sorted descending (newest first)', () => {
    const years = getAvailableYears();
    for (let i = 0; i < years.length - 1; i++) {
      expect(years[i]).toBeGreaterThan(years[i + 1]);
    }
  });

  it('should contain unique years only', () => {
    const years = getAvailableYears();
    const uniqueYears = new Set(years);
    expect(years.length).toBe(uniqueYears.size);
  });
});

describe('getYearCount', () => {
  it('should return number of episodes in a year', () => {
    const count = getYearCount(2026);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 for year with no episodes', () => {
    const count = getYearCount(2020);
    expect(count).toBe(0);
  });

  it('should match length of getEpisodesByYear', () => {
    const year = getAvailableYears()[0];
    const count = getYearCount(year);
    const episodes = getEpisodesByYear(year);
    expect(count).toBe(episodes.length);
  });
});


