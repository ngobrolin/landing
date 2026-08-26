/**
 * Refusal rules for the playlist sync.
 *
 * The sync rewrites `src/data/episodes.json` wholesale, so two states are
 * dangerous and neither errors on its own:
 *
 *   1. **A bad baseline.** Merging against an empty list treats every episode
 *      as new and re-derives its slug from the current YouTube title — the
 *      exact URL move that stored slugs exist to prevent. An existing file
 *      holding `[]` is a truncated or clobbered file and is never a valid
 *      start; a genuinely absent file (`bootstrap`) may be one, but only when
 *      an operator says so with `ALLOW_EMPTY_BASELINE=1`, because `rm
 *      src/data/episodes.json` is otherwise the most reachable way to cause
 *      precisely the harm these guards exist to prevent.
 *   2. **A shrunken sync.** `fetchAllPlaylistEntries` pages the API 50 at a
 *      time. A transient failure mid-pagination returns a short list that looks
 *      exactly like a healthy sync of a smaller playlist. Retention (see
 *      `episode-merge.ts`) means nothing is deleted, but 50 episodes would be
 *      stamped `absentFromPlaylistSince` on the strength of an API hiccup.
 *
 * A refusal that names no way through is how a worse escape gets invented, and
 * refusing is only safe while the refusal is escapable: the floor guard runs
 * *before* the merge, so a refused run stamps nothing, the next run sees the
 * same shrink, and an unattended weekly workflow refuses forever. So the
 * escapable refusals carry their own sanctioned override, verbatim and
 * copy-pasteable, and every override is read from the environment per run —
 * nothing persists them, so the run after an override is guarded again.
 *
 * An override authorizes one specific known thing, never everything.
 * `ALLOW_SYNC_SHRINK` carries a count — `=10` means "I know about these ten" —
 * so a run that loses an API page while the override is set still refuses
 * rather than stamping 50 absences on the strength of an authorization for 10.
 * A blank cheque is what gets set once and then forgotten.
 *
 * And one refusal is deliberately *not* escapable: a zero-entry sync. Its own
 * basis is that the state cannot legitimately occur, so an override past it
 * would be incoherent — see `checkSyncFloor`.
 */

/**
 * Authorizes a sync-floor shrink of at most N episodes: `ALLOW_SYNC_SHRINK=10`.
 * A count, never a boolean. Per-run only; never persisted.
 */
export const SHRINK_OVERRIDE_ENV = "ALLOW_SYNC_SHRINK";

/** Lets one run start from a genuinely absent `episodes.json`. Per-run only. */
export const EMPTY_BASELINE_OVERRIDE_ENV = "ALLOW_EMPTY_BASELINE";

/** The invocation `.github/workflows/fetch-playlist.yml` runs, quoted in refusals. */
const SYNC_COMMAND = "YOUTUBE_API_KEY=... pnpm exec tsx scripts/fetch-playlist.ts";

/** The `workflow_dispatch` input that carries the shrink override into CI. */
const SHRINK_WORKFLOW_INPUT = "allow_shrink";

const UNTOUCHED = "Nothing was written; src/data/episodes.json is untouched.";

const NOT_BY_DELETING =
  `Do not delete src/data/episodes.json to get past this — that is the failure, not the fix: an empty baseline re-derives every slug from its current YouTube title and moves every published URL.`;

/** The copy-pasteable way through the shrink refusal, with the real count in it. */
function shrinkOverrideHowTo(shrink: number): string {
  return (
    `  Locally, run exactly this:\n` +
    `    ${SHRINK_OVERRIDE_ENV}=${shrink} ${SYNC_COMMAND}\n` +
    `  In CI, re-run the "Fetch YouTube Playlist" workflow from the Actions tab with the ${SHRINK_WORKFLOW_INPUT} input set to ${shrink}.\n` +
    `  ${SHRINK_OVERRIDE_ENV} authorizes a shrink of at most that many, not any shrink: if the run then loses an API page, the bigger drop still refuses.\n` +
    `  The override is per-run and nothing persists it, so the next run is guarded again with no further action.`
  );
}

/** Whether an override env var is set to an explicit yes. */
export function overrideEnabled(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const value = raw.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export type ShrinkAuthorization =
  | { kind: "absent" }
  | { kind: "authorized"; count: number }
  | { kind: "invalid"; raw: string };

/**
 * Read `ALLOW_SYNC_SHRINK` as the count of episodes the operator says they know
 * about.
 *
 * A boolean-ish value is refused rather than read as a yes: `=true` from
 * someone who meant "let it through" would otherwise authorize an unbounded
 * shrink, which is the blank cheque this parameter exists to replace.
 */
export function parseShrinkAuthorization(raw: string | undefined): ShrinkAuthorization {
  if (raw === undefined) return { kind: "absent" };

  const value = raw.trim();
  if (value === "") return { kind: "absent" };

  if (!/^\d+$/.test(value)) return { kind: "invalid", raw: value };

  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1) {
    return { kind: "invalid", raw: value };
  }

  return { kind: "authorized", count };
}

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
 *
 * `bootstrap` is not advisory: an absent file is only a legitimate empty start
 * when an operator opts in, so the caller must put it through
 * `checkBootstrapBaseline` before merging against it.
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

export type BootstrapResult =
  | { ok: true; overridden: boolean }
  | { ok: false; reason: string };

export type FloorResult =
  | { ok: true; overridden: false }
  | { ok: true; overridden: true; authorized: number; shrink: number }
  | { ok: false; reason: string };

export interface FloorOptions {
  /**
   * Raw `ALLOW_SYNC_SHRINK` for this run: a positive whole number authorizing a
   * shrink of at most that many episodes.
   */
  override?: string;
}

/**
 * Refuse a genuinely absent `src/data/episodes.json` unless an operator says
 * the empty start is deliberate.
 *
 * A first sync legitimately has no baseline, but a missing file is far more
 * often a deleted or unstaged one — and `rm src/data/episodes.json` is the
 * escape a maintainer reaches for when some *other* guard refuses. Silently
 * accepting it hands them the exact catastrophe the guards exist to prevent.
 */
export function checkBootstrapBaseline(bootstrap: boolean, override: boolean): BootstrapResult {
  if (!bootstrap || override) {
    return { ok: true, overridden: bootstrap && override };
  }

  return {
    ok: false,
    reason:
      `src/data/episodes.json is missing. A first-ever sync may legitimately start from nothing, but a missing file is far more often a deleted or unstaged one, and merging against an empty baseline re-derives every slug from its current YouTube title and moves every published URL.\n` +
      `  ${UNTOUCHED}\n` +
      `  If the file should be there, restore it and re-run:\n` +
      `    git checkout -- src/data/episodes.json\n` +
      `  If this really is a first-ever bootstrap, say so explicitly:\n` +
      `    ${EMPTY_BASELINE_OVERRIDE_ENV}=1 ${SYNC_COMMAND}`,
  };
}

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
 *
 * `options.override` is the one sanctioned way through the *shrink* refusal,
 * and it exists because that refusal alone is a trap: nothing is written, so
 * nothing is stamped `absentFromPlaylistSince`, so the next run measures the
 * identical shrink and refuses identically, forever. An overridden run proceeds
 * to the merge, which retains every record and stamps the absences — and
 * because the shrink is then recorded, the run after it passes on its own.
 *
 * It authorizes a magnitude, not a mood: a shrink larger than the count still
 * refuses, so an API page lost during an override run is caught rather than
 * stamped.
 */
export function checkSyncFloor(
  syncedCount: number,
  baselineCount: number,
  options: FloorOptions = {},
): FloorResult {
  // Deliberately first, and deliberately not overridable: this refusal's own
  // basis is that the playlist is never empty, so there is no real state for an
  // override to authorize. Advertising one here would teach the wrong escape.
  if (syncedCount === 0) {
    return {
      ok: false,
      reason:
        `the sync returned zero playlist entries against a live baseline of ${baselineCount}. The playlist is never empty, so this is always an API or network failure, never a real change.\n` +
        `  ${UNTOUCHED}\n` +
        `  No override applies to this one — ${SHRINK_OVERRIDE_ENV} does not reach it, because a zero-entry playlist is not a state the sync can legitimately see.\n` +
        `  Re-run once the YouTube API is healthy:\n` +
        `    ${SYNC_COMMAND}\n` +
        `  ${NOT_BY_DELETING}`,
    };
  }

  const authorization = parseShrinkAuthorization(options.override);

  if (authorization.kind === "invalid") {
    return {
      ok: false,
      reason:
        `${SHRINK_OVERRIDE_ENV} is set to "${authorization.raw}", which is not a count. It authorizes a shrink of at most N episodes, so it must be a positive whole number — ${SHRINK_OVERRIDE_ENV}=10 means "I know about these ten".\n` +
        `  ${UNTOUCHED}\n` +
        `  It is not a boolean: true, yes and 0 authorize nothing. Unset it to run guarded, or set the count this refusal prints:\n` +
        `    ${SHRINK_OVERRIDE_ENV}=<count> ${SYNC_COMMAND}`,
    };
  }

  const allowed = allowedShrink(baselineCount);
  const shrink = baselineCount - syncedCount;

  // Inside the normal band the override is irrelevant, authorized or not.
  if (shrink <= allowed) {
    return { ok: true, overridden: false };
  }

  if (authorization.kind === "absent") {
    return {
      ok: false,
      reason:
        `the sync returned ${syncedCount} entries against a baseline of ${baselineCount} — ${shrink} fewer, and at most ${allowed} is plausible as a real removal. A drop this size looks like a lost API page mid-pagination.\n` +
        `  ${UNTOUCHED}\n` +
        `  If the drop is real and you know about all ${shrink}, authorize exactly that many: the merge keeps every record and stamps them absentFromPlaylistSince, which is also what clears this refusal for the next run.\n` +
        `${shrinkOverrideHowTo(shrink)}\n` +
        `  ${NOT_BY_DELETING}`,
    };
  }

  if (shrink > authorization.count) {
    return {
      ok: false,
      reason:
        `the sync returned ${syncedCount} entries against a baseline of ${baselineCount} — ${shrink} fewer, but ${SHRINK_OVERRIDE_ENV} authorized at most ${authorization.count}. Authorizing ${authorization.count} and seeing ${shrink} is the lost-API-page accident this check exists to catch, not the removal that was approved.\n` +
        `  ${UNTOUCHED}\n` +
        `  Re-run and let the count settle. Only if all ${shrink} really did leave the playlist, authorize that many:\n` +
        `${shrinkOverrideHowTo(shrink)}\n` +
        `  ${NOT_BY_DELETING}`,
    };
  }

  return { ok: true, overridden: true, authorized: authorization.count, shrink };
}
