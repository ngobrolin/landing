import { describe, it, expect } from 'vitest';
import {
  MAX_AGE_MONTHS,
  ISSUE_TITLE,
  addMonths,
  assessMediaKitFreshness,
  formatIssueBody,
  type MediaKitFreshness,
} from './media-kit-freshness';

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
