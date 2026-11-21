import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findUpdatedAtProblems, getEpisodeLastModified, parseContentTimestamp } from './episode-lastmod';
import { getEpisodes, type Episode } from './episodes';

describe('getEpisodeLastModified', () => {
  const episodes = getEpisodes();

  it('is never earlier than the publish date', () => {
    for (const ep of episodes) {
      expect(getEpisodeLastModified(ep)!.getTime()).toBeGreaterThanOrEqual(Date.parse(ep.publishedAt));
    }
  });

  it('moves forward when a summary is written after the episode aired', () => {
    const ep = episodes.find((e) => e.videoId === '2nJE0rvIUps');
    expect(ep).toBeDefined();
    expect(getEpisodeLastModified(ep!)!.getTime()).toBeGreaterThan(Date.parse(ep!.publishedAt));
  });

  it('falls back to the publish date for an episode with no summary or transcript', () => {
    const ep = { ...episodes[0], videoId: 'no-such-video' };
    expect(getEpisodeLastModified(ep)!.toISOString()).toBe(new Date(ep.publishedAt).toISOString());
  });
});

describe('getEpisodeLastModified with editorial updates', () => {
  let dataDir: string;
  const episode = { videoId: 'fixture1', publishedAt: '2024-01-10T12:00:00Z' } as Episode;

  function write(kind: 'summaries' | 'transcripts', record: Record<string, unknown>) {
    writeFileSync(join(dataDir, kind, `${episode.videoId}.json`), JSON.stringify(record));
  }

  beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'episode-lastmod-'));
    mkdirSync(join(dataDir, 'summaries'));
    mkdirSync(join(dataDir, 'transcripts'));
  });

  afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

  it('uses generatedAt when a legacy file has no updatedAt', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00.000Z' });
    write('transcripts', { generatedAt: '2026-05-13T12:50:22.193Z' });
    expect(getEpisodeLastModified(episode, dataDir)!.toISOString()).toBe('2026-08-26T00:00:00.000Z');
  });

  it('moves to a summary edit recorded in updatedAt', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00.000Z', updatedAt: '2026-11-14T12:50:57+07:00' });
    expect(getEpisodeLastModified(episode, dataDir)!.toISOString()).toBe('2026-11-14T05:50:57.000Z');
  });

  it('ignores an updatedAt that is not a timezone-qualified timestamp', () => {
    write('transcripts', { generatedAt: '2026-05-13T12:50:22.193Z' });
    for (const bad of ['2026-11-15T09:00:00', '2026-11-15', '2026-02-30T00:00:00Z', 'soon', 20261115]) {
      write('summaries', { generatedAt: '2026-08-26T00:00:00.000Z', updatedAt: bad });
      expect(getEpisodeLastModified(episode, dataDir)!.toISOString()).toBe('2026-08-26T00:00:00.000Z');
    }
  });

  it('gives the same answer on every call', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00.000Z', updatedAt: '2026-11-14T05:50:57Z' });
    const first = getEpisodeLastModified(episode, dataDir)!.toISOString();
    expect(getEpisodeLastModified(episode, dataDir)!.toISOString()).toBe(first);
  });
});

describe('getEpisodeLastModified with invalid dates', () => {
  let dataDir: string;
  const now = Date.parse('2026-11-18T00:00:00Z');
  const videoId = 'fixture2';

  function write(kind: 'summaries' | 'transcripts', record: unknown) {
    writeFileSync(join(dataDir, kind, `${videoId}.json`), JSON.stringify(record));
  }

  function lastmod(publishedAt: unknown) {
    return getEpisodeLastModified({ videoId, publishedAt } as Episode, dataDir, now)?.toISOString();
  }

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'episode-lastmod-invalid-'));
    mkdirSync(join(dataDir, 'summaries'));
    mkdirSync(join(dataDir, 'transcripts'));
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('keeps legacy data unchanged: Z timestamps, no updatedAt', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00Z' });
    write('transcripts', { generatedAt: '2026-05-13T12:50:22.193Z' });
    expect(lastmod('2024-01-10T12:00:00Z')).toBe('2026-08-26T00:00:00.000Z');
  });

  it('ignores a future updatedAt, as the summary validator does', () => {
    const summary = { generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2999-01-01T00:00:00Z' };
    expect(findUpdatedAtProblems(summary, now)).toEqual([expect.stringContaining('future')]);
    write('summaries', summary);
    expect(lastmod('2024-01-10T12:00:00Z')).toBe('2026-08-26T00:00:00.000Z');
  });

  it('ignores an updatedAt earlier than generatedAt, as the summary validator does', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' });
    expect(lastmod('2024-01-10T12:00:00Z')).toBe('2026-08-26T00:00:00.000Z');
  });

  it('ignores a future publishedAt or generatedAt', () => {
    write('summaries', { generatedAt: '2999-01-01T00:00:00Z' });
    write('transcripts', { generatedAt: '2026-05-13T12:50:22.193Z' });
    expect(lastmod('2999-01-01T00:00:00Z')).toBe('2026-05-13T12:50:22.193Z');
  });

  it('ignores a publishedAt without a timezone instead of reading it in the build machine\'s zone', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00Z' });
    expect(lastmod('2026-11-01T12:00:00')).toBe('2026-08-26T00:00:00.000Z');
    expect(lastmod('2026-11-01')).toBe('2026-08-26T00:00:00.000Z');
  });

  it('falls back to valid summary dates when publishedAt is malformed', () => {
    write('summaries', { generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2026-11-14T05:50:57Z' });
    for (const bad of ['not a date', '', '2026-02-30T00:00:00Z', undefined, null, 1763099457000]) {
      expect(lastmod(bad)).toBe('2026-11-14T05:50:57.000Z');
    }
  });

  it('emits no lastmod when no source is valid', () => {
    write('summaries', { generatedAt: 'soon', updatedAt: '2999-01-01T00:00:00Z' });
    write('transcripts', null);
    expect(lastmod('2026-11-01T12:00:00')).toBeUndefined();
  });
});

describe('getEpisodeLastModified across build timezones', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('gives the same lastmod under TZ=UTC and TZ=Asia/Jakarta', () => {
    const episodes = getEpisodes();
    const zoneless = { ...episodes[0], videoId: 'no-such-video', publishedAt: '2024-01-10T12:00:00' };
    const run = () => [zoneless, ...episodes].map((ep) => getEpisodeLastModified(ep)?.toISOString() ?? null);
    process.env.TZ = 'UTC';
    const utc = run();
    process.env.TZ = 'Asia/Jakarta';
    expect(run()).toEqual(utc);
    expect(utc[0]).toBeNull();
  });
});

describe('parseContentTimestamp', () => {
  it.each([
    ['2026-11-14T05:50:57Z', '2026-11-14T05:50:57.000Z'],
    ['2026-11-14T05:50:57.193Z', '2026-11-14T05:50:57.193Z'],
    ['2026-11-14T12:50:57+07:00', '2026-11-14T05:50:57.000Z'],
    ['2028-02-29T00:00:00Z', '2028-02-29T00:00:00.000Z'],
  ])('reads %s', (value, iso) => {
    expect(new Date(parseContentTimestamp(value)!).toISOString()).toBe(iso);
  });

  it.each([
    '2026-11-14T05:50:57', // no timezone: would read as the build machine's local time
    '2026-11-14',
    '2026-02-30T00:00:00Z', // Date.parse rolls this over into March
    '2026-02-29T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-11-14T24:00:00Z',
    '2026-11-14T05:50:57+25:00',
    '',
    undefined,
    1763099457000,
  ])('rejects %s', (value) => {
    expect(parseContentTimestamp(value)).toBeUndefined();
  });
});

describe('findUpdatedAtProblems', () => {
  const now = Date.parse('2026-11-18T00:00:00Z');

  it('accepts a file without updatedAt', () => {
    expect(findUpdatedAtProblems({ generatedAt: '2026-08-26T00:00:00Z' }, now)).toEqual([]);
  });

  it('accepts a valid updatedAt after generatedAt', () => {
    expect(
      findUpdatedAtProblems({ generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2026-11-14T12:50:57+07:00' }, now),
    ).toEqual([]);
  });

  it('rejects an updatedAt without a timezone', () => {
    expect(findUpdatedAtProblems({ generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2026-11-14T05:50:57' }, now))
      .toEqual([expect.stringContaining('timezone')]);
  });

  it('rejects an updatedAt earlier than generatedAt', () => {
    expect(findUpdatedAtProblems({ generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }, now))
      .toEqual([expect.stringContaining('earlier than `generatedAt`')]);
  });

  it('rejects an updatedAt in the future', () => {
    expect(findUpdatedAtProblems({ generatedAt: '2026-08-26T00:00:00Z', updatedAt: '2026-11-19T00:00:00Z' }, now))
      .toEqual([expect.stringContaining('future')]);
  });
});
