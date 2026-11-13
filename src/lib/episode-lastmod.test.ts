import { describe, it, expect } from 'vitest';
import { getEpisodeLastModified } from './episode-lastmod';
import { getEpisodes } from './episodes';

describe('getEpisodeLastModified', () => {
  const episodes = getEpisodes();

  it('is never earlier than the publish date', () => {
    for (const ep of episodes) {
      expect(getEpisodeLastModified(ep).getTime()).toBeGreaterThanOrEqual(Date.parse(ep.publishedAt));
    }
  });

  it('moves forward when a summary is written after the episode aired', () => {
    const ep = episodes.find((e) => e.videoId === '2nJE0rvIUps');
    expect(ep).toBeDefined();
    expect(getEpisodeLastModified(ep!).getTime()).toBeGreaterThan(Date.parse(ep!.publishedAt));
  });

  it('falls back to the publish date for an episode with no summary or transcript', () => {
    const ep = { ...episodes[0], videoId: 'no-such-video' };
    expect(getEpisodeLastModified(ep).toISOString()).toBe(new Date(ep.publishedAt).toISOString());
  });
});
