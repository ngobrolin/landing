import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveSlug } from './slug';
import { getEpisodes } from './episodes';
import { getPodcastEpisodes } from './podcast';

describe('resolveSlug', () => {
  it('uses the stored slug even when the title has changed since', () => {
    // v28qyGyoMw4 shipped as "Web Performance Update - Ngobrolin WEB" and has
    // already been retitled on YouTube to "Update Performa Web - Ngobrolin
    // WEB". That retitle is not in src/data/episodes.json yet — the automated
    // data PR #109 carries it — so no stored slug diverges from its own title
    // derivation today. Do not "correct" episodes.json to match this test: the
    // inline record below is the post-#109 state, locked down in advance so the
    // published address cannot follow the retitle when it lands.
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
  // The golden file records every address the site has published. The guard is
  // a SUBSET check, not an equality one: every golden address must still
  // resolve, but new episodes may add addresses freely — growth is not churn,
  // and the weekly unattended playlist sync must not turn CI red for it.
  //
  // A REMOVED episode is still caught: its golden address stops resolving and
  // this fails. That is intended. Striking an address should be a deliberate,
  // visible edit to the golden file with a reason in the commit, never
  // something CI waves through.
  const golden = readFileSync(join(process.cwd(), 'src/lib/slugs.golden.txt'), 'utf-8')
    .trim()
    .split('\n');

  it('every episode still resolves to the address it had before slugs were stored', () => {
    const current = new Set(getEpisodes().map((ep) => ep.slug));
    expect(golden.filter((slug) => !current.has(slug))).toEqual([]);
  });

  it('the podcast feed resolves to those same addresses', () => {
    const web = new Set(getEpisodes().map((ep) => ep.slug));
    expect(getPodcastEpisodes().map((ep) => ep.slug).filter((slug) => !web.has(slug))).toEqual([]);
  });

  // Two episodes on one address is a collision the subset check cannot see:
  // the golden address still resolves, it just resolves to two pages.
  it('no two episodes resolve to the same address', () => {
    const slugs = getEpisodes().map((ep) => ep.slug);
    const seen = new Set<string>();
    const duplicates = slugs.filter((slug) => (seen.has(slug) ? true : (seen.add(slug), false)));
    expect(duplicates).toEqual([]);
  });

  it('every episode record carries a stored slug', () => {
    const raw: Array<{ slug?: string }> = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/episodes.json'), 'utf-8')
    );
    expect(raw.filter((ep) => !ep.slug)).toEqual([]);
  });
});
