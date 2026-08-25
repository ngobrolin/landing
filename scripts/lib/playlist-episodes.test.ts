import { describe, it, expect } from "vitest";
import {
  buildEpisodes,
  isUnavailableVideo,
  type PlaylistEntry,
  type VideoDetail,
} from "./playlist-episodes";

function entry(over: Partial<PlaylistEntry> = {}): PlaylistEntry {
  return {
    videoId: "vid1",
    title: "Something - Ngobrolin WEB",
    description: "desc",
    publishedAt: "2026-08-25T23:03:37Z",
    thumbnail: "https://i.ytimg.com/vi/vid1/hqdefault.jpg",
    position: 0,
    ...over,
  };
}

function detail(over: Partial<VideoDetail> = {}): VideoDetail {
  return {
    videoId: "vid1",
    duration: "PT1H2M3S",
    publishedAt: "2026-07-29T12:00:00Z",
    ...over,
  };
}

function detailsOf(...details: VideoDetail[]): Record<string, VideoDetail> {
  return Object.fromEntries(details.map((d) => [d.videoId, d]));
}

describe("isUnavailableVideo", () => {
  it.each(["Private video", "Deleted video"])("flags %j", (title) => {
    expect(isUnavailableVideo(title)).toBe(true);
  });

  it("passes a real episode title", () => {
    expect(isUnavailableVideo("Model Context Protocol - Ngobrolin WEB")).toBe(false);
  });
});

describe("buildEpisodes air date", () => {
  it("uses the video's own publish date, not the playlist item's", () => {
    // The real regression: JJqLKn25DJI aired 2026-07-29 but was back-added to
    // the playlist on 2026-08-25, which made it the newest episode everywhere.
    const { episodes } = buildEpisodes(
      [entry({ videoId: "JJqLKn25DJI", publishedAt: "2026-08-25T23:03:37Z" })],
      detailsOf(detail({ videoId: "JJqLKn25DJI", publishedAt: "2026-07-29T12:00:00Z" })),
    );

    expect(episodes).toHaveLength(1);
    expect(episodes[0].publishedAt).toBe("2026-07-29T12:00:00Z");
  });

  it("falls back to the playlist item's date when the video detail is absent", () => {
    const { episodes, missingDetails } = buildEpisodes(
      [entry({ videoId: "gone", publishedAt: "2026-08-25T23:03:37Z" })],
      detailsOf(),
    );

    expect(episodes[0].publishedAt).toBe("2026-08-25T23:03:37Z");
    expect(episodes[0].duration).toBeUndefined();
    // The fallback must be reportable, not silent.
    expect(missingDetails).toEqual(["gone"]);
  });

  it("falls back when the detail carries a duration but no publish date", () => {
    const { episodes, missingDetails } = buildEpisodes(
      [entry({ videoId: "vid1", publishedAt: "2026-08-25T23:03:37Z" })],
      detailsOf({ videoId: "vid1", duration: "PT10M", publishedAt: "" }),
    );

    expect(episodes[0].publishedAt).toBe("2026-08-25T23:03:37Z");
    expect(episodes[0].duration).toBe("PT10M");
    expect(missingDetails).toEqual(["vid1"]);
  });

  it("attaches the duration from the video detail", () => {
    const { episodes } = buildEpisodes([entry()], detailsOf(detail()));
    expect(episodes[0].duration).toBe("PT1H2M3S");
  });
});

describe("buildEpisodes dedupe", () => {
  it("collapses two playlist entries for one videoId, keeping the lower position", () => {
    // 0RCXRNHhBfo was briefly in the playlist twice and shipped twice: 181
    // entries for 180 videos, two pages resolving to the same slug.
    const { episodes, duplicates } = buildEpisodes(
      [
        entry({ videoId: "0RCXRNHhBfo", position: 3, title: "Modern Web UI - Ngobrolin WEB" }),
        entry({ videoId: "other", position: 4 }),
        entry({ videoId: "0RCXRNHhBfo", position: 9, title: "Modern Web UI - Ngobrolin WEB" }),
      ],
      detailsOf(detail({ videoId: "0RCXRNHhBfo" }), detail({ videoId: "other" })),
    );

    expect(episodes.map((e) => e.videoId)).toEqual(["0RCXRNHhBfo", "other"]);
    expect(episodes[0].position).toBe(3);
    expect(duplicates).toEqual([
      { videoId: "0RCXRNHhBfo", keptPosition: 3, droppedPosition: 9 },
    ]);
  });

  it("keeps the lower position even when it appears second", () => {
    const { episodes, duplicates } = buildEpisodes(
      [
        entry({ videoId: "dup", position: 9, title: "Later copy" }),
        entry({ videoId: "dup", position: 2, title: "Original" }),
      ],
      detailsOf(detail({ videoId: "dup" })),
    );

    expect(episodes).toHaveLength(1);
    expect(episodes[0].position).toBe(2);
    expect(episodes[0].title).toBe("Original");
    expect(duplicates).toEqual([{ videoId: "dup", keptPosition: 2, droppedPosition: 9 }]);
  });

  it("never emits two entries with the same videoId", () => {
    const { episodes } = buildEpisodes(
      [
        entry({ videoId: "a", position: 0 }),
        entry({ videoId: "a", position: 1 }),
        entry({ videoId: "a", position: 2 }),
      ],
      detailsOf(detail({ videoId: "a" })),
    );

    expect(new Set(episodes.map((e) => e.videoId)).size).toBe(episodes.length);
    expect(episodes).toHaveLength(1);
  });

  it("passes a duplicate-free playlist through unchanged, in order", () => {
    const entries = [
      entry({ videoId: "a", position: 0, title: "A" }),
      entry({ videoId: "b", position: 1, title: "B" }),
      entry({ videoId: "c", position: 2, title: "C" }),
    ];
    const { episodes, duplicates, missingDetails } = buildEpisodes(
      entries,
      detailsOf(
        detail({ videoId: "a", publishedAt: "2026-01-01T00:00:00Z" }),
        detail({ videoId: "b", publishedAt: "2026-02-01T00:00:00Z" }),
        detail({ videoId: "c", publishedAt: "2026-03-01T00:00:00Z" }),
      ),
    );

    expect(duplicates).toEqual([]);
    expect(missingDetails).toEqual([]);
    expect(episodes.map((e) => e.videoId)).toEqual(["a", "b", "c"]);
    expect(episodes.map((e) => e.title)).toEqual(["A", "B", "C"]);
    expect(episodes.map((e) => e.publishedAt)).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
      "2026-03-01T00:00:00Z",
    ]);
  });
});
