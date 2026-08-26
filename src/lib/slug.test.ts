import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveSlug } from './slug';
import { getEpisodes } from './episodes';
import { getPodcastEpisodes } from './podcast';

describe('resolveSlug', () => {
  it('uses the stored slug even when the title has changed since', () => {
    // v28qyGyoMw4 shipped as "Web Performance Update" and was retitled on
    // YouTube. The address must not follow the retitle.
    expect(
      resolveSlug({
        videoId: 'v28qyGyoMw4',
        title: 'Update Performa Web - Ngobrolin WEB',
        slug: 'v28qyGyoMw4-web-performance-update-ngobrolin-web',
      })
    ).toBe('v28qyGyoMw4-web-performance-update-ngobrolin-web');
  });

  it('falls back to the title derivation when no slug is stored', () => {
    expect(
      resolveSlug({ videoId: 'abc123', title: 'Hello World - Ngobrolin WEB' })
    ).toBe('abc123-hello-world-ngobrolin-web');
  });

  it('falls back when the stored slug is empty', () => {
    expect(
      resolveSlug({ videoId: 'abc123', title: 'Hello World', slug: '' })
    ).toBe('abc123-hello-world');
  });
});

describe('slug stability', () => {
  const golden = readFileSync(join(process.cwd(), 'src/lib/slugs.golden.txt'), 'utf-8')
    .trim()
    .split('\n');

  it('every episode still resolves to the address it had before slugs were stored', () => {
    expect(getEpisodes().map((ep) => ep.slug)).toEqual(golden);
  });

  it('the podcast feed resolves to those same addresses', () => {
    const web = new Set(golden);
    for (const ep of getPodcastEpisodes()) {
      expect(web.has(ep.slug)).toBe(true);
    }
  });

  it('every episode record carries a stored slug', () => {
    const raw: Array<{ slug?: string }> = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/episodes.json'), 'utf-8')
    );
    expect(raw.length).toBe(golden.length);
    expect(raw.filter((ep) => !ep.slug)).toEqual([]);
  });
});
