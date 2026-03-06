import { describe, expect, it } from "vitest";

import { buildTranscript, filterNonConversation } from "./transcribe-common.js";

describe("filterNonConversation", () => {
  it("removes configured non-conversation markers and preserves real speech", () => {
    const segments = [
      { start: 0, end: 1, text: "[Musik]" },
      { start: 1, end: 2, text: "Halo semuanya" },
      { start: 2, end: 3, text: "[tepuk tangan]" },
      { start: 3, end: 4, text: "Kita mulai ya" },
    ];

    expect(filterNonConversation(segments)).toEqual([
      { start: 1, end: 2, text: "Halo semuanya" },
      { start: 3, end: 4, text: "Kita mulai ya" },
    ]);
  });
});

describe("buildTranscript", () => {
  it("builds the saved transcript shape and preserves optional speaker labels", () => {
    const transcript = buildTranscript("video-123", [
      { start: 0, end: 1.5, text: "Halo", speaker: "Alice" },
      { start: 1.5, end: 3, text: "Hai", speaker: "Bob" },
    ], {
      generatedAt: "2026-03-06T12:00:00.000Z",
    });

    expect(transcript).toEqual({
      videoId: "video-123",
      language: "id",
      generatedAt: "2026-03-06T12:00:00.000Z",
      segments: [
        { start: 0, end: 1.5, text: "Halo", speaker: "Alice" },
        { start: 1.5, end: 3, text: "Hai", speaker: "Bob" },
      ],
      fullText: "Halo Hai",
    });
  });
});
