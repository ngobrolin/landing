import { describe, it, expect } from 'vitest';
import {
  SEARCH_KEYS,
  SHORT_QUERY_KEYS,
  buildSearchDocuments,
  isShortQuery,
  searchShortQuery,
} from './search';
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

describe('searchShortQuery', () => {
  const docs = buildSearchDocuments(getEpisodes());

  it('treats one- and two-character queries as short, and nothing longer', () => {
    expect(isShortQuery('a')).toBe(true);
    expect(isShortQuery('ai')).toBe(true);
    expect(isShortQuery(' ui ')).toBe(true);
    expect(isShortQuery('css')).toBe(false);
    expect(isShortQuery('')).toBe(false);
    expect(isShortQuery('   ')).toBe(false);
  });

  // The bound has to be tight enough that the other broken implementation -
  // dropping minMatchCharLength, which returns all 178 for "ai" and "go" -
  // fails too. Exact equality would be brittle: src/data/summaries is filled in
  // by a separate process (98 of 178 today) and keyPoints feed the index, so
  // these counts grow as summaries land. Half the archive is the ceiling.
  const MAX_SHORT_QUERY_HITS = 80;

  it.each(['ai', 'ui', 'ux', 'js', 'go'])(
    'returns some but not most of the archive for %s',
    (query) => {
      const hits = searchShortQuery(query, docs);
      expect(hits.length, `${query} found nothing`).toBeGreaterThan(0);
      expect(hits.length, `${query} matched most of the archive`).toBeLessThan(
        MAX_SHORT_QUERY_HITS
      );
      expect(hits.length).toBeLessThan(docs.length);
    }
  );

  it('finds the episode literally titled "Ngobrolin AI" when searching ai', () => {
    const slugs = searchShortQuery('ai', docs).map((d) => d.slug);
    expect(slugs).toContain('M5lUhWTF9As-ngobrolin-ai-ngobrolin-web');
  });

  it('finds the UI Component Library episode when searching ui', () => {
    const slugs = searchShortQuery('ui', docs).map((d) => d.slug);
    expect(
      slugs.some((slug) => slug.startsWith('fnKxblQw57c-')),
      'expected the UI Component Library episode'
    ).toBe(true);
  });

  it('ranks a title match above a key-points-only match', () => {
    const hits = searchShortQuery('ai', docs);
    const firstNonTitle = hits.findIndex((d) => !/(^|[^a-z0-9])ai([^a-z0-9]|$)/.test(d.title.toLowerCase()));
    if (firstNonTitle === -1) return;
    for (const doc of hits.slice(firstNonTitle)) {
      expect(/(^|[^a-z0-9])ai([^a-z0-9]|$)/.test(doc.title.toLowerCase())).toBe(false);
    }
  });

  // The trap scripts/lib/tag-extraction.ts already documents: Indonesian prose
  // is full of these substrings, so a bare includes() tags or matches
  // everything.
  it('does not match a short query inside an Indonesian word', () => {
    const noise = [
      {
        slug: 'x',
        title: 'Mulai berbagai sebagai sesuai bagaimana',
        keyPoints: 'membangun mencapai selain',
      },
    ];
    expect(searchShortQuery('ai', noise)).toEqual([]);
    expect(searchShortQuery('go', noise)).toEqual([]);
    expect(searchShortQuery('bun', noise)).toEqual([]);
  });

  it('matches at a string edge and around punctuation', () => {
    const docs2 = [
      { slug: 'a', title: 'AI', keyPoints: '' },
      { slug: 'b', title: 'Ngobrolin (UI), lanjut', keyPoints: '' },
      { slug: 'c', title: 'sesuatu', keyPoints: 'node.js dan js' },
    ];
    expect(searchShortQuery('ai', docs2).map((d) => d.slug)).toEqual(['a']);
    expect(searchShortQuery('ui', docs2).map((d) => d.slug)).toEqual(['b']);
    expect(searchShortQuery('js', docs2).map((d) => d.slug)).toEqual(['c']);
  });

  // description and brief are the YouTube blurb and prose written from it, and
  // they are where the Indonesian false positives live.
  it('does not search description or brief', () => {
    expect(SHORT_QUERY_KEYS).toEqual(['title', 'keyPoints']);
    const doc = {
      slug: 'x',
      title: 'Judul netral',
      description: 'Kita mulai dengan ai',
      brief: 'ai',
      keyPoints: '',
    };
    expect(searchShortQuery('ai', [doc])).toEqual([]);
  });

  it('returns nothing for a blank query', () => {
    expect(searchShortQuery('   ', docs)).toEqual([]);
  });

  it('escapes regex metacharacters rather than treating them as a pattern', () => {
    const docs2 = [{ slug: 'a', title: 'C++ dan hal lain', keyPoints: '' }];
    expect(() => searchShortQuery('.', docs2)).not.toThrow();
    expect(searchShortQuery('.', docs2)).toEqual([]);
  });
});
