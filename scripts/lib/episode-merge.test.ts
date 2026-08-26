import { describe, it, expect } from "vitest";
import { mergeEpisodes, type SyncedEpisode, type StoredEpisode } from "./episode-merge";

const SYNC_DATE = "2026-08-26T00:00:00.000Z";

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

function merge(s: SyncedEpisode[], e: StoredEpisode[]) {
  return mergeEpisodes(s, e, { syncedAt: SYNC_DATE });
}

describe("mergeEpisodes", () => {
  it("preserves an existing slug when YouTube has retitled the video", () => {
    const { episodes } = merge(
      [synced({ title: "Renamed On YouTube - Ngobrolin WEB" })],
      [stored({ slug: "vid1-original-title-ngobrolin-web" })]
    );

    expect(episodes[0].slug).toBe("vid1-original-title-ngobrolin-web");
    expect(episodes[0].title).toBe("Renamed On YouTube - Ngobrolin WEB");
  });

  it("computes a slug only for a genuinely new episode", () => {
    const { episodes } = merge(
      [stored(), synced({ videoId: "vid2", title: "Brand New! - Ngobrolin WEB" })],
      [stored()]
    );

    expect(episodes.map((e) => e.slug)).toEqual([
      "vid1-something-ngobrolin-web",
      "vid2-brand-new-ngobrolin-web",
    ]);
  });

  it("backfills a slug for an existing record written before the field existed", () => {
    const legacy = stored();
    delete (legacy as { slug?: string }).slug;

    expect(merge([synced()], [legacy]).episodes[0].slug).toBe("vid1-something-ngobrolin-web");
  });

  it("still preserves the audio metadata it always preserved", () => {
    const { episodes } = merge(
      [synced()],
      [stored({ audioUrl: "https://s3/audio/vid1.mp3", audioDuration: 5078, audioFileSize: 81256742 })]
    );

    expect(episodes[0]).toMatchObject({
      audioUrl: "https://s3/audio/vid1.mp3",
      audioDuration: 5078,
      audioFileSize: 81256742,
    });
  });

  it("takes every other field from the fresh sync", () => {
    const { episodes } = merge(
      [synced({ title: "New Title", description: "new desc", position: 3, duration: "PT9M" })],
      [stored({ description: "old desc", position: 0, duration: "PT1M" })]
    );

    expect(episodes[0]).toMatchObject({
      title: "New Title",
      description: "new desc",
      position: 3,
      duration: "PT9M",
    });
  });

  it("reports nothing retained on a sync where nothing is absent", () => {
    const result = merge([synced()], [stored()]);

    expect(result.retained).toEqual([]);
    expect(result.reappeared).toEqual([]);
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].absentFromPlaylistSince).toBeUndefined();
  });
});

describe("mergeEpisodes retention", () => {
  const gone = stored({
    videoId: "gone1",
    title: "Vanished Episode - Ngobrolin WEB",
    slug: "gone1-vanished-episode-ngobrolin-web",
    audioUrl: "https://s3/audio/gone1.mp3",
    audioDuration: 4321,
    audioFileSize: 69136000,
  });

  it("keeps an episode that the sync no longer returns, with everything it knew", () => {
    const { episodes } = merge([synced()], [stored(), gone]);

    const kept = episodes.find((e) => e.videoId === "gone1");
    expect(kept).toBeDefined();
    expect(kept).toMatchObject({
      slug: "gone1-vanished-episode-ngobrolin-web",
      title: "Vanished Episode - Ngobrolin WEB",
      description: gone.description,
      publishedAt: gone.publishedAt,
      duration: gone.duration,
      audioUrl: "https://s3/audio/gone1.mp3",
      audioDuration: 4321,
      audioFileSize: 69136000,
    });
  });

  it("marks the retained record so a maintainer can tell it from a live one", () => {
    const { episodes } = merge([synced()], [stored(), gone]);

    expect(episodes.find((e) => e.videoId === "gone1")!.absentFromPlaylistSince).toBe(SYNC_DATE);
    expect(episodes.find((e) => e.videoId === "vid1")!.absentFromPlaylistSince).toBeUndefined();
  });

  it("reports the retention so the run output and the PR diff are not silent", () => {
    const { retained } = merge([synced()], [stored(), gone]);

    expect(retained).toEqual([
      { videoId: "gone1", title: "Vanished Episode - Ngobrolin WEB", since: SYNC_DATE },
    ]);
  });

  it("does not restamp an episode that was already absent on an earlier sync", () => {
    const earlier = { ...gone, absentFromPlaylistSince: "2026-01-01T00:00:00.000Z" };
    const { episodes, retained } = merge([synced()], [stored(), earlier]);

    expect(episodes.find((e) => e.videoId === "gone1")!.absentFromPlaylistSince).toBe(
      "2026-01-01T00:00:00.000Z"
    );
    expect(retained).toEqual([]);
  });

  it("recognises a reappearing episode as the same record and does NOT re-slug it", () => {
    const wasAbsent = {
      ...gone,
      absentFromPlaylistSince: "2026-01-01T00:00:00.000Z",
    };
    const { episodes, reappeared } = merge(
      [synced({ videoId: "gone1", title: "Vanished Episode (Reuploaded) - Ngobrolin WEB" })],
      [wasAbsent]
    );

    expect(episodes).toHaveLength(1);
    expect(episodes[0].slug).toBe("gone1-vanished-episode-ngobrolin-web");
    expect(episodes[0].title).toBe("Vanished Episode (Reuploaded) - Ngobrolin WEB");
    expect(episodes[0].audioUrl).toBe("https://s3/audio/gone1.mp3");
    expect(reappeared).toEqual(["gone1"]);
  });

  it("clears the marker when the episode is back in the playlist", () => {
    const wasAbsent = { ...gone, absentFromPlaylistSince: "2026-01-01T00:00:00.000Z" };
    const { episodes } = merge([synced({ videoId: "gone1", title: gone.title })], [wasAbsent]);

    expect(episodes[0].absentFromPlaylistSince).toBeUndefined();
    expect(JSON.parse(JSON.stringify(episodes[0]))).not.toHaveProperty(
      "absentFromPlaylistSince"
    );
  });

  it("leaves a record with no marker unmarked, so old records stay shape-compatible", () => {
    const { episodes } = merge([synced()], [stored()]);
    const serialised = JSON.parse(JSON.stringify(episodes[0]));

    expect(serialised).not.toHaveProperty("absentFromPlaylistSince");
    expect(Object.keys(serialised).sort()).toEqual(
      ["description", "duration", "position", "publishedAt", "slug", "thumbnail", "title", "videoId"].sort()
    );
  });

  it("keeps retained episodes in their existing relative order after the live ones", () => {
    const goneA = stored({ videoId: "goneA", slug: "goneA-a" });
    const goneB = stored({ videoId: "goneB", slug: "goneB-b" });
    const { episodes } = merge([synced()], [goneA, stored(), goneB]);

    expect(episodes.map((e) => e.videoId)).toEqual(["vid1", "goneA", "goneB"]);
  });
});
