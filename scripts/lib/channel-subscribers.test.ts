import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseSubscriberCount,
  applySubscriberCount,
  CHECKED_AT_REFRESH_DAYS,
  type StoredSubscribers,
} from './channel-subscribers';

const STORED: StoredSubscribers = {
  count: 7100,
  fetchedAt: '2026-08-01',
  checkedAt: '2026-08-01',
};
const NOW = new Date('2026-08-26T01:00:00Z');

describe('parseSubscriberCount', () => {
  it('reads the count from a channels.list response', () => {
    expect(
      parseSubscriberCount({
        items: [{ statistics: { subscriberCount: '7100' } }],
      })
    ).toBe(7100);
  });

  it('accepts a number as well as the string the API actually sends', () => {
    expect(
      parseSubscriberCount({ items: [{ statistics: { subscriberCount: 7200 } }] })
    ).toBe(7200);
  });

  // Every one of these is a live failure mode: a hidden subscriber count, a
  // channel id that matches nothing, a quota error body, a truncated response.
  it.each([
    ['no items', { items: [] }],
    ['no items key', {}],
    ['hidden count', { items: [{ statistics: { hiddenSubscriberCount: true } }] }],
    ['no statistics', { items: [{ id: 'UC123' }] }],
    ['non-numeric', { items: [{ statistics: { subscriberCount: 'lots' } }] }],
    ['null payload', null],
    ['a string body', 'quota exceeded'],
    ['an error envelope', { error: { code: 403 } }],
  ])('returns null for %s', (_label, payload) => {
    expect(parseSubscriberCount(payload)).toBeNull();
  });

  // Zero would render as "0 Subscriber kanal" on the sponsor page, which is the
  // blanking this guard exists to prevent — it is never a real reading here.
  it.each([0, -1])('returns null for a non-positive count (%s)', value => {
    expect(
      parseSubscriberCount({ items: [{ statistics: { subscriberCount: value } }] })
    ).toBeNull();
  });
});

describe('applySubscriberCount', () => {
  it('stores a fresh count with the date it was fetched', () => {
    const result = applySubscriberCount(STORED, 7200, NOW);

    expect(result.next).toEqual({
      count: 7200,
      fetchedAt: '2026-08-26',
      checkedAt: '2026-08-26',
    });
    expect(result.updated).toBe(true);
  });

  it('bootstraps from nothing stored', () => {
    const result = applySubscriberCount(null, 7100, NOW);

    expect(result.next).toEqual({
      count: 7100,
      fetchedAt: '2026-08-26',
      checkedAt: '2026-08-26',
    });
    expect(result.updated).toBe(true);
  });

  // The whole point of Part 1's fail-soft rule: a transient API hiccup must
  // never blank a number on the sponsor page.
  it('leaves the last known figure untouched when the fetch yields nothing', () => {
    const result = applySubscriberCount(STORED, null, NOW);

    expect(result.next).toEqual(STORED);
    expect(result.updated).toBe(false);
    expect(result.reason).toMatch(/7100/);
  });

  it('leaves nothing stored as nothing stored when the fetch yields nothing', () => {
    const result = applySubscriberCount(null, null, NOW);

    expect(result.next).toBeNull();
    expect(result.updated).toBe(false);
  });

  // An unchanged count every week would open a one-line PR every week, and a
  // PR nobody needs to read is how a real diff sails through unlooked-at.
  it('does not rewrite the file when the count has not moved', () => {
    const result = applySubscriberCount(STORED, 7100, NOW);

    expect(result.next).toEqual(STORED);
    expect(result.next!.fetchedAt).toBe('2026-08-01');
    expect(result.updated).toBe(false);
  });

  it('always reports a reason so the run says what it did', () => {
    for (const count of [7200, 7100, null]) {
      expect(applySubscriberCount(STORED, count, NOW).reason).toBeTruthy();
    }
  });
});

/**
 * `checkedAt` answers the question `fetchedAt` cannot: is this figure still
 * being read at all? Fail-soft means a revoked key produces a run that looks
 * identical to a healthy week where the count did not move, so without a stamp
 * of the last *successful* read the page would go on publishing an ageing
 * number with nothing able to notice.
 */
describe('the last-read stamp', () => {
  const daysAfter = (iso: string, days: number) =>
    new Date(new Date(`${iso}T01:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000);

  it('is written whenever the count itself is written', () => {
    expect(applySubscriberCount(STORED, 7200, NOW).next!.checkedAt).toBe(
      '2026-08-26'
    );
    expect(applySubscriberCount(null, 7100, NOW).next!.checkedAt).toBe(
      '2026-08-26'
    );
  });

  // The tension the refresh window resolves: stamping every successful read
  // would open a one-line PR every week, which is how a real episodes.json diff
  // sails through unlooked-at.
  it('is not rewritten every week when the count has not moved', () => {
    const result = applySubscriberCount(
      STORED,
      STORED.count,
      daysAfter(STORED.checkedAt!, CHECKED_AT_REFRESH_DAYS - 1)
    );

    expect(result.updated).toBe(false);
    expect(result.next).toEqual(STORED);
  });

  it('is refreshed once it has stood for the refresh window', () => {
    const result = applySubscriberCount(
      STORED,
      STORED.count,
      daysAfter(STORED.checkedAt!, CHECKED_AT_REFRESH_DAYS)
    );

    expect(result.updated).toBe(true);
    // Only the stamp moves: the page's dated attribution still says, honestly,
    // that the figure has read this way since it was first observed.
    expect(result.next).toEqual({
      count: STORED.count,
      fetchedAt: STORED.fetchedAt,
      checkedAt: '2026-08-31',
    });
  });

  it('is written immediately for a store that carries none yet', () => {
    const result = applySubscriberCount(
      { count: 7100, fetchedAt: '2026-08-01' },
      7100,
      NOW
    );

    expect(result.updated).toBe(true);
    expect(result.next!.checkedAt).toBe('2026-08-26');
    expect(result.next!.fetchedAt).toBe('2026-08-01');
  });

  // The whole mechanism turns on this: a failed read must leave the stamp
  // alone, however old it has got, so the silence accumulates into an alarm.
  it('is never moved by a read that failed', () => {
    const old = { ...STORED, checkedAt: '2026-01-01' };
    const result = applySubscriberCount(old, null, NOW);

    expect(result.updated).toBe(false);
    expect(result.next).toEqual(old);
    expect(result.reason).toContain('2026-01-01');
  });
});

/**
 * The fail-soft rule above is only worth anything if the sync is actually wired
 * to honour it. These read `scripts/fetch-playlist.ts` because the property is
 * structural — where the call sits and what it may do — and that cannot be
 * asserted by calling a pure function. Same technique as the message guards in
 * `sync-guards.test.ts`.
 */
describe('the sync wiring that makes fail-soft real', () => {
  const source = readFileSync(
    join(process.cwd(), 'scripts/fetch-playlist.ts'),
    'utf-8'
  );

  it('refreshes the subscriber count only after the episodes are written', () => {
    const episodesWritten = source.indexOf('JSON.stringify(mergedEpisodes');
    const subscriberCall = source.indexOf('await syncSubscriberCount()');

    expect(episodesWritten).toBeGreaterThan(-1);
    expect(subscriberCall).toBeGreaterThan(episodesWritten);
  });

  it('cannot exit the process from the subscriber path', () => {
    const start = source.indexOf('async function syncSubscriberCount');
    const end = source.indexOf('async function fetchPlaylistItems');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source.slice(start, end)).not.toContain('process.exit');
  });

  it('guards every network call it makes, so a throw cannot escape', () => {
    const start = source.indexOf('async function syncSubscriberCount');
    const end = source.indexOf('async function fetchPlaylistItems');
    const body = source.slice(start, end);

    // One try for the read, one wrapping the whole fetch, one for the write.
    expect(body.match(/try \{/g) ?? []).toHaveLength(3);
    expect(body.match(/catch \(/g) ?? []).toHaveLength(3);
  });
});
