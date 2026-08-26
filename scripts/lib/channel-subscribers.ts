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
 * I/O lives in `scripts/fetch-playlist.ts`; the store is
 * `src/data/channel-subscribers.json`.
 */

export interface StoredSubscribers {
  /** Rounded by the API for large channels — 7100, not 7134. That is fine. */
  count: number;
  /** ISO date (YYYY-MM-DD) this count was first observed. */
  fetchedAt: string;
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
 * Decide what to store, given what is stored and what (if anything) arrived.
 *
 * An unchanged count is deliberately *not* a write. The sync opens a pull
 * request from its diff, so re-stamping `fetchedAt` every week would open a
 * one-line PR every week — and a PR nobody needs to read is exactly how a real
 * episodes.json diff sails through unlooked-at. `fetchedAt` therefore means
 * "this figure has read this way since", which is the honest, understating
 * direction; the page says so rather than implying a fresher reading.
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
        ? `Channel statistics unavailable; keeping the last known ${stored.count} subscribers from ${stored.fetchedAt}.`
        : 'Channel statistics unavailable and none stored; the subscriber tile stays off the page.',
    };
  }

  if (stored && stored.count === count) {
    return {
      next: stored,
      updated: false,
      reason: `Subscriber count unchanged at ${count} (recorded ${stored.fetchedAt}); not rewriting the file.`,
    };
  }

  const fetchedAt = now.toISOString().slice(0, 10);

  return {
    next: { count, fetchedAt },
    updated: true,
    reason: stored
      ? `Subscriber count moved ${stored.count} → ${count}; recorded ${fetchedAt}.`
      : `Subscriber count ${count} recorded ${fetchedAt}.`,
  };
}
