/**
 * Pure logic for the media-kit freshness alarm.
 *
 * `/partners` is the page a sponsor is sent to, so its job is to be believed.
 * Every wrong figure it has shipped — "164+ Episode", "1K+ Views/Episode",
 * "Konsistensi 4+ Tahun" — was wrong because nothing ever announced it had gone
 * stale, not because updating it was hard. The derivable figure (subscriber
 * count) is now derived by the weekly sync; this module covers the ones that
 * cannot be, and it is the load-bearing half.
 *
 * Those figures are YouTube **Analytics** data — audience age split, returning
 * viewers, geography, watch hours, average view duration — which is owner-
 * scoped and needs OAuth. Automating them was ruled out deliberately: no
 * refresh token, no consent flow, no new repository secret. So they are
 * hand-copied into `src/data/media-kit.json` with the date they were captured,
 * and this decides when that date has gone old enough to say something about.
 *
 * It raises a GitHub issue rather than failing a build, for the same reason
 * `playlist-drift.ts` does: a red check on a scheduled job is noise a
 * maintainer learns to skip, while an issue is a thing with a name that stays
 * open until somebody deals with it. I/O lives in
 * `scripts/check-media-kit-freshness.ts`.
 */

/**
 * How old the hand-copied figures may get before the alarm sounds.
 *
 * Four months: long enough that a refresh is a real quarterly-ish chore rather
 * than a monthly nag people mute, short enough that a figure on the sponsor
 * page is never a year out of date.
 */
export const MAX_AGE_MONTHS = 4;

/** Stable title so a monthly re-run updates one issue instead of opening a twelfth. */
export const ISSUE_TITLE =
  'Media-kit figures on /partners are due a refresh';

/** Where the hand-maintained figures live, quoted in the issue. */
export const MEDIA_KIT_FILE = 'src/data/media-kit.json';

/** The sync that derives the one automatable figure, quoted in the issue. */
export const SYNC_SCRIPT = 'scripts/fetch-playlist.ts';

export interface MediaKitFigureRef {
  /** As it reads on the page, so a maintainer can match it by eye. */
  label: string;
  /** Where in YouTube Studio the current value is read off. */
  where: string;
}

export interface MediaKitFreshness {
  stale: boolean;
  /** Exactly what was stored, echoed back so the issue can quote it. */
  capturedAt: string;
  /** The date the figures fall due. Empty when `capturedAt` is unreadable. */
  dueAt: string;
  /** Whole months since capture. 0 when `capturedAt` is unreadable. */
  ageMonths: number;
  /** True when `capturedAt` could not be parsed — itself a reason to alarm. */
  unreadable: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  // Round-trip through UTC so 2026-13-01 and 2026-02-30 are rejected rather
  // than silently rolling into the next month.
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return { y, m, d };
}

/**
 * Add whole months to an ISO date, clamping to the last day of the target
 * month. 2026-10-31 + 4 is 2027-02-28, not 2027-03-03: rolling over would push
 * the due date later than a month-end capture has earned.
 */
export function addMonths(iso: string, months: number): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';

  const { y, m, d } = parsed;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));

  return target.toISOString().slice(0, 10);
}

function wholeMonthsBetween(from: string, now: Date): number {
  const parsed = parseIsoDate(from);
  if (!parsed) return 0;

  let months =
    (now.getUTCFullYear() - parsed.y) * 12 + (now.getUTCMonth() + 1 - parsed.m);
  if (now.getUTCDate() < parsed.d) months -= 1;

  return Math.max(0, months);
}

/**
 * Decide whether the hand-copied figures have gone stale.
 *
 * The four-month anniversary itself fires, rather than the day after it. The
 * check runs monthly, so treating the anniversary as "not *older* than four
 * months" would cost a whole extra month of a stale figure standing on the
 * sponsor page — a full month is a real price for an off-by-one day.
 *
 * An unreadable `capturedAt` is stale. A guard that cannot read its own date
 * and reports all-clear is indistinguishable from a guard that checked, and
 * that indistinguishability is the failure this page is paying down.
 */
export function assessMediaKitFreshness(
  capturedAt: string,
  now: Date
): MediaKitFreshness {
  const dueAt = addMonths(capturedAt, MAX_AGE_MONTHS);

  if (!dueAt) {
    return { stale: true, capturedAt, dueAt: '', ageMonths: 0, unreadable: true };
  }

  const due = new Date(`${dueAt}T00:00:00Z`).getTime();

  return {
    stale: now.getTime() >= due,
    capturedAt,
    dueAt,
    ageMonths: wholeMonthsBetween(capturedAt, now),
    unreadable: false,
  };
}

export function formatIssueBody(
  freshness: MediaKitFreshness,
  figures: readonly MediaKitFigureRef[]
): string {
  const lines: string[] = [];

  if (freshness.unreadable) {
    lines.push(
      `The \`capturedAt\` date in \`${MEDIA_KIT_FILE}\` could not be read: \`${freshness.capturedAt}\`.`,
      '',
      'Until it parses as an ISO date (`YYYY-MM-DD`), this check cannot tell whether the figures below are current, so it assumes they are not. Fix the date first — an unreadable one is worse than an old one, because it reports all-clear forever.',
      ''
    );
  } else {
    lines.push(
      `The hand-copied media-kit figures on [/partners](https://ngobrol.in/partners) were captured on **${freshness.capturedAt}** — ${freshness.ageMonths} month(s) ago, past the ${MAX_AGE_MONTHS}-month mark they fell due on (${freshness.dueAt}).`,
      '',
      'They are still on the page, presented to sponsors as current. Refresh them or the page is quietly claiming something it no longer knows.',
      ''
    );
  }

  lines.push('### Figures to refresh', '');
  for (const figure of figures) {
    lines.push(`- **${figure.label}** — ${figure.where}`);
  }

  lines.push(
    '',
    '### How to refresh',
    '',
    `1. Open **YouTube Studio → Analytics**, set the range these figures are quoted over, and read the current values (the media kit view under *Audience* has most of them side by side).`,
    `2. Edit \`${MEDIA_KIT_FILE}\`: update each value **and** set \`capturedAt\` to today's date in \`YYYY-MM-DD\`.`,
    `3. Open a PR. \`/partners\`, its meta description and its share card all read from that one file, so nothing else needs touching — and nothing else may restate a figure.`,
    '',
    'This issue closes itself on the next run once `capturedAt` is current.',
    '',
    '### Why this is not automated',
    '',
    `Every figure above is YouTube **Analytics** data, which is owner-scoped: reading it needs an OAuth consent flow and a stored refresh token. That was ruled out deliberately — no new repository secret. The read-only \`YOUTUBE_API_KEY\` cannot reach any of it.`,
    '',
    `The one figure it *can* reach — the channel **subscriber** count — is already derived automatically by \`${SYNC_SCRIPT}\` on the weekly sync, so do not hand-copy it here. If it ever looks wrong, that is a bug in the sync, not something to paper over with a manual value.`
  );

  return lines.join('\n');
}
