import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Parses Cloudflare Pages `_headers` into path -> header name (lowercased) -> values. */
function parseHeaders(text: string): Map<string, Map<string, string[]>> {
  const rules = new Map<string, Map<string, string[]>>();
  let current: Map<string, string[]> | undefined;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = rules.get(line.trim()) ?? new Map();
      rules.set(line.trim(), current);
      continue;
    }
    const colon = line.indexOf(':');
    const name = line.slice(0, colon).trim().toLowerCase();
    current!.set(name, [...(current!.get(name) ?? []), line.slice(colon + 1).trim()]);
  }
  return rules;
}

const rules = parseHeaders(readFileSync(join(process.cwd(), 'public/_headers'), 'utf-8'));

describe('public/_headers', () => {
  // Astro fingerprints every file under /_astro/, so a changed file gets a new URL.
  it('caches fingerprinted build assets for a year', () => {
    expect(rules.get('/_astro/*')?.get('cache-control')).toEqual([
      'public, max-age=31536000, immutable',
    ]);
  });

  it('marks nothing else immutable, since HTML and feeds keep their URLs', () => {
    for (const [path, headers] of rules) {
      if (path === '/_astro/*') continue;
      for (const value of headers.get('cache-control') ?? []) {
        expect(value, path).not.toMatch(/immutable/);
      }
    }
  });

  it('keeps the noindex rules on feeds, the search index, markdown copies and the pages.dev mirror', () => {
    for (const path of [
      '/podcast-rss.xml',
      '/rss.xml',
      '/search-index.json',
      '/episodes/*.md',
      'https://landing-eju.pages.dev/*',
    ]) {
      expect(rules.get(path)?.get('x-robots-tag'), path).toEqual(['noindex']);
    }
  });
});
