import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, describe, expect, it } from "vitest";

import {
  fileToDataUrl,
  normalizeDiarizedSegments,
  parseKnownSpeakers,
} from "./transcribe-openai-diarize.js";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("parseKnownSpeakers", () => {
  it("parses repeated speaker arguments into matching names and paths", () => {
    expect(parseKnownSpeakers([
      "Alice=refs/alice.wav",
      "Bob=refs/bob.wav",
    ])).toEqual([
      { name: "Alice", path: "refs/alice.wav" },
      { name: "Bob", path: "refs/bob.wav" },
    ]);
  });

  it("throws when a speaker reference is malformed", () => {
    expect(() => parseKnownSpeakers(["Alice"])).toThrow(
      '--known-speaker must use the format "Name=path"'
    );
  });
});

describe("fileToDataUrl", () => {
  it("encodes audio files as data URLs using the file extension mime type", () => {
    const dir = mkdtempSync(join(tmpdir(), "diarize-"));
    tempDirs.push(dir);

    const filePath = join(dir, "alice.wav");
    writeFileSync(filePath, "hello");

    expect(fileToDataUrl(filePath)).toBe("data:audio/wav;base64,aGVsbG8=");
  });
});

describe("normalizeDiarizedSegments", () => {
  it("maps diarized response segments into the saved transcript format", () => {
    const response = {
      segments: [
        {
          id: "seg_1",
          start: 0.25,
          end: 1.5,
          speaker: "Alice",
          text: " Halo ",
          type: "transcript.text.segment",
        },
        {
          id: "seg_2",
          start: 1.5,
          end: 3,
          speaker: "Bob",
          text: "Hai",
          type: "transcript.text.segment",
        },
      ],
    };

    expect(normalizeDiarizedSegments(response, 10)).toEqual([
      { start: 10.25, end: 11.5, text: "Halo", speaker: "Alice" },
      { start: 11.5, end: 13, text: "Hai", speaker: "Bob" },
    ]);
  });
});
