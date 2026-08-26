/**
 * The site half of the retention change.
 *
 * `scripts/lib/episode-merge.ts` keeps an episode's record when the playlist
 * sync stops returning its video, and marks it `absentFromPlaylistSince`. The
 * captain's ruling is *keep*: a retained episode stays in the archive and the
 * feed exactly as before. These tests pin that down from the consumer side —
 * the marker must be inert, in both directions.
 */

import { describe, it, expect } from "vitest";
import { resolveSlug } from "./slug";
import { getPodcastEpisodes, generatePodcastRssXml, type PodcastMetadata } from "./podcast";
import { getEpisodes } from "./episodes";
import episodesData from "../data/episodes.json";

type RawRecord = Record<string, unknown>;

const METADATA: PodcastMetadata = {
  title: "Ngobrolin WEB",
  description: "desc",
  author: "Riza Fahmi",
  email: "hello@ngobrol.in",
  siteUrl: "https://ngobrol.in",
  feedUrl: "https://ngobrol.in/podcast-rss.xml",
  imageUrl: "https://ngobrol.in/cover.jpg",
  language: "id",
  category: "Technology",
  explicit: false,
};

describe("absentFromPlaylistSince is optional", () => {
  // Deliberately an invariant, not a snapshot. Asserting "no record carries
  // this field today" would go red on the first automated "chore: update
  // episodes from YouTube playlist" PR that actually retains an episode — and
  // the obvious-looking fix for whoever sees that red is to strip the marker or
  // the record, undoing the retention this change exists to add. A guard that
  // teaches a future maintainer to delete the feature is worse than no guard.
  // Same reasoning as the golden guard in ./slug.test.ts, which is a subset
  // assertion rather than exact ordered equality so new episodes can land.
  it("is either absent or a round-tripping ISO-8601 stamp on every record", () => {
    const raw = episodesData as unknown as RawRecord[];
    expect(raw.length).toBeGreaterThan(0);

    for (const ep of raw) {
      if (!("absentFromPlaylistSince" in ep)) continue;

      const since = ep.absentFromPlaylistSince;
      expect(typeof since).toBe("string");
      expect(new Date(since as string).toISOString()).toBe(since);
    }
  });

  it("still loads and renders the whole archive from unmarked records", () => {
    const episodes = getEpisodes();
    expect(episodes.length).toBe((episodesData as unknown as RawRecord[]).length);
    expect(episodes.every((ep) => !!ep.slug)).toBe(true);
  });

  it("resolves the same slug whether or not the marker is present", () => {
    const live = { videoId: "vid1", title: "Retitled - Ngobrolin WEB", slug: "vid1-original" };
    const retained = { ...live, absentFromPlaylistSince: "2026-08-26T00:00:00.000Z" };

    expect(resolveSlug(retained)).toBe(resolveSlug(live));
    expect(resolveSlug(retained)).toBe("vid1-original");
  });
});

describe("a retained episode stays in the feed", () => {
  it("renders an enclosure for a marked record exactly as for a live one", () => {
    const anyLive = getPodcastEpisodes()[0];
    expect(anyLive).toBeDefined();

    const retained = { ...anyLive, absentFromPlaylistSince: "2026-08-26T00:00:00.000Z" };
    const xml = generatePodcastRssXml(METADATA, [retained]);

    expect(xml).toContain(`<enclosure url="${anyLive.audioUrl}"`);
    expect(xml).toContain(`/episodes/${anyLive.slug}`);
    // The marker is bookkeeping for maintainers, not feed content.
    expect(xml).not.toContain("absentFromPlaylistSince");
  });
});
