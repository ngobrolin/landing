import { describe, expect, it } from "vitest";
import { findUnsummarisedEpisodes } from "./summary-coverage";

describe("findUnsummarisedEpisodes", () => {
  const episodes = [
    { videoId: "ready", title: "Transcribed, not summarised" },
    { videoId: "done", title: "Transcribed and summarised" },
    { videoId: "raw", title: "Neither" },
    { videoId: "odd", title: "Summarised without a transcript" },
  ];
  const transcripts = new Set(["ready", "done", "notAnEpisode"]);
  const summaries = new Set(["done", "odd"]);

  const { ready, untranscribed } = findUnsummarisedEpisodes(
    episodes,
    transcripts,
    summaries,
  );

  it("lists an episode with a transcript but no summary as ready", () => {
    expect(ready.map((ep) => ep.videoId)).toEqual(["ready"]);
  });

  it("lists an episode with neither as needing a transcript", () => {
    expect(untranscribed.map((ep) => ep.videoId)).toEqual(["raw"]);
  });

  it("never lists a summarised episode or a transcript outside the episode list", () => {
    const listed = [...ready, ...untranscribed].map((ep) => ep.videoId);
    expect(listed).not.toContain("done");
    expect(listed).not.toContain("odd");
    expect(listed).not.toContain("notAnEpisode");
  });

  it("keeps the episode order it was given", () => {
    const reversed = findUnsummarisedEpisodes(
      [...episodes].reverse(),
      new Set(),
      new Set(),
    );
    expect(reversed.untranscribed.map((ep) => ep.videoId)).toEqual([
      "odd",
      "raw",
      "done",
      "ready",
    ]);
  });
});
