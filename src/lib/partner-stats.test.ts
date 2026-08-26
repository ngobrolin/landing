import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import episodes from '../data/episodes.json';
import subscribers from '../data/channel-subscribers.json';
import { mediaKit } from './media-kit';
import {
  buildPartnerStats,
  getPartnerStats,
  PARTNER_CARD_STAT_IDS,
  getPartnerCardStats,
} from './partner-stats';

const expectedCount = episodes.length;
const expectedFirstYear = Math.min(
  ...episodes.map(ep => new Date(ep.publishedAt).getUTCFullYear())
);

/** The real inputs, so a case can vary exactly one of them. */
const inputs = () => ({
  episodes: episodes as Array<{ publishedAt: string }>,
  subscribers,
  mediaKit,
});

/**
 * The renderings the page publishes, derived from the stores rather than typed
 * out here. Both stores move on their own — the subscriber count on the weekly
 * sync, the media kit when a maintainer refreshes it and sets `capturedAt` —
 * and a literal in this file would turn the run that moved them red for
 * behaving exactly as designed. What is asserted is the rule, never the number.
 */
const percent = (value: number) =>
  `${value.toLocaleString('id-ID', { minimumFractionDigits: 1 })}%`;
const count = (value: number) => value.toLocaleString('id-ID');
const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

describe('getPartnerStats', () => {
  it('derives the episode count and start year from the episode data', () => {
    const stats = getPartnerStats();

    expect(stats.episodeCount).toBe(expectedCount);
    expect(stats.firstYear).toBe(expectedFirstYear);
  });

  it('formats every tile value in id-ID so the page never formats one itself', () => {
    const byId = Object.fromEntries(getPartnerStats().tiles.map(t => [t.id, t]));

    expect(byId.episodes.value).toBe(count(expectedCount));
    expect(byId.subscribers.value).toBe(count(subscribers.count));
    expect(byId.age.value).toBe(percent(mediaKit.age25to34Percent));
    expect(byId.returning.value).toBe(percent(mediaKit.returningViewersPercent));
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

    expect(stats.attribution).toContain(
      `Data kanal YouTube, ${monthYear(mediaKit.capturedAt)}.`
    );
    expect(stats.supportingScope).toBe('Kanal YouTube:');
    expect(stats.supporting).toBe(
      `${percent(mediaKit.fromIndonesiaPercent)} dari Indonesia · ` +
        `${count(mediaKit.watchHours28d)} jam ditonton per 28 hari · ` +
        `rata-rata ${mediaKit.averageViewDuration} per tayangan · ` +
        `minat teratas: ${mediaKit.topInterest}.`
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

/**
 * The media-kit date is stored once, as `capturedAt` in
 * `src/data/media-kit.json`, and the Indonesian month the page prints is
 * formatted from it. A hand-written "Agustus 2026" beside the ISO date would be
 * a second copy of the same fact — the failure this page is paying down.
 */
describe('dated provenance', () => {
  // Both capture dates are supplied here rather than read from the store: the
  // property is that the printed month follows whatever is stored, which is
  // only visible by moving it, and a case pinned to today's stored date would
  // go red the day a maintainer refreshes the figures.
  it('formats the media-kit month from the stored capture date', () => {
    const march = buildPartnerStats({
      ...inputs(),
      mediaKit: { ...mediaKit, capturedAt: '2027-03-14' },
    });
    const august = buildPartnerStats({
      ...inputs(),
      mediaKit: { ...mediaKit, capturedAt: '2026-08-01' },
    });

    expect(march.attribution).toContain('Data kanal YouTube, Maret 2027.');
    expect(august.attribution).toContain('Data kanal YouTube, Agustus 2026.');
    // The subscriber clause carries its own, unrelated date, so the check is
    // that the media-kit month moved — not that the string vanished.
    expect(march.attribution).not.toContain('Data kanal YouTube, Agustus 2026');
  });

  it('states the subscriber figure’s own date, which is not the media kit’s', () => {
    const stats = buildPartnerStats({
      ...inputs(),
      subscribers: { count: 7200, fetchedAt: '2026-12-25' },
    });

    expect(stats.attribution).toContain('25 Desember 2026');
  });

  // A sponsor skimming the tiles should be able to tell the live figure from
  // the hand-copied ones without reading a footnote twice.
  it('says the subscriber figure is refreshed automatically', () => {
    expect(getPartnerStats().attribution).toMatch(/otomatis/i);
  });

  it('keeps the channel scope caveat whatever the dates say', () => {
    expect(getPartnerStats().attribution).toContain(
      'bukan angka Ngobrolin WEB saja'
    );
  });
});

/**
 * The sync fails soft: a channel call that 403s leaves the last known figure
 * in place. But nothing having *ever* been stored is a real state too — a store
 * emptied by hand, or one that exists before the first successful sync — and
 * the page still has to render. `readStoredSubscribers` normalises any such
 * shape to null so a sponsor never meets a `0` or a `NaN`.
 */
describe('when no subscriber count has been stored', () => {
  const withoutSubscribers = () =>
    buildPartnerStats({ ...inputs(), subscribers: null });

  it('omits the tile rather than publishing a zero or a dash', () => {
    const stats = withoutSubscribers();

    expect(stats.tiles.map(t => t.id)).not.toContain('subscribers');
    expect(stats.tiles.map(t => t.value)).not.toContain('0');
  });

  it('still renders every other tile', () => {
    expect(withoutSubscribers().tiles.map(t => t.id)).toEqual([
      'episodes',
      'age',
      'returning',
    ]);
  });

  it('drops the subscriber sentence from the attribution, not the whole thing', () => {
    const attribution = withoutSubscribers().attribution;

    expect(attribution).toContain(
      `Data kanal YouTube, ${monthYear(mediaKit.capturedAt)}.`
    );
    expect(attribution).toContain('bukan angka Ngobrolin WEB saja');
    expect(attribution).not.toMatch(/subscriber/i);
  });

  it('leaves the share card with the tiles that do exist', () => {
    const card = withoutSubscribers().cardTiles;

    expect(card.map(t => t.id)).toEqual(['episodes', 'age']);
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
  /**
   * The raw figures live in `src/data/`; `partner-stats.ts` labels, scopes and
   * formats them on the way out and states none of its own. So the guard is the
   * same as it always was, one layer down and one file stricter: the numbers
   * exist exactly once, in the store, and no module between the store and the
   * reader restates either the raw value or the rendered one.
   */
  const STORES = ['src/data/media-kit.json', 'src/data/channel-subscribers.json'];
  const CONSUMERS = [
    'src/lib/partner-stats.ts',
    'src/lib/media-kit.ts',
    'src/pages/partners.astro',
    'src/pages/partners-og.png.ts',
  ];
  /**
   * Both lists are read out of the stores at run time, never typed here. A
   * snapshot of today's values would fail the moment the weekly sync moved the
   * subscriber count — turning the sync's own PR red for working — and, worse,
   * would go on forbidding the *old* number while the one actually on the page
   * went unguarded. What is asserted is the rule: no consumer restates whatever
   * is currently stored, raw or rendered.
   */
  const FIGURES: number[] = [
    subscribers.count,
    ...Object.entries(mediaKit)
      .filter(([key]) => key !== 'capturedAt')
      .map(([, value]) => value)
      .filter((value): value is number => typeof value === 'number'),
  ];
  const RAW = [...new Set(FIGURES.map(String))];
  const RENDERED = [
    ...new Set(FIGURES.flatMap(value => [count(value), percent(value)])),
  ];

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

  /**
   * A figure a reader sees is delimited on at least one side; one buried inside
   * a hyphenated token is a class name. `partners.astro` is full of
   * `text-gray-500` and `md:grid-cols-4`, and the figures are stored data, so a
   * bare `includes()` would fail this guard the day `watchHours28d` landed on a
   * round hundred — red for behaving exactly as designed. Same trap AGENTS.md
   * records for tag extraction, where `ai` matched inside *mulai* and tagged
   * every summarised episode.
   */
  const ADJACENT = /[-\w.,]/;

  function restates(source: string, figure: string): boolean {
    for (let from = 0; ; from += 1) {
      const at = source.indexOf(figure, from);
      if (at === -1) return false;

      const before = source[at - 1];
      const after = source[at + figure.length];
      if (!ADJACENT.test(before ?? ' ') && !ADJACENT.test(after ?? ' ')) {
        return true;
      }
      from = at;
    }
  }

  it('reads a figure a reader would see, not one inside a class name', () => {
    expect(restates('<p class="text-gray-500 mt-4">', '500')).toBe(false);
    expect(restates('<div class="md:grid-cols-4">', '4')).toBe(false);
    expect(restates('<span>500 jam ditonton</span>', '500')).toBe(true);

    expect(restates('<p class="gap-7.100">', '7.100')).toBe(false);
    expect(restates('<p>7.100 subscriber kanal</p>', '7.100')).toBe(true);

    expect(restates('88,75% dari Indonesia', '88,7')).toBe(false);
    expect(restates('88,7% dari Indonesia', '88,7')).toBe(true);
  });

  // The other half of the guard: each figure it forbids elsewhere is written,
  // literally, in a store. A value stored in a shape that does not round-trip
  // (88.70, or a number as a string) would leave the search looking for text
  // that appears nowhere and quietly guarding nothing.
  it.each(RAW)('%s is written in a data store', figure => {
    const stores = STORES.map(file =>
      readFileSync(join(process.cwd(), file), 'utf-8')
    ).join('\n');

    expect(stores).toContain(figure);
  });

  it.each(CONSUMERS)('%s states no figure of its own', file => {
    const source = readCopy(file);
    // The episode count and start year are derived; a literal is the "164+" bug.
    const figures = [
      ...RAW,
      ...RENDERED,
      String(expectedCount),
      String(expectedFirstYear),
    ];

    for (const figure of figures) {
      expect(restates(source, figure), `${file} restates ${figure}`).toBe(false);
    }
  });
});
