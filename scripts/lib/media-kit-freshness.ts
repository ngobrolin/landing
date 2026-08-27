/**
 * Pure logic for the `/partners` freshness alarm — named for its main job, the
 * hand-copied media-kit figures, but it also watches the one derived figure for
 * the failure only automation can have: quietly not running any more.
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
 * The derived figure gets the other half of the same idea. The weekly sync
 * fails soft by design, so a revoked key or a permanently exhausted quota looks
 * exactly like a healthy week where the count did not move — the figure ages on
 * the sponsor page and nothing says so. `channel-subscribers.json` therefore
 * carries a `checkedAt` stamp of the last successful read, and this decides
 * when that stamp has stopped moving for long enough to be a fault rather than
 * a quiet week.
 *
 * It raises a GitHub issue rather than failing a build, for the same reason
 * `playlist-drift.ts` does: a red check on a scheduled job is noise a
 * maintainer learns to skip, while an issue is a thing with a name that stays
 * open until somebody deals with it. I/O lives in
 * `scripts/check-media-kit-freshness.ts` — one script, one schedule, one
 * credential (GITHUB_TOKEN), two issues it can open.
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
  return { capturedAt, ...assessAge(capturedAt, MAX_AGE_MONTHS, now) };
}

/** The age verdict itself, shared by both figures so the rule exists once. */
function assessAge(
  iso: string,
  maxAgeMonths: number,
  now: Date
): Omit<MediaKitFreshness, 'capturedAt'> {
  const dueAt = addMonths(iso, maxAgeMonths);

  if (!dueAt) {
    return { stale: true, dueAt: '', ageMonths: 0, unreadable: true };
  }

  const due = new Date(`${dueAt}T00:00:00Z`).getTime();

  return {
    stale: now.getTime() >= due,
    dueAt,
    ageMonths: wholeMonthsBetween(iso, now),
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

/**
 * How long the derived subscriber count may go without a successful read before
 * the silence is a fault rather than a quiet week.
 *
 * Two months, and the arithmetic matters: the sync runs weekly and records its
 * stamp at most every 30 days (`CHECKED_AT_REFRESH_DAYS` in
 * `channel-subscribers.ts`, which keeps an unchanged count from opening a PR a
 * week), so a healthy repository never shows a stamp older than about 37 days.
 * Two months clears that with room to spare, and this check runs monthly, so a
 * key revoked today surfaces within roughly three.
 */
export const SUBSCRIBER_MAX_AGE_MONTHS = 2;

/** Stable title, for the same reason `ISSUE_TITLE` is. */
export const SUBSCRIBER_ISSUE_TITLE =
  'The /partners subscriber count has stopped refreshing itself';

/** Where the derived figure and its stamps live, quoted in the issue. */
export const SUBSCRIBERS_FILE = 'src/data/channel-subscribers.json';

export interface SubscriberFreshness {
  /** True when the sync has stopped recording successful reads. */
  stale: boolean;
  /**
   * Whether a figure is actually on the page. Nothing usable stored means the
   * tile is omitted, so there is no ageing claim to nag about — and nagging
   * before the first successful sync would be an alarm about nothing.
   */
  published: boolean;
  /** The count the page prints, or null when none is published. */
  count: number | null;
  /** The date the page attributes that count to. Empty when unpublished. */
  fetchedAt: string;
  /** The stamp as stored. Empty when the store carries none at all. */
  checkedAt: string;
  /** The date the reads fall due. Empty when `checkedAt` is unreadable. */
  dueAt: string;
  /** Whole months since the last successful read. */
  ageMonths: number;
  /** True when there is no readable stamp — indistinguishable from never. */
  unreadable: boolean;
}

const ISO = (value: unknown): value is string =>
  typeof value === 'string' && parseIsoDate(value) !== null;

/**
 * Decide whether the derived subscriber figure is still refreshing itself.
 *
 * Takes the raw store because every shape it can hold is a real state: written
 * by the sync, hand-edited, half-written, or predating the stamp entirely. A
 * published count with no readable stamp is stale — the alarm cannot tell that
 * apart from a sync that has not run since the key was revoked, and reporting
 * all-clear on a state it cannot read is the silence this whole mechanism
 * exists to break.
 */
export function assessSubscriberFreshness(
  stored: unknown,
  now: Date
): SubscriberFreshness {
  const record = (typeof stored === 'object' && stored !== null ? stored : {}) as {
    count?: unknown;
    fetchedAt?: unknown;
    checkedAt?: unknown;
  };

  // The same test the page applies before it renders the tile, so the alarm
  // never fires about a figure no reader can see.
  const published =
    typeof record.count === 'number' &&
    Number.isFinite(record.count) &&
    record.count > 0 &&
    ISO(record.fetchedAt);

  const checkedAt = ISO(record.checkedAt) ? record.checkedAt : '';
  const fetchedAt = published ? (record.fetchedAt as string) : '';
  const count = published ? (record.count as number) : null;

  if (!published) {
    return {
      stale: false,
      published: false,
      count: null,
      fetchedAt: '',
      checkedAt,
      dueAt: '',
      ageMonths: 0,
      unreadable: false,
    };
  }

  const age = assessAge(checkedAt, SUBSCRIBER_MAX_AGE_MONTHS, now);

  return { published: true, count, fetchedAt, checkedAt, ...age };
}

export function formatSubscriberIssueBody(
  freshness: SubscriberFreshness
): string {
  const lines: string[] = [];

  if (freshness.unreadable) {
    lines.push(
      `\`${SUBSCRIBERS_FILE}\` carries no readable \`checkedAt\` date, so there is no evidence the weekly sync has read the subscriber count successfully at all.`,
      ''
    );
  } else {
    lines.push(
      `The weekly sync last read the channel subscriber count successfully on **${freshness.checkedAt}** — ${freshness.ageMonths} month(s) ago, past the ${SUBSCRIBER_MAX_AGE_MONTHS}-month mark it fell due on (${freshness.dueAt}).`,
      ''
    );
  }

  lines.push(
    `Meanwhile [/partners](https://ngobrol.in/partners) is still publishing **${freshness.count}** subscribers, attributed to ${freshness.fetchedAt} and labelled as refreshed automatically. It is not being refreshed, and it is getting older.`,
    '',
    '### Why this can happen quietly',
    '',
    `\`${SYNC_SCRIPT}\` fails soft on purpose: a channel call that 403s on quota, or comes back with the count hidden, leaves the last known figure standing rather than blanking a number on the page a sponsor is sent to. That is the right behaviour, and it is also indistinguishable from a healthy week where the count simply did not move — which is what \`checkedAt\` exists to tell apart.`,
    '',
    '### What to check',
    '',
    '1. The most recent **Fetch YouTube Playlist** workflow runs: the subscriber step logs a `⚠` line naming the failure.',
    '2. The `YOUTUBE_API_KEY` secret — revoked, restricted, or out of quota are the usual three. It only ever needs read access to public data.',
    `3. That the playlist still resolves to a channel; the id is read from the playlist response rather than configured.`,
    '',
    `Do **not** hand-copy a subscriber figure into \`${MEDIA_KIT_FILE}\` or anywhere else to paper over this. A second copy of a figure is the failure \`/partners\` was rebuilt to remove; fix the sync and the next run records both the count and the stamp.`,
    '',
    'This issue closes itself on the next run once a successful read has been recorded.'
  );

  return lines.join('\n');
}
