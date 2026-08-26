import { describe, it, expect } from "vitest";
import rawEpisodes from "./episodes.json";

// The podcast pipeline has two independent sources of truth for how long an
// episode is: `duration`, copied from the YouTube video snippet by
// scripts/fetch-playlist.ts, and `audioDuration`, measured with ffprobe by
// scripts/upload-s3.ts after the mp3 is encoded.
//
// src/lib/podcast.test.ts already guards the file-size-to-duration ratio, which
// catches a truncated upload. It cannot catch a *complete* mp3 that belongs to
// the wrong episode: that file has a perfectly healthy 16000 bytes/sec ratio.
// Cross-checking the two durations does catch it, because they are derived from
// different systems and only agree when the mp3 really is that video's audio.
//
// Across the whole archive the two never differ by more than one second, which
// is just the encoder rounding a fractional final frame.
const MAX_DRIFT_SECONDS = 2;

interface RawEpisode {
  videoId: string;
  duration?: string;
  audioDuration?: number;
}

/** Parse the ISO 8601 duration YouTube returns (e.g. "PT1H31M38S") to seconds. */
function parseIso8601Duration(value: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) {
    throw new Error(`Unparseable ISO 8601 duration: ${value}`);
  }
  const [, hours, minutes, seconds] = match;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

const episodes = rawEpisodes as RawEpisode[];

describe("episode audio matches the video it claims to be", () => {
  it("every episode carries a parseable YouTube duration", () => {
    const unparseable = episodes
      .filter((ep) => {
        if (!ep.duration) return true;
        try {
          return parseIso8601Duration(ep.duration) <= 0;
        } catch {
          return true;
        }
      })
      .map((ep) => ep.videoId);

    expect(unparseable).toEqual([]);
  });

  it("audioDuration agrees with the YouTube duration for every uploaded episode", () => {
    const drifted = episodes
      .filter((ep) => typeof ep.audioDuration === "number" && ep.duration)
      .map((ep) => ({
        videoId: ep.videoId,
        drift: Math.abs(parseIso8601Duration(ep.duration!) - ep.audioDuration!),
      }))
      .filter((entry) => entry.drift > MAX_DRIFT_SECONDS);

    expect(drifted).toEqual([]);
  });
});
