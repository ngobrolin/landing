import { describe, expect, it } from "vitest";

import { parseArgs } from "./transcribe-openai-diarize.js";

describe("parseArgs", () => {
  it("parses diarization-specific flags alongside the existing selection flags", () => {
    expect(parseArgs([
      "--base-url",
      "https://api.openai.com/v1",
      "--model",
      "gpt-4o-transcribe-diarize",
      "--browser",
      "chrome",
      "--known-speaker",
      "Alice=refs/alice.wav",
      "--known-speaker",
      "Bob=refs/bob.wav",
      "--response-format",
      "diarized_json",
      "--missing",
      "--limit",
      "3",
    ])).toEqual({
      baseURL: "https://api.openai.com/v1",
      browser: "chrome",
      knownSpeakerArgs: ["Alice=refs/alice.wav", "Bob=refs/bob.wav"],
      limit: 3,
      model: "gpt-4o-transcribe-diarize",
      responseFormat: "diarized_json",
      targets: ["--missing"],
    });
  });
});
