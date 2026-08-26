import { describe, it, expect } from 'vitest';
import { getDisplayTitle, buildEpisodePageTitle } from './episode-title';
import { getEpisodes } from './episodes';

/**
 * 163 of 178 episode titles carry a trailing show-name suffix, in 46 distinct
 * shapes. Repeating "Ngobrolin WEB" on every card of a site called Ngobrolin
 * WEB spends the most valuable line of the card on nothing.
 *
 * The suffix still belongs in the browser title and the social tags, which is
 * buildEpisodePageTitle's job. getDisplayTitle is for text a reader sees.
 */
describe('getDisplayTitle', () => {
  it('strips the canonical suffix', () => {
    expect(getDisplayTitle('State of CSS - Ngobrolin WEB')).toBe('State of CSS');
  });

  it('strips a numbered-episode suffix', () => {
    expect(getDisplayTitle('Ngobrolin CSS - Ngobrolin WEB Ep2')).toBe('Ngobrolin CSS');
    expect(getDisplayTitle('Web Components - Ngobrolin WEB ep51')).toBe('Web Components');
    expect(getDisplayTitle('Ngobrolin Web Jadul - Ngobrolin WEB ep27')).toBe(
      'Ngobrolin Web Jadul'
    );
  });

  it('strips the misspelled show name that exists in the playlist', () => {
    expect(getDisplayTitle('Bun - Ngborlin WEB')).toBe('Bun');
  });

  // The guest handle is real information about the episode, so removing the
  // show name must not take the guest with it.
  it('keeps a trailing guest handle', () => {
    expect(
      getDisplayTitle('Liputan langsung Google I/O - Ngobrolin WEB & @sandhikagalihWPU')
    ).toBe('Liputan langsung Google I/O & @sandhikagalihWPU');
  });

  it('keeps a guest handle that sits before the suffix', () => {
    expect(
      getDisplayTitle('Ngobrolin Video Singkat bareng @dannydwic - Ngobrolin WEB')
    ).toBe('Ngobrolin Video Singkat bareng @dannydwic');
  });

  // Four real titles use the show name as a TOPIC phrase. Only the suffix goes.
  it('does not eat the show name when it is part of the subject', () => {
    expect(getDisplayTitle('Ngobrolin WebSocket - Ngobrolin WEB')).toBe(
      'Ngobrolin WebSocket'
    );
    expect(getDisplayTitle('Ngobrolin Web API Baru - Ngobrolin WEB')).toBe(
      'Ngobrolin Web API Baru'
    );
  });

  it('leaves a 2022-2024 one-off with no suffix untouched', () => {
    expect(getDisplayTitle('Ngobrolin React Server Component')).toBe(
      'Ngobrolin React Server Component'
    );
  });

  // Never return an empty heading: a blank card title is worse than a redundant
  // one.
  it('falls back to the original when the title is only the suffix', () => {
    expect(getDisplayTitle('Ngobrolin WEB')).toBe('Ngobrolin WEB');
    expect(getDisplayTitle('- Ngobrolin WEB')).toBe('- Ngobrolin WEB');
    expect(getDisplayTitle('  ')).toBe('');
  });

  it('handles an en dash separator', () => {
    expect(getDisplayTitle('Deno – Ngobrolin WEB')).toBe('Deno');
  });

  it('never returns an empty string for a real episode', () => {
    for (const ep of getEpisodes()) {
      expect(getDisplayTitle(ep.title).length, `empty display title: ${ep.title}`).toBeGreaterThan(0);
    }
  });

  it('removes the trailing show name from most of the real archive', () => {
    const stripped = getEpisodes().filter(
      (ep) => getDisplayTitle(ep.title) !== ep.title
    );
    // 163 of 178 carry some suffix variant.
    expect(stripped.length).toBeGreaterThan(150);
  });

  it('leaves no display title ending in the show name', () => {
    for (const ep of getEpisodes()) {
      const shown = getDisplayTitle(ep.title);
      expect(
        /[-–]\s*ng(?:ob|bo)r(?:o)?lin\s+web\s*(?:ep\.?\s*\d+)?$/i.test(shown),
        `still suffixed: ${shown}`
      ).toBe(false);
    }
  });

  it('is idempotent', () => {
    for (const ep of getEpisodes()) {
      const once = getDisplayTitle(ep.title);
      expect(getDisplayTitle(once), `not idempotent: ${ep.title}`).toBe(once);
    }
  });
});

describe('the display title and the page title stay independent', () => {
  // The show name leaving the card must not take it out of the browser tab.
  it('keeps the show name in the page title for every episode', () => {
    for (const ep of getEpisodes()) {
      expect(
        /ng(?:ob|bo)r(?:o)?lin\s+web/i.test(buildEpisodePageTitle(ep.title)),
        `page title lost the show name: ${ep.title}`
      ).toBe(true);
    }
  });
});
