import { describe, expect, it } from 'vitest';
import { TECH_KEYWORDS } from '../../scripts/lib/tag-extraction';
import { getEpisodes } from './episodes';
import { formatTagLabel, getAllTagsWithCounts, TAGS_BY_VIDEO_ID } from './tags';
import { TOPIC_COPY, getRelatedTags, getTagDescription, getTagIntro } from './tag-topics';

describe('getTagIntro', () => {
  it('uses the curated intro for a key topic', () => {
    const intro = getTagIntro('seo', 'SEO', 7);
    expect(intro.startsWith(TOPIC_COPY.seo.intro)).toBe(true);
    expect(intro).toMatch(/ringkasan/);
    expect(intro).toMatch(/transkrip/);
  });

  it('falls back to a sentence naming the topic, the count, summaries and transcripts', () => {
    const intro = getTagIntro('monorepo', 'Monorepo', 4);
    expect(intro).toContain('Monorepo');
    expect(intro).toContain('4 episode');
    expect(intro).toMatch(/ringkasan/);
    expect(intro).toMatch(/transkrip/);
  });
});

describe('getTagDescription', () => {
  it('names the topic focus for a key topic', () => {
    expect(getTagDescription('css', 'CSS', 52)).toBe(
      `52 episode Ngobrolin WEB tentang CSS: ${TOPIC_COPY.css.focus}. Ada ringkasan dan transkrip yang bisa dicari.`,
    );
  });

  it('falls back to the topic and count for any other tag', () => {
    expect(getTagDescription('monorepo', 'Monorepo', 4)).toBe(
      '4 episode Ngobrolin WEB tentang Monorepo, podcast web development berbahasa Indonesia. Ada ringkasan dan transkrip yang bisa dicari.',
    );
  });

  // Holds for whatever tags the extractor produces, not just today's set.
  it('fits a search snippet and avoids em dashes for every published tag', () => {
    for (const { tag, count } of getAllTagsWithCounts()) {
      // 999 leaves room for any tag to grow into three digits.
      const description = getTagDescription(tag, formatTagLabel(tag), 999);
      expect(description.length, tag).toBeLessThanOrEqual(160);
      expect(description, tag).not.toContain('—');
      expect(getTagIntro(tag, formatTagLabel(tag), count), tag).not.toContain('—');
    }
  });
});

describe('TOPIC_COPY', () => {
  it('only describes tags the extractor can produce', () => {
    for (const tag of Object.keys(TOPIC_COPY)) {
      expect(Object.keys(TECH_KEYWORDS), tag).toContain(tag);
    }
  });
});

describe('getRelatedTags', () => {
  const tags = {
    a: ['css', 'javascript', 'ui'],
    b: ['css', 'javascript'],
    c: ['css', 'design', 'ui'],
    d: ['css', 'animation'],
    e: ['javascript', 'react'],
    ghost: ['css', 'react', 'react', 'react'],
  };
  const real = new Set(['a', 'b', 'c', 'd', 'e']);

  it('ranks co-occurring tags by shared episodes, then by name', () => {
    expect(getRelatedTags('css', tags, real)).toEqual([
      { tag: 'javascript', count: 2 },
      { tag: 'ui', count: 2 },
      { tag: 'animation', count: 1 },
      { tag: 'design', count: 1 },
    ]);
  });

  it('never lists the tag itself or counts episodes that do not exist', () => {
    const related = getRelatedTags('css', tags, real).map((r) => r.tag);
    expect(related).not.toContain('css');
    expect(related).not.toContain('react');
  });

  it('stops at the limit', () => {
    expect(getRelatedTags('css', tags, real, 2).map((r) => r.tag)).toEqual(['javascript', 'ui']);
  });

  it('returns nothing for a tag no real episode carries', () => {
    expect(getRelatedTags('svelte', tags, real)).toEqual([]);
  });

  it('only links to tags that have their own page', () => {
    const published = new Set(getAllTagsWithCounts().map((t) => t.tag));
    const realIds = new Set(getEpisodes().map((ep) => ep.videoId));
    for (const tag of published) {
      for (const related of getRelatedTags(tag, TAGS_BY_VIDEO_ID, realIds)) {
        expect(published.has(related.tag), `${tag} -> ${related.tag}`).toBe(true);
      }
    }
  });
});
