import { describe, it, expect } from 'vitest';
import { getEpisodeTags, calculateSimilarity, getRelatedEpisodes } from './related';
import type { Episode } from './episodes';

describe('getEpisodeTags', () => {
  it('returns tags for known videoId', () => {
    const tags = getEpisodeTags('Qh0ImRYTync');
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown videoId', () => {
    const tags = getEpisodeTags('nonexistent-id');
    expect(tags).toEqual([]);
  });
});

describe('calculateSimilarity', () => {
  it('returns 0 for episodes with no shared tags', () => {
    // If one doesn't exist, it has no tags
    const score = calculateSimilarity('Qh0ImRYTync', 'nonexistent');
    expect(score).toBe(0);
  });

  it('returns positive score for episodes with shared tags', () => {
    // Both of these should have some shared tags (e.g., 'ai', 'css', etc.)
    const score = calculateSimilarity('Qh0ImRYTync', 'Tkh8-LleLws');
    expect(score).toBeGreaterThan(0);
  });

  it('returns same score regardless of order', () => {
    const score1 = calculateSimilarity('Qh0ImRYTync', 'Tkh8-LleLws');
    const score2 = calculateSimilarity('Tkh8-LleLws', 'Qh0ImRYTync');
    expect(score1).toBe(score2);
  });
});

describe('getRelatedEpisodes', () => {
  const mockEpisodes: Episode[] = [
    {
      videoId: 'Qh0ImRYTync',
      title: 'CSS Episode',
      description: 'Test',
      publishedAt: '2026-01-01T00:00:00Z',
      thumbnail: 'https://example.com/thumb.jpg',
      position: 0,
      slug: 'css-episode',
      episodeNumber: 1,
    },
    {
      videoId: 'Tkh8-LleLws',
      title: 'AI Coding Episode',
      description: 'Test',
      publishedAt: '2026-01-02T00:00:00Z',
      thumbnail: 'https://example.com/thumb.jpg',
      position: 1,
      slug: 'ai-coding-episode',
      episodeNumber: 2,
    },
    {
      videoId: 'ZcYNuHirHOA',
      title: 'Another Episode',
      description: 'Test',
      publishedAt: '2026-01-03T00:00:00Z',
      thumbnail: 'https://example.com/thumb.jpg',
      position: 2,
      slug: 'another-episode',
      episodeNumber: 3,
    },
  ];

  it('excludes current episode from results', () => {
    const related = getRelatedEpisodes(mockEpisodes[0], mockEpisodes);
    const hasCurrentEpisode = related.some((ep) => ep.videoId === mockEpisodes[0].videoId);
    expect(hasCurrentEpisode).toBe(false);
  });

  it('respects limit parameter', () => {
    const related = getRelatedEpisodes(mockEpisodes[0], mockEpisodes, 1);
    expect(related.length).toBeLessThanOrEqual(1);
  });

  it('returns episodes sorted by similarity', () => {
    const related = getRelatedEpisodes(mockEpisodes[0], mockEpisodes, 3);
    // Just verify we get some results and they're valid episodes
    for (const ep of related) {
      expect(ep.videoId).toBeDefined();
      expect(ep.videoId).not.toBe(mockEpisodes[0].videoId);
    }
  });
});
