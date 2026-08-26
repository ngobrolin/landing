import { describe, it, expect } from 'vitest';
import { SEARCH_KEYS, buildSearchDocuments } from './search';
import { getEpisodes } from './episodes';

describe('buildSearchDocuments', () => {
  const docs = buildSearchDocuments(getEpisodes());

  it('produces one document per episode', () => {
    expect(docs.length).toBe(getEpisodes().length);
  });

  it('carries the slug so a hit can be mapped back to its rendered card', () => {
    for (const doc of docs) {
      expect(doc.slug, 'every document needs a slug').toBeTruthy();
    }
  });

  // The island used to ship thumbnail, publishedAt, episodeNumber and isNew,
  // none of which Fuse ever read - about 14KB of payload for nothing.
  it('carries nothing beyond the slug and the searchable fields', () => {
    const allowed = new Set(['slug', ...SEARCH_KEYS]);
    for (const key of Object.keys(docs[0])) {
      expect(allowed.has(key), `${key} is shipped but never searched`).toBe(true);
    }
  });

  it('indexes key points, which used not to be searchable at all', () => {
    expect(SEARCH_KEYS).toContain('keyPoints');

    // "keychron" appears only in one episode's keyPoints.
    const hit = docs.find((d) => d.keyPoints?.toLowerCase().includes('keychron'));
    expect(hit, 'expected a document carrying the keychron key point').toBeDefined();
    expect(hit!.slug).toMatch(/^00ZHWKLlp5g-/);
  });

  it('leaves key points empty rather than undefined-ish for unsummarised episodes', () => {
    for (const doc of docs) {
      expect(typeof doc.keyPoints).toBe('string');
    }
  });

  it('flattens key points to a single string rather than an array', () => {
    // Array syntax in the island is pure payload; Fuse only needs the text.
    const withPoints = docs.find((d) => d.keyPoints.length > 0);
    expect(typeof withPoints!.keyPoints).toBe('string');
  });

  it('covers every episode that has a summary', () => {
    const withPoints = docs.filter((d) => d.keyPoints.length > 0);
    // Coverage tracks src/data/summaries, which is filled in by a separate
    // process, so assert it is non-trivial rather than pinning a number.
    expect(withPoints.length).toBeGreaterThan(50);
    expect(withPoints.length).toBeLessThanOrEqual(docs.length);
  });
});

describe('SEARCH_KEYS', () => {
  it('is the single place that decides what is searchable', () => {
    expect(SEARCH_KEYS).toEqual(
      expect.arrayContaining(['title', 'description', 'brief', 'keyPoints'])
    );
  });

  it('names only fields the documents actually carry', () => {
    const doc = buildSearchDocuments(getEpisodes())[0];
    for (const key of SEARCH_KEYS) {
      expect(key in doc, `${key} is searched but never shipped`).toBe(true);
    }
  });
});
