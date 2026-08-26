import { describe, it, expect } from 'vitest';
import { TECH_KEYWORDS, extractTags } from './tag-extraction';

/**
 * Tag extraction matched bare substrings, which Indonesian detonates.
 *
 * Measured over the 98 summarised episodes before the fix:
 *   ai          98 -> 26   (every tagged episode carried it)
 *   ui          58 -> 25
 *   typescript  35 ->  9
 *   bun         22 ->  4
 *   api         51 -> 34
 *   dev-tools   25 -> 10
 *
 * `ts` (a typescript alias) produced 30 hits and 0 were real. `ml` produced 21
 * and 0 were real.
 */
describe('extractTags', () => {
  const tag = (text: string) => extractTags(text);

  describe('the Indonesian false positives that broke the tag system', () => {
    it('does not read "ai" out of common Indonesian words', () => {
      const words = [
        'mulai',
        'dimulai',
        'memulai',
        'berbagai',
        'sebagai',
        'sesuai',
        'selain',
        'mencapai',
        'sebaiknya',
        'bagaimana',
        'melainkan',
      ];
      for (const word of words) {
        expect(tag(`Kita ${word} membahas web`), `"${word}" produced an ai tag`).not.toContain(
          'ai'
        );
      }
    });

    it('does not read "ai" out of English words either', () => {
      for (const word of ['details', 'availability', 'maintainer', 'rails', 'paint']) {
        expect(tag(`Membahas ${word} di web`), `"${word}"`).not.toContain('ai');
      }
    });

    it('still tags a genuine mention of AI', () => {
      expect(tag('Episode tentang AI dan web')).toContain('ai');
      expect(tag('Membahas machine learning')).toContain('ai');
      expect(tag('artificial intelligence di browser')).toContain('ai');
    });

    it('does not read "ts" out of English plurals', () => {
      for (const word of ['assistants', 'snippets', 'components', 'agents']) {
        expect(tag(`Membahas ${word}`), `"${word}"`).not.toContain('typescript');
      }
    });

    it('still tags a genuine TypeScript mention', () => {
      expect(tag('Membahas TypeScript')).toContain('typescript');
      expect(tag('Kenapa pakai TS di proyek')).toContain('typescript');
    });

    it('does not read "ml" out of html', () => {
      expect(tag('Membahas HTML semantik')).not.toContain('ai');
    });

    it('does not read "bun" out of membangun/dibangun', () => {
      expect(tag('Cara membangun aplikasi web')).not.toContain('bun');
      expect(tag('Situs ini dibangun dengan Astro')).not.toContain('bun');
    });

    it('still tags a genuine Bun mention', () => {
      expect(tag('Membahas Bun sebagai runtime')).toContain('bun');
    });

    it('does not read "db" out of unrelated words', () => {
      expect(tag('Membahas Sandbox dan lain-lain')).not.toContain('database');
      expect(tag('Pakai DB Postgres')).toContain('database');
    });
  });

  describe('multi-word and punctuated keywords', () => {
    it('matches dotted framework names', () => {
      expect(tag('Membahas Next.js dan routing')).toContain('nextjs');
      expect(tag('Membahas Node.js di server')).toContain('node');
    });

    it('matches multi-word keywords', () => {
      expect(tag('Membahas design system')).toContain('design');
      expect(tag('Membahas progressive web app')).toContain('pwa');
      expect(tag('Membahas shadow dom')).toContain('web-components');
    });
  });

  describe('shape', () => {
    it('returns a sorted, de-duplicated list', () => {
      const tags = tag('React dan react dan CSS dan AI');
      expect(tags).toEqual([...new Set(tags)].sort());
    });

    it('returns nothing for text with no technical content', () => {
      expect(tag('Selamat malam semuanya, apa kabar?')).toEqual([]);
    });

    it('is case-insensitive', () => {
      expect(tag('MEMBAHAS REACT')).toContain('react');
    });

    it('only ever returns keys declared in TECH_KEYWORDS', () => {
      const known = new Set(Object.keys(TECH_KEYWORDS));
      for (const t of tag('React TypeScript CSS AI Bun Astro accessibility')) {
        expect(known.has(t), `${t} is not a declared tag`).toBe(true);
      }
    });
  });
});
