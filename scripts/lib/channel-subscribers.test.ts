import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseSubscriberCount,
  applySubscriberCount,
  type StoredSubscribers,
} from './channel-subscribers';

const STORED: StoredSubscribers = { count: 7100, fetchedAt: '2026-08-01' };
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

    expect(result.next).toEqual({ count: 7200, fetchedAt: '2026-08-26' });
    expect(result.updated).toBe(true);
  });

  it('bootstraps from nothing stored', () => {
    const result = applySubscriberCount(null, 7100, NOW);

    expect(result.next).toEqual({ count: 7100, fetchedAt: '2026-08-26' });
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
