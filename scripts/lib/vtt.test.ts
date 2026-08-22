import { describe, it, expect } from "vitest";
import {
  parseVtt,
  stripCueMarkup,
  extractSpokenLines,
  mergeSegments,
  vttToTranscript,
} from "./vtt";

// Real excerpt from -TwyNC_SSFY.id.vtt. YouTube auto-captions are *rolling*:
// each spoken line first appears with inline word timings, then scrolls up and
// is repeated as plain context in the following cues. Naive cue-to-text
// conversion therefore emits every line ~3 times, with partial seam overlap.
const ROLLING_SEAM_VTT = `WEBVTT
Kind: captions
Language: id

00:00:29.920 --> 00:00:30.349 align:start position:0%

Halo,

00:00:30.349 --> 00:00:30.359 align:start position:0%
Halo,


00:00:30.359 --> 00:00:33.229 align:start position:0%
Halo,
halo.<00:00:30.599><c> Halo,</c><00:00:30.800><c> halo.</c><00:00:31.560><c> Selamat</c><00:00:32.040><c> malam.</c><00:00:32.599><c> Wah,</c>

00:00:33.229 --> 00:00:33.239 align:start position:0%
halo. Halo, halo. Selamat malam. Wah,


00:00:33.239 --> 00:00:34.750 align:start position:0%
halo. Halo, halo. Selamat malam. Wah,
kok<00:00:33.399><c> tumben</c>

00:00:34.750 --> 00:00:34.760 align:start position:0%
kok tumben


00:00:34.760 --> 00:00:37.310 align:start position:0%
kok tumben
kompak.<00:00:35.370><c> [tertawa]</c>
`;

// The pathological case called out in the brief: one line held across three
// consecutive cues produces "Hafal lu / Hafal lu / Hafal lu / seekor kera / ...".
const TRIPLE_REPEAT_VTT = `WEBVTT

00:01:00.000 --> 00:01:01.000 align:start position:0%

Hafal lu

00:01:01.000 --> 00:01:01.010 align:start position:0%
Hafal lu


00:01:01.010 --> 00:01:02.500 align:start position:0%
Hafal lu
seekor<00:01:01.200><c> kera</c>

00:01:02.500 --> 00:01:02.510 align:start position:0%
seekor kera

`;

// A cue whose new line carries no inline word timings at all (common for
// [musik] / [tertawa] markers and for the very first line of a caption run).
const NO_MARKUP_VTT = `WEBVTT

00:00:02.619 --> 00:00:07.194 align:start position:0%

[musik]

00:05:10.000 --> 00:05:12.000 align:start position:0%
mencari kitab suci. Eh gimana sih
lagunya?
`;

describe("stripCueMarkup", () => {
  it("removes inline word timestamps and <c> spans", () => {
    expect(
      stripCueMarkup(
        "halo.<00:00:30.599><c> Halo,</c><00:00:30.800><c> halo.</c>"
      )
    ).toBe("halo. Halo, halo.");
  });

  it("removes styled <c.colorXXXXXX> spans", () => {
    expect(stripCueMarkup('<c.colorE5E5E5>Selamat</c> malam')).toBe(
      "Selamat malam"
    );
  });

  it("decodes the entities YouTube escapes in cue text", () => {
    expect(stripCueMarkup("Tom &amp; Jerry &lt;div&gt; &quot;x&quot;")).toBe(
      'Tom & Jerry <div> "x"'
    );
  });

  it("collapses &nbsp; and surrounding whitespace", () => {
    expect(stripCueMarkup("  Selamat&nbsp;&nbsp;malam.  ")).toBe(
      "Selamat malam."
    );
  });

  it("returns an empty string for whitespace-only placeholder lines", () => {
    expect(stripCueMarkup(" ")).toBe("");
  });
});

describe("parseVtt", () => {
  it("parses cue timings into seconds", () => {
    const cues = parseVtt(ROLLING_SEAM_VTT);
    expect(cues[0].start).toBeCloseTo(29.92, 3);
    expect(cues[0].end).toBeCloseTo(30.349, 3);
  });

  it("keeps every cue, including the 10ms settle cues", () => {
    expect(parseVtt(ROLLING_SEAM_VTT)).toHaveLength(7);
  });

  it("splits cue payloads into markup-stripped lines with blanks dropped", () => {
    const cues = parseVtt(ROLLING_SEAM_VTT);
    expect(cues[2].lines).toEqual([
      "Halo,",
      "halo. Halo, halo. Selamat malam. Wah,",
    ]);
  });

  it("supports MM:SS.mmm timestamps as well as HH:MM:SS.mmm", () => {
    const cues = parseVtt("WEBVTT\n\n01:02.500 --> 01:04.000\nhalo\n");
    expect(cues[0].start).toBeCloseTo(62.5, 3);
    expect(cues[0].end).toBeCloseTo(64, 3);
  });

  it("ignores the header and any NOTE / STYLE blocks", () => {
    const cues = parseVtt(
      "WEBVTT\n\nNOTE this is a comment\n\nSTYLE\n::cue { color: white }\n\n00:00:01.000 --> 00:00:02.000\nhalo\n"
    );
    expect(cues).toHaveLength(1);
    expect(cues[0].lines).toEqual(["halo"]);
  });

  it("returns no cues for an empty or header-only file", () => {
    expect(parseVtt("WEBVTT\n\n")).toEqual([]);
    expect(parseVtt("")).toEqual([]);
  });
});

describe("extractSpokenLines", () => {
  it("resolves seam overlap so each spoken line appears exactly once", () => {
    const lines = extractSpokenLines(parseVtt(ROLLING_SEAM_VTT));
    expect(lines.map((l) => l.text)).toEqual([
      "Halo,",
      "halo. Halo, halo. Selamat malam. Wah,",
      "kok tumben",
      "kompak. [tertawa]",
    ]);
  });

  it("never emits a line that is a prefix-overlapping repeat of the previous one", () => {
    const texts = extractSpokenLines(parseVtt(ROLLING_SEAM_VTT)).map(
      (l) => l.text
    );
    // The naive conversion produces "Halo," immediately followed by
    // "halo. Halo, halo. ..." twice over; assert the seam is gone, not reduced.
    const joined = texts.join(" ");
    expect(joined).toBe(
      "Halo, halo. Halo, halo. Selamat malam. Wah, kok tumben kompak. [tertawa]"
    );
  });

  it("collapses the triple-repeat rolling case", () => {
    const lines = extractSpokenLines(parseVtt(TRIPLE_REPEAT_VTT));
    expect(lines.map((l) => l.text)).toEqual(["Hafal lu", "seekor kera"]);
  });

  it("keeps cues that carry no inline word timings", () => {
    const lines = extractSpokenLines(parseVtt(NO_MARKUP_VTT));
    expect(lines.map((l) => l.text)).toEqual(["[musik]", "lagunya?"]);
  });

  it("timestamps each line with its own cue start and end", () => {
    const lines = extractSpokenLines(parseVtt(ROLLING_SEAM_VTT));
    expect(lines[1].start).toBeCloseTo(30.359, 3);
    expect(lines[1].end).toBeCloseTo(33.229, 3);
  });

  it("produces monotonically non-decreasing start times", () => {
    const lines = extractSpokenLines(parseVtt(ROLLING_SEAM_VTT));
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].start).toBeGreaterThanOrEqual(lines[i - 1].start);
    }
  });

  it("drops a repeated line even when it reappears after a gap", () => {
    const vtt =
      "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n \nhalo dunia\n\n00:00:02.000 --> 00:00:02.010\nhalo dunia\n \n\n00:00:02.010 --> 00:00:03.000\nhalo dunia\nhalo dunia\n";
    expect(extractSpokenLines(parseVtt(vtt)).map((l) => l.text)).toEqual([
      "halo dunia",
    ]);
  });

  it("returns an empty array when there is nothing to say", () => {
    expect(extractSpokenLines(parseVtt("WEBVTT\n\n"))).toEqual([]);
  });
});

describe("mergeSegments", () => {
  const lines = [
    { start: 0, end: 1, text: "Halo," },
    { start: 1, end: 2, text: "halo. Selamat malam." },
    { start: 2, end: 3, text: "kok tumben" },
    { start: 3, end: 4, text: "kompak." },
  ];

  it("merges short caption lines into sentence-sized segments", () => {
    const merged = mergeSegments(lines, { minWords: 3, maxWords: 20, maxDuration: 30 });
    expect(merged).toEqual([
      { start: 0, end: 2, text: "Halo, halo. Selamat malam." },
      { start: 2, end: 4, text: "kok tumben kompak." },
    ]);
  });

  it("spans the start of the first line and the end of the last", () => {
    const merged = mergeSegments(lines, { minWords: 100, maxWords: 100, maxDuration: 100 });
    expect(merged).toHaveLength(1);
    expect(merged[0].start).toBe(0);
    expect(merged[0].end).toBe(4);
  });

  it("flushes on the word cap even without sentence punctuation", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      start: i,
      end: i + 1,
      text: "kata",
    }));
    const merged = mergeSegments(many, { minWords: 3, maxWords: 4, maxDuration: 60 });
    expect(merged.map((s) => s.text)).toEqual([
      "kata kata kata kata",
      "kata kata kata kata",
      "kata kata",
    ]);
  });

  it("flushes on the duration cap so timestamps stay useful", () => {
    const long = [
      { start: 0, end: 20, text: "satu" },
      { start: 20, end: 40, text: "dua" },
      { start: 40, end: 60, text: "tiga" },
    ];
    const merged = mergeSegments(long, { minWords: 50, maxWords: 50, maxDuration: 25 });
    expect(merged.map((s) => s.text)).toEqual(["satu dua", "tiga"]);
  });

  it("returns an empty array for no input", () => {
    expect(mergeSegments([])).toEqual([]);
  });
});

describe("vttToTranscript", () => {
  const transcript = vttToTranscript(ROLLING_SEAM_VTT, {
    videoId: "-TwyNC_SSFY",
    language: "id",
    generatedAt: "2026-08-22T00:00:00.000Z",
  });

  it("matches the on-disk transcript shape that Transcript.astro reads", () => {
    expect(Object.keys(transcript)).toEqual([
      "videoId",
      "language",
      "generatedAt",
      "source",
      "segments",
      "fullText",
    ]);
  });

  it("marks the transcript as YouTube auto-generated", () => {
    expect(transcript.source).toBe("youtube-auto");
  });

  it("emits segments with numeric start/end and trimmed text", () => {
    for (const segment of transcript.segments) {
      expect(typeof segment.start).toBe("number");
      expect(typeof segment.end).toBe("number");
      expect(segment.end).toBeGreaterThanOrEqual(segment.start);
      expect(segment.text).toBe(segment.text.trim());
      expect(segment.text.length).toBeGreaterThan(0);
      expect(Object.keys(segment)).toEqual(["start", "end", "text"]);
    }
  });

  it("keeps fullText in sync with the segments, deduplicated", () => {
    expect(transcript.fullText).toBe(
      transcript.segments.map((s) => s.text).join(" ")
    );
    expect(transcript.fullText).toBe(
      "Halo, halo. Halo, halo. Selamat malam. Wah, kok tumben kompak. [tertawa]"
    );
  });

  it("throws when the VTT contains no usable cues", () => {
    expect(() =>
      vttToTranscript("WEBVTT\n\n", { videoId: "x", language: "id" })
    ).toThrow(/no cues/i);
  });
});
