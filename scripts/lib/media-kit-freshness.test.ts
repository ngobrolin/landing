import { describe, it, expect } from 'vitest';
import {
  MAX_AGE_MONTHS,
  ISSUE_TITLE,
  SUBSCRIBER_ISSUE_TITLE,
  SUBSCRIBER_MAX_AGE_MONTHS,
  addMonths,
  assessMediaKitFreshness,
  assessSubscriberFreshness,
  formatIssueBody,
  formatSubscriberIssueBody,
  type MediaKitFreshness,
} from './media-kit-freshness';
import { CHECKED_AT_REFRESH_DAYS } from './channel-subscribers';

const FIGURES = [
  { label: 'Audiens berusia 25-34', where: 'Analytics → Audience → Age' },
  { label: 'Penonton yang kembali', where: 'Analytics → Audience → Returning' },
];

const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('addMonths', () => {
  it('adds whole months', () => {
    expect(addMonths('2026-08-01', 4)).toBe('2026-12-01');
  });

  it('crosses a year boundary', () => {
    expect(addMonths('2026-11-15', 4)).toBe('2027-03-15');
  });

  // 2026-10-31 + 4 months is 2027-02-31, which does not exist. Rolling over to
  // March would put the due date *later* than a month-end capture deserves.
  it('clamps to the last day when the target month is shorter', () => {
    expect(addMonths('2026-10-31', 4)).toBe('2027-02-28');
  });
});

describe('assessMediaKitFreshness', () => {
  it('is fresh the day before the four-month anniversary', () => {
    const result = assessMediaKitFreshness('2026-08-01', at('2026-11-30'));

    expect(result.stale).toBe(false);
    expect(result.dueAt).toBe('2026-12-01');
  });

  // A monthly cron that treats the anniversary itself as "not yet older than
  // four months" waits another whole month to say anything, so the boundary
  // day fires. Both sides of it are pinned so the rule cannot drift.
  it('is stale on the four-month anniversary itself', () => {
    const result = assessMediaKitFreshness('2026-08-01', at('2026-12-01'));

    expect(result.stale).toBe(true);
    expect(result.dueAt).toBe('2026-12-01');
  });

  it('stays stale well past the anniversary', () => {
    expect(assessMediaKitFreshness('2026-08-01', at('2027-06-01')).stale).toBe(
      true
    );
  });

  it('is fresh the day it was captured', () => {
    expect(assessMediaKitFreshness('2026-08-01', at('2026-08-01')).stale).toBe(
      false
    );
  });

  it('reports the age in whole months so the issue can state it', () => {
    const result = assessMediaKitFreshness('2026-08-01', at('2027-01-15'));

    expect(result.ageMonths).toBe(5);
    expect(result.capturedAt).toBe('2026-08-01');
  });

  it('uses MAX_AGE_MONTHS rather than a second copy of the number', () => {
    const captured = '2026-08-01';
    const due = addMonths(captured, MAX_AGE_MONTHS);

    expect(assessMediaKitFreshness(captured, at(due)).stale).toBe(true);
  });

  // A guard that cannot read its own date must not report all-clear: that is
  // indistinguishable from "the figures are fine" and is how this page went
  // three years without anyone noticing a wrong number.
  it.each(['', 'Agustus 2026', '2026-13-01', 'not-a-date'])(
    'treats an unreadable capture date (%s) as stale, not as fresh',
    value => {
      const result = assessMediaKitFreshness(value, at('2026-08-02'));

      expect(result.stale).toBe(true);
      expect(result.unreadable).toBe(true);
    }
  );
});

describe('formatIssueBody', () => {
  const stale: MediaKitFreshness = assessMediaKitFreshness(
    '2026-08-01',
    at('2027-01-15')
  );

  it('names every figure that needs refreshing', () => {
    const body = formatIssueBody(stale, FIGURES);

    for (const figure of FIGURES) {
      expect(body).toContain(figure.label);
      expect(body).toContain(figure.where);
    }
  });

  it('says where to get the numbers and which file to edit', () => {
    const body = formatIssueBody(stale, FIGURES);

    expect(body).toContain('YouTube Studio');
    expect(body).toContain('src/data/media-kit.json');
    expect(body).toContain('capturedAt');
  });

  it('states the capture date and how old it is', () => {
    const body = formatIssueBody(stale, FIGURES);

    expect(body).toContain('2026-08-01');
    expect(body).toContain(String(stale.ageMonths));
  });

  // The subscriber count is derived weekly by the sync; telling a maintainer to
  // hand-copy it would undo the automation and reintroduce a second copy.
  it('does not ask for the figures the sync already derives', () => {
    const body = formatIssueBody(stale, FIGURES);

    expect(body).toMatch(/subscriber/i);
    expect(body).toContain('scripts/fetch-playlist.ts');
  });

  it('explains why these cannot be automated, so nobody re-litigates it', () => {
    const body = formatIssueBody(stale, FIGURES);

    expect(body).toMatch(/analytics/i);
    expect(body).toMatch(/oauth/i);
  });

  it('says plainly what an unreadable date means', () => {
    const broken = assessMediaKitFreshness('Agustus 2026', at('2026-08-02'));
    const body = formatIssueBody(broken, FIGURES);

    expect(body).toContain('Agustus 2026');
    expect(body).toMatch(/could not be read|unreadable/i);
  });
});

describe('ISSUE_TITLE', () => {
  // Stable, so a monthly re-run updates the one open issue instead of opening
  // a twelfth copy of it in a year.
  it('is a fixed string with no date or figure in it', () => {
    expect(ISSUE_TITLE).toBeTruthy();
    expect(ISSUE_TITLE).not.toMatch(/\d/);
  });
});

/**
 * The derived figure's alarm. It exists because fail-soft is silent: a revoked
 * key, or a quota exhausted for good, leaves the last known count standing and
 * produces a run indistinguishable from a healthy week where the count did not
 * move. `checkedAt` is what tells those apart, and this is what reads it.
 */
describe('assessSubscriberFreshness', () => {
  const store = (checkedAt?: string) => ({
    count: 7100,
    fetchedAt: '2026-08-01',
    ...(checkedAt === undefined ? {} : { checkedAt }),
  });

  it('is fresh while the sync keeps recording successful reads', () => {
    const result = assessSubscriberFreshness(store('2026-08-01'), at('2026-09-15'));

    expect(result.stale).toBe(false);
    expect(result.published).toBe(true);
    expect(result.checkedAt).toBe('2026-08-01');
  });

  it('goes stale once the reads stop for longer than the threshold', () => {
    const due = addMonths('2026-08-01', SUBSCRIBER_MAX_AGE_MONTHS);
    const result = assessSubscriberFreshness(store('2026-08-01'), at(due));

    expect(result.stale).toBe(true);
    expect(result.dueAt).toBe(due);
    expect(result.count).toBe(7100);
    expect(result.fetchedAt).toBe('2026-08-01');
  });

  // A weekly sync stamps within CHECKED_AT_REFRESH_DAYS + 7 at worst, so the
  // healthy case must clear the threshold with room; otherwise the alarm cries
  // wolf about a sync that is working and gets muted.
  it('leaves room for the refresh window a working sync actually uses', () => {
    const stamped = '2026-08-01';
    const worstCase = new Date(
      at(stamped).getTime() + (CHECKED_AT_REFRESH_DAYS + 7) * 24 * 60 * 60 * 1000
    );

    expect(assessSubscriberFreshness(store(stamped), worstCase).stale).toBe(false);
  });

  // Same rule as an unreadable capturedAt: a guard that cannot read its own
  // date must not report all-clear, because that is exactly what a sync which
  // has never run successfully looks like.
  it.each([undefined, '', 'kemarin', '2026-13-01'])(
    'treats an unusable stamp (%s) as stale, not as fresh',
    value => {
      const result = assessSubscriberFreshness(store(value), at('2026-08-02'));

      expect(result.stale).toBe(true);
      expect(result.unreadable).toBe(true);
    }
  );

  // Nothing published means the tile is off the page, so there is no ageing
  // claim to alarm about — nagging before the first successful sync would be an
  // alarm about nothing, and an alarm about nothing gets ignored.
  it.each([
    ['nothing stored', null],
    ['an empty store', {}],
    ['a zero count', { count: 0, fetchedAt: '2026-08-01' }],
    ['a malformed date', { count: 7100, fetchedAt: 'Agustus 2026' }],
  ])('stays quiet for %s, which publishes no figure', (_label, stored) => {
    const result = assessSubscriberFreshness(stored, at('2027-06-01'));

    expect(result.published).toBe(false);
    expect(result.stale).toBe(false);
  });
});

describe('formatSubscriberIssueBody', () => {
  const stale = assessSubscriberFreshness(
    { count: 7100, fetchedAt: '2026-08-01', checkedAt: '2026-08-01' },
    at('2027-01-15')
  );

  it('states when the count was last read and what the page still publishes', () => {
    const body = formatSubscriberIssueBody(stale);

    expect(body).toContain('2026-08-01');
    expect(body).toContain('7100');
    expect(body).toContain(String(stale.ageMonths));
  });

  it('points at the sync and the key rather than at the page', () => {
    const body = formatSubscriberIssueBody(stale);

    expect(body).toContain('scripts/fetch-playlist.ts');
    expect(body).toContain('YOUTUBE_API_KEY');
  });

  // The obvious "fix" is to type the number in by hand somewhere, which puts
  // back the second copy this page was rebuilt to remove.
  it('tells the reader not to hand-copy the figure instead', () => {
    expect(formatSubscriberIssueBody(stale)).toMatch(/do \*\*not\*\* hand-copy/i);
  });

  it('says plainly when there is no stamp at all', () => {
    const missing = assessSubscriberFreshness(
      { count: 7100, fetchedAt: '2026-08-01' },
      at('2026-08-02')
    );

    expect(formatSubscriberIssueBody(missing)).toMatch(/no readable `checkedAt`/i);
  });
});

describe('SUBSCRIBER_ISSUE_TITLE', () => {
  it('is a fixed string, and not the media-kit one', () => {
    expect(SUBSCRIBER_ISSUE_TITLE).toBeTruthy();
    expect(SUBSCRIBER_ISSUE_TITLE).not.toMatch(/\d/);
    expect(SUBSCRIBER_ISSUE_TITLE).not.toBe(ISSUE_TITLE);
  });
});
