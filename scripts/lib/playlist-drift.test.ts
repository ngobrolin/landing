import { describe, it, expect } from "vitest";
import {
  EPISODE_TITLE_PATTERN,
  isEpisodeTitle,
  findMissingEpisodes,
  detectConventionDrift,
  formatIssueBody,
  ISSUE_TITLE,
  type ChannelVideo,
} from "./playlist-drift";

const NOW = new Date("2026-08-22T00:00:00Z");

function video(over: Partial<ChannelVideo> = {}): ChannelVideo {
  return {
    videoId: "vid1",
    title: "Something - Ngobrolin WEB",
    publishedAt: "2026-08-19T02:37:44Z",
    ...over,
  };
}

describe("isEpisodeTitle", () => {
  it("matches the ` - Ngobrolin WEB` suffix convention", () => {
    expect(isEpisodeTitle("Model Context Protocol - Ngobrolin WEB")).toBe(true);
  });

  it("ignores trailing whitespace", () => {
    expect(isEpisodeTitle("State of CSS - Ngobrolin WEB  ")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isEpisodeTitle("Tailwind - ngobrolin web")).toBe(true);
  });

  // Real titles from the playlist. The convention drifted over the years, and
  // an episode this rule misses is exactly the failure the check exists to stop.
  it.each([
    "Local Development Server - Ngobrolin WEB",
    "Ngobrolin Linter - Ngobrolin WEB ep51",
    "Ngobrolin Island Architecture - Ngobrolin WEB Ep1",
    "Ngobrolin PHP - Ngobrolin WEB & @sandhikagalihWPU",
    "Optimasi Performa JS - Ngborlin WEB",
    "Ngobrolin Otomasi bersama Jecelyn - Ngobrolin WEB ep36",
  ])("matches the real playlist title %j", (title) => {
    expect(isEpisodeTitle(title)).toBe(true);
  });

  // Real non-episode uploads from the same channel.
  it.each([
    "Praktik tokenmaxxing di Meta?!",
    "Instagram ngebug gara-gara vibe coding",
    "Apa bedanya chatbot/coding assistant dengan coding agent?",
    "\u2728\ud83d\udd34  Loop Engineering - Coding dengan AI bagian 8",
    "Ngobrolin WEB bahas AI",
  ])("rejects the clip or short %j", (title) => {
    expect(isEpisodeTitle(title)).toBe(false);
  });

  it("requires the separator, so a passing mention is not an episode", () => {
    expect(isEpisodeTitle("Rekap Ngobrolin WEB sepanjang 2026")).toBe(false);
  });

  it("rejects empty titles", () => {
    expect(isEpisodeTitle("")).toBe(false);
  });

  it("exposes the rule as a single exported pattern", () => {
    expect(EPISODE_TITLE_PATTERN).toBeInstanceOf(RegExp);
  });
});

describe("findMissingEpisodes", () => {
  it("flags an episode published to the channel but absent from the playlist", () => {
    const missing = findMissingEpisodes(
      [video({ videoId: "qei6_h3wwPY", title: "Model Context Protocol - Ngobrolin WEB" })],
      new Set(["-TwyNC_SSFY"]),
      { now: NOW },
    );

    expect(missing).toHaveLength(1);
    expect(missing[0].videoId).toBe("qei6_h3wwPY");
  });

  it("stays quiet when every published episode is in the playlist", () => {
    const missing = findMissingEpisodes(
      [video({ videoId: "-TwyNC_SSFY", title: "Local Development Server - Ngobrolin WEB" })],
      new Set(["-TwyNC_SSFY"]),
      { now: NOW },
    );

    expect(missing).toEqual([]);
  });

  it("ignores channel uploads that are not episodes", () => {
    const missing = findMissingEpisodes(
      [video({ videoId: "sV581caU4og", title: "Instagram ngebug gara-gara vibe coding" })],
      new Set(),
      { now: NOW },
    );

    expect(missing).toEqual([]);
  });

  it("ignores episodes published before the lookback window", () => {
    const missing = findMissingEpisodes(
      [video({ videoId: "old", publishedAt: "2026-01-01T00:00:00Z" })],
      new Set(),
      { now: NOW },
    );

    expect(missing).toEqual([]);
  });

  it("honours a custom window", () => {
    const args = [
      [video({ videoId: "x", publishedAt: "2026-08-01T00:00:00Z" })],
      new Set<string>(),
    ] as const;

    expect(findMissingEpisodes(...args, { now: NOW, windowDays: 60 })).toHaveLength(1);
    expect(findMissingEpisodes(...args, { now: NOW, windowDays: 7 })).toEqual([]);
  });

  it("returns newest first", () => {
    const missing = findMissingEpisodes(
      [
        video({ videoId: "older", publishedAt: "2026-08-10T00:00:00Z" }),
        video({ videoId: "newer", publishedAt: "2026-08-19T00:00:00Z" }),
      ],
      new Set(),
      { now: NOW },
    );

    expect(missing.map((v) => v.videoId)).toEqual(["newer", "older"]);
  });

  it("does not flag videos published in the future", () => {
    const missing = findMissingEpisodes(
      [video({ videoId: "scheduled", publishedAt: "2026-09-01T00:00:00Z" })],
      new Set(),
      { now: NOW },
    );

    expect(missing).toEqual([]);
  });
});

describe("detectConventionDrift", () => {
  it("reports no drift while recent playlist entries follow the convention", () => {
    expect(
      detectConventionDrift([
        "Local Development Server - Ngobrolin WEB",
        "State of CSS - Ngobrolin WEB",
        "Tailwind - Ngobrolin WEB",
      ]),
    ).toBeNull();
  });

  it("reports drift when known-good playlist entries stop matching the rule", () => {
    const drift = detectConventionDrift([
      "Episode 178: Local Development Server",
      "Episode 177: State of CSS",
      "Episode 176: Tailwind",
    ]);

    expect(drift).not.toBeNull();
    expect(drift!.matched).toBe(0);
    expect(drift!.sampled).toBe(3);
  });

  it("tolerates a single off-convention title without crying drift", () => {
    expect(
      detectConventionDrift([
        "Local Development Server - Ngobrolin WEB",
        "Liputan langsung Google I/O",
        "Tailwind - Ngobrolin WEB",
      ]),
    ).toBeNull();
  });

  it("returns null when there is nothing to sample", () => {
    expect(detectConventionDrift([])).toBeNull();
  });
});

describe("issue rendering", () => {
  it("uses a stable title so re-runs update instead of duplicating", () => {
    expect(ISSUE_TITLE).toMatch(/playlist/i);
  });

  it("lists each missing episode with a watch link and the manual fix", () => {
    const body = formatIssueBody(
      [video({ videoId: "qei6_h3wwPY", title: "Model Context Protocol - Ngobrolin WEB" })],
      null,
      { playlistId: "PLTY", windowDays: 60 },
    );

    expect(body).toContain("Model Context Protocol - Ngobrolin WEB");
    expect(body).toContain("https://www.youtube.com/watch?v=qei6_h3wwPY");
    expect(body).toContain("PLTY");
    expect(body).toMatch(/cannot add|manually|by hand/i);
  });

  it("mentions convention drift when the title rule looks stale", () => {
    const body = formatIssueBody([], { matched: 0, sampled: 5 }, { playlistId: "PLTY", windowDays: 60 });
    expect(body).toMatch(/convention/i);
  });
});
