import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Transcripts come from two generators — local whisper (scripts/transcribe.js)
// and YouTube auto-captions (scripts/transcribe-youtube.ts). Transcript.astro
// reads both through one code path, so they must stay shape-compatible. The
// whisper files predate the `source` field and must keep rendering without it.
const TRANSCRIPTS_DIR = join(process.cwd(), "src/data/transcripts");

const files = readdirSync(TRANSCRIPTS_DIR).filter((file) =>
  file.endsWith(".json")
);

interface Transcript {
  videoId: string;
  language: string;
  generatedAt: string;
  source?: string;
  segments: { start: number; end: number; text: string }[];
  fullText: string;
}

function load(file: string): Transcript {
  return JSON.parse(readFileSync(join(TRANSCRIPTS_DIR, file), "utf-8"));
}

describe("transcript data files", () => {
  it("has transcripts to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has the shape Transcript.astro reads", (file) => {
    const transcript = load(file);

    expect(transcript.videoId).toBe(file.replace(/\.json$/, ""));
    expect(typeof transcript.language).toBe("string");
    expect(typeof transcript.generatedAt).toBe("string");
    expect(typeof transcript.fullText).toBe("string");
    expect(Array.isArray(transcript.segments)).toBe(true);
    expect(transcript.segments.length).toBeGreaterThan(0);

    for (const segment of transcript.segments) {
      expect(typeof segment.start).toBe("number");
      expect(typeof segment.end).toBe("number");
      expect(typeof segment.text).toBe("string");
    }
  });

  it("only uses provenance values the UI knows about", () => {
    const sources = new Set(files.map((file) => load(file).source));
    for (const source of sources) {
      // `undefined` is the legacy whisper case and must remain valid.
      expect([undefined, "youtube-auto"]).toContain(source);
    }
  });

  it("leaves the pre-existing whisper transcripts unlabelled", () => {
    const withoutSource = files.filter((file) => load(file).source === undefined);
    expect(withoutSource.length).toBe(150);
  });
});
