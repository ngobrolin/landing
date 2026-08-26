import { describe, it, expect } from "vitest";
import { readBaseline, checkSyncFloor, allowedShrink, liveBaselineCount } from "./sync-guards";

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
