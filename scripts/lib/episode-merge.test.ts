import { describe, it, expect } from "vitest";
import { mergeEpisodes, type SyncedEpisode, type StoredEpisode } from "./episode-merge";

function synced(over: Partial<SyncedEpisode> = {}): SyncedEpisode {
  return {
    videoId: "vid1",
    title: "Something - Ngobrolin WEB",
    description: "desc",
    publishedAt: "2026-07-29T12:00:00Z",
    thumbnail: "https://i.ytimg.com/vi/vid1/hqdefault.jpg",
    position: 0,
    duration: "PT1H2M3S",
    ...over,
  };
}

function stored(over: Partial<StoredEpisode> = {}): StoredEpisode {
  return { ...synced(), slug: "vid1-something-ngobrolin-web", ...over };
}

describe("mergeEpisodes", () => {
  it("preserves an existing slug when YouTube has retitled the video", () => {
    const merged = mergeEpisodes(
      [synced({ title: "Renamed On YouTube - Ngobrolin WEB" })],
      [stored({ slug: "vid1-original-title-ngobrolin-web" })]
    );

    expect(merged[0].slug).toBe("vid1-original-title-ngobrolin-web");
    expect(merged[0].title).toBe("Renamed On YouTube - Ngobrolin WEB");
  });

  it("computes a slug only for a genuinely new episode", () => {
    const merged = mergeEpisodes(
      [stored(), synced({ videoId: "vid2", title: "Brand New! - Ngobrolin WEB" })],
      [stored()]
    );

    expect(merged.map((e) => e.slug)).toEqual([
      "vid1-something-ngobrolin-web",
      "vid2-brand-new-ngobrolin-web",
    ]);
  });

  it("backfills a slug for an existing record written before the field existed", () => {
    const legacy = stored();
    delete (legacy as { slug?: string }).slug;

    expect(mergeEpisodes([synced()], [legacy])[0].slug).toBe("vid1-something-ngobrolin-web");
  });

  it("still preserves the audio metadata it always preserved", () => {
    const merged = mergeEpisodes(
      [synced()],
      [stored({ audioUrl: "https://s3/audio/vid1.mp3", audioDuration: 5078, audioFileSize: 81256742 })]
    );

    expect(merged[0]).toMatchObject({
      audioUrl: "https://s3/audio/vid1.mp3",
      audioDuration: 5078,
      audioFileSize: 81256742,
    });
  });

  it("takes every other field from the fresh sync", () => {
    const merged = mergeEpisodes(
      [synced({ title: "New Title", description: "new desc", position: 3, duration: "PT9M" })],
      [stored({ description: "old desc", position: 0, duration: "PT1M" })]
    );

    expect(merged[0]).toMatchObject({
      title: "New Title",
      description: "new desc",
      position: 3,
      duration: "PT9M",
    });
  });
});
