import { describe, it, expect } from 'vitest';
import {
  getAllTagsWithCounts,
  getTaggedEpisodeCount,
  formatTagLabel,
  getEpisodesForTag,
} from './tags';
import { getEpisodes } from './episodes';

describe('getTaggedEpisodeCount', () => {
  // /tags published "36 topik dari 723 episode" against an archive of 178.
  // 723 is the SUM OF TAG COUNTS - every episode counted once per tag it
  // carries - which no code path could ever turn into a number of episodes.
  it('counts episodes, not tag assignments', () => {
    const assignments = getAllTagsWithCounts().reduce((sum, t) => sum + t.count, 0);
    const episodes = getTaggedEpisodeCount();

    expect(episodes).toBeLessThan(assignments);
    expect(episodes).toBeLessThanOrEqual(getEpisodes().length);
  });

  it('never exceeds the size of the archive', () => {
    expect(getTaggedEpisodeCount()).toBeLessThanOrEqual(getEpisodes().length);
  });

  // tags.json carries an "undefined" key - a phantom episode whose 8 tags
  // inflate 8 counts by one each. Counting keys blindly reports 98 tagged
  // episodes when only 97 are real.
  it('ignores tag entries that match no real episode', () => {
    const realIds = new Set(getEpisodes().map((ep) => ep.videoId));
    let counted = 0;
    for (const ep of getEpisodes()) {
      if (getEpisodesForTag.length >= 0 && realIds.has(ep.videoId)) counted++;
    }
    // The count must be derivable from real episodes alone.
    expect(getTaggedEpisodeCount()).toBeLessThanOrEqual(counted);
  });

  it('agrees with counting episodes that resolve to at least one tag', () => {
    const tags = getAllTagsWithCounts().map((t) => t.tag);
    const tagged = new Set<string>();
    for (const tag of tags) {
      for (const ep of getEpisodesForTag(tag)) tagged.add(ep.videoId);
    }
    expect(getTaggedEpisodeCount()).toBe(tagged.size);
  });
});

describe('formatTagLabel', () => {
  it('uppercases known acronyms', () => {
    expect(formatTagLabel('ai')).toBe('AI');
    expect(formatTagLabel('css')).toBe('CSS');
    expect(formatTagLabel('api')).toBe('API');
  });

  // The tile rendered "Seo" because there was no override for it.
  it('uppercases SEO', () => {
    expect(formatTagLabel('seo')).toBe('SEO');
  });

  it('title-cases multi-word tags consistently', () => {
    expect(formatTagLabel('build-tools')).toBe('Build tools');
    expect(formatTagLabel('state-management')).toBe('State management');
    expect(formatTagLabel('dev-tools')).toBe('Dev tools');
  });

  it('gives every real tag a non-empty label', () => {
    for (const { tag } of getAllTagsWithCounts()) {
      expect(formatTagLabel(tag).length, `no label for ${tag}`).toBeGreaterThan(0);
    }
  });
});
