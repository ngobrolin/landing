/**
 * Pure logic for the one `/partners` figure a read-only API key can derive.
 *
 * Subscriber count is public channel data: `channels.list` with the
 * `statistics` part answers it with the `YOUTUBE_API_KEY` the repo already has.
 * Every other figure on that page — the age split, returning-viewer share,
 * watch hours, average view duration, geography — is YouTube *Analytics* data,
 * owner-scoped OAuth only, and is deliberately out of scope. Those are what
 * `media-kit-freshness.ts` nags about instead.
 *
 * The rule this module exists to hold is **fail soft**. The count is folded
 * into the weekly playlist sync, and that sync's job is episodes; a channel
 * call that 403s on quota, or comes back with a hidden subscriber count, must
 * leave the last known figure exactly where it is and let the episode work
 * finish. A transient hiccup blanking a number on the page a sponsor is sent to
 * would be a worse failure than never having automated it.
 *
 * Failing soft *silently* would be its own version of the problem this page is
 * paying down, though: a revoked key leaves a figure ageing on the page with
 * nothing announcing it. So every successful read stamps `checkedAt`, and the
 * same monthly check that nags about the hand-copied figures nags when that
 * stamp stops moving.
 *
 * I/O lives in `scripts/fetch-playlist.ts`; the store is
 * `src/data/channel-subscribers.json`.
 */

export interface StoredSubscribers {
  /** Rounded by the API for large channels — 7100, not 7134. That is fine. */
  count: number;
  /** ISO date (YYYY-MM-DD) this count was first observed. */
  fetchedAt: string;
  /**
   * ISO date (YYYY-MM-DD) the count was last read successfully, whether or not
   * it had moved. Optional because a store written before this existed has
   * none, and an absent stamp is treated as "never read" by the alarm.
   *
   * Distinct from `fetchedAt` on purpose. `fetchedAt` answers "how old is the
   * number the page prints", which is what a sponsor is owed and what the page
   * renders. `checkedAt` answers "is this thing still refreshing itself at
   * all", which is what nobody would otherwise notice: a revoked key or a
   * permanently exhausted quota makes every run fail soft and leave the file
   * alone, which is byte-for-byte what a healthy unchanged count looks like.
   * `scripts/lib/media-kit-freshness.ts` nags once this stamp goes old.
   */
  checkedAt?: string;
}

export interface ApplyResult {
  /** What to store. `null` only when nothing was stored and nothing arrived. */
  next: StoredSubscribers | null;
  /** Whether `next` differs from what was stored, i.e. whether to write. */
  updated: boolean;
  /** One line for the sync's log. Always set: a silent skip reads as success. */
  reason: string;
}

interface ChannelsResponse {
  items?: Array<{ statistics?: { subscriberCount?: string | number } }>;
}

/**
 * Dig the subscriber count out of a `channels.list` response.
 *
 * Returns null for everything unusable rather than throwing, so the caller has
 * one shape to fail soft on: a quota error body, an empty `items` (a channel id
 * that matched nothing), a channel that hides its subscriber count, a truncated
 * response. Zero and negatives are unusable too — a channel publishing this
 * page does not have zero subscribers, and rendering "0" is the blanking the
 * fail-soft rule exists to prevent.
 */
export function parseSubscriberCount(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const items = (payload as ChannelsResponse).items;
  if (!Array.isArray(items) || items.length === 0) return null;

  const raw = items[0]?.statistics?.subscriberCount;
  if (raw === undefined || raw === null) return null;

  const count = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(count) || count <= 0) return null;

  return Math.trunc(count);
}

/**
 * How long a `checkedAt` stamp may stand before a successful read refreshes it.
 *
 * The tension: the stamp is only useful if every successful read writes it, and
 * every write to this file opens a pull request, so a stamp precise to the day
 * would put back the weekly one-line PR the unchanged-count rule exists to
 * avoid — and a PR nobody needs to read is how a real `episodes.json` diff
 * sails through unlooked-at. The way out taken here is the coarsest one that
 * still works: the stamp is written on every successful read but only *stored*
 * once it has gone a month old, so a stalled sync is spotted while an unchanged
 * count costs at most twelve one-line PRs a year rather than fifty-two.
 *
 * It works because the alarm is measured in months, not weeks (see
 * `SUBSCRIBER_MAX_AGE_MONTHS`): a weekly sync refreshes the stamp within 30+7
 * days at worst, comfortably inside the two-month threshold, so a healthy
 * repository never nags and a silent one always does.
 */
export const CHECKED_AT_REFRESH_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a successful read should be written down, given the stamp already
 * stored. An absent or unreadable stamp always is: the alarm reads it as "never
 * read", so leaving it unwritten would nag about a sync that is working.
 */
function stampIsDue(checkedAt: string | undefined, now: Date): boolean {
  if (typeof checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
    return true;
  }

  const stamped = new Date(`${checkedAt}T00:00:00Z`).getTime();
  if (!Number.isFinite(stamped)) return true;

  return now.getTime() - stamped >= CHECKED_AT_REFRESH_DAYS * DAY_MS;
}

/**
 * Decide what to store, given what is stored and what (if anything) arrived.
 *
 * An unchanged count is deliberately *not* a write of the count. The sync opens
 * a pull request from its diff, so re-stamping `fetchedAt` every week would open
 * a one-line PR every week. `fetchedAt` therefore means "this figure has read
 * this way since", which is the honest, understating direction; the page says so
 * rather than implying a fresher reading. Only `checkedAt` moves on an unchanged
 * count, and only once a month — see `CHECKED_AT_REFRESH_DAYS`.
 *
 * A failed read writes nothing at all. That is the point of the stamp: a run
 * that could not reach the API must leave every date exactly where it was, so
 * the silence accumulates until something says so.
 */
export function applySubscriberCount(
  stored: StoredSubscribers | null,
  count: number | null,
  now: Date
): ApplyResult {
  if (count === null) {
    return {
      next: stored,
      updated: false,
      reason: stored
        ? `Channel statistics unavailable; keeping the last known ${stored.count} subscribers from ${stored.fetchedAt} (last read successfully ${stored.checkedAt ?? 'never'}).`
        : 'Channel statistics unavailable and none stored; the subscriber tile stays off the page.',
    };
  }

  const today = now.toISOString().slice(0, 10);

  if (stored && stored.count === count) {
    if (!stampIsDue(stored.checkedAt, now)) {
      return {
        next: stored,
        updated: false,
        reason: `Subscriber count unchanged at ${count} (recorded ${stored.fetchedAt}, last read ${stored.checkedAt}); not rewriting the file.`,
      };
    }

    return {
      next: { ...stored, checkedAt: today },
      updated: true,
      reason: `Subscriber count unchanged at ${count} (recorded ${stored.fetchedAt}); refreshing the last-read stamp to ${today}.`,
    };
  }

  return {
    next: { count, fetchedAt: today, checkedAt: today },
    updated: true,
    reason: stored
      ? `Subscriber count moved ${stored.count} → ${count}; recorded ${today}.`
      : `Subscriber count ${count} recorded ${today}.`,
  };
}
