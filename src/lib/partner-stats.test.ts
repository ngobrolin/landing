import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import episodes from '../data/episodes.json';
import {
  getPartnerStats,
  PARTNER_CARD_STAT_IDS,
  getPartnerCardStats,
} from './partner-stats';

const expectedCount = episodes.length;
const expectedFirstYear = Math.min(
  ...episodes.map(ep => new Date(ep.publishedAt).getUTCFullYear())
);

describe('getPartnerStats', () => {
  it('derives the episode count and start year from the episode data', () => {
    const stats = getPartnerStats();

    expect(stats.episodeCount).toBe(expectedCount);
    expect(stats.firstYear).toBe(expectedFirstYear);
  });

  it('formats every tile value in id-ID so the page never formats one itself', () => {
    const byId = Object.fromEntries(getPartnerStats().tiles.map(t => [t.id, t]));

    expect(byId.episodes.value).toBe(expectedCount.toLocaleString('id-ID'));
    expect(byId.subscribers.value).toBe('7.100');
    expect(byId.age.value).toBe('88,7%');
    expect(byId.returning.value).toBe('37,8%');
  });

  it('keeps the channel figures scoped to the channel and the show figure to the show', () => {
    const byId = Object.fromEntries(getPartnerStats().tiles.map(t => [t.id, t]));

    expect(byId.episodes.scope).toBe('Ngobrolin WEB');
    for (const id of ['subscribers', 'age', 'returning']) {
      expect(byId[id].scope).toBe('Kanal YouTube');
    }
  });

  it('preserves the exact tile labels the partners page already publishes', () => {
    const byId = Object.fromEntries(getPartnerStats().tiles.map(t => [t.id, t]));

    expect(byId.episodes.label).toBe(
      `Episode, mingguan sejak ${expectedFirstYear}`
    );
    expect(byId.subscribers.label).toBe('Subscriber kanal');
    expect(byId.age.label).toBe('Audiens berusia 25-34');
    expect(byId.returning.label).toBe('Penonton yang kembali');
  });

  it('carries the dated, scope-limited attribution the figures depend on', () => {
    const stats = getPartnerStats();

    expect(stats.attribution).toContain('Data kanal YouTube, Agustus 2026.');
    expect(stats.supportingScope).toBe('Kanal YouTube:');
    expect(stats.supporting).toBe(
      '87,7% dari Indonesia · 545 jam ditonton per 28 hari · rata-rata 5:58 per tayangan · minat teratas: High-End Computer Aficionados.'
    );
  });

  it('builds the meta description from the derived figures, not a literal', () => {
    const stats = getPartnerStats();

    expect(stats.metaDescription).toContain(String(expectedCount));
    expect(stats.metaDescription).toContain(String(expectedFirstYear));
    // What a sponsor actually types. Present because the page is about this.
    expect(stats.metaDescription).toMatch(/sponsor/i);
    expect(stats.metaDescription).toMatch(/iklan/i);
    // Google truncates past ~160 characters.
    expect(stats.metaDescription.length).toBeLessThanOrEqual(160);
  });
});

describe('getPartnerCardStats', () => {
  it('is a subset of the page tiles, selected by id and never re-stated', () => {
    const card = getPartnerCardStats();
    const page = getPartnerStats().tiles;

    expect(card.map(t => t.id)).toEqual([...PARTNER_CARD_STAT_IDS]);
    for (const tile of card) {
      expect(page).toContainEqual(tile);
    }
  });
});

describe('single source of truth', () => {
  const SOURCE = 'src/lib/partner-stats.ts';
  // Every wrong figure this page has shipped was a second copy that drifted.
  // The module holds them raw and formats on the way out, so a consumer must
  // contain neither the raw value nor the rendered one.
  const RAW = ['7100', '88.7', '37.8', '87.7', '545'];
  const RENDERED = ['7.100', '88,7', '37,8', '87,7'];

  /**
   * Inline icon markup is full of coordinates that collide with real figures
   * ("545" is a plausible path point). The guard is about numbers a reader
   * sees, so strip the drawings before looking.
   */
  function readCopy(file: string): string {
    return readFileSync(join(process.cwd(), file), 'utf-8').replace(
      /<svg[\s\S]*?<\/svg>/g,
      ''
    );
  }

  it.each(RAW)('%s appears in the stats module', figure => {
    const source = readFileSync(join(process.cwd(), SOURCE), 'utf-8');
    expect(source).toContain(figure);
  });

  it.each(['src/pages/partners.astro', 'src/pages/partners-og.png.ts'])(
    '%s states no figure of its own',
    file => {
      const source = readCopy(file);
      for (const figure of [...RAW, ...RENDERED]) {
        expect(source, `${file} restates ${figure}`).not.toContain(figure);
      }
      // The episode count and start year are derived; a literal is the "164+" bug.
      expect(source).not.toContain(String(expectedCount));
      expect(source).not.toContain(String(expectedFirstYear));
    }
  );
});
