/**
 * Refusal rules for the playlist sync.
 *
 * The sync rewrites `src/data/episodes.json` wholesale, so two states are
 * dangerous and neither errors on its own:
 *
 *   1. **A bad baseline.** Merging against an empty list treats every episode
 *      as new and re-derives its slug from the current YouTube title — the
 *      exact URL move that stored slugs exist to prevent. A genuinely absent
 *      file is the one legitimate empty start (bootstrap); an existing file
 *      holding `[]` is not, it is a truncated or clobbered file.
 *   2. **A shrunken sync.** `fetchAllPlaylistEntries` pages the API 50 at a
 *      time. A transient failure mid-pagination returns a short list that looks
 *      exactly like a healthy sync of a smaller playlist. Retention (see
 *      `episode-merge.ts`) means nothing is deleted, but 50 episodes would be
 *      stamped `absentFromPlaylistSince` on the strength of an API hiccup.
 *
 * Both are contained today — the golden slug guard fails the automated PR — so
 * this is hardening a known-contained failure. A clear refusal beats cleverness.
 */

/** Largest legitimate one-sync shrink, as a fraction of the existing baseline. */
const MAX_SHRINK_RATIO = 0.05;

/** Floor for tiny baselines, so a 3-episode list can still lose an episode. */
const MIN_SHRINK_ALLOWANCE = 2;

/**
 * How many fewer entries a sync may return before it is treated as truncated.
 *
 * The band is set by the two failure modes it sits between. Below it: a human
 * removing an episode from the playlist, which is one or two at a time. Above
 * it: a lost API page, which is up to 50. At the current 178 episodes this
 * allows 8 — comfortably clear of both.
 */
export function allowedShrink(baselineCount: number): number {
  return Math.max(MIN_SHRINK_ALLOWANCE, Math.floor(baselineCount * MAX_SHRINK_RATIO));
}

export type BaselineResult =
  | { ok: true; bootstrap: boolean; episodes: unknown[] }
  | { ok: false; reason: string };

/**
 * Validate the on-disk baseline. Pass `undefined` for a file that is genuinely
 * absent (ENOENT); anything else — including an unreadable file — must be
 * treated as a refusal by the caller, not passed in as absent.
 */
export function readBaseline(raw: string | undefined): BaselineResult {
  if (raw === undefined) {
    return { ok: true, bootstrap: true, episodes: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      reason: `src/data/episodes.json is present but could not be parsed: ${(error as Error).message}`,
    };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, reason: "src/data/episodes.json parsed but is not an array." };
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      reason:
        "src/data/episodes.json exists but is an empty array. An existing file with no episodes is a truncated file, not a valid starting point: merging against it would re-derive every slug from its current YouTube title and move every indexed URL.",
    };
  }

  return { ok: true, bootstrap: false, episodes: parsed };
}

export type FloorResult = { ok: true } | { ok: false; reason: string };

/**
 * The baseline the floor measures against: records the playlist was still
 * returning last run.
 *
 * Retention (see `episode-merge.ts`) means a record already marked
 * `absentFromPlaylistSince` stays in `episodes.json` forever, but the sync will
 * never return its video again. Counting those as baseline turns their absence
 * into a shrink on *every* future run, so accumulated retentions would
 * eventually exceed `allowedShrink` and deadlock the weekly sync. The floor is
 * about episodes going absent *this run*, so the baseline is live records only.
 */
export function liveBaselineCount(
  episodes: readonly { absentFromPlaylistSince?: string }[],
): number {
  return episodes.filter((ep) => !ep.absentFromPlaylistSince).length;
}

/**
 * Refuse a sync result that is empty or implausibly smaller than the baseline.
 * Refusing means writing nothing and exiting non-zero — a shrunken write would
 * become the next run's baseline.
 *
 * `baselineCount` means live records only — see `liveBaselineCount`.
 */
export function checkSyncFloor(syncedCount: number, baselineCount: number): FloorResult {
  if (syncedCount === 0) {
    return {
      ok: false,
      reason:
        "the sync returned zero playlist entries. The playlist is never empty, so this is an API or network failure, not a real change.",
    };
  }

  const allowed = allowedShrink(baselineCount);
  const shrink = baselineCount - syncedCount;

  if (shrink > allowed) {
    return {
      ok: false,
      reason: `the sync returned ${syncedCount} entries against a baseline of ${baselineCount} — ${shrink} fewer, and at most ${allowed} is plausible as a real removal. A drop this size looks like a lost API page mid-pagination.`,
    };
  }

  return { ok: true };
}
