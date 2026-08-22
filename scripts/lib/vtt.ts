/**
 * Turn YouTube auto-generated WebVTT subtitles into the transcript shape used
 * by `src/data/transcripts/<videoId>.json`.
 *
 * YouTube auto-captions are *rolling* captions: the caption box holds two or
 * three lines at a time and scrolls. A single spoken line therefore appears in
 * several consecutive cues — first as the freshly spoken line (carrying inline
 * `<00:00:30.599><c> word</c>` word timings), then again as plain context in
 * the cues that follow, plus once more in a ~10ms "settle" cue. Converting cue
 * text to prose naively repeats every line about three times and leaves
 * partially overlapping seams:
 *
 *   "Halo," / "halo. Halo, halo. Selamat malam. Wah," / "halo. Halo, halo. …"
 *
 * The reconstruction rule is exact rather than fuzzy. In every cue the only
 * new content is the LAST non-empty line; everything above it is scroll-back
 * that was already emitted by an earlier cue. Verified against a full episode
 * (3,961 cues): the markup-carrying line is the last non-empty line in all
 * 1,682 cues that have markup, and every scroll-back line matches a line
 * already emitted — so taking the last line loses nothing and repeats nothing.
 */

export interface VttCue {
  start: number;
  end: number;
  /** Cue payload, markup stripped, blank placeholder lines removed. */
  lines: string[];
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface MergeOptions {
  /** Only break on sentence punctuation once the segment has this many words. */
  minWords?: number;
  /** Hard cap; flush even mid-sentence. */
  maxWords?: number;
  /** Hard cap in seconds, so timestamps stay useful for seeking. */
  maxDuration?: number;
}

export interface Transcript {
  videoId: string;
  language: string;
  generatedAt: string;
  source: string;
  segments: Segment[];
  fullText: string;
}

export interface TranscriptOptions {
  videoId: string;
  language: string;
  generatedAt?: string;
  source?: string;
  merge?: MergeOptions;
}

/** Provenance marker for transcripts built from YouTube auto-captions. */
export const YOUTUBE_AUTO_SOURCE = "youtube-auto";

// Tuned to land near the ~8.5 words / ~5s per segment that the existing
// whisper-generated transcripts have, so both render at the same rhythm.
const DEFAULT_MERGE: Required<MergeOptions> = {
  minWords: 6,
  maxWords: 18,
  maxDuration: 15,
};

const TIMESTAMP = /(?:(\d+):)?(\d{1,2}):(\d{2}(?:\.\d{1,3})?)/;
const CUE_TIMING = new RegExp(
  `^${TIMESTAMP.source}\\s+-->\\s+${TIMESTAMP.source}`
);

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function parseTimestamp(
  hours: string | undefined,
  minutes: string,
  seconds: string
): number {
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/**
 * Remove the inline word-timing markup YouTube embeds in auto-caption cues and
 * decode the entities it escapes, leaving plain text.
 */
export function stripCueMarkup(line: string): string {
  return line
    .replace(/<\d{1,2}:\d{2}:\d{2}\.\d{1,3}>/g, "")
    .replace(/<\/?c[^>]*>/g, "")
    .replace(/<\/?v[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a WebVTT document into cues. Every cue is kept, including the ~10ms
 * "settle" cues — `extractSpokenLines` is what discards the duplication.
 */
export function parseVtt(raw: string): VttCue[] {
  const cues: VttCue[] = [];

  // Blocks are separated by blank lines, but a cue payload can itself contain a
  // whitespace-only placeholder line, so split on the timing lines instead.
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  let current: VttCue | null = null;
  let pending: string[] = [];

  const flush = () => {
    if (current) {
      current.lines = pending
        .map(stripCueMarkup)
        .filter((line) => line.length > 0);
      cues.push(current);
    }
    current = null;
    pending = [];
  };

  for (const line of lines) {
    const timing = CUE_TIMING.exec(line);
    if (timing) {
      flush();
      current = {
        start: parseTimestamp(timing[1], timing[2], timing[3]),
        end: parseTimestamp(timing[4], timing[5], timing[6]),
        lines: [],
      };
      continue;
    }

    if (current) {
      // A NOTE or STYLE block terminates the preceding cue's payload.
      if (/^(NOTE|STYLE|REGION)\b/.test(line)) {
        flush();
        continue;
      }
      pending.push(line);
    }
  }

  flush();
  return cues;
}

/**
 * Reduce rolling captions to the sequence of lines actually spoken, each one
 * exactly once. See the module comment for why "last non-empty line" is the
 * correct and lossless rule.
 */
export function extractSpokenLines(cues: VttCue[]): Segment[] {
  const spoken: Segment[] = [];
  // A line can scroll through the caption box across several cues, so compare
  // against a short window rather than only the immediately preceding line.
  const recent: string[] = [];
  const RECENT_WINDOW = 4;

  for (const cue of cues) {
    if (cue.lines.length === 0) continue;

    const text = cue.lines[cue.lines.length - 1];
    if (recent.includes(text)) continue;

    spoken.push({ start: cue.start, end: cue.end, text });
    recent.push(text);
    if (recent.length > RECENT_WINDOW) recent.shift();
  }

  return spoken;
}

/**
 * Group the short caption lines into sentence-sized segments so the rendered
 * transcript reads like prose instead of a caption dump.
 */
export function mergeSegments(
  lines: Segment[],
  options: MergeOptions = {}
): Segment[] {
  const { minWords, maxWords, maxDuration } = { ...DEFAULT_MERGE, ...options };

  const segments: Segment[] = [];
  let buffer: Segment[] = [];

  const wordCount = () =>
    buffer.reduce((total, line) => total + line.text.split(/\s+/).length, 0);

  const flush = () => {
    if (buffer.length === 0) return;
    segments.push({
      start: buffer[0].start,
      end: buffer[buffer.length - 1].end,
      text: buffer.map((line) => line.text).join(" "),
    });
    buffer = [];
  };

  for (const line of lines) {
    buffer.push(line);

    const words = wordCount();
    const duration = line.end - buffer[0].start;
    const endsSentence = /[.!?…]["')\]]?$/.test(line.text);

    if (
      (endsSentence && words >= minWords) ||
      words >= maxWords ||
      duration >= maxDuration
    ) {
      flush();
    }
  }

  flush();
  return segments;
}

/**
 * Build a transcript object byte-compatible with the whisper-generated files
 * already in `src/data/transcripts/`, plus a `source` provenance field.
 */
export function vttToTranscript(
  raw: string,
  options: TranscriptOptions
): Transcript {
  const spoken = extractSpokenLines(parseVtt(raw));

  if (spoken.length === 0) {
    throw new Error("Subtitle file contains no cues with usable text");
  }

  const segments = mergeSegments(spoken, options.merge);

  return {
    videoId: options.videoId,
    language: options.language,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: options.source ?? YOUTUBE_AUTO_SOURCE,
    segments,
    fullText: segments.map((segment) => segment.text).join(" "),
  };
}
