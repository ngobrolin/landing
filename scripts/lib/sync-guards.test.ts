import { describe, it, expect } from "vitest";
import {
  readBaseline,
  checkBootstrapBaseline,
  checkSyncFloor,
  allowedShrink,
  liveBaselineCount,
  overrideEnabled,
  SHRINK_OVERRIDE_ENV,
  EMPTY_BASELINE_OVERRIDE_ENV,
} from "./sync-guards";
import { mergeEpisodes, type StoredEpisode, type SyncedEpisode } from "./episode-merge";

function baselineOf(live: number, absent: number) {
  return [
    ...Array.from({ length: live }, (_, i) => ({ videoId: `live${i}` })),
    ...Array.from({ length: absent }, (_, i) => ({
      videoId: `gone${i}`,
      absentFromPlaylistSince: "2026-01-01T00:00:00.000Z",
    })),
  ];
}

describe("readBaseline", () => {
  it("treats a genuinely absent file as a legitimate empty baseline", () => {
    const result = readBaseline(undefined);
    expect(result).toEqual({ ok: true, bootstrap: true, episodes: [] });
  });

  it("rejects an existing file that parses to an empty array", () => {
    const result = readBaseline("[]");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/empty/i);
  });

  it("rejects a file that parses to an empty array with whitespace and newlines", () => {
    expect(readBaseline("[\n\n]\n").ok).toBe(false);
  });

  it("rejects unparseable JSON", () => {
    const result = readBaseline("{not json");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/pars/i);
  });

  it("rejects a parse that is not an array", () => {
    const result = readBaseline('{"videoId":"vid1"}');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/array/i);
  });

  it("accepts a populated array", () => {
    const result = readBaseline('[{"videoId":"vid1","title":"t"}]');
    expect(result.ok).toBe(true);
    expect(result.ok && result.bootstrap).toBe(false);
    expect(result.ok && result.episodes).toHaveLength(1);
  });
});

describe("allowedShrink", () => {
  it("never allows a drop anywhere near a lost API page of 50", () => {
    expect(allowedShrink(178)).toBeLessThan(50);
  });

  it("allows at least a couple of removals even on a tiny baseline", () => {
    expect(allowedShrink(3)).toBeGreaterThanOrEqual(2);
  });
});

describe("liveBaselineCount", () => {
  it("counts records the sync can still return, not the whole file", () => {
    expect(liveBaselineCount(baselineOf(169, 9))).toBe(169);
  });

  it("counts every record when nothing has ever gone absent", () => {
    expect(liveBaselineCount(baselineOf(178, 0))).toBe(178);
  });

  it("treats a record written before the marker existed as live", () => {
    expect(liveBaselineCount([{ videoId: "legacy" } as { absentFromPlaylistSince?: string }])).toBe(1);
  });
});

describe("checkSyncFloor", () => {
  // Retained records never come back from the sync, so measuring the floor
  // against the whole file makes their absence a shrink on every future run —
  // an accumulating gap that eventually deadlocks the weekly sync for good.
  it("does not refuse a healthy sync just because retentions have accumulated", () => {
    const baseline = baselineOf(169, 9);
    expect(baseline).toHaveLength(178);
    expect(checkSyncFloor(169, liveBaselineCount(baseline)).ok).toBe(true);
    expect(checkSyncFloor(169, baseline.length).ok).toBe(false);
  });

  it("still refuses a lost API page once retained records are excluded", () => {
    expect(checkSyncFloor(119, liveBaselineCount(baselineOf(169, 9))).ok).toBe(false);
  });

  it("refuses a sync that returned nothing at all", () => {
    const result = checkSyncFloor(0, 178);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/zero|no entries/i);
  });

  it("refuses an empty sync even when bootstrapping from no file", () => {
    expect(checkSyncFloor(0, 0).ok).toBe(false);
  });

  it("refuses a sync missing a whole API page", () => {
    expect(checkSyncFloor(128, 178).ok).toBe(false);
  });

  it("allows normal growth", () => {
    expect(checkSyncFloor(179, 178).ok).toBe(true);
  });

  it("allows an unchanged playlist", () => {
    expect(checkSyncFloor(178, 178).ok).toBe(true);
  });

  it("allows a legitimate single removal", () => {
    expect(checkSyncFloor(177, 178).ok).toBe(true);
  });

  it("names the numbers in its refusal so the run log explains itself", () => {
    const result = checkSyncFloor(100, 178);
    expect(result.ok === false && result.reason).toContain("100");
    expect(result.ok === false && result.reason).toContain("178");
  });
});

describe("overrideEnabled", () => {
  it("is off when the env var is unset or empty", () => {
    expect(overrideEnabled(undefined)).toBe(false);
    expect(overrideEnabled("")).toBe(false);
  });

  it("is off for the string GitHub Actions writes for an unchecked boolean input", () => {
    expect(overrideEnabled("false")).toBe(false);
    expect(overrideEnabled("0")).toBe(false);
  });

  it("is on only for an explicit yes", () => {
    expect(overrideEnabled("1")).toBe(true);
    expect(overrideEnabled("true")).toBe(true);
    expect(overrideEnabled(" TRUE ")).toBe(true);
  });
});

describe("checkBootstrapBaseline", () => {
  it("refuses an absent episodes.json without the opt-in", () => {
    const result = checkBootstrapBaseline(true, false);
    expect(result.ok).toBe(false);
  });

  it("accepts an absent episodes.json when the opt-in is explicit", () => {
    const result = checkBootstrapBaseline(true, true);
    expect(result.ok).toBe(true);
    expect(result.ok && result.overridden).toBe(true);
  });

  it("leaves a normal populated baseline alone, override or not", () => {
    expect(checkBootstrapBaseline(false, false)).toEqual({ ok: true, overridden: false });
    expect(checkBootstrapBaseline(false, true)).toEqual({ ok: true, overridden: false });
  });

  // `rm src/data/episodes.json` is the escape a maintainer invents when some
  // other guard refuses, and it re-derives every slug. The refusal has to say
  // both what to run instead and how to bootstrap for real.
  it("names its own override verbatim so the message cannot drift from the mechanism", () => {
    const result = checkBootstrapBaseline(true, false);
    const reason = result.ok === false ? result.reason : "";
    expect(reason).toContain(EMPTY_BASELINE_OVERRIDE_ENV);
    expect(reason).toContain(
      `${EMPTY_BASELINE_OVERRIDE_ENV}=1 YOUTUBE_API_KEY=... pnpm exec tsx scripts/fetch-playlist.ts`,
    );
    expect(reason).toContain("git checkout -- src/data/episodes.json");
  });
});

describe("checkSyncFloor override", () => {
  it("still refuses a lost API page when the override is absent", () => {
    expect(checkSyncFloor(128, 178).ok).toBe(false);
    expect(checkSyncFloor(128, 178, {}).ok).toBe(false);
    expect(checkSyncFloor(128, 178, { override: false }).ok).toBe(false);
  });

  it("lets one run through the shrink refusal when the override is set", () => {
    const result = checkSyncFloor(128, 178, { override: true });
    expect(result.ok).toBe(true);
    expect(result.ok && result.overridden).toBe(true);
  });

  it("lets one run through the zero-entry refusal when the override is set", () => {
    expect(checkSyncFloor(0, 178, { override: true }).ok).toBe(true);
  });

  it("does not report a healthy sync as overridden", () => {
    expect(checkSyncFloor(177, 178, { override: true })).toEqual({ ok: true, overridden: false });
  });

  // The message is the whole mechanism as far as whoever hits this at 08:00 on
  // a Wednesday is concerned: if it does not name its own override, they invent
  // a worse one.
  it.each([
    ["a shrunken sync", () => checkSyncFloor(100, 178)],
    ["an empty sync", () => checkSyncFloor(0, 178)],
  ])("names its own override verbatim when refusing %s", (_label, run) => {
    const result = run();
    const reason = result.ok === false ? result.reason : "";
    expect(reason).toContain(SHRINK_OVERRIDE_ENV);
    expect(reason).toContain(
      `${SHRINK_OVERRIDE_ENV}=1 YOUTUBE_API_KEY=... pnpm exec tsx scripts/fetch-playlist.ts`,
    );
    expect(reason).toContain("allow_shrink");
    expect(reason).toMatch(/do not delete src\/data\/episodes\.json/i);
    expect(reason).toMatch(/re-derives every slug/i);
  });

  it("keeps the diagnostic numbers alongside the override instructions", () => {
    const result = checkSyncFloor(100, 178);
    const reason = result.ok === false ? result.reason : "";
    expect(reason).toContain("100");
    expect(reason).toContain("178");
    expect(reason).toContain(String(allowedShrink(178)));
  });
});

/**
 * The floor guard runs before the merge, so a refused run stamps nothing and
 * the next run measures the identical shrink. Without a way through, an
 * unattended weekly sync refuses forever. These cover the whole escape: refuse,
 * override once, and be guarded again on the run after.
 */
describe("recovering from a shrink the floor refuses", () => {
  function episode(videoId: string, over: Partial<StoredEpisode> = {}): StoredEpisode {
    return {
      videoId,
      title: `${videoId} - Ngobrolin WEB`,
      description: "desc",
      publishedAt: "2026-07-29T12:00:00Z",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      position: 0,
      duration: "PT1H",
      slug: `${videoId}-ngobrolin-web`,
      audioUrl: `https://example.com/audio/${videoId}.mp3`,
      audioDuration: 3600,
      audioFileSize: 57600000,
      ...over,
    };
  }

  const baseline = Array.from({ length: 178 }, (_, i) => episode(`vid${i}`));
  // Twenty episodes went private in one week: well past allowedShrink(178) = 8.
  const synced = baseline.slice(0, 158).map(({ slug, audioUrl, audioDuration, audioFileSize, ...ep }) => ep as SyncedEpisode);
  const SYNC_DATE = "2026-08-26T00:00:00.000Z";

  it("refuses the run, so nothing is written and nothing is stamped", () => {
    expect(checkSyncFloor(synced.length, liveBaselineCount(baseline)).ok).toBe(false);
  });

  it("lets the override through and the merge then stamps every absence", () => {
    const floor = checkSyncFloor(synced.length, liveBaselineCount(baseline), { override: true });
    expect(floor.ok).toBe(true);

    const { episodes, retained } = mergeEpisodes(synced, baseline, { syncedAt: SYNC_DATE });

    expect(retained).toHaveLength(20);
    expect(episodes).toHaveLength(178);

    const stamped = episodes.filter((ep) => ep.absentFromPlaylistSince);
    expect(stamped).toHaveLength(20);
    expect(stamped.every((ep) => ep.absentFromPlaylistSince === SYNC_DATE)).toBe(true);
    expect(stamped.map((ep) => ep.videoId)).toEqual(baseline.slice(158).map((ep) => ep.videoId));
    expect(stamped.every((ep) => ep.slug === `${ep.videoId}-ngobrolin-web`)).toBe(true);
    expect(stamped.every((ep) => ep.audioUrl && ep.audioDuration && ep.audioFileSize)).toBe(true);
  });

  it("is not sticky: the next run needs no override, and a fresh shrink is refused again", () => {
    const { episodes: written } = mergeEpisodes(synced, baseline, { syncedAt: SYNC_DATE });

    // Nothing persists the override itself — only the stamped absences.
    expect(JSON.stringify(written)).not.toContain(SHRINK_OVERRIDE_ENV);

    // The same playlist next week now measures as no shrink at all.
    expect(liveBaselineCount(written)).toBe(158);
    expect(checkSyncFloor(synced.length, liveBaselineCount(written)).ok).toBe(true);

    // And the guard is fully back: a fresh unexplained drop still refuses.
    expect(checkSyncFloor(120, liveBaselineCount(written)).ok).toBe(false);
  });
});
